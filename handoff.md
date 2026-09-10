# handoff.md — Transição de Turno Operacional

> **Turno Corrente**: Sessão 12 — Auditoria Holística de Retomada (pré-Fase 2.6)
> **Última Modificação**: 2026-09-10T12:30:00-03:00
> **Leitura obrigatória antes de retomar**: `docs/journal/2026-09-10_12-30_sessao-12-auditoria-holistica.md`

---

## 1. O que foi realizado neste turno

### Sessão 12 (10/09, 12:30 BRT) — Claude Code CLI · Claude Opus 5 (1M)

Diretiva do usuário: *"exploração e auditoria holística do projeto antes de retomarmos o desenvolvimento"*.

1. **Exploração completa**: 421 arquivos fora de `node_modules` mapeados; topologia, LoC por módulo, workspaces, dependências e artefatos de build inventariados.
2. **Re-execução real de 11 gates** (não leitura de registro anterior): tsc nos 3 workspaces, 39 asserts do servidor, `test-buttons` 10/10, `gather-e2e`, `dist-proof`, varredura de vazamento de segredo, sincronia `public/`↔`dist/`, paridade de coordenadas cliente↔servidor, determinismo dos props. **Todos verdes.**
3. **Auditoria cruzada documento × disco × execução**, que produziu **14 achados** com evidência reproduzível: 2 críticos, 4 altos, 6 médios, 7 baixos (alguns agrupados).
4. **Governança documentada** conforme `AGENTS.md`: journal assinado, `estate.md` reindexado, `roadmap.md` com fase nova e status corrigidos, spec da 2.6 criada.

**Nenhum arquivo de código-fonte foi alterado.** A auditoria é read-only por desenho — diagnóstico e remediação separados, para que a remediação seja revisada como bloco coeso.

---

## 2. Estado de Compilação e Testes (verificado nesta sessão)

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| tsc client | `cd client && npx tsc --noEmit` | 🟢 0 erros |
| tsc server | `cd server && npx tsc --noEmit` | 🟢 0 erros |
| tsc studio | `cd tools/studio-gemini && npx tsc --noEmit` | 🟢 0 erros |
| Suíte do servidor | `cd server && npm test` | 🟢 39 asserts PASS |
| Botões funcionais | `node tools/visual-check/test-buttons.mjs` | 🟢 10/10 PASS · 0 pageerrors |
| Coleta e2e | (embutido no anterior) | 🟢 PASS · sucata → 560 |
| Prova de produção | `node tools/visual-check/dist-proof.mjs` | 🟢 11 entidades · 8 nós · 0 pageerrors |
| Segredo em artefato | `grep -rlF "$GEMINI_API_KEY"` | 🟢 zero fora de `.env` |

⚠️ **O carimbo de build exibido pelo `dist-proof` não é confiável** (CRIT-02): mostra a hora do teste, não a do build. Enquanto isso não for corrigido, a única prova de frescor do `dist/` é o `mtime` do arquivo.

⚠️ **"60 FPS estáveis" não foi verificado** e não é verificável pelo harness atual (swiftshader, ~3,4 FPS). Rebaixado a "não medido" no `estate.md` (decisão D-12.5).

---

## 3. Achados — resumo executivo

> Evidência completa, reprodução e remediação de cada um: `docs/journal/2026-09-10_12-30_sessao-12-auditoria-holistica.md` §3.

| ID | Sev. | Achado |
| :--- | :--- | :--- |
| **CRIT-01** | 🔴 | **Não existe repositório Git.** 421 arquivos, ~2 dias de trabalho, sem histórico, rollback ou diff. |
| **CRIT-02** | 🔴 | **Carimbo de build é placebo.** `document.lastModified` sem header `Last-Modified` → exibe sempre a hora atual. O mecanismo criado na 1.9.4 contra o bug de cache da S6 nunca foi capaz de detectá-lo. |
| **ALTO-03** | 🟠 | **Fase 2.6 é reconciliação, não integração.** 5 eixos de divergência cliente↔servidor acumulados nas 1.7A–1.7E. |
| **ALTO-04** | 🟠 | **MANIFEST/ATTRIBUTION contradizem o disco** quanto à música; contadores errados (75/18,02 MB × 78/22,21 MB). |
| **ALTO-04b** | 🟠 | **`estate.md` §4 estava duas fases atrasado** (nomes pré-rename S10, arquivados listados como ativos). ✅ **corrigido nesta sessão**. |
| **ALTO-05** | 🟠 | **4,19 MB de música em produção, nunca tocada**; "stinger de 10 s" tem 58,49 s; bitrate 3× o necessário. |
| MED-06…09 | 🟡 | `__rts` com métodos de cheat em produção · `tsconfig.base.json` morto e servidor menos rigoroso que o client · higiene de build (dist duplicado, tests fora do tsc, órfãos, masters, processos Vite órfãos) · **dívida de SDD** (3 specs / ~16 módulos). |
| BAIXO-10 | ⚪ | `Math.random` em estado de jogo · client sem teste unitário · harness fora do monorepo · duplicata de `setPendingOrder` · `playEffect('gather'/'deposit')` sempre no oscilador · script de vídeo não registrado. |

---

## 4. Pendências Críticas para o Próximo Turno

**Ordem obrigatória — não iniciar feature nova antes de 1 e 2:**

1. **`CRIT-01` — `git init`** (15 min). `git add -A` → commit baseline → tag `v0.1.0-fase-1.7`. Verificar `git status --porcelain | grep -c '\.env'` = 0. Decidir versionamento dos 31 MB de `masters/` (recomendação: versionar).
2. **`CRIT-02` — Carimbo de build honesto** (15 min). `define: { __BUILD_STAMP__ }` no `vite.config.ts`; `main.ts:566-572` consome a constante. **Gate negativo**: build → anotar → esperar 2 min → recarregar → carimbo não pode mudar.
3. **`ALTO-04` — Reconciliar MANIFEST + ATTRIBUTION** com o disco (30 min) e remover os 3 `.ogg` residuais.
4. **`ALTO-05` — Fechar o áudio da 1.7E** (2–3 h): cortar o stinger, re-encodar para 96 kbps mono, implementar `playMusic`/`crossfadeTo`/`stopMusic` sobre o bus `music` já existente, fiar menu/partida/combate. Manter lazy-load.
5. **`MED-09` / `ALTO-03` — Levar `docs/specs/02-integracao-cliente-servidor.md` de RASCUNHO a APROVADO.** Requer **5 decisões do usuário** (D-2.6-A a D-2.6-E). **Nenhuma linha de código da 2.6 antes disso** (`AGENTS.md` §2.B).

**Rodar os gates padrão após cada alteração**: `npx tsc --noEmit` nos 3 workspaces, `npm test` no server, `test-buttons`, `gather-e2e`, `dist-proof`.

---

## 5. Decisões Abertas Aguardando o Usuário

| ID | Pergunta | Onde |
| :--- | :--- | :--- |
| D-2.6-A | Qual tabela de tempos de treino vence — cliente (mais lento, playtestado) ou servidor? | spec 02 §4 |
| D-2.6-B | Qual modelo de coleta vence — incremental do servidor ou atômico do cliente? (muda a taxa em 1,67×) | spec 02 §4 |
| D-2.6-C | A física de inércia do blindado migra para o servidor ou vira cosmética? (afeta um gate da Fase 1.5) | spec 02 §4 |
| D-2.6-D | Fog of War vira autoritativo (anti-maphack) ou fica client-side? | spec 02 §4 |
| D-2.6-E | Predição local no cliente, ou aceitar 1 RTT de input lag? | spec 02 §4 |
| MED-09 | Retomar SDD de verdade **ou** emendar o `AGENTS.md` para refletir a prática real? | journal S12 §3 |
| MED-08.4 | Versionar os 31 MB de `masters/` no Git? | journal S12 §3 |
| MED-08.5 | Encerrar os 2 processos Vite órfãos (5173 há 1d10h, 4173 há 15h)? | journal S12 §3 |

---

## 6. Contexto de Provider

- **Harness desta sessão**: Claude Code CLI · **Claude Opus 5 (1M context)** — sem limite de quota atingido.
- **Ollama Cloud (`ollama-cloud/kimi-k3`)**: bloqueado por "session usage limit" desde 10/09 11:48 BRT (conta `firebird81`, plano Pro legado). Pendência da S11 **ainda não resolvida**.
- **`opencode-go/kimi-k2.7-code`**: alternativa usada nas Sessões 11 e anteriores.

---

## 7. Diretivas Permanentes

- Sempre validar `resolveClientAssets()` após mudar estrutura de diretórios.
- `npm run build` em todos os workspaces a cada turno de client/assets.
- MANIFEST/ATTRIBUTION atualizados **junto com** novos assets — e a partir da S12, verificados contra o disco, não de memória.
- Áudio e vídeo lazy-load; nunca no boot.
- Antes de retomar, ler `handoff.md`, `estate.md` e o journal mais recente.
- **Novo (S12)**: todo achado de auditoria recebe ID estável (`CRIT/ALTO/MED/BAIXO-NN`) e é rastreado no `estate.md` §5 até ser fechado por um gate.
- **Novo (S12)**: alegação de gate só entra em documento se tiver sido executada no turno. Alegação herdada de sessão anterior deve ser marcada como tal.

---
*Registro assinado por:*
- **Harness/Agente**: Claude Code CLI
- **Modelo LLM**: Claude Opus 5 (1M context)
- **Timestamp**: 2026-09-10T12:30:00-03:00
