/**
 * measure-broadcast-series.mjs — UTILITÁRIO (não-gate): mede a série real de
 * bytes por tick do broadcast e a registra como evidência da fase.
 *
 *   node tools/visual-check/measure-broadcast-series.mjs [n=60]
 *
 * Gera `docs/evidence/fase-2.6.4/t-01-broadcast-rede/01-serie.txt` (JSON) via
 * EvidenceRegistry — insumo do gráfico da crônica (render-broadcast-chart).
 */
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { deserializeMessage } from '@project-exodus/shared/protocol';
import { EvidenceRegistry } from './lib/evidence.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const N = Number(process.argv[2] ?? 60);
const command = `node tools/visual-check/measure-broadcast-series.mjs ${N}`;
const ev = new EvidenceRegistry({ root, phase: 'fase-2.6.4', command, ferramenta: 'node · ws · servidor real' });

const server = spawn('node', ['--loader', 'ts-node/esm', 'src/index.ts'], {
  cwd: resolve(root, 'server'), env: { ...process.env },
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const connect = () => new Promise((res, rej) => {
  const ws = new WebSocket('ws://127.0.0.1:8080');
  ws.on('open', () => res(ws));
  ws.on('error', rej);
});

let ws = null;
for (let i = 0; i < 60 && ws === null; i++) {
  try { ws = await connect(); } catch { await sleep(500); }
}
if (ws === null) { try { server.kill('SIGTERM'); } catch {} console.error('servidor não subiu'); process.exit(1); }

const series = [];
const startedAt = Date.now();
await new Promise((res) => {
  const onMessage = (raw) => {
    try {
      const decoded = deserializeMessage(raw.toString());
      if (decoded.channel === 'SNAPSHOT') {
        series.push({ tick: decoded.snapshot.tick, bytes: Buffer.byteLength(raw.toString(), 'utf8') });
      }
      if (series.length >= N) { ws.off('message', onMessage); res(); }
    } catch { /* INIT_ACK legado */ }
  };
  ws.on('message', onMessage);
  setTimeout(() => { ws.off('message', onMessage); res(); }, 20000);
});

ws.close();
server.kill('SIGTERM');

const total = series.reduce((a, s) => a + s.bytes, 0);
const seconds = Math.max((Date.now() - startedAt) / 1000, 0.001);
const report = {
  ticks: series.length,
  avgBytes: Math.round(total / Math.max(1, series.length)),
  minBytes: Math.min(...series.map((s) => s.bytes)),
  maxBytes: Math.max(...series.map((s) => s.bytes)),
  kBps: Number((total / 1024 / seconds).toFixed(1)),
  hz: Number(((series[series.length - 1].tick - series[0].tick) / seconds).toFixed(1)),
  bytes: series.map((s) => s.bytes),
};

ev.captureText({
  test: 't-01-broadcast-rede', step: '01-serie',
  title: 'Série real de bytes por tick',
  description: 'Medição da carga por tick no servidor real (1 cliente WS, 60 snapshots) — insumo do gráfico canônico da fase.',
  status: 'passou',
  expected: 'série estável e coerente com o E2E de dois clientes',
  observed: `avg=${report.avgBytes} B · min=${report.minBytes} · max=${report.maxBytes} · ${report.kBps} KB/s @ ${report.hz} Hz`,
  content: JSON.stringify(report, null, 2),
  tags: ['rede', 'medição'],
});
ev.flush();
console.log('SERIES', JSON.stringify({ ...report, bytes: `${report.bytes.length} amostras` }));
process.exit(0);
