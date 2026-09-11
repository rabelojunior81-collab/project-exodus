/**
 * protocol.ts — Tipos do protocolo compartilhado (Fase 2.1; migrado para
 * `shared/` na Fase 2.6.1).
 *
 * Pronto para WebSocket (Fase 3): tudo serializa para JSON compacto com
 * versionamento explícito. O servidor é autoritativo; o cliente apenas
 * envia comandos e aplica snapshots/eventos.
 *
 * Tipos de entidade vivem em `./units.js`; recursos em `./economy.js` —
 * re-exportados aqui para os consumidores do protocolo.
 */
import { RESOURCE_KINDS, type ResourceKind } from './economy.js';
import type { BuildingType, UnitType } from './units.js';

export { RESOURCE_KINDS };
export type { ResourceKind, UnitType, BuildingType };

/** Versão atual do protocolo. Bump em mudanças incompatíveis. */
export const PROTOCOL_VERSION: number = 1;

/** Canais da mensagem (envelope). */
export type Channel = 'COMMAND' | 'SNAPSHOT' | 'EVENT';

/** Categoria da entidade. */
export type EntityCategory = 'UNIT' | 'BUILDING';

/**
 * Estado observável da entidade (inclui a FSM do trabalhador 2.5).
 * MOVING = deslocamento por ordem direta; demais GOTO_* = ordens de coleta.
 */
export type EntityState =
  | 'IDLE'
  | 'MOVING'
  | 'GOTO_RESOURCE'
  | 'GATHER'
  | 'GOTO_CC'
  | 'DELIVER'
  | 'BUILDING'
  | 'TRAINING'
  | 'ATTACKING'
  | 'DEAD';

// ---------------------------------------------------------------- comandos

interface BaseCommand {
  /** Id único do comando (dedupe/ack no futuro multiplayer). */
  cmdId: string;
  playerId: string;
  /** Tick do cliente quando emitiu (referência; autoridade é o tick do server). */
  tick: number;
}

/** Ordem de movimento: N entidades para um ponto (x, z) do mundo. */
export interface MoveCommand extends BaseCommand {
  kind: 'MOVE';
  entityIds: string[];
  x: number;
  z: number;
}

/** Ordem de coleta: N trabalhadores para um nó de recurso. */
export interface GatherCommand extends BaseCommand {
  kind: 'GATHER';
  entityIds: string[];
  nodeId: string;
}

/** Ordem de construção: trabalhador ergue building em (x, z). */
export interface BuildCommand extends BaseCommand {
  kind: 'BUILD';
  workerId: string;
  building: BuildingType;
  x: number;
  z: number;
}

/** Ordem de treinamento: building produz unidade (fila). */
export interface TrainCommand extends BaseCommand {
  kind: 'TRAIN';
  buildingId: string;
  unit: UnitType;
}

export type AnyCommand = MoveCommand | GatherCommand | BuildCommand | TrainCommand;

export type CommandKind = AnyCommand['kind'];

// --------------------------------------------------------------- snapshots

/** Estado observável de UMA entidade (id, tipo, x, z, hp, estado). */
export interface SnapshotEntity {
  id: string;
  type: UnitType | BuildingType;
  category: EntityCategory;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  state: EntityState;
  owner: string;
}

/** Placar: por jogador, por recurso. */
export type ScoreTable = Record<string, Record<ResourceKind, number>>;

/** Snapshot autoritativo de um tick (entidades ordenadas por id). */
export interface Snapshot {
  version: number;
  tick: number;
  entities: SnapshotEntity[];
  scores: ScoreTable;
  events: SimEvent[];
}

// ----------------------------------------------------------------- eventos

/** Recurso entregue no Centro de Comando (+ placar). */
export interface ResourceDeliveredEvent {
  kind: 'RESOURCE_DELIVERED';
  tick: number;
  playerId: string;
  workerId: string;
  resource: ResourceKind;
  amount: number;
}

/** Unidade pronta (fila de treinamento concluída). */
export interface UnitReadyEvent {
  kind: 'UNIT_READY';
  tick: number;
  playerId: string;
  buildingId: string;
  unitId: string;
  unit: UnitType;
}

export type SimEvent = ResourceDeliveredEvent | UnitReadyEvent;

// ------------------------------------------------------- serialize (saída)

export interface Envelope {
  version: number;
  channel: Channel;
  payload: unknown;
}

/** Serializa envelope versionado para JSON compacto. */
export function serializeMessage(channel: Channel, payload: unknown): string {
  const env: Envelope = { version: PROTOCOL_VERSION, channel, payload };
  return JSON.stringify(env);
}

/** Serializa um comando de jogador (cliente → servidor). */
export function serializeCommand(cmd: AnyCommand): string {
  return serializeMessage('COMMAND', cmd);
}

/** Serializa um snapshot autoritativo (servidor → clientes). */
export function serializeSnapshot(snap: Snapshot): string {
  return serializeMessage('SNAPSHOT', snap);
}

/** Serializa um evento avulso (servidor → clientes). */
export function serializeEvent(ev: SimEvent): string {
  return serializeMessage('EVENT', ev);
}

// ----------------------------------------------------- deserialize (entrada)

/** Erro de protocolo: JSON inválido, versão incompatível ou forma inválida. */
export class ProtocolError extends Error {
  constructor(message: string) {
    super(`[protocol] ${message}`);
    this.name = 'ProtocolError';
  }
}

export type DecodedMessage =
  | { channel: 'COMMAND'; command: AnyCommand }
  | { channel: 'SNAPSHOT'; snapshot: Snapshot }
  | { channel: 'EVENT'; event: SimEvent };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function assertCommandShape(cmd: object): asserts cmd is AnyCommand {
  const c: Record<string, unknown> = cmd as Record<string, unknown>;
  if (typeof c['kind'] !== 'string') throw new ProtocolError('comando sem kind');
  if (typeof c['cmdId'] !== 'string') throw new ProtocolError('comando sem cmdId');
  if (typeof c['playerId'] !== 'string') throw new ProtocolError('comando sem playerId');
  if (typeof c['tick'] !== 'number' || !Number.isInteger(c['tick'])) {
    throw new ProtocolError('comando com tick inválido (exige inteiro)');
  }
  switch (c['kind']) {
    case 'MOVE':
      if (!Array.isArray(c['entityIds']) || typeof c['x'] !== 'number' || typeof c['z'] !== 'number') {
        throw new ProtocolError('MOVE malformado');
      }
      return;
    case 'GATHER':
      if (!Array.isArray(c['entityIds']) || typeof c['nodeId'] !== 'string') {
        throw new ProtocolError('GATHER malformado');
      }
      return;
    case 'BUILD':
      if (typeof c['workerId'] !== 'string' || typeof c['building'] !== 'string'
        || typeof c['x'] !== 'number' || typeof c['z'] !== 'number') {
        throw new ProtocolError('BUILD malformado');
      }
      return;
    case 'TRAIN':
      if (typeof c['buildingId'] !== 'string' || typeof c['unit'] !== 'string') {
        throw new ProtocolError('TRAIN malformado');
      }
      return;
    default:
      throw new ProtocolError(`kind de comando desconhecido: ${String(c['kind'])}`);
  }
}

function assertSnapshotShape(s: object): asserts s is Snapshot {
  const r: Record<string, unknown> = s as Record<string, unknown>;
  if (typeof r['tick'] !== 'number' || !Number.isInteger(r['tick'])) {
    throw new ProtocolError('snapshot com tick inválido');
  }
  if (!Array.isArray(r['entities'])) throw new ProtocolError('snapshot sem entities');
  if (!isRecord(r['scores'])) throw new ProtocolError('snapshot sem scores');
  if (!Array.isArray(r['events'])) throw new ProtocolError('snapshot sem events');
}

function assertEventShape(e: object): asserts e is SimEvent {
  const r: Record<string, unknown> = e as Record<string, unknown>;
  if (r['kind'] !== 'RESOURCE_DELIVERED' && r['kind'] !== 'UNIT_READY') {
    throw new ProtocolError(`kind de evento desconhecido: ${String(r['kind'])}`);
  }
  if (typeof r['tick'] !== 'number' || !Number.isInteger(r['tick'])) {
    throw new ProtocolError('evento com tick inválido');
  }
}

/**
 * Desserializa uma mensagem JSON versionada.
 * Lança ProtocolError em: JSON inválido, versão incompatível,
 * canal desconhecido ou payload malformado.
 */
export function deserializeMessage(json: string): DecodedMessage {
  let env: unknown;
  try {
    env = JSON.parse(json);
  } catch {
    throw new ProtocolError('JSON inválido');
  }
  if (!isRecord(env)) throw new ProtocolError('envelope não é objeto');
  if (env['version'] !== PROTOCOL_VERSION) {
    throw new ProtocolError(
      `versão incompatível (recebido=${String(env['version'])}, esperado=${PROTOCOL_VERSION})`,
    );
  }
  const channel: unknown = env['channel'];
  const payload: unknown = env['payload'];
  if (!isRecord(payload)) throw new ProtocolError('payload não é objeto');

  if (channel === 'COMMAND') {
    assertCommandShape(payload);
    return { channel: 'COMMAND', command: payload };
  }
  if (channel === 'SNAPSHOT') {
    assertSnapshotShape(payload);
    return { channel: 'SNAPSHOT', snapshot: payload };
  }
  if (channel === 'EVENT') {
    assertEventShape(payload);
    return { channel: 'EVENT', event: payload };
  }
  throw new ProtocolError(`canal desconhecido: ${String(channel)}`);
}

/** Cria placar zerado para um jogador. */
export function emptyScore(): Record<ResourceKind, number> {
  return { RACAO_AGUA: 0, SUCATA: 0, CHIPS_IA: 0, CONCRETO: 0 };
}
