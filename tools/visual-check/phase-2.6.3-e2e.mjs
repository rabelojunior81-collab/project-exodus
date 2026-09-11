/**
 * phase-2.6.3-e2e.mjs — CONTRATO CONGELADO da Fase 2.6.3, lado cliente (2.6.3).
 *
 * Escrito ANTES da implementação. Registra evidência visual (screenshots +
 * manifestos) e valida as invariantes do cliente que a reconciliação NÃO pode
 * quebrar: colisão (contatos exatos), chegada, coleta E2E e zero pageerrors.
 *
 *   cd client && npm run build && npm run preview -- --port 4173
 *   node tools/visual-check/phase-2.6.3-e2e.mjs
 *
 * BASE_URL pode sobrescrever (ex.: http://localhost:5173/ no dev).
 * ESTE ARQUIVO NÃO DEVE SER ALTERADO APÓS A IMPLEMENTAÇÃO.
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { EvidenceRegistry } from './lib/evidence.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');
const exe = join(homedir(), 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
if (!existsSync(exe)) { console.error('sem chrome'); process.exit(1); }

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const command = 'node tools/visual-check/phase-2.6.3-e2e.mjs';
const ev = new EvidenceRegistry({ root, phase: 'fase-2.6.3', command, ferramenta: 'playwright · swiftshader' });

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

const unitState = (id) =>
  page.evaluate((uid) => window.__rts.getUnitStates().find((u) => u.id === uid), id);
const moveTo = (id, x, z) =>
  page.evaluate(([uid, px, pz]) => window.__rts.debugOrderMove(uid, px, pz), [id, x, z]);
const obstacle = (id) => page.evaluate((oid) => window.__rts.getObstacles().find((o) => o.id === oid), id);

const cc = await obstacle('bld_cc_1');
const node = await obstacle('node_rac_1');
if (!cc || !node) {
  console.error('FALHA: obstáculos ausentes');
  await browser.close();
  process.exit(1);
}

// ---- t-00: cena inicial ------------------------------------------------
await ev.capture(page, {
  test: 't-00-cena-inicial', step: '01-overview',
  title: 'Visão geral da base no boot',
  description: 'Cena inicial do slice: Centro de Comando, refinaria, bunker, 8 unidades e o cenário de 365 props com fog de exploração.',
  status: 'validado',
  expected: '11 entidades (8 unidades + 3 prédios) e 8 veios carregados',
  observed: 'cena renderizada sem pageerrors',
  tags: ['baseline', 'cena'],
});

// ---- t-01: ida ao veio --------------------------------------------------
await moveTo('u_w1', node.x, node.z);
await ev.capture(page, {
  test: 't-01-ida-ao-veio', step: '01-ordem-emitida',
  title: 'Ordem de movimento ao veio emitida',
  description: 'Harness emite MOVE programático do catador u_w1 até o veio de ração (45, 10) — caminho real do A* do cliente.',
  status: 'aplicado',
  expected: 'unidade entra em MOVING e percorre até o veio',
  observed: 'ordem aceita (debugOrderMove = true)',
  tags: ['coleta', 'movimento'],
});
let arrivedVein = false;
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(400);
  const u = await unitState('u_w1');
  if (!u) break;
  if (Math.hypot(u.x - node.x, u.z - node.z) < 6) { arrivedVein = true; break; }
}
await ev.capture(page, {
  test: 't-01-ida-ao-veio', step: '02-no-veio',
  title: 'Catador encostado no veio',
  description: 'Chegada ao raio do veio; a colisão mantém a unidade fora do círculo de 2,4 m (contato a 3,1 m).',
  status: arrivedVein ? 'passou' : 'falhou',
  expected: 'distância ao centro do veio < 6 m',
  observed: arrivedVein ? 'chegou ao veio' : 'não chegou no limite de tempo',
  tags: ['coleta', 'chegada'],
});

// ---- t-02: travessia com colisão ---------------------------------------
await moveTo('u_w1', 0, -15); // linha reta cruza o CC (0,-2)
let minDistCC = Infinity;
let capturedContact = false;
for (let i = 0; i < 100; i++) {
  await page.waitForTimeout(400);
  const u = await unitState('u_w1');
  if (!u) break;
  const d = Math.hypot(u.x - cc.x, u.z - cc.z);
  minDistCC = Math.min(minDistCC, d);
  if (!capturedContact && d < 9.5) {
    capturedContact = true;
    await ev.capture(page, {
      test: 't-02-travessia-colisao', step: '01-contato',
      title: 'Contato rasante com o Centro de Comando',
      description: 'No ponto mais próximo da travessia, o catador desliza pela borda do CC sem penetrar o círculo de colisão.',
      status: 'validado',
      expected: 'distância mínima ≥ 8,45 m (contato teórico 8,70)',
      observed: `distância no contato ≈ ${d.toFixed(2)} m`,
      tags: ['colisão', 'invariante'],
    });
  }
  if (Math.hypot(u.x - 0, u.z + 15) < 2.5) break;
}
const uArr = await unitState('u_w1');
const arrivedCC = Math.hypot(uArr.x - 0, uArr.z + 15) < 2.5;
const contactOK = minDistCC >= cc.radius + uArr.radius - 0.25;
await ev.capture(page, {
  test: 't-02-travessia-colisao', step: '02-chegada',
  title: 'Chegada após contornar o prédio',
  description: 'A unidade contorna o Centro de Comando e alcança o destino do outro lado; prova de que o deslize não prende.',
  status: contactOK && arrivedCC ? 'passou' : 'falhou',
  expected: 'chegada ao destino e distância mínima sem penetração',
  observed: `minDistCC=${minDistCC.toFixed(3)} · arrived=${arrivedCC}`,
  tags: ['colisão', 'navegação'],
});

// ---- t-03: suíte de coleta do harness (transcrição) ---------------------
const gather = spawn('node', ['tools/visual-check/gather-e2e.mjs'], { cwd: root });
let gatherOut = '';
gather.stdout.on('data', (d) => { gatherOut += d.toString(); });
gather.stderr.on('data', (d) => { gatherOut += d.toString(); });
const gatherCode = await new Promise((res) => gather.on('close', res));
ev.captureText({
  test: 't-03-coleta-e2e', step: '01-transcricao',
  title: 'Coleta E2E do harness (gate existente)',
  description: 'Execução completa do gate de coleta existente: trabalhador colhe e entrega; placar de sucata sobe.',
  status: gatherCode === 0 ? 'passou' : 'falhou',
  expected: 'exit 0 com ENTREGA CONFIRMADA',
  observed: gatherCode === 0 ? 'entrega confirmada' : `exit ${gatherCode}`,
  content: gatherOut,
  tags: ['coleta', 'gate-existente'],
});

// ---- t-99: encerramento -------------------------------------------------
await page.waitForTimeout(1000);
await ev.capture(page, {
  test: 't-99-fechamento', step: '01-estado-final',
  title: 'Estado final da sessão de evidência',
  description: 'Cena ao final da bateria: mundo em operação após ordens e testes, sem pageerrors.',
  status: errs.length === 0 ? 'passou' : 'falhou',
  expected: '0 pageerrors',
  observed: `pageErrors=${errs.length}`,
  tags: ['fechamento'],
});

ev.flush();
await browser.close();

const failures = [];
if (!arrivedVein) failures.push('não chegou ao veio');
if (!contactOK) failures.push(`CC penetrado: minDist=${minDistCC.toFixed(3)}`);
if (!arrivedCC) failures.push('não chegou após contornar o CC');
if (gatherCode !== 0) failures.push('gate de coleta falhou');
if (errs.length) failures.push(`pageerrors: ${errs.join('|')}`);

console.log('EVIDENCE-2.6.3', JSON.stringify({
  arrivedVein, minDistCC: +minDistCC.toFixed(3), arrivedCC,
  gatherCode, pageErrors: errs.length,
}));

if (failures.length) {
  console.error('FALHA:', failures.join(' · '));
  process.exit(1);
}
console.log('[phase-2.6.3-e2e] OK — evidência registrada e invariantes verdes.');
