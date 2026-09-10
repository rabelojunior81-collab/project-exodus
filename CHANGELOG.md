# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Planejado
- Fase 1.11 — Remediação e hardening (git, build stamp, manifestos, áudio da 1.7E, vídeo do Lote 3)
- Fase 2.6 — Reconciliação cliente↔servidor (workspace `shared/`, paridade de modelo, snapshots)
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
