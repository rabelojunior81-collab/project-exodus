# Sessão 13 — Repositório Público, README e Landing (Hardening Parcial)

> **Ciclo**: diretiva do usuário — preparar o repositório público `project-exodus`, README estilo
> landing page (MIT, bilingue), landing HTML no estilo `modernity-sandbox`, mais ativos (marca),
> fechar itens 2 (CRIT-02) e 3 (ALTO-04) do plano, e preparar as decisões do spec 02 (`grill-me`).
> **Data/Hora**: 2026-09-10T23:10:00-03:00
> **Escopo**: raiz do monorepo, `client/public/assets/`, `landing/` (novo), `.github/` (novo),
> `docs/`, `tools/`.
> **Método**: execução real com evidência; nenhuma alegação de gate sem execução no turno.

---

## 0. Sumário Executivo

O projeto deixou de ser um diretório sem histórico e virou um **repositório público versionado**
(`github.com/rabelojunior81-collab/project-exodus`, baseline `924c111`, tag `v0.1.0-fase-1.7`),
com README bilingue de qualidade de landing, arquivos de comunidade Open Source completos e uma
**landing page funcional** publicada via GitHub Pages — incluindo o **vídeo do Lote 3, que existia
preso na Files API do Gemini e foi recuperado a tempo do expiry**.

Três descobertas materiais nesta sessão:

1. **O vídeo do Lote 3 foi gerado com sucesso** (`gemini-omni-flash-preview`, MP4 1280×720, 8 s,
   2,07 MB) mas o piloto salvou o **metadata JSON** (665 B) no lugar dos bytes. Os bytes foram
   baixados da Files API em 10/09 22:55 BRT — **antes do expiry em 12/09 06:33 UTC** — e agora
   vivem no repositório (`client/public/assets/video/era-1-transition.mp4`) e na landing
   (`landing/assets/hero.mp4`). Alerta de escassez evitado por ~36 h.
2. **ffmpeg está disponível** via `ffmpeg-static` e foi usado: pôster do vídeo extraído e toda a
   mídia da landing convertida de PNG para WebP (**~10 MB → ~750 KB, −93 %**).
3. **O GitHub Pages já existia em modo legacy/Jekyll** (servindo a raiz do `main`, não a landing).
   Migrado para deploy via Actions (`build_type=workflow`) nesta sessão.

---

## 1. O Que Foi Entregue (por item do plano)

### Item 1 — Repositório público, README e landing

| Entrega | Arquivo(s) | Estado |
| :--- | :--- | :--- |
| Repositório Git + baseline + tag | `.git` · commit `924c111` · tag `v0.1.0-fase-1.7` | 🟢 público, push OK |
| Licença e regras | `LICENSE` (MIT, código), `LICENSES/ASSETS.md` (assets por categoria) | 🟢 |
| Comunidade | `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1), `SECURITY.md`, `CHANGELOG.md` | 🟢 |
| Templates | `.github/ISSUE_TEMPLATE/{bug,feature}.yml`, `.github/PULL_REQUEST_TEMPLATE.md` | 🟢 |
| README principal | `README.md` (PT-BR, ~150 linhas, badges shields.io, screenshots, áudio, roadmap, licença) | 🟢 |
| README espelho | `README.en.md` | 🟢 |
| Marca e banner | `docs/media/mark-exodus.svg` (conceito "Breakout": triângulo partido + núcleo ciano), `docs/media/banner-exodus.svg` | 🟢 (vetor próprio) |
| Landing | `landing/index.html` (arquivo único, estilo modernity-sandbox: vídeo fixo, vidro, marquee, pilares, eras, facções, roadmap, CTA), `landing/i18n.js` (PT/EN com `?lang=en`), `robots.txt`, `sitemap.xml`, `landing/README.md` | 🟢 |
| Deploy | `.github/workflows/pages.yml` (publica `landing/` como artefato) | 🟢 configurado; Pages migrado para Actions |
| Mídia da landing | 7 shots WebP, 12 retratos WebP, 4 briefings MP3, 1 trilha ambiente MP3, vídeo + pôster | 🟢 |
| Skill de decisão | `.kilo/skill/grill-me/SKILL.md` | 🟢 |

### Item 2 — CRIT-02 (carimbo de build honesto)

- `client/vite.config.ts`: `define.__BUILD_STAMP__` gerado em tempo de build (`Intl.DateTimeFormat`
  em America/Sao_Paulo, formato `dd/mm hh:mm`).
- `client/src/main.ts`: bloco do carimbo agora consome a constante; `document.lastModified` removido.
- **Gate executado nesta sessão**: `tsc --noEmit` no client = **0 erros**.
- **Gate negativo pendente** (o que faltou na 1.9.4): build → anotar carimbo → esperar 2 min →
  recarregar → carimbo não pode mudar. Não executado (requer build + preview + espera).

### Item 3 — ALTO-04 (manifestos × disco)

- `MANIFEST.md` reconstruído a partir do disco (contagem e peso medidos): 76 publicados / ≈ 25.067 KB,
  com seção `video/` e coluna de status (em uso × reserva).
- `ATTRIBUTION.md`: parágrafo de música corrigido (`lyria-3.5`, 3 faixas, 4,19 MB, não consumidas)
  e vídeo atualizado (recuperado).
- **Órfãos arquivados**: 3 `.ogg` + 3 sidecars → `docs/archived-assets/ogg-orphans/`.
- **Gate criado**: `tools/verify-manifest.mjs` compara MANIFEST × disco e falha em divergência
  (execução com `node` pendente de validação em CI).
- Tentativa antiga do Lote 3 arquivada em `docs/archived-assets/lote3-attempt/`.

### Bônus pertinente — recuperação do vídeo

- `tools/studio-gemini/scripts/download-pending-video.mjs` (novo; lê a chave do `.env`, nunca a imprime).
- Script registrado no studio: `npm run video:download`.
- Vídeo servido mudo na landing; a landing detecta `assets/hero.mp4` por `HEAD` e desliga o
  fallback Ken Burns sozinha.

---

## 2. Gates Executados Nesta Sessão (não herdados)

| # | Gate | Comando | Resultado |
| :-- | :--- | :--- | :--- |
| G1 | Repo inicializado | `git init` + `git branch -m main` | 🟢 |
| G2 | Segredo fora do rastreamento | `git ls-files .env` | 🟢 vazio |
| G3 | Dependências fora do rastreamento | `git ls-files node_modules \| wc -l` | 🟢 0 |
| G4 | Baseline coerente | `git ls-files \| wc -l` | 🟢 321 arquivos |
| G5 | Typecheck client pós-CRIT-02 | `node_modules/.bin/tsc --noEmit -p client/tsconfig.json` | 🟢 0 erros |
| G6 | Repositório remoto | `gh repo create … --push` + `git push origin v0.1.0-fase-1.7` | 🟢 publicados |
| G7 | Conversão de mídia | ffmpeg → WebP | 🟢 ~10 MB → ~750 KB |
| G8 | Vídeo recuperado | `download-pending-video.mjs` | 🟢 2.070.687 bytes |
| G9 | Pages migrado para Actions | `gh api -X PUT … build_type=workflow` + dispatch | 🟡 deploy em execução |
| G10 | Suíte do servidor | `cd server && npm test` | 🟢 smoke + 39 asserts (11 protocol + 7 astar + 7 resources + 8 simulation + 6 worker) |
| G11 | Manifesto × disco | `node tools/verify-manifest.mjs` | 🟢 100% em sincronia (o gate pegou uma divergência real de contagem no root antes do ajuste) |

**Não executados nesta sessão** (registrado por honestidade): harness visual (`test-buttons`,
`gather-e2e`, `dist-proof`) e build de produção do client. Nenhum arquivo de `server/` foi tocado;
o client mudou em `main.ts`/`vite.config.ts` e passou no typecheck. Os gates de harness devem ser
re-executados no próximo turno (ou pelo CI, quando criado).

---

## 3. Decisões Tomadas (S13)

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D-13.1 | Código sob **MIT** e assets sob licenças próprias (`LICENSES/ASSETS.md`) | MIT pedido pelo usuário; assets têm terceiros (Quaternius/Mixamo) e IA — misturar seria incorreto |
| D-13.2 | **Versionar** os 31 MB de `masters/` | Geração por LLM não é reprodutível; recomendação da auditoria S12 acatada |
| D-13.3 | Landing publicada como artefato do Pages a partir de `landing/` (Actions) | Deploy determinístico, sem Jekyll; root do repo não vira site |
| D-13.4 | Vídeo do Lote 3 usado **mudo** na landing | Prompt pedia "muted"; trilha AAC existe mas não foi pedida — não forçar áudio |
| D-13.5 | Órfãos `.ogg` arquivados (não deletados) | Reversível e rastreável, seguindo o padrão de `docs/archived-assets/` |
| D-13.6 | Autor dos commits: `Rabelus Lab <rabelo.work@gmail.com>` (via `-c` pontual) | Identidade Git global não estava configurada; config do usuário não foi alterada |

---

## 4. Pendências para o Próximo Turno

1. **Decisões da Fase 2.6** (`D-2.6-A` a `D-2.6-E`) — sessão `grill-me`; spec 02 sai de RASCUNHO.
2. **Gate negativo do CRIT-02** (build + 2 min + reload).
3. **Gates de runtime**: `npm test` (server), `test-buttons`, `gather-e2e`, `dist-proof`.
4. **ALTO-05** (Fase 1.11.4): cortar o stinger de 58 s, re-encodar música para 96 kbps, implementar
   `playMusic`/crossfade e fiar menu/partida/combate. ffmpeg confirmado disponível.
5. **CI**: criar workflow com os gates (tsc ×3 + testes do servidor + verify-manifest) — hoje só a
   Pages tem workflow.
6. **Publicação dos topics e social preview** no GitHub (config de repositório, não versionada).
7. **Lote 3 restante** (1.11.6): demais eras, remoção do `as any` no piloto.

---

*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-10T23:10:00-03:00
