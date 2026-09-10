# ATTRIBUTION.md — Proveniência e Licenças dos Assets

> Este documento é obrigatório pela governança do projeto (AGENTS.md). Ele registra a origem declarada de cada categoria de asset em `client/public/assets/`.

## 1. Modelos 3D (GLB)

| Arquivo | Origem declarada | Licença declarada | Observação |
| :--- | :--- | :--- | :--- |
| `soldier.glb` | Mixamo (Adobe) | Uso não-comercial permitido na conta do autor | Animado por Mixamo |
| `character.glb` | Quaternius / Mixamo | CC0 / Mixamo Terms | Personagem base Quaternius, animações Mixamo |
| `robot-expressive.glb` | Quaternius | CC0 | Modelo e animações inclusos |
| `combat-tank.glb` | Quaternius | CC0 | Modelo e animações inclusos |
| `enemy-2-legs.glb` | Quaternius | CC0 | Modelo e animações inclusos |
| `building-1-large.glb`, `building-2-large.glb`, `building-4.glb` | Quaternius / Kenney | CC0 | Edifícios estilo low-poly |
| `turret-gun-double.glb` | Quaternius | CC0 | Torreta modular |
| `tank.glb`, `combat-rover.glb`, `mech-mike.glb` | Arquivados em `docs/archived-assets/` | — | Não carregados no jogo; licença a confirmar antes de reintegrar |

> **Risco**: a atribuição exata de cada GLB ainda não foi verificada arquivo por arquivo. Antes de qualquer distribuição pública, confirmar a fonte e a licença no site do autor (Quaternius.com, Mixamo.com, Kenney.nl).

## 2. Texturas e Retratos

- **Texturas** (`textures/*.jpg`): geradas por IA / fotografias adaptadas. Proveniência não registrada nos arquivos originais; uso interno Rabelus Lab.
- **Retratos** (`portraits/*.webp`, thumbs, JPGs legados): gerados por `gemini-2.5-flash-image` via `tools/studio-gemini/src/generators/portraits.ts`. Cada arquivo possui sidecar `.meta.json` com prompt, modelo, seed e data.

## 3. Áudio

- **TTS** (`audio/*.mp3`): gerados por `gemini-2.5-flash-preview-tts` via `tools/studio-gemini/src/generators/tts.ts`. Masters PCM/WAV em `tools/studio-gemini/masters/audio/`. Vozes: `Charon` (briefings/alertas), `Kore` (scavenger/drone), `Puck` (raider/buggy/mech).
- **Música** (`music/*.mp3`, 3 arquivos, 4,19 MB): gerados por `lyria-3.5` em 2026-09-10
  (proveniência nos sidecars `.meta.json`). Formato 192 kbps stereo 44,1 kHz — re-encode para
  96 kbps previsto na Fase 1.11.4. Ainda **não consumidos** pelo cliente (não existe `playMusic`;
  o bus `music` está criado e órfão). Durações reais: 61,07 s / 62,75 s / 58,49 s — o
  "stinger de combate" foi pedido com 10 s e voltou com 58,49 s; cortar na 1.11.4.
- **Vídeo**: Lote 3 pendente. `veo-3.1-generate-preview` retornou 404 na API `v1beta`; o caminho
  `interactions`/`output_video` do `@google/genai` 2.21.0 existe e está em validação
  (`tools/studio-gemini/src/generators/video-omni-pilot.ts`). Fallback registrado: transições
  Ken-Burns sobre retratos/screenshots.

## 4. Ícones e Interface

- **Ícones SVG** (`icons/resource-*.svg`): curadoria manual a partir de prompts do `gemini-2.5-flash`, simplificados para 24×24 stroke.
- **Ícones HUD inline** (`client/src/ui/icons.ts`): vetores próprios do projeto.

## 5. Lore

- `lore/*.json`: gerados por `gemini-2.5-flash` com prompts versionados em `tools/studio-gemini/src/generators/lore.ts`.

---
*Registro assinado por:*
- **Harness/Agente**: Kimi Code CLI
- **Modelo LLM**: Kimi
- **Timestamp**: 2026-09-10T03:00:00-03:00
