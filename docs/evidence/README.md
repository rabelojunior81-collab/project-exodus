# Evidência Visual — Camada de Registro de Testes

> **O que é**: registro canônico, por fase, de tudo o que os testes **viram, aplicaram, validaram,
> venceram ou falharam** — com screenshot (ou transcrição) e um manifesto por captura.
> **Por que existe**: nenhum gate é aceito "de palavra". Cada afirmação de teste tem um registro
> visual/observável, datado, com commit e como reproduzir.
> **Integração de governança**: esta camada complementa — não substitui — o `docs/journal/`
> (narrativa cronológica), os `docs/specs/` (o contrato) e os gates executados no turno.
> Hierarquia: **fase → teste → passo**, espelhando as sub-fases do `roadmap.md`.

---

## 1. Estrutura

```
docs/evidence/
├── README.md                      # este arquivo (convenções)
└── fase-<x.y.z>/
    ├── MANIFEST.md                # índice da fase (gerado/atualizado pelos scripts)
    └── <t-00-nome-do-teste>/
        ├── 01-<passo>.png             # captura (screenshot ou outro artefato)
        └── 01-<passo>.png.manifest.json  # manifesto do passo
```

## 2. Vocabulário de status (obrigatório)

| Status | Significado |
| :--- | :--- |
| `aplicado` | Ação executada no jogo/teste, sem juízo de valor (ex.: "ordem emitida") |
| `validado` | Comportamento observado condiz com o esperado no passo |
| `passou` | O teste inteiro passou (checkpoint final do fluxo) |
| `falhou` | O comportamento divergiu do esperado — **também é evidência** (estado vermelho do TDD) |
| `pendente` | Planejado, ainda não executado |

## 3. Contrato do manifesto (por captura)

Todo `<arquivo>.manifest.json` contém: `id`, `fase`, `teste`, `passo`, `titulo`, `descricao`
(da cena), `status`, `esperado`, `observado`, `tipo` (`screenshot` | `texto`), `captura`,
`comando` (como reproduzir), `ferramenta`, `timestamp`, `commit`, `tags`.

## 4. Como capturar (autores de teste)

Use `tools/visual-check/lib/evidence.mjs` (cliente, via Playwright) ou chame o helper de texto
para suítes de CLI. Exemplo:

```js
import { EvidenceRegistry } from './lib/evidence.mjs';
const ev = new EvidenceRegistry({ phase: 'fase-2.6.3' });
await ev.capture(page, {
  test: 't-01-coleta', step: '02-apos-entrega', title: 'Entrega confirmada',
  description: 'Trabalhador retorna ao Centro de Comando com 10 de sucata e o placar sobe.',
  status: 'passou', expected: 'sucata +10', observed: 'sucata 180→190',
  command: 'node tools/visual-check/phase-2.6.3-e2e.mjs',
});
ev.flush();
```

## 5. Regras de ouro

1. **Testes congelados primeiro**: o contrato de uma fase é escrito e versionado **antes** da
   implementação; evidência do estado vermelho (`falhou`) é registrada e preservada.
2. **Captura fiel**: screenshot do estado real, sem edição; o manifesto diz o que era esperado.
3. **Append-only por id**: um passo nunca é reescrito silenciosamente — se mudar, novo `passo`.
4. **Commit obrigatório**: informe o hash no `commit` (ou `pendente` antes do commit).
5. **Multimodal por natureza**: screenshot hoje; áudio/vídeo entram como `tipo` novos quando
   existirem (o manifesto é o contrato, o artefato é a mídia).

---
*Rabelus Lab · camada criada na Sessão 17 (Fase 2.6.3).*
