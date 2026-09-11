# Sessão 17b — Correção: Crônicas da Landing com Imagens Repetidas

> **Ciclo**: correção editorial apontada pelo usuário ("vc colocou a mesma imagem nas 3 sessões
> da publicação?!?"). **Data/Hora**: 2026-09-11T02:05:00-03:00. **Método**: verificação visual
> real (leitura das 4 imagens publicadas + hashes) antes de qualquer correção.

---

## 1. O que aconteceu (fato, sem atenuante)

As 4 entradas da seção "Crônicas da Construção" usavam **arquivos diferentes (hashes distintos),
mas o MESMO plano largo**: mesma câmera, mesmo enquadramento, diferenças de poucos pixels.
`fechamento.webp` e `colisao-chegada.webp` eram quase indistinguíveis; `cena-inicial` e
`coleta-chegada` idem à distância de leitura. Visualmente: **a mesma imagem quatro vezes**.

**Causa-raiz**: as capturas da evidência da 2.6.3 foram todas tiradas do mesmo ponto de câmera
(o E2E não variou ângulo/zoom) e a seleção editorial escolheu "a evidência da fase" **sem
verificar distinção visual** — pior, a convenção que escrevi (`landing/README`) mandava converter
a captura da evidência, perpetuando a homogeneidade. Nenhuma intenção de repetir; foi falha de
curadoria e de processo.

## 2. Correção aplicada

Seleção por **distinção visual + pertinência semântica**, verificada uma a uma (imagens lidas antes
de publicar):

| Crônica | Imagem nova | O que mostra |
| :-- | :--- | :--- |
| S13 — O projeto ganha casa | `cronica-s13-menu.webp` | O menu "PROJECT EXODUS — Colapso da Singularidade" (a porta de entrada) |
| S14 — O fim dos hologramas | `cronica-s14-blindado.webp` | O blindado em manobra no pátio (close-up, ângulo baixo) |
| S15–16 — Uma única verdade | `cronica-s15-16-hud.webp` | CC selecionado com HUD de custos reais ([C]50R, [W]75R+25S, [E]150S+25C…) |
| S17 — Reconciliação | `cronica-s17-coleta.webp` | Close da coleta (catador no veio com FX) |

Legendas ajustadas para descrever o que cada imagem realmente mostra (PT/EN). As 4 imagens
repetidas foram removidas da landing (ficam no histórico do git e nos PNGs da evidência).
Evidência crua continua em `docs/evidence/fase-2.6.3/` — a landing é curadoria.

## 3. Regra nova (prevenção)

1. **Verificar visualmente** cada imagem antes de publicar (ler/abrir, não confiar no nome).
2. **Variar enquadramento entre crônicas** (menu / close-up / HUD / FX): duas crônicas seguidas
   não podem compartilhar o mesmo tipo de plano.
3. Evidência crua → `MANIFEST.md` da fase; **curadoria é decisão editorial explícita**.
Regra gravada em `landing/README.md` e nas diretrizes do `handoff.md`.

## 4. Gates

- 4 imagens novas conferidas por leitura direta (menu/close-up/HUD/FX — distintas entre si).
- Landing sem referências às imagens antigas (`grep`); deploy do Pages redesparado no push.
- Nenhum impacto em código/gates da 2.6.3 (correção exclusivamente de mídia/documentação).

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-11T02:05:00-03:00
