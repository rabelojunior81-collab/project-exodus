/**
 * grid.ts — Grade espacial + A* determinístico (Fase 2.3).
 *
 * Alinhamento com o cliente (somente leitura, nunca editar client/):
 * - `WORLD_SIZE = 180`: `new TerrainManager(scene, 180)` e `mapSize = 180`
 *   em `client/src/main.ts`; coordenadas de mundo em [-90, +90].
 * - `PLATEAU_RADIUS = 30`: platô plano `dist < 30` em
 *   `client/src/engine/terrainHeight.ts`.
 * - Crateras convertidas de coords locais (x, y) para mundo (x, z=-y):
 *   crater1 local (25, 20, r12)  -> mundo (25, -20, r12);
 *   crater2 local (-30, -15, r10) -> mundo (-30, +15, r10).
 *
 * NOTA DE DESIGN sobre "grid 180×180 (célula 2m)": 180 células de 2m
 * cobririam 360m, dessincronizando do mapa de 180m do cliente. O que
 * cobre exatamente o mapa é 90×90 células de 2m; portanto GRID_DIM = 90
 * ("180×180" da spec = metros do mundo, não células). Testes travam isso.
 */

export interface Vec2 {
  x: number;
  z: number;
}

/** Obstáculo circular (buildings). Desvio testado em `astar.test.ts`. */
export interface CircleObstacle {
  x: number;
  z: number;
  r: number;
}

/** Tamanho do mundo em metros (aresta; centrado na origem). */
export const WORLD_SIZE: number = 180;
/** Metade do mundo: coords válidas em [-HALF_WORLD, +HALF_WORLD]. */
export const HALF_WORLD: number = WORLD_SIZE / 2;
/** Aresta da célula em metros. */
export const CELL_SIZE: number = 2;
/** Células por eixo: 90×90 cobrindo exatamente 180m. */
export const GRID_DIM: number = WORLD_SIZE / CELL_SIZE;
/** Raio do platô militar transitável (idem terrainHeight.ts). */
export const PLATEAU_RADIUS: number = 30;

export interface Crater extends CircleObstacle {}

/** Crateras: transitáveis, mas com custo elevado (lento/lodoso). */
export const CRATERS: ReadonlyArray<Crater> = [
  { x: 25, z: -20, r: 12 },
  { x: -30, z: 15, r: 10 },
];

/** Multiplicador máximo de custo no centro da cratera. */
export const CRATER_CENTER_COST: number = 5;

const SQRT2: number = Math.SQRT2;

// ------------------------------------------------------------ binary heap

interface HeapItem {
  f: number;
  order: number;
  idx: number;
}

/**
 * Heap binário mínimo com desempate determinístico por ordem de inserção.
 * (Sem Math.random; empates resolvem por `order`, logo repetível.)
 */
export class BinaryHeap {
  private items: HeapItem[] = [];
  private counter: number = 0;

  public size(): number {
    return this.items.length;
  }

  public push(f: number, idx: number): void {
    const item: HeapItem = { f, order: this.counter++, idx };
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  public pop(): HeapItem | undefined {
    if (this.items.length === 0) return undefined;
    const top: HeapItem = this.items[0];
    const last: HeapItem = this.items.pop() as HeapItem;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private less(a: HeapItem, b: HeapItem): boolean {
    if (a.f !== b.f) return a.f < b.f;
    return a.order < b.order;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent: number = (i - 1) >> 1;
      if (this.less(this.items[i], this.items[parent])) {
        const tmp: HeapItem = this.items[i];
        this.items[i] = this.items[parent];
        this.items[parent] = tmp;
        i = parent;
      } else {
        break;
      }
    }
  }

  private bubbleDown(i: number): void {
    const n: number = this.items.length;
    for (;;) {
      const left: number = i * 2 + 1;
      const right: number = left + 1;
      let best: number = i;
      if (left < n && this.less(this.items[left], this.items[best])) best = left;
      if (right < n && this.less(this.items[right], this.items[best])) best = right;
      if (best === i) break;
      const tmp: HeapItem = this.items[i];
      this.items[i] = this.items[best];
      this.items[best] = tmp;
      i = best;
    }
  }
}

// ------------------------------------------------------------ spatial grid

/** Converte coord de mundo para índice de célula (clamp nos limites). */
export function worldToCell(v: number): number {
  const c: number = Math.floor((v + HALF_WORLD) / CELL_SIZE);
  if (c < 0) return 0;
  if (c >= GRID_DIM) return GRID_DIM - 1;
  return c;
}

/** Centro da célula em coords de mundo. */
export function cellToWorld(c: number): number {
  return -HALF_WORLD + (c + 0.5) * CELL_SIZE;
}

export function clampToWorld(v: number): number {
  if (v < -HALF_WORLD) return -HALF_WORLD;
  if (v > HALF_WORLD) return HALF_WORLD;
  return v;
}

/**
 * Grade espacial: custos de terreno + obstáculos circulares (buildings).
 * Pura e determinística (sem RNG, sem Date.now).
 */
export class SpatialGrid {
  private obstacles: CircleObstacle[] = [];

  public addObstacle(o: CircleObstacle): void {
    this.obstacles.push({ x: o.x, z: o.z, r: o.r });
  }

  public removeObstacleAt(x: number, z: number): boolean {
    const i: number = this.obstacles.findIndex((o) => o.x === x && o.z === z);
    if (i < 0) return false;
    this.obstacles.splice(i, 1);
    return true;
  }

  public clearObstacles(): void {
    this.obstacles.length = 0;
  }

  public listObstacles(): CircleObstacle[] {
    return this.obstacles.map((o) => ({ x: o.x, z: o.z, r: o.r }));
  }

  /** Custo de terreno da célula (1 fora de crateras; até 5 no centro). */
  public cellMultiplier(c: number, r: number): number {
    const x: number = cellToWorld(c);
    const z: number = cellToWorld(r);
    let mult: number = 1;
    for (const crater of CRATERS) {
      const d: number = Math.hypot(x - crater.x, z - crater.z);
      if (d < crater.r) {
        const m: number = 1 + (CRATER_CENTER_COST - 1) * (1 - d / crater.r);
        if (m > mult) mult = m;
      }
    }
    return mult;
  }

  /** true se o centro da célula está dentro de algum obstáculo (+raio do agente). */
  public isCellBlocked(c: number, r: number, agentRadius: number): boolean {
    if (c < 0 || r < 0 || c >= GRID_DIM || r >= GRID_DIM) return true;
    const x: number = cellToWorld(c);
    const z: number = cellToWorld(r);
    return this.isPointBlocked(x, z, agentRadius);
  }

  /** true se o ponto está dentro de algum obstáculo (+raio do agente). */
  public isPointBlocked(x: number, z: number, agentRadius: number): boolean {
    for (const o of this.obstacles) {
      const rr: number = o.r + agentRadius;
      const dx: number = x - o.x;
      const dz: number = z - o.z;
      if (dx * dx + dz * dz < rr * rr) return true;
    }
    return false;
  }
}

// ------------------------------------------------------------------- A*

const DIRS: ReadonlyArray<{ dc: number; dr: number; cost: number }> = [
  { dc: 1, dr: 0, cost: 1 },
  { dc: -1, dr: 0, cost: 1 },
  { dc: 0, dr: 1, cost: 1 },
  { dc: 0, dr: -1, cost: 1 },
  { dc: 1, dr: 1, cost: SQRT2 },
  { dc: 1, dr: -1, cost: SQRT2 },
  { dc: -1, dr: 1, cost: SQRT2 },
  { dc: -1, dr: -1, cost: SQRT2 },
];

function octile(dc: number, dr: number): number {
  const a: number = Math.abs(dc);
  const b: number = Math.abs(dr);
  const m: number = a < b ? a : b;
  return a + b + (SQRT2 - 2) * m;
}

/**
 * Se o destino está bloqueado, procura a célula livre mais próxima
 * (anel quadrado crescente até 12 células). Retorna null se não houver.
 */
function nearestWalkable(
  grid: SpatialGrid,
  gc: number,
  gr: number,
  agentRadius: number,
): { c: number; r: number } | null {
  if (!grid.isCellBlocked(gc, gr, agentRadius)) return { c: gc, r: gr };
  for (let ring: number = 1; ring <= 12; ring++) {
    for (let dr: number = -ring; dr <= ring; dr++) {
      for (let dc: number = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
        const c: number = gc + dc;
        const rr: number = gr + dr;
        if (c < 0 || rr < 0 || c >= GRID_DIM || rr >= GRID_DIM) continue;
        if (!grid.isCellBlocked(c, rr, agentRadius)) return { c, r: rr };
      }
    }
  }
  return null;
}

/** Distância ponto→segmento em 2D (para checar corte de obstáculos). */
function segPointDist(
  px: number, pz: number,
  ax: number, az: number,
  bx: number, bz: number,
): number {
  const abx: number = bx - ax;
  const abz: number = bz - az;
  const len2: number = abx * abx + abz * abz;
  let t: number = 0;
  if (len2 > 0) {
    t = ((px - ax) * abx + (pz - az) * abz) / len2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
  }
  const cx: number = ax + abx * t;
  const cz: number = az + abz * t;
  return Math.hypot(px - cx, pz - cz);
}

/** true se o segmento AB passa longe de todos os obstáculos (+margem). */
function hasLineOfSight(grid: SpatialGrid, a: Vec2, b: Vec2, margin: number): boolean {
  for (const o of grid.listObstacles()) {
    if (segPointDist(o.x, o.z, a.x, a.z, b.x, b.z) < o.r + margin) return false;
  }
  return true;
}

export interface PathOptions {
  agentRadius?: number;
}

/**
 * A* 8-direcional com heap binário + suavização por linha de visada
 * (que respeita os círculos de obstáculos — sem cortar buildings).
 * Retorna waypoints em coords de mundo (inclui o destino) ou null se
 * inalcançável. Determinístico para mesmos inputs.
 */
export function findPath(
  grid: SpatialGrid,
  start: Vec2,
  goal: Vec2,
  opts?: PathOptions,
): Vec2[] | null {
  const agentRadius: number = opts?.agentRadius ?? 1.0;
  const sc: number = worldToCell(start.x);
  const sr: number = worldToCell(start.z);
  const gcRaw: number = worldToCell(goal.x);
  const grRaw: number = worldToCell(goal.z);

  const gTarget: { c: number; r: number } | null = nearestWalkable(grid, gcRaw, grRaw, agentRadius);
  if (gTarget === null) return null;
  const gc: number = gTarget.c;
  const gr: number = gTarget.r;

  const n: number = GRID_DIM;
  const startIdx: number = sr * n + sc;
  const goalIdx: number = gr * n + gc;
  if (startIdx === goalIdx) {
    return [{ x: clampToWorld(goal.x), z: clampToWorld(goal.z) }];
  }

  const g: Float64Array = new Float64Array(n * n).fill(Infinity);
  const came: Int32Array = new Int32Array(n * n).fill(-1);
  const closed: Uint8Array = new Uint8Array(n * n);
  const heap = new BinaryHeap();

  g[startIdx] = 0;
  heap.push(octile(gc - sc, gr - sr), startIdx);

  let found: boolean = false;
  while (heap.size() > 0) {
    const cur: HeapItem = heap.pop() as HeapItem;
    const curIdx: number = cur.idx;
    if (closed[curIdx] === 1) continue;
    closed[curIdx] = 1;
    if (curIdx === goalIdx) {
      found = true;
      break;
    }
    const cc: number = curIdx % n;
    const cr: number = Math.floor(curIdx / n);
    for (const d of DIRS) {
      const nc: number = cc + d.dc;
      const nr: number = cr + d.dr;
      if (nc < 0 || nr < 0 || nc >= n || nr >= n) continue;
      // Sem cortar quinas: diagonal exige ortogonais livres.
      if (d.dc !== 0 && d.dr !== 0) {
        if (grid.isCellBlocked(cc + d.dc, cr, agentRadius)) continue;
        if (grid.isCellBlocked(cc, cr + d.dr, agentRadius)) continue;
      }
      if (grid.isCellBlocked(nc, nr, agentRadius)) continue;
      const nIdx: number = nr * n + nc;
      if (closed[nIdx] === 1) continue;
      const stepCost: number = d.cost * grid.cellMultiplier(nc, nr);
      const tentative: number = g[curIdx] + stepCost;
      if (tentative < g[nIdx]) {
        g[nIdx] = tentative;
        came[nIdx] = curIdx;
        heap.push(tentative + octile(gc - nc, gr - nr), nIdx);
      }
    }
  }

  if (!found) return null;

  // Reconstrói (células, do destino à origem) e converte p/ mundo.
  const cells: Array<{ c: number; r: number }> = [];
  let at: number = goalIdx;
  let guard: number = 0;
  while (at !== -1 && guard <= n * n) {
    cells.push({ c: at % n, r: Math.floor(at / n) });
    if (at === startIdx) break;
    at = came[at];
    guard++;
  }
  cells.reverse();

  const raw: Vec2[] = cells.map((cell) => ({ x: cellToWorld(cell.c), z: cellToWorld(cell.r) }));
  // Fixa origem/destino exatos pedidos (clamp no mundo) — exceto se o
  // destino pedido estava bloqueado: aí o destino É a célula livre
  // encontrada pelo fallback (nunca um ponto dentro do obstáculo).
  const goalWasBlocked: boolean = grid.isPointBlocked(
    clampToWorld(goal.x), clampToWorld(goal.z), agentRadius,
  );
  raw[0] = { x: clampToWorld(start.x), z: clampToWorld(start.z) };
  raw[raw.length - 1] = goalWasBlocked
    ? { x: cellToWorld(gc), z: cellToWorld(gr) }
    : { x: clampToWorld(goal.x), z: clampToWorld(goal.z) };

  // Suavização gulosa por linha de visada (não corta obstáculos).
  const smooth: Vec2[] = [raw[0]];
  let anchor: number = 0;
  for (let i: number = 2; i < raw.length; i++) {
    if (!hasLineOfSight(grid, raw[anchor], raw[i], agentRadius)) {
      smooth.push(raw[i - 1]);
      anchor = i - 1;
    }
  }
  const last: Vec2 = raw[raw.length - 1];
  if (smooth[smooth.length - 1] !== last) smooth.push(last);
  return smooth;
}
