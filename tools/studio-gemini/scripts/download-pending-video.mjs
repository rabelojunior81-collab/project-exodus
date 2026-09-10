#!/usr/bin/env node
/**
 * download-pending-video.mjs — baixa o vídeo gerado na Files API do Gemini.
 *
 * Contexto (Sessão 13): o piloto `video-omni-pilot.ts` recebeu o metadata do
 * arquivo gerado (name, downloadUri, sizeBytes) mas gravou o JSON no lugar do
 * MP4. Este utilitário lê essa referência, autentica com a `GEMINI_API_KEY`
 * do `.env` (nunca impressa) e grava os bytes reais.
 *
 * Uso:
 *   node tools/studio-gemini/scripts/download-pending-video.mjs <ref.json> <saida.mp4>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const [refPath, outPath] = process.argv.slice(2);
if (!refPath || !outPath) {
  console.error('uso: node download-pending-video.mjs <ref.json> <saida.mp4>');
  process.exit(2);
}

function loadKey() {
  const candidates = ['.env', '../.env', '../../.env', '../../../.env'];
  for (const c of candidates) {
    try {
      const txt = readFileSync(resolve(c), 'utf8');
      const m = txt.match(/^GEMINI_API_KEY=(.+)$/m);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch {
      // tenta o próximo caminho
    }
  }
  return process.env.GEMINI_API_KEY || null;
}

const ref = JSON.parse(readFileSync(resolve(refPath), 'utf8'));
const uri = ref.downloadUri || ref.uri;
if (!uri) {
  console.error('[download] referência sem downloadUri/uri');
  process.exit(2);
}

const key = loadKey();
if (!key) {
  console.error('[download] GEMINI_API_KEY não encontrada (.env)');
  process.exit(2);
}

const url = uri.includes('alt=media') ? uri : `${uri}${uri.includes('?') ? '&' : '?'}alt=media`;
const res = await fetch(url, { headers: { 'x-goog-api-key': key } });
if (!res.ok) {
  console.error(`[download] falhou: HTTP ${res.status} ${res.statusText}`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
if (buf.length < 1024) {
  console.error(`[download] resposta suspeita (${buf.length} bytes) — abortando sem escrever`);
  process.exit(1);
}
mkdirSync(dirname(resolve(outPath)), { recursive: true });
writeFileSync(resolve(outPath), buf);
console.log(`[download] ok: ${outPath} (${buf.length} bytes)`);
