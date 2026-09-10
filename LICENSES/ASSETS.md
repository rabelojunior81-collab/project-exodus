# LICENSES/ASSETS.md — Licenças e Proveniência dos Assets

> **Regra**: o código deste repositório é [MIT](../LICENSE). Os **assets** (modelos 3D, texturas,
> retratos, áudio, música, ícones, lore) têm termos próprios, listados abaixo.
> Este arquivo é a fonte de verdade para reuso — o [`MANIFEST.md`](../client/public/assets/MANIFEST.md)
> descreve o inventário físico; aqui descrevemos o direito de uso.

Última atualização: 2026-09-10 (baseline Fase 1.7).

## 1. Modelos 3D — `client/public/assets/models/`

| Arquivo | Origem documentada | Licença | Status |
| :--- | :--- | :--- | :--- |
| `soldier.glb` | Mixamo (personagem + animações Idle/Walk/Run) | Termos Adobe (uso livre em projetos; animações não podem ser redistribuídas isoladamente) | A confirmar caso a caso |
| `character.glb` | Quaternius | CC0 (packs Quaternius são domínio público) | Verificar pack exato |
| `robot-expressive.glb` | "RobotExpressive" (Tomás Laulhé, distribuído via three.js examples) | CC0 | OK |
| `enemy-2-legs.glb` | Quaternius | CC0 | Verificar pack exato |
| `combat-tank.glb` | Quaternius | CC0 | Verificar pack exato |
| `building-1-large.glb` | Quaternius | CC0 | Verificar pack exato |
| `building-2-large.glb` | Quaternius | CC0 | Verificar pack exato |
| `building-4.glb` | Quaternius | CC0 | Verificar pack exato |
| `turret-gun-double.glb` | Quaternius | CC0 | Verificar pack exato |

> **Pendência registrada (ALTO-04b)**: confirmar os packs Quaternius de origem e arquivar o link
> exato de cada um. Até a confirmação, trate os GLB sem link como "crédito requerido".

## 2. Texturas PBR — `client/public/assets/textures/`

| Arquivo | Origem documentada | Licença |
| :--- | :--- | :--- |
| `terrain-diffuse.jpg`, `rocky-gravel.jpg`, `rust-sand.jpg` | Origem não documentada no repositório | **A confirmar** |
| `bunker-concrete.jpg`, `rusted-metal.jpg` | Origem não documentada no repositório | **A confirmar** |

> **Pendência**: identificar a fonte (provável biblioteca de texturas CC0) e registrar. Até lá,
> não redistribuir as texturas fora deste projeto.

## 3. Arte gerada por IA (Rabelus Lab) — uso interno, redistribuição reservada

| Grupo | Arquivos | Modelo | Termos |
| :--- | :--- | :--- | :--- |
| Retratos | `portraits/*.webp` (17 + 12 thumbs) | `gemini-2.5-flash-image` | Gerado por Rabelus Lab. Redistribuição fora do projeto requer autorização. |
| Ícones | `icons/*.svg` (4) | pipeline de texto + curadoria | Idem. |
| Lore | `lore/era-{1..4}-lore.json` | `gemini-2.5-flash` | Idem. |
| Voz (TTS) | `audio/*.mp3` (16) | `gemini-2.5-flash-preview-tts` (vozes Charon/Kore/Puck) | Idem. |
| Música | `music/*.mp3` (3) | `lyria-3.5` | Idem. |

Todo asset gerado tem sidecar `.meta.json` com prompt, modelo e data — a proveniência é auditável arquivo a arquivo.

## 4. Masters

`tools/studio-gemini/masters/` guarda os originais (PCM do TTS, JPG dos retratos, MP3 da música).
Mesmos termos da seção 3. **Não são publicados** no site — existem para re-encode sem novo custo de API.

## 5. Fontes tipográficas

O cliente usa fontes do Google Fonts: **Orbitron**, **Rajdhani**, **Share Tech Mono** — todas sob
[SIL Open Font License 1.1](https://openfontlicense.org/). A landing usa as mesmas fontes.

## 6. Como creditar

Ao reutilizar qualquer asset autorizado, credite:

```
Project Exodus — Rabelus Lab (https://github.com/rabelojunior81-collab/project-exodus)
```

e preserve a licença original de terceiros quando aplicável.

---

*Rabelus Lab · 2026*
