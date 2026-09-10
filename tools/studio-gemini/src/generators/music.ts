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

const MUSIC_MODEL = 'lyria-3.5';

interface MusicJob {
  name: string;
  prompt: string;
  durationSeconds: number;
}

const BATCH_MUSIC: MusicJob[] = [
  {
    name: 'ambient-wasteland-wind-loop',
    prompt: 'Dark ambient wasteland loop, 70 BPM, detuned synth drone + wind + distant metal clanks, no melody, seamless loop, 60 seconds.',
    durationSeconds: 60
  },
  {
    name: 'ambient-bunker-drone-loop',
    prompt: 'Subterranean bunker drone loop, low rumble, distant machinery, occasional spark, 60 seconds, seamless.',
    durationSeconds: 60
  },
  {
    name: 'combat-percussion-stinger',
    prompt: 'Tribal scrap-metal percussion stinger, urgent 90 BPM, no melody, 10 seconds.',
    durationSeconds: 10
  }
];

async function generateMusic(
  client: GeminiStudioClient,
  job: MusicJob,
  publicDir: string,
  mastersDir: string,
  flags: CliFlags
): Promise<void> {
  const isMp3Preferred = true;
  const ext = isMp3Preferred ? 'mp3' : 'ogg';
  const outPath = path.join(publicDir, `${job.name}.${ext}`);

  if (!flags.force && fs.existsSync(outPath)) {
    console.log(`[Music] ${job.name}: já existe em disco; pulando.`);
    return;
  }

  if (flags.dryRun) {
    console.log(`[DRY-RUN] ${job.name}: model=${MUSIC_MODEL}`);
    console.log(`[DRY-RUN] prompt="${job.prompt}"`);
    console.log(`[DRY-RUN] estimativa: variável/experimental (~$0.10-0.50/track)`);
    return;
  }

  console.log(`[Music] Gerando ${job.name} via ${MUSIC_MODEL}...`);
  ensureDir(publicDir);
  ensureDir(mastersDir);

  try {
    const result = await client.generateInlineData(job.prompt, MUSIC_MODEL, {
      responseModalities: ['AUDIO']
    });
    const buffer = Buffer.from(result.data, 'base64');
    const masterExt = result.mimeType?.includes('mpeg') ? 'mp3' : 'wav';
    fs.writeFileSync(path.join(mastersDir, `${job.name}.${masterExt}`), buffer);
    fs.writeFileSync(outPath, buffer);
    const meta: AssetMeta = {
      prompt: job.prompt,
      model: MUSIC_MODEL,
      date: new Date().toISOString(),
      bytes: buffer.length,
      license: 'AI-generated Rabelus Lab internal'
    };
    writeMeta(outPath, meta);
    console.log(`[Music] ${job.name}: publicado ${outPath} (${(buffer.length / 1024).toFixed(1)} KB, mime=${result.mimeType})`);
  } catch (err: any) {
    console.error(`[Music] FALHA em ${job.name}:`, err.message);
    console.log('[Music] Fallback documentado: gerar música procedural via WebAudio (ver ATTRIBUTION/MANIFEST).');
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(resolveClientAssets('music'));
  const publicDir = flags.outDir;
  const mastersDir = resolveMasters('music');

  console.log('=== Project Exodus — Music Batch (Lote 3 — PILOTO) ===');
  console.log(`Public dir: ${publicDir}`);
  if (flags.dryRun) console.log('MODO DRY-RUN: nenhuma chamada de API será feita.');

  const client = new GeminiStudioClient();
  for (let i = 0; i < BATCH_MUSIC.length; i++) {
    await generateMusic(client, BATCH_MUSIC[i], publicDir, mastersDir, flags);
    if (i < BATCH_MUSIC.length - 1) await sleep(5000);
  }

  console.log('\n[Music] Piloto concluído.');
}

main().catch((err) => {
  console.error('[Music] Erro fatal:', err.message);
  process.exit(1);
});
