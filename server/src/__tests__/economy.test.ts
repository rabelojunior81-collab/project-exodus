/**
 * economy.test.ts — Paridade de modelo: custos, POP e treino (Fase 2.6.2).
 *
 * Gate da sub-fase (spec 02 §5): "custo debita, pop-cap rejeita,
 * drone/mech treinam". Roda com:
 *   node --loader ts-node/esm src/__tests__/economy.test.ts
 */
import assert from 'node:assert/strict';
import {
  POP_MAX,
  Simulation,
  TICK_RATE,
  TRAIN_TICKS,
  type SimEntity,
} from '../simulation.js';
import {
  TRAINING_SPECS,
  costToResources,
  type UnitType,
} from '@project-exodus/shared/units';
import { STARTING_RESOURCES } from '@project-exodus/shared/economy';
import type { ResourceKind } from '@project-exodus/shared/protocol';

let n: number = 0;
function check(name: string, fn: () => void): void {
  fn();
  n += 1;
  console.log(`  ok ${n} - ${name}`);
}

console.log('[Test:Economy] custos, pop-cap e paridade de treino (2.6.2)');

function scenario(): Simulation {
  const sim = new Simulation(42);
  Simulation.createDefaultScenario(sim, 'p1');
  return sim;
}

check('cenário concede o tesouro inicial do shared', () => {
  const sim: Simulation = scenario();
  const score: Record<ResourceKind, number> = sim.scoreOf('p1');
  assert.equal(score['RACAO_AGUA'], STARTING_RESOURCES.RACAO_AGUA);
  assert.equal(score['SUCATA'], STARTING_RESOURCES.SUCATA);
  assert.equal(score['CHIPS_IA'], STARTING_RESOURCES.CHIPS_IA);
  assert.equal(score['CONCRETO'], STARTING_RESOURCES.CONCRETO);
});

check('TRAIN debita o custo exato e reenvio é idempotente', () => {
  const sim: Simulation = scenario();
  const before: Record<ResourceKind, number> = { ...sim.scoreOf('p1') };
  const cost: Record<ResourceKind, number> = costToResources(TRAINING_SPECS.RUST_RAIDER.cost);
  assert.equal(
    sim.issueCommand({ kind: 'TRAIN', cmdId: 't1', playerId: 'p1', tick: 0, buildingId: 'bld_cc_1', unit: 'RUST_RAIDER' }),
    true,
  );
  const after: Record<ResourceKind, number> = sim.scoreOf('p1');
  assert.equal(after['RACAO_AGUA'], before['RACAO_AGUA'] - cost['RACAO_AGUA']);
  assert.equal(after['SUCATA'], before['SUCATA'] - cost['SUCATA']);
  // Mesmo cmdId de novo: aceito como reenvio, SEM segundo débito.
  assert.equal(
    sim.issueCommand({ kind: 'TRAIN', cmdId: 't1', playerId: 'p1', tick: 1, buildingId: 'bld_cc_1', unit: 'RUST_RAIDER' }),
    true,
  );
  assert.equal(sim.scoreOf('p1')['RACAO_AGUA'], after['RACAO_AGUA']);
});

check('TRAIN rejeita sem recursos (tesouro zero)', () => {
  const sim: Simulation = new Simulation(7);
  sim.spawnBuilding('p1', 'cc', 'COMMAND_CENTER', 0, -2);
  assert.equal(
    sim.issueCommand({ kind: 'TRAIN', cmdId: 't1', playerId: 'p1', tick: 0, buildingId: 'cc', unit: 'SCAVENGER_WORKER' }),
    false,
  );
  assert.equal(sim.scoreOf('p1')['RACAO_AGUA'], 0, 'nada foi debitado na rejeição');
});

check('pop-cap rejeita no teto e libera ao cair abaixo', () => {
  const sim: Simulation = scenario(); // 5 unidades
  for (let i: number = 0; i < POP_MAX - 5; i++) {
    sim.spawnUnit('p1', `u_x${i}`, 'SCAVENGER_WORKER', 5 + i, 5);
  }
  assert.equal(sim.populationOf('p1'), POP_MAX);
  assert.equal(
    sim.issueCommand({ kind: 'TRAIN', cmdId: 't1', playerId: 'p1', tick: 0, buildingId: 'bld_cc_1', unit: 'SCAVENGER_WORKER' }),
    false,
    'no teto, TRAIN é rejeitado',
  );
  sim.removeEntity('u_x0');
  assert.equal(sim.populationOf('p1'), POP_MAX - 1);
  assert.equal(
    sim.issueCommand({ kind: 'TRAIN', cmdId: 't2', playerId: 'p1', tick: 1, buildingId: 'bld_cc_1', unit: 'SCAVENGER_WORKER' }),
    true,
    'abaixo do teto, TRAIN é aceito',
  );
});

check('drone e mech treinam com os ticks derivados do shared', () => {
  // Derivação é a fonte da verdade (sem números mágicos).
  for (const unit of Object.keys(TRAINING_SPECS) as UnitType[]) {
    assert.equal(TRAIN_TICKS[unit], Math.round(TRAINING_SPECS[unit].time * TICK_RATE), unit);
  }
  // Drone: custo cabe no tesouro inicial (60 ração + 40 sucata).
  const simA: Simulation = scenario();
  assert.equal(
    simA.issueCommand({ kind: 'TRAIN', cmdId: 'd1', playerId: 'p1', tick: 0, buildingId: 'bld_cc_1', unit: 'MAINTENANCE_DRONE' }),
    true,
  );
  for (let i: number = 0; i < TRAIN_TICKS.MAINTENANCE_DRONE; i++) simA.step();
  const readyA = simA.takeSnapshot().events.filter((e) => e.kind === 'UNIT_READY');
  assert.equal(readyA.length, 1);
  if (readyA[0].kind === 'UNIT_READY') {
    assert.equal(readyA[0].unit, 'MAINTENANCE_DRONE');
    assert.equal((simA.getEntity(readyA[0].unitId) as SimEntity).hp, 80);
  }
  // Mech: 200 sucata > tesouro inicial — o depósito cobre a diferença.
  const simB: Simulation = scenario();
  simB.deposit('p1', 'SUCATA', 100);
  assert.equal(
    simB.issueCommand({ kind: 'TRAIN', cmdId: 'm1', playerId: 'p1', tick: 0, buildingId: 'bld_cc_1', unit: 'BIPED_MECH' }),
    true,
  );
  for (let i: number = 0; i < TRAIN_TICKS.BIPED_MECH; i++) simB.step();
  const readyB = simB.takeSnapshot().events.filter((e) => e.kind === 'UNIT_READY');
  assert.equal(readyB.length, 1);
  if (readyB[0].kind === 'UNIT_READY') {
    assert.equal(readyB[0].unit, 'BIPED_MECH');
    assert.equal((simB.getEntity(readyB[0].unitId) as SimEntity).hp, 300);
  }
});

check('CANCEL_TRAIN reembolsa integral e remove da fila', () => {
  const sim: Simulation = scenario();
  const treasury: Record<ResourceKind, number> = { ...sim.scoreOf('p1') };
  assert.equal(
    sim.issueCommand({ kind: 'TRAIN', cmdId: 't9', playerId: 'p1', tick: 0, buildingId: 'bld_cc_1', unit: 'RUST_RAIDER' }),
    true,
  );
  const debited: Record<ResourceKind, number> = { ...sim.scoreOf('p1') };
  assert.notDeepEqual(debited, treasury);
  assert.equal(
    sim.issueCommand({ kind: 'CANCEL_TRAIN', cmdId: 'c9', playerId: 'p1', tick: 1, buildingId: 'bld_cc_1', jobCmdId: 't9' }),
    true,
  );
  assert.deepEqual(sim.scoreOf('p1'), treasury, 'reembolso integral');
  const cc: SimEntity = sim.getEntity('bld_cc_1') as SimEntity;
  assert.equal(cc.trainQueue.length, 0, 'job removido da fila');
  // Cancelar de novo (job inexistente) e cancelar de outro jogador: rejeitados.
  assert.equal(
    sim.issueCommand({ kind: 'CANCEL_TRAIN', cmdId: 'c10', playerId: 'p1', tick: 2, buildingId: 'bld_cc_1', jobCmdId: 't9' }),
    false,
  );
  assert.equal(
    sim.issueCommand({ kind: 'CANCEL_TRAIN', cmdId: 'c11', playerId: 'p2', tick: 3, buildingId: 'bld_cc_1', jobCmdId: 't9' }),
    false,
  );
});

console.log(`[Test:Economy] ${n} asserts OK`);
process.exit(0);
