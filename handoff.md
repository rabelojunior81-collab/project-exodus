# handoff.md — Transição de Turno Operacional

> **Turno Corrente**: Sessão 15 — Workspace `shared/` (Fase 2.6.1) concluída
> **Última Modificação**: 2026-09-10T21:05:00-03:00
> **Leitura obrigatória antes de retomar**: `docs/journal/2026-09-10_21-05_sessao-15-workspace-shared.md`

---

## 1. O que foi realizado neste turno (Sessão 15)

1. **Fase 2.6.1 entregue**: workspace `@project-exodus/shared` (protocol/units/economy/world +
   barrel) consumido por cliente e servidor via `dist`; `composite` do `tsconfig.base.json`
   finalmente em uso (MED-07 fechado); prescripts (`predev`/`prebuild`/`pretest`) garantem
   `build:shared`.
2. **Fonte única de verdade**: tipos (`UnitType` 5 / `BuildingType` 3), stats, custos, tempos,
   recursos, POP, layout dos 8 veios e spawns — divergência entre lados agora **não compila**.
   Listas espelhadas à mão morreram (veios em 3 lugares → 1; tipo de unidade em 3 → 1).
3. **Zero mudança de comportamento**: valores decididos mas não aplicados ficaram marcados
   `LEGACY (2.6.1)` com a sub-fase dona (tempos D-2.6-A → 2.6.2; intervalo D-2.6-B → 2.6.3).
4. **Divergências residuais descobertas** na extração: `DROPOFF_RANGE` (10×14) e clamp de mundo
   (±88×±90) — viraram decisões `D-2.6.3-A/B` no grill-me.
5. **Grill-me 2.6.x aberto** (`docs/decisions/2026-09-10_fase-2.6.x-abertas.md`, 7 decisões) —
   conduzir antes da 2.6.2.
6. **Documentos vivos sincronizados**: journal S15, estate, roadmap, spec 02 (§3.1 + §5), changelog.

---

## 2. Estado de Compilação e Testes (verificado nesta sessão)

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Shared compila | `npm run build:shared` | 🟢 dist + d.ts |
| Typechecks (4 workspaces) | `tsc --noEmit` shared/client/server/studio | 🟢 0 erros |
| Suíte do servidor | `cd server && npm test` | 🟢 smoke + **43 asserts** (387 ticks e determinismo intactos) |
| Build de produção | `cd client && npm run build` | 🟢 27 módulos; 689,19 kB (gzip 182,31) |
| Produção | `dist-proof.mjs` | 🟢 11 ent / 8 nós / 0 pageerrors |
| Colisão | `collision-e2e.mjs` | 🟢 minDistCC 8,701 · veio 3,101 · 0 pageerrors |
| Coleta E2E | `gather-e2e.mjs` | 🟢 entrega 180→190 |
| HUD | `test-buttons.mjs` | 🟢 10/10 + coleta-e2e |

⚠️ **Não executados nesta sessão**: nada pendente dos gates padrão; FPS real segue sem medição
(harness em swiftshader).

---

## 3. Decisões Tomadas (S15)

| # | Decisão |
| :-- | :--- |
| D-15.1 | Consumo do shared via `dist` + prescripts (compatível com `rootDir` do servidor e `ts-node`) |
| D-15.2 | Extração sem mudança de comportamento (`LEGACY (2.6.1)` marca o que falta aplicar) |
| D-15.3 | Re-exports preservam a API pública dos consumidores (zero churn nos testes) |
| D-15.4 | `UnitType`/`BuildingType` canônicos no shared — união duplicada eliminada |
| D-15.5 | Resolvedor de colisão permanece fora (1.12.4 dentro do 2.6.3) |

---

## 4. Pendências Críticas para o Próximo Turno

**Ordem sugerida:**

1. **Rodar o grill-me 2.6.x** (7 decisões em `docs/decisions/2026-09-10_fase-2.6.x-abertas.md`) —
   especificamente as de 2.6.2 (`D-2.6.2-A/B`), que destravam a próxima sub-fase.
2. **Sub-fase 2.6.2** — paridade de modelo: custos debitados no `TRAIN`, `POP_MAX` rejeitando,
   `TRAIN_TICKS` → `TRAINING_SPECS × TICK_RATE` (remove os `LEGACY`); drone/mech treináveis.
   Gate: novos asserts (custo debita, pop-cap rejeita) + 43 antigos intactos.
3. **2.6.3** — coleta D-2.6-B, física D-2.6-C, colisão 1.12.4, decisões `D-2.6.3-A/B`.
4. **ALTO-05** (stinger/música/`playMusic`), **CI** de gates, **topics/social preview**, **Lote 3** eras 2–4.
5. **Performance** — medir FPS em GPU real quando possível.

---

## 5. Decisões Aguardando o Usuário

Ver `docs/decisions/2026-09-10_fase-2.6.x-abertas.md` — 7 itens com contexto, opções e recomendação:
`D-2.6.2-A` (cancel train), `D-2.6.2-B` (POP), `D-2.6.3-A` (dropoff), `D-2.6.3-B` (clamp),
`D-2.6.4-A` (broadcast), `D-2.6.5-A` (interpolação), `D-2.6.5-B` (debug hooks).

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
- **Novo (S15)**: `shared/` é a fonte única — nunca duplicar valor entre cliente e servidor;
  se divergirem, mover para o shared (ou marcar `LEGACY (fase)` com a decisão registrada).
- **Novo (S15)**: nunca editar `shared/dist` à mão; o build é automático via prescripts — se um
  consumidor reclamar de tipo faltante, rode `npm run build:shared`.
- **Novo (S15)**: harness de colisão exige preview em 4173 (`collision-e2e.mjs`); os demais E2E
  exigem dev em 5173 — subir o servidor certo antes de acusar falha.

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-10T21:05:00-03:00
