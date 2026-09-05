import { chromium } from 'playwright';

const OUT = '/tmp/claude-1000/-home-mafia/1c89036a-5377-49cb-8f0c-bdcb1b0bfb9d/scratchpad';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4399/', { waitUntil: 'networkidle' });

const footer = page.locator('footer');
await footer.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

const box = await footer.boundingBox();
console.log('FOOTER HEIGHT:', Math.round(box.height), 'px');

// Screenshot the footer + a bit above it
await page.screenshot({
  path: `${OUT}/footer-check.png`,
  clip: { x: 0, y: Math.max(0, box.y - 20), width: 1440, height: Math.min(box.height + 40, 900) },
});
console.log('saved footer-check.png');
await browser.close();
