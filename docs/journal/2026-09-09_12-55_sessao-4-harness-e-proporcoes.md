# Diário de Bordo — 2026-09-09 12:55 — Sessão 4 (Harness Visual + Causa Raiz do Enterro + Proporções Finais)

> **Ciclo**: Sessão 4 — feedback bravo do usuário (tank gigante, buildings, Gama de costas, física do tank) → medição rigorosa + fixes + validação visual própria
> **Status**: Gate da Fase 1.5 fechado (código + screenshots) 🟢
> **Duração Aproximada**: ~12:25 → 12:55 BRT

---

## 1. A Descoberta Central (post-mortem do "Hips fix")

O "Hips fix" da Sessão 2 (subtrair `baseZ` do track de posição do Hips) **era o bug que enterrava o Soldier 1.47m**. Prova por composição de matrizes + medição em cena:
- O valor Z do Hips em bone-local (~106) é a **altura do quadril** no rig Mixamo (~106cm), não offset de exportação.
- Subtraí-lo deslocou o esqueleto ~1.59m para baixo (≈ 106 × 0.01 × 1.5).
- Após revert: `minY == pos.y` exato no platô e na colina (55,55), screenshots confirmam soldados em pé.
- Lição: nunca "corrigir" dado de asset sem medir o efeito em cena. O harness agora existe para isso.

## 2. Facing por Tipo (fim do `+PI` global)

`tools/visual-check/measure-facing.mjs` compõe matrizes dos nós e compara partes dianteiras:
- **Soldier** (Mixamo): visor e dedos apontam **−Z** → `yawOffset = PI` (estava certo).
- **Character** (Quaternius): dedos apontam **+Z** (pé esquerdo em +X = stance normal de frente p/ +Z) → `yawOffset = 0`. O `+PI` global fazia o Gama andar **de costas** — exatamente o report.
- **Combat_Tank**: cano (centroide Tank_Gun) aponta **−X** → `yawOffset = +PI/2` (assunção: cano = frente; one-constant fix se o usuário discordar).

## 3. Tank: escala final + física de blindado

- Sweep em cena: `altura = 7.5 × escala`, grounding linear (minY=0 em todas). Fixado **0.38** → ~8.4m × 2.85m. `selectionRadius` 2.4 → 3.2.
- **Combat_Rover descartado**: usa compressão Draco, sem DRACOLoader configurado → falha silenciosa → unidade invisível. Documentado no estate (exige decoder wasm se um dia quiserem).
- Física (`unit.ts`): `currentSpeed` com aceleração (tank 5/s², infantaria 20), giro do tank 2.2 rad/s, tração proporcional ao alinhamento `clamp((cos(diff)−0.2)/0.8)` — tank gira parado e arranca com inércia; esteiras só animam com tração > 0.6.

## 4. Buildings imponentes (direção explícita do usuário)

- CC 1.5 → **2.2** (~25m), refinaria 1.35 → **1.7**, bunker 1.0 → **1.3**, torreta 2.0 → 2.6 (mount 6.9m), radii e fumaças re-escalados. Screenshot 01 confirma presença sem engolir o mapa.

## 5. Character: Sword degenerada

Malha 'Sword' com bbox de tamanho ZERO (192 vértices coincidentes) em (−0.71, 0.98) — glitch flutuante. Oculta no `createInstance`. Corpo real = Cube.000/007/009.

## 6. Terreno

`terrainHeight.ts` como fonte única; assentamento em Unit/Building/rubble/waypoints. Hill-climb validado quantitativa e visualmente (shot 03).

## 7. Harness visual (resposta permanente)

`tools/visual-check/`: `check.mjs` (Chromium headless do cache Playwright + Vite + handle `window.__rts` com `measure()`), `measure-facing.mjs`, `shots/`. Run ≈ 3min (loading headless lento). Deps: `playwright-core`, `three` (math).

## 8. Follow-ups

1. Playtest do usuário (facing do Gama em jogo real, física do tank, tamanhos finais).
2. DRACOLoader + decoder wasm se quiserem o Rover (opcional).
3. Rubble pode sobrepor spawn (cosmético, raro).
4. Fase 2.1 (loop autoritativo 20Hz) é o próximo passo quando o usuário aprovar o visual.

---
*Registro assinado por:*
- **Harness/Agente**: opencode
- **Modelo LLM**: Muse Spark (muse-spark)
- **Timestamp**: 2026-09-09T12:55:00-03:00
