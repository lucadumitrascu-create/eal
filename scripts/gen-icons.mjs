// Generates the whole favicon / app-icon set from the hero's ray-traced glass
// ring (Blender/Cycles). Every size is rendered from the 2000px source — none
// is a rescale of another, which is what keeps 16px crisp.
//
//   node scripts/gen-icons.mjs
//
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RING = resolve(root, 'public/images/hero/hero-ring-v5.webp');
const pub = (f) => resolve(root, 'public', f);

const S = 1400;                       // working canvas
const IN = [18, 128, 158];            // radial centre
const OUT = [9, 88, 110];             // radial edge
const PLATE = 0.86;                   // ring width inside the plate
const SAFE = 0.60;                    // Android maskable safe zone (72/108)
const RADIUS = 0.22;                  // plate corner radius

// Radial teal ground, echoing the hero's own lift behind the headline.
function ground(n) {
  const b = Buffer.alloc(n * n * 3);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.min(1, Math.hypot(x - n / 2, y - n * 0.42) / (n * 0.72));
      const i = (y * n + x) * 3;
      for (let c = 0; c < 3; c++) b[i + c] = Math.round(IN[c] * (1 - d) + OUT[c] * d);
    }
  }
  return sharp(b, { raw: { width: n, height: n, channels: 3 } }).png().toBuffer();
}

async function master(scale) {
  const bg = await ground(S);
  const s = Math.round(S * scale);
  const ring = await sharp(RING).resize(s, s, { kernel: 'lanczos3' }).png().toBuffer();
  const off = Math.round((S - s) / 2);
  return sharp(bg).composite([{ input: ring, top: off, left: off }]).png().toBuffer();
}

async function render(src, n, { round = false } = {}) {
  let p = sharp(src).resize(n, n, { kernel: 'lanczos3' });
  if (n <= 64) p = p.sharpen({ sigma: 0.55, m1: 0.6, m2: 1.6 });
  let buf = await p.png({ compressionLevel: 9 }).toBuffer();
  if (round) {
    const r = Math.round(n * RADIUS);
    const mask = Buffer.from(
      `<svg width="${n}" height="${n}"><rect width="${n}" height="${n}" rx="${r}" ry="${r}" fill="#fff"/></svg>`
    );
    buf = await sharp(buf).composite([{ input: mask, blend: 'dest-in' }])
      .png({ compressionLevel: 9 }).toBuffer();
  }
  return buf;
}

// PNG-in-ICO: header, one directory entry per size, then the PNG payloads.
function ico(items) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(items.length, 4);
  const dir = Buffer.alloc(16 * items.length);
  let offset = 6 + dir.length;
  items.forEach(({ size, buf }, i) => {
    const e = dir.subarray(i * 16, i * 16 + 16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8); e.writeUInt32LE(offset, 12);
    offset += buf.length;
  });
  return Buffer.concat([head, dir, ...items.map((i) => i.buf)]);
}

// The ring's silhouette, traced from the render's alpha channel (IoU 99.6%).
// Safari tints this itself, so it must be a single opaque colour.
const RING_PATH = process.env.RING_PATH_FILE
  ? (await import('node:fs')).readFileSync(process.env.RING_PATH_FILE, 'utf8').trim()
  : null;

const plate = await master(PLATE);
const safe = await master(SAFE);

const wrote = [];
const put = (name, buf) => { writeFileSync(pub(name), buf); wrote.push([name, buf.length]); };

// favicon.ico — the one URL browsers probe on their own
put('favicon.ico', ico(await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, buf: await render(plate, size, { round: true }) }))
)));

put('favicon-32-v2.png', await render(plate, 32, { round: true }));
put('favicon-48-v2.png', await render(plate, 48, { round: true }));

// iOS applies its own squircle, so no corners of our own and no transparency
put('apple-touch-icon.png', await sharp(await render(plate, 180)).flatten().png().toBuffer());

// PWA "any": shown unmasked, so it can use the full plate width
put('icon-192.png', await sharp(await render(plate, 192)).flatten().png().toBuffer());
put('icon-512.png', await sharp(await render(plate, 512)).flatten().png().toBuffer());

// PWA "maskable": launchers crop to the central 66.7%, so the ring shrinks
put('icon-192-maskable.png', await sharp(await render(safe, 192)).flatten().png().toBuffer());
put('icon-512-maskable.png', await sharp(await render(safe, 512)).flatten().png().toBuffer());

if (RING_PATH) {
  put('mask-icon.svg', Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="${RING_PATH}" fill="#000"/></svg>\n`
  ));
}

for (const [n, b] of wrote) console.log(`  ${n.padEnd(26)} ${b.toLocaleString().padStart(9)} B`);
