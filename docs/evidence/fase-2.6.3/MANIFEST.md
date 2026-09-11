# MANIFEST.md — Evidência da Fase 2.6.3 (Reconciliação: coleta, física, colisão, limites)

> **Fase**: 2.6.3 — coleta D-2.6-B (0,3 s/un), física D-2.6-C no servidor, colisão para `shared/`
> (1.12.4), `DROPOFF_RANGE` 10 m (D-2.6.3-A) e clamp ±88 (D-2.6.3-B).
> **Contrato congelado**: `server/src/__tests__/parity.test.ts` + `tools/visual-check/phase-2.6.3-e2e.mjs`
> (escritos ANTES da implementação; preservados sem alteração).
> **Como reproduzir**: comandos por captura, abaixo de cada entrada.

<!-- EVIDENCE:INDEX:BEGIN -->
| ID | Tipo | Status | Título | Arquivo |
| :-- | :-- | :-- | :-- | :-- |
| `fase-2.6.3/t-00-cena-inicial/01-overview` | screenshot | **validado** | Visão geral da base no boot | [t-00-cena-inicial/01-overview.png](t-00-cena-inicial/01-overview.png) |
| `fase-2.6.3/t-00-suite-do-servidor/00-green` | texto | **passou** | Suíte do servidor — execução green | [t-00-suite-do-servidor/00-green.txt](t-00-suite-do-servidor/00-green.txt) |
| `fase-2.6.3/t-00-suite-do-servidor/00-red` | texto | **falhou** | Suíte do servidor — execução red | [t-00-suite-do-servidor/00-red.txt](t-00-suite-do-servidor/00-red.txt) |
| `fase-2.6.3/t-01-ida-ao-veio/01-ordem-emitida` | screenshot | **aplicado** | Ordem de movimento ao veio emitida | [t-01-ida-ao-veio/01-ordem-emitida.png](t-01-ida-ao-veio/01-ordem-emitida.png) |
| `fase-2.6.3/t-01-ida-ao-veio/02-no-veio` | screenshot | **passou** | Catador encostado no veio | [t-01-ida-ao-veio/02-no-veio.png](t-01-ida-ao-veio/02-no-veio.png) |
| `fase-2.6.3/t-02-travessia-colisao/02-chegada` | screenshot | **passou** | Chegada após contornar o prédio | [t-02-travessia-colisao/02-chegada.png](t-02-travessia-colisao/02-chegada.png) |
| `fase-2.6.3/t-03-coleta-e2e/01-transcricao` | texto | **passou** | Coleta E2E do harness (gate existente) | [t-03-coleta-e2e/01-transcricao.txt](t-03-coleta-e2e/01-transcricao.txt) |
| `fase-2.6.3/t-99-fechamento/01-estado-final` | screenshot | **passou** | Estado final da sessão de evidência | [t-99-fechamento/01-estado-final.png](t-99-fechamento/01-estado-final.png) |
<!-- EVIDENCE:INDEX:END -->

---
*Gerado por `tools/visual-check/lib/evidence.mjs` — Sessão 17.*
