/**
 * broadcast.test.ts — CONTRATO CONGELADO da Fase 2.6.4 (escrito ANTES da implementação).
 *
 * Decisões amarradas:
 *   D-2.6.4-A → snapshot full JSON a 20 Hz, com medição de banda (gatilhos documentados)
 *   D-2.6-D   → gancho `viewFor(player)` estruturado como IDENTIDADE (filtragem na Fase 3)
 * Gate do spec 02 §5: "2 clientes recebem snapshots idênticos; viewFor validado como identidade".
 *
 * ESTE ARQUIVO NÃO DEVE SER ALTERADO APÓS A IMPLEMENTAÇÃO.
 * Roda com: node --loader ts-node/esm src/__tests__/broadcast.test.ts
 */
import assert from 'node:assert/strict';
import { deserializeMessage, serializeSnapshot, PROTOCOL_VERSION } from '@project-exodus/shared/protocol';
import { Simulation, TRAIN_TICKS } from '../simulation.js';
import { takeTickPayload, viewFor } from '../broadcast.js';

let n: number = 0;
function check(name: string, fn: () => void): void {
  fn();
  n += 1;
  console.log(`  ok ${n} - ${name}`);
}

console.log('[Test:Broadcast] payload por tick + viewFor identidade (2.6.4)');

function scenario(): Simulation {
  const sim = new Simulation(264);
  Simulation.createDefaultScenario(sim, 'p1');
  return sim;
}

check('payload base é SNAPSHOT v3 válido e medido em bytes', () => {
  const sim: Simulation = scenario();
  sim.step();
  const p = takeTickPayload(sim);
  const decoded = deserializeMessage(p.json);
  assert.equal(decoded.channel, 'SNAPSHOT');
  if (decoded.channel === 'SNAPSHOT') {
    assert.equal(decoded.snapshot.version, PROTOCOL_VERSION, 'versão do protocolo');
    assert.equal(decoded.snapshot.tick, p.tick, 'tick do payload == tick do snapshot');
    assert.ok(decoded.snapshot.entities.length >= 8, 'cenário padrão presente');
  }
  assert.ok(p.bytes > 0, `medição de bytes (${p.bytes})`);
});

check('viewFor é IDENTIDADE hoje (D-2.6-D, sem filtragem)', () => {
  const sim: Simulation = scenario();
  sim.step();
  const p = takeTickPayload(sim);
  const v = viewFor('player_1', p.snapshot);
  assert.deepEqual(v, p.snapshot, 'projeção idêntica ao snapshot base');
});

check('dois clientes recebem bytes IDÊNTICOS (gate do spec)', () => {
  const sim: Simulation = scenario();
  sim.step();
  const p = takeTickPayload(sim);
  const jsonA: string = serializeSnapshot(viewFor('client_1', p.snapshot));
  const jsonB: string = serializeSnapshot(viewFor('client_2', p.snapshot));
  assert.equal(jsonA, jsonB, 'bytes iguais entre viewers');
  assert.equal(jsonA, p.json, 'view == payload base serializado');
});

check('eventos entram exatamente UMA vez e chegam a todos os viewers', () => {
  const sim: Simulation = scenario();
  sim.deposit('p1', 'RACAO_AGUA', 100);
  assert.equal(
    sim.issueCommand({ kind: 'TRAIN', cmdId: 't1', playerId: 'p1', tick: 0, buildingId: 'bld_cc_1', unit: 'SCAVENGER_WORKER' }),
    true,
  );
  for (let i: number = 0; i < TRAIN_TICKS.SCAVENGER_WORKER; i++) sim.step();
  const p = takeTickPayload(sim);
  const ready = p.snapshot.events.filter((e) => e.kind === 'UNIT_READY');
  assert.equal(ready.length, 1, 'evento presente na base');
  assert.equal(viewFor('client_2', p.snapshot).events.length, 1, 'evento visível a outro viewer');
  const again = takeTickPayload(sim);
  assert.equal(again.snapshot.events.length, 0, 'evento NÃO duplicado no próximo tick');
});

check('medição é estável: mesmo estado → mesmo tamanho', () => {
  const a = scenario();
  const pa = takeTickPayload(a);
  const b = scenario();
  const pb = takeTickPayload(b);
  assert.equal(pa.bytes, pb.bytes, 'dois cenários idênticos → mesmo tamanho');
  assert.equal(Buffer.byteLength(pa.json, 'utf8'), pa.bytes, 'bytes medidos batem com o JSON');
});

check('determinismo: mesma seed + comandos → MESMOS bytes de broadcast', () => {
  const run = (): string => {
    const sim: Simulation = scenario();
    sim.issueCommand({ kind: 'MOVE', cmdId: 'c1', playerId: 'p1', tick: 0, entityIds: ['u_w1'], x: 0, z: -15 });
    for (let i: number = 0; i < 40; i++) sim.step();
    return takeTickPayload(sim).json;
  };
  assert.equal(run(), run());
});

console.log(`[Test:Broadcast] ${n} asserts OK`);
process.exit(0);
