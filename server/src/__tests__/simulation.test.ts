/**
 * simulation.test.ts — Testes do loop autoritativo + registro (Fase 2.2).
 * Roda com: node --loader ts-node/esm src/__tests__/simulation.test.ts
 */
import assert from 'node:assert/strict';
import {
  Simulation,
  TICK_DT,
  TICK_RATE,
  TRAIN_TICKS,
  type SimEntity,
} from '../simulation.js';
import { PROTOCOL_VERSION, serializeSnapshot, type Snapshot } from '@project-exodus/shared/protocol';

let n: number = 0;
function check(name: string, fn: () => void): void {
  fn();
  n += 1;
  console.log(`  ok ${n} - ${name}`);
}

console.log('[Test:Simulation] loop 20Hz + entidades');

check('20Hz / dt fixo 50ms', () => {
  assert.equal(TICK_RATE, 20);
  assert.equal(TICK_DT, 0.05);
});

check('tick inteiro, +1 por step, sem Date.now na lógica', () => {
  const sim = new Simulation(7);
  assert.equal(sim.getTick(), 0);
  sim.step();
  sim.step();
  sim.step();
  assert.equal(sim.getTick(), 3);
  assert.ok(Number.isInteger(sim.getTick()));
});

check('spawn/remove/update + cenário padrão', () => {
  const sim = new Simulation(7);
  Simulation.createDefaultScenario(sim, 'p1');
  assert.equal(sim.entityCount(), 8); // 3 buildings + 5 unidades
  const cc: SimEntity | undefined = sim.getEntity('bld_cc_1');
  assert.ok(cc !== undefined && cc.type === 'COMMAND_CENTER' && cc.hp === 2200);
  assert.equal(sim.removeEntity('u_s2'), true);
  assert.equal(sim.removeEntity('u_s2'), false);
  assert.equal(sim.entityCount(), 7);
});

check('MOVE desloca em dt fixo (0,3m/tick a 6m/s)', () => {
  const sim = new Simulation(7);
  sim.spawnUnit('p1', 'w', 'SCAVENGER_WORKER', 0, 20);
  assert.equal(sim.issueCommand({ kind: 'MOVE', cmdId: 'm1', playerId: 'p1', tick: 0, entityIds: ['w'], x: 0, z: 40 }), true);
  const before: number = (sim.getEntity('w') as SimEntity).z;
  sim.step();
  const after: number = (sim.getEntity('w') as SimEntity).z;
  assert.ok(Math.abs((after - before) - 6 * TICK_DT) < 1e-9, `dz=${after - before}`);
  assert.equal((sim.getEntity('w') as SimEntity).state, 'MOVING');
});

check('comando rejeita alvo inexistente / dono errado', () => {
  const sim = new Simulation(7);
  sim.spawnUnit('p1', 'w', 'SCAVENGER_WORKER', 0, 20);
  assert.equal(
    sim.issueCommand({ kind: 'MOVE', cmdId: 'm2', playerId: 'p2', tick: 0, entityIds: ['w'], x: 0, z: 0 }),
    false,
  );
  assert.equal(
    sim.issueCommand({ kind: 'MOVE', cmdId: 'm3', playerId: 'p1', tick: 0, entityIds: ['fantasma'], x: 0, z: 0 }),
    false,
  );
});

check('TRAIN produz unidade + evento UNIT_READY', () => {
  const sim = new Simulation(7);
  Simulation.createDefaultScenario(sim, 'p1'); // tesouro inicial cobre o custo (2.6.2)
  assert.equal(
    sim.issueCommand({ kind: 'TRAIN', cmdId: 't1', playerId: 'p1', tick: 0, buildingId: 'bld_cc_1', unit: 'SCAVENGER_WORKER' }),
    true,
  );
  // Tempo derivado do shared (D-2.6-A): 8 s × 20 Hz = 160 ticks.
  for (let i: number = 0; i < TRAIN_TICKS.SCAVENGER_WORKER; i++) sim.step();
  const snap: Snapshot = sim.takeSnapshot();
  const ready = snap.events.filter((e) => e.kind === 'UNIT_READY');
  assert.equal(ready.length, 1);
  if (ready[0].kind === 'UNIT_READY') {
    assert.ok(sim.hasEntity(ready[0].unitId), 'unidade existe no registro');
  }
});

check('snapshot ordenado, versionado e serializável', () => {
  const sim = new Simulation(7);
  sim.spawnUnit('p1', 'b_unit', 'RUST_RAIDER', 0, 0);
  sim.spawnUnit('p1', 'a_unit', 'RUST_RAIDER', 1, 1);
  const snap: Snapshot = sim.takeSnapshot();
  assert.deepEqual(snap.entities.map((e) => e.id), ['a_unit', 'b_unit']);
  assert.equal(snap.version, PROTOCOL_VERSION);
  assert.equal(typeof serializeSnapshot(snap), 'string');
  assert.equal(sim.takeSnapshot().events.length, 0, 'takeSnapshot drena eventos');
});

check('determinismo: mesma seed + comandos = snapshots iguais', () => {
  const run = (): string => {
    const sim = new Simulation(99);
    Simulation.createDefaultScenario(sim, 'p1');
    sim.issueCommand({ kind: 'GATHER', cmdId: 'g1', playerId: 'p1', tick: 0, entityIds: ['u_w1'], nodeId: 'node_suc_1' });
    sim.issueCommand({ kind: 'MOVE', cmdId: 'm1', playerId: 'p1', tick: 0, entityIds: ['u_s1'], x: 30, z: 30 });
    for (let i: number = 0; i < 250; i++) sim.step();
    return serializeSnapshot(sim.takeSnapshot());
  };
  assert.equal(run(), run());
});

console.log(`[Test:Simulation] ${n} asserts OK`);
process.exit(0);
