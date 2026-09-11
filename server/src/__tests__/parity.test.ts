/**
 * parity.test.ts — CONTRATO CONGELADO da Fase 2.6.3 (escrito ANTES da implementação).
 *
 * Reconciliação decidida no grill-me (docs/decisions/2026-09-10_fase-2.6.x-abertas.md):
 *   D-2.6-B   → coleta 0,3 s/un (6 ticks; ~3,33 un/s)
 *   D-2.6-C   → física inercial no servidor (velocidade/heading no snapshot)
 *   D-2.6.3-A → DROPOFF_RANGE = 10 m nos dois lados
 *   D-2.6.3-B → clamp do mundo = ±88 m
 *
 * ESTE ARQUIVO NÃO DEVE SER ALTERADO APÓS A IMPLEMENTAÇÃO.
 * Se o comportamento mudar de propósito, crie um novo teste de fase.
 *
 * Roda com: node --loader ts-node/esm src/__tests__/parity.test.ts
 */
import assert from 'node:assert/strict';
import {
  Simulation,
  TICK_RATE,
  UNIT_STATS,
  type SimEntity,
} from '../simulation.js';
import { clampToWorld } from '../grid.js';
import {
  DROPOFF_RANGE,
  GATHER_INTERVAL_TICKS,
  GATHER_YIELD,
  WORKER_CARRY_CAPACITY,
} from '../worker.js';
import { PROTOCOL_VERSION, type Snapshot } from '@project-exodus/shared/protocol';
import type { UnitType } from '@project-exodus/shared/units';

let n: number = 0;
function check(name: string, fn: () => void): void {
  fn();
  n += 1;
  console.log(`  ok ${n} - ${name}`);
}

/** Acesso a campos novos do contrato sem furar o tipo (o teste roda antes deles existirem). */
function field(entity: SimEntity, key: string): number {
  const v = (entity as unknown as Record<string, number>)[key];
  assert.equal(typeof v, 'number', `campo '${key}' ausente na entidade`);
  return v as number;
}

console.log('[Test:Parity2.6.3] contrato de reconciliação (coleta, física, limites)');

function scenario(): Simulation {
  const sim = new Simulation(263);
  Simulation.createDefaultScenario(sim, 'p1');
  return sim;
}

// ---------------------------------------------------------------- coleta

check('D-2.6-B: intervalo de coleta = 6 ticks e taxa ≈ 3,33 un/s', () => {
  assert.equal(GATHER_INTERVAL_TICKS, 6, 'intervalo deve ser 6 ticks (0,3 s a 20 Hz)');
  const rate: number = GATHER_YIELD / (GATHER_INTERVAL_TICKS / TICK_RATE);
  assert.ok(Math.abs(rate - 10 / 3) < 0.01, `taxa=${rate.toFixed(3)} un/s`);
});

check('D-2.6-B: 10 de carga em exatamente 60 ticks de GATHER', () => {
  const sim: Simulation = new Simulation(263);
  sim.spawnBuilding('p1', 'cc', 'COMMAND_CENTER', 0, -2);
  sim.spawnUnit('p1', 'w', 'SCAVENGER_WORKER', 28, 42); // ao lado de node_suc_2 (30,45)
  sim.issueCommand({ kind: 'GATHER', cmdId: 'g', playerId: 'p1', tick: 0, entityIds: ['w'], nodeId: 'node_suc_2' });
  const w: SimEntity = sim.getEntity('w') as SimEntity;
  let gatherTicks: number = 0;
  for (let i: number = 0; i < 120; i++) {
    const inGather: boolean = w.state === 'GATHER';
    sim.step();
    if (inGather) gatherTicks += 1;
    if (w.carryAmount >= WORKER_CARRY_CAPACITY) break;
  }
  assert.equal(w.carryAmount, WORKER_CARRY_CAPACITY);
  assert.equal(gatherTicks, 60, `ticks de coleta=${gatherTicks} (esperado 60)`);
});

check('D-2.6.3-A: DROPOFF_RANGE = 10 e a entrega dispara a ≤ 10,5 m do CC', () => {
  assert.equal(DROPOFF_RANGE, 10, 'dropoff unificado em 10 m');
  const sim: Simulation = scenario();
  const cc: SimEntity = sim.getEntity('bld_cc_1') as SimEntity;
  sim.issueCommand({ kind: 'GATHER', cmdId: 'g', playerId: 'p1', tick: 0, entityIds: ['u_w1'], nodeId: 'node_suc_1' });
  const w: SimEntity = sim.getEntity('u_w1') as SimEntity;
  let delivered: boolean = false;
  let prevState: string = w.state;
  for (let i: number = 0; i < 1500; i++) {
    sim.step();
    if (prevState === 'GOTO_CC' && w.state === 'DELIVER') {
      const d: number = Math.hypot(w.x - cc.x, w.z - cc.z);
      assert.ok(d <= DROPOFF_RANGE + 0.5, `entregou a ${d.toFixed(2)} m (limite ${DROPOFF_RANGE})`);
      delivered = true;
      break;
    }
    prevState = w.state;
  }
  assert.ok(delivered, 'ciclo completou uma entrega');
});

// ---------------------------------------------------------------- física

check('D-2.6-C: stats de física por tipo no shared (aceleração e giro)', () => {
  const accel = (u: UnitType): number =>
    (UNIT_STATS[u] as unknown as Record<string, number>)['acceleration'] as number;
  const rot = (u: UnitType): number =>
    (UNIT_STATS[u] as unknown as Record<string, number>)['rotationSpeed'] as number;
  assert.equal(accel('SCRAP_BUGGY'), 5, 'aceleração do blindado');
  assert.equal(rot('SCRAP_BUGGY'), 2.2, 'giro do blindado');
  assert.equal(accel('SCAVENGER_WORKER'), 20, 'aceleração do catador');
  assert.equal(rot('SCAVENGER_WORKER'), 10, 'giro do catador');
  assert.equal(accel('BIPED_MECH'), 8, 'aceleração do mech');
  assert.equal(rot('BIPED_MECH'), 3.5, 'giro do mech');
  assert.equal(accel('MAINTENANCE_DRONE'), 16, 'aceleração do droide');
  assert.equal(rot('MAINTENANCE_DRONE'), 8, 'giro do droide');
  assert.equal(accel('RUST_RAIDER'), 20, 'aceleração do raider');
  assert.equal(rot('RUST_RAIDER'), 10, 'giro do raider');
});

check('D-2.6-C: inércia — blindado parte devagar (1 tick ≈ 0,25 m/s)', () => {
  const sim: Simulation = new Simulation(263);
  sim.spawnUnit('p1', 'buggy', 'SCRAP_BUGGY', 0, 0);
  sim.issueCommand({ kind: 'MOVE', cmdId: 'm', playerId: 'p1', tick: 0, entityIds: ['buggy'], x: 0, z: 40 });
  const b: SimEntity = sim.getEntity('buggy') as SimEntity;
  sim.step();
  const v1: number = field(b, 'velocity');
  assert.ok(v1 > 0 && v1 <= 0.3, `velocity no 1º tick=${v1.toFixed(3)} (esperado ≤ 0,3)`);
  for (let i: number = 0; i < 39; i++) sim.step();
  const v40: number = field(b, 'velocity');
  assert.ok(v40 >= 6, `velocity após 2 s=${v40.toFixed(2)} (esperado ≥ 6, com máx 8)`);
});

check('D-2.6-C: tração — blindado quase não anda "de ré" (gira antes)', () => {
  const sim: Simulation = new Simulation(263);
  sim.spawnUnit('p1', 'buggy', 'SCRAP_BUGGY', 0, 0);
  sim.issueCommand({ kind: 'MOVE', cmdId: 'm', playerId: 'p1', tick: 0, entityIds: ['buggy'], x: 0, z: -40 });
  const b: SimEntity = sim.getEntity('buggy') as SimEntity;
  for (let i: number = 0; i < 20; i++) sim.step();
  const advanced: number = Math.hypot(b.x - 0, b.z - 0);
  assert.ok(advanced < 0.7, `avançou ${advanced.toFixed(2)} m em 1 s de ré (esperado < 0,7 — gira antes)`);
});

check('D-2.6-C: snapshot inclui velocidade e heading (protocolo v3)', () => {
  assert.equal(PROTOCOL_VERSION, 3, 'protocolo v3 com velocidade/heading no snapshot');
  const sim: Simulation = new Simulation(263);
  sim.spawnUnit('p1', 'buggy', 'SCRAP_BUGGY', 0, 0);
  sim.issueCommand({ kind: 'MOVE', cmdId: 'm', playerId: 'p1', tick: 0, entityIds: ['buggy'], x: 0, z: 40 });
  for (let i: number = 0; i < 10; i++) sim.step();
  const snap: Snapshot = sim.takeSnapshot();
  const e = snap.entities[0] as unknown as Record<string, unknown>;
  assert.equal(typeof e['velocity'], 'number', 'snapshot.velocity presente');
  assert.equal(typeof e['heading'], 'number', 'snapshot.heading presente');
});

// ---------------------------------------------------------------- limites

check('D-2.6.3-B: clamp do mundo = ±88 m', () => {
  assert.equal(clampToWorld(89), 88, 'acima do limite satura em 88');
  assert.equal(clampToWorld(-89), -88, 'abaixo do limite satura em -88');
  assert.equal(clampToWorld(88), 88, 'no limite permanece');
  assert.equal(clampToWorld(0), 0, 'centro intacto');
});

check('D-2.6.3-B: MOVE para fora do mapa termina em ≤ 88 m', () => {
  const sim: Simulation = new Simulation(263);
  sim.spawnUnit('p1', 'w', 'SCAVENGER_WORKER', 0, 0);
  sim.issueCommand({ kind: 'MOVE', cmdId: 'm', playerId: 'p1', tick: 0, entityIds: ['w'], x: 200, z: 0 });
  for (let i: number = 0; i < 900; i++) sim.step();
  const w: SimEntity = sim.getEntity('w') as SimEntity;
  assert.ok(Math.abs(w.x) <= 88.05, `x final=${w.x.toFixed(2)} (esperado ≤ 88,05)`);
  assert.ok(w.x >= 80, `x final=${w.x.toFixed(2)} (esperado próximo da borda)`);
});

console.log(`[Test:Parity2.6.3] ${n} asserts OK`);
process.exit(0);
