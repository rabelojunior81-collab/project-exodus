import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(import.meta.dirname, '../../../.env'),
  path.resolve(import.meta.dirname, '../../../../.env')
];
for (const p of possibleEnvPaths) {
  dotenv.config({ path: p });
  if (process.env.GEMINI_API_KEY) break;
}

const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('GEMINI_API_KEY não encontrada');
const apiKey: string = key;

const ai = new GoogleGenAI({ apiKey });

const prompt = 'Slow aerial push over post-apocalyptic desert scrap fields, dust particles, volumetric light, cinematic, no people close-up, no text, 8 seconds, 720p.';
const publicDir = path.resolve('client/public/assets/video');
fs.mkdirSync(publicDir, { recursive: true });

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  console.log('[Omni] Criando interação de vídeo...');
  const interaction = await (ai as any).interactions.create({
    model: 'gemini-omni-flash-preview',
    input: prompt,
    response_format: { type: 'video', delivery: 'uri' }
  });

  console.log('[Omni] Resposta:', JSON.stringify(interaction, null, 2).slice(0, 500));
  const videoUri = interaction.output_video?.uri;
  if (!videoUri) {
    console.error('[Omni] Sem URI de vídeo na resposta.');
    process.exit(1);
  }
  console.log('[Omni] URI:', videoUri);

  const fileId = videoUri.match(/files\/([a-zA-Z0-9]+)/)?.[1];
  if (!fileId) {
    console.error('[Omni] Não foi possível extrair fileId da URI.');
    process.exit(1);
  }
  const name = `files/${fileId}`;

  console.log('[Omni] Poll do arquivo', name, '...');
  for (let i = 0; i < 30; i++) {
    const file = await ai.files.get({ name });
    console.log('  estado', i, file.state);
    if (file.state === 'ACTIVE') {
      const downloadUrl = new URL(file.uri ?? videoUri);
      downloadUrl.searchParams.set('key', apiKey);
      const downloadResp = await fetch(downloadUrl.toString());
      if (!downloadResp.ok) {
        console.error('[Omni] Download falhou', downloadResp.status);
        process.exit(1);
      }
      const buf = Buffer.from(await downloadResp.arrayBuffer());
      const outPath = path.join(publicDir, 'era-1-transition.mp4');
      fs.writeFileSync(outPath, buf);
      fs.writeFileSync(`${outPath}.meta.json`, JSON.stringify({
        prompt,
        model: 'gemini-omni-flash-preview',
        date: new Date().toISOString(),
        bytes: buf.length,
        dimensions: { width: 1280, height: 720 },
        license: 'AI-generated Rabelus Lab internal'
      }, null, 2));
      console.log('[Omni] Vídeo salvo:', outPath, `(${(buf.length / (1024 * 1024)).toFixed(2)} MB)`);
      return;
    }
    if (file.state === 'FAILED') {
      console.error('[Omni] Arquivo falhou no processamento.');
      process.exit(1);
    }
    await sleep(5000);
  }
  console.error('[Omni] Timeout esperando arquivo.');
  process.exit(1);
}

main().catch((err) => {
  console.error('[Omni] Erro fatal:', err.message);
  process.exit(1);
});
