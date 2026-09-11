# Protocolos para Jogabilidade por Agentes — Base de Conhecimento

> **Contexto**: diretiva do usuário (10/09/2026) — o jogo deve poder ser jogado por agentes
> (CLI, MCP, WebMCP), com "iteração/interação/visualização/ações" constantes durante a partida.
> Pesquisa realizada em 10–11/09/2026 com verificação direta das especificações e do registro npm.
> **Uso**: fundamenta a Fase 6 (`docs/specs/05-agentic-play.md`).

---

## 1. MCP — Model Context Protocol

**O que é**: protocolo aberto (Anthropic, nov/2024) para integrar aplicações LLM a dados e
ferramentas externas. JSON-RPC 2.0; **revisão vigente: 2026-07-28**.

**Arquitetura**: Hosts (app LLM) → Clients (conectores) → Servers (ferramentas/contexto).
Requisições *stateless e autocontidas*; negociação de capacidades por requisição.

**Primitivas de servidor**: Tools (funções executáveis), Resources (contexto/dados),
Prompts (templates de workflow). **Primitiva de cliente**: Elicitation (pedido de informação
ao usuário iniciado pelo servidor).

**Extensões (opt-in, negociadas no init)** — as três importam para um jogo:

| Extensão | O que entrega | Uso no Project Exodus |
| :--- | :--- | :--- |
| **Tasks** | Execução assíncrona de operações longas: polling, input em voo, handles duráveis | `wait.for_event` / `wait.until_tick` — o loop constante do jogo sem travar o agente |
| **Skills over MCP** | Instruções estruturadas de workflow descobertas via MCP | "Manual do comandante": doutrina de abertura, build orders |
| **MCP Apps** | UI interativa inline na conversa (charts, forms, video) | Espectador embutido: mapa, timeline de eventos, replay |

**Transports**: stdio (local) e Streamable HTTP (remoto).

**Utilities**: configuração, progresso, cancelamento, erros.

**Segurança (princípios do spec)**: consentimento explícito do usuário; dados privados só com
consentimento; **descrições de tools são não-confiáveis** (tool poisoning).

**SDKs TypeScript (verificados no npm em 10/09/2026)**:

| Pacote | Versão | Licença | Notas |
| :--- | :--- | :--- | :--- |
| `@modelcontextprotocol/sdk` | **1.30.0** | MIT | Monolítico; Node ≥18; zod ^3.25 \|\| ^4; exports `./server`, `./client`, `./experimental/tasks`; ferramentas de conformidade |
| `@modelcontextprotocol/server` | **2.0.0** | MIT | Nova linha dividida (com `@modelcontextprotocol/core`); Node ≥20; zod ^4; shims browser/workerd |
| `@modelcontextprotocol/client` | 2.0.0 | MIT | Par do server (linha 2.0) |

> **Decisão pendente para a Fase 6**: adotar a linha 1.30 (monolítica, com Tasks exposto) ou a
> 2.0 (dividida, mais nova). Critério: suporte a Tasks e estabilidade.

## 2. ACP — Agent Client Protocol

**O que é**: protocolo (Zed Industries) que padroniza a comunicação **editor/IDE ↔ agente de
codificação** — o "LSP dos agentes". JSON-RPC.

**Topologia**: agentes locais rodam como subprocesso do editor (stdio); remotos via HTTP/WS
(suporte remoto ainda em desenvolvimento). Reutiliza as representações JSON do MCP onde possível;
texto em Markdown.

**Uso no Project Exodus (não é o core)**: o desenvolvedor, dentro do seu editor, usa o próprio
agente para inspecionar/operar uma partida em execução (depuração viva, tuning de economia,
testes manuais). Avaliar SDK TS `@zed-industries/agent-client-protocol` na Fase 6.4.

## 3. A2A — Agent2Agent Protocol

**O que é**: padrão aberto para **comunicação entre agentes** (origem Google; doado à Linux
Foundation; mantido por TSC com AWS, Cisco, Google, IBM, Microsoft, Salesforce, SAP, ServiceNow).
**Versão atual: 1.0**.

**Conceitos**: Agent Cards (descoberta), tarefas delegáveis, streaming e operações assíncronas,
multi-tenancy; agentes interagem sem expor memória/ferramentas internas.

**Relação com MCP**: complementares — *MCP é agente↔ferramenta; A2A é agente↔agente*. Um agente
equipado com MCP (ferramentas do jogo) pode se conectar via A2A a outros agentes.

**SDK JS verificado**: `@a2a-js/sdk` **1.1.0** (Apache-2.0; Node ≥20; exports client/server/express/grpc).

**Uso no Project Exodus**: **agente vs agente** — o nó do jogo publica um Agent Card
(`/.well-known/agent-card.json`) e aceita tarefas de partida; agentes externos entram como
jogadores; também habilita comentarista/espectador agêntico.

## 4. WebMCP — Web Model Context Protocol

**O que é**: especificação do **W3C Web Machine Learning Community Group** (rascunho; edição
consultada: 10/09/2026; editores Microsoft/Google). Permite que **web apps exponham ferramentas
JavaScript a agentes** — a página age como um MCP server com tools em client-side script.

**API principal** (`document.modelContext`, seguro por contexto):
- `registerTool({ name, description, inputSchema, execute, annotations }, { signal, exposedTo })`
  — retorna Promise; nome 1–128 chars [A-Za-z0-9_.-].
- `getTools()`, `executeTool(tool, inputObject)` — para agentes "in-page".
- Eventos: `toolchange`, `toolactivated`, `toolcanceled`; abort via `AbortController`.
- Forma **declarativa** (preenchimento de forms) além da imperativa.
- Integração com Permissions Policy (`tools`); same-origin por padrão, exposição cross-origin
  explícita e apenas para origens confiáveis.

**Annotations relevantes para jogos**:
`readOnlyHint` (observar não muda nada), `untrustedContentHint` (resultado pode conter injeção —
ex.: **chat de outro jogador**), `consequentialHint` (ação com consequência — treinar, cancelar).

**Segurança (do próprio spec)**: ataques de prompt injection via metadata/descrição de tool
(tool poisoning), injeção via output, misrepresentation de intenção, over-parameterization
(vazamento de privacidade), fronteiras de same-origin. Mitigações citadas: limitar tamanho de
entrada, anotar respostas não-confiáveis, anotar execuções consequenciais.

**Polyfill verificado**: `@mcp-b/global` **5.1.0** (MIT; browser/ESM/IIFE; Node ≥20 para dev)
+ companheiros `@mcp-b/webmcp-types`, `@mcp-b/webmcp-polyfill`, `@mcp-b/transports`; depende de
`@modelcontextprotocol/server@2.0.0` e é testado contra o MCP client.

**Uso no Project Exodus**: a aba do jogo expõe tools (`game_observe`, `game_order`, `game_chat`,
`game_ping`, `game_screenshot`, `game_wait`) para agentes do navegador — incluindo captura do
canvas para "visualização" sem servidor extra.

## 5. AG-UI — Agent-User Interaction Protocol

**O que é**: protocolo (CopilotKit) para streaming estruturado entre agentes e interfaces de
usuário (eventos de run, tool calls, estado compartilhado). SDK core verificado:
`@ag-ui/core` **0.0.59** (MIT).

**Uso no Project Exodus (opcional, Fase 6+)**: painel/espectador ao vivo em dashboards web que
renderizam o raciocínio e as ações de um agente jogando. Não é caminho crítico.

## 6. Mapa: necessidade do jogo → protocolo

| Necessidade (diretiva do usuário) | Mecanismo | Protocolo |
| :--- | :--- | :--- |
| Observar o estado (iteração constante) | Resource `game://state` + tool `game_observe` | MCP / WebMCP |
| Agir (mover, coletar, treinar) | Tools com `consequentialHint`-equivalente | MCP / WebMCP |
| Esperar ticks/eventos sem bloquear | **Tasks** (durable handles, polling) | MCP |
| Visualizar (ver o jogo) | Screenshot via espectador headless **ou** canvas via WebMCP; UI inline via **MCP Apps** | MCP Apps + WebMCP |
| Jogar por CLI/scripts | Cliente fino sobre o protocolo WS (`@project-exodus/shared`) | próprio |
| Agente vs agente | Agent Card + tarefas | A2A |
| Agente no editor do dev | Integração de sessão de desenvolvimento | ACP (avaliar) |
| Chat/pings entre jogadores | Protocolo de jogo (spec 04) — **conteúdo não-confiável** para agentes | próprio + anotações |

## 7. Segurança e integridade (transversal às fases 3/6)

1. **Chat é entrada hostil**: mensagens de jogadores vão para dentro de agentes LLM — tratar como
   `untrustedContentHint`; nunca interpolar chat em prompt de sistema; opção de silenciar por tool.
2. **Budget de ações**: limite por turno/tick (rate limit no servidor; o servidor já valida dono e
   custo — a Fase 6 adiciona limites por agente).
3. **Auth de agente**: token por sessão (local-first; Tailscale como fronteira de rede).
4. **Auditoria**: todo comando vindo de agente entra no log de replay com `agentId` — auditável.
5. **Consentimento**: tools WebMCP só com flag/consentimento explícito na página.

## 8. Referências verificadas (10–11/09/2026)

- MCP: `modelcontextprotocol.io/specification/latest` (revisão 2026-07-28); npm `@modelcontextprotocol/sdk@1.30.0`, `@modelcontextprotocol/server@2.0.0`.
- ACP: `agentclientprotocol.com` (Zed Industries).
- A2A: `a2a-protocol.org` (Linux Foundation; v1.0); npm `@a2a-js/sdk@1.1.0`.
- WebMCP: `webmachinelearning.github.io/webmcp` (W3C CG draft, 10/09/2026); npm `@mcp-b/global@5.1.0`.
- AG-UI: `github.com/ag-ui-protocol/ag-ui`; npm `@ag-ui/core@0.0.59`.

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-11T00:40:00-03:00
