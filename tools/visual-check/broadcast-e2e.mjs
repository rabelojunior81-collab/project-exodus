/**
 * broadcast-e2e.mjs — CONTRATO CONGELADO da Fase 2.6.4 (lado rede).
 *
 * Sobe o servidor REAL, conecta DOIS clientes WebSocket e prova, no mundo real:
 *   - snapshots chegam a 20 Hz com envelope v3 válido;
 *   - os dois clientes recebem bytes IDÊNTICOS por tick (gate do spec);
 *   - a banda é medida (KB/s, bytes/tick) — D-2.6.4-A.
 *
 *   node tools/visual-check/broadcast-e2e.mjs
 * ESTE ARQUIVO NÃO DEVE SER ALTERADO APÓS A IMPLEMENTAÇÃO.
 */
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { deserializeMessage, PROTOCOL_VERSION } from '@project-exodus/shared/protocol';
import { EvidenceRegistry } from './lib/evidence.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SNAPSHOTS_PER_CLIENT = 60;
const command = 'node tools/visual-check/broadcast-e2e.mjs';
const ev = new EvidenceRegistry({ root, phase: 'fase-2.6.4', command, ferramenta: 'node · ws · servidor real' });

const server = spawn('node', ['--loader', 'ts-node/esm', 'src/index.ts'], {
  cwd: resolve(root, 'server'),
  env: { ...process.env },
});
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d.toString(); });
server.stderr.on('data', (d) => { serverLog += d.toString(); });
let serverExited = false;
server.on('close', () => { serverExited = true; });

function fail(message, observed) {
  ev.captureText({
    test: 't-00-broadcast-rede', step: '01-e2e', title: 'Broadcast E2E (2 clientes)',
    description: 'Servidor real + dois clientes WS coletando snapshots por tick, comparando bytes e medindo banda.',
    status: 'falhou', expected: `${SNAPSHOTS_PER_CLIENT} snapshots idênticos por cliente, v${PROTOCOL_VERSION}`,
    observed: `${message} · ${observed ?? ''}`.trim(), content: serverLog, tags: ['rede', 'falhou'],
  });
  ev.flush();
  try { server.kill('SIGTERM'); } catch { /* já morreu */ }
  console.error(`FALHA: ${message}`);
  process.exit(1);
}

function connect() {
  return new Promise((res, rej) => {
    const ws = new WebSocket('ws://127.0.0.1:8080');
    ws.on('open', () => res(ws));
    ws.on('error', rej);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- espera o servidor subir (probe reutilizado como cliente A) ---
let clientA = null;
for (let i = 0; i < 60; i++) {
  if (serverExited) fail('servidor encerrou ao subir (porta ocupada?)', serverLog.slice(-200));
  try { clientA = await connect(); break; } catch { await sleep(500); }
}
if (clientA === null) fail('servidor não aceitou conexão em 30s');

const clientB = await connect();

const collect = (ws) => new Promise((res) => {
  const snapshots = [];
  const onMessage = (raw) => {
    try {
      const decoded = deserializeMessage(raw.toString());
      if (decoded.channel === 'SNAPSHOT') {
        snapshots.push({ tick: decoded.snapshot.tick, version: decoded.snapshot.version, json: raw.toString() });
      }
      if (snapshots.length >= SNAPSHOTS_PER_CLIENT) {
        ws.off('message', onMessage);
        res({ snapshots, elapsedMs: Date.now() - startedAt });
      }
    } catch {
      // INIT_ACK legado e mensagens fora do envelope são ignorados
    }
  };
  const startedAt = Date.now();
  ws.on('message', onMessage);
  setTimeout(() => {
    ws.off('message', onMessage);
    res({ snapshots, elapsedMs: Date.now() - startedAt, timedOut: true });
  }, 20000);
});

const [resA, resB] = await Promise.all([collect(clientA), collect(clientB)]);

if (resA.timedOut || resB.timedOut) {
  fail('timeout aguardando snapshots (broadcast ausente?)', `A=${resA.snapshots.length} B=${resB.snapshots.length}`);
}
if (resA.snapshots.length !== SNAPSHOTS_PER_CLIENT || resB.snapshots.length !== SNAPSHOTS_PER_CLIENT) {
  fail('contagem de snapshots divergente', `A=${resA.snapshots.length} B=${resB.snapshots.length}`);
}

let mismatches = 0;
for (let i = 0; i < SNAPSHOTS_PER_CLIENT; i++) {
  if (resA.snapshots[i].json !== resB.snapshots[i].json) mismatches += 1;
  if (resA.snapshots[i].version !== PROTOCOL_VERSION) {
    fail('versão de protocolo errada no snapshot', `v=${resA.snapshots[i].version}`);
  }
}
const ticksA = resA.snapshots.map((s) => s.tick);
const monotonic = ticksA.every((t, i) => i === 0 || t > ticksA[i - 1]);
const totalBytes = resA.snapshots.reduce((acc, s) => acc + Buffer.byteLength(s.json, 'utf8'), 0);
const avgBytes = Math.round(totalBytes / SNAPSHOTS_PER_CLIENT);
const seconds = Math.max(resA.elapsedMs / 1000, 0.001);
const kBps = (totalBytes / 1024 / seconds).toFixed(1);
const tickSpan = ticksA[ticksA.length - 1] - ticksA[0];
const hz = (tickSpan / seconds).toFixed(1);

const reports = { snapshotsEach: SNAPSHOTS_PER_CLIENT, mismatches, monotonic, avgPayloadBytes: avgBytes, kBps: Number(kBps), hzMeasured: Number(hz) };

ev.captureText({
  test: 't-00-broadcast-rede', step: '01-e2e', title: 'Broadcast E2E (2 clientes)',
  description: 'Servidor real + dois clientes WS coletando snapshots por tick, comparando bytes e medindo banda.',
  status: mismatches === 0 && monotonic ? 'passou' : 'falhou',
  expected: `${SNAPSHOTS_PER_CLIENT} snapshots idênticos por cliente, v${PROTOCOL_VERSION}, ticks monotônicos`,
  observed: JSON.stringify(reports),
  content: `# server log\n${serverLog}\n\n# relatório\n${JSON.stringify(reports, null, 2)}`,
  tags: ['rede', 'banda', mismatches === 0 ? 'verde' : 'vermelho'],
});
ev.flush();

clientA.close();
clientB.close();
server.kill('SIGTERM');

console.log('BROADCAST-E2E', JSON.stringify(reports));

if (mismatches !== 0) { console.error(`FALHA: ${mismatches} ticks com bytes divergentes`); process.exit(1); }
if (!monotonic) { console.error('FALHA: ticks não monotônicos'); process.exit(1); }
console.log('[broadcast-e2e] OK — dois clientes, mesmos bytes, banda medida.');
process.exit(0);
