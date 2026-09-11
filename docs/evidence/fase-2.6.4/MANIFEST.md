# MANIFEST.md — Evidência da Fase 2.6.4 (Broadcast autoritativo + `viewFor`)

> **Fase**: 2.6.4 — broadcast de snapshot por tick (full JSON 20 Hz, D-2.6.4-A) com o gancho
> `viewFor(player)` como identidade (D-2.6-D, sem filtragem até a Fase 3).
> **Contrato congelado**: `server/src/__tests__/broadcast.test.ts` + `tools/visual-check/broadcast-e2e.mjs`
> (escritos ANTES da implementação; preservados sem alteração).
> **Como reproduzir**: comandos por captura, abaixo de cada entrada.

<!-- EVIDENCE:INDEX:BEGIN -->
| ID | Tipo | Status | Título | Arquivo |
| :-- | :-- | :-- | :-- | :-- |
| `fase-2.6.4/t-00-broadcast-rede/01-e2e` | texto | **passou** | Broadcast E2E (2 clientes) | [t-00-broadcast-rede/01-e2e.txt](t-00-broadcast-rede/01-e2e.txt) |
| `fase-2.6.4/t-00-suite-do-servidor/00-green` | texto | **passou** | Suíte do servidor — execução green | [t-00-suite-do-servidor/00-green.txt](t-00-suite-do-servidor/00-green.txt) |
| `fase-2.6.4/t-00-suite-do-servidor/00-red` | texto | **falhou** | Suíte do servidor — execução red | [t-00-suite-do-servidor/00-red.txt](t-00-suite-do-servidor/00-red.txt) |
| `fase-2.6.4/t-01-broadcast-rede/01-serie` | texto | **passou** | Série real de bytes por tick | [t-01-broadcast-rede/01-serie.txt](t-01-broadcast-rede/01-serie.txt) |
| `fase-2.6.4/t-02-grafico/01-render` | screenshot | **validado** | Gráfico canônico da fase (bytes/tick) | [t-02-grafico/01-render.png](t-02-grafico/01-render.png) |
<!-- EVIDENCE:INDEX:END -->

---
*Gerado por `tools/visual-check/lib/evidence.mjs` — Sessão 18.*
