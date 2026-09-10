# estate.md — Estado Vivo do Sistema

> **Última Atualização**: 2026-09-10T20:45:00-03:00  
> **Status Geral**: Fases 1.11 (hardening, em curso) e **1.12 (colisão, entregue)** — repo público com landing ao vivo, CRIT-01/02 e ALTO-04 fechados, vídeo do Lote 3 recuperado, e unidades que não atravessam mais construções/veios/props (cliente + servidor).
> **Próximo passo obrigatório**: iniciar a **Fase 2.6** pela sub-fase **2.6.1** (workspace `shared/`), com o spec 02 **APROVADO** (5/5 decisões em A/A/A/A/A). Ver `handoff.md`.

---

## 1. Visão Executiva do Estado Atual
O motor gráfico 3D Three.js do cliente web possui câmera tática isométrica (WASD, edge pan, rotação Q/E em 45°, zoom suave), terreno PBR procedural com splat blending tri-textura e iluminação solar desértica, escombros de concreto e vigas metálicas, sistema de seleção única e em caixa arrastável (box selection), HUD tático pós-apocalíptico com ícones SVG vetoriais, retratos fotorrealistas, minimapa interativo, menu principal AAA com scanlines e vignette, tela de carregamento com radar holográfico, e modais de Lore e Controles.

**9 modelos GLTF reais** estão integrados com animações esqueléticas (Soldier.glb, Character.glb com Idle/Walk/Run/Shoot). A **Sessão 4** (CRÍTICA) descobriu que o "Hips fix" da Sessão 2 **era o bug**: o valor Z do Hips em bone-local é a altura do quadril (~106cm Mixamo), e subtraí-lo enterrava o Soldier 1.5m. Fix revertido; Soldier validado em pé (minY = pos.y, screenshots). Facing calibrado por tipo via medição de matrizes. Compilação limpa nos dois workspaces.

**Mundo Vivo (Fase 1.7, Sessões 9–10)**: cenário denso com `props.ts` (10 famílias, 365 instâncias InstancedMesh, PRNG seedado, exclusões núcleo/veios), relevo com +2 crateras e dunas; **Fog of War client-side** (`fog-of-war.ts`, grade 90×90 de 2m, estados desconhecido/explorado/visível, shroud shader com blur, minimapa coberto, visão por tipo); **duas unidades novas** calibradas por medição (Droide de Manutenção ~1.8m coletor 2× lento; Mech Bípede ~4.5m desarmado até a Fase 5) + articulações (torreta/canhão do blindado com mola e scan idle, topo da torreta do bunker, radar do CC); **mineração viva**: depleção dos veios em 4 estágios, pulso emissivo + faíscas no veio trabalhado (fog-gated), caixa de carga + 10% de slow no coletor, entrega com burst de partículas, texto flutuante `+10` e flash na topbar.

**Sessão 11 (Governança e Diagnóstico de Provider, 10/09 11:45 BRT)**: telemetria da sessão ativa extraída do `wire.jsonl` (14 turnos, 27.304.710 tokens, alternância entre `ollama-cloud/kimi-k3` e `opencode-go/kimi-k2.7-code`); diagnóstico de limite da Ollama Cloud via API autenticada — conta `firebird81` retornou 429 "session usage limit" no plano legado Pro ($20/mês) ao tentar usar `kimi-k3`; confirmado que Ollama Cloud não expõe endpoints `/usage` ou `/billing` via API. Documentação desta sessão atualizada para retomada futura por qualquer harness/LLM.

**Sessão 12 (Auditoria Holística de Retomada, 10/09 12:30 BRT)**: exploração completa dos 421 arquivos fora de `node_modules` com **re-execução real de todos os gates** (11 gates, todos verdes: tsc×3, 39 asserts do servidor, test-buttons 10/10, gather-e2e, dist-proof 11/8/0, varredura de segredo, sincronia public↔dist, paridade de coords, determinismo dos props). O `handoff.md` da Sessão 11 foi confirmado honesto — nenhuma alegação de gate se mostrou falsa. Em contrapartida, a auditoria encontrou **2 achados críticos** (ausência total de controle de versão; carimbo de build que é placebo e nunca detectou cache), **3 altos** (Fase 2.6 é reconciliação e não integração — 5 eixos de divergência cliente↔servidor; MANIFEST/ATTRIBUTION contradizem o disco quanto à música; 4,19 MB de música em produção nunca tocada, com "stinger" de 58 s) e **9 médios/baixos**. Relatório completo, com evidência reproduzível por achado e matriz de remediação priorizada, em `docs/journal/2026-09-10_12-30_sessao-12-auditoria-holistica.md`. Spec da Fase 2.6 Expandida criada em `docs/specs/02-integracao-cliente-servidor.md` (RASCUNHO, 5 decisões abertas).

**Sessão 13 (Repositório Público, README e Landing, 10/09 23:10 BRT)**: o projeto ganhou controle de versão e presença pública — repositório `project-exodus` (público, MIT no código), baseline de 321 arquivos (`924c111`) e tag `v0.1.0-fase-1.7`. README bilingue (PT-BR/EN) em formato de landing com badges, screenshots e áudio; arquivos de comunidade completos (CONTRIBUTING/COC/SECURITY/CHANGELOG/templates). Landing page própria em `landing/` (estilo modernity-sandbox, PT/EN via `?lang=en`) publicada por GitHub Actions — Pages estava em modo legacy e foi migrado. **Ao vivo**: https://rabelojunior81-collab.github.io/project-exodus/ **Descoberta**: o vídeo do Lote 3 existia na Files API do Gemini (o piloto salvara o metadata JSON no lugar do MP4); recuperado a tempo do expiry (12/09) e integrado mudo à landing (`hero.mp4` + pôster). ffmpeg (`ffmpeg-static`) validado e usado para converter a mídia da landing de PNG a WebP (~10 MB → ~750 KB). CRIT-02 corrigido no código (`__BUILD_STAMP__` via `define` do Vite; gate negativo pendente); ALTO-04 fechado (`MANIFEST` reconciliado ao disco, `ATTRIBUTION` corrigido, 3 `.ogg` órfãos arquivados, gate `tools/verify-manifest.mjs` criado). Skill `grill-me` instalada para conduzir as decisões do spec 02. Ver `docs/journal/2026-09-10_23-10_sessao-13-repositorio-publico-landing.md`.

**Sessão 14 (Colisão e Obstáculos, 10/09 20:45 BRT, mesma noite)**: diretiva do usuário na sessão de decisões — *unidades não podem atravessar coisas como hologramas*. Entregue a **Fase 1.12**: `engine/collision.ts` (círculos, projeção com deslize, desvio frontal determinístico, separação unidade×unidade, declive, limites de mundo), props sólidos por família (~225 círculos; finos decorativos), integração no `unit.ts`/`main.ts` e paridade no servidor (`advance()` projeta construções + veios; veios fora do A* para não regredir a coleta). Gates: `collision-e2e.mjs` com números exatos (minDistCC **8,700** = contato; parada no veio **3,101**; 0 pageerrors), suíte do servidor em **43 asserts** (4 novos; determinismo e 387 ticks da FSM intactos), `gather-e2e` e `test-buttons` 10/10 sem regressão, `dist-proof` 11/8/0, build 688,92 kB. Spec nova: `docs/specs/03-colisao-e-obstaculos.md`; migração para `shared/` fica com o 2.6.3 (1.12.4). Ver `docs/journal/2026-09-10_20-45_sessao-14-colisao-e-obstaculos.md`. No mesmo turno, a sessão `grill-me` **fechou as 5 decisões da Fase 2.6** — escolhas **A/A/A/A/A** (tempos do cliente; coleta incremental recalibrada; física migra com colisão; fog client-side com gancho `viewFor`; sem predição) — e o **spec 02 foi promovido a APROVADO**, desbloqueando a fase. Ver `docs/journal/2026-09-10_20-55_sessao-14-decisoes-2.6.md`.

---

## 2. Subsistemas e Status de Maturidade

| Subsistema | Componente | Status | Testes / Gates | Observações |
| :--- | :--- | :--- | :--- | :--- |
| **Governança** | Documentos Vivos (AGENTS, estate, handoff, roadmap, journal) | 🟢 Atualizado | Assinaturas por sub-fase | **Repositório público `project-exodus`** — CRIT-01 fechado na S13 (baseline `924c111`, tag `v0.1.0-fase-1.7`) |
| **Specs (SDD)** | `docs/specs/` | 🔴 Dívida | 3 specs / ~16 módulos | `AGENTS.md` §2.B não cumprido desde a Fase 1.5 (MED-09); spec 02 criada na S12 |
| **Câmera RTS** | Ortográfica (zoom 9–110, alvo segue relevo, bounds ±80) | 🟢 Útil perto/longe | Config validada em código |
| **Minimap** | Thumbnail do relevo + clique câmera + right-click ordem + pings | 🟢 Funcional | Teste MINIMAP_CLICK 53.5≈54 |
| **Legibilidade** | Névoa 0.0032, hemisfério, exposição 1.55, HP bars 3D, anéis opacos | 🟢 Revisado em shots | Unidades distinguíveis |
| **Economia** | 8 veios visuais + COLETAR + FSM entregar + topbar viva | 🟢 Jogável | e2e real sucata 180→190 | Client-side até 2.6 |
| **Ordens/botões** | Mover/Parar/Patrulha/Reunião/Dispersar/Recrutar/Coletar (7 testes de clique PASS) | 🟢 Funcionais | test-buttons + gather-e2e | Ataque/defesa → Fase 5 |
| **HUD visual** | Reskin floating glass + anéis finos + build stamp | 🟢 Revisado dev+prod | Shots 15/17 | Mobile intacto |
| **Build prod** | `client/dist/` atualizado a cada sub-fase | 🟢 Prova OK, carimbo honesto | 11 entidades, 8 nós, 0 pageerrors | Carimbo via `__BUILD_STAMP__` compilado no build (CRIT-02 fechado na S13: literal no bundle + `dist-proof`) |
| **Harness / Build** | tsc 0 + visual-check (6 scripts) + builds renovados (client/server/gemini) | 🟢 Operacional | Boot 9/9 pós-rename |
| **Ativos** | 19 arquivos kebab-case; órfãos em `docs/archived-assets/` + README | 🟢 Normalizado | MANIFEST com adendo |
| **Cenário vivo** | `props.ts` — 10 famílias/365 instâncias InstancedMesh, PRNG seedado, exclusões núcleo+veios | 🟢 Em cena | Shots 1.7A revisados; dist-proof | Sem `Math.random` |
| **Fog of War** | `fog-of-war.ts` — grade 90×90 (2m), shroud shader y=7 + blur, minimapa coberto | 🟢 Funcional | Shots fog-a/b/c; fog gate nos veios | Client-side até 2.6 |
| **Mineração viva** | Depleção 4 estágios + pulso/faíscas fog-gated + carga/slow + burst `+10` | 🟢 Funcional | Shots 17d-*; pulso 0.71, 9 partículas vivas | Áudio real via `audio.ts` (1.7E) |
| **API Gemini / Assets** | `tools/studio-gemini` + geradores + `MANIFEST.md` + `ATTRIBUTION.md` | 🟡 Lotes 1/2/2b entregues; Lote 3 pendente; **manifestos desatualizados** | 17 WebP, 4 SVG, 16 MP3, 3 MP3 música; tsc 0; **public/assets 22,21 MB em 78 arquivos** (MANIFEST diz 18,02 MB / 75 — ALTO-04) | Vídeo não gerado; música **nunca tocada** (sem `playMusic`, ALTO-05) |
| **Motor 3D** | `client/` (Three.js PBR, Câmera Isométrica RTS) | 🟢 Operacional | FPS **não medido** (D-12.5) | Harness roda em swiftshader (~3,4 FPS); 60 FPS exige playtest com GPU real |
| **Modelos GLTF** | `ModelManager` + 9 modelos kebab-case em `public/assets/models/` | 🟢 Validado em cena | Hips-fix revertido; facing por tipo; tank 0.38; Sword oculta | Boot 9/9 pós-rename |
| **Física locomoção** | `unit.ts` (yawOffset, aceleração, alinhamento) | 🟢 Calibrado | Tank: giro 2.2rad/s, inércia 5/s², tração só alinhado; infantaria ágil | Teste de movimento no harness |
| **Harness visual** | `tools/visual-check/` (Playwright + Chromium + `__rts`) | 🟢 Operacional | Screenshots + medições Box3 + sweep de escala | `node check.mjs` (~3min) |
| **HUD / UI** | Menu, Loading, HUD reskin, feed eventos, minimapa funcional, mobile | 🟢 Profissional | tsc 0; shots desktop+mobile+prod | Ordens reais (client-side até 2.6) |
| **Seleção RTS** | `selection.ts` (Raycast + Box Selection + Move Command) | 🟢 Operacional | Seleção e movimentação funcionando | Waypoints animados de comando |
| **Texturas PBR** | 5 texturas fotorrealistas + splat shader customizado | 🟢 Operacional | Terreno sem repetição visível | Splat blending tri-textura no fragmentShader |
| **Simulação RTS** | `server/` (loop 20Hz, protocolo, A*, recursos, worker FSM) | 🟢 Testada, 🔴 **desconectada** | 43 asserts OK, determinística, colisão em runtime (S14) | Cliente tem **zero** WebSocket; servidor nunca faz broadcast de snapshot; 5 eixos de divergência (ALTO-03) |
| **Multiplayer** | WebSocket Hub (LAN / Tailscale Tailnet) | ⚪ Não Iniciado | Fase 3 | Portas 8080 e 5173 abertas |

---

## 3. Arquivos de Código Fonte e Seus Papéis

| Arquivo | Responsabilidade |
| :--- | :--- |
| `client/src/main.ts` | Orquestrador central: cena, renderer, iluminação, câmera, HUD, seleção, minimapa, loop de animação e fluxo Menu → Loading → Game |
| `client/src/engine/camera.ts` | Controlador de câmera ortográfica isométrica com WASD, edge pan, zoom, rotação Q/E, middle-mouse drag |
| `client/src/engine/terrain.ts` | Terreno procedural com relevo, crateras, platô militar (r<30), splat shader tri-textura, escombros |
| `client/src/engine/selection.ts` | Sistema RTS: raycasting, box selection (marquee), comando de movimento (right-click), waypoints visuais |
| `client/src/engine/models.ts` | Singleton ModelManager: GLTFLoader, cache, SkeletonUtils.clone, AnimationMixer, mapeamento semântico de clipes |
| `client/src/engine/props.ts` | Cenário procedural: 10 famílias de props instanciadas (InstancedMesh, PRNG seedado, exclusões) |
| `client/src/engine/fog-of-war.ts` | Fog of War: grade 90×90, shroud shader com blur, consultas isVisibleAt/isExploredAt |
| `client/src/fx/particles.ts` | Pool de partículas (bursts + emissores contínuos) e textos flutuantes (+10) sem dependências |
| `client/src/engine/textures.ts` | Classe utilitária AssetMaterials para materiais PBR (bunker_concrete, rusted_metal) |
| `client/src/engine/audio.ts` | Áudio real com buses SFX/Voice/Music; `playSelect`, `playCommand`, `playEffect`, `playBriefing` funcionam; música ainda não tem gatilho de gameplay |
| `client/src/entities/unit.ts` | Entidade Unit (SCAVENGER_WORKER, RUST_RAIDER, SCRAP_BUGGY): modelo GLTF, movimentação, rotação, animação |
| `client/src/entities/building.ts` | Entidade Building (COMMAND_CENTER, BUNKER_TURRET, SCRAP_REFINERY): modelo GLTF, torreta rotativa, fumaça |
| `client/src/entities/types.ts` | Interfaces compartilhadas (SelectableEntity, EntityCategory, FactionType) |
| `client/src/ui/hud.ts` | Controlador do HUD: recursos, população, era, painel de seleção com portraits, comandos contextuais |
| `client/src/ui/icons.ts` | Biblioteca de ícones SVG vetoriais militares (15 ícones: recursos, ações, interface) |
| `client/index.html` | Estrutura HTML completa: menu principal, modais, tela de loading, HUD in-game, canvas Three.js |
| `client/src/index.css` | CSS completo: ~700 linhas de estilos para menu, HUD, modais, animações, scanlines, responsividade |
| `server/src/index.ts` | Servidor WebSocket básico com loop de simulação a 20Hz (esqueleto pronto para Fase 2) |

---

## 4. Assets e Recursos

> **Reconstruído por leitura de disco na Sessão 12.** A versão anterior desta seção era anterior à normalização kebab-case da Sessão 10 e ao Lote 1 da 1.7E: listava nomes PascalCase/snake_case já inexistentes, duplicava três linhas de building, e contava `Tank.glb`/`Combat_Rover.glb`/`Mech_Mike.glb` como se estivessem em `public/assets/models/` quando foram arquivados na Sub-fase 1.10.2. Achado ALTO-04b.

### 4.1 Modelos 3D GLTF — `client/public/assets/models/` (9 arquivos, 7,61 MB)

Todos os 9 estão registrados em `models.ts:44-52` e carregados no boot (prova: dist-proof 9/9).

| Arquivo | Tamanho | Chave | Uso em cena | Animações |
| :--- | ---: | :--- | :--- | :--- |
| `soldier.glb` | 2.110 KB | `soldier` | RUST_RAIDER (2,6 m, yaw π) | Idle, Walk, Run — **sem** Hips-fix (era o bug, S4) |
| `building-1-large.glb` | 1.893 KB | `command_center` | COMMAND_CENTER (escala 2.2, ~25 m) | — |
| `character.glb` | 850 KB | `character` | SCAVENGER_WORKER (2,1 m, yaw 0) | Idle_Neutral, Run, Walk, Gun_Shoot (Sword degenerada oculta) |
| `combat-tank.glb` | 817 KB | `tank` | SCRAP_BUGGY (escala 0.38 ≈ 8,4 × 2,85 m, yaw +π/2) | Tank_Forward→run, Tank_Backwards→walk |
| `building-2-large.glb` | 616 KB | `refinery` | SCRAP_REFINERY (escala 1.7) | — |
| `enemy-2-legs.glb` | 550 KB | `mech_2legs` | BIPED_MECH (~4,5 m, instanciado na 1.7C) | Sim |
| `robot-expressive.glb` | 453 KB | `robot` | MAINTENANCE_DRONE (~1,8 m, instanciado na 1.7C) | Sim |
| `building-4.glb` | 416 KB | `bunker` | BUNKER_TURRET (escala 1.3) | — |
| `turret-gun-double.glb` | 83 KB | `turret` | montada no bunker a 6,9 m (escala 2.6) | — (rotação por código) |

**Arquivados** em `docs/archived-assets/` (S1.10.2, fora do bundle): `Mech_Mike.glb` (2,8 MB, nunca referenciado), `Tank.glb` (60 KB, substituído por `combat-tank.glb`), `Combat_Rover.glb` (29 KB, exige DRACOLoader — falha silenciosa → unidade invisível). `Mech_Stan.glb` foi **deletado** na S3 (corrompido, 470 bytes).

### 4.2 Texturas PBR — `client/public/assets/textures/` (5 arquivos, 5,85 MB)
`terrain-diffuse.jpg` (1,2 MB), `rocky-gravel.jpg` (1,2 MB), `rust-sand.jpg` (1,3 MB) — splat tri-textura do terreno.
`bunker-concrete.jpg` (1,1 MB), `rusted-metal.jpg` (1,1 MB) — escombros e veios de sucata.

### 4.3 Retratos — `client/public/assets/portraits/` (33 arquivos, 3,80 MB)
- **17 WebP 512×512 + 12 thumbs 128px** (Lote 1, `gemini-2.5-flash-image`, com sidecar `.meta.json`).
- **Em uso hoje** via `hud.ts:275-306`: `unit-command-center`, `unit-bunker-gunner`, `unit-scrap-buggy`, `unit-maintenance-drone`, `unit-biped-mech`, `era-1-scavenger`.
- **Reserva declarada** (geradas, ainda sem contexto de gameplay): `era-2-settler`, `era-3-engineer`, `era-4-cyber-adept` → Fase 4 (eras); `hero-orden-warden`, `hero-scrapper-marshal`, `hero-silicio-prophet`, `pilot-hero-scrapper-marshal` → Fase 5 (facções/heróis).
- **4 JPG legados** (~860 KB cada, 3,4 MB no total) mantidos apenas como `fallback` dos `<img>`: `scavenger.jpg`, `soldier.jpg`, `buggy.jpg`, `command-center.jpg`. Pesam **90 % da pasta** para servir de rede de segurança a WebP de ~20 KB — candidatos a remoção assim que o WebP for considerado estável (BAIXO, não auditado como achado próprio).

### 4.4 Áudio — `client/public/assets/audio/` (19 arquivos, 780 KB)
16 MP3 64 kbps mono 22,05 kHz (Lote 2, TTS): 5 `unit-select-*`, 5 `unit-move-*`, 4 `era-N-briefing`, 2 `alert-*`. Mais 3 `.ogg` residuais de teste (`unit-move-raider`, `unit-move-scavenger`, `unit-select-buggy`) que **não são referenciados** — `audio.ts` monta a URL sempre com `.mp3`.

### 4.5 Música — `client/public/assets/music/` (3 arquivos, 4,19 MB) — 🔴 **NÃO CONSUMIDA**
`ambient-wasteland-wind-loop.mp3` (61,07 s), `ambient-bunker-drone-loop.mp3` (62,75 s), `combat-percussion-stinger.mp3` (58,49 s — pedido como 10 s). Todas 192 kbps stereo 44,1 kHz, `lyria-3.5`, 10/09 03:31. Ver ALTO-05.

### 4.6 Ícones e Lore
- `icons/` — 4 SVG (1,2 KB) **não referenciados**: `icons.ts` inlina os SVGs como strings (MED-08.3).
- `lore/` — `era-1-lore.json` a `era-4-lore.json` (5,9 KB), `gemini-2.5-flash`.
- `favicon.svg` (243 B).

### 4.7 Masters — `tools/studio-gemini/masters/` (31 MB, fora do bundle)
16 PCM do TTS, 13 JPG de retrato, 3 MP3 de música. Originais para re-encode sem novo custo de API. Ver MED-08.4.

---

## 5. Dívidas Técnicas, Bloqueios e Riscos Conhecidos

### Bugs Ativos
1. 🟢 **Rotação — RESOLVIDO POR TIPO (Sessão 4)**: o `+PI` global estava certo só p/ Soldier. Medição de facing (visor/cano/pés vs corpo, `measure-facing.mjs`): Soldier −Z → PI; Character +Z → 0; Combat_Tank cano −X → +PI/2. `yawOffset` por tipo em `unit.ts`.
2. 🟢 **Soldier enterrado — CAUSA RAIZ ENCONTRADA (Sessão 4)**: o "Hips fix" da Sessão 2 subtraía a ALTURA do quadril (~106cm bone-local), afundando o modelo 1.47m. Revertido; validado minY = pos.y em platô e colina + screenshots.
3. 🟢 **Tank gigante → proporção final (Sessão 4)**: sweep 0.2–1.0 em cena (altura = 7.5×escala, grounding linear); fixado **0.38** (~8.4m × 2.85m). Rover descartado (Draco).
4. 🟢 **Terrain clipping (Sessão 4)**: `terrainHeight.ts` (fonte única) + assentamento em Unit/Building/rubble/waypoints. Hill-climb validado.
5. 🟢 **Sword glitch do Character (Sessão 4)**: malha 'Sword' com bbox ZERO (192 vértices coincidentes) oculta no `createInstance`.

### Validação visual (harness próprio, Sessão 4)
- Screenshots 01–05 + medições Box3 revisados pelo agente: composição coerente (tank < buildings, infantaria em pé, torreta montada).
- Playtest final in-game com o usuário pendente (facing do Gama e física do tank em movimento real).

### Dívidas Técnicas — reindexadas pela auditoria da Sessão 12

> IDs e evidência completa em `docs/journal/2026-09-10_12-30_sessao-12-auditoria-holistica.md` §3.
> Ordem de execução em §4 (Matriz de Remediação Priorizada) do mesmo documento.

**🔴 Críticas — bloqueiam qualquer feature nova**

| ID | Dívida | Evidência | Esforço |
| :--- | :--- | :--- | ---: |
| CRIT-01 | **Não existe repositório Git.** 421 arquivos, ~2 dias de construção, zero histórico/rollback/diff. Contradiz a diretiva "sem merge automático, sempre revisão manual" — não há o que revisar sem diff. | `git rev-parse` → `fatal: not a git repository` | 15 min |
| CRIT-02 | **Carimbo de build é placebo.** `main.ts:570` usa `document.lastModified`; o Vite não emite header `Last-Modified`, então o valor é sempre a hora atual. O mecanismo criado na 1.9.4 contra o bug de cache da Sessão 6 nunca foi capaz de detectá-lo. | dist congelado 12:09 → carimbo exibiu 12:30 (hora do teste) | 15 min |

**🟠 Altas — inflam ou bloqueiam a próxima fase**

| ID | Dívida | Evidência | Esforço |
| :--- | :--- | :--- | ---: |
| ALTO-03 | **Fase 2.6 é reconciliação, não integração.** 5 eixos de divergência: cliente sem WebSocket; servidor sem broadcast de snapshot; 5 unidades × 3; tempos de treino 1,6–2,0× divergentes e custo inexistente no servidor; modelos de coleta e de locomoção incompatíveis; sem workspace `shared/`. | `docs/specs/02-integracao-cliente-servidor.md` §2 | fase inteira |
| ALTO-04 | **MANIFEST/ATTRIBUTION contradizem o disco.** Ambos afirmam "música não gerada, lyria-002 404"; há 3 MP3 (4,19 MB, `lyria-3.5`) publicados. Contadores: 75 arq/18,02 MB declarados × 78 arq/22,21 MB reais. | `music/*.meta.json` × `MANIFEST.md:79-81` | 30 min |
| ALTO-05 | **4,19 MB de música em produção, nunca tocada.** `audio.ts` cria o bus `music` (gain 0,45) e não tem `playMusic`; nenhuma string `/assets/music/` no cliente. O "stinger de 10 s" tem **58,49 s**. Música a 192 kbps stereo × SFX a 64 kbps mono (5,4× mais peso que todas as 16 vozes). | `afinfo` + `grep` em `client/src` | 2–3 h |

**🟡 Médias**

| ID | Dívida | Ação |
| :--- | :--- | :--- |
| MED-06 | `window.__rts` exposto em produção com `debugAddResources` e `debugSetNodeAmount` (alteram estado de jogo) | envolver em flag `import.meta.env.DEV \|\| VITE_HARNESS` |
| MED-07 | `tsconfig.base.json` não é estendido por ninguém; o servidor (código determinístico) é o **menos** rigoroso dos três | `extends` no base + subir `noUnusedLocals/Parameters/noFallthrough` |
| MED-08.1 | `tools/studio-gemini/dist/` com duas árvores sobrepostas (01:24 e 12:09); `node dist/index.js` roda o código velho | `rm -rf dist` + `prebuild` |
| MED-08.2 | `server/tests/server_smoke.test.ts` fora do `include` do tsconfig — roda mas nunca é type-checked | mover para `src/__tests__/` |
| MED-08.3 | 4 SVG em `assets/icons/` não referenciados (`icons.ts` inlina); 7 retratos de reserva não marcados como reserva | coluna "Status: em uso / reserva Fase N" no MANIFEST |
| MED-08.4 | 31 MB de `masters/` sem decisão explícita de versionamento | versionar (geração por LLM não é reprodutível) |
| MED-08.5 | 2 processos Vite órfãos (5173 há 1d10h; 4173 há 15h) | script de start/stop no harness |
| MED-09 | **SDD não cumprido**: 3 specs para ~16 módulos, apesar do `AGENTS.md` §2.B ser mandatório | decisão D-12.1: retomar SDD a partir da 2.6 |
| — | **Lote 3 (vídeo)**: o diagnóstico do handoff ("corrigir download") está incompleto. A API `interactions`/`output_video` **existe** no `@google/genai` 2.21.0, mas `video-omni-pilot.ts:32` usa `(ai as any)` — o client instanciado provavelmente não expõe esse caminho. O script nunca completou, logo o download nunca foi exercitado. | remover o `as any` e deixar o `tsc` apontar o client correto |

**⚪ Baixas**

| ID | Dívida |
| :--- | :--- |
| BAIXO-10.1 | `Math.random()` no spawn de treino (`main.ts:207`) afeta estado de jogo — migrar ao PRNG na 2.6 |
| BAIXO-10.3 | `client` sem teste unitário (`"test": "node --version"`); toda verificação é Playwright e2e |
| BAIXO-10.4 | `tools/visual-check` não é workspace npm e é CommonJS — invisível a `npm test --workspaces` |
| BAIXO-10.5 | `setPendingOrder('gather')` chamado duas vezes (`main.ts:233` e `:235`) |
| BAIXO-10.6 | `playEffect('gather'\|'deposit')` sempre cai no oscilador — `resolveEffect` retorna `null` para ambos |
| BAIXO-10.7 | `video-omni-pilot.ts` não tem script registrado no `package.json` |

**Resolvidas / mantidas de sessões anteriores**
- Character Sword degenerada validada como glitch e oculta (Sessão 4).
- `Mech_Mike.glb` arquivado; `RobotExpressive.glb` e `Enemy_2Legs.glb` instanciados (1.7C).
- **Provider LLM**: Ollama Cloud (`firebird81`, plano Pro legado) atingiu "session usage limit" em 10/09 11:48 BRT com `kimi-k3`. Sessão 12 rodou em **Claude Opus 5 (1M) via Claude Code CLI** — sem limite atingido.

---

## 6. O Que Está Comprovadamente Sólido (auditado na Sessão 12)

- **Disciplina de teste real**: `test-buttons.mjs` dispara eventos de mouse verdadeiros e mede estado; `gather-e2e.mjs` roda o ciclo sem teleporte. Os gates são confiáveis.
- **Servidor genuinamente determinístico**: `simulation.test.ts` assert 8 (mesma seed + comandos = snapshots iguais) e `worker.test.ts` assert 6 (pureza de `stepWorkers`). Fundação correta para multiplayer.
- **Proveniência de assets preservada**: mesmo com o MANIFEST desatualizado, os sidecars `.meta.json` guardaram prompt, modelo, data e bytes de cada asset gerado.
- **Normalização kebab-case (S10) correta**: cruzamento de todas as strings `/assets/**` contra o disco — zero referência quebrada.
- **Nenhum segredo vazou**: `GEMINI_API_KEY` ausente de código, bundle, docs, manifesto e sidecars.
- **Retratação da doutrina falsa (S10.4) é exemplar**: corrigir o `docs/knowledge/` após descobrir que o "Hips fix" era o bug, em vez de apagar o rastro.

---

## 7. Configurações de Ambiente & Infraestrutura
- **Node.js runtime**: Mac Darwin arm64 (v26.8.1, npm 11.19.0).
- **Servidor Web**: Vite 6.4.3 rodando em `http://localhost:5173/` e na Tailnet (`http://100.103.178.65:5173/`).
- **Pipeline Gráfico**: Three.js 0.174.0 com `ACESFilmicToneMapping` e `PCFSoftShadowMap`.
- **Tipografia**: Google Fonts — Orbitron, Rajdhani, Share Tech Mono.
- **Controle de versão**: **INEXISTENTE** (CRIT-01).
- **Processos vivos no momento da auditoria**: PID 97994 `vite` dev :5173 (1d10h), PID 92630 `vite preview` :4173 (15h).

---

## 8. Documentos de Referência da Retomada

| Documento | Conteúdo |
| :--- | :--- |
| `docs/journal/2026-09-10_12-30_sessao-12-auditoria-holistica.md` | Auditoria completa: 11 gates re-executados, 14 achados com evidência, matriz de remediação |
| `docs/specs/02-integracao-cliente-servidor.md` | Spec da Fase 2.6 Expandida (RASCUNHO) — 5 decisões abertas para o usuário |
| `roadmap.md` → Fase 1.11 | Remediação e Hardening, com gates próprios |

---
*Registro assinado por:*
- **Harness/Agente**: Claude Code CLI
- **Modelo LLM**: Claude Opus 5 (1M context)
- **Timestamp**: 2026-09-10T12:30:00-03:00

*Atualizado por (Sessão 13):*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-10T23:10:00-03:00

*Atualizado por (Sessão 14):*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-10T20:45:00-03:00
