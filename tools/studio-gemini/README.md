# Project Exodus — Gemini Asset Studio

Ferramenta de geração e curadoria de ativos para o RTS *Project Exodus* usando a API Gemini.

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do repositório:

```env
GEMINI_API_KEY= sua_chave_aqui
GEMINI_TEXT_MODEL=gemini-2.5-flash        # opcional, default: gemini-2.5-flash
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta  # opcional
```

**Nunca** logue ou versione a chave. O client a lê do `.env` e a envia no header `x-goog-api-key`.

## Build e teste

```bash
npm run build --workspace=tools/studio-gemini
npm run test --workspace=tools/studio-gemini
```

Os scripts `test` e `generate` usam `tsx`, dispensando `ts-node --loader`.

## Geração de lotes

### Lote 1 — Retratos

```bash
npx tsx src/generators/portraits.ts
npx tsx src/generators/portraits.ts --dry-run
npx tsx src/generators/portraits.ts --force
npx tsx src/generators/portraits.ts --out=/tmp/portraits-test
```

Gera 12 retratos em `client/public/assets/portraits/` (WebP 512×512 + thumb 128×128 + `.meta.json`), mantendo os masters JPG em `tools/studio-gemini/masters/portraits/`.

### Lote 2 — TTS / Áudio

```bash
npx tsx src/generators/tts.ts
npx tsx src/generators/tts.ts --dry-run
```

Gera briefings de era + voice-lines em `client/public/assets/audio/`. Se `ffmpeg` estiver disponível, produz MP3 64 kbps + OGG fallback; caso contrário, mantém WAV e documenta.

### Lote 3 — Música + Vídeo

```bash
# SEMPRE comece com dry-run para estimar custo
npx tsx src/generators/music.ts --dry-run
npx tsx src/generators/video.ts --dry-run

# Após aprovação explícita
npx tsx src/generators/music.ts
npx tsx src/generators/video.ts
```

Música usa Lyria (`lyria-002`) e vídeo usa Veo (`veo-3.1-generate-preview`). Se indisponíveis, use os fallbacks documentados em `client/public/assets/MANIFEST.md`.

## Cache e proveniência

- Cache-first: se o arquivo final já existir, a API não é chamada (a menos que `--force`).
- Cada asset publicado acompanha `<nome>.meta.json` com `{ prompt, model, seed, date, bytes, dimensions, license }`.
- Masters (>2 MB) ficam em `tools/studio-gemini/masters/` e não devem ser versionados.

## Retry e timeout

O cliente possui `AbortSignal.timeout(30000)` e retry exponencial (até 3 tentativas) para erros 429/5xx.
