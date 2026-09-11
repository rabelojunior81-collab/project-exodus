/**
 * server-suite-evidence.mjs — Registra a suíte do servidor como evidência.
 *
 * Roda `npm test` no workspace server, grava a transcrição completa e um
 * manifesto no registro visual da fase informada. Exit code reflete a suíte
 * (útil para o estado vermelho do TDD).
 *
 *   node tools/visual-check/server-suite-evidence.mjs --phase fase-2.6.3 --label red
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EvidenceRegistry } from './lib/evidence.mjs';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const phase = arg('phase', 'fase-2.6.3');
const label = arg('label', 'run');
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const command = `cd server && npm test   # evidência ${label}`;

const child = spawn('npm', ['test'], { cwd: resolve(root, 'server'), env: process.env });
let out = '';
child.stdout.on('data', (d) => { out += d.toString(); process.stdout.write(d); });
child.stderr.on('data', (d) => { out += d.toString(); process.stderr.write(d); });

const code = await new Promise((res) => child.on('close', res));

const asserts = [...out.matchAll(/\[Test:[A-Za-z]+\] (\d+) asserts OK/g)]
  .map((m) => `${m[0].match(/\[Test:([A-Za-z]+)\]/)?.[1]}=${m[1]}`)
  .join(', ');
const failed = /Error|AssertionError|assert\.ok/.test(out) && code !== 0;

const ev = new EvidenceRegistry({
  root, phase, command,
  ferramenta: 'node · ts-node/esm',
});
ev.captureText({
  test: 't-00-suíte-do-servidor',
  step: `00-${label}`,
  title: `Suíte do servidor — execução ${label}`,
  description: 'Transcrição completa da suíte (smoke + asserts de todas as áreas) registrada como evidência da fase.',
  status: code === 0 ? 'passou' : 'falhou',
  expected: 'Todos os arquivos de teste passam (exit 0)',
  observed: code === 0 ? `exit 0 · ${asserts}` : `exit ${code} · falhas registradas na transcrição`,
  content: out,
  tags: [label, failed ? 'vermelho' : 'verde'],
});
ev.flush();
console.log(`[evidence] registrado em docs/evidence/${phase} (status: ${code === 0 ? 'passou' : 'falhou'})`);
process.exit(code === 0 ? 0 : 1);
