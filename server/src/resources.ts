/**
 * resources.ts — Lógica dos nós dos 4 recursos (Fase 2.4; dados migrados
 * para `@project-exodus/shared/world` na Fase 2.6.1).
 *
 * Aqui ficam apenas as operações (cópia por partida, extração, validação);
 * o LAYOUT é fonte única no shared (cliente e servidor leem o mesmo).
 */

import type { ResourceKind } from '@project-exodus/shared/protocol';
import {
  HALF_WORLD,
  INITIAL_RESOURCE_NODES,
  INITIAL_SPAWNS,
  NODE_MAX_RADIUS,
  NODE_MIN_RADIUS,
  NODE_MIN_SPACING,
  SPAWN_CLEARANCE,
  type ResourceNode,
} from '@project-exodus/shared/world';

export {
  INITIAL_RESOURCE_NODES,
  INITIAL_SPAWNS,
  NODE_MAX_RADIUS,
  NODE_MIN_RADIUS,
  NODE_MIN_SPACING,
  SPAWN_CLEARANCE,
};
export type { ResourceNode };

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
