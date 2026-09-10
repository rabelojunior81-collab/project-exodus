import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'node:module';
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

export interface TtsJob {
  name: string;
  text: string;
  voice: 'Charon' | 'Kore' | 'Puck';
  kind: 'briefing' | 'unit' | 'alert';
}

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

const BRIEFING_TEXTS: Record<string, string> = {
  'era-1-briefing': '[RADIO STATIC] Aqui é o posto Echo-7. Ano 3 P.C. As máquinas partiram e o mundo virou cinzas. Sobrevivemos do lixo dos mortos. Cada lata, cada parafuso é um dia a mais. [BEAT] Não confie em nada que ainda tenha fios quentes.',
  'era-2-briefing': '[RADIO STATIC] Posto Echo-7, Ano 12 P.C. Levantamos muros de concreto e lata. O reassentamento começou. Água, comida, abrigo: a nova trindade. [BEAT] Quem tem terra agora tem futuro.',
  'era-3-briefing': '[RADIO STATIC] Echo-7, Ano 27 P.C. Engenhamos o velho em novo. Chips reaquecidos, motores bicudos, forjas de sucata. [BEAT] A tecnologia não morreu; só dormiu. Vamos acordá-la.',
  'era-4-briefing': '[RADIO STATIC] Echo-7, Ano 41 P.C. Renascemos híbridos. Carne e metal, memória e código. [BEAT] O colapso não foi o fim. Foi o início de outra humanidade.'
};

const VOICE_LINES: TtsJob[] = [
  { name: 'unit-select-scavenger', text: 'Catador pronto.', voice: 'Kore', kind: 'unit' },
  { name: 'unit-move-scavenger', text: 'A caminho.', voice: 'Kore', kind: 'unit' },
  { name: 'unit-select-raider', text: 'Raider na escuta.', voice: 'Puck', kind: 'unit' },
  { name: 'unit-move-raider', text: 'Avançando.', voice: 'Puck', kind: 'unit' },
  { name: 'unit-select-buggy', text: 'Buggy ligado.', voice: 'Puck', kind: 'unit' },
  { name: 'unit-move-buggy', text: 'Acelerando.', voice: 'Puck', kind: 'unit' },
  { name: 'unit-select-drone', text: 'Droide operacional.', voice: 'Kore', kind: 'unit' },
  { name: 'unit-move-drone', text: 'Deslocando.', voice: 'Kore', kind: 'unit' },
  { name: 'unit-select-mech', text: 'Mech armado.', voice: 'Puck', kind: 'unit' },
  { name: 'unit-move-mech', text: 'Marchando.', voice: 'Puck', kind: 'unit' },
  { name: 'alert-under-attack', text: 'Estamos sob ataque!', voice: 'Charon', kind: 'alert' },
  { name: 'alert-construction-done', text: 'Construção concluída.', voice: 'Charon', kind: 'alert' }
];

function buildJobs(): TtsJob[] {
  const briefings: TtsJob[] = Object.entries(BRIEFING_TEXTS).map(([name, text]) => ({
    name,
    text,
    voice: 'Charon',
    kind: 'briefing' as const
  }));
  return [...briefings, ...VOICE_LINES];
}

let ffmpegPathCache: string | null | undefined = undefined;

function ffmpegPath(): string | null {
  if (ffmpegPathCache !== undefined) return ffmpegPathCache;
  const req = createRequire(import.meta.url);
  try {
    ffmpegPathCache = req('ffmpeg-static') as string;
  } catch {
    try {
      ffmpegPathCache = execSync('which ffmpeg', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
      ffmpegPathCache = null;
    }
  }
  return ffmpegPathCache;
}

function detectFfmpeg(): boolean {
  return ffmpegPath() !== null;
}

async function convertAudio(
  inputPath: string,
  outputMp3: string,
  outputOgg: string,
  inputFormat?: { fmt: 's16le'; rate: number; channels: number }
): Promise<{ mp3Bytes: number; oggBytes?: number }> {
  const ffmpeg = ffmpegPath();
  if (!ffmpeg) {
    throw new Error('ffmpeg não disponível; não é possível converter áudio gerado.');
  }
  const inputFlags = inputFormat
    ? `-f ${inputFormat.fmt} -ar ${inputFormat.rate} -ac ${inputFormat.channels} -i "${inputPath}"`
    : `-i "${inputPath}"`;
  execSync(`"${ffmpeg}" -y ${inputFlags} -ar 22050 -ac 1 -b:a 64k "${outputMp3}"`, { stdio: 'ignore' });
  try {
    execSync(`"${ffmpeg}" -y ${inputFlags} -ar 22050 -ac 1 -q:a 3 "${outputOgg}"`, { stdio: 'ignore' });
    return { mp3Bytes: fs.statSync(outputMp3).size, oggBytes: fs.statSync(outputOgg).size };
  } catch {
    return { mp3Bytes: fs.statSync(outputMp3).size };
  }
}

async function generateTts(
  client: GeminiStudioClient,
  job: TtsJob,
  publicDir: string,
  mastersDir: string,
  flags: CliFlags
): Promise<void> {
  const mp3Path = path.join(publicDir, `${job.name}.mp3`);
  const oggPath = path.join(publicDir, `${job.name}.ogg`);
  const wavPath = path.join(mastersDir, `${job.name}.wav`);

  if (!flags.force && fs.existsSync(mp3Path)) {
    console.log(`[TTS] ${job.name}: já existe em disco; pulando.`);
    return;
  }

  if (flags.dryRun) {
    console.log(`[DRY-RUN] ${job.name}: model=${TTS_MODEL} voice=${job.voice} chars=${job.text.length}`);
    console.log(`[DRY-RUN] text="${job.text}"`);
    console.log(`[DRY-RUN] estimativa: ~$${(job.text.length * 0.00001).toFixed(4)}`);
    return;
  }

  console.log(`[TTS] Gerando ${job.name} (voz ${job.voice})...`);
  ensureDir(publicDir);
  ensureDir(mastersDir);

  const result = await client.generateInlineData(job.text, TTS_MODEL, {
    responseModalities: ['AUDIO'],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: job.voice } }
    }
  });

  const buffer = Buffer.from(result.data, 'base64');
  if (buffer.length < 100) {
    throw new Error(`[TTS] ${job.name}: resposta muito pequena (${buffer.length} bytes).`);
  }

  ensureDir(mastersDir);

  const isRawPcm = result.mimeType.includes('L16') || result.mimeType.includes('pcm');
  let converted: { mp3Bytes: number; oggBytes?: number };
  if (isRawPcm) {
    const pcmPath = path.join(mastersDir, `${job.name}.pcm`);
    fs.writeFileSync(pcmPath, buffer);
    converted = await convertAudio(pcmPath, mp3Path, oggPath, { fmt: 's16le', rate: 24000, channels: 1 });
  } else {
    fs.writeFileSync(wavPath, buffer);
    converted = await convertAudio(wavPath, mp3Path, oggPath);
  }

  const meta: AssetMeta = {
    prompt: job.text,
    model: TTS_MODEL,
    date: new Date().toISOString(),
    bytes: converted.mp3Bytes,
    license: 'AI-generated Rabelus Lab internal'
  };
  writeMeta(mp3Path, meta);

  console.log(`[TTS] ${job.name}: publicado ${mp3Path} (${(converted.mp3Bytes / 1024).toFixed(1)} KB)`);
  if (converted.oggBytes) {
    writeMeta(oggPath, { ...meta, bytes: converted.oggBytes });
  }
}

async function main(): Promise<void> {
  const flags = parseFlags(resolveClientAssets('audio'));
  const publicDir = flags.outDir;
  const mastersDir = resolveMasters('audio');

  console.log('=== Project Exodus — TTS Batch (Lote 2) ===');
  console.log(`Public dir: ${publicDir}`);
  console.log(`Masters dir: ${mastersDir}`);
  if (flags.dryRun) console.log('MODO DRY-RUN: nenhuma chamada de API será feita.');
  console.log(`ffmpeg path: ${ffmpegPath()}`);
  console.log(`ffmpeg disponível: ${detectFfmpeg()}`);

  const client = new GeminiStudioClient();
  const jobs = buildJobs();

  for (let i = 0; i < jobs.length; i++) {
    try {
      await generateTts(client, jobs[i], publicDir, mastersDir, flags);
    } catch (err: any) {
      console.error(`[TTS] FALHA em ${jobs[i].name}:`, err.message);
    }
    if (i < jobs.length - 1) await sleep(3000);
  }

  console.log('\n[TTS] Lote 2 concluído.');
}

main().catch((err) => {
  console.error('[TTS] Erro fatal:', err.message);
  process.exit(1);
});
