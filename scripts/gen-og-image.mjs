// Generates the link-share (Open Graph) card into public/og-cover-<hash>.png
// and records the filename in src/data/og-image.json.
// Renders an HTML card that matches the live hero brand (Outfit/DM Sans,
// the site's cyan/teal only, the ray-traced glass ring), at 2x, then
// supersamples down to a crisp 1200x630 PNG.
//
//   node scripts/gen-og-image.mjs
//
import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const W = 1200, H = 630;

// Inline the glass ring so nothing has to load over the network.
const ringB64 = readFileSync(resolve(root, 'public/images/hero/hero-ring-v5.webp')).toString('base64');
const ringSrc = `data:image/webp;base64,${ringB64}`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; }
  .card {
    position:relative; width:${W}px; height:${H}px; overflow:hidden;
    background:
      radial-gradient(120% 90% at 50% 34%, #eef9fd 0%, #dcf0f7 55%, #cfe9f2 100%);
    font-family:'DM Sans', sans-serif;
  }
  /* soft brand mesh glows — cyan, sky, teal: the site's palette, nothing else */
  .glow { position:absolute; border-radius:50%; filter:blur(60px); pointer-events:none; }
  .glow.cyan   { width:620px; height:620px; left:-160px; top:-220px; background:rgba(6,182,212,0.20); }
  .glow.teal   { width:520px; height:520px; right:-120px; bottom:-200px; background:rgba(14,116,144,0.15); }
  .glow.sky    { width:420px; height:420px; right:240px;  top:-160px;   background:rgba(34,180,214,0.13); }

  /* signature glass ring, bleeding off the right edge like the hero frames the headline */
  .ring {
    position:absolute; right:-176px; top:50%; transform:translateY(-50%);
    width:660px; height:660px;
    filter: drop-shadow(0 24px 60px rgba(8,145,178,0.18));
    opacity:.96;
  }
  .ring img { width:100%; height:100%; display:block; }

  .content {
    position:absolute; left:84px; top:0; bottom:0; width:720px;
    display:flex; flex-direction:column; justify-content:center;
  }

  .wordmark {
    display:flex; align-items:center; gap:12px;
    font-family:'Outfit', sans-serif; font-weight:700;
    font-size:26px; letter-spacing:.16em; text-transform:uppercase;
    margin-bottom:30px;
  }
  .wordmark .eal { color:#0c1a2a; }
  .wordmark .ent { color:#0891B2; }

  h1 {
    font-family:'Outfit', sans-serif; font-weight:800;
    font-size:88px; line-height:1.02; letter-spacing:-0.028em;
    color:#0c1a2a;
  }
  h1 .accent { color:#0891B2; }

  .sub {
    margin-top:26px; font-size:25px; font-weight:500; line-height:1.45;
    color:#3f5c70; max-width:600px; letter-spacing:-0.005em; text-wrap:balance;
  }
  .sub .nb { white-space:nowrap; }
  .sub .sep { color:#0891B2; opacity:.55; padding:0 4px; }

  .bar { margin-top:34px; width:76px; height:5px; border-radius:99px;
         background:linear-gradient(90deg,#0E7490 0%, #0891B2 50%, #06B6D4 100%); }

  .domain {
    position:absolute; left:84px; bottom:52px;
    display:flex; align-items:center; gap:12px;
    font-family:'Outfit', sans-serif; font-weight:600; font-size:26px;
    color:#0e7490; letter-spacing:-0.01em;
  }
</style></head>
<body>
  <div class="card">
    <div class="glow cyan"></div>
    <div class="glow sky"></div>
    <div class="glow teal"></div>
    <div class="ring"><img src="${ringSrc}" alt=""></div>

    <div class="content">
      <div class="wordmark"><span class="eal">EAL</span>&nbsp;<span class="ent">Enterprises</span></div>
      <h1>We build software<br><span class="accent">that works.</span></h1>
      <div class="sub">Custom web development<span class="sep">·</span>UI/UX design<span class="sep">·</span><span class="nb">e-commerce</span><span class="sep">·</span>ongoing support</div>
      <div class="bar"></div>
    </div>

    <div class="domain">ealenterprises.com</div>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(async () => { await document.fonts.ready; });
await page.waitForTimeout(250);
const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
await browser.close();

// supersample 2x -> 1x for crisp text
const png = await sharp(buf)
  .resize(W, H, { fit: 'fill', kernel: 'lanczos3' })
  .png({ compressionLevel: 9 })
  .toBuffer();

// The filename carries a hash of the pixels. Facebook, Telegram and the rest
// cache share images by URL and never re-download one whose URL is unchanged —
// so a new render has to arrive at a new URL or the old card stays forever.
const hash = createHash('md5').update(png).digest('hex').slice(0, 8);
const name = `og-cover-${hash}.png`;

for (const f of readdirSync(resolve(root, 'public'))) {
  if (/^og-cover-[0-9a-f]{8}\.png$/.test(f) && f !== name) {
    rmSync(resolve(root, 'public', f));
    console.log('removed stale', f);
  }
}

writeFileSync(resolve(root, 'public', name), png);
writeFileSync(
  resolve(root, 'src/data/og-image.json'),
  JSON.stringify({ src: `/${name}` }, null, 2) + '\n'
);
console.log('wrote public/' + name);
