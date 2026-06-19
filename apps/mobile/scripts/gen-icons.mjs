// @tilemo/mobile — rasterize the brand SVGs (../../../brand/*.svg) into the PNG
// assets Expo needs: app icon, Android adaptive fg/bg, splash, web favicon.
//
//   node apps/mobile/scripts/gen-icons.mjs
//
// Re-run after editing any brand/*.svg. Output is committed (EAS Build reads
// the PNGs, not the SVGs).
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRAND = join(__dirname, "..", "..", "..", "brand");
const ASSETS = join(__dirname, "..", "assets");

const FONT = {
  loadSystemFonts: true,
  defaultFontFamily: "PingFang SC",
  fontFiles: ["/System/Library/Fonts/PingFang.ttc"],
};

function render(svgPath, outPath, w, h = w) {
  let svg = readFileSync(svgPath, "utf-8");
  svg = svg.replace(/width="[^"]*"/, `width="${w}"`).replace(/height="[^"]*"/, `height="${h}"`);
  const png = new Resvg(svg, { font: FONT }).render().asPng();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  console.log(`  ${w}×${h}  →  ${outPath.replace(ASSETS + "/", "assets/")}`);
}

console.log("▸ mobile icons → apps/mobile/assets");
render(join(BRAND, "icon.svg"), join(ASSETS, "icon.png"), 1024); // iOS + Android legacy app icon
render(join(BRAND, "adaptive-fg.svg"), join(ASSETS, "adaptive-icon.png"), 1024); // android.adaptiveIcon.foregroundImage
render(join(BRAND, "adaptive-bg.svg"), join(ASSETS, "adaptive-background.png"), 1024); // android.adaptiveIcon.backgroundImage
render(join(BRAND, "icon.svg"), join(ASSETS, "favicon.png"), 48); // web.favicon
render(join(BRAND, "splash.svg"), join(ASSETS, "splash.png"), 1242, 2436); // splash.image
console.log("done.");
