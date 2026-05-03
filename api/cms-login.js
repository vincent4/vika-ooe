import { signToken, sha256Equal } from "../lib/cms-token.js";

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

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const jwtSecret = process.env.CMS_JWT_SECRET;
  const adminPassword = process.env.CMS_ADMIN_PASSWORD;
  if (!jwtSecret || !adminPassword) {
    return res.status(503).json({
      error: "CMS er ikke konfigureret (mangler CMS_JWT_SECRET eller CMS_ADMIN_PASSWORD på Vercel).",
    });
  }

  const body = parseJsonBody(req);

  const password = typeof body.password === "string" ? body.password : "";
  if (!sha256Equal(password, adminPassword)) {
    return res.status(401).json({ error: "Forkert adgangskode" });
  }

  const ttlMs = 8 * 60 * 60 * 1000;
  const token = signToken({ exp: Date.now() + ttlMs }, jwtSecret);
  return res.status(200).json({ token });
}
