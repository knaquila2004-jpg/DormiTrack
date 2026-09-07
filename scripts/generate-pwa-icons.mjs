// Rasterizes DormiTrack's real logo artwork (src/assets/logo-source/1P.png —
// purple mark, for white/light backgrounds — and 2W.png — white mark, for
// colored/gradient backgrounds) into every PNG size the PWA manifest + iOS
// home-screen icon + browser favicon need, plus the in-app logo images used
// by <DormiLogo> (src/app/components/DormiLogo.tsx).
//
// Run with: node scripts/generate-pwa-icons.mjs
// Requires `sharp` in node_modules (installed with
// `npm install --no-save sharp` so it never touches package.json).
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const srcDir = path.resolve(__dirname, "../src/assets/logo-source");
mkdirSync(publicDir, { recursive: true });

const PURPLE_SRC = path.join(srcDir, "1P.png"); // for white/light backgrounds
const WHITE_SRC = path.join(srcDir, "2W.png");  // for colored/gradient backgrounds

// No colored square/tile behind any of these — just the transparent logo
// mark itself, resized to fit each icon's canvas. safeZone leaves margin
// around the mark (smaller for the maskable icon, which Android can crop
// into a circle/squircle, so the mark needs to sit well inside that crop).
async function makeAppIcon(size, safeZone) {
  const logoSize = Math.round(size * safeZone);
  const offset = Math.round((size - logoSize) / 2);
  const canvas = sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const logo = await sharp(PURPLE_SRC).resize(logoSize, logoSize, { fit: "contain" }).toBuffer();
  return canvas.composite([{ input: logo, left: offset, top: offset }]).png().toBuffer();
}

const appIconJobs = [
  { file: "icon-192.png", size: 192, safeZone: 0.8 },
  { file: "icon-512.png", size: 512, safeZone: 0.8 },
  { file: "icon-maskable-512.png", size: 512, safeZone: 0.5 },
  { file: "apple-touch-icon.png", size: 180, safeZone: 0.8 },
];
for (const j of appIconJobs) {
  const buf = await makeAppIcon(j.size, j.safeZone);
  writeFileSync(path.join(publicDir, j.file), buf);
  console.log("wrote", j.file);
}

// Favicons: the transparent purple mark directly (a browser tab is a
// white/light context per the brief), no colored tile behind it.
for (const [file, size] of [["favicon-32x32.png", 32], ["favicon-16x16.png", 16]]) {
  const buf = await sharp(PURPLE_SRC).resize(size, size, { fit: "contain" }).png().toBuffer();
  writeFileSync(path.join(publicDir, file), buf);
  console.log("wrote", file);
}

// favicon.svg: a real SVG wrapper embedding the purple PNG, so the existing
// <link rel="icon" type="image/svg+xml" href="/favicon.svg"> in index.html
// keeps working unchanged — the source artwork itself is raster, not vector,
// so this embeds it rather than tracing new vector paths.
const faviconPngBuf = await sharp(PURPLE_SRC).resize(512, 512, { fit: "contain" }).png().toBuffer();
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${faviconPngBuf.toString("base64")}"/></svg>`;
writeFileSync(path.join(publicDir, "favicon.svg"), faviconSvg);
console.log("wrote favicon.svg");

// In-app logo images — what <DormiLogo> (components/DormiLogo.tsx) actually
// renders via <img>. Kept at a modest 512px rather than shipping the full
// masters to every visitor.
await sharp(PURPLE_SRC).resize(512, 512, { fit: "contain" }).png().toFile(path.join(publicDir, "logo-purple.png"));
console.log("wrote logo-purple.png");
await sharp(WHITE_SRC).resize(512, 512, { fit: "contain" }).png().toFile(path.join(publicDir, "logo-white.png"));
console.log("wrote logo-white.png");
