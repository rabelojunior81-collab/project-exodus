/**
 * test-buttons.mjs — Teste funcional dos botões de comando.
 * Clica de verdade (mouse) e verifica efeitos no estado do jogo.
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
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

async function started() {
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => !!document.getElementById('btn-start-game'), { timeout: 120000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.getElementById('btn-start-game').click());
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(5000);
    const h = await page.evaluate(() => document.getElementById('loading-overlay')?.classList.contains('hidden'));
    if (h) break;
  }
  await page.waitForTimeout(3000);
}

// screen px de uma entidade (projeção real)
async function screenOf(id) {
  return page.evaluate((eid) => {
    const rts = window.__rts;
    const e = rts.getEntities().find((x) => x.id === eid);
    const v = e.position.clone();
    v.y += 1;
    v.project(rts.cameraController.camera);
    return {
      x: Math.round(((v.x + 1) * window.innerWidth) / 2),
      y: Math.round(((-v.y + 1) * window.innerHeight) / 2),
    };
  }, id);
}

const R = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    R.push(`PASS ${name} ${detail ?? ''}`);
  } catch (e) {
    R.push(`FAIL ${name} :: ${String(e).slice(0, 160)}`);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

await started();

// 1. Selecionar worker com clique real
const wpos = await screenOf('u_w1');
await page.mouse.click(wpos.x, wpos.y);
await page.waitForTimeout(800);
await check('click-seleciona-worker', async () => {
  const n = await page.evaluate(() => window.__rts.selectionManager.selectedEntities.length);
  assert(n === 1, `selecionados=${n}`);
  return `px=(${wpos.x},${wpos.y})`;
});

// 2. Botões de ordem existem?
await check('botoes-ordem-renderizam', async () => {
  const btns = await page.evaluate(() => [...document.querySelectorAll('#hud-commands-panel [data-order]')].map((b) => b.getAttribute('data-order')));
  assert(btns.length > 0, 'nenhum botão data-order');
  return btns.join(',');
});
await page.screenshot({ timeout: 120000, path: join(__dirname, 'shots/09-selected-worker.png') });

// 3. Clicar MOVER arma pending
await check('botao-mover-arma-pending', async () => {
  await page.click('#hud-commands-panel [data-order="move"]');
  await page.waitForTimeout(400);
  const p = await page.evaluate(() => window.__rts.selectionManager.getPendingOrder());
  assert(p === 'move', `pending=${p}`);
  return '';
});

// 4. Clicar no solo emite a ordem (unidade anda)
const gpos = await page.evaluate(() => {
  const rts = window.__rts;
  const u = rts.getEntities().find((x) => x.id === 'u_w1');
  // Ponto livre e longe de outras entidades: (-16, 14)
  const v = u.position.clone().set(-16, 1, 14);
  v.project(rts.cameraController.camera);
  return { x: Math.round(((v.x + 1) * window.innerWidth) / 2), y: Math.round(((-v.y + 1) * window.innerHeight) / 2) };
});
await page.mouse.click(gpos.x, gpos.y);
await page.waitForTimeout(2500);
await check('ordem-mover-executa', async () => {
  const s = await page.evaluate(() => {
    const u = window.__rts.getEntities().find((x) => x.id === 'u_w1');
    return { x: +u.position.x.toFixed(1), pending: window.__rts.selectionManager.getPendingOrder() };
  });
  assert(s.x < -6.5, `worker parado em x=${s.x}`);
  assert(s.pending === null, `pending não limpou: ${s.pending}`);
  return `x=${s.x} pending=${s.pending}`;
});

// 5. Botão PARAR
await check('botao-parar', async () => {
  await page.click('#hud-commands-panel [data-order="stop"]');
  await page.waitForTimeout(600);
  const x0 = await page.evaluate(() => window.__rts.getEntities().find((x) => x.id === 'u_w1').position.x);
  await page.waitForTimeout(2000);
  const x1 = await page.evaluate(() => window.__rts.getEntities().find((x) => x.id === 'u_w1').position.x);
  assert(Math.abs(x1 - x0) < 0.3, `andou ${x0}→${x1}`);
  return '';
});

// 6. Selecionar CC com clique + RECRUTAR
const cpos = await screenOf('bld_cc_1');
await page.mouse.click(cpos.x, cpos.y);
await page.waitForTimeout(800);
await page.screenshot({ timeout: 120000, path: join(__dirname, 'shots/10-selected-cc.png') });
await check('menu-recrutar-5-botoes', async () => {
  const orders = await page.evaluate(() =>
    [...document.querySelectorAll('#hud-commands-panel [data-order]')].map((b) => b.getAttribute('data-order')));
  for (const o of ['recruit_worker', 'recruit_guard', 'recruit_buggy', 'recruit_mech', 'recruit_drone']) {
    assert(orders.includes(o), `botão ${o} ausente`);
  }
  // Mech custa 200 sucata e o estoque inicial é 180 → deve vir desabilitado
  const mechDisabled = await page.evaluate(() =>
    document.querySelector('#hud-commands-panel [data-order="recruit_mech"]')?.classList.contains('order-disabled'));
  assert(mechDisabled === true, 'botão do mech deveria estar desabilitado');
  return orders.filter((o) => o.startsWith('recruit')).join(',');
});
await check('botao-recrutar-treina', async () => {
  const before = await page.evaluate(() => window.__rts.getEntities().length);
  await page.click('#hud-commands-panel [data-order="recruit_worker"]');
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => ({
    n: window.__rts.getEntities().length,
    q: document.getElementById('production-queue-list')?.children.length ?? -1,
  }));
  assert(after.q >= 1, `fila=${after.q}`);
  return `fila=${after.q} entidades=${before}→${after.n}`;
});

// 6c. Treinar DROIDE via atalho de teclado T (CC selecionado)
await check('treinar-drone-via-tecla-T', async () => {
  const before = await page.evaluate(() => window.__rts.getResources());
  const q0 = await page.evaluate(() => document.getElementById('production-queue-list')?.children.length ?? 0);
  await page.keyboard.press('t');
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => window.__rts.getResources());
  const q1 = await page.evaluate(() => document.getElementById('production-queue-list')?.children.length ?? 0);
  assert(q1 === q0 + 1, `fila ${q0}→${q1}`);
  assert(Math.floor(before.rations) - Math.floor(after.rations) === 60, `rações não debitadas: ${before.rations}→${after.rations}`);
  assert(Math.floor(before.scrap) - Math.floor(after.scrap) === 40, `sucata não debitada: ${before.scrap}→${after.scrap}`);
  return `fila=${q0}→${q1} rations=${Math.floor(after.rations)} scrap=${Math.floor(after.scrap)}`;
});

// 6d. Treinar MECH via tecla R após injeção de debug; spawn no rally ao fim
await check('treinar-mech-via-tecla-R-e-spawn', async () => {
  await page.evaluate(() => window.__rts.debugAddResources({ scrap: 600, chips: 200 }));
  const n0 = await page.evaluate(() => window.__rts.getEntities().filter((e) => e.category === 'UNIT').length);
  await page.keyboard.press('r');
  await page.waitForTimeout(800);
  const qm = await page.evaluate(() => [...document.querySelectorAll('.production-item-name')].map((el) => el.textContent));
  assert(qm.some((t) => /Mech/.test(t)), `mech não entrou na fila: ${qm.join('|')}`);
  // aguarda a fila drenar até o mech spawnar (worker 8s + drone 16s + mech 24s).
  // Janela generosa: sob swiftshader o rAF roda a ~3-4 FPS e o delta do loop é
  // capado em 0.1s, então o tempo de simulação anda ~0.3-0.4× o tempo real.
  let spawned = null;
  for (let i = 0; i < 80; i++) {
    await page.waitForTimeout(3000);
    const s = await page.evaluate((nBefore) => {
      const units = window.__rts.getEntities().filter((e) => e.category === 'UNIT');
      const mech = units.find((e) => e.unitType === 'BIPED_MECH' && e.id.startsWith('u_t'));
      return { n: units.length, mech: mech ? { x: +mech.position.x.toFixed(1), z: +mech.position.z.toFixed(1) } : null, nBefore };
    }, n0);
    if (s.mech) { spawned = s; break; }
  }
  assert(spawned, 'mech não spawnou em 240s');
  // Rally padrão = (8, 14) ± jitter de spawn
  assert(Math.hypot(spawned.mech.x - 8, spawned.mech.z - 14) < 5, `spawn fora do rally: ${spawned.mech.x},${spawned.mech.z}`);
  return `unidades=${n0}→${spawned.n} spawn=(${spawned.mech.x},${spawned.mech.z})`;
});

// 6e. Droide também coleta (FSM de gather compartilhada, ciclo 2× mais lento)
await check('drone-coleta-veio', async () => {
  await page.evaluate(() => {
    const d = window.__rts.getEntities().find((e) => e.id === 'u_d1');
    d.stop();
    d.position.set(28, 0, 40);
    d.mesh.position.copy(d.position);
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__rts.getEntities().find((e) => e.id === 'u_d1').setGather('node_suc_2'));
  let harvested = false;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(2500);
    const amt = await page.evaluate(() => window.__rts.getNodes().find((n) => n.id === 'node_suc_2').amount);
    if (amt < 1500) { harvested = true; break; }
  }
  assert(harvested, 'droide não colheu em 50s');
  return '';
});

console.log(R.join('\n'));
console.log('PAGEERRORS:', errors.length ? errors.join(' | ') : 'none');

// 7. E2E COLETA: teleporta p/ perto do veio, ordena COLETAR, verifica
// colheita (amount cai) e entrega (sucata sobe)
async function gatherE2E() {
  const pxOf = (wx, wz) => page.evaluate(([x, z]) => {
    const rts = window.__rts;
    const u = rts.getEntities().find((e) => e.id === 'u_w1');
    const v = u.position.clone().set(x, 1, z);
    v.project(rts.cameraController.camera);
    return { x: Math.round(((v.x + 1) * window.innerWidth) / 2), y: Math.round(((-v.y + 1) * window.innerHeight) / 2) };
  }, [wx, wz]);
  const teleport = (x, z) => page.evaluate(([tx, tz]) => {
    const u = window.__rts.getEntities().find((e) => e.id === 'u_w1');
    u.stop();
    u.position.set(tx, 0, tz);
    u.mesh.position.copy(u.position);
  }, [x, z]);

  // garante seleção do worker
  const wpos = await (async () => {
    const p = await page.evaluate(() => {
      const rts = window.__rts;
      const u = rts.getEntities().find((e) => e.id === 'u_w1');
      const v = u.position.clone(); v.y += 1;
      v.project(rts.cameraController.camera);
      return { x: Math.round(((v.x + 1) * window.innerWidth) / 2), y: Math.round(((-v.y + 1) * window.innerHeight) / 2) };
    });
    return p;
  })();
  await page.evaluate(() => {
    const rts = window.__rts;
    rts.cameraController.setTarget({ x: 30, z: 45 }, true);
  });
  await page.waitForTimeout(1500);
  await teleport(30, 38);
  await page.waitForTimeout(500);
  const s0 = await page.evaluate(() => ({
    nodeAmt: window.__rts.getNodes().find((n) => n.id === 'node_suc_2').amount,
    scrap: window.__rts.getResources().scrap,
  }));
  // clica COLETAR
  await page.evaluate(() => {
    const rts = window.__rts;
    rts.selectionManager.clearSelection();
    rts.selectionManager.selectEntity(rts.getEntities().find((e) => e.id === 'u_w1'));
  });
  await page.waitForTimeout(500);
  const hasGather = await page.evaluate(() => !!document.querySelector('#hud-commands-panel [data-order="gather"]'));
  if (!hasGather) return 'FAIL coleta-sem-botao-gather';
  await page.click('#hud-commands-panel [data-order="gather"]');
  await page.waitForTimeout(400);
  const nodePx = await pxOf(30, 45);
  await page.mouse.click(nodePx.x, nodePx.y);
  // durante a colheita, o clipe 'harvest' (CharacterArmature|Interact) deve tocar
  let sawHarvestAnim = false;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(400);
    const act = await page.evaluate(() => {
      const u = window.__rts.getEntities().find((e) => e.id === 'u_w1');
      return u.modelInstance ? u.modelInstance.currentAction : null;
    });
    if (act === 'harvest') { sawHarvestAnim = true; break; }
  }
  if (!sawHarvestAnim) return 'FAIL clipe-harvest-nao-tocou';
  // aguarda colheita (amount cai)
  let harvested = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(5000);
    const amt = await page.evaluate(() => window.__rts.getNodes().find((n) => n.id === 'node_suc_2').amount);
    if (amt < s0.nodeAmt) { harvested = true; break; }
  }
  if (!harvested) return 'FAIL coleta-sem-colheita';
  // move BRUTO p/ perto do CC (sem stop(): preserva o estado gather)
  await page.evaluate(() => {
    const u = window.__rts.getEntities().find((e) => e.id === 'u_w1');
    u.position.set(6, 0, 4);
    u.mesh.position.copy(u.position);
  });
  let delivered = false;
  const scrap0 = Math.floor(s0.scrap);
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(5000);
    const r = await page.evaluate(() => window.__rts.getResources());
    if (r.scrap > scrap0) { delivered = true; break; }
  }
  if (!delivered) return 'FAIL coleta-sem-entrega';
  const shot = await page.evaluate(() => window.__rts.getResources());
  await page.screenshot({ timeout: 120000, path: join(__dirname, 'shots/11-gather-topbar.png') });
  return `PASS coleta-e2e colheu+entregou sucata=${shot.scrap}`;
}
console.log(await gatherE2E());
await browser.close();
