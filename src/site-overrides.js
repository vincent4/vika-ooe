/** @typedef {{ src: string, href: string }} ImageOverride */

/**
 * @param {unknown} section
 * @returns {Record<string, string>}
 */
function normalizeLocalePatch(section) {
  if (!section || typeof section !== "object") return {};
  if (Array.isArray(section)) {
    const o = {};
    for (const row of section) {
      if (!row || typeof row !== "object") continue;
      const key = /** @type {{ key?: string }} */ (row).key;
      if (!key) continue;
      const value = /** @type {{ value?: string }} */ (row).value;
      o[key] = value ?? "";
    }
    return o;
  }
  return /** @type {Record<string, string>} */ ({ ...section });
}

/**
 * @param {unknown} section
 * @returns {Record<string, ImageOverride>}
 */
export function normalizeImages(section) {
  if (!section || typeof section !== "object") return {};
  if (Array.isArray(section)) {
    const o = {};
    for (const row of section) {
      if (!row || typeof row !== "object") continue;
      const id = /** @type {{ id?: string }} */ (row).id;
      const thumbUrl = /** @type {{ thumbUrl?: string }} */ (row).thumbUrl;
      if (!id || !thumbUrl) continue;
      const fullUrl = /** @type {{ fullUrl?: string }} */ (row).fullUrl;
      o[id] = { src: thumbUrl, href: (fullUrl && fullUrl.trim()) || thumbUrl };
    }
    return o;
  }
  const o = {};
  for (const [k, v] of Object.entries(section)) {
    if (typeof v === "string") {
      o[k] = { src: v, href: v };
    } else if (v && typeof v === "object") {
      const src = /** @type {{ src?: string }} */ (v).src;
      if (!src) continue;
      const href = /** @type {{ href?: string }} */ (v).href || src;
      o[k] = { src, href };
    }
  }
  return o;
}

/**
 * @param {Record<string, ImageOverride>} images
 */
export function applySiteImages(images) {
  if (!images || Object.keys(images).length === 0) return;
  document.querySelectorAll("[data-site-img]").forEach((el) => {
    if (!(el instanceof HTMLImageElement)) return;
    const key = el.getAttribute("data-site-img");
    if (!key) return;
    const spec = images[key];
    if (!spec?.src) return;
    el.src = spec.src;
    const link = el.closest("a[href]");
    if (link instanceof HTMLAnchorElement && spec.href) link.href = spec.href;
  });
}

function overridesUrl() {
  const base = import.meta.env.BASE_URL || "/";
  const norm = base.endsWith("/") ? base : `${base}/`;
  return `${norm}content/overrides.json`;
}

/**
 * @returns {Promise<{ localePatches: Partial<Record<'da'|'de'|'en', Record<string, string>>>, images: Record<string, ImageOverride> }>}
 */
export async function fetchSiteOverrides() {
  const empty = {
    localePatches: /** @type {Partial<Record<'da'|'de'|'en', Record<string, string>>>} */ ({}),
    images: /** @type {Record<string, ImageOverride>} */ ({}),
  };
  try {
    const res = await fetch(overridesUrl(), { cache: "no-store" });
    if (!res.ok) return empty;
    const raw = await res.json();
    if (!raw || typeof raw !== "object") return empty;
    return {
      localePatches: {
        da: normalizeLocalePatch(raw.da),
        de: normalizeLocalePatch(raw.de),
        en: normalizeLocalePatch(raw.en),
      },
      images: normalizeImages(raw.images),
    };
  } catch {
    return empty;
  }
}
