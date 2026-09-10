/**
 * collision-e2e.mjs — Gate da Fase 1.12 (spec 03).
 *
 * Prova, com o jogo rodando, que unidades NÃO atravessam construções nem
 * veios de recurso: mede a distância mínima ao Centro de Comando durante
 * uma travessia e a parada encostada no veio. Requer o preview em 4173:
 *
 *   cd client && npm run build && npm run preview -- --port 4173
 *   node tools/visual-check/collision-e2e.mjs
 *
 * BASE_URL pode sobrescrever o endereço (ex.: http://localhost:5173/ no dev).
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const exe = join(homedir(), 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
if (!existsSync(exe)) { console.error('sem chrome'); process.exit(1); }

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 120)));

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => !!document.getElementById('btn-start-game'), { timeout: 120000 });
await page.waitForTimeout(800);
await page.evaluate(() => document.getElementById('btn-start-game').click());
for (let i = 0; i < 90; i++) {
  await page.waitForTimeout(2000);
  if (await page.evaluate(() => document.getElementById('loading-overlay')?.classList.contains('hidden'))) break;
}
await page.waitForTimeout(1500);

const cc = await page.evaluate(() => window.__rts.getObstacles().find((o) => o.id === 'bld_cc_1'));
const node = await page.evaluate(() => window.__rts.getObstacles().find((o) => o.id === 'node_rac_1'));
if (!cc || !node) {
  console.error('FALHA: obstáculos bld_cc_1/node_rac_1 ausentes em __rts.getObstacles()');
  await browser.close();
  process.exit(1);
}

const unitState = (id) =>
  page.evaluate((uid) => window.__rts.getUnitStates().find((u) => u.id === uid), id);
const moveTo = (id, x, z) =>
  page.evaluate(([uid, px, pz]) => window.__rts.debugOrderMove(uid, px, pz), [id, x, z]);

// ---- Fase A: travessia pela linha do CC (0,-2), de (-6,8) a (0,-15) ----
await moveTo('u_w1', 0, -15);
let minDistCC = Infinity;
for (let i = 0; i < 100; i++) {
  await page.waitForTimeout(400);
  const u = await unitState('u_w1');
  if (!u) break;
  minDistCC = Math.min(minDistCC, Math.hypot(u.x - cc.x, u.z - cc.z));
  if (Math.hypot(u.x - 0, u.z + 15) < 2.5) break;
}
const uA = await unitState('u_w1');
const arrivedCC = Math.hypot(uA.x - 0, uA.z + 15) < 2.5;

// ---- Fase B: mirar o centro do veio — deve parar ENCOSTADO, sem entrar ----
await moveTo('u_w1', node.x, node.z);
let minDistNode = Infinity;
for (let i = 0; i < 160; i++) {
  await page.waitForTimeout(400);
  const u = await unitState('u_w1');
  if (!u) break;
  const d = Math.hypot(u.x - node.x, u.z - node.z);
  minDistNode = Math.min(minDistNode, d);
  if (d < node.radius + u.radius + 0.6) break;
}
await page.waitForTimeout(2500);
const uB = await unitState('u_w1');
const finalNodeDist = Math.hypot(uB.x - node.x, uB.z - node.z);

const contactCC = cc.radius + uA.radius;
const contactNode = node.radius + uB.radius;
const reports = {
  minDistCC: +minDistCC.toFixed(3),
  contactCC: +contactCC.toFixed(3),
  arrivedCC,
  minDistNode: +minDistNode.toFixed(3),
  finalNodeDist: +finalNodeDist.toFixed(3),
  contactNode: +contactNode.toFixed(3),
  pageErrors: errs.length,
};
console.log('COLLISION', JSON.stringify(reports));

await browser.close();

const failures = [];
if (!(minDistCC >= contactCC - 0.25)) failures.push(`CC atravessado: minDist=${minDistCC.toFixed(3)} < ${(contactCC - 0.25).toFixed(3)}`);
if (!arrivedCC) failures.push('unidade não chegou ao destino após contornar o CC');
if (!(minDistNode >= contactNode - 0.25)) failures.push(`veio atravessado: minDist=${minDistNode.toFixed(3)} < ${(contactNode - 0.25).toFixed(3)}`);
if (!(finalNodeDist <= contactNode + 3.0)) failures.push(`não parou encostado no veio: d=${finalNodeDist.toFixed(3)}`);
if (errs.length) failures.push(`pageerrors: ${errs.join('|')}`);

if (failures.length) {
  console.error('FALHA:', failures.join(' · '));
  process.exit(1);
}
console.log('[collision-e2e] OK — nenhuma travessia de CC/veio detectada.');
