/**
 * dist-proof.mjs — Prova do build de produção: sobe contra o preview (4173),
 * verifica entidades, nós, build stamp e gera screenshot. O preview deve
 * estar rodando a partir de client/ (`npx vite preview --port 4173`).
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const exe = join(homedir(), 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
if (!existsSync(exe)) { console.error('sem chrome'); process.exit(1); }

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => !!document.getElementById('btn-start-game'), { timeout: 120000 });
await page.waitForTimeout(1000);
await page.evaluate(() => document.getElementById('btn-start-game').click());
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(5000);
  if (await page.evaluate(() => document.getElementById('loading-overlay')?.classList.contains('hidden'))) break;
}
await page.waitForTimeout(4000);
const st = await page.evaluate(() => ({
  n: window.__rts.getEntities().length,
  nodes: window.__rts.getNodes().length,
  stamp: document.querySelector('.hud-tag')?.textContent,
}));
console.log('DIST', JSON.stringify(st));
await page.screenshot({ timeout: 120000, path: join(__dirname, 'shots/17-dist-reskin.png') });
console.log('PAGEERRORS:', errs.length ? errs.join('|') : 'none');
await browser.close();
