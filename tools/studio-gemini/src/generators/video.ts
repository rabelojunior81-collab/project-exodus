import * as fs from 'fs';
import * as path from 'path';
import { GeminiStudioClient } from '../client.js';
import {
  AssetMeta,
  CliFlags,
  parseFlags,
  resolveClientAssets,
  resolveMasters,
  ensureDir,
  writeMeta,
  sleep
} from './_shared.js';

const VIDEO_MODEL = 'veo-3.1-generate-preview';

interface VideoJob {
  name: string;
  prompt: string;
  durationSeconds: number;
}

const BATCH_VIDEO: VideoJob[] = [
  { name: 'era-1-transition', prompt: 'Slow aerial push over post-apocalyptic desert scrap fields, dust particles, volumetric light, cinematic, no people close-up, no text, 8 seconds, 720p.', durationSeconds: 8 },
  { name: 'era-2-transition', prompt: 'Slow aerial push over resettled outpost at dawn, tents and walls, smoke columns, cinematic, no people close-up, no text, 8 seconds, 720p.', durationSeconds: 8 },
  { name: 'era-3-transition', prompt: 'Slow aerial push over reclaimed factory interior, sparks and conveyor belts, cinematic, no people close-up, no text, 8 seconds, 720p.', durationSeconds: 8 },
  { name: 'era-4-transition', prompt: 'Slow aerial push over neon cyber-bunker, holograms and cables, cinematic, no people close-up, no text, 8 seconds, 720p.', durationSeconds: 8 }
];

async function generateVideo(
  client: GeminiStudioClient,
  job: VideoJob,
  publicDir: string,
  flags: CliFlags
): Promise<void> {
  const mp4Path = path.join(publicDir, `${job.name}.mp4`);

  if (!flags.force && fs.existsSync(mp4Path)) {
    console.log(`[Video] ${job.name}: já existe em disco; pulando.`);
    return;
  }

  if (flags.dryRun) {
    console.log(`[DRY-RUN] ${job.name}: model=${VIDEO_MODEL}`);
    console.log(`[DRY-RUN] prompt="${job.prompt}"`);
    console.log(`[DRY-RUN] estimativa: ~$${(job.durationSeconds * 0.25).toFixed(2)} a $${(job.durationSeconds * 0.75).toFixed(2)}`);
    return;
  }

  console.log(`[Video] Gerando ${job.name} via ${VIDEO_MODEL}...`);
  ensureDir(publicDir);

  try {
    const result = await client.generateInlineData(job.prompt, VIDEO_MODEL, {
      responseModalities: ['VIDEO']
    });
    const buffer = Buffer.from(result.data, 'base64');
    fs.writeFileSync(mp4Path, buffer);
    const meta: AssetMeta = {
      prompt: job.prompt,
      model: VIDEO_MODEL,
      date: new Date().toISOString(),
      bytes: buffer.length,
      dimensions: { width: 1280, height: 720 },
      license: 'AI-generated Rabelus Lab internal'
    };
    writeMeta(mp4Path, meta);
    console.log(`[Video] ${job.name}: publicado ${mp4Path} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
  } catch (err: any) {
    console.error(`[Video] FALHA em ${job.name}:`, err.message);
    console.log('[Video] Fallback documentado: efeito Ken-Burns sobre retrato da era (ver MANIFEST).');
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(resolveClientAssets('video'));
  const publicDir = flags.outDir;

  console.log('=== Project Exodus — Video Batch (Lote 3 — PILOTO) ===');
  console.log(`Public dir: ${publicDir}`);
  if (flags.dryRun) console.log('MODO DRY-RUN: nenhuma chamada de API será feita.');

  const client = new GeminiStudioClient();
  for (let i = 0; i < BATCH_VIDEO.length; i++) {
    await generateVideo(client, BATCH_VIDEO[i], publicDir, flags);
    if (i < BATCH_VIDEO.length - 1) await sleep(10000);
  }

  console.log('\n[Video] Piloto concluído.');
}

main().catch((err) => {
  console.error('[Video] Erro fatal:', err.message);
  process.exit(1);
});
