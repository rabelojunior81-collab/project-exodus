/**
 * world.ts — Mundo compartilhado (Fase 2.6.1).
 *
 * Dimensões, grade, platô, crateras, layout dos 8 nós e spawns iniciais.
 * Puro e determinístico: usado pelo grid/A* do servidor e pelo terreno,
 * props e economia visual do cliente.
 */
import type { ResourceKind } from './economy.js';

export interface Vec2 {
  x: number;
  z: number;
}

/** Obstáculo do grid/A* (construções). Para colisão de gameplay, ver `collision.ts`. */
export interface GridObstacle {
  x: number;
  z: number;
  r: number;
}

export interface Crater extends GridObstacle {}

/** Tamanho do mundo em metros (aresta; centrado na origem). */
export const WORLD_SIZE: number = 180;
/** Metade do mundo: coords válidas em [-HALF_WORLD, +HALF_WORLD]. */
export const HALF_WORLD: number = WORLD_SIZE / 2;
/** Aresta da célula em metros. */
export const CELL_SIZE: number = 2;
/** Células por eixo: 90×90 cobrindo exatamente 180 m. */
export const GRID_DIM: number = WORLD_SIZE / CELL_SIZE;
/** Raio do platô militar transitável (idem terrainHeight.ts). */
export const PLATEAU_RADIUS: number = 30;
/** Fim da rampa de transição do platô (smoothstep 30→45). */
export const PLATEAU_RAMP_END: number = 45;

/** Crateras: transitáveis, mas com custo elevado (lento/lodoso). */
export const CRATERS: ReadonlyArray<Crater> = [
  { x: 25, z: -20, r: 12 },
  { x: -30, z: 15, r: 10 },
];

/** Multiplicador máximo de custo no centro da cratera. */
export const CRATER_CENTER_COST: number = 5;

// ------------------------------------------------------------ conversões

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
  if (v < -WORLD_LIMIT) return -WORLD_LIMIT;
  if (v > WORLD_LIMIT) return WORLD_LIMIT;
  return v;
}

// ------------------------------------------------------- layout de recursos

export interface ResourceNode {
  id: string;
  kind: ResourceKind;
  x: number;
  z: number;
  amount: number;
  maxAmount: number;
}

/** Raio mínimo/máximo dos nós em relação ao centro (0,0). */
export const NODE_MIN_RADIUS: number = 35;
export const NODE_MAX_RADIUS: number = 70;

/** Distância mínima entre dois nós (sem overlap de veios). */
export const NODE_MIN_SPACING: number = 15;

/** Folga mínima de cada nó até os spawns iniciais. */
export const SPAWN_CLEARANCE: number = 10;

/** Raio de colisão dos veios (espelha o cliente; veios não entram no A*). */
export const NODE_COLLISION_RADIUS: number = 2.4;

/**
 * Limite de posicionamento das unidades — D-2.6.3-B: ±88 m (margem visual de
 * 2 m dentro do mapa de 180 m, valor validado no cliente).
 */
export const WORLD_LIMIT: number = 88;

/** Spawns/buildings iniciais (CC, refinaria, bunker). */
export const INITIAL_SPAWNS: ReadonlyArray<{ x: number; z: number }> = [
  { x: 0, z: -2 },
  { x: -16, z: 2 },
  { x: 16, z: 2 },
];

function node(
  id: string, kind: ResourceKind, x: number, z: number, amount: number,
): ResourceNode {
  return { id, kind, x, z, amount, maxAmount: amount };
}

/**
 * Layout inicial: 8 nós (2 por recurso), ângulos espalhados para
 * forçar expansão em 4 direções. Raios 46–65 (dentro de 35–70).
 */
export const INITIAL_RESOURCE_NODES: ReadonlyArray<ResourceNode> = [
  node('node_rac_1', 'RACAO_AGUA', 45, 10, 1500),
  node('node_rac_2', 'RACAO_AGUA', -40, 25, 1500),
  node('node_suc_1', 'SUCATA', -15, -55, 1500),
  node('node_suc_2', 'SUCATA', 30, 45, 1500),
  node('node_chip_1', 'CHIPS_IA', 60, -25, 800),
  node('node_chip_2', 'CHIPS_IA', -60, -20, 800),
  node('node_conc_1', 'CONCRETO', 10, 60, 1200),
  node('node_conc_2', 'CONCRETO', -28, 48, 1200),
];
