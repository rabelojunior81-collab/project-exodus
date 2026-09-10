# Sessão 14 — Colisão e Obstáculos (Fase 1.12)

> **Ciclo**: diretiva do usuário na sessão de decisões da Fase 2.6 (D-2.6-C = A):
> *"já adicione/injete uma implementação de física de terreno, buildings, sucatas, etc.
> Ou seja, que as unidades não passem por cima das coisas, como se fosse hologramas."*
> **Data/Hora**: 2026-09-10T20:45:00-03:00
> **Escopo**: `client/src/engine/{collision,props,unit,main}`, `server/src/{simulation,__tests__}`,
> `tools/visual-check/collision-e2e.mjs` (novo), spec 03 (nova).
> **Método**: SDD (spec antes do código) + gates reais executados no turno.

---

## 0. Sumário Executivo

Implementada a **física de colisão** que faltava: unidades agora deslizam, param e desviam de
construções, veios e props sólidos — no cliente (o jogo que se joga hoje) **e** no servidor
autoritativo (para a 2.6). O terreno penaliza velocidade por declive; o mundo tem limites
físicos; unidades não se empilham. **Zero regressões**: todos os gates anteriores seguem verdes.

Números exatos do gate principal (`collision-e2e.mjs`, build de produção):

```
COLLISION {"minDistCC":8.7,"contactCC":8.7,"arrivedCC":true,
           "minDistNode":3.392,"finalNodeDist":3.101,"contactNode":3.1,"pageErrors":0}
```

A unidade raspou o Centro de Comando a **8,700 m** (contato teórico 8+0,7) **sem nunca entrar**,
contornou e chegou ao destino; no veio, parou **encostada a 3,101 m** (círculo de 3,1). O
comportamento de "holograma" acabou, com prova numérica.

---

## 1. O Que Foi Entregue

### 1.1 Spec

- `docs/specs/03-colisao-e-obstaculos.md` — modelo, constantes, algoritmo, impactos "ao redor"
  (coleta/dropoff/rally/disperse), riscos e sub-fases.

### 1.2 Cliente

- **`engine/collision.ts` (novo)** — `CollisionWorld.resolveMove` (sub-passos ≤ 0,5 m,
  projeção em 2 iterações, deslize emergente, normal acumulada), `resolveTarget` (destino
  dentro de obstáculo vai para a borda — unidade para encostada), `separateUnits` (soft-body
  determinístico por id), `slopeSpeedFactor` (declive), `clampWorld` (±88 m).
- **`engine/props.ts`** — props sólidos por família com raio derivado da escala: ruínas 1,15·sx,
  colunas 1,20·sx, destroços 1,70·sx, árvores 0,55·sx, barris 0,60·sx, escombros 1,25·sx
  (~225 círculos). Props finos (postes, estacas, placas, vigas) permanecem decorativos.
- **`entities/unit.ts`** — raio físico por tipo (`UNIT_COLLISION_RADIUS`), desvio tangencial
  frontal com lado determinístico, `slopeSpeedFactor` aplicado à velocidade-alvo,
  `resolveStaticCollision` pós-separação, `setCollisionWorld`, `applyPhysicsPush`.
- **`main.ts`** — `CollisionWorld` com construções (`BUILDING_COLLISION_RADIUS` espelhando o
  servidor: 8/6/4,5) + 8 veios (r 2,4) + props sólidos; separação unidade×unidade por frame;
  helpers de harness (`getObstacles`, `getUnitStates`, `debugOrderMove`).

### 1.3 Servidor

- **`simulation.ts`** — `UNIT_COLLISION_RADIUS` (0,7/0,75/2,0), `NODE_COLLISION_RADIUS` (2,4),
  `projectOutOfObstacles` + `pushOut` em `advance()`; veios **fora do A\*** de propósito
  (a chegada da coleta dispara a 4 m, antes do contato de 3,1 m — sem regressão na FSM).
- **`__tests__/collision.test.ts` (novo)** — 4 asserts: projeção no CC, travessia com chegada,
  projeção no veio, determinismo preservado. Suíte total: **43 asserts**.

### 1.4 Harness

- **`tools/visual-check/collision-e2e.mjs` (novo)** — duas fases: travessia da linha do CC
  (mede distância mínima e chegada) e parada encostada no veio; falha com exit 1 em qualquer
  violação; `BASE_URL` configurável.

---

## 2. Gates Executados Nesta Sessão (evidência)

| # | Gate | Comando | Resultado |
| :-- | :--- | :--- | :--- |
| G1 | Typecheck cliente | `tsc --noEmit -p client/tsconfig.json` | 🟢 0 erros |
| G2 | Typecheck servidor | `tsc --noEmit -p server/tsconfig.json` | 🟢 0 erros |
| G3 | Suíte do servidor | `cd server && npm test` | 🟢 smoke + **43 asserts** (11+7+7+8+4 [novos]+6) |
| G4 | Determinismo com colisão | assert 4 do `collision.test.ts` | 🟢 snapshots idênticos |
| G5 | FSM de coleta (sem regressão) | assert "387 ticks" do `worker.test.ts` | 🟢 inalterado |
| G6 | Colisão em produção (runtime) | `node tools/visual-check/collision-e2e.mjs` | 🟢 minDistCC 8,700 · chegada OK · veio 3,101 · 0 pageerrors |
| G7 | Coleta E2E (sem regressão) | `node tools/visual-check/gather-e2e.mjs` | 🟢 ciclo colheu + entregou (180→190) |
| G8 | Botões do HUD (sem regressão) | `node tools/visual-check/test-buttons.mjs` | 🟢 10/10 + coleta-e2e |
| G9 | Prova de produção | `node tools/visual-check/dist-proof.mjs` | 🟢 11 ent / 8 nós / 0 pageerrors |
| G10 | Build de produção | `cd client && npm run build` | 🟢 688,92 kB (gzip 182,06) |

---

## 3. Decisões de Implementação (S14)

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D-14.1 | Raio físico separado do raio de clique | `selectionRadius` é deliberadamente generoso (buggy 3,2 m); físico = 2,0 m |
| D-14.2 | Construções usam o **mesmo** raio do servidor (8/6/4,5) | Paridade futura; evita over-blocking do platô r30 já validado no A* |
| D-14.3 | Veios fora do A* (só projeção) | Inserir veios no grid mudaria o fallback `nearestWalkable` e poderia regredir a FSM/asserts da coleta |
| D-14.4 | Props longos (colunas/destroços) com 1 círculo por escala | Conservador; multi-círculo fica para 1.12.3+ se a inspeção visual pedir |
| D-14.5 | Desvio frontal por tangente persistida (`detourSide`) | Determinístico, sem RNG; converge porque só age enquanto `blocked` |
| D-14.6 | Re-resolução estática após separação | Fecha o furo "empurrão joga para dentro de prop/prédio" |

---

## 4. Pendências

1. **1.12.4** — migrar constantes/resolvedor para `shared/` **junto do 2.6.3** (evita duplicação dupla).
2. Multi-círculo para props longos (avaliar com inspeção visual; hoje conservador).
3. FPS não medido em GPU real (o harness segue em swiftshader) — orçamento teórico ~5 mil
   checagens/frame com early-out; medir quando houver acesso a GPU.
4. Decisões **D-2.6-D** e **D-2.6-E** seguem abertas (pergunta 4 de 5 será conduzida a seguir).

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-10T20:45:00-03:00
