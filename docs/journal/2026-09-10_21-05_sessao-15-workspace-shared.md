# Sessão 15 — Workspace `shared/` (Fase 2.6.1)

> **Ciclo**: primeira entrega da Fase 2.6 — a extração que torna a divergência
> cliente↔servidor **impossível de compilar** (spec 02 §3.1).
> **Data/Hora**: 2026-09-10T21:05:00-03:00
> **Escopo**: workspace novo `shared/`; `client/`, `server/`, raiz e `tsconfig.base.json` (enfim usado).
> **Método**: SDD + extração sem mudança de comportamento; gates reais no turno.

---

## 0. Sumário Executivo

O projeto agora tem **uma fonte única** para tipos, stats, custos, tempos, recursos e o layout
do mundo. `@project-exodus/shared` nasceu com os 4 módulos do spec (`protocol`, `units`,
`economy`, `world` + barrel), é consumido pelo cliente e pelo servidor via `dist` (com
`composite` do base enfim em uso — MED-07 fechado), e a suíte inteira continua verde:
**43 asserts, 4 typechecks, 4 gates de harness** — com zero mudança de comportamento.

A disciplina central da sessão: **valores decididos mas ainda não aplicados não viram mentira**.
Tempos de treino (D-2.6-A), intervalo de coleta (D-2.6-B), custos/pop no servidor e o resolvedor
de colisão permanecem nos consumidores marcados `LEGACY (2.6.1)` ou fora do escopo por design —
cada um com a sub-fase que os aplica. A extração não antecipou fases.

**Bônus da extração**: duas divergências reais que ninguém tinha catalogado vieram à tona ao
comparar os lados — `DROPOFF_RANGE` (cliente 10 × servidor 14) e o clamp de mundo (cliente ±88
com margem visual × servidor ±90). Ambas entram no grill-me para a 2.6.3.

---

## 1. O Que Foi Entregue

### 1.1 Workspace

- `shared/package.json` (`@project-exodus/shared`, exports map com `types`+`import` para `.` e
  subpaths), `shared/tsconfig.json` (estende `tsconfig.base.json`: composite/declaration
  herdados), `shared/src/index.ts` (barrel).
- Consumo via **`dist`**: mantém o `tsc` do servidor com `rootDir ./src` e evita transpilar
  `node_modules` no `ts-node`; prescripts em client/server garantem `build:shared`.

### 1.2 Módulos canônicos

| Módulo | Conteúdo |
| :--- | :--- |
| `protocol.ts` | Migrado de `server/src/protocol.ts` (git rm); comandos, snapshots, eventos, serialize/deserialize, `ProtocolError` |
| `units.ts` | `UnitType` (5) e `BuildingType` (3) canônicos; `UNIT_STATS` (hp/velocidade/raio), `BUILDING_STATS` (hp/raio/ticks), `TRAINING_SPECS` (custo/tempo — decisão D-2.6-A) |
| `economy.ts` | `ResourceKind`/`RESOURCE_KINDS`, `POP_MAX`, capacidade de carga, alcance e rendimento de coleta |
| `world.ts` | Dimensões, grade, platô, crateras, conversões de coordenadas, layout dos 8 veios, spawns, raios de layout e `NODE_COLLISION_RADIUS` |

### 1.3 Migração dos consumidores (compatível)

- **Servidor**: `grid.ts`, `resources.ts`, `worker.ts`, `simulation.ts`, `index.ts` e 3 testes
  importam do shared; **re-exports preservam toda a API pública anterior** (nenhum teste mudou de
  import fora do protocol).
- **Cliente**: `main.ts` (veios derivados do layout canônico, `POP_MAX`, tabela de treino),
  `unit.ts` (tipo canônico + stats), `collision.ts` (raios derivados), `props.ts` (posições dos
  veios derivadas — a lista espelhada morreu), `terrainHeight.ts` (platô/rampa), `building.ts`
  (tipo + hp).
- **Tipos duplicados eliminados**: a união de 5 tipos de unidade existia em 3 lugares (cliente,
  protocolo do servidor, cliente-collision) — agora só no shared; o compilador vira o gate.

---

## 2. Gates Executados Nesta Sessão (evidência)

| # | Gate | Comando | Resultado |
| :-- | :--- | :--- | :--- |
| G1 | Shared compila | `npm run build:shared` | 🟢 dist + d.ts |
| G2 | Typecheck shared/cliente/servidor/studio | `tsc --noEmit` ×4 | 🟢 0 erros (4/4) |
| G3 | Suíte do servidor | `cd server && npm test` (com `pretest` compilando o shared) | 🟢 smoke + **43 asserts** — inclui 387 ticks da FSM e determinismo |
| G4 | Build de produção | `cd client && npm run build` (com `prebuild`) | 🟢 27 módulos; 689,19 kB (gzip 182,31) |
| G5 | Prova de produção | `dist-proof.mjs` | 🟢 11 ent / 8 nós (layout do shared) / 0 pageerrors |
| G6 | Colisão (constantes do shared) | `collision-e2e.mjs` | 🟢 minDistCC **8,701** · veio **3,101** · 0 pageerrors |
| G7 | Coleta E2E | `gather-e2e.mjs` | 🟢 entrega confirmada (180→190) |
| G8 | HUD (custos/tempos do shared) | `test-buttons.mjs` | 🟢 10/10 + coleta-e2e |
| G9 | Lockfile | `npm install` | 🟢 workspace linkado; 0 vulnerabilidades |

---

## 3. Decisões de Implementação (S15)

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D-15.1 | Consumo do shared via `dist` + prescripts | Mantém `rootDir` do servidor e o `ts-node`; DX aceitável |
| D-15.2 | Extração **sem mudança de comportamento** | Fase é estrutural; valores decididos ficam `LEGACY (2.6.1)` até sua sub-fase |
| D-15.3 | Re-exports nos consumidores | Zero churn em testes/imports; API pública do servidor preservada |
| D-15.4 | `UnitType`/`BuildingType` canônicos no shared | Elimina a união duplicada em 3 arquivos — divergência agora não compila |
| D-15.5 | Resolvedor de colisão fica fora (1.12.4/2.6.3) | Migrar lógica mudaria posições e re-basearia asserts — trabalho da reconciliação, com decisão própria |
| D-15.6 | Placar de recursos inicial e `PLAYER` do teste inalterados | Extração pura |

---

## 4. Divergências Residuais Descobertas (para a 2.6.3)

| Item | Cliente | Servidor | Proposta |
| :--- | :--- | :--- | :--- |
| `DROPOFF_RANGE` | 10 m | 14 m | Adotar 10 (validado no playtest; contato CC+unidade = 8,7) |
| Clamp do mundo | ±88 m (margem 2 m) | ±90 m | Adotar 88 nos dois (margem visual consistente) |

Ambas entram como decisões formais (`D-2.6.3-A/B`) no grill-me da S15.

## 5. Pendências

1. **Grill-me 2.6.x** (7 decisões) — arquivo `docs/decisions/2026-09-10_fase-2.6.x-abertas.md`.
2. **2.6.2** — custos/pop/tempos no servidor (consome `TRAINING_SPECS`/`POP_MAX`; remove `LEGACY`).
3. **2.6.3** — coleta D-2.6-B, física D-2.6-C, colisão 1.12.4, decisões de dropoff/clamp.
4. ALTO-05 (música/áudio), CI de gates, topics/social preview, Lote 3 eras 2–4.

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-10T21:05:00-03:00
