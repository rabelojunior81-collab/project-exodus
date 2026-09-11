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
} from '@project-exodus/shared/protocol';
import {
  BUILDING_STATS,
  TRAINING_SPECS,
  UNIT_STATS,
  costToResources,
  type ResourceCost,
} from '@project-exodus/shared/units';
import { POP_MAX, STARTING_RESOURCES } from '@project-exodus/shared/economy';
import { CollisionWorld, type CircleObstacle } from '@project-exodus/shared/collision';
import { NODE_COLLISION_RADIUS } from '@project-exodus/shared/world';
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
  orderGather,
  stepWorkers,
  type WorkerWorld,
} from './worker.js';
import { createRng, type Rng } from './rng.js';

/** Ticks por segundo do loop autoritativo. */
export const TICK_RATE: number = 20;
/** Delta fixo por tick (50ms). A lógica JAMAIS usa Date.now. */
export const TICK_DT: number = 1 / TICK_RATE;

/** HP/velocidade por unidade — fonte única no shared (Fase 2.6.1). */
export { UNIT_STATS };

/** HP por construção — fonte única no shared (Fase 2.6.1). */
export { BUILDING_STATS };

/** Raio de colisão dos veios — fonte única no shared/world (Fase 2.6.1). */
export { NODE_COLLISION_RADIUS };

/** Teto populacional global — fonte única no shared (2.6.2; D-2.6.2-B). */
export { POP_MAX };

/**
 * Raio de colisão (pathfinding) por construção — derivado do shared.
 * Deliberadamente MENOR que o selectionRadius visual do cliente
 * (CC 12.2 / refinaria 8.5 / bunker 6.5): colisão total bloquearia
 * quase todo o platô (raio 30).
 */
export const BUILDING_RADIUS: Record<BuildingType, number> = {
  COMMAND_CENTER: BUILDING_STATS.COMMAND_CENTER.collisionRadius,
  SCRAP_REFINERY: BUILDING_STATS.SCRAP_REFINERY.collisionRadius,
  BUNKER_TURRET: BUILDING_STATS.BUNKER_TURRET.collisionRadius,
};

/** Raio físico por unidade — derivado do shared (spec 03). */
export const UNIT_COLLISION_RADIUS: Record<UnitType, number> = {
  SCAVENGER_WORKER: UNIT_STATS.SCAVENGER_WORKER.collisionRadius,
  RUST_RAIDER: UNIT_STATS.RUST_RAIDER.collisionRadius,
  SCRAP_BUGGY: UNIT_STATS.SCRAP_BUGGY.collisionRadius,
  MAINTENANCE_DRONE: UNIT_STATS.MAINTENANCE_DRONE.collisionRadius,
  BIPED_MECH: UNIT_STATS.BIPED_MECH.collisionRadius,
};

/** Ticks de construção por tipo — derivado do shared (600 = 30 s a 20 Hz). */
export const BUILD_TICKS: Record<BuildingType, number> = {
  COMMAND_CENTER: BUILDING_STATS.COMMAND_CENTER.buildTicks,
  SCRAP_REFINERY: BUILDING_STATS.SCRAP_REFINERY.buildTicks,
  BUNKER_TURRET: BUILDING_STATS.BUNKER_TURRET.buildTicks,
};

/**
 * Ticks de treinamento DERIVADOS da tabela canônica do shared (2.6.2).
 * D-2.6-A: 8/12/18/16/24 s × 20 Hz = 160/240/360/320/480 ticks.
 * Não editar à mão: mude `TRAINING_SPECS` e tudo acompanha.
 */
export const TRAIN_TICKS: Record<UnitType, number> = {
  SCAVENGER_WORKER: Math.round(TRAINING_SPECS.SCAVENGER_WORKER.time * TICK_RATE),
  RUST_RAIDER: Math.round(TRAINING_SPECS.RUST_RAIDER.time * TICK_RATE),
  SCRAP_BUGGY: Math.round(TRAINING_SPECS.SCRAP_BUGGY.time * TICK_RATE),
  MAINTENANCE_DRONE: Math.round(TRAINING_SPECS.MAINTENANCE_DRONE.time * TICK_RATE),
  BIPED_MECH: Math.round(TRAINING_SPECS.BIPED_MECH.time * TICK_RATE),
};

/** Tamanho máximo da fila de treinamento por building. */
export const MAX_TRAIN_QUEUE: number = 5;

export interface TrainOrder {
  unit: UnitType;
  remaining: number;
  cmdId: string;
  /** Custo debitado no aceite — reembolsado integralmente no cancelamento. */
  cost: ResourceCost;
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
  /** Velocidade escalar atual (m/s) — física 2.6.3 (D-2.6-C). */
  velocity: number;
  /** Direção do movimento (rad; atan2(dx, dz)) — física 2.6.3. */
  heading: number;
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
  private readonly collision: CollisionWorld = new CollisionWorld();
  private readonly entities: Map<string, SimEntity> = new Map();
  private readonly nodes: Map<string, ResourceNode> = new Map();
  private readonly scores: ScoreTable = {};
  private readonly events: SimEvent[] = [];
  private trainSeq: number = 0;

  constructor(seed: number = 20260909) {
    this.rng = createRng(seed);
    for (const nd of createInitialResourceNodes()) this.nodes.set(nd.id, nd);
    this.rebuildObstacles();
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
      velocity: 0, heading: 0,
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
      velocity: 0, heading: 0,
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
        // Reenvio do MESMO job é idempotente (não debita duas vezes).
        if (b.trainQueue.some((j) => j.cmdId === cmd.cmdId)) return true;
        // Teto populacional global (D-2.6.2-B).
        if (this.populationOf(cmd.playerId) >= POP_MAX) return false;
        // Custos (2.6.2): fonte única em TRAINING_SPECS; chaves HUD → protocolo.
        const spec = TRAINING_SPECS[cmd.unit];
        if (!this.canAfford(cmd.playerId, spec.cost)) return false;
        this.debit(cmd.playerId, spec.cost);
        b.trainQueue.push({
          unit: cmd.unit,
          remaining: TRAIN_TICKS[cmd.unit],
          cmdId: cmd.cmdId,
          cost: spec.cost,
        });
        if (b.state === 'IDLE') b.state = 'TRAINING';
        return true;
      }
      case 'CANCEL_TRAIN': {
        const b: SimEntity | undefined = this.entities.get(cmd.buildingId);
        if (b === undefined || b.owner !== cmd.playerId || b.category !== 'BUILDING') return false;
        const idx: number = b.trainQueue.findIndex((j) => j.cmdId === cmd.jobCmdId);
        if (idx < 0) return false;
        const [job] = b.trainQueue.splice(idx, 1);
        // Reembolso integral (paridade com o cancelamento do cliente).
        this.refund(cmd.playerId, job.cost);
        if (b.trainQueue.length === 0 && b.state === 'TRAINING') b.state = 'IDLE';
        return true;
      }
      default:
        return false;
    }
  }

  // ------------------------------------------------- economia (2.6.2)

  /** Unidades vivas do jogador (teto populacional — D-2.6.2-B). */
  public populationOf(playerId: string): number {
    let count: number = 0;
    for (const e of this.entities.values()) {
      if (e.category === 'UNIT' && e.owner === playerId) count += 1;
    }
    return count;
  }

  /** true se o placar cobre o custo (chaves do HUD → recursos do protocolo). */
  private canAfford(playerId: string, cost: ResourceCost): boolean {
    const score: Record<ResourceKind, number> = this.scoreOf(playerId);
    const need: Record<ResourceKind, number> = costToResources(cost);
    for (const kind of Object.keys(need) as ResourceKind[]) {
      if (score[kind] < need[kind]) return false;
    }
    return true;
  }

  private debit(playerId: string, cost: ResourceCost): void {
    const score: Record<ResourceKind, number> = this.scoreOf(playerId);
    const amount: Record<ResourceKind, number> = costToResources(cost);
    for (const kind of Object.keys(amount) as ResourceKind[]) score[kind] -= amount[kind];
  }

  private refund(playerId: string, cost: ResourceCost): void {
    const score: Record<ResourceKind, number> = this.scoreOf(playerId);
    const amount: Record<ResourceKind, number> = costToResources(cost);
    for (const kind of Object.keys(amount) as ResourceKind[]) score[kind] += amount[kind];
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

  /**
   * Move ao longo do caminho por dt s, com física inercial (D-2.6-C):
   * UM alinhamento por tick (giro limitado por `rotationSpeed`), tração só
   * alinhado e aceleração limitada; o deslocamento do tick usa o orçamento
   * `velocity × dt` ao longo do heading (o blindado pesa, a infantaria não).
   * Retorna true quando o caminho terminou.
   */
  public advance(id: string, dt: number): boolean {
    const e: SimEntity | undefined = this.entities.get(id);
    if (e === undefined) return true;
    if (e.category !== 'UNIT') return e.pathIndex >= e.path.length;
    if (e.pathIndex >= e.path.length) return true;
    const stats = UNIT_STATS[e.type as UnitType];

    // 0) Pula waypoints degenerados (a célula de origem, p.ex.): sem isso a
    //    intenção zera a velocidade olhando para um ponto já alcançado.
    while (e.pathIndex < e.path.length) {
      const wp: Vec2 = e.path[e.pathIndex];
      if (Math.hypot(wp.x - e.x, wp.z - e.z) >= 1e-6) break;
      e.pathIndex += 1;
    }
    if (e.pathIndex >= e.path.length) {
      e.velocity = 0;
      return true;
    }

    // 1) Intenção do tick: alinhar ao waypoint atual + tração/aceleração.
    const wp0: Vec2 = e.path[e.pathIndex];
    const dx0: number = wp0.x - e.x;
    const dz0: number = wp0.z - e.z;
    if (Math.hypot(dx0, dz0) >= 1e-6) {
      const desired: number = Math.atan2(dx0, dz0);
      let diff: number = desired - e.heading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const maxTurn: number = stats.rotationSpeed * dt;
      e.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));
      const alignment: number = Math.cos(diff);
      const targetSpeed: number =
        stats.speed * Math.max(0, Math.min(1, (alignment - 0.2) / 0.8));
      const rate: number =
        (targetSpeed > e.velocity ? stats.acceleration : stats.acceleration * 1.6) * dt;
      e.velocity += Math.max(-rate, Math.min(rate, targetSpeed - e.velocity));
    } else {
      e.velocity = 0;
    }

    // 2) Consome o orçamento do tick (v×dt) ao longo do heading, encaixando waypoints.
    let budget: number = Math.max(0, e.velocity * dt);
    let guard: number = 0;
    while (budget > 1e-9 && e.pathIndex < e.path.length && guard < 64) {
      guard++;
      const wp: Vec2 = e.path[e.pathIndex];
      const dx: number = wp.x - e.x;
      const dz: number = wp.z - e.z;
      const d: number = Math.hypot(dx, dz);
      if (d < 1e-6) {
        e.pathIndex += 1;
        continue;
      }
      if (d <= budget) {
        e.x = wp.x;
        e.z = wp.z;
        e.pathIndex += 1;
        budget -= d;
        continue;
      }
      e.x += Math.sin(e.heading) * budget;
      e.z += Math.cos(e.heading) * budget;
      budget = 0;
    }

    e.x = clampToWorld(e.x);
    e.z = clampToWorld(e.z);
    // Fase 1.12.4: projeção pelo resolvedor ÚNICO do shared (cliente+servidor).
    this.projectOutOfObstacles(e);
    const arrived: boolean = e.pathIndex >= e.path.length;
    if (arrived) e.velocity = 0;
    return arrived;
  }

  /** Projeta a unidade para fora de obstáculos via `CollisionWorld` do shared. */
  private projectOutOfObstacles(e: SimEntity): void {
    if (e.category !== 'UNIT') return;
    const radius: number = UNIT_COLLISION_RADIUS[e.type as UnitType] ?? 1;
    const hit = this.collision.resolveMove(e.x, e.z, e.x, e.z, radius);
    e.x = hit.x;
    e.z = hit.z;
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
        velocity: e.velocity, heading: e.heading,
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
    const circles: CircleObstacle[] = [];
    for (const e of this.entities.values()) {
      if (e.category !== 'BUILDING') continue;
      const r: number = BUILDING_RADIUS[e.type as BuildingType] ?? 5;
      this.grid.addObstacle({ x: e.x, z: e.z, r });
      circles.push({ x: e.x, z: e.z, radius: r, kind: 'building', id: e.id });
    }
    for (const nd of this.nodes.values()) {
      circles.push({ x: nd.x, z: nd.z, radius: NODE_COLLISION_RADIUS, kind: 'node', id: nd.id });
    }
    this.collision.setObstacles(circles);
  }

  /** Cenário inicial padrão (espelha `client/src/main.ts`). */
  public static createDefaultScenario(sim: Simulation, playerId: string): void {
    // Tesouro inicial (paridade de modelo — 2.6.2): fonte única no shared.
    const treasury: Record<ResourceKind, number> = sim.scoreOf(playerId);
    for (const kind of Object.keys(STARTING_RESOURCES) as ResourceKind[]) {
      treasury[kind] = STARTING_RESOURCES[kind];
    }
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
