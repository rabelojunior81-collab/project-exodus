/**
 * simulation.ts — Simulação autoritativa 20Hz (Fase 2.2).
 *
 * Determinismo rígido: tick inteiro, dt fixo de 50ms, iteração de
 * entidades em ordem crescente de id, RNG seedável (`rng.ts`) e
 * NENHUM Date.now / Math.random na lógica (apenas no transporte WS,
 * fora daqui). Duas instâncias com mesma seed + mesmos comandos
 * produzem snapshots idênticos.
 */

import {
  PROTOCOL_VERSION,
  emptyScore,
  type AnyCommand,
  type BuildingType,
  type EntityState,
  type ResourceKind,
  type ScoreTable,
  type SimEvent,
  type Snapshot,
  type SnapshotEntity,
  type UnitType,
} from './protocol.js';
import {
  SpatialGrid,
  clampToWorld,
  findPath,
  type Vec2,
} from './grid.js';
import {
  createInitialResourceNodes,
  harvestNode,
  type ResourceNode,
} from './resources.js';
import {
  WORKER_SPEED,
  orderGather,
  stepWorkers,
  type WorkerWorld,
} from './worker.js';
import { createRng, type Rng } from './rng.js';

/** Ticks por segundo do loop autoritativo. */
export const TICK_RATE: number = 20;
/** Delta fixo por tick (50ms). A lógica JAMAIS usa Date.now. */
export const TICK_DT: number = 1 / TICK_RATE;

/** HP/velocidade por unidade (espelha `client/src/entities/unit.ts`). */
export const UNIT_STATS: Record<UnitType, { hp: number; speed: number }> = {
  SCAVENGER_WORKER: { hp: 60, speed: WORKER_SPEED },
  RUST_RAIDER: { hp: 100, speed: 7.5 },
  SCRAP_BUGGY: { hp: 220, speed: 8.0 },
};

/** HP por construção (espelha `client/src/entities/building.ts`). */
export const BUILDING_STATS: Record<BuildingType, { hp: number }> = {
  COMMAND_CENTER: { hp: 2200 },
  BUNKER_TURRET: { hp: 850 },
  SCRAP_REFINERY: { hp: 1400 },
};

/**
 * Raio de colisão (pathfinding) por construção. Deliberadamente MENOR
 * que o selectionRadius visual do cliente (CC 12.2 / refinaria 8.5 /
 * bunker 6.5): colisão total bloquearia quase todo o platô (raio 30).
 */
export const BUILDING_RADIUS: Record<BuildingType, number> = {
  COMMAND_CENTER: 8,
  SCRAP_REFINERY: 6,
  BUNKER_TURRET: 4.5,
};

/** Ticks de construção por tipo (20Hz: 600 = 30s). */
export const BUILD_TICKS: Record<BuildingType, number> = {
  COMMAND_CENTER: 600,
  SCRAP_REFINERY: 400,
  BUNKER_TURRET: 300,
};

/** Ticks de treinamento por unidade (20Hz: 100 = 5s). */
export const TRAIN_TICKS: Record<UnitType, number> = {
  SCAVENGER_WORKER: 100,
  RUST_RAIDER: 120,
  SCRAP_BUGGY: 200,
};

/** Tamanho máximo da fila de treinamento por building. */
export const MAX_TRAIN_QUEUE: number = 5;

export interface TrainOrder {
  unit: UnitType;
  remaining: number;
  cmdId: string;
}

/** Entidade viva da simulação (unidade ou construção). */
export interface SimEntity {
  id: string;
  category: 'UNIT' | 'BUILDING';
  type: UnitType | BuildingType;
  owner: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  state: EntityState;
  speed: number;
  path: Vec2[];
  pathIndex: number;
  // FSM do trabalhador (2.5)
  targetNodeId: string | null;
  carryKind: ResourceKind | null;
  carryAmount: number;
  gatherTimer: number;
  // Construção / treinamento
  buildRemaining: number;
  builderId: string | null;
  trainQueue: TrainOrder[];
}

// ---------------------------------------------------------------------------

export class Simulation implements WorkerWorld {
  private tick: number = 0;
  private readonly rng: Rng;
  private readonly grid: SpatialGrid = new SpatialGrid();
  private readonly entities: Map<string, SimEntity> = new Map();
  private readonly nodes: Map<string, ResourceNode> = new Map();
  private readonly scores: ScoreTable = {};
  private readonly events: SimEvent[] = [];
  private trainSeq: number = 0;

  constructor(seed: number = 20260909) {
    this.rng = createRng(seed);
    for (const nd of createInitialResourceNodes()) this.nodes.set(nd.id, nd);
  }

  // ------------------------------------------------------------ relógio

  public getTick(): number {
    return this.tick;
  }

  /** Avança EXATAMENTE um tick (dt fixo). Sem Date.now aqui. */
  public step(): void {
    this.tick += 1;
    const ids: string[] = [...this.entities.keys()].sort();

    // 1) Construções em obra + filas de treinamento (ordem de id).
    for (const id of ids) {
      const e: SimEntity | undefined = this.entities.get(id);
      if (e === undefined) continue;
      if (e.category === 'BUILDING' && e.buildRemaining > 0) {
        e.buildRemaining -= 1;
        if (e.buildRemaining <= 0) {
          e.buildRemaining = 0;
          e.state = e.trainQueue.length > 0 ? 'TRAINING' : 'IDLE';
          this.releaseBuilder(e);
        }
      } else if (e.category === 'BUILDING' && e.trainQueue.length > 0 && e.buildRemaining <= 0) {
        const head: TrainOrder = e.trainQueue[0];
        head.remaining -= 1;
        e.state = 'TRAINING';
        if (head.remaining <= 0) {
          e.trainQueue.shift();
          this.completeTrain(e, head);
          if (e.trainQueue.length === 0 && e.state === 'TRAINING') e.state = 'IDLE';
        }
      }
    }

    // 2) Movimento por ordem direta (MOVING), em ordem de id.
    for (const id of ids) {
      const e: SimEntity | undefined = this.entities.get(id);
      if (e === undefined || e.state !== 'MOVING') continue;
      if (this.advance(id, TICK_DT)) e.state = 'IDLE';
    }

    // 3) FSM dos trabalhadores (ordem crescente — ver worker.ts).
    stepWorkers(this, this.tick, TICK_DT);
  }

  // ---------------------------------------------------------- entidades

  public spawnUnit(owner: string, id: string, unit: UnitType, x: number, z: number): SimEntity {
    const stats = UNIT_STATS[unit];
    const e: SimEntity = {
      id, category: 'UNIT', type: unit, owner,
      x: clampToWorld(x), z: clampToWorld(z),
      hp: stats.hp, maxHp: stats.hp, state: 'IDLE', speed: stats.speed,
      path: [], pathIndex: 0,
      targetNodeId: null, carryKind: null, carryAmount: 0, gatherTimer: 0,
      buildRemaining: 0, builderId: null, trainQueue: [],
    };
    this.entities.set(id, e);
    return e;
  }

  public spawnBuilding(
    owner: string, id: string, building: BuildingType, x: number, z: number, instant: boolean = true,
  ): SimEntity {
    const stats = BUILDING_STATS[building];
    const e: SimEntity = {
      id, category: 'BUILDING', type: building, owner,
      x: clampToWorld(x), z: clampToWorld(z),
      hp: stats.hp, maxHp: stats.hp,
      state: instant ? 'IDLE' : 'BUILDING', speed: 0,
      path: [], pathIndex: 0,
      targetNodeId: null, carryKind: null, carryAmount: 0, gatherTimer: 0,
      buildRemaining: instant ? 0 : BUILD_TICKS[building],
      builderId: null, trainQueue: [],
    };
    this.entities.set(id, e);
    this.rebuildObstacles();
    return e;
  }

  /** Remove entidade (ex.: destruída). Retorna true se existia. */
  public removeEntity(id: string): boolean {
    const e: SimEntity | undefined = this.entities.get(id);
    if (e === undefined) return false;
    this.entities.delete(id);
    if (e.category === 'BUILDING') this.rebuildObstacles();
    return true;
  }

  public getEntity(id: string): SimEntity | undefined {
    return this.entities.get(id);
  }

  public hasEntity(id: string): boolean {
    return this.entities.has(id);
  }

  public entityCount(): number {
    return this.entities.size;
  }

  public entityIds(): string[] {
    return [...this.entities.keys()].sort();
  }

  // ---------------------------------------------------------- comandos

  /**
   * Aplica um comando de jogador no tick atual. Retorna false se o
   * comando foi ignorado (alvo inexistente / fila cheia / tipo errado).
   * Ids derivados de cmdId tornam reenvios idempotentes.
   */
  public issueCommand(cmd: AnyCommand): boolean {
    switch (cmd.kind) {
      case 'MOVE': {
        let ok: boolean = false;
        for (const id of cmd.entityIds) {
          const e: SimEntity | undefined = this.entities.get(id);
          if (e === undefined || e.owner !== cmd.playerId || e.category !== 'UNIT') continue;
          if (e.type === 'SCAVENGER_WORKER') {
            e.targetNodeId = null;
            e.carryKind = null;
            e.carryAmount = 0;
            e.gatherTimer = 0;
          }
          e.state = 'MOVING';
          this.planTo(id, cmd.x, cmd.z);
          ok = true;
        }
        return ok;
      }
      case 'GATHER': {
        let ok: boolean = false;
        if (!this.nodes.has(cmd.nodeId)) return false;
        for (const id of cmd.entityIds) {
          const e: SimEntity | undefined = this.entities.get(id);
          if (e === undefined || e.owner !== cmd.playerId || e.type !== 'SCAVENGER_WORKER') continue;
          if (orderGather(this, id, cmd.nodeId)) ok = true;
        }
        return ok;
      }
      case 'BUILD': {
        const worker: SimEntity | undefined = this.entities.get(cmd.workerId);
        if (worker === undefined || worker.owner !== cmd.playerId) return false;
        if (worker.type !== 'SCAVENGER_WORKER') return false;
        const id: string = `bld_${cmd.cmdId}`;
        if (this.entities.has(id)) return true; // reenvio idempotente
        const site: SimEntity = this.spawnBuilding(cmd.playerId, id, cmd.building, cmd.x, cmd.z, false);
        site.builderId = worker.id;
        worker.state = 'BUILDING';
        worker.targetNodeId = null;
        this.planTo(worker.id, cmd.x, cmd.z);
        return true;
      }
      case 'TRAIN': {
        const b: SimEntity | undefined = this.entities.get(cmd.buildingId);
        if (b === undefined || b.owner !== cmd.playerId || b.category !== 'BUILDING') return false;
        if (b.buildRemaining > 0) return false; // em obra
        if (b.trainQueue.length >= MAX_TRAIN_QUEUE) return false;
        b.trainQueue.push({ unit: cmd.unit, remaining: TRAIN_TICKS[cmd.unit], cmdId: cmd.cmdId });
        if (b.state === 'IDLE') b.state = 'TRAINING';
        return true;
      }
      default:
        return false;
    }
  }

  // ------------------------------------------------- WorkerWorld (2.5)

  public workerIds(): string[] {
    const ids: string[] = [];
    for (const [id, e] of this.entities) {
      if (e.type === 'SCAVENGER_WORKER') ids.push(id);
    }
    ids.sort();
    return ids;
  }

  public getBody(id: string): SimEntity | undefined {
    return this.entities.get(id);
  }

  /** Move ao longo do caminho por dt s. Retorna true se chegou (sem caminho restante). */
  public advance(id: string, dt: number): boolean {
    const e: SimEntity | undefined = this.entities.get(id);
    if (e === undefined) return true;
    let remaining: number = e.speed * dt;
    let guard: number = 0;
    while (remaining > 1e-9 && e.pathIndex < e.path.length && guard < 64) {
      guard++;
      const wp: Vec2 = e.path[e.pathIndex];
      const dx: number = wp.x - e.x;
      const dz: number = wp.z - e.z;
      const d: number = Math.hypot(dx, dz);
      if (d <= remaining) {
        e.x = wp.x;
        e.z = wp.z;
        e.pathIndex += 1;
        remaining -= d;
      } else {
        e.x += (dx / d) * remaining;
        e.z += (dz / d) * remaining;
        remaining = 0;
      }
    }
    e.x = clampToWorld(e.x);
    e.z = clampToWorld(e.z);
    return e.pathIndex >= e.path.length;
  }

  public planTo(id: string, x: number, z: number): void {
    const e: SimEntity | undefined = this.entities.get(id);
    if (e === undefined) return;
    const path: Vec2[] | null = findPath(
      this.grid, { x: e.x, z: e.z }, { x: clampToWorld(x), z: clampToWorld(z) }, { agentRadius: 1 },
    );
    e.path = path ?? [];
    e.pathIndex = 0;
  }

  public nodePosition(nodeId: string): { x: number; z: number; kind: ResourceKind } | undefined {
    const nd: ResourceNode | undefined = this.nodes.get(nodeId);
    if (nd === undefined) return undefined;
    return { x: nd.x, z: nd.z, kind: nd.kind };
  }

  public nodeAmount(nodeId: string): number {
    return this.nodes.get(nodeId)?.amount ?? 0;
  }

  public takeFromNode(nodeId: string, wanted: number): number {
    const nd: ResourceNode | undefined = this.nodes.get(nodeId);
    if (nd === undefined) return 0;
    return harvestNode(nd, wanted);
  }

  public dropPointOf(owner: string): { x: number; z: number } {
    for (const id of this.entityIds()) {
      const e: SimEntity | undefined = this.entities.get(id);
      if (e !== undefined && e.owner === owner && e.type === 'COMMAND_CENTER') {
        return { x: e.x, z: e.z };
      }
    }
    return { x: 0, z: -2 }; // fallback = spawn padrão do CC
  }

  public deposit(playerId: string, kind: ResourceKind, amount: number): void {
    this.scoreOf(playerId)[kind] += amount;
  }

  public emitDelivered(
    tick: number, playerId: string, workerId: string, resource: ResourceKind, amount: number,
  ): void {
    this.events.push({ kind: 'RESOURCE_DELIVERED', tick, playerId, workerId, resource, amount });
  }

  public dist(ax: number, az: number, bx: number, bz: number): number {
    return Math.hypot(ax - bx, az - bz);
  }

  // ------------------------------------------------------- observações

  public scoreOf(playerId: string): Record<ResourceKind, number> {
    let s: Record<ResourceKind, number> | undefined = this.scores[playerId];
    if (s === undefined) {
      s = emptyScore();
      this.scores[playerId] = s;
    }
    return s;
  }

  public peekEvents(): SimEvent[] {
    return [...this.events];
  }

  /** Snapshot autoritativo do tick atual; drena a fila de eventos. */
  public takeSnapshot(): Snapshot {
    const entities: SnapshotEntity[] = this.entityIds().map((id): SnapshotEntity => {
      const e: SimEntity = this.entities.get(id) as SimEntity;
      return {
        id: e.id, type: e.type, category: e.category,
        x: e.x, z: e.z, hp: e.hp, maxHp: e.maxHp, state: e.state, owner: e.owner,
      };
    });
    const scores: ScoreTable = {};
    for (const player of Object.keys(this.scores).sort()) {
      scores[player] = { ...this.scores[player] };
    }
    const events: SimEvent[] = this.events.splice(0, this.events.length);
    return { version: PROTOCOL_VERSION, tick: this.tick, entities, scores, events };
  }

  // ------------------------------------------------------------ interno

  private releaseBuilder(site: SimEntity): void {
    if (site.builderId === null) return;
    const w: SimEntity | undefined = this.entities.get(site.builderId);
    if (w !== undefined && w.state === 'BUILDING') w.state = 'IDLE';
    site.builderId = null;
  }

  private completeTrain(b: SimEntity, order: TrainOrder): void {
    this.trainSeq += 1;
    const unitId: string = `u_tr${this.trainSeq}_${order.cmdId}`;
    // Rally: anel determinístico via rng seedável ao redor do building.
    const angle: number = this.rng() * Math.PI * 2;
    const radius: number = (BUILDING_RADIUS[b.type as BuildingType] ?? 6) + 3;
    const x: number = clampToWorld(b.x + Math.cos(angle) * radius);
    const z: number = clampToWorld(b.z + Math.sin(angle) * radius);
    this.spawnUnit(b.owner, unitId, order.unit, x, z);
    this.events.push({
      kind: 'UNIT_READY', tick: this.tick, playerId: b.owner,
      buildingId: b.id, unitId, unit: order.unit,
    });
  }

  private rebuildObstacles(): void {
    this.grid.clearObstacles();
    for (const e of this.entities.values()) {
      if (e.category !== 'BUILDING') continue;
      this.grid.addObstacle({ x: e.x, z: e.z, r: BUILDING_RADIUS[e.type as BuildingType] ?? 5 });
    }
  }

  /** Cenário inicial padrão (espelha `client/src/main.ts`). */
  public static createDefaultScenario(sim: Simulation, playerId: string): void {
    sim.spawnBuilding(playerId, 'bld_cc_1', 'COMMAND_CENTER', 0, -2);
    sim.spawnBuilding(playerId, 'bld_ref_1', 'SCRAP_REFINERY', -16, 2);
    sim.spawnBuilding(playerId, 'bld_tur_1', 'BUNKER_TURRET', 16, 2);
    sim.spawnUnit(playerId, 'u_w1', 'SCAVENGER_WORKER', -6, 8);
    sim.spawnUnit(playerId, 'u_w2', 'SCAVENGER_WORKER', -3, 9);
    sim.spawnUnit(playerId, 'u_w3', 'SCAVENGER_WORKER', 0, 9);
    sim.spawnUnit(playerId, 'u_s1', 'RUST_RAIDER', 6, 8);
    sim.spawnUnit(playerId, 'u_s2', 'RUST_RAIDER', 9, 8);
  }
}
