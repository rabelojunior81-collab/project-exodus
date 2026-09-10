---
name: grill-me
description: Sessão de decisão por entrevista — uma pergunta por vez, com contexto, opções, consequências e recomendação, até fechar todas as decisões abertas de um spec/roadmap. Use quando o usuário pedir "grill me", "me entreviste", "vamos decidir X", ou quando houver decisões abertas bloqueando trabalho (spec em RASCUNHO, handoff §5, issues de arquitetura).
---

# Grill-Me — Extração de Intenção por Entrevista

## Objetivo

Fechar decisões abertas com o usuário, uma pergunta por vez, transformando ambiguidade
em registro ADR curto e rastreável. O usuário decide; o agente prepara a decisão para
ser fácil, informada e reversível.

## Regras de ouro

1. **UMA pergunta por mensagem.** Nunca despeje N perguntas de uma vez.
2. **Três partes fixas em cada rodada:**
   - (a) Contexto em 2 frases — o que está em jogo e por que agora;
   - (b) Opções **A/B/C** com consequência concreta de cada uma (não genérica);
   - (c) Recomendação do agente com justificativa em 1–2 frases.
3. **Nunca decide pelo usuário.** Se ele delegar ("você decide"), registra como
   `DELEGADO` e marca para revisão explícita futura.
4. **Toda pergunta termina em escolha fechada** (A/B/C), nunca aberta.
5. **Após cada resposta:** parafraseia a decisão, registra o ID (`D-XX = B`) e SÓ ENTÃO
   avança para a próxima. Se o usuário responder parcial, repita a parte faltante.
6. **Ordem por dependência:** decide primeiro o que destrava mais itens downstream
   (ex.: paridade de modelo antes de predição de rede).
7. **No fim do bloco:** consolidar tabela de decisões, atualizar spec/roadmap/handoff
   no MESMO turno, e listar o que reabre ou muda de fase.

## Fluxo padrão

1. **Inventário**: ler as decisões abertas (spec §4, handoff §5, journal mais recente).
   Ordenar por dependência e agrupar por documento.
2. **Aquecimento** (opcional): 1 pergunta fácil para calibrar o tom da sessão.
3. **Loop por decisão**: contexto → opções → recomendação → resposta → registro.
4. **Fechamento**: tabela consolidada + impacto por fase + itens que voltam a ser "aberto".
5. **Sincronização**: spec sai de RASCUNHO; roadmap/handoff/estate refletem as escolhas.

## Formato de registro (ADR curto)

| ID | Pergunta | Escolha | Justificativa | Consequências | Revisão |
| :-- | :--- | :--- | :--- | :--- | :--- |
| D-2.6-A | Tempos de treino | B = servidor | Ritmo validado em playtest | Partida acelera 1,6–2× | — |

Arquivo sugerido: `docs/decisions/YYYY-MM-DD_<tema>.md` (append-only, assinado).
Se o projeto já usa journal para isso, registrar lá e linkar no spec.

## Anti-padrões (nunca fazer)

- Pergunta dupla ("quer X **e** Y?").
- Opinião disfarçada de pergunta ou pressão pela escolha "recomendada".
- Avançar sem registrar; deixar decisão só no chat (morre na próxima sessão).
- Perguntar o que o contexto do repositório já responde — leia antes de perguntar.
- Apresentar opção sem consequência ("A ou B?" sem custo/benefício).
- Esquecer de atualizar o documento-fonte da decisão (spec/roadmap) após fechar.

## Critério de encerramento

A sessão termina quando: (1) todas as decisões do inventário estão com escolha
registrada, ou (2) o usuário encerra explicitamente — nesse caso, deixar o estado
parcial documentado (IDs pendentes e o que cada um bloqueia).
