/**
 * economy.ts — Economia compartilhada (Fase 2.6.1).
 *
 * Fonte única para recursos, teto populacional e constantes de coleta em
 * PARIDADE entre cliente e servidor. Valores já decididos mas ainda não
 * aplicados em algum lado ficam marcados com a sub-fase que os aplica —
 * nunca duplicados silenciosamente.
 */

/** Os 4 recursos temáticos. Ração/Água é um único recurso. */
export type ResourceKind = 'RACAO_AGUA' | 'SUCATA' | 'CHIPS_IA' | 'CONCRETO';

export const RESOURCE_KINDS: ReadonlyArray<ResourceKind> = [
  'RACAO_AGUA',
  'SUCATA',
  'CHIPS_IA',
  'CONCRETO',
];

/**
 * Teto populacional global. Cliente aplica hoje (Fase 1.7C);
 * o servidor passa a rejeitar treino no limite na 2.6.2 (spec 02 §5).
 */
export const POP_MAX: number = 20;

/** Capacidade de carga do trabalhador (unidades de recurso). */
export const WORKER_CARRY_CAPACITY: number = 10;

/** Distância de parada até o nó para começar a coletar. */
export const GATHER_RANGE: number = 4;

/** Rendimento por intervalo de coleta (modelo incremental do servidor). */
export const GATHER_YIELD: number = 1;

/** Tempo da coleta atômica do cliente (playtestado na 1.7D). */
export const CLIENT_GATHER_TIME_SECONDS: number = 3;
