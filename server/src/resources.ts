/**
 * resources.ts — Nós dos 4 recursos (Fase 2.4).
 *
 * Posições FIXAS e determinísticas (sem sorteio): fora do platô
 * (raio 35–70 do centro), dentro do mapa (|x|,|z| ≤ 90) e com folga
 * dos spawns/buildings iniciais (0,-2) e (±16,2).
 */

import type { ResourceKind } from './protocol.js';
import { HALF_WORLD } from './grid.js';

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

/** Spawns/buildings iniciais do cliente (`client/src/main.ts`). */
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

/** Cópia profunda mutável do layout inicial (uma por Simulation). */
export function createInitialResourceNodes(): ResourceNode[] {
  return INITIAL_RESOURCE_NODES.map((nd) => ({ ...nd }));
}

/**
 * Extrai até `wanted` do nó (limitado ao saldo). Retorna o extraído.
 * Puro/determinístico.
 */
export function harvestNode(nd: ResourceNode, wanted: number): number {
  if (wanted <= 0 || nd.amount <= 0) return 0;
  const taken: number = wanted < nd.amount ? wanted : nd.amount;
  nd.amount -= taken;
  return taken;
}

/** Valida o layout (usado pelos testes e pelo boot da simulação). */
export function validateResourceLayout(nodes: ReadonlyArray<ResourceNode>): string[] {
  const errors: string[] = [];
  for (const nd of nodes) {
    const r: number = Math.hypot(nd.x, nd.z);
    if (r < NODE_MIN_RADIUS || r > NODE_MAX_RADIUS) {
      errors.push(`${nd.id}: raio ${r.toFixed(1)} fora de 35–70`);
    }
    if (Math.abs(nd.x) > HALF_WORLD || Math.abs(nd.z) > HALF_WORLD) {
      errors.push(`${nd.id}: fora do mapa 180×180`);
    }
    for (const s of INITIAL_SPAWNS) {
      if (Math.hypot(nd.x - s.x, nd.z - s.z) < SPAWN_CLEARANCE) {
        errors.push(`${nd.id}: overlap com spawn (${s.x},${s.z})`);
      }
    }
  }
  for (let i: number = 0; i < nodes.length; i++) {
    for (let j: number = i + 1; j < nodes.length; j++) {
      const d: number = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z);
      if (d < NODE_MIN_SPACING) errors.push(`${nodes[i].id}↔${nodes[j].id}: spacing ${d.toFixed(1)}`);
    }
  }
  return errors;
}
