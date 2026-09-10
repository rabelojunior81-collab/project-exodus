# handoff.md — Transição de Turno Operacional

> **Turno Corrente**: Sessão 14 — Colisão (Fase 1.12) + encerramento das decisões da 2.6 (concluída)
> **Última Modificação**: 2026-09-10T20:55:00-03:00
> **Leitura obrigatória antes de retomar**: `docs/journal/2026-09-10_20-45_sessao-14-colisao-e-obstaculos.md`

---

## 1. O que foi realizado neste turno (Sessão 14)

Diretiva do usuário (na sessão de decisões da 2.6, em resposta a D-2.6-C = A):
*"adicione física de terreno, buildings, sucatas — que as unidades não passem por cima das coisas
como se fossem hologramas"*.

1. **Fase 1.12 entregue** (spec nova `docs/specs/03-colisao-e-obstaculos.md`):
   - Cliente: `engine/collision.ts` (sub-passos ≤0,5 m, projeção com deslize, desvio frontal
     determinístico, separação unidade×unidade, declive, clamp ±88 m); props sólidos por família
     em `props.ts` (~225 círculos); integração completa em `unit.ts`/`main.ts`.
   - Servidor: `advance()` projeta fora de construções + veios; constantes espelhadas;
     veios **fora do A\*** de propósito (preserva a FSM de coleta).
   - Harness: `collision-e2e.mjs` novo (travessia do CC + parada encostada no veio).
2. **D-2.6-C registrada = A** (migrar física para o servidor) no livro de decisões e no spec 02;
   a migração para `shared/` fica no 2.6.3 (sub-fase 1.12.4).
3. **Decisões da Fase 2.6 fechadas** (sessão `grill-me`, 5/5 — escolhas A/A/A/A/A): tempos do
   cliente; coleta incremental recalibrada; física migra com colisão; fog client-side com gancho
   `viewFor`; sem predição + métrica de RTT. **Spec 02 promovido a APROVADO; Fase 2.6 desbloqueada.**
   Registro: `docs/decisions/2026-09-10_fase-2.6-paridade.md`.
4. **Documentos vivos sincronizados**: journal S14 (+ journal das decisões), estate, roadmap, changelog.

---

## 2. Estado de Compilação e Testes (verificado nesta sessão)

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| tsc client | `node_modules/.bin/tsc --noEmit -p client/tsconfig.json` | 🟢 0 erros |
| tsc server | `node_modules/.bin/tsc --noEmit -p server/tsconfig.json` | 🟢 0 erros |
| Suíte do servidor | `cd server && npm test` | 🟢 smoke + **43 asserts** (4 novos de colisão) |
| Colisão em runtime | `node tools/visual-check/collision-e2e.mjs` (preview 4173) | 🟢 minDistCC **8,700** · chegada OK · veio **3,101** · 0 pageerrors |
| Coleta E2E | `node tools/visual-check/gather-e2e.mjs` (dev 5173) | 🟢 entregou 180→190 |
| HUD | `node tools/visual-check/test-buttons.mjs` | 🟢 10/10 + coleta-e2e |
| Produção | `node tools/visual-check/dist-proof.mjs` | 🟢 11 ent / 8 nós / 0 pageerrors |
| Build | `cd client && npm run build` | 🟢 688,92 kB (gzip 182,06 kB) |
| Manifesto | `node tools/verify-manifest.mjs` | 🟢 100% (rodado na S13; sem mudança de assets na S14) |

**Não executados nesta sessão**: FPS em GPU real (harness segue swiftshader); `npm run build`
dos workspaces `server`/`studio` (nenhuma mudança fora do `server/src` coberto pelo tsc+test).

---

## 3. Decisões Tomadas (S14)

| # | Decisão |
| :-- | :--- |
| D-14.1 | Raio físico separado do raio de clique (buggy: físico 2,0 m × clique 3,2 m) |
| D-14.2 | Construções usam o mesmo raio do servidor (8/6/4,5) — paridade futura |
| D-14.3 | Veios fora do A*; colisão apenas por projeção em runtime |
| D-14.4 | Props longos aproximados por 1 círculo conservador (multi-círculo se a inspeção pedir) |
| D-14.5 | Desvio frontal por tangente persistida, sem RNG |
| D-14.6 | Re-resolução estática pós-separação (nada fica dentro de obstáculo) |

---

## 4. Pendências Críticas para o Próximo Turno

**Ordem sugerida:**

1. **Fase 2.6 desbloqueada — iniciar a sub-fase 2.6.1** (workspace `shared/`; `protocol.ts` migrado;
   `units/economy/world` extraídos; a colisão migra no 2.6.3 = sub-fase 1.12.4). Gate: `tsc` 0 nos
   3 workspaces + 43 asserts intactos. Ordem completa no spec 02 §5.
2. **1.12.4** — migrar colisão/constantes para `shared/` **dentro do 2.6.3** (não antes).
3. **ALTO-05 / 1.11.4**: stinger 58 s → 8–10 s, música 96 kbps, `playMusic`/crossfade; ffmpeg disponível.
4. **CI**: workflow com `tsc`×3 + `npm test` + `verify-manifest` + `collision-e2e` (hoje só Pages).
5. **GitHub (config web)**: topics + social preview.
6. **Lote 3 restante (1.11.6)**: eras 2–4 e remoção do `as any` do piloto.
7. **Performance**: medir FPS em GPU real quando possível.

---

## 5. Decisões Abertas Aguardando o Usuário

| ID | Pergunta | Status |
| :--- | :--- | :--- |
| D-2.6-A | Tempos de treino | ✅ decidida (a) — cliente vence |
| D-2.6-B | Modelo de coleta | ✅ decidida (a) — incremental recalibrado (0,3 s/un) |
| D-2.6-C | Física do blindado | ✅ decidida (a) — migra para o servidor **+ colisão (S14 entregue)** |
| D-2.6-D | Fog of War autoritativo? | ✅ decidida (a) — client-side + gancho `viewFor`; filtragem na Fase 3 |
| D-2.6-E | Predição local? | ✅ decidida (a) — sem predição + métrica de RTT |

**Bloco encerrado em 2026-09-10** — spec 02 APROVADO; nenhuma decisão pendente aguardando o usuário.

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
- **Novo (S14)**: física de colisão é **servidor-autoritativa no futuro** (2.6.3) — no cliente,
  qualquer ajuste deve manter as constantes idênticas às do servidor até a migração para `shared/`.
- **Novo (S14)**: harness de colisão exige preview em 4173 (`collision-e2e.mjs`) ou dev em 5173
  (demais) — subir o servidor certo antes de acusar falha.

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-10T20:45:00-03:00
