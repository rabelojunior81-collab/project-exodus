/**
 * resources.test.ts — Testes dos nós de recurso (Fase 2.4).
 * Roda com: node --loader ts-node/esm src/__tests__/resources.test.ts
 */
import assert from 'node:assert/strict';
import {
  INITIAL_RESOURCE_NODES,
  INITIAL_SPAWNS,
  NODE_MAX_RADIUS,
  NODE_MIN_RADIUS,
  NODE_MIN_SPACING,
  SPAWN_CLEARANCE,
  createInitialResourceNodes,
  harvestNode,
  validateResourceLayout,
  type ResourceNode,
} from '../resources.js';
import { RESOURCE_KINDS } from '@project-exodus/shared/protocol';

let n: number = 0;
function check(name: string, fn: () => void): void {
  fn();
  n += 1;
  console.log(`  ok ${n} - ${name}`);
}

console.log('[Test:Resources] nós dos 4 recursos');

check('8 nós, 2 por recurso, 4 kinds', () => {
  assert.equal(INITIAL_RESOURCE_NODES.length, 8);
  assert.deepEqual([...RESOURCE_KINDS].sort(), ['CHIPS_IA', 'CONCRETO', 'RACAO_AGUA', 'SUCATA']);
  for (const kind of RESOURCE_KINDS) {
    const count: number = INITIAL_RESOURCE_NODES.filter((nd) => nd.kind === kind).length;
    assert.equal(count, 2);
  }
});

check('raios em 35–70 (fora do platô r30)', () => {
  for (const nd of INITIAL_RESOURCE_NODES) {
    const r: number = Math.hypot(nd.x, nd.z);
    assert.ok(r >= NODE_MIN_RADIUS && r <= NODE_MAX_RADIUS, `${nd.id} r=${r.toFixed(1)}`);
  }
});

check('folga dos spawns (0,-2),(±16,2)', () => {
  for (const nd of INITIAL_RESOURCE_NODES) {
    for (const s of INITIAL_SPAWNS) {
      const d: number = Math.hypot(nd.x - s.x, nd.z - s.z);
      assert.ok(d >= SPAWN_CLEARANCE, `${nd.id} a ${d.toFixed(1)}m do spawn`);
    }
  }
});

check('sem overlap entre nós (spacing ≥ 15)', () => {
  const nodes: ReadonlyArray<ResourceNode> = INITIAL_RESOURCE_NODES;
  for (let i: number = 0; i < nodes.length; i++) {
    for (let j: number = i + 1; j < nodes.length; j++) {
      const d: number = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z);
      assert.ok(d >= NODE_MIN_SPACING, `${nodes[i].id}↔${nodes[j].id} d=${d.toFixed(1)}`);
    }
  }
});

check('validateResourceLayout aprova o layout', () => {
  assert.deepEqual(validateResourceLayout(INITIAL_RESOURCE_NODES), []);
});

check('harvestNode extrai até o saldo e zera', () => {
  const nodes: ResourceNode[] = createInitialResourceNodes();
  const nd: ResourceNode = nodes[0];
  const start: number = nd.amount;
  assert.equal(harvestNode(nd, 5), 5);
  assert.equal(nd.amount, start - 5);
  assert.equal(harvestNode(nd, 1e9), start - 5);
  assert.equal(nd.amount, 0);
  assert.equal(harvestNode(nd, 1), 0);
});

check('cópias independentes por partida', () => {
  const a: ResourceNode[] = createInitialResourceNodes();
  const b: ResourceNode[] = createInitialResourceNodes();
  a[0].amount = 0;
  assert.ok(b[0].amount > 0);
});

console.log(`[Test:Resources] ${n} asserts OK`);
process.exit(0);
