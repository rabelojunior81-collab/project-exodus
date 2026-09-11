/**
 * protocol.test.ts — Testes do protocolo versionado (Fase 2.1).
 * Roda com: node --loader ts-node/esm src/__tests__/protocol.test.ts
 */
import assert from 'node:assert/strict';
import {
  PROTOCOL_VERSION,
  ProtocolError,
  deserializeMessage,
  emptyScore,
  serializeCommand,
  serializeEvent,
  serializeSnapshot,
  type AnyCommand,
  type Snapshot,
} from '@project-exodus/shared/protocol';

let n: number = 0;
function check(name: string, fn: () => void): void {
  fn();
  n += 1;
  console.log(`  ok ${n} - ${name}`);
}

console.log('[Test:Protocol] tipos + serialize/deserialize versionado');

// Roundtrip dos 5 comandos (v2 inclui CANCEL_TRAIN)
const cmds: AnyCommand[] = [
  { kind: 'MOVE', cmdId: 'c1', playerId: 'p1', tick: 10, entityIds: ['u_w1'], x: 5, z: -3 },
  { kind: 'GATHER', cmdId: 'c2', playerId: 'p1', tick: 11, entityIds: ['u_w1'], nodeId: 'node_suc_1' },
  { kind: 'BUILD', cmdId: 'c3', playerId: 'p1', tick: 12, workerId: 'u_w1', building: 'BUNKER_TURRET', x: 20, z: 20 },
  { kind: 'TRAIN', cmdId: 'c4', playerId: 'p1', tick: 13, buildingId: 'bld_cc_1', unit: 'SCAVENGER_WORKER' },
  { kind: 'CANCEL_TRAIN', cmdId: 'c5', playerId: 'p1', tick: 14, buildingId: 'bld_cc_1', jobCmdId: 'c4' },
];
for (const cmd of cmds) {
  check(`roundtrip ${cmd.kind}`, () => {
    const decoded = deserializeMessage(serializeCommand(cmd));
    assert.equal(decoded.channel, 'COMMAND');
    if (decoded.channel === 'COMMAND') assert.deepEqual(decoded.command, cmd);
  });
}

// Snapshot com entidades (id, tipo, x, z, hp, estado)
check('roundtrip snapshot', () => {
  const snap: Snapshot = {
    version: PROTOCOL_VERSION,
    tick: 42,
    entities: [
      { id: 'u_w1', type: 'SCAVENGER_WORKER', category: 'UNIT', x: 1, z: 2, hp: 60, maxHp: 60, state: 'GATHER', owner: 'p1', velocity: 1.5, heading: 0.5 },
    ],
    scores: { p1: emptyScore() },
    events: [{ kind: 'RESOURCE_DELIVERED', tick: 42, playerId: 'p1', workerId: 'u_w1', resource: 'SUCATA', amount: 10 }],
  };
  const decoded = deserializeMessage(serializeSnapshot(snap));
  assert.equal(decoded.channel, 'SNAPSHOT');
  if (decoded.channel === 'SNAPSHOT') assert.deepEqual(decoded.snapshot, snap);
});

// Evento avulso (unidade pronta)
check('roundtrip evento UNIT_READY', () => {
  const decoded = deserializeMessage(serializeEvent({
    kind: 'UNIT_READY', tick: 7, playerId: 'p1', buildingId: 'b', unitId: 'u', unit: 'RUST_RAIDER',
  }));
  assert.equal(decoded.channel, 'EVENT');
});

// Versão incompatível rejeitada
check('versão incompatível lança ProtocolError', () => {
  const bad: string = JSON.stringify({ version: PROTOCOL_VERSION + 1, channel: 'EVENT', payload: { kind: 'UNIT_READY', tick: 1 } });
  assert.throws(() => deserializeMessage(bad), ProtocolError);
});

// JSON inválido / canal desconhecido / comando malformado
check('JSON inválido lança ProtocolError', () => {
  assert.throws(() => deserializeMessage('não é json'), ProtocolError);
});
check('canal desconhecido lança ProtocolError', () => {
  assert.throws(
    () => deserializeMessage(JSON.stringify({ version: PROTOCOL_VERSION, channel: 'NOPE', payload: {} })),
    ProtocolError,
  );
});
check('MOVE malformado lança ProtocolError', () => {
  const bad: string = JSON.stringify({
    version: PROTOCOL_VERSION, channel: 'COMMAND',
    payload: { kind: 'MOVE', cmdId: 'x', playerId: 'p', tick: 1 },
  });
  assert.throws(() => deserializeMessage(bad), ProtocolError);
});
check('tick não-inteiro rejeitado', () => {
  const bad: string = JSON.stringify({
    version: PROTOCOL_VERSION, channel: 'COMMAND',
    payload: { kind: 'MOVE', cmdId: 'x', playerId: 'p', tick: 1.5, entityIds: [], x: 0, z: 0 },
  });
  assert.throws(() => deserializeMessage(bad), ProtocolError);
});

// v2 (2.6.2): CANCEL_TRAIN sem jobCmdId é rejeitado
check('CANCEL_TRAIN malformado lança ProtocolError', () => {
  const bad: string = JSON.stringify({
    version: PROTOCOL_VERSION, channel: 'COMMAND',
    payload: { kind: 'CANCEL_TRAIN', cmdId: 'x', playerId: 'p', tick: 1, buildingId: 'b' },
  });
  assert.throws(() => deserializeMessage(bad), ProtocolError);
});

console.log(`[Test:Protocol] ${n} asserts OK`);
process.exit(0);
