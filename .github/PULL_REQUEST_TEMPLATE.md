# Pull Request

## O que muda

<!-- Resumo objetivo. Se há issue, referencie: Closes #N -->

## Tipo

- [ ] Correção de bug
- [ ] Feature / comportamento novo
- [ ] Refatoração (sem mudança de comportamento)
- [ ] Documentação / governança
- [ ] Assets (pipeline Gemini)
- [ ] Ferramentas / harness

## Gates executados (obrigatório)

- [ ] `npx tsc --noEmit` — client (0 erros)
- [ ] `npx tsc --noEmit` + `npm test` — server (71 asserts)
- [ ] `npx tsc --noEmit` — tools/studio-gemini
- [ ] `node tools/visual-check/test-buttons.mjs` (quando o cliente é tocado)
- [ ] `node tools/visual-check/dist-proof.mjs` (quando há rebuild)

## Checklist de projeto

- [ ] Sem `Math.random` / `Date.now` em `server/src` ou código determinístico
- [ ] Sem segredos, sem `as any` novo
- [ ] Assets novos: kebab-case + sidecar `.meta.json` + MANIFEST/ATTRIBUTION atualizados
- [ ] Documentos vivos atualizados (`estate.md`, `handoff.md`, journal) se a mudança é estrutural
- [ ] Screenshots antes/depois anexados (quando visual)

## Contexto extra

<!-- Decisões tomadas, trade-offs, o que ficou de fora de propósito -->
