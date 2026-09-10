# Diário de Bordo — Sessão 11

> **Ciclo**: Governança, Diagnóstico de Provider e Preparação para Retomada  
> **Data/hora**: 2026-09-10 11:45 BRT  
> **Harness/Agente**: Kimi Code CLI  
> **Modelo LLM**: Kimi K2.7 Code (OpenCode Go)

---

## 1. Contexto de Entrada

O usuário retomou a sessão após interrupção de provider. A sessão anterior (Sessão 10) havia declarado a Fase 1.7 Expandida como concluída, mas havia inconsistências reais:
- Áudio existia, mas a correção do `AudioContext` e a fiação com seleção/comandos precisavam de validação.
- Músicas existiam em disco, mas não estavam ligadas ao gameplay.
- Vídeo de transição de era não existia (`client/public/assets/video/` inexistente).
- O usuário estava frustrado com o provider `ollama-cloud/kimi-k3` por limites de uso.

A solicitação deste turno foi:
1. Revisar o estado real do projeto.
2. Extrair telemetria temporal da sessão ativa.
3. Diagnosticar o limite de uso da Ollama Cloud.
4. Atualizar toda a governança para retomada futura por qualquer harness/LLM.

---

## 2. Ações Realizadas

### 2.1 Revisão do estado do projeto
- Leitura de `handoff.md`, `estate.md` e `roadmap.md`.
- Verificação em disco de `client/public/assets/audio/`, `music/`, `video/`, `portraits/`.
- Confirmação: áudios e músicas existem; vídeo não existe.
- Build do cliente executado com sucesso; `test-buttons.mjs` 10/10 PASS; `dist-proof.mjs` 11 entidades/8 nós/0 pageerrors.

### 2.2 Telemetria da sessão ativa
- Fonte: `~/.kimi-code/sessions/wd_game-rts_e07117042348/session_fc3a67ed-5aa7-43d2-81b3-645a8c31556d/agents/main/wire.jsonl`.
- Total: 2.205 registros, 14 turnos, **27.304.710 tokens**.
- Horário de início: 09/09/26 21:06 BRT.
- Último evento: 10/09/26 11:36 BRT.
- Alternância de providers:
  - `ollama-cloud/kimi-k3`: turnos 1–3 (21:06–22:03 BRT) e turno 12 (11:31 BRT).
  - `opencode-go/kimi-k2.7-code`: turnos 4–11 e 13–14.

### 2.3 Diagnóstico da Ollama Cloud
- Configuração lida de `~/.kimi-code/config.toml`.
- Provider `ollama-cloud`: `base_url = "https://ollama.com/v1"`, tipo OpenAI.
- Requisições autenticadas:
  - `GET /models` → `200 OK` (19 modelos disponíveis).
  - `POST /chat/completions` com `kimi-k3` → `429` com mensagem:
    > *"you (firebird81) have reached your session usage limit, upgrade for higher limits: https://ollama.com/upgrade or add usage credits: https://ollama.com/settings"*
- Endpoints de usage/billing (`/user`, `/usage`, `/billing`) retornam `404`.

### 2.4 Pesquisa sobre contabilização da Ollama Cloud
- Ollama mudou para "transparent pricing" em 31/08/2026: novos planos usam créditos mensais por token, sem janelas de 5h/7 dias.
- Planos legados (como o Pro de $20/mês do usuário) mantêm:
  - medição por **GPU time** (não tokens);
  - **session limit** que reseta a cada 5h;
  - **weekly limit** que reseta a cada 7 dias.
- Modelos grandes como `kimi-k3` (2,8T parâmetros, segundo blog oficial) consomem quota muito rapidamente.
- A mensagem de erro "session usage limit" indica que a conta está no plano legado e esgotou a quota da sessão (ou possivelmente a semanal).

### 2.5 Governança atualizada
- `estate.md`: atualizado com status real, pendências de 1.7E, diagnóstico de provider e nova assinatura.
- `handoff.md`: reescrito com turno atual, estado de compilação, pendências críticas e contexto de provider.
- `roadmap.md`: sub-fase 1.7E dividida em "parcial" (Lotes 1, 2, 2b) e "restante" (Lote 3 vídeo + mixagem música).
- Criado este arquivo de journal.

---

## 3. Descobertas e Decisões

### O que estava correto no handoff anterior
- A Fase 1.7A–1.7D estava realmente concluída e testada.
- O áudio estava implementado; a fiação com seleção/comandos/briefings está presente em `client/src/main.ts` e `client/src/engine/audio.ts`.

### O que estava incompleto ou impreciso
- **Música**: os arquivos MP3 existem, mas `audio.ts` não possui método `playMusic` e `main.ts` nunca o chama. Portanto, nenhuma música toca.
- **Vídeo**: Lote 3 não foi entregue. A pasta `client/public/assets/video/` não existe.
- **Provider**: o limite da Ollama Cloud não é uma "janela de 5h" que simplesmente libera; é uma quota de uso que pode esgotar antes do reset, especialmente com modelos grandes.

### Decisões tomadas
- Manter o projeto compilável e testado; não adicionar código novo neste turno para não introduzir regressões antes da retomada.
- Documentar explicitamente as pendências para que qualquer harness/LLM futuro possa continuar sem depender de contexto compactado.
- Recomendar ao usuário resolver a quota da Ollama Cloud ou continuar com `opencode-go/kimi-k2.7-code`.

---

## 4. Estado de Saída

- **Código**: compilando, testes passando.
- **Assets**: áudio e imagens OK; música em disco mas não integrada; vídeo pendente.
- **Provider ativo**: `opencode-go/kimi-k2.7-code`.
- **Ollama Cloud**: bloqueado por `session usage limit`.
- **Documentação**: `estate.md`, `handoff.md`, `roadmap.md` e este journal atualizados e assinados.

---

## 5. Referências Catalogadas

- [Ollama's transparent pricing](https://ollama.com/blog/transparent-pricing)
- [Ollama Cloud limits](https://ollamatps.com/limits)
- [Ollama Pricing 2026](https://checkthat.ai/brands/ollama/pricing)
- [DEV Community — Ollama Cloud Free vs Pro](https://dev.to/amareswer/ollama-cloud-free-vs-pro-usage-limits-pricing-what-you-actually-get-2026-3ieo)
- [CodexBar issue #534 — Cloud usage tracking](https://github.com/steipete/CodexBar/issues/534)

---
*Registro assinado por:*
- **Harness/Agente**: Kimi Code CLI
- **Modelo LLM**: Kimi K2.7 Code (OpenCode Go)
- **Timestamp**: 2026-09-10T11:45:00-03:00
