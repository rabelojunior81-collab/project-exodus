# ASSET_PLAN.md — Pipeline Gemini de Ativos (Fase 1.7)

> Escopo: `tools/studio-gemini/` + curadoria de `client/public/assets/`. Nenhum codigo de jogo
> (`client/src`, `server/src`) foi tocado. Nenhuma chave foi impressa ou gravada fora do `.env`.
> Inventario fisico: ver `client/public/assets/MANIFEST.md`.

## 1. Auditoria do pipeline hoje (1.7.1)

### 1.1 O que existe

| Peca | Conteudo real |
| :--- | :--- |
| `package.json` | `@project-exodus/studio-gemini` 0.1.0, ESM, deps `@google/genai ^2.21.0` + `dotenv ^16.4.7`, dev `typescript ^5.8.2 + ts-node`. Scripts: `build` (tsc), `test` (ts-node + `tests/gemini_connectivity.test.ts`), `generate` (ts-node + `src/index.ts`) |
| `src/client.ts` (87 linhas) | `GeminiStudioClient`: le `GEMINI_API_KEY` de 3 caminhos `.env`, `generateText(prompt, model='gemini-2.5-flash')` via `POST v1beta/models/{model}:generateContent` (temperature 0.7, maxOutputTokens 2048), `testConnectivity()` com frase-c Sentinela. Sem timeout, sem retry, sem log de custo/tokens |
| `src/generators/lore.ts` (74 linhas) | `LoreGenerator.generateEraLore()`: cache-first em `client/public/assets/lore/era_${id}_lore.json` (se existe, nao chama API), prompt PT-BR fixo, strip de ```json, `JSON.parse`, escrita formatada. Unico gerador existente |
| `src/index.ts` (32 linhas) | CLI que gera as 4 eras em sequencia e loga prefixo do `radioTranscript` |
| `tests/gemini_connectivity.test.ts` (20 linhas) | Assert de conectividade (resposta contem sentinela). Sem framework, `assert.strictEqual`, exit 1 em falha |
| `dist/` | Compilado `client.js` + `index.js` + `generators/lore.js` (espelho do src; re-build necessario apos qualquer mudanca em src) |
| Lore em disco | 4 JSON validos (~1,0-1,7 KB cada, ver MANIFEST) — unico output do pipeline ate hoje |

### 1.2 Modelos / endpoints usados hoje

- Unico: **`gemini-2.5-flash` via REST `generativelanguage.googleapis.com/v1beta/...:generateContent`** (texto).
- Nenhum uso de: imagem (Imagen / `gemini-2.5-flash-image`), TTS (`gemini-2.5-flash-preview-tts`),
  musica (Lyria), video (Veo). Nenhum SDK `@google/genai` efetivamente chamado (o client usa `fetch` direto).

### 1.3 Quebrado / desatualizado / fragil

1. `npm run test/generate` usa `node --loader ts-node/esm`: flag `--loader` deprecada/removida em Node 22+;
   neste repo o runtime e Node v26 (estate.md). Trocar por `tsx` ou compilar antes (`npm run build && node dist/...`).
2. `tsconfig.json` inclui só `src/**/*`: `tests/` fica fora do build e do strict-check. Incluir ou separar config.
3. Sem geradores de imagem/audio/video: 1.7.2-1.7.4 bloqueados ate novos `src/generators/*` (fora deste turno;
   snippets prontos na secao 3).
4. Sem `timeout`/`AbortSignal`, sem retry 429/5xx com backoff, sem deteccao de quota, sem contagem de tokens/custo.
5. Chave na query string (`?key=`): funciona, mas vaza em logs/proxies. Migrar para header `x-goog-api-key`.
6. Modelo hard-coded em dois lugares (`client.ts:39,79`). Extrair para const/env `GEMINI_TEXT_MODEL`.
7. `dist/` pode dessincronizar de `src/` (hoje esta em sync; documentar `npm run build` obrigatorio pre-teste).
8. Proveniencia zero para portraits/texturas (sem prompt/model/seed) e licenca zero para GLBs (ver MANIFEST secao 5).
9. `README` ausente em `tools/studio-gemini/`. Este ASSET_PLAN cobre temporariamente; criar README no proximo turno de tooling.

### 1.4 Prova end-to-end deste turno (texto, sem custo relevante)

- Comando: `node --input-type=module -e` importando `tools/studio-gemini/dist/client.js`,
  `new GeminiStudioClient()` (chave lida do `.env`, nunca impressa) + `generateText('Responda estritamente com: PROVA_FASE17_OK')`.
- Resultado: **`PROVA_OK ms=942 len=15 snippet="PROVA_FASE17_OK"`** — pipeline texto (client + chave + endpoint `gemini-2.5-flash`) operacional.
- Nao foi tentada geracao de imagem/TTS: nao existe gerador correspondente no repo e a regra do turno
  permite criar somente os dois `.md`. Snippets prontos abaixo; nenhuma chamada Veo/Lyria foi feita (custo/tempo).

## 2. Curadoria e regras (valem para Lotes 1-3)

- Naming: **kebab-case obrigatorio** para todo arquivo novo (ex. `hero-orden-warden.jpg`, `era-2-briefing.mp3`).
  Nao renomear os 20 arquivos legados fora do padrao sem migracao de codigo (mapa em MANIFEST secao 3).
- Master + derivado: guardar master (JPG/PNG/WAV) e publicar derivado otimizado (WebP/OGG). Nunca versionar
  masters > 2 MB em `public/` sem aprovacao.
- Orcamento de peso por lote: Lote 1 <= 6 MB publicados, Lote 2 <= 8 MB, Lote 3 (video) lazy-load obrigatorio,
  nunca no boot. Total `public/assets` nao deve passar de ~35 MB sem decisao do orquestrador.
- Sidecar de proveniencia: cada asset gerado acompanha `<nome>.meta.json` com
  `{ prompt, model, seed, date, bytes, dimensions, license: "AI-generated Rabelus Lab internal" }`.
- Nunca commitar chave; `.env` ja git-ignorado. Custo registrado por lote (tabela secao 4).

## 3. Lotes priorizados

### LOTE 1 (1.7.2) — Retratos/herois + icones faltantes [PRIORIDADE MAXIMA, barato, desbloqueia HUD/Fase 5]

Objetivo: cobrir HUD (Fase 1.6) e faccoes (Fase 5) sem tocar codigo (HUD atual usa 4 portraits; novos entram por convencao + fiação futura do orquestrador).

Arquivos-alvo (12, todos kebab-case, `portraits/` + `icons/`):

```
portraits/hero-scrapper-marshal.jpg      (Sucateiros Livres, lider)
portraits/hero-orden-warden.jpg          (Ordem dos Bunkers, lider)
portraits/hero-silicio-prophet.jpg       (Filhos do Silicio, lider)
portraits/era-1-scavenger.jpg            (transicao era 1, reutilizavel no modal de Lore)
portraits/era-2-settler.jpg
portraits/era-3-engineer.jpg
portraits/era-4-cyber-adept.jpg
portraits/unit-bunker-gunner.jpg         (cobre bunker/turret sem retrato)
icons/resource-ration.svg
icons/resource-scrap.svg
icons/resource-chip.svg
icons/resource-concrete.svg
```

Formato/tamanho-alvo: master JPG 1024x1024 q85; publicado WebP 512x512 q80 (alvo 80-150 KB cada) + thumb 128px;
icones SVG 24x24 stroke (mesmo idioma visual de `client/src/ui/icons.ts`), < 3 KB cada.

Modelo/endpoint sugerido: `gemini-2.5-flash-image` (alias nano-banana) para retratos com art-direction consistente;
SVG de icones via `gemini-2.5-flash` (texto) + vetorizacao/curadoria manual (nao gerar SVG cego em produção).

Prompts-modelo (copiar, trocar apenas o sujeito):

```
RETRATO (EN, image model):
"Post-apocalyptic RTS hero portrait, [SUBJECT: grizzled female marshal in patched scrap-plate armor, desert dusk rim light],
bust framing, centered, neutral dark background, photorealistic, gritty film grain, cinematic key light, no text, no watermark,
square 1:1"  -- negative: cartoon, anime, extra fingers, text, logo, watermark
Parametros: aspect 1:1, 1024px, seed fixa por personagem (ex. 1101/1102/1103), temperature baixa.
Pos: converter para WebP 512 q80 + `<nome>.meta.json` com prompt/seed/model.
```

```
ICONE SVG (text model, depois curadoria):
"Emita UM svg 24x24 stroke=currentColor stroke-width=2 minimal military icon de [CHIP DE IA / LATA DE RACAO / VIGA DE SUCATA / BLOCO DE CONCRETO],
sem fundo, sem texto, paths fechados." Revisar a mao antes de publicar em assets/icons/.
```

Script pronto (colar como `tools/studio-gemini/src/generators/portraits.ts` no proximo turno — NAO criado neste turno por regra de escopo):

```ts
// Pseudo-pronto: mesma shape de LoreGenerator, cache-first, escreve master + .meta.json
import { GeminiStudioClient } from '../client.js';
// POST v1beta/models/gemini-2.5-flash-image:generateContent { contents:[{parts:[{text: PROMPT}]}], generationConfig:{ responseModalities:['IMAGE'] } }
// resposta: candidates[0].content.parts -> inlineData { mimeType, data(base64) } -> salva JPG + converte p/ WebP 512 (sharp) + sidecar .meta.json
// CLI: for (const job of BATCH_LOTE1) await generatePortrait(job); // com sleep 2s entre calls p/ quota
```

Comandos prontos (hoje + proximo turno):

```
npm run build --workspace=tools/studio-gemini
npm run test --workspace=tools/studio-gemini
# proximo turno (apos criar generator):
# npx tsx tools/studio-gemini/src/generators/portraits.ts --batch=lote-1 --out=client/public/assets/portraits
```

### LOTE 2 (1.7.3) — TTS narrativo: briefings por era + voice-lines [PREPARADO, executar apos Lote 1]

Objetivo: `assets/audio/` (hoje inexistente) com narracao PT-BR para Fase 4 (transicao de era com radio + imagem).

Arquivos-alvo (12-16, kebab-case):

```
audio/era-1-briefing.mp3   (de era_1_lore.json: radioTranscript + historicalContext resumido, ~30-45 s)
audio/era-2-briefing.mp3
audio/era-3-briefing.mp3
audio/era-4-briefing.mp3
audio/unit-select-scavenger.mp3   ("Catador pronto.")
audio/unit-move-scavenger.mp3     ("A caminho.")
audio/unit-select-raider.mp3      ("Raider na escuta.")
audio/unit-attack-raider.mp3      ("Fogo!")
audio/unit-select-buggy.mp3       ("Buggy ligado.")
audio/unit-move-buggy.mp3         ("Acelerando.")
audio/alert-under-attack.mp3      ("Estamos sob ataque!")
audio/alert-construction-done.mp3 ("Construcao concluida.")
```

Formato/tamanho-alvo: master WAV 22050 Hz mono 16-bit; publicado MP3 64 kbps CBR (briefings ~250-400 KB cada)
+ OGG Vorbis q3 fallback; voice-lines < 3 s (< 30 KB cada). Taxa total do lote: alvo < 3 MB publicados.

Modelo/endpoint sugerido: `gemini-2.5-flash-preview-tts` (voz `Charon` p/ briefings graves de radio,
`Kore`/`Puck` p/ units), `languageCode pt-BR`, com filtro de radio (bandpass + noise) aplicado offline.

Prompts-modelo (texto-fonte, nao prompt de LLM — o TTS le o texto-fonte):

```
BRIEFING (montar de lore JSON, max 90 palavras, PT-BR, com marcacoes):
"[RADIO STATIC] Aqui e o posto Echo-7... [texto do radioTranscript]. [BEAT] [texto resumido do historicalContext em 2 frases]."
Voice-lines: 1 frase, imperativo militar curto, sem numeros.
```

Script pronto (colar como `src/generators/tts.ts` no proximo turno):

```ts
// POST v1beta/models/gemini-2.5-flash-preview-tts:generateContent
// { contents:[{parts:[{text: SSML_OU_TEXTO}]}], generationConfig:{ responseModalities:['AUDIO'], speechConfig:{ voiceConfig:{ prebuiltVoiceConfig:{ voiceName:'Charon' } } } } }
// resposta inlineData base64 (WAV) -> ffmpeg: -ar 22050 -ac 1 master.wav -> libmp3lame -b:a 64k briefing.mp3 + vorbis .ogg
// batch com sleep 3s; resume por arquivo (cache-first igual LoreGenerator)
```

Preparacao ja feita neste turno: textos-fonte existem (4 `radioTranscript` + contextos medidos no MANIFEST);
nenhum `.mp3` foi gerado (sem generator + regra de so-`.md`).

### LOTE 3 (1.7.4) — Trilhas + videos de transicao de era [PREPARADO, executar por ultimo — custo dominante]

Objetivo: 2-3 loops musicais + 4 vinhetas de era para Fase 4 (transicao desbloqueia transmissao sem congelar partida).

Arquivos-alvo (kebab-case, `music/` + `video/`, lazy-load):

```
music/ambient-wasteland-wind-loop.ogg   (60-90 s, loop, -14 LUFS)
music/ambient-bunker-drone-loop.ogg
music/combat-percussion-stinger.ogg     (8-12 s)
video/era-1-transition.mp4              (8 s, 720p, H.264, mudo)
video/era-2-transition.mp4
video/era-3-transition.mp4
video/era-4-transition.mp4
```

Formato/tamanho-alvo: musica OGG 96 kbps (loop perfeito, < 1,5 MB cada); video MP4 1280x720 24fps 8 s,
CRF 23, < 4 MB cada, `preload="none"`, autoplay muted inline.

Modelo/endpoint sugerido: musica via Lyria (`lyria-002`, acesso experimental — se indisponivel, fallback:
loops WebAudio procedurais + SFX livres, documentar licenca); video via `veo-3.1-generate-preview`
(text-to-video, 720p/8s). Ambos exigem aprovacao de custo antes de rodar (ver secao 4).

Prompts-modelo:

```
MUSICA (Lyria): "Dark ambient wasteland loop, 70 BPM, detuned synth drone + wind + distant metal clanks, no melody, seamless loop, 60 seconds."
VIDEO (Veo): "Slow aerial push over post-apocalyptic [desert scrap fields / resettled outpost at dawn / reclaimed factory interior / neon cyber-bunker], dust particles, volumetric light, cinematic, no people close-up, no text, 8 seconds, 720p."
```

Script pronto (proximo turno): `src/generators/music.ts` + `src/generators/video.ts` com poll de operacao longa
(Veo e assincrono: `generate -> operation -> poll 10s ate done -> download`), limite 1 video por execucao,
flag `--dry-run` que só imprime prompt/custo sem chamar API.

## 4. Custo estimado de API (confirmar na tabela de precos vigente antes de rodar)

| Item | Base de estimativa (precos publicos 2026, sujeitos a mudanca) | Qtd | Estimativa lote |
| :--- | :--- | ---: | :--- |
| Texto (lore/roteiros/icones SVG) `gemini-2.5-flash` | ~$0,30/1M in + $2,50/1M out; cada lore < 2k tokens | ~10 calls | < $0,05 |
| Retratos `flash-image`/`imagen` | ~$0,02-0,04/imagem | 8 retratos + retries (~12) | $0,25-0,50 |
| TTS `flash-preview-tts` | ~$4-16/1M chars; briefings+lines ~= 12-15k chars | ~14 audios | $0,06-0,25 |
| Musica Lyria | variavel/experimental | 3 tracks | $0,10-0,50 (ou $0 com fallback procedural) |
| Video Veo | ~$0,10-0,75/s; 4 x 8 s = 32 s | 4 videos | **$3-24 (dominante)** |
| **Total Lotes 1+2** | — | — | **< $1** |
| **Total com Lote 3 (video)** | — | — | **$4-25** |

Regra de execucao: Lotes 1 e 2 rodam com sleep anti-quota (2-3 s) e cache-first; Lote 3 exige aprovacao explicita
de custo + 1 video piloto.

> **Custo real Sessão 9/10 (2026-09-10)**: Lote 1 ~$0,35-0,70; Lote 2 ~$0,08-0,30; Lote 3 (Lyria/Veo) **$0** porque os modelos retornaram **404** na API `v1beta` para `generateContent`. Fallbacks procedurais documentados.

## 5. Riscos e mitigacoes

1. **Cota/429 (texto e imagem)**: sem retry hoje. Mitigacao: sleep 2-3 s entre calls, cache-first (nao regerar o que
   existe), lote noturno, `--only-missing`. Proximos generators DEVEM ter backoff exponencial + resume.
2. **Formatos**: JPG 1024 e WAV sao masters, nunca formato final. Publicar WebP/MP3/OGG/MP4-H264; testar no
   Chromium do harness (`tools/visual-check`) antes de declarar Lote pronto.
3. **Pesos**: boot ja tem ~13 MB (GLBs preload + texturas + portraits). Audio/video DEVEM ser lazy
   (`preload none`, fetch sob demanda na transicao de era). Gate: pesar `public/assets` apos cada lote.
4. **Consistencia artistica**: portraits gerados em sessoes distintas divergem. Mitigacao: seed fixa por personagem,
   mesmo prefixo de prompt, mesma luz/paleta ("desert dusk rim light, neutral dark background"), curadoria humana.
5. **Voz PT-BR**: TTS pode sair com sotaque neutro/robotico. Mitigacao: 1 piloto por voz antes do batch,
   pos-processo radio (bandpass 400-3400 Hz + leve saturacao) para mascarar artefatos.
6. **Veo/Lyria indisponiveis na regiao/conta**: fallback documentado (musica procedural + Ken Burns sobre retratos
   como "video" temporario). Nunca bloquear Lotes 1-2 por Lote 3.
7. **Chave**: `.env` git-ignorado OK; migrar para header `x-goog-api-key`, nunca logar prompt com chave,
   nunca versionar `.meta.json` com chave (só modelo/prompt/seed).
8. **Licenca GLB**: risco juridico aberto (ver MANIFEST). Nao agrava: nenhum GLB novo entra nos Lotes 1-3.

## 6. Proximos passos (para orquestrador / turnos 1.7.3-1.7.4)

1. Aprovar este plano + MANIFEST como Gate 1.7.1/1.7.2-documental.
2. Turno tooling (fora do meu escopo de escrita): criar `portraits.ts` + `tts.ts` a partir dos snippets da secao 3,
   trocar `--loader` por `tsx`, incluir `tests/` no tsconfig, extrair `GEMINI_TEXT_MODEL` p/ env.
3. Rodar Lote 1 (12 arquivos), curadoria visual no harness, pesar, atualizar MANIFEST.
4. Rodar Lote 2 (12-16 audios), teste de `AudioContext` + autoplay-policy, atualizar MANIFEST.
5. Piloto Lote 3 (1 musica + 1 video) com aprovacao de custo, depois completar.
6. `ATTRIBUTION.md` para GLBs + `.meta.json` para todo asset novo.

---
*Registro assinado por:*
- **Harness/Agente**: subagente asset-pipeline (A3)
- **Modelo LLM**: Muse Spark (muse-spark)
- **Timestamp**: 2026-09-09T00:00:00-03:00
