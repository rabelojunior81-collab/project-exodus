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

/**
 * Tesouro inicial do jogador (paridade de modelo — 2.6.2).
 * Espelha o estado inicial do cliente (`client/src/main.ts`).
 */
export const STARTING_RESOURCES: Record<ResourceKind, number> = {
  RACAO_AGUA: 250,
  SUCATA: 180,
  CHIPS_IA: 75,
  CONCRETO: 50,
};

/** Capacidade de carga do trabalhador (unidades de recurso). */
export const WORKER_CARRY_CAPACITY: number = 10;

/** Distância de parada até o nó para começar a coletar. */
export const GATHER_RANGE: number = 4;

/** Rendimento por intervalo de coleta (modelo incremental do servidor). */
export const GATHER_YIELD: number = 1;

/**
 * Intervalo de coleta do servidor em ticks — D-2.6-B: 6 ticks (0,3 s a 20 Hz)
 * ≈ 3,33 un/s, paridade com o ciclo atômico do cliente (3 s para 10).
 */
export const GATHER_INTERVAL_TICKS: number = 6;

/**
 * Distância de entrega ao Centro de Comando — D-2.6.3-A: 10 m nos dois lados
 * (valor validado no playtest; contato físico em 8,7 m dá 1,3 m de folga).
 */
export const DROPOFF_RANGE: number = 10;

/** Tempo da coleta atômica do cliente (playtestado na 1.7D). */
export const CLIENT_GATHER_TIME_SECONDS: number = 3;
