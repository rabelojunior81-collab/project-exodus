# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Adicionado (Sessão 13)
- Repositório público `project-exodus` sob MIT (código) — baseline `924c111`, tag `v0.1.0-fase-1.7`.
- README bilingue (PT-BR/EN) em formato de landing, `LICENSES/ASSETS.md`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md` e templates de issue/PR.
- Landing page em `landing/` (vídeo do herói, i18n PT/EN, áudios do jogo, eras e facções),
  publicada por GitHub Actions no GitHub Pages.
- Marca e banner vetoriais próprios (`docs/media/mark-exodus.svg`, `banner-exodus.svg`).
- Skill `grill-me` em `.kilo/skill/grill-me/SKILL.md` para sessões de decisão.
- Gate `tools/verify-manifest.mjs` (MANIFEST × disco) e script de recuperação de vídeo
  (`npm run video:download` no studio).

### Corrigido (Sessão 13)
- **CRIT-02**: carimbo de build agora vem de `__BUILD_STAMP__` injetado em tempo de build
  (antes: `document.lastModified`, que exibia a hora do teste).
- **ALTO-04**: `MANIFEST.md`/`ATTRIBUTION.md` reconciliados com o disco; 3 `.ogg` órfãos arquivados.
- Vídeo do Lote 3 recuperado da Files API do Gemini antes do expiry e integrado ao jogo
  (`client/public/assets/video/era-1-transition.mp4`) e à landing.
- Mídia da landing otimizada de PNG para WebP (~10 MB → ~750 KB).

### Adicionado (Sessão 16)
- **Sub-fase 2.6.2 — paridade de modelo no servidor**: custos de treino debitados (reembolso
  integral no cancelamento), teto populacional global (20), comando `CANCEL_TRAIN` no protocolo
  **v2**, tesouro inicial do shared no cenário padrão e tempos de treino derivados de
  `TRAINING_SPECS × TICK_RATE` (drone e mech treináveis). Suíte do servidor: **51 asserts**.

### Adicionado (Sessão 15, continuação)
- `docs/knowledge/agentic-play-protocols.md` — base de conhecimento sobre MCP (spec 2026-07-28,
  extensões Tasks/Skills/Apps), ACP, A2A (v1.0), WebMCP (W3C CG) e AG-UI, com versões de SDK
  verificadas no npm e mapa necessidade↔protocolo para jogabilidade por agentes.
- `docs/specs/05-agentic-play.md` — Fase 6: CLI, servidor MCP, WebMCP e agente vs agente (A2A),
  com gates e modelo de segurança (chat como entrada não-confiável).
- `docs/specs/04-comunicacao-entre-jogadores.md` — sub-fase 3.4: chat ALL/TEAM, 12 taunts com voz
  PT-BR, pings/flares e rate limits no servidor.

### Refatorado (Sessão 15)
- Novo workspace `@project-exodus/shared` (Fase 2.6.1): `protocol`, `units`, `economy` e `world`
  como fonte única entre cliente e servidor, com tipos canônicos (`UnitType` 5, `BuildingType` 3),
  stats, custos, tempos, recursos e layout do mundo. Divergência entre os lados agora é erro de
  compilação. Consumo via `dist`; prescripts garantem o build. Zero mudança de comportamento.

### Adicionado (Sessão 14)
- **Física de colisão** (Fase 1.12, `docs/specs/03-colisao-e-obstaculos.md`): unidades não
  atravessam construções, veios nem props sólidos — deslize, desvio frontal determinístico,
  parada encostada, separação unidade×unidade, penalidade de declive e limites de mundo.
  Cliente (`engine/collision.ts`) e servidor (`advance()` com projeção + veios) em paridade.
- Harness `tools/visual-check/collision-e2e.mjs` e 4 asserts novos na suíte do servidor
  (total: 43 asserts).

### Planejado
- Fase 1.11 — Remediação e hardening (gate negativo do CRIT-02, áudio da 1.7E, CI de gates)
- Fase 2.6 — Reconciliação cliente↔servidor (`shared/`, absorve a colisão no 2.6.3)
- Fase 3 — Multiplayer LAN/Tailscale

## [0.1.0] — 2026-09-10

Baseline público do projeto na Fase 1.7 ("Mundo Vivo").

### Adicionado
- Monorepo npm workspaces: `client/` (Three.js 0.174 + Vite 6 + TS), `server/` (simulação autoritativa 20 Hz + WebSocket), `tools/studio-gemini` (pipeline de assets via Gemini API) e `tools/visual-check` (harness Playwright).
- Motor 3D: câmera ortográfica isométrica RTS, terreno procedural com splat blending tri-textura, iluminação PBR, 9 modelos GLTF com animação esquelética.
- Jogabilidade: seleção única e em caixa, ordens Mover/Parar/Patrulha/Reunião/Dispersar, coleta com FSM e depleção em 4 estágios, treino de 5 unidades com custo/tempo/população, fog of war 90×90, minimapa funcional, HUD desktop/mobile.
- Servidor determinístico: tick fixo de 50 ms, A* 8-direcional com heap binário, economia de 4 recursos, protocolo versionado com validação e testes (39 asserts).
- Pipeline de assets: retratos (17 WebP), TTS PT-BR (16 MP3), música (3 faixas), lore das 4 eras, sidecars `.meta.json` de proveniência.
- Governança: `AGENTS.md`, `estate.md`, `handoff.md`, `roadmap.md`, spec 01/02, journal append-only (18 entradas).
- Harness visual: `test-buttons`, `gather-e2e`, `dist-proof`, `measure-facing` — validação por cliques reais e medição 3D.

### Conhecido
- Cliente e servidor ainda não estão conectados (Fase 2.6); combate e eras chegam nas fases 4–5.
- Sem repositório Git antes deste baseline (corrigido neste commit).
