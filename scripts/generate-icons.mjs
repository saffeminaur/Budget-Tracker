// Generates PWA icons from a hand-authored SVG source into public/icons/.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");

const BG = "#141414";
const FG = "#d4f24e";

// A geometric, single-color piggy-bank silhouette (flat shapes, not a
// cartoon mascot) — body + snout as one merged mass, a pointed ear, four
// short stub legs, and a small tail curl, all in FG. Eye/nostrils/coin
// slot are cut in as BG-colored accents for a clean two-tone fintech-icon
// look. Deliberately kept inside a generous safe zone (content spans
// roughly the center 55% of the 512 canvas) so it survives the maskable
// mask and still reads clearly at 180/192px.
const GLYPH = `
  <g>
    <!-- tail curl -->
    <path d="M 106 242 A 20 20 0 1 1 140 268" fill="none" stroke="${FG}"
      stroke-width="16" stroke-linecap="round" />

    <!-- ear -->
    <polygon points="150,210 192,150 232,204" fill="${FG}" />

    <!-- body + snout (single merged silhouette) -->
    <ellipse cx="246" cy="272" rx="108" ry="76" fill="${FG}" />
    <rect x="336" y="244" width="60" height="54" rx="18" fill="${FG}" />

    <!-- legs -->
    <rect x="156" y="338" width="38" height="56" rx="12" fill="${FG}" />
    <rect x="220" y="338" width="38" height="56" rx="12" fill="${FG}" />
    <rect x="284" y="338" width="38" height="56" rx="12" fill="${FG}" />
    <rect x="346" y="338" width="38" height="56" rx="12" fill="${FG}" />

    <!-- coin slot -->
    <rect x="234" y="212" width="64" height="16" rx="8" fill="${BG}" />

    <!-- eye -->
    <circle cx="328" cy="248" r="9" fill="${BG}" />

    <!-- nostrils -->
    <circle cx="380" cy="258" r="6" fill="${BG}" />
    <circle cx="380" cy="284" r="6" fill="${BG}" />
  </g>
`;

// Rounded-square background — used for the standard "any" purpose manifest
// icons (most Android launchers apply their own mask anyway, but this looks
// right anywhere that doesn't).
const roundedSvg = `
  <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="112" fill="${BG}" />
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
