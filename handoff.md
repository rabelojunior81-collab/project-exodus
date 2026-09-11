# handoff.md — Transição de Turno Operacional

> **Turno Corrente**: Sessão 18 — Fase 2.6.4 (broadcast por tick + `viewFor`) concluída
> **Última Modificação**: 2026-09-11T15:35:00-03:00
> **Leitura obrigatória antes de retomar**: `docs/journal/2026-09-11_15-35_sessao-18-fase-2.6.4.md` + `docs/evidence/fase-2.6.4/MANIFEST.md`

---

## 1. O que foi realizado neste turno (Sessão 18)

1. **Fase 2.6.4 entregue com contrato congelado primeiro**: `broadcast.test.ts` (6 asserts) e
   `broadcast-e2e.mjs` (2 clientes reais) escritos e registrados em **vermelho** antes da
   implementação; verdes **sem alteração** depois.
2. **Broadcast autoritativo**: `GameServer.tick()` drena o snapshot 1×/tick e transmite envelope
   **v3** a cada cliente via `takeTickPayload`/`serializeSnapshot`.
3. **`viewFor(player)` identidade** (D-2.6-D): mesmos bytes para todos — **0 divergências** em 60
   ticks com dois clientes reais; contrato da filtragem (Fase 3) documentado no código.
4. **Backpressure** por drop de tick (`bufferedAmount > 256 KB`, nunca enfileira) + métricas
   (`getNetworkStats`) + resumo no console (1 s).
5. **Números reais medidos**: **1.388 B/tick · 26,7 KB/s · 19,4 Hz** (gatilho de reavaliação
   D-2.6.4-A: 300 KB/s).
6. **Evidência + crônica**: série real + gráfico canônico verificado visualmente e publicado como
   5ª crônica da landing ("O servidor aprende a falar"); utilitários reutilizáveis
   (`measure-broadcast-series.mjs`, `render-broadcast-chart.mjs`).

---

## 2. Estado de Compilação e Testes (verificado nesta sessão)

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Typecheck servidor | `tsc --noEmit -p server/tsconfig.json` | 🟢 0 erros |
| Suíte do servidor | `cd server && npm test` | 🟢 smoke + **71 asserts** (broadcast: 6 novos; anteriores intactos) |
| E2E de rede | `node tools/visual-check/broadcast-e2e.mjs` | 🟢 60 snapshots/cliente · **0 divergências** · v3 · monotônico |
| Série de bytes | `node tools/visual-check/measure-broadcast-series.mjs 60` | 🟢 1.387–1.388 B/tick (estabilidade de 1 byte) |
| Gráfico | `node tools/visual-check/render-broadcast-chart.mjs` | 🟢 SVG + render verificado visualmente |
| Build do servidor | `cd server && npm run build` | 🟢 tsc emit limpo |

⚠️ **Nota de execução**: o E2E de rede usa a porta **8080** (servidor real). Nada mais deve estar
rodando nela. O `broadcast-e2e` sobe e derruba o servidor sozinho.

---

## 3. Decisões Tomadas (S18)

| # | Decisão |
| :-- | :--- |
| D-18.1 | Drenar snapshot em todo tick (sem acúmulo de eventos quando não há clientes) |
| D-18.2 | Backpressure por drop de tick — nunca enfileirar |
| D-18.3 | `clientId` de conexão separado do `playerId` (prepara Fase 3) |
| D-18.4 | `viewFor` devolve a mesma referência (identidade barata); Fase 3 muda conteúdo, não shape |
| D-18.5 | Métricas expostas em `getNetworkStats()` + série medida como evidência |
| D-18.6 | ACK legado mantido; formalização na 2.6.5 **dentro da v3** (contrato congela a versão) |

---

## 4. Pendências Críticas para o Próximo Turno

**Ordem sugerida:**

1. **Sub-fase 2.6.5** — cliente WebSocket:
   - conectar em `ws://<host>:8080` (LAN/Tailscale), receber SNAPSHOT v3 e **aplicar estado**;
   - **buffer de interpolação fixo ~100 ms** (D-2.6.5-A) para render suave a 60 fps;
   - **comandos reais** (MOVE/GATHER/TRAIN/CANCEL) via envelope + `CMD_ACK` formalizado **na v3**;
   - **RTT instrumentado** input→ACK→snapshot (gatilho de reavaliação da predição: p95 > 80 ms);
   - **hooks de debug dev-only** (D-2.6.5-B): `window.__rts` sob `import.meta.env.DEV`/flag;
   - contrato congelado antes (novo teste de fase + E2E de navegador contra o servidor).
   - Gate do spec: `gather-e2e` passa **contra o servidor**, sem economia local.
2. **2.6.6** — remoção da simulação client-side (`grep -c TODO-2.6 client/src` = 0) + auditoria.
3. **CI** — incluir `broadcast-e2e`, `server-suite-evidence`, `verify-manifest` no workflow
   (hoje só o Pages roda); atualizar actions (aviso de Node 20 em ações v4/v5).
4. ALTO-05 (stinger/música/`playMusic`), topics/social preview, Lote 3 eras 2–4.

---

## 5. Decisões Aguardando o Usuário

**Nenhuma.** Próximo grill-me: Fase 6 (`docs/specs/05-agentic-play.md` §9) quando a fase iniciar.

---

## 6. Diretivas Permanentes

- Sempre validar `resolveClientAssets()` após mudar estrutura de diretórios.
- `npm run build` em todos os workspaces a cada turno de client/assets.
- MANIFEST/ATTRIBUTION atualizados junto com novos assets — verificados contra o disco.
- Antes de retomar, ler `handoff.md`, `estate.md` e o journal mais recente.
- Alegação de gate só entra em documento se tiver sido executada no turno.
- `shared/` é a fonte única; `LEGACY (fase)` marca dívida datada com a sub-fase dona.
- Comando com débito de recursos **precisa** ser idempotente e guardar o custo aplicado.
- Contrato de fase escreve-se **antes** da implementação e é registrado em `docs/evidence/` no
  estado vermelho; testes congelados não se alteram depois (novo teste = nova fase).
- Toda captura de evidência tem manifesto (cena, esperado, observado, status, comando, commit).
- A cada fechamento de fase, adicionar uma crônica na landing; **verificar visualmente** cada
  imagem antes de publicar e **variar enquadramento** entre crônicas (menu/close-up/HUD/FX/gráfico).
- `phase-2.6.3-e2e` exige preview 4173 **e** dev 5173; `broadcast-e2e` exige a porta **8080** livre.
- **Novo (S18)**: **o relógio fica no transporte, nunca na simulação** — nada de `Date.now()` em
  `simulation/worker/grid/broadcast`; ordem/medição temporal é responsabilidade do `index.ts`.
- **Novo (S18)**: **backpressure é drop, não fila** — cliente lento perde o tick e conta o drop.
- **Novo (S18)**: todo envio a cliente passa por **`viewFor(player, snapshot)`** — nunca enviar o
  snapshot cru por outro caminho; é o único ponto de projeção para a filtragem da Fase 3.

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-11T15:35:00-03:00
