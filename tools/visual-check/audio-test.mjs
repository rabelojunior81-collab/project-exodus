import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
const CANDIDATES = [
  join(homedir(), 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) { console.error('Chrome nao encontrado'); process.exit(1); }
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
page.on('console', m => console.log('CONSOLE', m.type(), m.text()));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.click('#btn-start-game');
for (let i=0;i<60;i++){
  await page.waitForTimeout(2000);
  const hidden = await page.evaluate(() => document.getElementById('loading-overlay')?.classList.contains('hidden'));
  if (hidden) break;
}
await page.waitForTimeout(1000);
// simulate first user gesture and trigger audio directly
await page.click('canvas', { position: { x: 800, y: 450 } });
await page.waitForTimeout(200);
const r1 = await page.evaluate(() => { window.__rts.audio.playSelect('SCAVENGER_WORKER'); return window.__rts.audio.debugState(); });
console.log('STATE after direct playSelect:', JSON.stringify(r1));
await page.waitForTimeout(1200);
const r2 = await page.evaluate(() => window.__rts.audio.debugState());
console.log('STATE after 1.2s:', JSON.stringify(r2));
await browser.close();
