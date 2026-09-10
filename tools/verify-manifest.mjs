#!/usr/bin/env node
/**
 * verify-manifest.mjs — Gate ALTO-04 (Fase 1.11.3).
 *
 * Compara o inventário em disco contra os números declarados no MANIFEST.md e
 * falha com exit 1 em qualquer divergência de contagem. Rodar com:
 *
 *   node tools/verify-manifest.mjs
 *
 * Regra: "publicados" = assets reais, EXCLUINDO sidecars *.meta.json.
 * O peso (bytes) é informativo; a contagem é o gate.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'client/public/assets');

/** espelho do MANIFEST.md §1 (atualizar juntos, nunca só um lado) */
const EXPECTED = {
  'audio': 16,
  'icons': 4,
  'lore': 4,
  'models': 9,
  'music': 3,
  'portraits': 33,
};
const EXPECTED_ROOT_FILES = 1; // favicon.svg
const FORBIDDEN_IN_AUDIO = /\.ogg$/;

function countPublished(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countPublished(path);
      files += sub.files;
      bytes += sub.bytes;
    } else {
      if (entry.name.endsWith('.meta.json')) continue; // proveniência, não asset
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

let errors = 0;
console.log('[verify-manifest] Inventário real vs MANIFEST.md');

for (const [folder, expected] of Object.entries(EXPECTED)) {
  const { files, bytes } = countPublished(join(assets, folder));
  const ok = files === expected;
  if (!ok) errors += 1;
  console.log(`  ${ok ? 'ok  ' : 'FALHA'} ${folder.padEnd(11)} ${files} publicados (esperado ${expected}) · ${(bytes / 1024).toFixed(0)} KB`);
}

const rootFiles = readdirSync(assets, { withFileTypes: true })
  .filter((e) => e.isFile() && !e.name.endsWith('.meta.json'))
  .map((e) => e.name);
if (rootFiles.length !== EXPECTED_ROOT_FILES) {
  errors += 1;
  console.log(`  FALHA raiz ${rootFiles.length} arquivos (esperado ${EXPECTED_ROOT_FILES}): ${rootFiles.join(', ')}`);
} else {
  console.log(`  ok   raiz        ${rootFiles.length} arquivo (favicon.svg)`);
}

const audioOrphans = readdirSync(join(assets, 'audio')).filter((f) => FORBIDDEN_IN_AUDIO.test(f));
if (audioOrphans.length > 0) {
  errors += 1;
  console.log(`  FALHA audio com .ogg órfão: ${audioOrphans.join(', ')} — arquive em docs/archived-assets/`);
} else {
  console.log('  ok   audio       zero .ogg órfão');
}

if (errors > 0) {
  console.error(`\n[verify-manifest] ${errors} divergência(s) — atualize MANIFEST.md (ou o disco) e rode de novo.`);
  process.exit(1);
}
console.log('\n[verify-manifest] MANIFEST.md × disco: 100% em sincronia.');
