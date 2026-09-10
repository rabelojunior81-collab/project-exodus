# Contribuindo com o Project Exodus

> Português é o idioma primário deste repositório. Contribuições em inglês são bem-vindas — respondemos em qualquer um dos dois. Resumo em inglês no fim.

Obrigado pelo interesse. Este é um projeto solo (Rabelus Lab), aberto sob [MIT](LICENSE), com governança própria documentada em [`AGENTS.md`](AGENTS.md). Antes de escrever código, leia o essencial abaixo.

## Antes de abrir código

1. **Issue primeiro.** Correções pequenas (typo, doc, bug evidente) podem ir direto para PR. Mudanças de comportamento, arquitetura ou gameplay exigem uma issue com a abordagem combinada antes.
2. **Uma mudança por PR.** PRs pequenos e temáticos são revisados mais rápido — e revisados de verdade (não há merge automático neste projeto).
3. **Sem merge vermelho.** PR com gate vermelho não entra — nem "depois eu conserto".

## Fluxo

```bash
git clone https://github.com/rabelojunior81-collab/project-exodus.git
cd project-exodus
npm install

git checkout -b feat/minha-feature   # prefixos: feat/ fix/ docs/ refactor/ asset/ chore/

# Gates obrigatórios (os mesmos que o CI roda)
cd client && npx tsc --noEmit && cd ..
cd server && npx tsc --noEmit && npm test && cd ..
cd tools/studio-gemini && npx tsc --noEmit && cd ..

# Ao tocar o cliente, prove no harness (cliques reais, sem teleporte):
node tools/visual-check/test-buttons.mjs
node tools/visual-check/gather-e2e.mjs
node tools/visual-check/dist-proof.mjs
```

## Commits

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona fila de produção por edifício
fix: corrige rotação do blindado em subida
docs: atualiza spec de integração cliente-servidor
asset: lote 3 — vinheta da era 1
```

## Regras do projeto (resumo do AGENTS.md)

- **Determinismo é sagrado no servidor**: nada de `Math.random`/`Date.now` em `server/src` — use `rng.ts`.
- **Assets**: kebab-case obrigatório, sidecar `.meta.json` com proveniência, `MANIFEST.md`/`ATTRIBUTION.md` atualizados no mesmo PR.
- **Segredos**: `.env` nunca versionado; nenhuma chave em código, doc, bundle ou sidecar.
- **Documentos vivos**: mudança estrutural atualiza `estate.md`, `handoff.md` e o journal em `docs/journal/`.
- **Dependência nova** exige justificativa na issue e passa por revisão.
- **Sem `as any`** para contornar tipo — corrija o tipo (há cicatriz disso no repositório).

## Licença das contribuições

Ao contribuir, você concorda em licenciar sua contribuição sob a [MIT](LICENSE) e declara ter direito sobre o que envia. Assets de terceiros precisam de licença compatível e crédito em [`LICENSES/ASSETS.md`](LICENSES/ASSETS.md).

## English summary

- Open an issue before behavioral changes; small fixes can go straight to a PR.
- One topic per PR; every red gate blocks merge (no automatic merges here).
- Conventional Commits; kebab-case assets with `.meta.json` sidecars.
- Server code stays deterministic — no `Math.random` / `Date.now`.
- No `as any` escapes. No secrets. By contributing you agree to MIT terms.

---

*Rabelus Lab · consulte também [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) e [`SECURITY.md`](SECURITY.md).*
