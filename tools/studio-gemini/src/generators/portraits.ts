import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { GeminiStudioClient } from '../client.js';
import {
  AssetMeta,
  CliFlags,
  parseFlags,
  resolveClientAssets,
  resolveMasters,
  ensureDir,
  writeMeta,
  shouldSkip,
  sleep
} from './_shared.js';

export interface PortraitJob {
  name: string;
  seed: number;
  subject: string;
}

const BATCH_LOTE1: PortraitJob[] = [
  { name: 'hero-scrapper-marshal', seed: 1101, subject: 'grizzled female marshal in patched scrap-plate armor, desert dusk rim light' },
  { name: 'hero-orden-warden', seed: 1102, subject: 'stern male warden in bunker concrete armor with red armband, cold fluorescent key light' },
  { name: 'hero-silicio-prophet', seed: 1103, subject: 'hooded cyber-prophet with glowing circuit tattoos, neon cyan rim light' },
  { name: 'era-1-scavenger', seed: 1104, subject: 'wiry survivor in rags and goggles, ash-grey dust background' },
  { name: 'era-2-settler', seed: 1105, subject: 'determined settler with wind-burned face and makeshift poncho, dawn horizon' },
  { name: 'era-3-engineer', seed: 1106, subject: 'grease-stained engineer holding salvaged chip, workshop sparks background' },
  { name: 'era-4-cyber-adept', seed: 1107, subject: 'augmented adept with chrome ocular implant, purple neon underlight' },
  { name: 'unit-bunker-gunner', seed: 1108, subject: 'heavily armored gunner behind concrete turret, muzzle-flash rim light' },
  { name: 'unit-maintenance-drone', seed: 1109, subject: 'small hovering maintenance drone with one claw arm and camera eye' },
  { name: 'unit-biped-mech', seed: 1110, subject: 'rusted bipedal combat mech with cracked cockpit glass' },
  { name: 'unit-scrap-buggy', seed: 1111, subject: 'post-apocalyptic light dune buggy plated with scrap metal' },
  { name: 'unit-command-center', seed: 1112, subject: 'command bunker interior, holographic map table, officers in silhouette' }
];

const PORTRAIT_MODEL = 'gemini-2.5-flash-image';
const PUBLIC_SIZE = 512;
const THUMB_SIZE = 128;
const JPG_QUALITY = 90;
const WEBP_QUALITY = 80;

function buildPrompt(subject: string): string {
  return `Post-apocalyptic RTS hero portrait, ${subject}, bust framing, centered, neutral dark background, photorealistic, gritty film grain, cinematic key light, no text, no watermark, square 1:1. Negative: cartoon, anime, extra fingers, text, logo, watermark.`;
}

async function generatePortrait(
  client: GeminiStudioClient,
  job: PortraitJob,
  publicDir: string,
  mastersDir: string,
  flags: CliFlags
): Promise<void> {
  const webpPath = path.join(publicDir, `${job.name}.webp`);
  const thumbPath = path.join(publicDir, `${job.name}-thumb.webp`);
  const masterPath = path.join(mastersDir, `${job.name}.jpg`);

  if (!flags.force && fs.existsSync(webpPath) && fs.existsSync(masterPath)) {
    console.log(`[Portraits] ${job.name}: já existe em disco; pulando (use --force para regerar).`);
    return;
  }

  const prompt = buildPrompt(job.subject);

  if (flags.dryRun) {
    console.log(`[DRY-RUN] ${job.name}: model=${PORTRAIT_MODEL} seed=${job.seed}`);
    console.log(`[DRY-RUN] prompt=${prompt}`);
    console.log(`[DRY-RUN] estimativa: ~$0.03/imagem`);
    return;
  }

  console.log(`[Portraits] Gerando ${job.name} via ${PORTRAIT_MODEL}...`);
  ensureDir(publicDir);
  ensureDir(mastersDir);

  const result = await client.generateInlineData(prompt, PORTRAIT_MODEL, {
    responseModalities: ['IMAGE'],
    temperature: 0.4
  });

  const buffer = Buffer.from(result.data, 'base64');
  if (buffer.length < 1000) {
    throw new Error(`[Portraits] ${job.name}: resposta muito pequena (${buffer.length} bytes).`);
  }

  fs.writeFileSync(masterPath, buffer);
  console.log(`[Portraits] Master salvo: ${masterPath} (${(buffer.length / 1024).toFixed(1)} KB)`);

  await sharp(buffer)
    .resize(PUBLIC_SIZE, PUBLIC_SIZE, { fit: 'cover' })
    .webp({ quality: WEBP_QUALITY })
    .toFile(webpPath);

  await sharp(buffer)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
    .webp({ quality: WEBP_QUALITY })
    .toFile(thumbPath);

  const webpStats = fs.statSync(webpPath);
  const meta: AssetMeta = {
    prompt,
    model: PORTRAIT_MODEL,
    seed: job.seed,
    date: new Date().toISOString(),
    bytes: webpStats.size,
    dimensions: { width: PUBLIC_SIZE, height: PUBLIC_SIZE },
    license: 'AI-generated Rabelus Lab internal'
  };
  writeMeta(webpPath, meta);

  console.log(`[Portraits] ${job.name}: publicado ${webpPath} (${(webpStats.size / 1024).toFixed(1)} KB)`);
}

async function main(): Promise<void> {
  const flags = parseFlags(resolveClientAssets('portraits'));
  const publicDir = flags.outDir;
  const mastersDir = resolveMasters('portraits');

  console.log('=== Project Exodus — Portrait Batch (Lote 1) ===');
  console.log(`Public dir: ${publicDir}`);
  console.log(`Masters dir: ${mastersDir}`);
  if (flags.dryRun) console.log('MODO DRY-RUN: nenhuma chamada de API será feita.');

  const client = new GeminiStudioClient();
  const jobs = BATCH_LOTE1;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    try {
      await generatePortrait(client, job, publicDir, mastersDir, flags);
    } catch (err: any) {
      console.error(`[Portraits] FALHA em ${job.name}:`, err.message);
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        console.error(`[Portraits] Modelo ${PORTRAIT_MODEL} indisponível. Abortando Lote 1.`);
        process.exit(1);
      }
    }
    if (i < jobs.length - 1) await sleep(2500);
  }

  console.log('\n[Portraits] Lote 1 concluído.');
}

main().catch((err) => {
  console.error('[Portraits] Erro fatal:', err.message);
  process.exit(1);
});
