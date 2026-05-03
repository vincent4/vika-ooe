import { getLocale } from "./i18n.js";

const TOKEN_KEY = "ooe_cms_token";

/** @typedef {{ key: string, value: string }} Kv */
/** @typedef {{ id: string, thumbUrl: string, fullUrl: string }} ImgRow */

/** @param {unknown} section @returns {Kv[]} */
function normalizeLocaleList(section) {
  if (!section) return [];
  if (Array.isArray(section)) {
    return section.map((row) => ({
      key: typeof row?.key === "string" ? row.key : "",
      value: row?.value != null ? String(row.value) : "",
    }));
  }
  if (typeof section === "object") {
    return Object.entries(section).map(([key, value]) => ({
      key,
      value: value != null ? String(value) : "",
    }));
  }
  return [];
}

/** @param {unknown} section @returns {ImgRow[]} */
function normalizeImagesList(section) {
  if (!section) return [];
  if (Array.isArray(section)) {
    return section.map((row) => ({
      id: typeof row?.id === "string" ? row.id : "",
      thumbUrl: typeof row?.thumbUrl === "string" ? row.thumbUrl : "",
      fullUrl: row?.fullUrl != null ? String(row.fullUrl) : "",
    }));
  }
  if (typeof section === "object") {
    return Object.entries(section).map(([id, v]) => {
      if (typeof v === "string") return { id, thumbUrl: v, fullUrl: "" };
      const o = v && typeof v === "object" ? v : {};
      return {
        id,
        thumbUrl: typeof o.src === "string" ? o.src : "",
        fullUrl: typeof o.href === "string" ? o.href : "",
      };
    });
  }
  return [];
}

/** @param {Kv[]} arr @param {string} key @param {string} value */
function upsertKv(arr, key, value) {
  const i = arr.findIndex((r) => r.key === key);
  if (i >= 0) arr[i].value = value;
  else arr.push({ key, value });
}

/** @param {ImgRow[]} arr */
function upsertImg(arr, id, thumbUrl, fullUrl) {
  const i = arr.findIndex((r) => r.id === id);
  const row = { id, thumbUrl, fullUrl: fullUrl || thumbUrl };
  if (i >= 0) arr[i] = row;
  else arr.push(row);
}

/** @param {ReturnType<typeof normalizeLocaleList>} lists */
function localeListToSave(arr) {
  return arr.filter((r) => r.key.trim() || r.value.trim()).map((r) => ({
    key: r.key.trim(),
    value: r.value,
  }));
}

/** @param {ImgRow[]} arr */
function imageListToSave(arr) {
  return arr
    .filter((r) => r.id.trim() && r.thumbUrl.trim())
    .map((r) => ({
      id: r.id.trim(),
      thumbUrl: r.thumbUrl.trim(),
      fullUrl: (r.fullUrl && r.fullUrl.trim()) || r.thumbUrl.trim(),
    }));
}

function langField(/** @type {string} */ lang) {
  if (lang === "de") return "de";
  if (lang === "en") return "en";
  return "da";
}

/** @returns {Promise<{ da: unknown[], de: unknown[], en: unknown[], images: unknown[] }>} */
async function fetchOverridesForSave() {
  const res = await fetch(`${import.meta.env.BASE_URL || "/"}content/overrides.json`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Kunne ikke hente overrides.json");
  const obj = await res.json();
  const lists = {
    da: normalizeLocaleList(obj.da),
    de: normalizeLocaleList(obj.de),
    en: normalizeLocaleList(obj.en),
    images: normalizeImagesList(obj.images),
  };
  return {
    da: localeListToSave(lists.da),
    de: localeListToSave(lists.de),
    en: localeListToSave(lists.en),
    images: imageListToSave(lists.images),
  };
}

function injectBar() {
  if (document.getElementById("ooe-edit-bar")) return;
  const bar = document.createElement("div");
  bar.id = "ooe-edit-bar";
  bar.className = "ooe-edit-bar";
  bar.innerHTML = `
    <div class="ooe-edit-bar__inner">
      <span class="ooe-edit-bar__hint">CMS</span>
      <button type="button" class="ooe-edit-bar__btn ooe-edit-bar__btn--primary" id="ooe-btn-start">Rediger på siden</button>
      <button type="button" class="ooe-edit-bar__btn hidden" id="ooe-btn-save">Gem ændringer</button>
      <button type="button" class="ooe-edit-bar__btn hidden" id="ooe-btn-cancel">Annuller</button>
      <a class="ooe-edit-bar__link" href="/rediger/">Formular</a>
    </div>
  `;
  document.body.appendChild(bar);
}

/** @type {{ texts: Record<string, string>, html: Record<string, string>, imgs: Record<string, { src: string, href: string }> } | null} */
let snapshot = null;
let visualActive = false;

function collectDomState() {
  const texts = {};
  const html = {};
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    texts[key] = el.textContent ?? "";
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (!key) return;
    html[key] = el.innerHTML ?? "";
  });
  const imgs = {};
  document.querySelectorAll("[data-site-img]").forEach((el) => {
    if (!(el instanceof HTMLImageElement)) return;
    const id = el.getAttribute("data-site-img");
    if (!id) return;
    const a = el.closest("a[href]");
    imgs[id] = {
      src: el.src,
      href: a instanceof HTMLAnchorElement ? a.href : el.src,
    };
  });
  return { texts, html, imgs };
}

function diffAgainstSnapshot(/** @type {NonNullable<typeof snapshot>} */ snap) {
  const now = collectDomState();
  /** @type {Record<string, string>} */
  const textPatch = {};
  for (const [k, v] of Object.entries(now.texts)) {
    if ((snap.texts[k] ?? "") !== v) textPatch[k] = v;
  }
  /** @type {Record<string, string>} */
  const htmlPatch = {};
  for (const [k, v] of Object.entries(now.html)) {
    if ((snap.html[k] ?? "") !== v) htmlPatch[k] = v;
  }
  /** @type {Record<string, { thumbUrl: string, fullUrl: string }>} */
  const imgPatch = {};
  for (const [id, v] of Object.entries(now.imgs)) {
    const o = snap.imgs[id];
    if (!o || o.src !== v.src || o.href !== v.href) {
      imgPatch[id] = { thumbUrl: v.src, fullUrl: v.href };
    }
  }
  return { textPatch, htmlPatch, imgPatch };
}

function applyVisualStyles(active) {
  document.body.classList.toggle("ooe-visual-mode", active);
}

function enableContentEditable(on) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    if (on) {
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "true");
    } else {
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
    }
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    if (on) {
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "true");
    } else {
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
    }
  });
}

/** @type {(() => void) | null} */
let imgClickOff = null;

function bindImageEditing(on) {
  if (imgClickOff) {
    imgClickOff();
    imgClickOff = null;
  }
  if (!on) return;

  const handler = (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const imgSelf = t.closest("[data-site-img]");
    const fromLink = t.closest("a.glightbox")?.querySelector("[data-site-img]");
    const el = imgSelf ?? fromLink;
    const img = el instanceof HTMLImageElement ? el : null;
    if (!img) return;
    e.preventDefault();
    e.stopPropagation();
    const id = img.getAttribute("data-site-img") ?? "";
    const thumb = window.prompt("Thumbnail-URL (vist på siden):", img.src);
    if (thumb === null) return;
    const link = img.closest("a[href]");
    const defaultFull = link instanceof HTMLAnchorElement ? link.href : img.src;
    const full = window.prompt("Lightbox-URL (valgfri — Enter for samme som thumbnail):", defaultFull);
    if (full === null) return;
    img.src = thumb.trim() || img.src;
    if (link instanceof HTMLAnchorElement) {
      link.href = (full && full.trim()) || thumb.trim() || link.href;
    }
  };

  document.addEventListener("click", handler, true);
  imgClickOff = () => document.removeEventListener("click", handler, true);
}

function setBarMode(mode) {
  const start = document.getElementById("ooe-btn-start");
  const save = document.getElementById("ooe-btn-save");
  const cancel = document.getElementById("ooe-btn-cancel");
  if (!start || !save || !cancel) return;
  if (mode === "idle") {
    start.classList.remove("hidden");
    save.classList.add("hidden");
    cancel.classList.add("hidden");
  } else {
    start.classList.add("hidden");
    save.classList.remove("hidden");
    cancel.classList.remove("hidden");
  }
}

export function initVisualEdit() {
  const path = location.pathname;
  if (path.includes("/rediger")) return;

  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return;

  injectBar();
  const bar = document.getElementById("ooe-edit-bar");
  const btnStart = document.getElementById("ooe-btn-start");
  const btnSave = document.getElementById("ooe-btn-save");
  const btnCancel = document.getElementById("ooe-btn-cancel");
  if (!bar || !btnStart || !btnSave || !btnCancel) return;

  bar.classList.remove("hidden");

  const startVisual = () => {
    snapshot = collectDomState();
    visualActive = true;
    applyVisualStyles(true);
    enableContentEditable(true);
    bindImageEditing(true);
    setBarMode("edit");
  };

  const stopVisual = () => {
    visualActive = false;
    snapshot = null;
    applyVisualStyles(false);
    enableContentEditable(false);
    bindImageEditing(false);
    setBarMode("idle");
  };

  btnStart.addEventListener("click", startVisual);

  btnCancel.addEventListener("click", () => {
    if (!snapshot) return;
    location.reload();
  });

  btnSave.addEventListener("click", async () => {
    if (!snapshot || !visualActive) return;
    const { textPatch, htmlPatch, imgPatch } = diffAgainstSnapshot(snapshot);
    const keys = Object.keys(textPatch).length + Object.keys(htmlPatch).length + Object.keys(imgPatch).length;
    if (keys === 0) {
      window.alert("Ingen ændringer at gemme.");
      return;
    }

    btnSave.setAttribute("disabled", "true");
    try {
      const base = await fetchOverridesForSave();
      const lang = langField(getLocale());
      const lists = {
        da: normalizeLocaleList(base.da),
        de: normalizeLocaleList(base.de),
        en: normalizeLocaleList(base.en),
        images: normalizeImagesList(base.images),
      };

      for (const [k, v] of Object.entries(textPatch)) {
        upsertKv(lists[lang], k, v);
      }
      for (const [k, v] of Object.entries(htmlPatch)) {
        upsertKv(lists[lang], k, v);
      }
      for (const [id, spec] of Object.entries(imgPatch)) {
        upsertImg(lists.images, id, spec.thumbUrl, spec.fullUrl);
      }

      const overrides = {
        da: localeListToSave(lists.da),
        de: localeListToSave(lists.de),
        en: localeListToSave(lists.en),
        images: imageListToSave(lists.images),
      };

      const res = await fetch("/api/cms-save-overrides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ overrides }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(data.error || "Gem fejlede (" + res.status + ")");
        return;
      }
      window.alert("Gemt. Siden genindlæses om lidt — Vercel bygger på ny.");
      location.reload();
    } catch (e) {
      window.alert(String(e && e.message ? e.message : e));
    } finally {
      btnSave.removeAttribute("disabled");
    }
  });

  const params = new URLSearchParams(location.search);
  if (params.get("visuel") === "1") {
    params.delete("visuel");
    const q = params.toString();
    const newUrl = location.pathname + (q ? "?" + q : "") + location.hash;
    window.history.replaceState({}, "", newUrl);
    requestAnimationFrame(startVisual);
  }
}
