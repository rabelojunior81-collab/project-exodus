/**
 * collision.test.ts — Física de colisão do servidor (Fase 1.12, spec 03).
 * Roda com: node --loader ts-node/esm src/__tests__/collision.test.ts
 */
import assert from 'node:assert/strict';
import {
  BUILDING_RADIUS,
  NODE_COLLISION_RADIUS,
  Simulation,
  UNIT_COLLISION_RADIUS,
} from '../simulation.js';
import { INITIAL_RESOURCE_NODES } from '../resources.js';

let n: number = 0;
function check(name: string, fn: () => void): void {
  fn();
  n += 1;
  console.log(`  ok ${n} - ${name}`);
}

console.log('[Test:Collision] projeção e travessia (spec 03)');

function makeSim(): Simulation {
  const sim = new Simulation(1234);
  Simulation.createDefaultScenario(sim, 'p1');
  return sim;
}

check('unidade nunca entra no Centro de Comando', () => {
  const sim = makeSim();
  const cc = sim.getEntity('bld_cc_1');
  assert.ok(cc);
  sim.planTo('u_w1', cc.x, cc.z);
  const minD: number =
    BUILDING_RADIUS.COMMAND_CENTER + UNIT_COLLISION_RADIUS.SCAVENGER_WORKER - 0.01;
  for (let i = 0; i < 200; i++) {
    sim.step();
    const u = sim.getEntity('u_w1');
    assert.ok(u);
    const d: number = Math.hypot(u.x - cc.x, u.z - cc.z);
    assert.ok(d >= minD, `tick ${i}: d=${d.toFixed(3)} < ${minD}`);
  }
});

check('MOVE através do CC termina no destino (A* contorna)', () => {
  const sim = makeSim();
  const u = sim.getEntity('u_w1');
  assert.ok(u);
  const ok: boolean = sim.issueCommand({
    kind: 'MOVE', playerId: 'p1', entityIds: ['u_w1'], x: 0, z: -15, cmdId: 'c_move', tick: sim.getTick(),
  });
  assert.equal(ok, true);
  for (let i = 0; i < 600; i++) sim.step();
  const d: number = Math.hypot(u.x - 0, u.z - (-15));
  assert.ok(d < 3.5, `não chegou: d=${d.toFixed(2)}`);
});

check('veio bloqueia a passagem (projeção)', () => {
  const sim = makeSim();
  const node = INITIAL_RESOURCE_NODES[0];
  sim.planTo('u_w1', node.x, node.z);
  const minD: number =
    NODE_COLLISION_RADIUS + UNIT_COLLISION_RADIUS.SCAVENGER_WORKER - 0.01;
  for (let i = 0; i < 300; i++) {
    sim.step();
    const u = sim.getEntity('u_w1');
    assert.ok(u);
    const d: number = Math.hypot(u.x - node.x, u.z - node.z);
    assert.ok(d >= minD, `tick ${i}: d=${d.toFixed(3)} < ${minD}`);
  }
});

check('determinismo preservado com colisão', () => {
  const run = (): string => {
    const sim = makeSim();
    sim.issueCommand({
      kind: 'MOVE', playerId: 'p1', entityIds: ['u_w1', 'u_w2'], x: 0, z: -15, cmdId: 'c_det', tick: sim.getTick(),
    });
    for (let i = 0; i < 300; i++) sim.step();
    return JSON.stringify(sim.takeSnapshot().entities.map((e) => [e.id, e.x, e.z]));
  };
  assert.equal(run(), run());
});

console.log(`[Test:Collision] ${n} asserts OK`);
process.exit(0);
