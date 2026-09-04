// One-off script to rasterize the DormiTrack app icon (same mark + gradient
// used by <DormiLogo white /> on the in-app splash screen, see
// src/app/App.tsx and the GRAD_H constant in src/app/shared.ts) into the PNG
// sizes needed for the PWA manifest + iOS home-screen icon.
//
// Run with: node scripts/generate-pwa-icons.mjs
// Requires `sharp` to be present in node_modules (installed with
// `npm install --no-save sharp` so it never touches package.json).
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
mkdirSync(publicDir, { recursive: true });

// Master icon: 512x512, full-bleed brand gradient (GRAD_H: 160deg
// #9772F6 -> #7549F6) with the white DormiLogo mark centered and scaled to
// sit inside the ~80% "safe zone" so it also works as a maskable icon.
const masterSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="80" y1="0" x2="420" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="#9772F6" />
      <stop offset="1" stop-color="#7549F6" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" />
  <g transform="translate(126,146) scale(3.2)">
    <path d="M8 8 L8 64 L36 64 C53.673 64 66 52.837 66 36 C66 19.163 53.673 8 36 8 Z" fill="rgba(255,255,255,0.97)" />
    <path d="M36 20 C49 20 57 27.5 57 36 C57 44.5 49 52 36 52 Z" fill="rgba(151,114,246,0.28)" />
    <circle cx="50" cy="36" r="2.5" fill="rgba(255,255,255,0.55)" />
  </g>
</svg>`;

// Favicon variant (small sizes): flatter, slightly bolder mark so it still
// reads at 16-32px.
const faviconSvg = (size) => masterSvg(size);

const targets = [
  { file: "icon-192.png", size: 192, svg: masterSvg },
  { file: "icon-512.png", size: 512, svg: masterSvg },
  { file: "icon-maskable-512.png", size: 512, svg: masterSvg },
  { file: "apple-touch-icon.png", size: 180, svg: masterSvg },
  { file: "favicon-32x32.png", size: 32, svg: faviconSvg },
  { file: "favicon-16x16.png", size: 16, svg: faviconSvg },
];

for (const t of targets) {
  const svg = Buffer.from(t.svg(t.size));
  await sharp(svg, { density: 384 })
    .resize(t.size, t.size)
    .png()
    .toFile(path.join(publicDir, t.file));
  console.log("wrote", t.file);
}

// Also drop the raw master SVG in public/ for a crisp scalable favicon and
// as the source of truth for the icon design.
writeFileSync(path.join(publicDir, "favicon.svg"), masterSvg(512).trim());
console.log("wrote favicon.svg");
