# Sessão 15 (continuação) — Grill-Me 2.6.x fechado + Specs 04/05 (Agentes e Comunicação)

> **Ciclo**: (a) fechamento das 7 decisões da 2.6.x; (b) diretiva do usuário — jogabilidade por
> agentes em fase própria (CLI/MCP/WebMCP) com pesquisa profunda; (c) sistema de comunicação
> entre jogadores (gênero RTS).
> **Data/Hora**: 2026-09-11T00:40:00-03:00
> **Método**: grill-me (uma pergunta por vez, registro imediato) + pesquisa com verificação de
> specs e registro npm + SDD (specs antes de código).

---

## 1. Grill-Me 2.6.x — ENCERRADO (7/7)

Escolhas **A/A/A/A/A/A/A**, registradas em `docs/decisions/2026-09-10_fase-2.6.x-abertas.md`:

| ID | Tema | Escolha |
| :-- | :--- | :--- |
| D-2.6.2-A | Cancel train | incluir `CancelTrainCommand` (protocolo v2) na 2.6.2 |
| D-2.6.2-B | POP_MAX | teto global 20 no servidor |
| D-2.6.3-A | `DROPOFF_RANGE` | 10 m nos dois |
| D-2.6.3-B | Clamp do mundo | ±88 nos dois |
| D-2.6.4-A | Broadcast | snapshot full JSON 20 Hz, com medição |
| D-2.6.5-A | Interpolação | buffer fixo ~100 ms |
| D-2.6.5-B | Debug hooks | dev-only; removidos do bundle de produção |

**Próximo passo destravado**: sub-fase 2.6.2 (custos/pop/cancel/tempos no servidor; remover
marcadores `LEGACY`).

## 2. Diretiva do usuário — jogabilidade por agentes (Fase 6)

Pesquisa realizada com **verificação direta** (specs + registro npm em 10–11/09/2026):

- **MCP** — spec vigente **2026-07-28**; JSON-RPC 2.0 stateless; tools/resources/prompts +
  elicitation; extensões **Tasks** (espera assíncrona durável — ideal para o loop de jogo),
  **Skills over MCP** e **MCP Apps** (UI inline). SDKs: `@modelcontextprotocol/sdk@1.30.0`
  (MIT) e a linha nova `@modelcontextprotocol/server|client@2.0.0` (Node ≥20, zod 4).
- **ACP** (Zed) — editor↔agente; uso como ferramenta de desenvolvimento vivo (não é o core).
- **A2A** (Linux Foundation, v1.0) — agente↔agente; SDK JS `@a2a-js/sdk@1.1.0` (Apache-2.0);
  habilita **agente vs agente** com Agent Card do nó do jogo.
- **WebMCP** (W3C Web ML CG, draft) — `document.modelContext` com `registerTool/getTools/
  executeTool`, anotações (readOnly/untrustedContent/consequential), permissions policy;
  polyfill `@mcp-b/global@5.1.0` (MIT). Habilita agente do navegador na própria página.
- **AG-UI** (`@ag-ui/core@0.0.59`) — opcional para dashboards/espectador agêntico.

Entregues: `docs/knowledge/agentic-play-protocols.md` (base completa com mapa necessidade→protocolo
e seção de segurança/injeção) e `docs/specs/05-agentic-play.md` (5 sub-fases com gates; CLI → MCP →
WebMCP → A2A → eval). Roadmap ganhou a **Fase 6**.

**Ponto crítico de segurança registrado**: chat de jogadores é **entrada hostil** para agentes LLM
(prompt injection) — anotado no spec 05 §7 e na spec 04 §5.

## 3. Diretiva do usuário — comunicação entre jogadores (sub-fase 3.4)

Entregue `docs/specs/04-comunicacao-entre-jogadores.md`: chat ALL/TEAM, 12 taunts com voz PT-BR
(reuso da pipeline TTS), pings/flares com render 3D+minimapa+áudio, rate limits no servidor
(1/2 s chat etc.), mute local, acessibilidade e integração com replay. Roadmap Fase 3 ganhou a
**sub-fase 3.4** e um gate de comunicação (idêntica nos dois clientes, flood rejeitado).

## 4. Estado e pendências

- Nada de código executado nesta continuação (specs/pesquisa/registro); suíte e gates da S15
  principal permanecem verdes.
- Próximo passo: **2.6.2**; depois 2.6.3–2.6.6 → Fase 3 (com 3.4) → Fases 4–5 → **Fase 6**.

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-11T00:40:00-03:00
