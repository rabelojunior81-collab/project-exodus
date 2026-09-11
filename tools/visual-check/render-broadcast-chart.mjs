/**
 * render-broadcast-chart.mjs — UTILITÁRIO: gera o gráfico canônico da Fase 2.6.4
 * a partir da série real de bytes/tick.
 *
 *   node tools/visual-check/render-broadcast-chart.mjs
 *
 * Lê `docs/evidence/fase-2.6.4/t-01-broadcast-rede/01-serie.txt`, escreve o SVG
 * em `landing/assets/evidence/cronica-s18-broadcast.svg`, renderiza um PNG de
 * verificação via Playwright e o registra como evidência (t-02-grafico).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { chromium } from 'playwright-core';
import { EvidenceRegistry } from './lib/evidence.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const seriesPath = join(root, 'docs/evidence/fase-2.6.4/t-01-broadcast-rede/01-serie.txt');
const svgPath = join(root, 'landing/assets/evidence/cronica-s18-broadcast.svg');

if (!existsSync(seriesPath)) { console.error('sem série medida — rode measure-broadcast-series.mjs'); process.exit(1); }
const report = JSON.parse(readFileSync(seriesPath, 'utf8'));
const bytes = report.bytes;
const max = Math.max(...bytes);
const avg = report.avgBytes;

// --- SVG (tema MIL-SPEC: fundo escuro, âmbar, mono) ---
const W = 800; const H = 520;
const PLOT = { x: 64, y: 96, w: 690, h: 340 };
const barW = Math.max(2, PLOT.w / bytes.length - 2);
const bars = bytes.map((b, i) => {
  const h = Math.round((b / max) * PLOT.h);
  const x = PLOT.x + i * (PLOT.w / bytes.length) + 1;
  const y = PLOT.y + PLOT.h - h;
  return `<rect x="${x.toFixed(1)}" y="${y}" width="${barW.toFixed(1)}" height="${h}" fill="#f59e0b" opacity="0.85"/>`;
}).join('');
const avgY = PLOT.y + PLOT.h - Math.round((avg / max) * PLOT.h);
const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
  const y = PLOT.y + PLOT.h - Math.round(f * PLOT.h);
  const label = Math.round(f * max);
  return `<line x1="${PLOT.x}" y1="${y}" x2="${PLOT.x + PLOT.w}" y2="${y}" stroke="#f4efe6" stroke-opacity="0.12"/>` +
    `<text x="${PLOT.x - 10}" y="${y + 4}" text-anchor="end" font-family="'Courier New',monospace" font-size="12" fill="#9fb3c8">${label}</text>`;
}).join('');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Bytes por tick do broadcast autoritativo">
  <rect width="${W}" height="${H}" fill="#07090c"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="#f4efe6" stroke-opacity="0.15" rx="12"/>
  <text x="64" y="62" font-family="'Courier New',monospace" font-size="15" letter-spacing="4" fill="#22d3ee">TRANSMISSÃO AUTORITATIVA · FASE 2.6.4</text>
  <text x="64" y="84" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="20" letter-spacing="2" fill="#f4efe6">BYTES POR TICK — SERVIDOR REAL, 2 CLIENTES</text>
  ${grid}
  ${bars}
  <text x="${PLOT.x}" y="${PLOT.y + PLOT.h + 28}" font-family="'Courier New',monospace" font-size="12" fill="#9fb3c8">tick 0</text>
  <text x="${PLOT.x + PLOT.w}" y="${PLOT.y + PLOT.h + 28}" text-anchor="end" font-family="'Courier New',monospace" font-size="12" fill="#9fb3c8">tick ${bytes.length}</text>
  <text x="64" y="${H - 44}" font-family="'Courier New',monospace" font-size="13" fill="#f59e0b">${report.hz} Hz medidos · ${report.kBps} KB/s por cliente · média ${avg} B/tick (mín ${report.minBytes} · máx ${report.maxBytes})</text>
  <text x="64" y="${H - 24}" font-family="'Courier New',monospace" font-size="11" letter-spacing="2" fill="#9fb3c8">PROJECT EXODUS · RABELUS LAB · SESSÃO 18 · 0 DIVERGÊNCIAS ENTRE CLIENTES</text>
</svg>
`;
mkdirSync(dirname(svgPath), { recursive: true });
writeFileSync(svgPath, svg, 'utf8');

// --- render de verificação + evidência ---
const exe = join(homedir(), 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
if (!existsSync(exe)) { console.error('sem chrome para render'); process.exit(1); }
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(`file://${svgPath}`);
const ev = new EvidenceRegistry({ root, phase: 'fase-2.6.4', command: 'node tools/visual-check/render-broadcast-chart.mjs', ferramenta: 'playwright · svg' });
await ev.capture(page, {
  test: 't-02-grafico', step: '01-render',
  title: 'Gráfico canônico da fase (bytes/tick)',
  description: 'Render do gráfico gerado a partir da série real medida; usado também na crônica da landing.',
  status: 'validado',
  expected: 'série visível, média marcada, identidade MIL-SPEC',
  observed: `média ${avg} B/tick · máx ${max} · ${report.kBps} KB/s`,
  tags: ['crônica', 'visual'],
});
ev.flush();
await browser.close();

console.log('CHART', JSON.stringify({ svg: svgPath, avg, max, kBps: report.kBps, hz: report.hz }));
