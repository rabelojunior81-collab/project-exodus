# Spec 03 — Colisão e Obstáculos (Fase 1.12)

> **Status**: APROVADO — diretiva do usuário na sessão de decisões da Fase 2.6 (10/09/2026):
> *"as unidades não podem passar por cima das coisas como se fossem hologramas"*.
> **Relação com a 2.6**: D-2.6-C decidiu migrar a física para o servidor; esta fase entrega o
> comportamento no cliente **e** a paridade no servidor, e a migração definitiva para `shared/`
> acontece em 2.6.3.

---

## 1. Motivação e escopo

Hoje unidades atravessam construções, veios de recurso e props do cenário: o cliente move em
linha reta sem colisão e o servidor só desvia construções **no planejamento** (A*), sem resolução
em tempo de execução. Esta fase introduz física de colisão 2D (plano XZ):

- **Obstáculos duros**: construções, veios, props sólidos (props finos ficam decorativos).
- **Resposta**: deslizar ao longo do obstáculo, parar em contato e desviar quando bloqueado de frente.
- **Unidade × unidade**: separação suave (empurrão meio-a-meio) para não empilhar.
- **Terreno**: sem paredes por design (não há falésias); declive aplica penalidade de velocidade —
  e crateras, que o servidor já cobra no A* (custo até 5×), ficam lentas também no cliente.
- **Limites do mundo**: clamp em ±88 m (margem de 2 m).

**Fora de escopo (avaliar na 2.6.3)**: modelar veios/props no grid do A*; colisão unidade×unidade
no servidor (soft-body autoritativo); props sólidos no `shared/`.

## 2. Modelo

| Conceito | Definição |
| :--- | :--- |
| Obstáculo | Círculo `{x, z, radius, kind: 'building' \| 'node' \| 'prop'}` — aproximação conservadora |
| Raio de unidade | `collisionRadius` por tipo (menor que `selectionRadius`, que é de clique): worker 0,70 · raider 0,75 · drone 0,70 · mech 1,60 · buggy 2,00 |
| Construções | CC 8 · refinaria 6 · bunker 4,5 — **espelham `BUILDING_RADIUS` do servidor** |
| Veios | 2,4 (anel do veio tem raio 2,6–3,0; coleta dispara a 4 m — nunca colide antes de chegar) |
| Props sólidos | ruínas 1,15·sx · colunas 1,20·sx · destroços 1,70·sx · árvores 0,55·sx · barris 0,60·sx · escombros 1,25·sx |
| Props decorativos | postes, estacas, placas e vigas (finos) — atravessáveis |
| Separação | pares de unidades se empurram proporcional à sobreposição; 2 iterações; ordem por id |
| Declive | `1 / (1 + 1,1·|∇h|)` amostrado a ±0,75 m — platô = 1,00; crateras/rim ≈ 0,6–0,75 |

## 3. Algoritmo (determinístico)

1. **Resolução de movimento** (`resolveMove`): subdivide o passo em segmentos de ≤ 0,5 m
   (anti-tunneling); para cada segmento, projeta o ponto para fora dos círculos em até 2 iterações;
   acumula a normal de correção.
2. **Deslize emergente**: a projeção produz movimento tangencial natural — não há cálculo de
   tangente para o deslocamento, apenas para a *intenção*.
3. **Bloqueio frontal**: quando a normal de correção fica paralela à direção desejada
   (`|direção·tangente| < 0,2`), a unidade orienta a intenção para a tangente (lado escolhido por
   sinal determinístico, persistido em `detourSide`) e avança orbitando até a linha direta abrir.
4. **Destino dentro de obstáculo**: `moveTo` projeta o destino para a borda do círculo
   (centro + (R_obs + r_unit + 0,1) na direção do pedido) — a unidade para encostada, não orbita.
5. **Separação**: vetores de empurrão meio-a-meio, iterados 2×; sem RNG.
6. **Servidor**: mesma projeção em `advance()` (obstáculos: construções + veios), sem steering
   (o A* já desvia construções; veios deslizam por projeção). Determinismo preservado — operações
   puramente aritméticas, iteração ordenada.

## 4. Sub-fases e gates

| Sub-fase | Entrega | Gate | Status |
| :--- | :--- | :--- | :--- |
| 1.12.1 | `client/src/engine/collision.ts` + props sólidos em `props.ts` + integração em `unit.ts`/`main.ts` | `tsc` 0; harness `collision-e2e.mjs` verde (distância mínima ao CC ≥ R+r−0,25; chegada ao destino; sem pageerrors) | ✅ S14 — minDistCC 8,700 / chegada OK / 0 pageerrors |
| 1.12.2 | Paridade no servidor (`advance()` + veios) | `npm test` com novos asserts (projeção CC, projeção veio, travessia sem atravessar, determinismo) | ✅ S14 — 4 asserts novos; suíte em 43; 387 ticks intactos |
| 1.12.3 | Separação unidade×unidade + declive de terreno + clamp de mundo | `test-buttons` e `gather-e2e` continuam verdes; inspeção visual sem overlaps | ✅ S14 — 10/10 + coleta E2E + dist-proof 11/8/0 |
| 1.12.4 | Migração para `shared/` (junto do 2.6.3) | `grep -c "BUILDING_COLLISION_RADIUS" client server` = 1 (uma fonte) | ✅ S17 — `CollisionWorld` e constantes em `shared/src/collision.ts`; cliente re-exporta; servidor usa na projeção; testes `collision-shared` 5 assertos |

## 5. Impactos "ao redor" (checados nesta fase)

- **Coleta**: `GATHER_RANGE` 4 m > contato 2,4+0,7=3,1 m → trabalhador entrega/colhe antes de
  encostar. Nenhuma mudança na FSM.
- **Dropoff**: `DROPOFF_RANGE` 10 m > contato CC 8+0,7=8,7 m → idem.
- **Rally de treino**: servidor spawna a `R + 3` (CC: 11 m) — fora do círculo de colisão. Cliente
  projeta o ponto de rally se cair dentro de obstáculo.
- **Disperse**: pontos em anel de 6 m podem cair dentro do CC → `moveTo` projeta para a borda.
- **Props × spawn**: as zonas de exclusão (núcleo r18, veios r8) evitam props no centro da base;
  os 8 veios nunca recebem props a menos de 8 m.
- **2.6.3**: absorve as constantes e o resolvedor para `shared/`; props sólidos só existirão no
  servidor quando o worldgen migrar (registrado).

## 6. Riscos e mitigação

| Risco | Mitigação |
| :--- | :--- |
| Over-blocking na base (CC r8 no platô r30) | Radii espelham o servidor (já validados por A*); rally fora do círculo |
| Props longos aproximados por 1 círculo (colunas/destroços) | Raio por escala conservador; multi-círculo avaliado na 1.12.3 |
| Unidade "orbitando" obstáculo | Janela de desvio converge: a tangente só age enquanto `blocked`; linha direta recupera o controle |
| Determinismo do servidor | Zero RNG; iteração por id; projeção aritmética pura. Asserts novos + 8 existentes |
| Performance | ~240 círculos × ~11 unidades × 2 iterações ≈ 5 mil checagens/frame (com early-out por bounding box) |

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-10T20:35:00-03:00
