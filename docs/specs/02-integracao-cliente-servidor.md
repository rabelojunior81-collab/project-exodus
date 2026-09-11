# Spec 02 — Integração Cliente ↔ Servidor (Fase 2.6 Expandida)

> **Status**: ✅ **APROVADO** — 5 de 5 decisões fechadas em 2026-09-10 (sessão `grill-me`; ver `docs/decisions/2026-09-10_fase-2.6-paridade.md`).
> **Origem**: Achado ALTO-03 da auditoria da Sessão 12 (`docs/journal/2026-09-10_12-30_sessao-12-auditoria-holistica.md`).
> **Pré-requisito de governança**: `AGENTS.md` §2.B — spec antes de código.
> **Liberada para execução**: iniciar pela sub-fase 2.6.1 (workspace `shared/`). As decisões D-2.6-A..E estão resolvidas no §4.

---

## 1. Problema

Cliente e servidor foram construídos em paralelo e nunca se falaram. Durante as Fases 1.7A–1.7E o cliente ganhou funcionalidade que o servidor não acompanhou. Hoje existem **duas simulações incompatíveis** do mesmo jogo:

- o cliente é a simulação que o usuário vê e joga;
- o servidor é a simulação que os testes provam correta.

A Fase 2.6 precisa fundir as duas com o servidor como autoridade, sem regredir a experiência já entregue.

---

## 2. Inventário de Divergências (medido na Sessão 12)

### 2.1 Modelo de dados

| Eixo | Cliente | Servidor | Ação requerida |
| :--- | :--- | :--- | :--- |
| Tipos de unidade | 5 | 3 | Servidor ganha `MAINTENANCE_DRONE` e `BIPED_MECH` |
| Tipos de construção | 3 | 3 | ✅ paridade |
| Nós de recurso | 8 (coords duplicadas à mão) | 8 (fonte) | Mover para `shared/` |
| Spawns iniciais | `main.ts` | `resources.ts:31` (comentário) | Mover para `shared/` |

### 2.2 Constantes econômicas

| Constante | Cliente | Servidor | Decisão |
| :--- | ---: | ---: | :--- |
| Treino worker | 8,0 s | 5,0 s → **8,0 s** | **APLICADA (2.6.2): derivado de `TRAINING_SPECS × TICK_RATE` (160 ticks)** |
| Treino raider | 12,0 s | 6,0 s → **12,0 s** | **APLICADA (2.6.2): 240 ticks** |
| Treino buggy | 18,0 s | 10,0 s → **18,0 s** | **APLICADA (2.6.2): 360 ticks** |
| Treino drone / mech | 16 s / 24 s | inexistente → **portado** | **APLICADA (2.6.2): 320/480 ticks** |
| Custo em recursos | tabela de 4 recursos + reembolso | **inexistente → aplicado** | **APLICADA (2.6.2): débito no aceite; `CANCEL_TRAIN` (v2) reembolsa integral** |
| `POP_MAX` | 20 | inexistente → **aplicado** | **APLICADA (2.6.2): teto global (D-2.6.2-B)** |
| Capacidade de carga | 10 | 10 | ✅ paridade |
| Velocidades base | 6,0 / 7,5 / 8,0 | 6,0 / 7,5 / 8,0 | ✅ paridade |

### 2.3 Modelo de simulação

| Subsistema | Cliente | Servidor | Decisão |
| :--- | :--- | :--- | :--- |
| Coleta | timer 3 s → extrai 10 (atômico) | 1 un / 0,5 s → **1 un / 0,3 s (6 ticks ≈ 3,33 un/s)** | **APLICADA (2.6.3): D-2.6-B em vigor** |
| Locomoção | aceleração, inércia, giro por tipo, tração só alinhado, −10 % com carga | velocidade constante → **física inercial (heading/velocity no snapshot v3)** | **APLICADA (2.6.3): D-2.6-C em vigor** |
| Pathfinding | reta até o alvo | A* com desvio de obstáculo | servidor vence |
| Fog of War | grade 90×90 client-side | inexistente | **DECIDIDA (D-2.6-D): client-side; gancho `viewFor(player)` no snapshot (2.6.4), filtragem na Fase 3** |

---

## 3. Arquitetura Alvo

### 3.1 Workspace `shared/`

Novo workspace `@project-exodus/shared`, importado por `client` e `server`, contendo **exclusivamente** dados e tipos sem dependência de runtime (sem Three.js, sem `ws`, sem Node):

```
shared/src/
├── protocol.ts      tipos de mensagem, comandos, snapshot (migrado de server/src/protocol.ts)
├── units.ts         UnitType, BuildingType, stats, custos, tempos de treino
├── economy.ts       ResourceKind, POP_MAX, capacidade, taxas de coleta
├── world.ts         layout dos 8 nós, spawns iniciais, dimensões do mapa
└── index.ts
```

**Critério de sucesso do `shared/`**: toda divergência do §2.1 e §2.2 passa a ser **erro de compilação** se reintroduzida. É esse o objetivo — não reduzir duplicação, mas tornar a divergência impossível de compilar.

Requer `composite: true` + `declaration: true` (já presentes em `tsconfig.base.json`, hoje sem uso — ver MED-07).

**Entrega S15 (2.6.1)** — decisões de implementação registradas:

- **Consumo via `dist`** (exports map com `types`+`import`): mantém o `tsc` build do servidor com `rootDir ./src` e evita transpilar `node_modules` no `ts-node`; prescripts (`predev`/`prebuild`/`pretest` de client e server) garantem o `build:shared`.
- **Disciplina de extração**: nenhuma mudança de comportamento. Valores decididos mas ainda não aplicados ficam marcados `LEGACY (2.6.1)` no consumidor, com a sub-fase que os aplica (tempos D-2.6-A no servidor → 2.6.2; intervalo de coleta D-2.6-B → 2.6.3).
- **Divergências residuais encontradas na extração** (agendadas para a 2.6.3, com decisão proposta no grill-me da S15 em `docs/decisions/2026-09-10_fase-2.6.x-abertas.md`): `DROPOFF_RANGE` cliente 10 × servidor 14; clamp de mundo cliente ±88 (margem de 2 m) × servidor ±90.
- **Fora de escopo por design (2.6.3)**: resolvedor de colisão (`CollisionWorld`) e movimento inercial — só os DADOS de colisão foram unificados agora (sub-fase 1.12.4 permanece com a 2.6.3).

### 3.2 Fluxo autoritativo

```
Cliente                                    Servidor (20 Hz)
───────                                    ────────────────
input do usuário
  → Command (shared/protocol)
  → WS send ─────────────────────────────→ issueCommand() valida (dono, custo, pop, fila)
                                           ← CMD_ACK {accepted, reason}
  predição local otimista (opcional)
                                           tick(): step() → snapshot()
  ←─────────────────────────────── WS broadcast Snapshot (delta ou full)
  buffer de interpolação (~100 ms)
  reconciliação: snapshot é verdade
  render Three.js
```

### 3.3 Divisão de responsabilidade

| Camada | Dono | Justificativa |
| :--- | :--- | :--- |
| Posição, HP, estado de FSM, recursos, fila de treino | **servidor** | autoridade, anti-trapaça, determinismo |
| Animação, partículas, pulso emissivo, texto flutuante, áudio | **cliente** | cosmético; não entra em snapshot |
| Câmera, seleção, HUD, minimapa | **cliente** | local por natureza |
| Fog of War | **client-side até a Fase 3** (D-2.6-D) | visual hoje; `viewFor(player)` preparado na 2.6.4; filtragem anti-maphack no multiplayer |

---

## 4. Decisões (requerem o usuário) — progresso: **5 de 5 decididas** ✅

| ID | Decisão | Opções | Impacto |
| :--- | :--- | :--- | :--- |
| **D-2.6-A** ✅ | ~~Qual tabela de tempos de treino vence?~~ **DECIDIDA (10/09): (a) cliente vence** — servidor adota 8/12/18 s e porta drone 16 s / mech 24 s | (a) ✅ escolhida · (b) descartada · (c) descartada | Ritmo econômico preservado |
| **D-2.6-B** ✅ | ~~Qual modelo de coleta vence?~~ **DECIDIDA (10/09): (a) incremental do servidor recalibrado (0,3 s/un)** | (a) ✅ escolhida · (b) descartada · (c) descartada | Ritmo preservado; carga parcial real |
| **D-2.6-C** ✅ | ~~A física de inércia do blindado migra para o servidor?~~ **DECIDIDA (10/09): (a) migra** + colisão real (spec 03) | (a) ✅ escolhida · (b) descartada (regride gate 1.5) | Identidade do veículo preservada; 2.6.3 absorve a física e a colisão |
| **D-2.6-D** ✅ | ~~Fog of War vira autoritativo?~~ **DECIDIDA (10/09): (a) client-side + gancho `viewFor(player)`; filtragem na Fase 3** | (a) ✅ escolhida · (b) descartada (infla a 2.6) · (c) descartada (custo médio sem demanda) | Escopo da 2.6 preservado; anti-maphack documentado para a Fase 3 |
| **D-2.6-E** ✅ | ~~Predição local no cliente?~~ **DECIDIDA (10/09): (a) sem predição + instrumentação de RTT** | (a) ✅ escolhida · (b) descartada (complexidade prematura) | Reavaliar apenas se p95 > 80 ms na Tailnet real |

---

## 5. Plano de Sub-fases (proposto)

| Sub-fase | Entrega | Gate |
| :--- | :--- | :--- |
| 2.6.1 ✅ | **ENTREGUE (S15)**: workspace `@project-exodus/shared` (protocol/units/economy/world + barrel), consumo via `dist` (o `composite` do `tsconfig.base.json` finalmente em uso); cliente e servidor migrados com re-exports de compatibilidade | `tsc` 0 em shared/client/server/studio + **43 asserts intactos** + `dist-proof` 11/8/0 + `collision-e2e` 8,701/3,101 + `gather-e2e` e `test-buttons` 10/10 |
| 2.6.2 ✅ | **ENTREGUE (S16)**: custos debitados (débito no aceite, reembolso integral no `CANCEL_TRAIN`), `POP_MAX` 20 global, tesouro inicial do shared no cenário padrão e `TRAIN_TICKS` derivado de `TRAINING_SPECS × TICK_RATE` (drone/mech treináveis) — protocolo **v2** | **51 asserts** (13 protocolo + 8 simulação + 6 economia + 7 A* + 7 recursos + 4 colisão + 6 worker), suíte sem regressão (387 ticks) + harness completo + build 689 kB + `dist-proof` 11/8/0 |
| 2.6.3 ✅ | **ENTREGUE (S17)**: coleta D-2.6-B (6 ticks ≈ 3,33 un/s; 10 un em 60 ticks), física inercial D-2.6-C no servidor (`velocity`/`heading` no snapshot **v3**), colisão unificada em `shared/collision` (1.12.4), `DROPOFF_RANGE` 10 m (D-2.6.3-A) e clamp ±88 (D-2.6.3-B) — **contrato de testes congelado ANTES da implementação** (estado vermelho registrado em `docs/evidence/`) | **65 asserts** (13+8+6+9 paridade+5 colisão-shared+7 A*+7 recursos+4 colisão+6 worker) + evidência visual com manifestos + harness completo + build 689 kB + `dist-proof` 11/8/0 |
| 2.6.2 | Paridade de modelo: 5 unidades, custos, `POP_MAX` no servidor | novos asserts: custo debita, pop-cap rejeita, drone/mech treinam |
| 2.6.3 | Reconciliação de coleta e locomoção conforme D-2.6-B e D-2.6-C; **absorve `collision.ts` da spec 03 para `shared/`** (1.12.4) | asserts de taxa de coleta; determinismo preservado; colisão com fonte única |
| 2.6.4 | `snapshot()` no broadcast do `tick()`; protocolo de snapshot versionado com **gancho `viewFor(player)`** (D-2.6-D, sem filtragem) | 2 clientes recebem snapshots idênticos; `viewFor` validado como identidade |
| 2.6.5 | Cliente WS: conexão, buffer de interpolação, reconciliação, HUD por snapshot | `gather-e2e` passa **contra o servidor**, sem economia local |
| 2.6.6 | Remoção da simulação client-side (os 5 `TODO-2.6`) | `grep -c TODO-2.6 client/src` = 0 |

**Gate de aprovação da fase**: `gather-e2e.mjs` e `test-buttons.mjs` passam com o servidor como única autoridade; `debugAddResources` deixa de ter efeito sobre o placar; dois navegadores veem o mesmo estado.

---

## 6. Riscos

| Risco | Mitigação |
| :--- | :--- |
| Regressão da experiência já aprovada em playtest | Rodar `test-buttons` + `gather-e2e` a cada sub-fase; nenhuma sub-fase fecha com gate vermelho |
| Perda do determinismo do servidor | Nenhum `Math.random` e nenhum `Date.now` entram em `server/src` ou `shared/`; usar `rng.ts` |
| `shared/` virar depósito de tudo | Regra dura: zero dependências de runtime. Se precisa de Three.js ou `ws`, não pertence ao `shared/` |
| Escopo escorregar para dentro da Fase 3 | Snapshot broadcast (2.6.4) é explicitamente puxado da Fase 3 para cá; lobby, descoberta de IP e múltiplos jogadores **permanecem** na Fase 3 |

---

*Registro assinado por:*
- **Harness/Agente**: Claude Code CLI
- **Modelo LLM**: Claude Opus 5 (1M context)
- **Timestamp**: 2026-09-10T12:30:00-03:00
