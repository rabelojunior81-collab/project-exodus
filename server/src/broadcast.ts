/**
 * broadcast.ts — Montagem e medição do broadcast por tick (Fase 2.6.4).
 *
 * Puro e determinístico: SEM Date.now / Math.random — o relógio real fica no
 * transporte (`index.ts`). O payload base é drenado UMA vez por tick e as
 * views são projeções puras (identidade hoje; filtragem na Fase 3).
 *
 * Decisões amarradas: D-2.6.4-A (full JSON 20 Hz, com medição) e D-2.6-D
 * (`viewFor(player)` como identidade — sem filtragem até a névoa autoritativa).
 */
import { serializeSnapshot, type Snapshot } from '@project-exodus/shared/protocol';
import type { Simulation } from './simulation.js';

export interface TickPayload {
  tick: number;
  snapshot: Snapshot;
  /** JSON do envelope SNAPSHOT (payload base do tick). */
  json: string;
  /** Tamanho em bytes UTF-8 do payload serializado (medição D-2.6.4-A). */
  bytes: number;
}

/** Drena o snapshot do tick e o serializa UMA vez (payload base). */
export function takeTickPayload(sim: Simulation): TickPayload {
  const snapshot: Snapshot = sim.takeSnapshot();
  const json: string = serializeSnapshot(snapshot);
  return { tick: snapshot.tick, snapshot, json, bytes: Buffer.byteLength(json, 'utf8') };
}

/**
 * Projeção por jogador — CONTRATO (D-2.6-D):
 *
 * - **HOJE (2.6.4)**: identidade — todos veem tudo; bytes idênticos entre
 *   viewers (gate do spec). O parâmetro existe para o contrato da Fase 3.
 * - **FASE 3**: filtrar `entities`/`events` pela visibilidade do jogador
 *   quando a névoa for autoritativa (anti-maphack). O SHAPE do snapshot
 *   não muda — só o conteúdo. Nenhum cliente precisará saber da mudança.
 */
export function viewFor(playerId: string, base: Snapshot): Snapshot {
  void playerId; // ainda sem filtragem — ver contrato acima
  return base;
}
