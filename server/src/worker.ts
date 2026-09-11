/**
 * worker.ts — Máquina de estados do trabalhador (Fase 2.5).
 *
 * IDLE → GOTO_RESOURCE → GATHER (timer) → GOTO_CC → DELIVER (+placar) → repeat.
 *
 * Desacoplado da Simulation via interface `WorkerWorld` (só tipos do
 * protocolo + física), para ser testável com fakes e evitar import
 * circular em runtime (este módulo NÃO importa simulation.ts).
 * `stepWorkers(world, tick)` é pura e determinística: mesma ordem
 * (ids crescentes), sem Math.random/Date.now.
 */

import type { EntityState, ResourceKind } from '@project-exodus/shared/protocol';
import {
  DROPOFF_RANGE,
  GATHER_INTERVAL_TICKS,
  GATHER_RANGE,
  GATHER_YIELD,
  WORKER_CARRY_CAPACITY,
} from '@project-exodus/shared/economy';
import { UNIT_STATS } from '@project-exodus/shared/units';

export {
  DROPOFF_RANGE,
  GATHER_INTERVAL_TICKS,
  GATHER_RANGE,
  GATHER_YIELD,
  WORKER_CARRY_CAPACITY,
};

/** Velocidade do trabalhador m/s — fonte única no shared. */
export const WORKER_SPEED: number = UNIT_STATS.SCAVENGER_WORKER.speed;

/** Subconjunto mutável do corpo da entidade que a FSM lê/escreve. */
export interface WorkerBody {
  id: string;
  type: string;
  owner: string;
  x: number;
  z: number;
  state: EntityState;
  targetNodeId: string | null;
  carryKind: ResourceKind | null;
  carryAmount: number;
  gatherTimer: number;
}

/** Capacidades do mundo que a FSM precisa (implementado pela Simulation). */
export interface WorkerWorld {
  /** Ids de trabalhadores em ordem crescente (determinístico). */
  workerIds(): string[];
  getBody(id: string): WorkerBody | undefined;
  /** Move o corpo ao longo do seu caminho por `dt` segundos. Retorna true se chegou. */
  advance(id: string, dt: number): boolean;
  /** (Re)planeja caminho do corpo até (x, z). */
  planTo(id: string, x: number, z: number): void;
  nodePosition(nodeId: string): { x: number; z: number; kind: ResourceKind } | undefined;
  nodeAmount(nodeId: string): number;
  takeFromNode(nodeId: string, wanted: number): number;
  dropPointOf(owner: string): { x: number; z: number };
  deposit(playerId: string, kind: ResourceKind, amount: number): void;
  emitDelivered(tick: number, playerId: string, workerId: string, resource: ResourceKind, amount: number): void;
  dist(ax: number, az: number, bx: number, bz: number): number;
}

/** Ordem de coleta: aponta p/ o nó e inicia GOTO_RESOURCE (sem efeito se nó inválido). */
export function orderGather(world: WorkerWorld, workerId: string, nodeId: string): boolean {
  const body: WorkerBody | undefined = world.getBody(workerId);
  const nodePos = world.nodePosition(nodeId);
  if (body === undefined || nodePos === undefined) return false;
  body.targetNodeId = nodeId;
  body.carryKind = nodePos.kind;
  body.carryAmount = 0;
  body.gatherTimer = 0;
  body.state = 'GOTO_RESOURCE';
  world.planTo(workerId, nodePos.x, nodePos.z);
  return true;
}

/** Um passo da FSM para um trabalhador. Puro/determinístico. */
export function stepWorker(world: WorkerWorld, workerId: string, tick: number, dt: number): void {
  const body: WorkerBody | undefined = world.getBody(workerId);
  if (body === undefined) return;

  switch (body.state) {
    case 'IDLE':
      return;

    case 'DELIVER': {
      // Depósito feito no tick anterior; retoma o loop no mesmo nó se há saldo.
      const nodeId: string | null = body.targetNodeId;
      if (nodeId !== null && world.nodeAmount(nodeId) > 0) {
        const pos = world.nodePosition(nodeId);
        if (pos !== undefined) {
          body.carryKind = pos.kind; // DELIVER zerou; sem isso a próxima entrega deposita 0
          body.state = 'GOTO_RESOURCE';
          world.planTo(workerId, pos.x, pos.z);
          return;
        }
      }
      body.state = 'IDLE';
      body.targetNodeId = null;
      return;
    }

    case 'GOTO_RESOURCE': {
      const nodeId: string | null = body.targetNodeId;
      if (nodeId === null) {
        body.state = 'IDLE';
        return;
      }
      const pos = world.nodePosition(nodeId);
      if (pos === undefined) {
        body.state = 'IDLE';
        body.targetNodeId = null;
        return;
      }
      const arrived: boolean = world.advance(workerId, dt);
      const d: number = world.dist(body.x, body.z, pos.x, pos.z);
      if (arrived || d <= GATHER_RANGE) {
        body.state = 'GATHER';
        body.gatherTimer = 0;
      }
      return;
    }

    case 'GATHER': {
      const nodeId: string | null = body.targetNodeId;
      if (nodeId === null) {
        body.state = 'IDLE';
        return;
      }
      // Nó esgotado: entrega o que tem ou para.
      if (world.nodeAmount(nodeId) <= 0) {
        if (body.carryAmount > 0) {
          const drop = world.dropPointOf(body.owner);
          body.state = 'GOTO_CC';
          world.planTo(workerId, drop.x, drop.z);
        } else {
          body.state = 'IDLE';
          body.targetNodeId = null;
        }
        return;
      }
      // Carga cheia: volta ao CC.
      if (body.carryAmount >= WORKER_CARRY_CAPACITY) {
        const drop = world.dropPointOf(body.owner);
        body.state = 'GOTO_CC';
        world.planTo(workerId, drop.x, drop.z);
        return;
      }
      body.gatherTimer += 1;
      if (body.gatherTimer >= GATHER_INTERVAL_TICKS) {
        body.gatherTimer = 0;
        const room: number = WORKER_CARRY_CAPACITY - body.carryAmount;
        const want: number = room < GATHER_YIELD ? room : GATHER_YIELD;
        body.carryAmount += world.takeFromNode(nodeId, want);
        if (body.carryAmount >= WORKER_CARRY_CAPACITY) {
          const drop = world.dropPointOf(body.owner);
          body.state = 'GOTO_CC';
          world.planTo(workerId, drop.x, drop.z);
        }
      }
      return;
    }

    case 'GOTO_CC': {
      const drop = world.dropPointOf(body.owner);
      const arrived: boolean = world.advance(workerId, dt);
      const d: number = world.dist(body.x, body.z, drop.x, drop.z);
      if (arrived || d <= DROPOFF_RANGE) {
        const kind: ResourceKind | null = body.carryKind;
        const amount: number = body.carryAmount;
        if (kind !== null && amount > 0) {
          world.deposit(body.owner, kind, amount);
          world.emitDelivered(tick, body.owner, body.id, kind, amount);
        }
        body.carryKind = null;
        body.carryAmount = 0;
        body.gatherTimer = 0;
        body.state = 'DELIVER';
      }
      return;
    }

    default:
      // MOVING/BUILDING/TRAINING/ATTACKING/DEAD: a FSM do trabalhador não atua.
      return;
  }
}

/**
 * Um passo da FSM para TODOS os trabalhadores (ids crescentes).
 * Pura e determinística.
 */
export function stepWorkers(world: WorkerWorld, tick: number, dt: number): void {
  const ids: string[] = world.workerIds();
  for (const id of ids) stepWorker(world, id, tick, dt);
}
