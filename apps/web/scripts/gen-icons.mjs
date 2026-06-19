// @tilemo/web — rasterize the brand SVGs (../../brand/*.svg) into the PNG/ICO
// assets the web app needs: favicon.ico, apple-touch-icon, PWA 192/512,
// maskable 512, and the 1200×630 social card.
//
//   node apps/web/scripts/gen-icons.mjs
//
// Why resvg: pure-Rust SVG→PNG, no system deps, crisp at every size.
// Re-run after editing any brand/*.svg.
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRAND = join(__dirname, "..", "..", "..", "brand");
const PUBLIC = join(__dirname, "..", "public");

// resvg needs an explicit CJK font for the wordmark on og-image. On macOS that's
// PingFang; loadSystemFonts also scans the rest as a fallback.
const FONT = {
  loadSystemFonts: true,
  defaultFontFamily: "PingFang SC",
  fontFiles: ["/System/Library/Fonts/PingFang.ttc"],
};

// Render `svg` at exactly w×h by swapping its intrinsic size, then rasterize.
function render(svgPath, outPath, w, h = w) {
  let svg = readFileSync(svgPath, "utf-8");
  svg = svg.replace(/width="[^"]*"/, `width="${w}"`).replace(/height="[^"]*"/, `height="${h}"`);
  const png = new Resvg(svg, { font: FONT }).render().asPng();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  console.log(`  ${w}×${h}  →  ${outPath.replace(PUBLIC + "/", "/")}`);
  return png;
}

// Compose a multi-resolution .ico from PNG buffers (PNG-in-ICO, supported since Vista).
function writeIco(entries, outPath) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = ICO
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const dir = [];
  for (const { size, png } of entries) {
    const de = Buffer.alloc(16);
    const v = size === 256 ? 0 : size;
    de.writeUInt8(v, 0); // width  (0 = 256)
    de.writeUInt8(v, 1); // height (0 = 256)
    de.writeUInt8(0, 2); // palette
    de.writeUInt8(0, 3); // reserved
    de.writeUInt16LE(1, 4); // planes
    de.writeUInt16LE(32, 6); // bpp
    de.writeUInt32LE(png.length, 8);
    de.writeUInt32LE(offset, 12);
    dir.push(de);
    offset += png.length;
  }
  writeFileSync(outPath, Buffer.concat([header, ...dir, ...entries.map((e) => e.png)]));
  console.log(`  ico     →  ${outPath.replace(PUBLIC + "/", "/")}`);
}

console.log("▸ web icons → apps/web/public");
// favicon.svg (the master mark) + the raster ladder
copyFileSync(join(BRAND, "icon.svg"), join(PUBLIC, "icon.svg"));
console.log("  svg     →  /icon.svg");
const p16 = render(join(BRAND, "icon.svg"), join(PUBLIC, "favicon-16.png"), 16);
const p32 = render(join(BRAND, "icon.svg"), join(PUBLIC, "favicon-32.png"), 32);
const p48 = render(join(BRAND, "icon.svg"), join(PUBLIC, "favicon-48.png"), 48);
render(join(BRAND, "icon.svg"), join(PUBLIC, "apple-touch-icon.png"), 180);
render(join(BRAND, "icon.svg"), join(PUBLIC, "icon-192.png"), 192);
render(join(BRAND, "icon.svg"), join(PUBLIC, "icon-512.png"), 512);
render(join(BRAND, "maskable.svg"), join(PUBLIC, "maskable-icon-512.png"), 512);
writeIco(
  [
    { size: 16, png: p16 },
    { size: 32, png: p32 },
    { size: 48, png: p48 },
  ],
  join(PUBLIC, "favicon.ico"),
);
render(join(BRAND, "og-image.svg"), join(PUBLIC, "og-image.png"), 1200, 630);
console.log("done.");
