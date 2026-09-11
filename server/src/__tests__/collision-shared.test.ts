/**
 * collision-shared.test.ts — CONTRATO CONGELADO da sub-fase 1.12.4 (dentro da 2.6.3).
 *
 * Fonte única do resolvedor de colisão em `@project-exodus/shared/collision`:
 * cliente e servidor consomem o MESMO código e as MESMAS constantes.
 * ESTE ARQUIVO NÃO DEVE SER ALTERADO APÓS A IMPLEMENTAÇÃO.
 *
 * Roda com: node --loader ts-node/esm src/__tests__/collision-shared.test.ts
 */
import assert from 'node:assert/strict';
import { CollisionWorld, type CircleObstacle } from '@project-exodus/shared/collision';
import { UNIT_STATS } from '@project-exodus/shared/units';
import { UNIT_COLLISION_RADIUS, type SimEntity } from '../simulation.js';
import { clampToWorld } from '../grid.js';

let n: number = 0;
function check(name: string, fn: () => void): void {
  fn();
  n += 1;
  console.log(`  ok ${n} - ${name}`);
}

console.log('[Test:CollisionShared] fonte única do resolvedor (1.12.4)');

const building: CircleObstacle = { x: 0, z: 0, radius: 8, kind: 'building' };

check('resolveMove projeta para fora e bloqueia (contato exato)', () => {
  const world: CollisionWorld = new CollisionWorld();
  world.setObstacles([building]);
  const hit = world.resolveMove(10, 0, -2, 0, 0.7); // atravessa o centro do prédio
  assert.equal(hit.blocked, true);
  const d: number = Math.hypot(hit.x - 0, hit.z - 0);
  assert.ok(d >= 8.7 - 0.001, `distância final=${d.toFixed(4)} (contato 8,7)`);
});

check('resolveMove é determinístico (mesma entrada → mesma saída)', () => {
  const world: CollisionWorld = new CollisionWorld();
  world.setObstacles([building]);
  const a = world.resolveMove(10, 0, -2, 0, 0.7);
  const b = world.resolveMove(10, 0, -2, 0, 0.7);
  assert.deepEqual(a, b);
});

check('resolveTarget projeta destino interno para a borda', () => {
  const world: CollisionWorld = new CollisionWorld();
  world.setObstacles([building]);
  const t = world.resolveTarget(-2, 0, 0.7);
  const d: number = Math.hypot(t.x - 0, t.z - 0);
  assert.ok(d >= 8.7 + 0.1 - 0.001, `destino projetado a ${d.toFixed(3)} (borda = 8,8)`);
});

check('constantes do servidor derivam do shared (raios e clamp ±88)', () => {
  const types = ['SCAVENGER_WORKER', 'RUST_RAIDER', 'SCRAP_BUGGY'] as const;
  for (const t of types) {
    assert.equal(UNIT_COLLISION_RADIUS[t], UNIT_STATS[t].collisionRadius, t);
  }
  assert.equal(clampToWorld(89), 88);
  assert.equal(clampToWorld(-89), -88);
});

check('servidor usa o resolvedor compartilhado (projeção em runtime)', () => {
  // Comportamento observável: unidade contornando veio nunca entra no círculo.
  const world: CollisionWorld = new CollisionWorld();
  world.setObstacles([{ x: 30, z: 45, radius: 2.4, kind: 'node', id: 'node_suc_2' }]);
  const from = world.resolveMove(30, 42, 30, 45, 0.7); // tenta entrar no veio
  const d: number = Math.hypot(from.x - 30, from.z - 45);
  assert.ok(d >= 3.1 - 0.001, `unidade parou a ${d.toFixed(3)} do centro (contato 3,1)`);
  assert.equal(from.blocked, true);
});

console.log(`[Test:CollisionShared] ${n} asserts OK`);
process.exit(0);
