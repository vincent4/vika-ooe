import { createHash, createHmac, timingSafeEqual } from "crypto";

/** @param {string} input @param {string} expected */
export function sha256Equal(input, expected) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * @param {{ exp: number }} payload
 * @param {string} secret
 */
export function signToken(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/**
 * @param {string} token
 * @param {string} secret
 */
export function verifyToken(token, secret) {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const data = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(data).digest("base64url");
  const sb = Buffer.from(sig, "utf8");
  const eb = Buffer.from(expected, "utf8");
  if (sb.length !== eb.length || !timingSafeEqual(sb, eb)) return null;
  try {
    const json = Buffer.from(data, "base64url").toString("utf8");
    const payload = JSON.parse(json);
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
