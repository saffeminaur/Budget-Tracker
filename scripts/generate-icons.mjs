// Generates the PWA icon set in public/icons/ from the hand-designed
// public/icons/femina_icon.svg source. Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
const sourceSvg = path.join(outDir, "femina_icon.svg");

async function main() {
  const svgBuf = await readFile(sourceSvg);

  // femina_icon.svg is a complete, finished icon (its rounded background
  // is baked into the artwork itself) — every raster size below is just
  // this same source resized, no separate glyph/background compositing
  // needed like the old hardcoded-glyph version required.
  await sharp(svgBuf).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
  await sharp(svgBuf).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
  // No separate full-bleed artwork exists for maskable icons, so this
  // reuses the same render as icon-512.png above (matches the actual
  // files currently checked in).
  await sharp(svgBuf).resize(512, 512).png().toFile(path.join(outDir, "icon-512-maskable.png"));
  await sharp(svgBuf).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));

  console.log("Generated icons in", outDir, "from", sourceSvg);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
