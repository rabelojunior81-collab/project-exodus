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

- [ ] **Sub-fase 1.11.1 — CRIT-01: Controle de versão** ⚪
  - `git init`, commit baseline de todo o projeto, tag `v0.1.0-fase-1.7`.
  - Decidir versionamento de `tools/studio-gemini/masters/` (31 MB) — recomendação: versionar.
  - Gate: `git log` com 1 commit; `git status --porcelain | grep -c '\.env'` = **0**; `git ls-files | wc -l` coerente com o inventário.
- [ ] **Sub-fase 1.11.2 — CRIT-02: Carimbo de build honesto** ⚪
  - `define: { __BUILD_STAMP__ }` no `vite.config.ts`; `main.ts:566-572` passa a consumir a constante.
  - Gate **negativo** (o que faltou na 1.9.4): build → anotar carimbo → esperar 2 min → recarregar → o carimbo **não pode** mudar.
- [ ] **Sub-fase 1.11.3 — ALTO-04: Manifestos reconciliados com o disco** ⚪
  - `MANIFEST.md`: seção `music/` real, totais corrigidos (78 arquivos / 22,21 MB), coluna "em uso × reserva Fase N".
  - `ATTRIBUTION.md`: substituir o parágrafo do 404 de `lyria-002` pela proveniência real (`lyria-3.5`, prompts dos sidecars).
  - Remover os 3 `.ogg` residuais não referenciados.
  - Gate: script de verificação que compara MANIFEST × disco e falha em divergência de contagem/peso.
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
- [ ] **Sub-fase 1.11.6 — Lote 3 (vídeo): diagnóstico correto antes do conserto** ⚪
  - Remover o `(ai as any)` de `video-omni-pilot.ts:32` e deixar o `tsc` apontar o client correto e o shape real de `response_format`. Só então tratar o download.
  - Registrar `generate:video-omni` no `package.json` do studio.
  - Gate: `client/public/assets/video/era-1-transition.mp4` em disco com sidecar, ou **decisão documentada de abandonar** o Lote 3 em favor do fallback Ken-Burns já registrado no `ATTRIBUTION.md`.
- **Gate de Aprovação da Fase 1.11**:
  - [ ] Repositório Git com histórico e o baseline etiquetado.
  - [ ] Carimbo de build provado por teste negativo.
  - [ ] MANIFEST/ATTRIBUTION batendo com o disco por verificação automatizada.
  - [ ] Música tocando no gameplay, com peso otimizado.
  - [ ] `tsc` 0 nos 3 workspaces, 39 asserts, test-buttons 10/10, gather-e2e, dist-proof — todos verdes após as mudanças.


---

## Fase 2: Simulação Autoritativa & Core Loop Econômico ⚪
*Objetivo: Loop de simulação no servidor Node.js (20 Hz), pathfinding A* e os 4 recursos temáticos. Dedupado Sessão 5 (subscription-safe).*
*Execução Sessão 5: subagente A2 (server/** exclusivo) → verificado pelo orquestrador (tsc + 39 asserts OK). Integração cliente (2.6) pendente.*

- [x] **Sub-fase 2.1**: Tipos de protocolo compartilhados (`server/src/protocol.ts`). 🟢 (A2)
- [x] **Sub-fase 2.2**: Loop autoritativo 20Hz com timestamp determinístico + registro de entidades. 🟢 (A2)
- [x] **Sub-fase 2.3**: Grid espacial + A* com desvio de obstáculos (7 asserts). 🟢 (A2)
- [x] **Sub-fase 2.4**: Nós dos 4 recursos + posições determinísticas. 🟢 (A2)
- [x] **Sub-fase 2.5**: Máquina de estados do trabalhador + placar (ciclo validado em teste). 🟢 (A2)
- [ ] **Sub-fase 2.6 → RECLASSIFICADA como **Fase 2.6 Expandida** (decisão D-12.2 da Sessão 12). ⚪
  - A auditoria mediu **5 eixos de divergência** entre cliente e servidor acumulados nas Fases 1.7A–1.7E: cliente sem WebSocket; servidor sem broadcast de snapshot (hoje alocado na Fase 3); 5 tipos de unidade × 3; tempos de treino 1,6–2,0× divergentes e **custo em recursos inexistente no servidor**; modelos de coleta (atômico × incremental) e de locomoção (inércia × velocidade constante) incompatíveis; e ausência de módulo compartilhado.
  - Escopo real: workspace `shared/`, paridade de modelo, custos/pop-cap no servidor, reconciliação de coleta e física, snapshot broadcast, cliente WS com interpolação, remoção dos 5 `TODO-2.6`.
  - **Bloqueada por spec**: `docs/specs/02-integracao-cliente-servidor.md` está em RASCUNHO com **5 decisões abertas** (D-2.6-A a D-2.6-E) que exigem o usuário. Nenhuma linha de código antes de resolvê-las (`AGENTS.md` §2.B).
  - Ver plano de 6 sub-fases e gates no próprio spec.
- **Gate de Aprovação da Fase 2**:
  - [ ] Trabalhador coleta, transporta e entrega no CC, placar incrementa (demo no harness).
  - [ ] Testes unitários do A* e economia passando 100%.

---

## Fase 3: Multiplayer LAN / Tailscale & Protocolo de Rede ⚪
*Objetivo: Sincronização via WebSocket em rede local e Tailnet com interpolação suave.*

- [ ] **Sub-fase 3.1**: Protocolo de mensagens binárias/JSON compacto para comandos e snapshots de estado. ⚪
- [ ] **Sub-fase 3.2**: Lobby de conexão e suporte a conexão direta por IP local (192.168.x.x) e Tailscale (100.x.y.z). ⚪
- [ ] **Sub-fase 3.3**: Buffer de interpolação no cliente Three.js para movimentação suave de unidades. ⚪
- **Gate de Aprovação da Fase 3**:
  - [ ] Dois navegadores conectados simultaneamente no mesmo servidor sem dessincronização visual.

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
*Registro assinado por:*
- **Harness/Agente**: Claude Code CLI
- **Modelo LLM**: Claude Opus 5 (1M context)
- **Timestamp**: 2026-09-10T12:30:00-03:00
