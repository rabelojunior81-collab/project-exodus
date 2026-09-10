/**
 * gather-e2e.mjs — Reproduz o fluxo REAL do usuário (sem teleports):
 * seleciona Catador, COLETAR, clica no veio, acompanha ida→colheita→volta→entrega.
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
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => !!document.getElementById('btn-start-game'), { timeout: 120000 });
await page.waitForTimeout(1000);
await page.evaluate(() => document.getElementById('btn-start-game').click());
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(5000);
  if (await page.evaluate(() => document.getElementById('loading-overlay')?.classList.contains('hidden'))) break;
}
await page.waitForTimeout(3000);

const pxOf = (wx, wz) => page.evaluate(([x, z]) => {
  const rts = window.__rts;
  const u = rts.getEntities().find((e) => e.id === 'u_w1');
  const v = u.position.clone().set(x, 1, z);
  v.project(rts.cameraController.camera);
  return { x: Math.round(((v.x + 1) * window.innerWidth) / 2), y: Math.round(((-v.y + 1) * window.innerHeight) / 2) };
}, [wx, wz]);

// 1. Vai para perto do veio suc_2 (30,45) e seleciona o worker via clique real
await page.evaluate(() => window.__rts.cameraController.setTarget({ x: 24, z: 38 }, true));
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const rts = window.__rts;
  const u = rts.getEntities().find((e) => e.id === 'u_w1');
  u.moveTo(u.position.clone().set(20, 0, 34));
});
await page.waitForTimeout(20000);
const st0 = await page.evaluate(() => {
  const u = window.__rts.getEntities().find((e) => e.id === 'u_w1');
  return { x: +u.position.x.toFixed(1), z: +u.position.z.toFixed(1) };
});
console.log('worker após deslocamento:', JSON.stringify(st0));

// 2. Clica no worker (seleção real) e depois em COLETAR
const wpx = await pxOf(st0.x, st0.z);
await page.mouse.click(wpx.x, wpx.y);
await page.waitForTimeout(800);
const sel = await page.evaluate(() => window.__rts.selectionManager.selectedEntities.map((e) => e.id));
console.log('selecionados:', sel.join(','));
await page.screenshot({ timeout: 120000, path: join(__dirname, 'shots/13-gather-order.png') });
await page.click('#hud-commands-panel [data-order="gather"]');
await page.waitForTimeout(400);
console.log('pending:', await page.evaluate(() => window.__rts.selectionManager.getPendingOrder()));

// 3. Clica no veio (centro do node_suc_2)
const npx = await pxOf(30, 45);
console.log('clicando veio em px', JSON.stringify(npx));
await page.mouse.click(npx.x, npx.y);
await page.waitForTimeout(1000);
console.log('pending após clique:', await page.evaluate(() => window.__rts.selectionManager.getPendingOrder()));

// 4. Acompanha por até 5 min
const t0 = Date.now();
let last = '';
while (Date.now() - t0 < 300000) {
  await page.waitForTimeout(15000);
  const s = await page.evaluate(() => {
    const u = window.__rts.getEntities().find((e) => e.id === 'u_w1');
    const n = window.__rts.getNodes().find((x) => x.id === 'node_suc_2');
    const r = window.__rts.getResources();
    return { wx: +u.position.x.toFixed(1), wz: +u.position.z.toFixed(1), node: n.amount, scrap: Math.floor(r.scrap) };
  });
  last = `t+${Math.round((Date.now() - t0) / 1000)}s worker=(${s.wx},${s.wz}) veio=${s.node} sucata=${s.scrap}`;
  console.log(last);
  if (s.scrap > 180) { console.log('ENTREGA CONFIRMADA'); break; }
}
await page.screenshot({ timeout: 120000, path: join(__dirname, 'shots/14-gather-result.png') });
await browser.close();
