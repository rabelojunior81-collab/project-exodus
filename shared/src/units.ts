/**
 * units.ts — Unidades e construções compartilhadas (Fase 2.6.1).
 *
 * Fonte única de tipos, stats e tabela de treino. O cliente valida o
 * game feel (playtest); o servidor adota os mesmos valores na 2.6.2
 * (decisões D-2.6-A/B em `docs/decisions/2026-09-10_fase-2.6-paridade.md`).
 */

/** Tipos de unidade — união canônica dos dois lados. */
export type UnitType =
  | 'SCAVENGER_WORKER'
  | 'RUST_RAIDER'
  | 'SCRAP_BUGGY'
  | 'MAINTENANCE_DRONE'
  | 'BIPED_MECH';

/** Tipos de construção. */
export type BuildingType = 'COMMAND_CENTER' | 'BUNKER_TURRET' | 'SCRAP_REFINERY';

export interface UnitStats {
  hp: number;
  /** Velocidade máxima em m/s. */
  speed: number;
  /** Raio físico de colisão (spec 03) — distinto do raio de clique. */
  collisionRadius: number;
}

/** Stats de gameplay (idênticos aos valores validados no cliente). */
export const UNIT_STATS: Record<UnitType, UnitStats> = {
  SCAVENGER_WORKER: { hp: 60, speed: 6.0, collisionRadius: 0.7 },
  RUST_RAIDER: { hp: 100, speed: 7.5, collisionRadius: 0.75 },
  SCRAP_BUGGY: { hp: 220, speed: 8.0, collisionRadius: 2.0 },
  MAINTENANCE_DRONE: { hp: 80, speed: 5.0, collisionRadius: 0.7 },
  BIPED_MECH: { hp: 300, speed: 5.5, collisionRadius: 1.6 },
};

export interface BuildingStats {
  hp: number;
  /** Raio de colisão (espelha o pathfinding do servidor desde a 2.3). */
  collisionRadius: number;
  /** Ticks de construção a 20 Hz (600 = 30 s). */
  buildTicks: number;
}

export const BUILDING_STATS: Record<BuildingType, BuildingStats> = {
  COMMAND_CENTER: { hp: 2200, collisionRadius: 8, buildTicks: 600 },
  SCRAP_REFINERY: { hp: 1400, collisionRadius: 6, buildTicks: 400 },
  BUNKER_TURRET: { hp: 850, collisionRadius: 4.5, buildTicks: 300 },
};

/**
 * Custo em recursos com as chaves do HUD do cliente
 * (rations ↔ RACAO_AGUA, chips ↔ CHIPS_IA). A correspondência para os
 * nomes do protocolo acontece na 2.6.2, quando o servidor cobra custo.
 */
export interface ResourceCost {
  rations: number;
  scrap: number;
  chips: number;
  concrete: number;
}

export interface TrainingSpec {
  cost: ResourceCost;
  /** Tempo de treino em segundos (decidido em D-2.6-A). */
  time: number;
}

/** Tabela canônica de treino — cliente aplica hoje; servidor adota na 2.6.2. */
export const TRAINING_SPECS: Record<UnitType, TrainingSpec> = {
  SCAVENGER_WORKER: {
    cost: { rations: 50, scrap: 0, chips: 0, concrete: 0 },
    time: 8,
  },
  RUST_RAIDER: {
    cost: { rations: 75, scrap: 25, chips: 0, concrete: 0 },
    time: 12,
  },
  SCRAP_BUGGY: {
    cost: { rations: 0, scrap: 150, chips: 25, concrete: 0 },
    time: 18,
  },
  BIPED_MECH: {
    cost: { rations: 0, scrap: 200, chips: 75, concrete: 0 },
    time: 24,
  },
  MAINTENANCE_DRONE: {
    cost: { rations: 60, scrap: 40, chips: 0, concrete: 0 },
    time: 16,
  },
};
