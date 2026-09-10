/**
 * worker.test.ts — Testes da FSM do trabalhador (Fase 2.5).
 * Roda com: node --loader ts-node/esm src/__tests__/worker.test.ts
 *
 * Usa a Simulation real como WorkerWorld: ciclo completo
 * IDLE→GOTO_RESOURCE→GATHER→GOTO_CC→DELIVER→repeat com +placar.
 */
import assert from 'node:assert/strict';
import { Simulation, type SimEntity } from '../simulation.js';
import {
  WORKER_CARRY_CAPACITY,
} from '../worker.js';

let n: number = 0;
function check(name: string, fn: () => void): void {
  fn();
  n += 1;
  console.log(`  ok ${n} - ${name}`);
}

console.log('[Test:Worker] FSM de coleta');

function setup(): Simulation {
  const sim = new Simulation(1234);
  sim.spawnBuilding('p1', 'cc', 'COMMAND_CENTER', 0, -2);
  sim.spawnUnit('p1', 'w1', 'SCAVENGER_WORKER', -6, 8);
  return sim;
}

check('GATHER leva a GOTO_RESOURCE com caminho', () => {
  const sim: Simulation = setup();
  assert.equal(
    sim.issueCommand({ kind: 'GATHER', cmdId: 'g1', playerId: 'p1', tick: 0, entityIds: ['w1'], nodeId: 'node_suc_2' }),
    true,
  );
  const w: SimEntity = sim.getEntity('w1') as SimEntity;
  assert.equal(w.state, 'GOTO_RESOURCE');
  assert.ok(w.path.length > 0);
});

check('ciclo completo entrega 10 un e emite RESOURCE_DELIVERED', () => {
  const sim: Simulation = setup();
  sim.issueCommand({ kind: 'GATHER', cmdId: 'g1', playerId: 'p1', tick: 0, entityIds: ['w1'], nodeId: 'node_suc_2' });
  let delivered: number = 0;
  let ticks: number = 0;
  // Ida (~43m) + coleta (100 ticks) + volta: folga até 1200 ticks.
  for (ticks = 0; ticks < 1200; ticks++) {
    sim.step();
    for (const e of sim.peekEvents()) {
      if (e.kind === 'RESOURCE_DELIVERED' && e.workerId === 'w1') delivered += e.amount;
    }
    if (delivered > 0) break;
    // Drena para não acumular (takeSnapshot drena; aqui só observamos)
    sim.takeSnapshot();
  }
  assert.equal(delivered, WORKER_CARRY_CAPACITY);
  assert.equal(sim.scoreOf('p1')['SUCATA'], WORKER_CARRY_CAPACITY);
  const w: SimEntity = sim.getEntity('w1') as SimEntity;
  assert.equal(w.carryAmount, 0);
  assert.ok(w.state === 'DELIVER' || w.state === 'GOTO_RESOURCE', `estado=${w.state}`);
  console.log(`    (primeira entrega em ${ticks + 1} ticks)`);
});

check('após DELIVER, o loop repete (segunda entrega dobra o placar)', () => {
  const sim: Simulation = setup();
  sim.issueCommand({ kind: 'GATHER', cmdId: 'g1', playerId: 'p1', tick: 0, entityIds: ['w1'], nodeId: 'node_suc_2' });
  for (let i: number = 0; i < 2400; i++) sim.step();
  const score: number = sim.scoreOf('p1')['SUCATA'];
  assert.ok(score >= WORKER_CARRY_CAPACITY * 2, `placar=${score}`);
});

check('GATHER coleta por timer: carga enche sem pular estados', () => {
  const sim: Simulation = setup();
  // Trabalhador já ao lado do nó: GOTO_RESOURCE vira GATHER rápido.
  sim.spawnUnit('p1', 'w2', 'SCAVENGER_WORKER', 28, 42);
  sim.issueCommand({ kind: 'GATHER', cmdId: 'g2', playerId: 'p1', tick: 0, entityIds: ['w2'], nodeId: 'node_suc_2' });
  let sawGather: boolean = false;
  for (let i: number = 0; i < 300; i++) {
    sim.step();
    const w: SimEntity = sim.getEntity('w2') as SimEntity;
    if (w.state === 'GATHER') {
      sawGather = true;
      assert.ok(w.carryAmount <= WORKER_CARRY_CAPACITY);
    }
    if (w.state === 'GOTO_CC') break;
  }
  assert.ok(sawGather, 'passou por GATHER');
  const w: SimEntity = sim.getEntity('w2') as SimEntity;
  assert.equal(w.state, 'GOTO_CC');
  assert.equal(w.carryAmount, WORKER_CARRY_CAPACITY);
});

check('nó esgotado com carga vazia: volta a IDLE sem travar', () => {
  const sim: Simulation = setup();
  sim.spawnUnit('p1', 'w3', 'SCAVENGER_WORKER', 28, 42);
  assert.ok(sim.takeFromNode('node_suc_2', 1e9) > 0, 'nó tinha saldo');
  assert.equal(sim.nodeAmount('node_suc_2'), 0);
  sim.issueCommand({ kind: 'GATHER', cmdId: 'g3', playerId: 'p1', tick: 0, entityIds: ['w3'], nodeId: 'node_suc_2' });
  for (let i: number = 0; i < 600; i++) sim.step();
  const w: SimEntity = sim.getEntity('w3') as SimEntity;
  assert.equal(w.state, 'IDLE');
  assert.equal(w.carryAmount, 0);
});

check('stepWorkers puro: mesma seed repete a trajetória', () => {
  const run = (): string => {
    const sim: Simulation = setup();
    sim.issueCommand({ kind: 'GATHER', cmdId: 'g1', playerId: 'p1', tick: 0, entityIds: ['w1'], nodeId: 'node_rac_1' });
    const trail: string[] = [];
    for (let i: number = 0; i < 120; i++) {
      sim.step();
      const w: SimEntity = sim.getEntity('w1') as SimEntity;
      trail.push(`${w.x.toFixed(4)},${w.z.toFixed(4)},${w.state}`);
    }
    return trail.join('|');
  };
  assert.equal(run(), run());
});

console.log(`[Test:Worker] ${n} asserts OK`);
process.exit(0);
