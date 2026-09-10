/**
 * astar.test.ts — Testes do grid espacial + A* (Fase 2.3).
 * Roda com: node --loader ts-node/esm src/__tests__/astar.test.ts
 */
import assert from 'node:assert/strict';
import {
  BinaryHeap,
  CELL_SIZE,
  CRATERS,
  GRID_DIM,
  HALF_WORLD,
  PLATEAU_RADIUS,
  SpatialGrid,
  WORLD_SIZE,
  cellToWorld,
  findPath,
  worldToCell,
  type Vec2,
} from '../grid.js';

let n: number = 0;
function check(name: string, fn: () => void): void {
  fn();
  n += 1;
  console.log(`  ok ${n} - ${name}`);
}

console.log('[Test:AStar] grid + heap + pathfinding');

// 2.3a — Dimensões cobrem exatamente o mapa do cliente (180m, célula 2m)
check('grid 90×90 de 2m cobre 180m', () => {
  assert.equal(WORLD_SIZE, 180);
  assert.equal(CELL_SIZE, 2);
  assert.equal(GRID_DIM, 90);
  assert.equal(GRID_DIM * CELL_SIZE, WORLD_SIZE);
  assert.equal(PLATEAU_RADIUS, 30);
  assert.equal(worldToCell(-HALF_WORLD), 0);
  assert.equal(worldToCell(HALF_WORLD), GRID_DIM - 1);
  assert.ok(Math.abs(cellToWorld(0) - (-89)) < 1e-9);
});

// 2.3b — Heap binário: ordem crescente + desempate determinístico
check('heap extrai em ordem', () => {
  const h = new BinaryHeap();
  for (const f of [5, 1, 4, 1, 3, 2]) h.push(f, 0);
  const out: number[] = [];
  while (h.size() > 0) out.push((h.pop() as { f: number }).f);
  assert.deepEqual(out, [1, 1, 2, 3, 4, 5]);
});

// 2.3c — Platô transitável, crateras com custo maior
check('platô livre; cratera custa mais', () => {
  const g = new SpatialGrid();
  assert.equal(g.isCellBlocked(worldToCell(0), worldToCell(0), 1), false);
  assert.equal(g.cellMultiplier(worldToCell(0), worldToCell(0)), 1);
  const c0 = CRATERS[0];
  const centerMult: number = g.cellMultiplier(worldToCell(c0.x), worldToCell(c0.z));
  assert.ok(centerMult > 2, `custo no centro da cratera=${centerMult}`);
});

// 2.3d — Caminho em campo aberto ~= distância octil (quase-reto)
check('campo aberto gera caminho direto', () => {
  const g = new SpatialGrid();
  const path: Vec2[] | null = findPath(g, { x: -20, z: 0 }, { x: 20, z: 0 });
  assert.ok(path !== null && path.length >= 2);
  let len: number = 0;
  for (let i: number = 1; i < (path as Vec2[]).length; i++) {
    len += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  }
  assert.ok(len < 44, `caminho quase-reto len=${len.toFixed(1)}`);
  const last: Vec2 = path[path.length - 1];
  assert.ok(Math.hypot(last.x - 20, last.z - 0) < 1e-9);
});

// 2.3e — Desvio de obstáculo circular (building): nenhum waypoint dentro
check('desvia de building circular', () => {
  const g = new SpatialGrid();
  g.addObstacle({ x: 0, z: -2, r: 8 }); // CC
  const path: Vec2[] | null = findPath(g, { x: -20, z: -2 }, { x: 20, z: -2 }, { agentRadius: 1 });
  assert.ok(path !== null && path.length > 2, 'desvio exige >2 waypoints');
  for (const wp of path as Vec2[]) {
    const d: number = Math.hypot(wp.x - 0, wp.z - (-2));
    assert.ok(d >= 8.9, `waypoint dentro do CC: d=${d.toFixed(2)}`);
  }
});

// 2.3f — Destino dentro do obstáculo: fallback p/ borda livre
check('destino bloqueado cai na borda', () => {
  const g = new SpatialGrid();
  g.addObstacle({ x: 10, z: 10, r: 4.5 });
  const path: Vec2[] | null = findPath(g, { x: 0, z: 0 }, { x: 10, z: 10 }, { agentRadius: 1 });
  assert.ok(path !== null);
  const last: Vec2 = (path as Vec2[])[(path as Vec2[]).length - 1];
  assert.ok(Math.hypot(last.x - 10, last.z - 10) >= 4.5);
});

// 2.3g — Determinismo: mesma query → mesmo caminho
check('A* determinístico', () => {
  const g = new SpatialGrid();
  g.addObstacle({ x: 0, z: -2, r: 8 });
  const a: Vec2[] | null = findPath(g, { x: -40, z: 30 }, { x: 45, z: 10 });
  const b: Vec2[] | null = findPath(g, { x: -40, z: 30 }, { x: 45, z: 10 });
  assert.deepEqual(a, b);
});

console.log(`[Test:AStar] ${n} asserts OK`);
process.exit(0);
