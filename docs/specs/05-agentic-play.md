# Spec 05 — Agentic Play: CLI · MCP · WebMCP (Fase 6)

> **Status**: DESIGN COMPLETO — aguardando execução (depende da Fase 3 concluída; 6.1/6.2 podem
> iniciar após a 2.6.6). Base de conhecimento: `docs/knowledge/agentic-play-protocols.md`.
> **Origem**: diretiva do usuário (10/09/2026) — "o jogo poder ser jogado por agentes", com
> iteração/interação/visualização/ações constantes durante a partida.
> **Princípio**: o servidor autoritativo não muda de contrato de jogo — agentes são **clientes**
> como qualquer outro; toda a superfície agêntica é camada de acesso sobre o protocolo (`shared`).

---

## 1. Objetivo

Permitir que agentes de IA joguem o Project Exodus em três modos complementares:

1. **CLI** — controle por linha de comando/scripts (humano-observável, agente-amigável, `--json`).
2. **MCP** — ferramentas expostas a hosts LLM (Claude, GPT, Gemini, agentes locais) via stdio/HTTP.
3. **WebMCP** — ferramentas na própria página do jogo para agentes do navegador (W3C draft).

E habilitar, num segundo momento, **agente vs agente** (A2A) e ferramentas de desenvolvimento (ACP).

## 2. Arquitetura

```
┌────────────┐   stdio / Streamable HTTP   ┌──────────────────┐
│ Host LLM   │ ──────────────────────────► │ @project-exodus/ │
│ (Claude…)  │ ◄────────────────────────── │      mcp         │   tools: observe/order/
└────────────┘                             │  (MCP server)    │   train/cancel/chat/ping/
┌────────────┐   shell / pipes             └────────┬─────────┘   wait/screenshot
│ Humano /   │ ──────────────────────────► ┌───────▼─────────┐
│ script     │                             │  exodus (CLI)   │
└────────────┘                             └───────┬─────────┘
┌────────────┐  document.modelContext      ┌───────▼─────────┐        ┌──────────────┐
│ Browser    │ ──────────────────────────► │  client (página)│        │ Agent Card   │
│ agent      │   (WebMCP polyfill)         │  WebMCP runner  │        │ /.well-known │
└────────────┘                             └───────┬─────────┘        └──────┬───────┘
                                                   │                          │ A2A
                                    WS (protocolo @project-exodus/shared)     ▼
                                          ┌────────▼─────────┐        ┌──────────────┐
                                          │ Servidor autori- │◄───────│ Agentes      │
                                          │ tativo (20 Hz)   │  A2A   │ externos     │
                                          └──────────────────┘ bridge └──────────────┘
```

Tudo é cliente: **nenhuma ferramenta de agente burla validação, custo, pop ou determinismo**.
Agentes recebem `agentId` no handshake (usado no log/auditoria e nos rate limits).

## 3. Ferramentas canônicas (mesma semântica nos 3 modos)

| Tool | Params | Anotação | Descrição |
| :--- | :--- | :--- | :--- |
| `game_observe` | `playerId?`, `include?` | readOnly | Estado estruturado: recursos, entidades, nós, fog, fila, scores, tick |
| `game_order` | `kind: move/gather/patrol`, `entityIds`, `x?/z?/nodeId?` | consequential | Ordens de unidade (as mesmas do HUD) |
| `game_train` | `buildingId`, `unit` | consequential | Treina unidade (sujeita a custo/pop) |
| `game_cancel_train` | `buildingId`, `jobId` | consequential | Cancela com reembolso (protocolo v2) |
| `game_build` | `workerId`, `building`, `x`, `z` | consequential | Construção (Fase 4+) |
| `game_chat` | `channel: all/team`, `text ≤ 200` | consequential | Chat (spec 04) |
| `game_ping` | `x`, `z`, `kind: attention` | consequential | Ping no mapa/minimapa (spec 04) |
| `game_wait` | `ticks?`, `untilEvent?`, `timeoutMs` | readOnly | **Tasks/MCP**: espera assíncrona por tick/evento sem bloquear o host |
| `game_screenshot` | `view?` | readOnly | Frame do jogo (ver §6) |
| `game_ready` | — | readOnly | Estado da partida/sessão (lobby, running, ended) |

**Resources**: `game://state` (JSON), `game://events` (stream), `game://map` (estático).
**Prompts** (MCP): `doutrina-abertura`, `defesa-basica` — via *Skills over MCP*.

## 4. Sub-fases

| Sub-fase | Entrega | Gate |
| :--- | :--- | :--- |
| 6.1 CLI | `tools/exodus-cli` (`exodus connect·state·observe·order·train·cancel·chat·ping·wait·watch·replay`; `--json`; REPL) | CLI completa um ciclo coletar→entregar contra servidor local, 3× seguidas, em < 5 min |
| 6.2 MCP server | `tools/exodus-mcp` (stdio + Streamable HTTP; tools da §3; Tasks para `game_wait`; resources) | Claude/agente conclui "colete 10 de sucata" usando só as tools; conformance MCP; rate/budget respeitados |
| 6.3 WebMCP | Runner no cliente com `document.modelContext` (polyfill `@mcp-b/global` até nativo); tools da §3 em-page; opt-in explícito | Harness executa gather via WebMCP polyfill; tools ausentes sem opt-in |
| 6.4 A2A (agente vs agente) | Bridge A2A: Agent Card do nó do jogo; task `play_match`; streaming de turnos | Dois agentes (processos distintos) jogam até a primeira entrega, com placar auditável |
| 6.5 Observabilidade & eval | Replay com `agentId`, timeline de eventos, suíte de avaliação (eco/APM/erros), adversarial suite (chat malicioso) | Relatório de partida de agente gerado; injeção via chat não altera ações fora do esperado |

## 5. Loop constante de jogo (a exigência central da diretiva)

O agente precisa de **iteração rápida, observação, ação e visualização**. O desenho:

1. `game_observe` é barato e completo (estado estruturado — não depende de imagem).
2. `game_wait` usa a extensão **Tasks** do MCP: o agente espera "próximo evento relevante"
   (ataque, treino pronto, entrega) com handle durável — sem polling agressivo.
3. Ações retornam **recibo determinístico** (tick de aplicação, custo, resultado) e eventos
   (2.6.4) chegam por stream estruturado.
4. `game_screenshot` é o canal **visual** (opcional por custo): espectador headless (§6) ou
   canvas via WebMCP — para agentes multimodais e para o humano supervisionar.
5. Cadência alvo: ciclo observar→decidir→agir < 2 s em LAN; `game_wait` evita busy-loop.

## 6. Screenshot (visualização)

- **Via WebMCP (preferida em browser)**: `canvas.toDataURL()` do próprio jogo — sem infra extra,
  respeita a câmera do jogador-agente.
- **Via MCP/CLI (espectador headless)**: processo Playwright em modo espectador conectado ao
  servidor; renderiza com a mesma cena Three.js; recorte opcional (minimapa/região).
- **MCP Apps**: painel inline com mapa + timeline para sessões dentro de hosts compatíveis.

## 7. Segurança

- `agentId` + token por sessão; Tailscale como fronteira (local-first).
- Rate limit e budget de ações por agente (o servidor é a autoridade — inclui custo/pop).
- **Chat = conteúdo não-confiável**: nunca entra em prompt de sistema; anotações
  `untrustedContentHint` (WebMCP) e resultados MCP marcados como não-confiáveis.
- Log de auditoria por `agentId` em todo comando (replay/revisão).

## 8. Dependências e riscos

| Item | Detalhe |
| :--- | :--- |
| Depende de | 2.6 completa (protocolo estável) e Fase 3 (multiplayer p/ 6.4); 6.1/6.2 podem começar na 2.6.6 |
| Libs base | `@modelcontextprotocol/sdk@1.30.0` **ou** `@modelcontextprotocol/server|client@2.0.0` (decisão D-6.x); `@a2a-js/sdk@1.1.0`; `@mcp-b/global@5.1.0` (WebMCP polyfill) |
| Riscos | Custo de tokens em loops longos; agentes alucinando ordens inválidas (mitigação: validação + erros estruturados); screenshot headless pesado (mitigação: espectador sob demanda) |
| Não-objetivo | Substituir jogadores humanos ou automatizar balanceamento — a Fase 6 entrega **acesso**; IA de jogo (bots) é outra trilha |

## 9. Decisões para o grill-me da Fase 6 (quando chegar)

- D-6.1: linha do SDK MCP (1.30 monolítico × 2.0 dividido).
- D-6.2: transporte padrão do MCP server (stdio × HTTP × ambos).
- D-6.3: screenshot — WebMCP-only × espectador headless × ambos.
- D-6.4: 6.4 (A2A) entra na Fase 6 ou vira fase própria após o primeiro multiplayer estável?

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-11T00:40:00-03:00
