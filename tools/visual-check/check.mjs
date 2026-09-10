/**
 * check.mjs — Harness de validação visual do Project Exodus.
 *
 * Sobe Chromium headless contra o Vite dev (http://localhost:5173),
 * inicia o jogo, mede bounding boxes reais das entidades em cena e
 * gera screenshots para inspeção visual pelo agente.
 *
 * Uso: node check.mjs [--shot-only]
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(__dirname, 'shots');

const CANDIDATES = [
  join(homedir(), 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error('Nenhum Chromium/Chrome encontrado.');
  process.exit(1);
}

const URL = 'http://localhost:5173/';

const browser = await chromium.launch({
  executablePath,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('console', (m) => {
  const t = m.text();
  if (/error|ModelManager|Project Exodus/i.test(t)) console.log('[page]', t.slice(0, 160));
});
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!document.getElementById('btn-start-game'), { timeout: 15000 });
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('btn-start-game').click());
// Aguarda fim do loading (overlay oculta = jogo iniciado), com polling de progresso
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(5000);
  const s = await page.evaluate(() => ({
    pct: document.getElementById('loading-percent')?.textContent,
    status: document.getElementById('loading-status-text')?.textContent?.slice(0, 80),
    hidden: document.getElementById('loading-overlay')?.classList.contains('hidden'),
  }));
  console.log('LOAD', JSON.stringify(s));
  if (s.hidden) break;
}
const stillLoading = await page.evaluate(
  () => !document.getElementById('loading-overlay')?.classList.contains('hidden')
);
if (stillLoading) throw new Error('Loading não concluiu em 5min');
await page.waitForTimeout(4000);

// --- Medições quantitativas em cena ---
const measurements = await page.evaluate(() => window.__rts.measure());
console.log(JSON.stringify(measurements, null, 1));

// --- Sweep de escala do blindado: mede altura real (eixo Y é confiável,
// o anel de seleção polui X/Z) e fixa o melhor fator para os screenshots ---
const sweep = await page.evaluate(() => {
  const rts = window.__rts;
  const buggy = rts.getEntities().find((e) => e.id === 'u_v1');
  const model = buggy.mesh.children.find((c) => c.isGroup);
  const basePos = model.position.clone();
  const results = [];
  for (const s of [0.2, 0.3, 0.4, 0.55, 0.75, 1.0]) {
    model.scale.setScalar(s);
    model.position.copy(basePos).multiplyScalar(s);
    const m = rts.measure().find((x) => x.id === 'u_v1');
    results.push({ scale: s, sizeY: m.size.y, minY: m.minY });
  }
  let best = results[0];
  for (const r of results) {
    if (Math.abs(r.sizeY - 2.0) < Math.abs(best.sizeY - 2.0)) best = r;
  }
  model.scale.setScalar(best.scale);
  model.position.copy(basePos).multiplyScalar(best.scale);
  return { results, best };
});
console.log('TANK_SWEEP', JSON.stringify(sweep));

// --- Teste funcional do minimapa: clique esquerdo move a câmera ---
const minimapTest = await page.evaluate(() => {
  const rts = window.__rts;
  const canvas = document.getElementById('minimap-canvas');
  const rect = canvas.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
});
await page.mouse.click(
  minimapTest.left + minimapTest.width * 0.8,
  minimapTest.top + minimapTest.height * 0.8
);
await page.waitForTimeout(1500);
const camAfter = await page.evaluate(() => ({
  x: +window.__rts.cameraController.target.x.toFixed(1),
  z: +window.__rts.cameraController.target.z.toFixed(1),
}));
console.log('MINIMAP_CLICK', JSON.stringify(camAfter), '(esperado ≈54,54)');

// --- Screenshots ---
await page.screenshot({ path: join(SHOTS, '01-overview.png') });

// Close-up no blindado
await page.evaluate(() => {
  const rts = window.__rts;
  const buggy = rts.getEntities().find((e) => e.id === 'u_v1');
  rts.cameraController.setTarget({ x: buggy.position.x, z: buggy.position.z }, true);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: join(SHOTS, '02-buggy-closeup.png') });

// Teste de locomoção: soldado na colina, Gama (worker) em campo aberto,
// blindado em deslocamento longo (testa giro lento + aceleração do tank)
await page.evaluate(() => {
  const rts = window.__rts;
  const byId = (id) => rts.getEntities().find((e) => e.id === id);
  byId('u_s1').moveTo(byId('u_s1').position.clone().set(55, 0, 55));
  byId('u_w3').moveTo(byId('u_w3').position.clone().set(30, 0, 30));
  byId('u_v1').moveTo(byId('u_v1').position.clone().set(-25, 0, 25));
  rts.cameraController.setTarget({ x: 55, z: 55 }, true);
});
await page.waitForTimeout(9000);
await page.screenshot({ path: join(SHOTS, '03-hill-climb.png') });

// Gama andando (verifica facing + sword removida)
await page.evaluate(() => {
  window.__rts.cameraController.setTarget({ x: 30, z: 30 }, true);
});
await page.waitForTimeout(1500);
await page.screenshot({ path: join(SHOTS, '04-gama-walk.png') });

// Blindado em movimento (verifica física de giro/aceleração + escala final)
await page.evaluate(() => {
  const rts = window.__rts;
  const buggy = rts.getEntities().find((e) => e.id === 'u_v1');
  rts.cameraController.setTarget({ x: buggy.position.x, z: buggy.position.z }, true);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: join(SHOTS, '05-buggy-moving.png') });

const hillCheck = await page.evaluate(() => {
  const rts = window.__rts;
  return rts.measure().filter((m) => ['u_s1', 'u_w3', 'u_v1'].includes(m.id));
});
console.log('MOVE_CHECK', JSON.stringify(hillCheck));

await browser.close();
console.log('OK shots em', SHOTS);
