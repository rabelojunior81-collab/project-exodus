import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AssetMeta {
  prompt: string;
  model: string;
  seed?: number;
  date: string;
  bytes: number;
  dimensions?: { width: number; height: number };
  license: string;
}

export interface CliFlags {
  dryRun: boolean;
  force: boolean;
  outDir: string;
}

export function parseFlags(defaultOutDir: string): CliFlags {
  const args = process.argv.slice(2);
  const outFlag = args.find((a) => a.startsWith('--out='));
  return {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    outDir: outFlag ? outFlag.split('=')[1] : defaultOutDir
  };
}

function findProjectRoot(): string {
  // Sobe a partir do arquivo até encontrar a raiz marcada por client/package.json + package.json.
  const checked = new Set<string>();
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    const r = path.resolve(dir, ...Array(i).fill('..'));
    if (checked.has(r)) continue;
    checked.add(r);
    if (fs.existsSync(path.join(r, 'client', 'package.json')) && fs.existsSync(path.join(r, 'package.json'))) {
      return r;
    }
  }
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'client', 'package.json')) && fs.existsSync(path.join(cwd, 'package.json'))) {
    return cwd;
  }
  throw new Error('Não foi possível localizar a raiz do projeto (procurando client/package.json + package.json).');
}

export function resolveClientAssets(subfolder: string): string {
  return path.resolve(findProjectRoot(), 'client/public/assets', subfolder);
}

export function resolveMasters(subfolder: string): string {
  return path.resolve(findProjectRoot(), 'tools/studio-gemini/masters', subfolder);
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function writeMeta(finalPath: string, meta: AssetMeta): void {
  const metaPath = `${finalPath}.meta.json`;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}

export function loadMeta(finalPath: string): AssetMeta | null {
  const metaPath = `${finalPath}.meta.json`;
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as AssetMeta;
  } catch {
    return null;
  }
}

export function shouldSkip(finalPath: string, force: boolean): boolean {
  if (force) return false;
  return fs.existsSync(finalPath);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
