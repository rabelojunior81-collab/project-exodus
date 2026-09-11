/**
 * evidence.mjs — Registro visual de testes (Sessão 17, Fase 2.6.3).
 *
 * Grava capturas (screenshot/texto) em `docs/evidence/<fase>/<teste>/` com um
 * manifesto JSON por passo e um índice agregado no `MANIFEST.md` da fase.
 * Ver `docs/evidence/README.md` para o contrato completo.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const EVIDENCE_ROOT = 'docs/evidence';
export const INDEX_BEGIN = '<!-- EVIDENCE:INDEX:BEGIN -->';
export const INDEX_END = '<!-- EVIDENCE:INDEX:END -->';

/** Converte texto livre em slug estável (sem acentos, kebab-case). */
export function slug(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 56);
}

export class EvidenceRegistry {
  /**
   * @param {{ root?: string, phase: string, commit?: string, command?: string,
   *           ferramenta?: string }} opts
   */
  constructor(opts) {
    this.root = resolve(opts.root ?? process.cwd());
    this.phase = opts.phase;
    this.commit = opts.commit ?? 'pendente';
    this.command = opts.command ?? '';
    this.ferramenta = opts.ferramenta ?? '';
    this.dir = join(this.root, EVIDENCE_ROOT, this.phase);
    this.indexPath = join(this.dir, 'MANIFEST.md');
    this.rows = [];
    mkdirSync(this.dir, { recursive: true });
  }

  /** Captura um screenshot do Playwright com manifesto do passo. */
  async capture(page, spec) {
    const testSlug = slug(spec.test);
    const stepSlug = slug(spec.step);
    const dir = join(this.dir, testSlug);
    mkdirSync(dir, { recursive: true });
    const file = `${stepSlug}.png`;
    const abs = join(dir, file);
    await page.screenshot({ path: abs, type: 'png' });
    return this._record(spec, testSlug, stepSlug, file, 'screenshot');
  }

  /** Registra evidência textual (transcrição de suíte/CLI) com manifesto. */
  captureText(spec) {
    const testSlug = slug(spec.test);
    const stepSlug = slug(spec.step);
    const dir = join(this.dir, testSlug);
    mkdirSync(dir, { recursive: true });
    const file = `${stepSlug}.txt`;
    writeFileSync(join(dir, file), spec.content ?? '', 'utf8');
    return this._record(spec, testSlug, stepSlug, file, 'texto');
  }

  _record(spec, testSlug, stepSlug, file, tipo) {
    const id = `${this.phase}/${testSlug}/${stepSlug}`;
    const manifest = {
      id,
      fase: this.phase,
      teste: spec.test,
      passo: spec.step,
      titulo: spec.title,
      descricao: spec.description ?? '',
      status: spec.status,
      esperado: spec.expected ?? '',
      observado: spec.observed ?? '',
      tipo,
      captura: file,
      comando: spec.command ?? this.command,
      ferramenta: spec.ferramenta ?? this.ferramenta,
      timestamp: new Date().toISOString(),
      commit: spec.commit ?? this.commit,
      tags: spec.tags ?? [],
    };
    writeFileSync(
      join(this.dir, testSlug, `${file}.manifest.json`),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
    this.rows.push({
      id,
      tipo,
      status: spec.status,
      title: spec.title,
      detail: `${manifest.observado || manifest.esperado}`.replace(/\|/g, '/'),
      file: `${testSlug}/${file}`,
    });
    return id;
  }

  /**
   * Mescla as entradas desta execução no índice da fase (upsert por id,
   * preservando entradas de execuções anteriores).
   */
  flush({ title } = {}) {
    const header = existsSync(this.indexPath)
      ? readFileSync(this.indexPath, 'utf8')
      : defaultIndex(this.phase);
    const begin = header.indexOf(INDEX_BEGIN);
    const end = header.indexOf(INDEX_END);
    if (begin < 0 || end < 0) throw new Error('MANIFEST.md sem marcadores EVIDENCE:INDEX');

    const before = header.slice(0, begin + INDEX_BEGIN.length);
    const between = header.slice(begin + INDEX_BEGIN.length, end);
    const after = header.slice(end);

    const existing = new Map();
    for (const line of between.split('\n')) {
      if (/^\|\s*:?-{1,}/.test(line) || /^\|\s*ID\s*\|/.test(line)) continue; // cabeçalhos
      const m = line.match(/^\|\s*`?([^`|]+?)`?\s*\|/);
      if (m) existing.set(m[1].trim(), line);
    }
    for (const row of this.rows) {
      existing.set(
        row.id,
        `| \`${row.id}\` | ${row.tipo} | **${row.status}** | ${row.title} | [${row.file}](${row.file}) |`,
      );
    }
    const lines = [...existing.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([, line]) => line);
    const section = `\n| ID | Tipo | Status | Título | Arquivo |\n| :-- | :-- | :-- | :-- | :-- |\n${lines.join('\n')}\n`;
    writeFileSync(this.indexPath, before + section + after, 'utf8');
    if (title) {
      // título informativo opcional (mantido no cabeçalho do arquivo do autor)
    }
    return this.indexPath;
  }
}

function defaultIndex(phase) {
  return `# MANIFEST.md — Evidência da ${phase}\n\n${INDEX_BEGIN}\n${INDEX_END}\n`;
}
