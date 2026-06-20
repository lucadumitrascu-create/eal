/**
 * Regenerate high-res project preview screenshots.
 *   node scripts/screenshot-projects.mjs
 * Captures each project's above-the-fold hero at deviceScaleFactor 2 and writes
 * a crisp 2560x1440 (16:9) WebP into public/images/projects/, overwriting the
 * existing files so the project cards don't need rewiring.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'images', 'projects');

const projects = [
  // solbotpro redirects to /login, which IS the marketing landing hero — fine.
  { url: 'https://solbotpro.com', file: 'solbotpro.webp', settle: 3500 },
  { url: 'https://georgio-portofoglio.vercel.app', file: 'georgio-portfolio.webp', settle: 2500 },
  { url: 'https://transportservices.at/', file: 'transport-services.webp', settle: 2500 },
  { url: 'https://adricut.com', file: 'adricut.webp', settle: 2500 },
];

const browser = await chromium.launch({
  headless: true,
  // software WebGL — solbotpro uses three.js and otherwise throws a client-side
  // exception in headless without a GL context.
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

for (const { url, file, settle } of projects) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(settle); // fonts / animations / WebGL settle
    // Capture a 16:9 above-the-fold crop (1440x810 CSS px -> 2880x1620 at DSF 2).
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 810 }, animations: 'disabled', caret: 'hide', timeout: 60000 });
    await sharp(png).resize(2560, 1440, { fit: 'cover', position: 'top' }).webp({ quality: 90 }).toFile(join(OUT, file));
    const m = await sharp(join(OUT, file)).metadata();
    console.log(`✓ ${file}  ${m.width}x${m.height}  ${(await sharp(join(OUT, file)).toBuffer()).length / 1024 | 0}KB  <- ${page.url()}`);
  } catch (e) {
    console.log(`✗ ${file}  ${url}  ${e.message}`);
  }
}

await browser.close();
console.log('done');
