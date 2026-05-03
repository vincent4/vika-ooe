import { verifyToken } from "../lib/cms-token.js";

const PATH = "public/content/overrides.json";

/** @param {import('http').IncomingMessage & { body?: unknown }} req */
function parseJsonBody(req) {
  const b = req.body;
  if (b == null || b === "") return {};
  if (typeof b === "string") {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  if (typeof b === "object") return /** @type {Record<string, unknown>} */ (b);
  return {};
}

/** @param {unknown} o */
function validateOverrides(o) {
  if (!o || typeof o !== "object") return false;
  const x = /** @type {Record<string, unknown>} */ (o);
  return (
    Array.isArray(x.da) &&
    Array.isArray(x.de) &&
    Array.isArray(x.en) &&
    Array.isArray(x.images)
  );
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const jwtSecret = (process.env.CMS_JWT_SECRET ?? "").trim();
  const ghToken = (process.env.GITHUB_TOKEN ?? "").trim();
  if (!jwtSecret || !ghToken) {
    return res.status(503).json({
      error: "CMS er ikke konfigureret (mangler CMS_JWT_SECRET eller GITHUB_TOKEN på Vercel).",
    });
  }

  const auth = req.headers.authorization ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!verifyToken(bearer, jwtSecret)) {
    return res.status(401).json({ error: "Ikke logget ind eller session udløbet." });
  }

  const body = parseJsonBody(req);

  const overrides = body?.overrides;
  if (!validateOverrides(overrides)) {
    return res.status(400).json({
      error: "Forventet JSON med arrays: da, de, en, images (som i overrides.json).",
    });
  }

  const owner = process.env.GITHUB_REPO_OWNER ?? "vincent4";
  const repo = process.env.GITHUB_REPO_NAME ?? "vika-ooe";
  const branch = process.env.GITHUB_BRANCH ?? "main";

  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(PATH)}?ref=${encodeURIComponent(branch)}`;
  const getRes = await fetch(getUrl, { headers: ghHeaders });
  if (!getRes.ok) {
    const errText = await getRes.text();
    return res.status(502).json({
      error: `GitHub kunne ikke læse filen (${getRes.status}). Tjek token og sti.`,
      detail: errText.slice(0, 500),
    });
  }

  const meta = await getRes.json();
  if (!meta.sha || typeof meta.sha !== "string") {
    return res.status(502).json({ error: "Uventet svar fra GitHub (mangler sha)." });
  }

  const raw = `${JSON.stringify(overrides, null, 2)}\n`;
  const content = Buffer.from(raw, "utf8").toString("base64");

  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(PATH)}`,
    {
      method: "PUT",
      headers: {
        ...ghHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "CMS: opdater overrides.json",
        content,
        sha: meta.sha,
        branch,
      }),
    },
  );

  if (!putRes.ok) {
    const errText = await putRes.text();
    return res.status(502).json({
      error: `GitHub kunne ikke gemme (${putRes.status}).`,
      detail: errText.slice(0, 500),
    });
  }

  return res.status(200).json({ ok: true });
}
