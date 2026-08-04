// Generates PWA icons from hand-authored SVG sources into public/icons/.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");

const BG = "#141414";

// Lucide "piggy-bank" glyph paths (24x24 viewBox), scaled + centered so the
// glyph sits well inside the maskable "safe zone" (central ~80%) at every size.
const GLYPH = `
  <g transform="translate(124,124) scale(11)" fill="none" stroke="#d4f24e"
     stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z" />
    <path d="M16 10h.01" />
    <path d="M2 8v1a2 2 0 0 0 2 2h1" />
  </g>
`;

// Rounded background — used for the standard "any" purpose manifest icons.
const roundedSvg = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="96" fill="${BG}" />
    ${GLYPH}
  </svg>
`;

// Full-bleed square background, no baked-in rounding — required for
// maskable icons and Apple touch icons, both of which apply their own mask.
const squareSvg = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="${BG}" />
    ${GLYPH}
  </svg>
`;

async function main() {
  await mkdir(outDir, { recursive: true });

  const roundedBuf = Buffer.from(roundedSvg);
  const squareBuf = Buffer.from(squareSvg);

  await sharp(roundedBuf).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
  await sharp(roundedBuf).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
  await sharp(squareBuf).resize(512, 512).png().toFile(path.join(outDir, "icon-512-maskable.png"));
  await sharp(squareBuf).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));

  console.log("Generated icons in", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
