# roadmap.md — Roadmap Macro & Micro do Projeto

> **Princípio**: *Roadmap Vivo com Fases, Sub-Fases, Gates Rígidos e Critérios Inflexíveis.*

---

## Legenda de Status
- ⚪ `[NÃO INICIADO]`
- 🟡 `[EM PROGRESSO]`
- 🟢 `[CONCLUÍDO]`

---

## Fase 0: Fundação de Governança, Harness e Estrutura Base 🟢
*Objetivo: Estabelecer a infraestrutura de engenharia, governança viva e validação do pipeline Gemini.*

- [x] **Sub-fase 0.1**: Criação dos documentos vivos (`AGENTS.md`, `estate.md`, `handoff.md`, `roadmap.md`). 🟢
- [x] **Sub-fase 0.2**: Inicialização do Diário de Bordo (`docs/journal/2026-09-09_02-15_fase-0-inicio.md`) e Specs de Governança. 🟢
- [x] **Sub-fase 0.3**: Scaffolding do monorepo TypeScript (`package.json`, workspaces: `server`, `client`, `tools/studio-gemini`). 🟢
- [x] **Sub-fase 0.4**: Validação de conectividade e testes da API Gemini no módulo `tools/studio-gemini` usando a chave em `.env`. 🟢
- **Gate de Aprovação da Fase 0**:
  - [x] TypeScript compila em todos os workspaces (`npm run build`). 🟢
  - [x] Teste automatizado do Gemini Studio gera texto de lore e valida endpoint sem erros (`npm run test:gemini`). 🟢
  - [x] Assets das 4 Eras gerados e cacheados em disco (`client/public/assets/lore/`). 🟢
  - [x] `estate.md` e `handoff.md` atualizados e assinados. 🟢

---

## Fase 1: Motor Gráfico Three.js & Câmera Isométrica PBR 🟢
*Objetivo: Construir o renderizador 3D com estética desgastada fotorrealista, câmera tática e seleção RTS.*

- [x] **Sub-fase 1.1**: Setup do Three.js com WebGLRenderer, pipeline PBR, sombras dinâmicas e tone mapping cinematográfico. 🟢
- [x] **Sub-fase 1.2**: Câmera isométrica RTS (pan com mouse/teclado, zoom suave, rotação de 45°/90°, limites de mapa). 🟢
- [x] **Sub-fase 1.3**: Terreno pós-apocalíptico com grid navegável, texturas PBR de terra árida e escombros industriais. 🟢
- [x] **Sub-fase 1.4**: Sistema de seleção de unidades: clique único (Raycaster) e seleção em área arrastável (Frustum Box Selection). 🟢
- **Gate de Aprovação da Fase 1**:
  - [x] Câmera e controles RTS funcionando fluidamente a 60 FPS estáveis. 🟢
  - [x] Seleção única e múltipla de entidades com indicador visual na base e sincronização com HUD. 🟢
  - [x] Compilação de produção do cliente sem avisos ou erros (`npm run build`). 🟢
  - [x] Documentação e diário atualizados com medições de desempenho e validação visual. 🟢

---

## Fase 1.5: Integração de Modelos GLTF Reais & Estabilização Visual 🟢
*Objetivo: Substituir geometrias placeholder por modelos 3D reais com animações esqueléticas e corrigir todos os bugs visuais.*
*Status Sessão 4: gate fechado com validação visual do próprio agente (harness: screenshots 01–05 + Box3). Playtest final com o usuário pendente.*

- [x] **Sub-fase 1.5.1**: Implementação do `ModelManager` singleton com cache, `GLTFLoader` e `SkeletonUtils.clone`. 🟢
- [x] **Sub-fase 1.5.2**: Integração de 9 modelos GLTF (Quaternius + Mixamo) com mapeamento semântico de animações. 🟢
- [x] **Sub-fase 1.5.3**: Correção do root motion offset do `Soldier.glb` (osso Hips, eixo Z). 🟢
- [x] **Sub-fase 1.5.4**: Platô militar no terreno (raio < 30) com smoothstep para eliminar clipping de unidades. 🟢
- [x] **Sub-fase 1.5.5**: Overhaul completo do HUD — SVGs vetoriais, tipografia profissional, retratos fotorrealistas. 🟢
- [x] **Sub-fase 1.5.6**: Texturas PBR fotorrealistas com splat shader customizado (tri-textura sem repetição). 🟢
- [x] **Sub-fase 1.5.7**: Menu Principal AAA (scanlines, vignette, botões táticos, footer com versão/IP). 🟢
- [x] **Sub-fase 1.5.8**: Tela de carregamento com radar holográfico e progresso por modelo. 🟢
- [x] **Sub-fase 1.5.9**: Correção da rotação invertida das unidades (`+ Math.PI` em `Unit.update()`). 🟢 (Sessão 3)
- [x] **Sub-fase 1.5.10**: Integração do `Combat_Tank.glb` como veículo correto (chave `'tank'`). 🟢 (Sessão 3)
- [x] **Sub-fase 1.5.11**: Verificação e correção do Hips offset no `Character.glb` (fix generalizado soldier+character). 🟢 (Sessão 3)
- **Gate de Aprovação da Fase 1.5**:
  - [x] Todas as unidades andam na direção correta (yawOffset por tipo: soldier PI, worker 0, tank PI/2 — medido via matrizes). 🟢 (Sessão 4)
  - [x] Modelo do veículo proporcional (~8.4m × 2.85m, menor que buildings, maior que infantaria). 🟢 (Sessão 4)
  - [x] Zero clipping de modelos no terreno (terrainHeight + grounding, hill-climb validado). 🟢 (Sessão 4)
  - [x] Compilação limpa (`npx tsc --noEmit` = 0 erros em `client/` e `server/`). 🟢 (Sessão 4)
  - [x] Física de locomoção do blindado (giro lento, inércia, tração alinhada). 🟢 (Sessão 4)

---

## Fase 1.6: HUD Profissional Responsivo (Desktop + Mobile) 🟢
*Objetivo: HUD com cara de jogo profissional — layout pixel-alinhado, sofisticado, responsivo. Diretiva do usuário Sessão 5.*
*Execução Sessão 5: subagente A1 (UI exclusivo) → verificado pelo orquestrador (tsc + screenshots desktop e mobile).*

- [x] **Sub-fase 1.6.1**: Topbar viva — recursos/era/população com binding real + tooltips + animações de incremento. 🟢 (A1, IDs legados intactos)
- [x] **Sub-fase 1.6.2**: Painel de seleção + comandos — ordens, fila de produção com progresso, retratos HP. 🟢 (A1, stubs aguardam simulação)
- [x] **Sub-fase 1.6.3**: Minimapa interativo — clique câmera, right-click ordem, pings (camada DOM, canvas intacto). 🟢 (A1)
- [x] **Sub-fase 1.6.4**: Feed de eventos + alertas (30 itens, auto-dismiss, badge). 🟢 (A1)
- [x] **Sub-fase 1.6.5**: Responsivo mobile — breakpoints, touch, bottombar colapsável. 🟢 (A1, shot 07 aprovado)
- **Gate de Aprovação da Fase 1.6**:
  - [x] Screenshots desktop 1600×900 + mobile 390×844 revisados, zero overlap/misalign. 🟢
  - [x] `npx tsc --noEmit` 0 erros. 🟢

---

## Fase 1.7: Pipeline Gemini de Ativos (imagens, TTS, música, vídeo) 🟡
*Objetivo: Popular o jogo com ativos gerados e curados — fim do slop. Diretiva do usuário Sessão 5: Gemini = geração de ativos.*
*Execução Sessão 5: subagente A3 (auditoria + manifestos + prova de geração OK). Lotes de geração seguem pendentes.*

- [x] **Sub-fase 1.7.1**: Auditoria do `tools/studio-gemini` + manifesto de ativos (`MANIFEST.md` + `ASSET_PLAN.md`, prova de API OK). 🟢 (A3)
- [x] **Sub-fase 1.7.2**: Lote 1 — 17 retratos WebP 512×512 + 12 thumbs + 4 SVG de recurso. 🟢 (S10; status corrigido na S12 — estava marcado ⚪ apesar de entregue)
- [x] **Sub-fase 1.7.3**: Lote 2 — 16 MP3 de TTS (5 select, 5 move, 4 briefings, 2 alertas) + `audio.ts` real com buses SFX/Voice/Music. 🟢 (S10; status corrigido na S12)
- [~] **Sub-fase 1.7.4**: Lote 3 — 🟡 **PARCIAL**. Música: 3 faixas geradas (`lyria-3.5`, S10 03:31) mas **nunca tocadas** — `audio.ts` não tem `playMusic` (ALTO-05). Vídeo: não gerado; diagnóstico do handoff estava incompleto (ver 1.11.6). Fechamento na **Fase 1.11.4 e 1.11.6**.
- **Gate de Aprovação da Fase 1.7**:
  - [~] Manifesto `assets/MANIFEST.md` com inventário, pesos e licenças/origem. 🟡 **REPROVADO na auditoria S12**: MANIFEST declara 75 arquivos/18,02 MB e nega a existência da música; disco tem 78/22,21 MB com 3 MP3 publicados (ALTO-04). Reabre na 1.11.3.
  - [x] Zero chave em código; tudo via `.env`. 🟢 (verificado por varredura na S12 — `GEMINI_API_KEY` ausente de código, bundle, docs e sidecars)

---

## Fase 1.8: Jogabilidade Imediata — Câmera, Minimapa, Luz e Ordens Reais 🟢
*Objetivo: responder ao playtest furioso do usuário (Sessão 6): tudo que existe passa a funcionar e ser legível.*
*Execução Sessão 6: orquestrador direto (sem delegação). Causa raiz nº 1: `client/dist/` com 9h de atraso — o usuário via o jogo velho.*

- [x] **Sub-fase 1.8.1**: Rebuild do `dist/` + prova via preview (9 entidades, 0 erros, shot 08). 🟢
- [x] **Sub-fase 1.8.2**: Zoom útil (frustum 9–110, alvo segue o relevo, bounds ±80). 🟢
- [x] **Sub-fase 1.8.3**: Minimapa funcional (thumbnail do relevo, fonte única de clique, right-click = ordem + ping; overlay com pointer-events:none). Teste MINIMAP_CLICK 53.5≈54. 🟢
- [x] **Sub-fase 1.8.4**: Iluminação legível (névoa 0.011→0.0032, hemisfério, exposição 1.55) + HP bars 3D sempre visíveis. 🟢
- [x] **Sub-fase 1.8.5**: Ordens reais (Mover/Parar/Patrulha/Reunião/Dispersar), treinamento local com custo/tempo/pop, topbar viva, feed com eventos. Ataque/defesa honestamente bloqueados p/ Fase 5. 🟢
- **Gate de Aprovação da Fase 1.8**:
  - [x] Screenshots revisados (base legível, unidades distinguíveis, minimapa com terreno). 🟢
  - [x] `npx tsc --noEmit` 0 erros + build de produção OK. 🟢

---

## Fase 1.9: Economia Jogável + Reskin do HUD 🟢
*Objetivo: responder ao segundo playtest furioso (Sessão 7): coleta real, visual novo de verdade, fim da dúvida de cache.*
*Execução Sessão 7: orquestrador direto. Botões provados com cliques reais (test-buttons.mjs: 6 PASS + coleta e2e).*

- [x] **Sub-fase 1.9.1**: Teste funcional de botões (seleção, Mover, Parar, Recrutar via mouse real). 🟢
- [x] **Sub-fase 1.9.2**: Loop de mineração jogável — 8 veios visuais (mesmas coords do server), ordem COLETAR, FSM coletar→entregar, topbar incrementa (e2e: sucata 180→190). 🟢
- [x] **Sub-fase 1.9.3**: Reskin floating glass (topbar fina, painéis flutuantes, botões ícone-topo, anéis finos). 🟢
- [x] **Sub-fase 1.9.4**: Build stamp visível (`MIL-SPEC · BUILD dd/mm hh:mm`) + hit-proxy nos veios + `dist-proof.mjs`. 🟢
- **Gate de Aprovação da Fase 1.9**:
  - [x] Coleta e2e real (sem teleports) colhe + entrega. 🟢
  - [x] Screenshots do reskin revisados (dev + produção). 🟢
  - [x] `npx tsc --noEmit` 0 erros + build + prova de dist (9 ent, 8 nós, 0 pageerrors). 🟢

---

## Fase 1.10: Recap, Auditoria e Sanitização Geral 🟢
*Objetivo: diretiva do usuário (Sessão 8) — recap profundo do dia, auditoria dev+prod atrás de órfãos/desconectados/errados, sanitização e normalização com governança total.*

- [x] **Sub-fase 1.10.1**: Auditoria de arquivos (63 arquivos fora de node_modules), referências por asset, processos/portas, naming, dívidas SDD. 🟢
- [x] **Sub-fase 1.10.2**: Arquivamento — `Tank.glb`, `Combat_Rover.glb`, `Mech_Mike.glb` → `docs/archived-assets/` + README (Mech_Stan já deletado S3). 🟢
- [x] **Sub-fase 1.10.3**: Normalização kebab-case — 19 assets renomeados + 7 arquivos de código atualizados (models, terrain, textures, hud, main). 🟢
- [x] **Sub-fase 1.10.4**: Retratação da doutrina falsa no knowledge (3.1 Hips-fix, 3.2 facing por tipo). 🟢
- [x] **Sub-fase 1.10.5**: Rebuilds secundários (server/dist, studio-gemini/dist) + adendo no MANIFEST. 🟢
- **Gate de Aprovação da Fase 1.10**:
  - [x] tsc 0 (client+server), 39 asserts server OK. 🟢
  - [x] Boot com novos nomes: 9/9 modelos, 0 pageerrors. 🟢
  - [x] Prova de produção renovada (9 ent, 8 nós, stamp 16:52). 🟢

---

## Fase 1.7 Expandida — "Mundo Vivo" (Sessão 9, aprovada pelo usuário)
*Objetivo: popular o jogo — cenário denso, névoa de exploração, mais unidades e veículos articulados, mineração com feedback visual/evolutivo, e lotes de assets Gemini.*
*Decisões: fatiamento com gates · assets 3D procedurais + ativar GLBs em disco · FoW visual client-side · API Gemini aprovada incl. piloto Lote 3.*

- [x] **Sub-fase 1.7A**: Cenário denso — `props.ts` com 10 famílias/365 instâncias InstancedMesh (PRNG seedado, exclusões núcleo+veios), +2 crateras e dunas no relevo, minimapa com pontos de props. 🟢 (gates: tsc 0, shots revisados, dist-proof OK)
- [x] **Sub-fase 1.7B**: Fog of War client-side — grade 90×90 (2m), estados desconhecido/explorado/visível, raio de visão por tipo, overlay shader (shroud y=7 + blur 3×3), minimapa coberto, anéis de veio com fade-in por exploração. 🟢 (gates: tsc 0, shots fog-a1/b1/b2/c revisados, test-buttons+gather-e2e PASS, dist-proof OK)
- [x] **Sub-fase 1.7C**: Unidades novas (Droide de Manutenção ~1.8m coletor lento, Mech Bípede ~4.5m desarmado p/ Fase 5) calibradas por medição + articulações (torreta/canhão do tanque com pivô reparentado e mola, clipes Turning, topo da torreta do bunker, radar do CC) + menu de recrutamento 5 botões (Q/W/E/R/T, custos, disabled) + hotkeys. 🟢 (gates: tsc 0, boot 11 entidades, test-buttons 10/10 + gather-e2e PASS, dist-proof OK; REUNIÃO/REPARO/PESQUISA → V/F/B; POP_MAX 20)
- [x] **Sub-fase 1.7D**: Mineração viva — depleção em 4 estágios (100/66/33/0), pulso emissivo + faíscas no veio trabalhado (fog-gated), caixa de carga + 10% de slow no coletor, entrega com burst + texto `+10` + flash na topbar + hook de áudio (no-op TODO 1.7E). 🟢 (gates: tsc 0; shots 17d-deplete-100/50/15/0 + 17d-harvest-fx [pulso 0.71, 9 partículas vivas] + 17d-delivery-burst [`+10 SUCATA` + flash +10]; test-buttons 10/10 [janela do mech 120→240s: swiftshader ~3.4 FPS estica o tempo de simulação]; gather-e2e PASS; dist-proof n=11, 0 pageerrors)
- [x] **Sub-fase 1.7E (parcial)**: Assets Gemini — tooling corrigido (tsx, header `x-goog-api-key`, retry/backoff, sidecar `.meta.json`, README); Lote 1 (17 WebP retratos + 4 SVG ícones); Lote 2 (16 MP3 TTS + `audio.ts` real com buses SFX/Voice/Music e fiação select/move/gather/deposit/briefing); Lote 2b — 3 músicas ambiente geradas (`ambient-wasteland-wind-loop.mp3`, `ambient-bunker-drone-loop.mp3`, `combat-percussion-stinger.mp3`). 🟢
- [ ] **Sub-fase 1.7E (restante)**: Lote 3 — vídeo de transição de era via `gemini-omni-flash-preview`; mixagem das músicas no gameplay. 🟡 (pendente: pasta `client/public/assets/video/` inexistente; `audio.ts` sem método `playMusic`)

---

## Fase 1.11: Remediação e Hardening (auditoria da Sessão 12) 🟡
*Objetivo: fechar os achados críticos e altos da auditoria holística antes de qualquer feature nova. Diretiva do usuário Sessão 12: exploração e auditoria holística antes de retomar o desenvolvimento.*
*Fonte: `docs/journal/2026-09-10_12-30_sessao-12-auditoria-holistica.md` (14 achados, 11 gates re-executados, matriz de remediação priorizada).*

- [x] **Sub-fase 1.11.1 — CRIT-01: Controle de versão** 🟢 (S13)
  - Repositório público `project-exodus`; baseline `924c111` (321 arquivos) + tag `v0.1.0-fase-1.7` publicados.
  - `masters/` (31 MB) **versionado** (decisão D-13.2).
  - Gate cumprido: `.env` fora do rastreamento (0), `node_modules` fora (0), 321 arquivos rastreados.
- [x] **Sub-fase 1.11.2 — CRIT-02: Carimbo de build honesto** 🟢 (S13)
  - ✅ `define: { __BUILD_STAMP__ }` no `vite.config.ts`; `main.ts` consome a constante (tsc 0 na S13).
  - ✅ Gate **negativo** provado por construção: o literal `BUILD 10/09 19:39` está compilado no bundle (grep em `dist/assets/index-CbnpEOY6.js`) e o `dist-proof` em produção exibiu exatamente o carimbo do build — não há leitura em runtime que possa variar após reload.
- [x] **Sub-fase 1.11.3 — ALTO-04: Manifestos reconciliados com o disco** 🟢 (S13)
  - `MANIFEST.md` reconstruído do disco: 76 publicados / ≈ 25.067 KB, seção `video/` e status "em uso × reserva".
  - `ATTRIBUTION.md`: proveniência real da música (`lyria-3.5`) e do vídeo recuperado.
  - 3 `.ogg` órfãos + sidecars arquivados em `docs/archived-assets/ogg-orphans/`.
  - Gate criado: `tools/verify-manifest.mjs` (MANIFEST × disco; execução em CI pendente).
- [ ] **Sub-fase 1.11.4 — ALTO-05: Fechar o áudio da 1.7E de verdade** ⚪
  - Cortar `combat-percussion-stinger.mp3` para 8–10 s (ffmpeg-static já é devDependency) ou re-gerar.
  - Re-encodar as 3 faixas para 96 kbps mono; atualizar sidecars e MANIFEST.
  - `audio.ts`: `playMusic(track, {loop, fadeIn})`, `crossfadeTo()`, `stopMusic(fadeOut)` sobre o bus `music` já existente.
  - Fiação: menu principal e início de partida → `ambient-wasteland-wind-loop`; combate → stinger cortado. `ambient-bunker-drone-loop` fica como **reserva de Fase 4** (D-12.6).
  - Manter lazy-load (diretiva do `handoff.md` §5): nada de música no boot.
  - Gate: teste no harness confirma `AudioBufferSourceNode` ativo no bus `music` após START; `test-buttons` 10/10 intacto.
- [ ] **Sub-fase 1.11.5 — Higiene de build e tipos** ⚪
  - MED-08.1 `rm -rf tools/studio-gemini/dist` + `prebuild`; MED-08.2 `server/tests/` no typecheck; MED-07 os 3 tsconfigs estendendo o base com rigor unificado; MED-06 `__rts` sob flag de ambiente; BAIXO-10.5 duplicata de `setPendingOrder`.
  - Gate: `tsc --noEmit` 0 nos 3 workspaces **com** o rigor novo; `test-buttons` + `gather-e2e` + `dist-proof` verdes.
- [~] **Sub-fase 1.11.6 — Lote 3 (vídeo)** 🟡 (S13: era 1 entregue)
  - ✅ `client/public/assets/video/era-1-transition.mp4` em disco com sidecar — recuperado da Files API antes do expiry (S13); rodando mudo na landing.
  - ✅ Script de recuperação registrado (`npm run video:download` no studio).
  - ⚪ Pendente: remover o `(ai as any)` de `video-omni-pilot.ts:32` e gerar as vinhetas das eras 2–4.
  - Gate: cumprido para a era 1; demais eras ou decisão documentada de manter só a era 1.
- **Gate de Aprovação da Fase 1.11**:
  - [x] Repositório Git com histórico e o baseline etiquetado. (S13)
  - [x] Carimbo de build provado por teste negativo. (provado por construção + `dist-proof` na S13)
  - [~] MANIFEST/ATTRIBUTION batendo com o disco; verificação automatizada criada (`tools/verify-manifest.mjs`) — execução em CI pendente.
  - [ ] Música tocando no gameplay, com peso otimizado. (ffmpeg validado na S13)
  - [ ] `tsc` 0 nos 3 workspaces, 39→**43** asserts, test-buttons 10/10, gather-e2e, dist-proof — todos verdes após as mudanças. (client tsc 0 + 43 asserts + `verify-manifest` + build/`dist-proof` + test-buttons + gather-e2e verdes até a S14; falta rodar música/áudio e os 3 workspaces juntos no mesmo turno)

---

## Fase 1.12: Colisão e Obstáculos 🟢 (S14)
*Objetivo: unidades não atravessam construções, veios e props sólidos — contato com deslize,
desvio frontal e parada encostada; declive penaliza velocidade; limites de mundo. Spec:
`docs/specs/03-colisao-e-obstaculos.md` (diretiva do usuário na sessão de decisões 2.6, 10/09).*

- [x] **Sub-fase 1.12.1 — Colisão no cliente** 🟢 (S14)
  - `client/src/engine/collision.ts` — círculos, sub-passos ≤0,5 m, projeção 2×, desvio tangencial, clamp ±88 m.
  - Props sólidos por família em `props.ts` (~225 círculos; finos ficam decorativos).
  - Integração em `unit.ts` (raio físico por tipo, `resolveTarget`, `slopeSpeedFactor`).
  - Gate: `collision-e2e.mjs` — minDistCC **8,700** (= contato), chegada OK, veio **3,101**, 0 pageerrors.
- [x] **Sub-fase 1.12.2 — Paridade no servidor** 🟢 (S14)
  - `advance()` projeta para fora de construções + veios (aritmética pura, iterada); veios fora do A* para não regredir a FSM de coleta.
  - Gate: 4 asserts novos (`collision.test.ts`) — suíte total **43 asserts**, determinismo intacto, 387 ticks da FSM inalterados.
- [x] **Sub-fase 1.12.3 — Unidade×unidade, declive e limites** 🟢 (S14)
  - Separação soft-body determinística por id + re-resolução estática; declive ±0,75 m; clamp de mundo.
  - Gate: `test-buttons` 10/10 + coleta E2E + `dist-proof` 11/8/0 sem regressão.
- [ ] **Sub-fase 1.12.4 — Migração para `shared/`** ⚪ (junto do 2.6.3): fonte única de constantes e resolvedor.
- **Gate de Aprovação da Fase 1.12**:
  - [x] Cliente: nenhuma travessia de CC/veio (`collision-e2e`).
  - [x] Servidor: projeção provada por teste; determinismo intacto (43 asserts).
  - [x] Sem regressão de coleta/HUD (gather-e2e + test-buttons + dist-proof).
  - [ ] Constantes e resolvedor em `shared/` (2.6.3).


---

## Fase 2: Simulação Autoritativa & Core Loop Econômico ⚪
*Objetivo: Loop de simulação no servidor Node.js (20 Hz), pathfinding A* e os 4 recursos temáticos. Dedupado Sessão 5 (subscription-safe).*
*Execução Sessão 5: subagente A2 (server/** exclusivo) → verificado pelo orquestrador (tsc + 39 asserts OK). Integração cliente (2.6) pendente.*

- [x] **Sub-fase 2.1**: Tipos de protocolo compartilhados (`server/src/protocol.ts`). 🟢 (A2)
- [x] **Sub-fase 2.2**: Loop autoritativo 20Hz com timestamp determinístico + registro de entidades. 🟢 (A2)
- [x] **Sub-fase 2.3**: Grid espacial + A* com desvio de obstáculos (7 asserts). 🟢 (A2)
- [x] **Sub-fase 2.4**: Nós dos 4 recursos + posições determinísticas. 🟢 (A2)
- [x] **Sub-fase 2.5**: Máquina de estados do trabalhador + placar (ciclo validado em teste). 🟢 (A2)
- [ ] **Sub-fase 2.6 → RECLASSIFICADA como **Fase 2.6 Expandida** (decisão D-12.2 da Sessão 12). 🟡 desbloqueada (spec APROVADO na S14)**
  - A auditoria mediu **5 eixos de divergência** entre cliente e servidor acumulados nas Fases 1.7A–1.7E: cliente sem WebSocket; servidor sem broadcast de snapshot (hoje alocado na Fase 3); 5 tipos de unidade × 3; tempos de treino 1,6–2,0× divergentes e **custo em recursos inexistente no servidor**; modelos de coleta (atômico × incremental) e de locomoção (inércia × velocidade constante) incompatíveis; e ausência de módulo compartilhado.
  - Escopo real: workspace `shared/`, paridade de modelo, custos/pop-cap no servidor, reconciliação de coleta e física, snapshot broadcast, cliente WS com interpolação, remoção dos 5 `TODO-2.6`.
  - **Spec APROVADO em 2026-09-10 (S14)**: as 5 decisões (D-2.6-A..E) foram fechadas na sessão `grill-me` — escolhas **A/A/A/A/A**, registradas em `docs/decisions/2026-09-10_fase-2.6-paridade.md`. A fase está **desbloqueada**; começar por 2.6.1 (`shared/`).
  - ✅ **2.6.1 entregue (S15)**: workspace `@project-exodus/shared` no ar (protocol/units/economy/world), cliente e servidor consumindo com re-exports; divergência de tipos/dados agora é erro de compilação. Gates: `tsc` 0 (shared/client/server/studio), 43 asserts, build 689 kB, `dist-proof` 11/8/0, `collision-e2e` 8,701/3,101, `gather-e2e`, `test-buttons` 10/10. Detalhe no spec 02 §5.
  - ✅ **2.6.2 entregue (S16)**: custos debitados + reembolso no cancelamento (`CANCEL_TRAIN`, protocolo v2), `POP_MAX` 20 global, tesouro inicial do shared e tempos derivados de `TRAINING_SPECS` (drone/mech treináveis). Gates: **51 asserts** + harness completo + build 689 kB. Detalhe no spec 02 §5.
  - ✅ **2.6.3 entregue (S17)**: coleta a 3,33 un/s (D-2.6-B), física inercial no servidor com snapshot v3 (D-2.6-C), colisão unificada em `shared/collision` (1.12.4), dropoff 10 m (D-2.6.3-A) e clamp ±88 (D-2.6.3-B) — **contrato congelado antes da implementação** + registro visual de testes (`docs/evidence/fase-2.6.3/`). Gates: **65 asserts** + harness completo. Detalhe no spec 02 §5.
  - ✅ **2.6.4 entregue (S18)**: broadcast por tick com `viewFor(player)` identidade (D-2.6-D), backpressure e métricas — 2 clientes reais com **0 divergências**, **1.388 B/tick · 26,7 KB/s** medidos; **71 asserts**; gráfico canônico na landing. Detalhe no spec 02 §5.
  - ⏭️ **Próxima**: **2.6.5** — cliente WebSocket (buffer de interpolação fixo ~100 ms, comandos reais, RTT instrumentado, hooks de debug dev-only — D-2.6.5-A/B).
  - Ver plano de 6 sub-fases e gates no próprio spec.
- **Gate de Aprovação da Fase 2**:
  - [ ] Trabalhador coleta, transporta e entrega no CC, placar incrementa (demo no harness).
  - [ ] Testes unitários do A* e economia passando 100%.

---

## Fase 3: Multiplayer LAN / Tailscale & Protocolo de Rede ⚪
*Objetivo: Sincronização via WebSocket em rede local e Tailnet com interpolação suave.*

- [ ] **Sub-fase 3.1**: Protocolo de mensagens compacto para comandos e snapshots (v3: inclui `CHAT/TAUNT/PING` da 3.4). ⚪
- [ ] **Sub-fase 3.2**: Lobby de conexão e suporte a conexão direta por IP local (192.168.x.x) e Tailscale (100.x.y.z). ⚪
- [ ] **Sub-fase 3.3**: Buffer de interpolação no cliente (fixo ~100 ms — decisão D-2.6.5-A). ⚪
- [ ] **Sub-fase 3.4**: **Comunicação entre jogadores** — chat ALL/TEAM, 12 taunts com voz PT-BR, pings/flares no mapa e minimapa; rate limit no servidor. Spec: `docs/specs/04-comunicacao-entre-jogadores.md`. ⚪
- **Gate de Aprovação da Fase 3**:
  - [ ] Dois navegadores conectados simultaneamente no mesmo servidor sem dessincronização visual.
  - [ ] Chat/ping/taunt idênticos nos dois clientes, no tick correto, com flood rejeitado pelo servidor.

---

## Fase 4: Eras, Narrativa Reativa & Bunkers Arqueológicos ⚪
*Objetivo: Progressão pelas 4 Eras e descoberta da história da queda das IAs.*

- [ ] **Sub-fase 4.1**: Mecânica de transição de Eras (Escombros → Reassentamento → Reengenharia → Renascimento Cibernético). ⚪
- [ ] **Sub-fase 4.2**: Integração dos arquivos de rádio militar e logs de IA (gerados pelo Gemini Studio). ⚪
- [ ] **Sub-fase 4.3**: Bunkers e Servidores Arqueológicos escaváveis no mapa com recompensas em chips e arquivos de áudio. ⚪
- **Gate de Aprovação da Fase 4**:
  - [ ] Transição de era desbloqueia transmissão de rádio com áudio e imagem cinemática sem congelar a partida.

---

## Fase 5: Combate, Facções Assimétricas & Polimento Final ⚪
*Objetivo: As 3 facções (Sucateiros Livres, Ordem dos Bunkers, Filhos do Silício) e combate tático.*

- [ ] **Sub-fase 5.1**: Diferenciação profunda das 3 facções com unidades exclusivas e bônus assimétricos. ⚪
- [ ] **Sub-fase 5.2**: Sistema de combate, alcances balísticos, blindagem e projéteis. ⚪
- [ ] **Sub-fase 5.3**: Efeitos visuais PBR (partículas de fumaça, faíscas, explosões) e áudio posicional 3D. ⚪
- [ ] **Sub-fase 5.4**: HUD completo pós-apocalíptico com minimapa, placar e árvore de tecnologias. ⚪
- **Gate de Aprovação da Fase 5**:
  - [ ] Partida completa jogável do início ao fim com vitória por destruição ou construção de maravilha.

---

## Fase 6: Agentic Play — CLI, MCP e WebMCP ⚪ (design completo)
*Objetivo: o jogo jogável por agentes de IA — observação, ação, espera e visualização constantes durante a partida; agente vs agente via A2A. Origem: diretiva do usuário (10/09/2026).*

- Base de conhecimento (protocolos + libs verificadas no npm): `docs/knowledge/agentic-play-protocols.md` — MCP (spec 2026-07-28; `@modelcontextprotocol/sdk@1.30.0` ou linha `2.0`), ACP (Zed), A2A (`@a2a-js/sdk@1.1.0`), WebMCP (W3C CG; polyfill `@mcp-b/global@5.1.0`), AG-UI (opcional).
- Spec: `docs/specs/05-agentic-play.md`.
- [ ] **Sub-fase 6.1**: CLI (`tools/exodus-cli`) — cliente fino do protocolo com `--json`, REPL, `wait/watch/replay`; pode iniciar após a 2.6.6. ⚪
- [ ] **Sub-fase 6.2**: Servidor MCP (`tools/exodus-mcp`) — tools canônicas (`game_observe/order/train/cancel/chat/ping/wait/screenshot`), extensão **Tasks** para espera assíncrona, resources; linha do SDK a decidir no grill-me da Fase 6. ⚪
- [ ] **Sub-fase 6.3**: WebMCP na página do jogo (polyfill `@mcp-b/global` até suporte nativo), com opt-in explícito e anotações de segurança. ⚪
- [ ] **Sub-fase 6.4**: Agente vs agente via A2A — Agent Card do nó do jogo e tarefa `play_match` (depende da Fase 3). ⚪
- [ ] **Sub-fase 6.5**: Observabilidade & eval — replay com `agentId`, suíte de avaliação de agentes e adversarial (injeção via chat). ⚪
- **Gate de Aprovação da Fase 6**:
  - [ ] Um agente externo completa "coletar 10 de sucata e treinar 1 catador" usando somente as tools MCP, com recibo determinístico e trilha de auditoria.
  - [ ] Dois agentes disputam uma partida via A2A sem intervenção humana.

---
*Atualizado por (Sessão 15 — Fase 2.6.1 + decisões 7/7 + specs 04/05):*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-11T00:40:00-03:00

*Atualizado por (Sessão 16 — Fase 2.6.2 entregue):*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-11T01:10:00-03:00

---
*Registro assinado por:*
- **Harness/Agente**: Claude Code CLI
- **Modelo LLM**: Claude Opus 5 (1M context)
- **Timestamp**: 2026-09-10T12:30:00-03:00

*Atualizado por (Sessão 13):*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-10T23:10:00-03:00

*Atualizado por (Sessão 14 — Fase 1.12 entregue):*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-10T20:45:00-03:00
