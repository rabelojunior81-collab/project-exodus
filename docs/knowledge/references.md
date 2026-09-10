# Knowledge Base — Referências Técnicas Catalogadas

> **Propósito**: Catálogo de referências técnicas e decisões de design embasadas em documentação oficial.  
> **Última Atualização**: 2026-09-09T16:00:00-03:00 (Sessão 8: retratação 3.1, facing por tipo 3.2)

---

## 1. Three.js / WebGL

| Referência | URL | Contexto de Uso |
| :--- | :--- | :--- |
| Three.js Docs — GLTFLoader | https://threejs.org/docs/#examples/en/loaders/GLTFLoader | Carregamento de modelos GLTF no ModelManager |
| Three.js Docs — SkeletonUtils | https://threejs.org/docs/#examples/en/utils/SkeletonUtils | Clonagem de modelos com esqueleto para múltiplas instâncias |
| Three.js Docs — AnimationMixer | https://threejs.org/docs/#api/en/animation/AnimationMixer | Controle de animações esqueléticas por entidade |
| Three.js Docs — OrthographicCamera | https://threejs.org/docs/#api/en/cameras/OrthographicCamera | Câmera isométrica para RTS |
| Three.js Docs — ShaderMaterial (onBeforeCompile) | https://threejs.org/docs/#api/en/materials/Material.onBeforeCompile | Injeção de splat blending no fragmentShader padrão |
| Three.js Docs — PCFSoftShadowMap | https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap | Sombras suaves dinâmicas |

## 2. Modelos 3D

| Referência | URL | Contexto de Uso |
| :--- | :--- | :--- |
| Quaternius — Free 3D Models | https://quaternius.com/ | Source dos modelos de edifícios, veículos e personagens |
| Mixamo — Character Animation | https://www.mixamo.com/ | Source das animações esqueléticas (Idle, Walk, Run, Shoot) |
| GLTF Specification 2.0 | https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html | Formato de intercâmbio de assets 3D |

## 3. Conhecimento Operacional

### 3.1 Root Motion em Modelos Mixamo — RETRATAÇÃO (Sessão 4, confirmada Sessão 8)
> ⚠️ A versão anterior desta seção (subtrair `track.values[2]` do track Z do Hips) estava **errada** e foi revertida: o valor Z do Hips em bone-local é a **altura do quadril** no rig Mixamo (~106cm), não um offset de exportação. Subtraí-lo enterrava o modelo ~1.5m no solo (prova: Box3 em cena + screenshots, journal 2026-09-09_12-55).
>
> **Doutrina correta**: nunca "corrigir" dado de asset sem medição em cena (harness `measure()` + screenshot). Se um modelo flutuar/enterrar, calibrar via grounding por bounding box no `ModelManager.createInstance` (padrão aplicado ao `'tank'`), nunca mutilando tracks de animação.

### 3.2 Forward Axis — POR TIPO DE MODELO (Sessão 4, medida via matrizes)
Não existe forward único: cada asset tem o seu (ferramenta `tools/visual-check/measure-facing.mjs` compara visor/cano/pés vs corpo no espaço do modelo). Medido: Soldier (Mixamo) −Z → `yawOffset PI`; Character (Quaternius) +Z → `0`; Combat_Tank (cano) −X → `+PI/2`. Configurado por tipo em `Unit` (`yawOffset`), nunca global.

### 3.3 Splat Blending Tri-Textura
Técnica para evitar repetição visual em terrenos grandes: 3 texturas PBR distintas são amostradas em escalas diferentes (0.05, 0.08, 0.12) e misturadas por pesos derivados de ruído espacial senoidal de grande comprimento de onda (35-70m), garantindo transições naturais sem fronteiras visíveis.

---
*Registro assinado por:*
- **Harness/Agente**: opencode
- **Modelo LLM**: Muse Spark (muse-spark)
- **Timestamp**: 2026-09-09T16:00:00-03:00
