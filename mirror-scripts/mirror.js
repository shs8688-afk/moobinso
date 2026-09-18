// Site mirror: downloads the real deployed HTML/CSS/JS/images from
// https://www.moobinso.com as-is, preserving directory structure,
// so the actual served code can be committed to git for backup.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");

const ORIGIN = "https://www.moobinso.com";
const OUT_DIR = path.resolve(__dirname, "..", "site");
const IMAGES_DIR = path.join(OUT_DIR, "assets", "images");
const MAX_PAGES = 120;
const DELAY_MS = 200;
const MAX_IMAGE_WIDTH = 1600;
const WEBP_QUALITY = 78;

// Pages embed photos as inline base64 data URIs, which bloats each
// HTML file to hundreds of KB-1.5MB. Pull those out, downscale/
// recompress to WebP, and write them to assets/images/ (deduped by
// content hash of the OPTIMIZED bytes), replacing the data URI with
// a relative path. Keeps every page's HTML small and readable while
// shrinking the actual image payloads too.
const DATA_URI_RE = /data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)/g;
const EXT_BY_MIME = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

async function compressImage(buf, mime) {
  try {
    const meta = await sharp(buf).metadata();
    let pipeline = sharp(buf).rotate();
    if (meta.width && meta.width > MAX_IMAGE_WIDTH) {
      pipeline = pipeline.resize({ width: MAX_IMAGE_WIDTH });
    }
    const optimized = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
    if (optimized.length < buf.length) return { buffer: optimized, ext: "webp" };
  } catch (e) {
    console.log(`  (image compress skipped: ${e.message})`);
  }
  return { buffer: buf, ext: EXT_BY_MIME[mime] };
}

async function extractInlineImages(html, pageFilePath) {
  const pageDir = path.dirname(pageFilePath);
  const relDir = path.relative(OUT_DIR, pageDir);
  const depth = relDir === "" ? 0 : relDir.split(path.sep).length;
  const prefix = depth === 0 ? "" : "../".repeat(depth);

  const uniqueMatches = [...new Set([...html.matchAll(DATA_URI_RE)].map((m) => m[0]))];
  if (uniqueMatches.length === 0) return html;

  const replacements = new Map();
  for (const full of uniqueMatches) {
    const m = new RegExp(DATA_URI_RE.source).exec(full);
    const [, mime, b64] = m;
    const original = Buffer.from(b64, "base64");
    const { buffer, ext } = await compressImage(original, mime);
    const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 16);
    const filename = `${hash}.${ext}`;
    const outPath = path.join(IMAGES_DIR, filename);
    if (!fs.existsSync(outPath)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true });
      fs.writeFileSync(outPath, buffer);
    }
    console.log(`  image ${(original.length / 1024).toFixed(0)}KB -> ${(buffer.length / 1024).toFixed(0)}KB  ${filename}`);
    replacements.set(full, `${prefix}assets/images/${filename}`);
  }

  return html.replace(DATA_URI_RE, (full) => replacements.get(full));
}

const seedPaths = [
  "/", "/guide/", "/guide/faq/", "/funeral-halls/", "/funeral-service/",
  "/funeral-service/reserve/", "/memorial/", "/memorial/venues/",
  "/support/", "/support/additional/", "/obituary/", "/prepaid-analysis/",
  "/life-ten-shots/", "/farewell-note/", "/reviews/", "/consult/",
  "/signup/", "/about/", "/login/", "/mypage/",
];

const pageQueue = [...seedPaths];
const visitedPages = new Set();
const assetQueue = new Set();
const savedAssets = new Set();
const errors = [];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function localFilePathForPage(urlPath) {
  let p = urlPath.split("?")[0].split("#")[0];
  if (p.endsWith("/")) p += "index.html";
  else if (!path.extname(p)) p += "/index.html";
  return path.join(OUT_DIR, p);
}

function localFilePathForAsset(urlPath) {
  const p = urlPath.split("?")[0].split("#")[0];
  return path.join(OUT_DIR, p);
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function isSameOrigin(url) {
  try {
    const u = new URL(url, ORIGIN);
    return u.hostname === "www.moobinso.com" || u.hostname === "moobinso.com";
  } catch {
    return false;
  }
}

function toPathname(url) {
  const u = new URL(url, ORIGIN);
  return u.pathname + (u.search || "");
}

// Extract same-origin asset/link references from HTML
function extractRefsFromHtml(html, baseUrl) {
  const refs = new Set();
  const attrRe = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(html))) {
    const raw = m[1];
    if (!raw || raw.startsWith("data:") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:") || raw.startsWith("#")) continue;
    try {
      const abs = new URL(raw, baseUrl).toString();
      if (isSameOrigin(abs)) refs.add(abs);
    } catch {}
  }
  // CSS url(...) inside inline <style> or style attrs
  const cssUrlRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  while ((m = cssUrlRe.exec(html))) {
    const raw = m[1];
    if (!raw || raw.startsWith("data:")) continue;
    try {
      const abs = new URL(raw, baseUrl).toString();
      if (isSameOrigin(abs)) refs.add(abs);
    } catch {}
  }
  return refs;
}

function extractRefsFromCss(css, baseUrl) {
  const refs = new Set();
  const cssUrlRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  let m;
  while ((m = cssUrlRe.exec(css))) {
    const raw = m[1];
    if (!raw || raw.startsWith("data:")) continue;
    try {
      const abs = new URL(raw, baseUrl).toString();
      if (isSameOrigin(abs)) refs.add(abs);
    } catch {}
  }
  return refs;
}

function isPageLink(pathname) {
  const ext = path.extname(pathname.split("?")[0]);
  return ext === "" || ext === ".html";
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (site-backup-mirror)" } });
  return { res, text: await res.text() };
}

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (site-backup-mirror)" } });
  const buf = Buffer.from(await res.arrayBuffer());
  return { res, buf };
}

async function crawlPages() {
  let count = 0;
  while (pageQueue.length && count < MAX_PAGES) {
    const p = pageQueue.shift();
    const pathname = p.split("?")[0];
    if (visitedPages.has(pathname)) continue;
    visitedPages.add(pathname);
    count++;
    const url = new URL(pathname, ORIGIN).toString();
    try {
      const { res, text } = await fetchText(url);
      if (res.status >= 400) {
        errors.push(`PAGE ${res.status} ${url}`);
        continue;
      }
      const finalUrl = res.url && isSameOrigin(res.url) ? res.url : url;
      const filePath = localFilePathForPage(new URL(finalUrl).pathname);
      ensureDirFor(filePath);
      const cleanedHtml = await extractInlineImages(text, filePath);
      fs.writeFileSync(filePath, cleanedHtml, "utf8");
      console.log(`PAGE  ${res.status}  ${pathname}  ->  ${path.relative(OUT_DIR, filePath)}`);

      const refs = extractRefsFromHtml(text, finalUrl);
      for (const ref of refs) {
        const rp = toPathname(ref);
        if (isPageLink(rp)) {
          if (!visitedPages.has(rp) && !pageQueue.includes(rp)) pageQueue.push(rp);
        } else {
          assetQueue.add(ref);
        }
      }
    } catch (e) {
      errors.push(`PAGE ERR ${url}: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }
}

async function crawlAssets() {
  const seen = new Set();
  let queue = [...assetQueue];
  while (queue.length) {
    const url = queue.shift();
    const pathname = toPathname(url);
    if (seen.has(pathname)) continue;
    seen.add(pathname);
    try {
      const { res, buf } = await fetchBuffer(url);
      if (res.status >= 400) {
        errors.push(`ASSET ${res.status} ${url}`);
        continue;
      }
      const filePath = localFilePathForAsset(pathname);
      ensureDirFor(filePath);
      fs.writeFileSync(filePath, buf);
      savedAssets.add(pathname);
      console.log(`ASSET ${res.status}  ${pathname}`);

      if (pathname.endsWith(".css")) {
        const css = buf.toString("utf8");
        const refs = extractRefsFromCss(css, url);
        for (const ref of refs) {
          const rp = toPathname(ref);
          if (!seen.has(rp)) queue.push(ref);
        }
      }
    } catch (e) {
      errors.push(`ASSET ERR ${url}: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }
}

async function fetchWellKnownFiles() {
  const textFiles = ["/robots.txt", "/sitemap.xml"];
  for (const p of textFiles) {
    try {
      const { res, text } = await fetchText(new URL(p, ORIGIN).toString());
      if (res.status >= 400) { errors.push(`WELLKNOWN ${res.status} ${p}`); continue; }
      const filePath = localFilePathForAsset(p);
      ensureDirFor(filePath);
      fs.writeFileSync(filePath, text, "utf8");
      console.log(`WELLKNOWN ${res.status}  ${p}`);
    } catch (e) {
      errors.push(`WELLKNOWN ERR ${p}: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  try {
    const { res, buf } = await fetchBuffer(new URL("/og-image.jpg", ORIGIN).toString());
    if (res.status < 400) {
      const { buffer, ext } = await compressImage(buf, "image/jpeg");
      const filePath = path.join(OUT_DIR, `og-image.${ext}`);
      fs.writeFileSync(filePath, buffer);
      console.log(`WELLKNOWN ${res.status}  /og-image.jpg -> og-image.${ext}  (${(buf.length / 1024).toFixed(0)}KB -> ${(buffer.length / 1024).toFixed(0)}KB)`);
    } else {
      errors.push(`WELLKNOWN ${res.status} /og-image.jpg`);
    }
  } catch (e) {
    errors.push(`WELLKNOWN ERR /og-image.jpg: ${e.message}`);
  }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("== Crawling pages ==");
  await crawlPages();
  console.log("\n== Downloading assets ==");
  await crawlAssets();
  console.log("\n== Fetching well-known files ==");
  await fetchWellKnownFiles();

  console.log("\n== Summary ==");
  console.log(`Pages saved:  ${visitedPages.size}`);
  console.log(`Assets saved: ${savedAssets.size}`);
  if (errors.length) {
    console.log(`Errors (${errors.length}):`);
    errors.forEach((e) => console.log("  " + e));
  }
})();
