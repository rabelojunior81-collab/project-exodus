# handoff.md — Transição de Turno Operacional

> **Turno Corrente**: Sessão 16 — Fase 2.6.2 (paridade de modelo: custos, POP, cancel v2) concluída
> **Última Modificação**: 2026-09-11T01:10:00-03:00
> **Leitura obrigatória antes de retomar**: `docs/journal/2026-09-11_01-10_sessao-16-fase-2.6.2.md`

---

## 1. O que foi realizado neste turno (Sessão 16)

1. **Fase 2.6.2 entregue**: custos de treino **debitados** no aceite e **reembolsados integralmente**
   no novo **`CANCEL_TRAIN`** (protocolo **v2**, D-2.6.2-A); **teto populacional global 20**
   (D-2.6.2-B); **tesouro inicial do shared** no cenário padrão; **`TRAIN_TICKS` derivado** de
   `TRAINING_SPECS × TICK_RATE` (drone e mech treináveis; marcadores `LEGACY` eliminados).
2. **Idempotência**: reenvio de `TRAIN` com o mesmo `cmdId` não debita duas vezes (D-16.1).
3. **Shared**: protocolo v2 + `STARTING_RESOURCES` + `COST_KEY_TO_RESOURCE`/`costToResources`
   (a única tradução chave-do-HUD ↔ recurso do protocolo).
4. **Cliente**: tesouro inicial lido do shared — última duplicação numérica da economia eliminada.
5. **Testes**: `economy.test.ts` novo (6 asserts) + protocolo com roundtrip/malformado de
   `CANCEL_TRAIN` + simulação com cenário/versão robustos.
6. **Documentos vivos sincronizados**: journal S16, estate, roadmap, spec 02 (§2.2 e §5), changelog,
   livro de decisões, contadores de asserts (README/README.en/PR template: 43 → 51).

---

## 2. Estado de Compilação e Testes (verificado nesta sessão)

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Typechecks | `tsc --noEmit` shared (build) + client + server + studio | 🟢 0 erros |
| Suíte do servidor | `cd server && npm test` | 🟢 smoke + **51 asserts** (13 protocolo + 8 simulação + 6 economia + 7 A* + 7 recursos + 4 colisão + 6 worker) |
| FSM/determinismo | worker.test + simulation.test | 🟢 387 ticks e snapshots idênticos intactos |
| Build de produção | `cd client && npm run build` | 🟢 27 módulos; 689,28 kB (gzip 182,33) |
| Produção | `dist-proof.mjs` | 🟢 11 ent / 8 nós / 0 pageerrors |
| Colisão | `collision-e2e.mjs` | 🟢 minDistCC 8,701 · veio 3,101 · 0 pageerrors |
| Coleta E2E | `gather-e2e.mjs` | 🟢 entrega 180→190 |
| HUD | `test-buttons.mjs` | 🟢 10/10 |

⚠️ **Não executados**: FPS em GPU real (harness segue swiftshader); nada mais pendente da bateria.

---

## 3. Decisões Tomadas (S16)

| # | Decisão |
| :-- | :--- |
| D-16.1 | Idempotência do `TRAIN` por `cmdId` (reenvio não debita duas vezes) |
| D-16.2 | Reembolso integral no cancelamento (paridade com o cliente) |
| D-16.3 | Tesouro inicial no `createDefaultScenario` (shared) |
| D-16.4 | `TRAIN_TICKS` derivado de `TRAINING_SPECS × TICK_RATE` |
| D-16.5 | Custo guardado no `TrainOrder` (reembolso exato mesmo se a tabela mudar) |

---

## 4. Pendências Críticas para o Próximo Turno

**Ordem sugerida:**

1. **Sub-fase 2.6.3** — escopo fechado no spec 02 §5 + decisões 7/7:
   - Coleta D-2.6-B: intervalo 0,5 s → **0,3 s/un** (6 ticks; ~3,33 un/s) em `worker.ts`;
     recalibrar asserts de tick da FSM.
   - Física D-2.6-C: aceleração/rotação/tração do blindado **no servidor** (snapshot ganha
     velocidade/ângulo); interpolação do cliente deixa de inventar movimento.
   - Colisão para `shared/` (**1.12.4**): resolvedor + constantes em fonte única (cliente e
     servidor); re-baseline deliberado dos asserts de posição se necessário.
   - Decisões `D-2.6.3-A` (dropoff 10 m) e `D-2.6.3-B` (clamp ±88) aplicadas.
   - Gate: coleta com taxa nova + física determinística + colisão com fonte única; suíte total
     sem regressão (recontar asserts).
2. **2.6.4** — broadcast de snapshot por tick + gancho `viewFor(player)` (sem filtragem).
3. **2.6.5** — cliente WebSocket: buffer fixo ~100 ms, comandos reais, RTT instrumentado;
   debug hooks dev-only (D-2.6.5-B começa aqui).
4. **2.6.6** — remoção do legado client-side (sim local vira predição visual) + auditoria.
5. ALTO-05 (stinger/música/`playMusic`), CI de gates, topics/social preview, Lote 3 eras 2–4.

---

## 5. Decisões Aguardando o Usuário

**Nenhuma.** As 7 decisões da 2.6.x foram fechadas em 2026-09-11 (A/A/A/A/A/A/A) e as duas
primeiras aplicadas (2.6.2). O próximo grill-me será o da **Fase 6**
(`docs/specs/05-agentic-play.md` §9, D-6.1..D-6.4) — somente quando a fase for iniciada.

---

## 6. Diretivas Permanentes

- Sempre validar `resolveClientAssets()` após mudar estrutura de diretórios.
- `npm run build` em todos os workspaces a cada turno de client/assets.
- MANIFEST/ATTRIBUTION atualizados **junto com** novos assets — verificados contra o disco.
- Áudio e vídeo lazy-load; nunca no boot.
- Antes de retomar, ler `handoff.md`, `estate.md` e o journal mais recente.
- Alegação de gate só entra em documento se tiver sido executada no turno.
- Nenhuma decisão de spec com o documento em RASCUNHO; `grill-me` antes de código.
- Assets de API com URL temporária devem ser baixados no mesmo turno (expiry 48 h).
- `shared/` é a fonte única — nunca duplicar valor entre cliente e servidor; se divergirem,
  mover para o shared (ou marcar `LEGACY (fase)` com a decisão registrada).
- Nunca editar `shared/dist` à mão; o build é automático via prescripts.
- Harness de colisão exige preview em 4173; demais E2E exigem dev em 5173.
- **Novo (S16)**: comando com débito de recursos **precisa** ser idempotente por `cmdId` e guardar
  o custo aplicado (reembolso exato). Vale para `TRAIN` e para todo comando futuro com custo.
- **Novo (S16)**: nunca editar `TRAIN_TICKS` ou qualquer tabela de treino fora do `shared/` —
  mudou lá, tudo acompanha (o compilador não deixa divergir).

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-11T01:10:00-03:00
