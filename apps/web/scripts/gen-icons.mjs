// Generate PWA icons (LayoutGrid monogram on burnt-amber) with sharp.
// Run: node apps/web/scripts/gen-icons.mjs
import sharp from 'sharp';

const BG = '#E1722B';

function svg(size, inset, bgRadiusRatio) {
  const pad = Math.round(size * inset);
  const g = size - pad * 2;
  const cell = Math.round(g * 0.42);
  const gap = g - cell * 2;
  const r = Math.round(cell * 0.26);
  const x0 = pad;
  const y0 = pad;
  const x1 = pad + cell + gap;
  const y1 = pad + cell + gap;
  const rect = (x, y) =>
    `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${r}" fill="white"/>`;
  const bgR = Math.round(size * bgRadiusRatio);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${bgR}" fill="${BG}"/>
    ${rect(x0, y0)}${rect(x1, y0)}${rect(x0, y1)}${rect(x1, y1)}
  </svg>`;
}

const pub = new URL('../public/', import.meta.url).pathname;

async function gen(name, size, inset, bgRadiusRatio) {
  await sharp(Buffer.from(svg(size, inset, bgRadiusRatio))).png().toFile(pub + name);
  console.log('wrote', name);
}

await gen('icon-192.png', 192, 0.22, 0.22);
await gen('icon-512.png', 512, 0.22, 0.22);
// Maskable: full-bleed background (no corner radius), glyph inside the central safe zone.
await gen('icon-maskable-512.png', 512, 0.3, 0);
await gen('apple-touch-icon.png', 180, 0.2, 0.22);
console.log('done');
