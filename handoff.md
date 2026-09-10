# handoff.md — Transição de Turno Operacional

> **Turno Corrente**: Sessão 13 — Repositório Público, README e Landing (concluída)
> **Última Modificação**: 2026-09-10T23:10:00-03:00
> **Leitura obrigatória antes de retomar**: `docs/journal/2026-09-10_23-10_sessao-13-repositorio-publico-landing.md`

---

## 1. O que foi realizado neste turno (Sessão 13, 10/09 23:10 BRT)

Diretiva do usuário: preparar o repositório público `project-exodus` com README/landing,
criar a landing HTML no estilo `modernity-sandbox`, ativos novos (marca), fechar os itens
2 (CRIT-02) e 3 (ALTO-04) e preparar as decisões do spec 02 via `grill-me`.

1. **Repositório público criado e publicado**: `github.com/rabelojunior81-collab/project-exodus`.
   Baseline `924c111` (321 arquivos), tag `v0.1.0-fase-1.7`. `.env` e `node_modules` fora do
   rastreamento (verificado). `masters/` (31 MB) versionado (D-13.2).
2. **Open Source completo**: `LICENSE` (MIT no código), `LICENSES/ASSETS.md` (assets separados),
   `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`, `CHANGELOG`, templates de issue/PR.
3. **README bilingue** (`README.md` PT-BR + `README.en.md`) com badges, screenshots, áudio,
   roadmap e contatos (rabelo.work@gmail.com · rabelus.com).
4. **Landing page** em `landing/` (arquivo único, estilo modernity-sandbox, i18n PT/EN,
   players de áudio, eras/facções/roadmap) + marca e banner SVG próprios
   (`docs/media/mark-exodus.svg`, `banner-exodus.svg`). Deploy por GitHub Actions;
   **Pages estava em modo legacy e foi migrado para Actions**.
5. **Vídeo do Lote 3 recuperado**: o piloto omni salvara o **metadata JSON** no lugar do MP4;
   os bytes (2.070.687 B, 1280×720, 8 s) foram baixados da Files API antes do expiry
   (12/09 06:33 UTC) com o novo script `tools/studio-gemini/scripts/download-pending-video.mjs`.
   Integrado mudo à landing (`hero.mp4` + pôster) e ao jogo (`client/public/assets/video/`).
6. **ALTO-04 fechado**: `MANIFEST.md` reconciliado (76 publicados / ≈ 25.067 KB), `ATTRIBUTION.md`
   corrigido, 3 `.ogg` órfãos arquivados, gate `tools/verify-manifest.mjs` criado.
7. **CRIT-02 corrigido no código**: `__BUILD_STAMP__` via `define` do Vite; `main.ts` consome a
   constante. Typecheck do client = 0 erros. **Gate negativo pendente.**
8. **Skill `grill-me` instalada** em `.kilo/skill/grill-me/SKILL.md` para conduzir as decisões.

---

## 2. Estado de Compilação e Testes (verificado nesta sessão)

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| tsc client (pós-CRIT-02) | `node_modules/.bin/tsc --noEmit -p client/tsconfig.json` | 🟢 0 erros |
| .env fora do repo | `git ls-files .env` | 🟢 vazio |
| node_modules fora do repo | `git ls-files node_modules \| wc -l` | 🟢 0 |
| Baseline | `git ls-files \| wc -l` | 🟢 321 arquivos |
| Push + tag | `git push` + `git push origin v0.1.0-fase-1.7` | 🟢 publicados |
| Vídeo recuperado | `npm run video:download` (studio) | 🟢 2.070.687 bytes |
| WebP da landing | ffmpeg `libwebp -quality 80` | 🟢 ~10 MB → ~750 KB |
| Suíte do servidor | `cd server && npm test` | 🟢 smoke + 39 asserts (S13) |
| Manifesto × disco | `node tools/verify-manifest.mjs` | 🟢 100% em sincronia (S13) |
| Pages | `gh api -X PUT … build_type=workflow` + dispatch | 🟡 deploy em execução (run 34538283849) |

⚠️ **NÃO executados nesta sessão**: harness visual (`test-buttons`, `gather-e2e`, `dist-proof`) e
build de produção do client. Nenhum arquivo de `server/` foi tocado. Rodar antes de retomar
qualquer feature (ou criar CI — pendência nº 5).

---

## 3. Decisões Tomadas (S13)

| # | Decisão |
| :-- | :--- |
| D-13.1 | Código **MIT** + assets com licenças próprias (`LICENSES/ASSETS.md`) |
| D-13.2 | `masters/` (31 MB) **versionado** |
| D-13.3 | Landing publicada por **Actions** a partir de `landing/` |
| D-13.4 | Vídeo do Lote 3 usado **mudo** na landing |
| D-13.5 | `.ogg` órfãos **arquivados** (não deletados) |
| D-13.6 | Commits com identidade `Rabelus Lab <rabelo.work@gmail.com>` via `-c` pontual (config global intacta) |

---

## 4. Pendências Críticas para o Próximo Turno

**Ordem sugerida:**

1. **`D-2.6-A..E` — decisões da Fase 2.6** (bloqueiam a fase inteira; spec 02 em RASCUNHO).
   Conduzir a sessão `grill-me` (`.kilo/skill/grill-me/SKILL.md`); registrar em
   `docs/decisions/` e promover o spec a APROVADO. **Nenhuma linha de código da 2.6 antes disso.**
2. **Gate negativo do CRIT-02**: build → anotar carimbo → esperar 2 min → recarregar →
   o carimbo não pode mudar.
3. **Gates de runtime**: `npm test` (server), `test-buttons`, `gather-e2e`, `dist-proof`.
4. **ALTO-05 / 1.11.4**: cortar o stinger (58 s → 8–10 s), re-encodar música para 96 kbps,
   implementar `playMusic`/`crossfadeTo`/`stopMusic` e fiar menu/partida/combate.
   ffmpeg confirmado disponível (`ffmpeg-static`).
5. **CI**: workflow com tsc ×3 + testes do servidor + `verify-manifest` (hoje só a Pages roda).
6. **GitHub (config web)**: topics do repositório + social preview (não versionáveis).
7. **Lote 3 restante (1.11.6)**: eras 2–4 + remover o `as any` do `video-omni-pilot.ts`.

---

## 5. Decisões Abertas Aguardando o Usuário

| ID | Pergunta | Onde |
| :--- | :--- | :--- |
| D-2.6-A | Qual tabela de tempos de treino vence — cliente (mais lento, playtestado) ou servidor? | spec 02 §4 |
| D-2.6-B | Qual modelo de coleta vence — incremental do servidor ou atômico do cliente? (muda a taxa em 1,67×) | spec 02 §4 |
| D-2.6-C | A física de inércia do blindado migra para o servidor ou vira cosmética? | spec 02 §4 |
| D-2.6-D | Fog of War vira autoritativo (anti-maphack) ou fica client-side? | spec 02 §4 |
| D-2.6-E | Predição local no cliente, ou aceitar 1 RTT de input lag? | spec 02 §4 |

Recomendações do agente (com justificativa) na sessão `grill-me` — ver journal da S12 §4 e
a apresentação feita no fechamento da S13.

---

## 6. Diretivas Permanentes

- Sempre validar `resolveClientAssets()` após mudar estrutura de diretórios.
- `npm run build` em todos os workspaces a cada turno de client/assets.
- MANIFEST/ATTRIBUTION atualizados **junto com** novos assets — e verificados contra o disco.
- Áudio e vídeo lazy-load; nunca no boot.
- Antes de retomar, ler `handoff.md`, `estate.md` e o journal mais recente.
- Alegação de gate só entra em documento se tiver sido executada no turno.
- **Novo (S13)**: nenhuma decisão de spec com o documento em RASCUNHO; `grill-me` antes de código.
- **Novo (S13)**: assets gerados por API com URL temporária (Files API) devem ser **baixados
  no mesmo turno** — expiry de 48 h; verificar `expirationTime` do sidecar.

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-10T23:10:00-03:00
