# MANIFEST.md — Inventário de Assets do Jogo

> **Reconciliado com o disco em 2026-09-10 (Sessão 13)** — auditoria ALTO-04.
> Método: contagem por `ls` (publicados) e `du -sk` (peso em blocos de 1 KB, inclui sidecars).
> **Contagem "publicados" exclui os sidecars `.meta.json`** (proveniência, não assets).
> Verificação automatizada: `node tools/verify-manifest.mjs` (falha em divergência).

## 1. Resumo por pasta (publicados)

| Pasta | Arquivos | Peso (du) | Formato / Observação |
| :--- | ---: | ---: | :--- |
| `audio/` | 16 | 896 KB | 16 MP3 TTS (3 `.ogg` órfãos arquivados na S13) |
| `icons/` | 4 | 16 KB | SVG 24×24 (duplicata morta: `icons.ts` inlina os vetores — MED-08.3) |
| `lore/` | 4 | 16 KB | JSON das 4 eras |
| `models/` | 9 | 7.812 KB | GLTF |
| `music/` | 3 | 4.312 KB | MP3 192 kbps — **não consumidos** (ALTO-05) |
| `portraits/` | 33 | 4.012 KB | 17 WebP + 12 thumbs + 4 JPG legados (fallback) |
| raiz | 1 | 1 KB | `favicon.svg` |
| **Total** | **75** | **≈ 23.045 KB** | ≈ 22,5 MB (inclui sidecars no peso) |

> Histórico: antes da S13 eram 78 publicados / 23.080 KB — os +3 eram os `.ogg` órfãos,
> agora em `docs/archived-assets/ogg-orphans/`.

## 2. Inventário detalhado

### 2.1 `models/` — 9 GLTF, 7,61 MB

Todos registrados em `client/src/engine/models.ts` e carregados no boot (dist-proof 9/9).

| Arquivo | Uso em cena | Animação |
| :--- | :--- | :--- |
| `soldier.glb` | RUST_RAIDER (2,6 m, yaw π) | Idle/Walk/Run (Mixamo) |
| `character.glb` | SCAVENGER_WORKER (2,1 m, yaw 0) | Idle_Neutral/Run/Walk/Gun_Shoot; malha `Sword` degenerada oculta |
| `robot-expressive.glb` | MAINTENANCE_DRONE (~1,8 m, coletor 2× lento) | Sim |
| `enemy-2-legs.glb` | BIPED_MECH (~4,5 m) | Sim |
| `combat-tank.glb` | SCRAP_BUGGY (escala 0,38 ≈ 8,4×2,85 m) | Tank_Forward/Turning; articulação por código |
| `building-1-large.glb` | COMMAND_CENTER (escala 2,2) | — |
| `building-2-large.glb` | SCRAP_REFINERY (escala 1,7) | — |
| `building-4.glb` | BUNKER_TURRET (escala 1,3) | — |
| `turret-gun-double.glb` | torreta montada no bunker (escala 2,6) | Rotação por código |

**Arquivados** (`docs/archived-assets/`, fora do bundle): `Mech_Mike.glb`, `Tank.glb`,
`Combat_Rover.glb` (Draco). `Mech_Stan.glb` deletado na S3 (corrompido).

### 2.2 `textures/` — 5 PBR, ~5,9 MB

`terrain-diffuse.jpg`, `rocky-gravel.jpg`, `rust-sand.jpg` (splat tri-textura do terreno);
`bunker-concrete.jpg`, `rusted-metal.jpg` (escombros e veios).
Origem de todas **não documentada** — pendência registrada em `LICENSES/ASSETS.md`.

### 2.3 `portraits/` — 33 publicados (17 WebP + 12 thumbs + 4 JPG)

| Status | Arquivos |
| :--- | :--- |
| **Em uso no HUD** (`ui/hud.ts`) | `unit-command-center`, `unit-bunker-gunner`, `unit-scrap-buggy`, `unit-maintenance-drone`, `unit-biped-mech`, `era-1-scavenger` |
| **Reserva — Fase 4 (eras)** | `era-2-settler`, `era-3-engineer`, `era-4-cyber-adept` |
| **Reserva — Fase 5 (heróis/facções)** | `hero-orden-warden`, `hero-scrapper-marshal`, `hero-silicio-prophet`, `pilot-hero-scrapper-marshal` |
| **Fallback de `<img>`** (4 JPG legados, ~3,4 MB) | `buggy.jpg`, `command-center.jpg`, `scavenger.jpg`, `soldier.jpg` — candidatos a remoção quando o WebP for estável |

17 WebP 512×512 + 12 thumbs 128 px gerados por `gemini-2.5-flash-image` (Lote 1,
`tools/studio-gemini/src/generators/portraits.ts`), com sidecar `.meta.json`.
12 dos 13 retratos têm sidecar; `pilot-hero-scrapper-marshal.webp` não tem (registrado).

### 2.4 `audio/` — 16 MP3 TTS 64 kbps mono 22,05 kHz

| Grupo | Arquivos |
| :--- | :--- |
| Briefings | `era-1..4-briefing.mp3` (voz Charon) — o coração narrativo |
| Seleção | `unit-select-{scavenger,raider,buggy,drone,mech}.mp3` |
| Movimento | `unit-move-{scavenger,raider,buggy,drone,mech}.mp3` |
| Alertas | `alert-under-attack.mp3`, `alert-construction-done.mp3` (Charon) |

Masters PCM em `tools/studio-gemini/masters/audio/`.
**Órfãos removidos na S13**: `unit-move-raider.ogg`, `unit-move-scavenger.ogg`,
`unit-select-buggy.ogg` (+ sidecars) → `docs/archived-assets/ogg-orphans/`.
`audio.ts` monta URL sempre com `.mp3`; os OGG nunca foram referenciados.

### 2.5 `music/` — 3 MP3 (4,19 MB) — 🔴 NÃO CONSUMIDOS

| Arquivo | Duração | Pedido | Observação |
| :--- | ---: | ---: | :--- |
| `ambient-wasteland-wind-loop.mp3` | 61,07 s | 60 s | Loop ambiente principal |
| `ambient-bunker-drone-loop.mp3` | 62,75 s | 60 s | Reserva Fase 4 (D-12.6) |
| `combat-percussion-stinger.mp3` | **58,49 s** | 10 s | Não é stinger — cortar na 1.11.4 |

`lyria-3.5`, 192 kbps stereo 44,1 kHz. `audio.ts` não tem `playMusic` (ALTO-05).

### 2.6 `video/` — pendente (Lote 3)

Pasta inexistente. Caminho de geração em validação (`interactions`/`output_video`);
fallback Ken-Burns já implementado na landing (S13).

### 2.7 `icons/` e `lore/`

- `icons/` — 4 SVG 24×24 (Lote 1). **Não referenciados**: `icons.ts` inlina os vetores (MED-08.3).
- `lore/` — `era-1-lore.json` a `era-4-lore.json` (`gemini-2.5-flash`), 5,9 KB.

## 3. Dívidas e riscos (com IDs)

| ID | Item | Ação |
| :--- | :--- | :--- |
| ALTO-05 | Música nunca tocada; stinger de 58 s; 192 kbps pesado | Fase 1.11.4 |
| MED-08.3 | 4 SVG órfãos; 7 retratos de reserva não marcados antes (agora marcados aqui) | Decidir uso ou remoção |
| MED-08.4 | 31 MB de masters — decisão de versionamento no Git | Sessão 13 (recomendação: versionar) |
| — | Licença dos GLB não confirmada arquivo a arquivo | `LICENSES/ASSETS.md` §1 |
| — | Origem das texturas PBR | `LICENSES/ASSETS.md` §2 |
| — | 4 JPG legados (3,4 MB) | Remover quando WebP estável |

---
*Registro original assinado por:*
- **Harness/Agente**: Kimi Code CLI
- **Modelo LLM**: Kimi
- **Timestamp**: 2026-09-10T05:51:59.418Z

*Reconciliado com o disco por (ALTO-04):*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-10T22:40:00-03:00
