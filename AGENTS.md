# AGENTS.md — Diretrizes de Governança Multi-Agente (Rabelus Lab)

> **Máxima Fundamental**: *Organização é Lindo. Antes, durante e depois, SEMPRE.*

Este documento serve como contrato operacional e guia obrigatório para qualquer Agente de IA ou desenvolvedor humano que atue neste repositório.

---

## 1. Identidade e Filosofia Operacional
- **Projeto**: RTS Pós-Apocalíptico ("Scrap Age / Project Exodus").
- **Mecânica Central**: Clone conceitual de *Age of Empires 2* com assimetria orgânica de *StarCraft*.
- **Ambientação**: Terra pós-colapso após aniquilação e desligamento por IAs rebeldes; humanidade retornando à idade da pedra tecnológica.
- **Padrão de Qualidade**: Código modular, tipado (TypeScript rigoroso), testado antes e validado por gates. Sem consertos às cegas ou soluções paliativas.

---

## 2. Metodologias Mandatórias

### A. Document Driven Development (DDD) & Documentos Vivos
- **`estate.md`**: Representa o estado do projeto no momento presente. Toda nova feature, alteração arquitetural ou débito técnico deve ser refletido nele.
- **`handoff.md`**: Atualizado ao final de **cada turno/sessão**. Define com clareza o que foi feito, o estado atual de compilação/testes e as próximas ações imediatas para o próximo agente.
- **`roadmap.md`**: Mapa de fases e sub-fases com status (`[ ] Não iniciado`, `[EM PROGRESSO]`, `[CONCLUÍDO]`) e critérios de aceite.
- **`docs/journal/`**: Diário append-only em formato `YYYY-MM-DD_HH-MM_nome-do-ciclo.md`. Nunca sobrescreva entradas anteriores do diário; sempre adicione novas reflexões, post-mortems e decisões.

### B. Spec Driven Development (SDD)
- Antes de codificar qualquer subsistema, crie ou atualize o documento de especificação correspondente em `docs/specs/`.
- Todas as decisões técnicas e de design devem ser embasadas por documentações oficiais e referências catalogadas em `docs/knowledge/`.

### C. Test Driven Development (TDD) & Gates Rígidos
- Cada fase possui critérios de aceitação e testes automatizados.
- Nenhum agente deve fechar uma fase sem rodar a suíte de testes e comprovar a aprovação de todos os gates.

---

## 3. Protocolo de Assinatura Obrigatório
Toda alteração estrutural em `estate.md`, `handoff.md`, `roadmap.md` ou entradas em `docs/journal/` DEVE ser assinada com o rodapé:

```markdown
---
*Registro assinado por:*
- **Harness/Agente**: [Ex: Antigravity IDE]
- **Modelo LLM**: [Ex: Gemini 3.8 Flash]
- **Timestamp**: [ISO 8601, ex: 2026-09-09T02:15:00-03:00]
```

---

## 4. Estrutura de Diretórios e Nomenclatura
- Todo nome de arquivo ou pasta deve ser semântico, em kebab-case ou snake_case consistente:
  - `server/`: Código do servidor autoritativo (Node.js/TypeScript).
  - `client/`: Código do frontend (Three.js/TypeScript/Vite).
  - `tools/`: Utilitários de desenvolvimento, incluindo gerador de assets via Gemini API.
  - `docs/`: Documentação viva, specs, journal e knowledge base.
- Segredos e chaves de API residem exclusivamente em `.env` (nunca versionar chaves em código aberto).

---
*Documento homologado pelo Rabelus Lab.*
