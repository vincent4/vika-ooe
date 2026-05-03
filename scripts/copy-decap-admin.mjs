/**
 * Læg Decap CMS-browser-bundle i public/admin/decap-cms.js (samme origin som admin — ingen CDN-blokering).
 * NPM-pakken decap-cms kan mangle dist; jsDelivr har den officielle fil.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEST = path.resolve(__dirname, "../public/admin/decap-cms.js");
const URL = "https://cdn.jsdelivr.net/npm/decap-cms@3.12.2/dist/decap-cms.js";
const MIN_BYTES = 400_000;

function skipIfFresh() {
  if (!fs.existsSync(DEST)) return false;
  if (fs.statSync(DEST).size < MIN_BYTES) return false;
  console.log("decap-cms.js already present, skipping download.");
  return true;
}

async function main() {
  if (skipIfFresh()) return;

  const dir = path.dirname(DEST);
  fs.mkdirSync(dir, { recursive: true });

  const res = await fetch(URL);
  if (!res.ok) {
    throw new Error(`Could not download Decap CMS (${res.status}): ${URL}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES) {
    throw new Error(`Downloaded file too small (${buf.length} bytes); expected full bundle.`);
  }
  fs.writeFileSync(DEST, buf);
  console.log(`Wrote ${DEST} (${buf.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
