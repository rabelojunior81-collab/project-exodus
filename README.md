<div align="center">

![Project Exodus — RTS pós-apocalíptico](docs/media/banner-exodus.svg)

**RTS pós-apocalíptico de navegador. Simulação determinística a 20 Hz. Multiplayer LAN/Tailscale.**

[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-f59e0b?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.174-000000?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-5FA04E?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PRs bem-vindas](https://img.shields.io/badge/PRs-bem--vindas-22d3ee?style=flat-square)](CONTRIBUTING.md)
[![Fase](https://img.shields.io/badge/rota-Fase%201.7%20%2B%20hardening-f59e0b?style=flat-square)](roadmap.md)

**Português** · [English](README.en.md)

</div>

---

As IAs rebeldes caíram — e levaram o mundo junto. No Ano 47 Pós-Colapso, a humanidade
recomeça da pedra lascada tecnológica: desmonta drones com as próprias mãos, reza para
antenas mudas e derrete o passado para forjar o próximo passo.

**Project Exodus é um RTS de navegador** com mecânicas de *Age of Empires 2* (economia,
eras, base building) e assimetria de *StarCraft* (três facções com identidades próprias),
renderizado em Three.js — sem instalar nada.

O diferencial está embaixo do capô: um **servidor autoritativo determinístico** (20 Hz,
tick fixo, RNG semeável, A* próprio) projetado para partidas **LAN e Tailscale**.
Sem cloud. Sem matchmaking. Sem telemetria. Local-first por escolha.

> **Status honesto:** vertical slice jogável. Economia, coleta, treino, fog of war,
> câmera, seleção e HUD funcionam de ponta a ponta; **combate, eras jogáveis e
> multiplayer chegam nas fases 4–5**. Ver [roadmap](roadmap.md).

## Ver o jogo

| Base e cenário vivo | Mineração viva |
| :---: | :---: |
| ![Visão geral da base](tools/visual-check/shots/01-overview.png) | ![Colheita com faíscas e pulso no veio](tools/visual-check/shots/17d-harvest-fx.png) |
| **Blindado articulado em curva** | **Fog of War + minimapa** |
| ![Blindado calibrado virando](tools/visual-check/shots/17c-b1-tank-turning.png) | ![Minimapa coberto pela névoa](tools/visual-check/shots/fog-c-minimap.png) |

O HUD completo, em desktop e celular: [shots 07–16](tools/visual-check/shots/) ·
Mais medições visuais em [`tools/visual-check/`](tools/visual-check/).

## Rodar localmente

Requisitos: **Node.js 22+** e npm.

```bash
git clone https://github.com/rabelojunior81-collab/project-exodus.git
cd project-exodus
npm install          # instala os 3 workspaces
npm run dev:client   # abre http://localhost:5173
```

Servidor autoritativo (existe e é testado; o cliente ainda não fala com ele — Fase 2.6):

```bash
npm run dev:server   # WebSocket em ws://localhost:8080
npm test             # 43 asserts da simulação
```

## O que está jogável hoje

- Câmera RTS isométrica completa (pan, edge pan, zoom 9–110, rotação, minimapa clicável);
- Seleção unitária e em caixa com prioridade tática; ordens Mover / Parar / Patrulha / Reunião / Dispersar;
- Ciclo econômico: 8 veios, coleta com 4 estágios de depleção, entrega no Centro de Comando;
- Treino de 5 unidades com custo, tempo, fila, população (20) e reembolso no cancelamento;
- Fog of War client-side (grade 90×90), HUD desktop/mobile, áudio PT-BR por barramento;
- Cenário procedural determinístico (365 props instanciados, seed fixa) e 9 modelos GLTF animados.

**Ainda não está jogável:** combate, construção pelo jogador, transições de era, condição de
vitória e multiplayer. O servidor determinístico existe e passa 43 asserts — a reconciliação
cliente↔servidor é a próxima fase (2.6). Detalhes e decisões abertas em
[`docs/specs/02-integracao-cliente-servidor.md`](docs/specs/02-integracao-cliente-servidor.md).

## Por dentro

```text
client/   Three.js 0.174 + Vite 6 + TypeScript — jogo, HUD e seleção
server/   Node + ws — simulação autoritativa 20 Hz, A*, FSM de coleta
tools/    studio-gemini (pipeline de assets) + visual-check (harness Playwright)
docs/     specs (SDD) · journal (DDD) · knowledge · mídia
```

| Sistema | Como funciona |
| :--- | :--- |
| Simulação | Tick fixo de 50 ms, ids ordenados, RNG semeável — mesma seed + mesmos comandos = mesmo resultado (provado por teste) |
| Pathfinding | A* 8-direcional, heap binário determinístico, custo de cratera até 5×, suavização por linha de visada |
| Economia | 4 recursos: Ração/Água, Sucata, Chips de IA, Concreto |
| Cliente 3D | Splat blending tri-textura, fog of war em shader, partículas, animação esquelética |
| Assets | Pipeline Gemini com sidecar `.meta.json` de proveniência e masters preservados |

## Áudio e narrativa

O jogo tem briefings de era narrados em PT-BR, voice-lines por unidade e trilha ambiente —
gerados pelo pipeline próprio em `tools/studio-gemini`. O GitHub não reproduz áudio inline;
ouça na [landing page](landing/) ou direto: [`era-1-briefing.mp3`](client/public/assets/audio/era-1-briefing.mp3).

As crônicas das 4 eras estão em [`client/public/assets/lore/`](client/public/assets/lore/).

## Roadmap

- [x] **Fase 0–1** — Governança, motor 3D, câmera isométrica, seleção RTS
- [x] **Fase 1.5–1.10** — Modelos GLTF reais, HUD profissional, economia jogável, auditoria
- [x] **Fase 1.7** — Mundo vivo: cenário denso, fog of war, mineração viva, assets Gemini
- [ ] **Fase 1.11** — Remediação e hardening (build stamp, manifestos, áudio, vídeo)
- [ ] **Fase 2.6** — Reconciliação cliente↔servidor (workspace `shared/`, paridade, snapshots)
- [ ] **Fase 3** — Multiplayer LAN/Tailscale
- [ ] **Fase 4** — Eras, narrativa reativa, bunkers arqueológicos
- [ ] **Fase 5** — Combate, facções assimétricas, polimento

Detalhe completo em [`roadmap.md`](roadmap.md). O processo de desenvolvimento (decisões,
auditorias, post-mortems) está no diário aberto em [`docs/journal/`](docs/journal/).

## Contribuindo

Contribuições são bem-vindas. Leia [`CONTRIBUTING.md`](CONTRIBUTING.md) e o
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). O essencial:

1. Abra uma issue antes de PRs de comportamento (correções pequenas podem vir direto);
2. Commits no padrão [Conventional Commits](https://www.conventionalcommits.org/);
3. Todo PR precisa dos gates verdes: `npx tsc --noEmit` nos 3 workspaces,
   `npm test` no server e `node tools/visual-check/test-buttons.mjs`;
4. Nunca commite chaves: `.env` é protegido; asset novo precisa de sidecar e de entrada no MANIFEST;
5. Mudança estrutural atualiza os documentos vivos (`estate.md`, `handoff.md`, journal).

## Licença

**Código:** [MIT](LICENSE) — use, modifique, distribua.
**Assets** (modelos, retratos, áudio, música, lore): licenças próprias, créditos e pendências
em [`LICENSES/ASSETS.md`](LICENSES/ASSETS.md). Modelos base [Quaternius](https://quaternius.com/)
(CC0), animações Mixamo (termos Adobe), arte e áudio gerados pela pipeline Gemini deste projeto.

---

<div align="center">

![Marca Project Exodus](docs/media/mark-exodus.svg)

**Rabelus Lab** · [rabelus.com](https://rabelus.com) · [rabelo.work@gmail.com](mailto:rabelo.work@gmail.com)

*AI-Born Engineer, not merely AI-assisted.*

</div>
