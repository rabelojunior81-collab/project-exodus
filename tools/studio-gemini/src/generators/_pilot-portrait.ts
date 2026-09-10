import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { GeminiStudioClient } from '../client.js';
import { resolveClientAssets, resolveMasters, ensureDir } from './_shared.js';

async function main(): Promise<void> {
  const client = new GeminiStudioClient();
  const publicDir = resolveClientAssets('portraits');
  const mastersDir = resolveMasters('portraits');
  ensureDir(publicDir);
  ensureDir(mastersDir);

  const prompt = `Post-apocalyptic RTS hero portrait, grizzled female marshal in patched scrap-plate armor, desert dusk rim light, bust framing, centered, neutral dark background, photorealistic, gritty film grain, cinematic key light, no text, no watermark, square 1:1. Negative: cartoon, anime, extra fingers, text, logo, watermark.`;

  console.log('[Pilot] Chamando gemini-2.5-flash-image...');
  const result = await client.generateInlineData(prompt, 'gemini-2.5-flash-image', {
    responseModalities: ['IMAGE'],
    temperature: 0.4
  });

  console.log(`[Pilot] mimeType=${result.mimeType} data_len=${result.data.length}`);
  const buffer = Buffer.from(result.data, 'base64');
  console.log(`[Pilot] decoded_bytes=${buffer.length}`);

  const masterPath = path.join(mastersDir, 'pilot-hero-scrapper-marshal.jpg');
  const webpPath = path.join(publicDir, 'pilot-hero-scrapper-marshal.webp');
  fs.writeFileSync(masterPath, buffer);
  await sharp(buffer).resize(512, 512, { fit: 'cover' }).webp({ quality: 80 }).toFile(webpPath);

  console.log(`[Pilot] Master: ${masterPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  console.log(`[Pilot] WebP: ${webpPath} (${(fs.statSync(webpPath).size / 1024).toFixed(1)} KB)`);
  console.log('[Pilot] OK — API retornou inlineData base64.');
}

main().catch((err) => {
  console.error('[Pilot] FALHA:', err.message);
  process.exit(1);
});
