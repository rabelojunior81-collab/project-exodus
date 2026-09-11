# handoff.md — Transição de Turno Operacional

> **Turno Corrente**: Sessão 17 — Fase 2.6.3 (reconciliação) + evidência visual + landing narrativa (concluída)
> **Última Modificação**: 2026-09-11T01:50:00-03:00
> **Leitura obrigatória antes de retomar**: `docs/journal/2026-09-11_01-50_sessao-17-fase-2.6.3.md` + `docs/evidence/fase-2.6.3/MANIFEST.md`

---

## 1. O que foi realizado neste turno (Sessão 17)

1. **Fase 2.6.3 entregue com contrato congelado**: testes escritos e registrados em **vermelho
   antes da implementação** (`parity.test.ts` 9 asserts + `collision-shared.test.ts` 5 + E2E do
   cliente); passaram verdes **sem alteração** (só correção prévia de imports).
2. **Coleta D-2.6-B**: 6 ticks/un (0,3 s ≈ 3,33 un/s) — 10 de carga em 60 ticks exatos.
3. **Física D-2.6-C**: inercial no servidor (aceleração/giro do shared; snapshot **v3** com
   `velocity`/`heading`); blindado parte em 0,25 m/s no 1º tick e gira antes de andar de ré.
4. **Colisão 1.12.4**: resolvedor único em `shared/collision`; cliente re-exporta; servidor
   projeta pelo mesmo código; `GridObstacle` separado de `CircleObstacle`.
5. **D-2.6.3-A/B**: dropoff 10 m e clamp ±88 aplicados e provados.
6. **Camada de evidência visual** (`docs/evidence/`): README de convenções, índice por fase,
   helper `lib/evidence.mjs`, runner de suíte com transcrição; capturas com manifestos.
7. **Landing narrativa**: seção "Crônicas da Construção" com 4 capturas de evidência (WebP) e
   convenção de atualização a cada fechamento.
8. **Dois bugs de física capturados pelo contrato** (orçamento composto; waypoint degenerado).

---

## 2. Estado de Compilação e Testes (verificado nesta sessão)

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Typechecks | `tsc --noEmit` shared (build) + client + server + studio | 🟢 0 erros |
| Contrato vermelho | `server-suite-evidence --label red` | 🟢 registrado (`10 !== 6`) |
| Suíte do servidor | `cd server && npm test` | 🟢 smoke + **65 asserts** (contrato 2.6.3 incluso) |
| Evidência verde | `server-suite-evidence --label green` | 🟢 `passou` no manifesto da fase |
| E2E 2.6.3 (congelado) | `node tools/visual-check/phase-2.6.3-e2e.mjs` | 🟢 evidência + invariantes (precisa **preview 4173 E dev 5173**) |
| Produção | `dist-proof.mjs` | 🟢 11 ent / 8 nós / 0 pageerrors |
| HUD | `test-buttons.mjs` | 🟢 10/10 + coleta E2E |
| Build | `cd client && npm run build` | 🟢 28 módulos; 689,29 kB |

⚠️ **Regra operacional nova**: `phase-2.6.3-e2e.mjs` exige **os dois servidores** (preview em 4173
para as capturas; dev em 5173 para o subprocesso `gather-e2e`). Subir ambos antes de rodar.

---

## 3. Decisões Tomadas (S17)

| # | Decisão |
| :-- | :--- |
| D-17.1 | Contratos congelados em arquivos próprios (imunes a ajuste pós-implementação) |
| D-17.2 | Evidência visual em `docs/evidence/` (manifesto/captura + índice/fase) |
| D-17.3 | `GridObstacle` (A*) ≠ `CircleObstacle` (colisão) |
| D-17.4 | Física: 1 alinhamento/tick + orçamento `v×dt` |
| D-17.5 | Cliente consome o shared sem mudança de comportamento (gates provam) |
| D-17.6 | Landing: crônica por fechamento com asset da evidência |

---

## 4. Pendências Críticas para o Próximo Turno

**Ordem sugerida:**

1. **Sub-fase 2.6.4** — broadcast de snapshot a cada tick (`serializeSnapshot` no `tick()` do
   `GameServer`), protocolo com **gancho `viewFor(player)`** (identidade, sem filtragem — D-2.6-D),
   medição de banda (bytes/s) no harness.
   - Contrato congelado antes de implementar: novo `phase-2.6.4` (servidor: 2 clientes recebem o
     mesmo snapshot no tick; `viewFor` validado como identidade; tamanho medido).
2. **2.6.5** — cliente WebSocket (buffer ~100 ms, comandos reais, RTT), hooks dev-only.
3. **2.6.6** — remoção do legado client-side + auditoria final da fase.
4. ALTO-05, CI de gates (incluir `phase-2.6.3-e2e` + `server-suite-evidence`), topics/social,
   Lote 3 eras 2–4.

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
- **Novo (S17)**: contrato de fase escreve-se **antes** da implementação e é registrado em
  `docs/evidence/` no estado vermelho; testes congelados não se alteram depois (novo teste = nova fase).
- **Novo (S17)**: toda captura de evidência tem manifesto (cena, esperado, observado, status,
  comando, commit) — sem manifesto, não é evidência.
- **Novo (S17)**: a cada fechamento de fase, adicionar uma crônica na landing (imagem da evidência
  convertida para WebP + texto PT/EN).
- **Novo (S17)**: `phase-2.6.3-e2e` exige preview 4173 **e** dev 5173 no ar.

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-11T01:50:00-03:00
