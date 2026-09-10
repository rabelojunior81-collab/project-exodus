# Política de Segurança

## Versões suportadas

O projeto está em desenvolvimento ativo (pré-1.0). Apenas o estado atual da branch `main` recebe correções de segurança.

## Como reportar uma vulnerabilidade

**Não abra issue pública para vulnerabilidades.**

Envie um e-mail para **rabelo.work@gmail.com** com:

1. Descrição da falha e impacto potencial;
2. Passos de reprodução (ambiente, navegador, commit);
3. Prova de conceito, se houver;
4. Como você prefere ser creditado (ou anonimato).

Resposta em até 7 dias. Correções de segurança são tratadas fora do fluxo normal de PR quando necessário, com crédito a quem reportar (salvo pedido de anonimato).

## Escopo

- Cliente web (`client/`) — XSS, injeção via assets, exposição de dados locais;
- Servidor autoritativo (`server/`) — validação de comandos, DoS em WebSocket, protocolo;
- Ferramentas (`tools/`) — execução de scripts, vazamento de chaves;
- Pipeline de assets — chaves de API, proveniência e integridade.

Fora do escopo: engenharia social, ataques físicos, dependências de terceiros já reportadas a montante (avise mesmo assim se afetarem o projeto).

## Regra permanente do projeto

Nenhuma chave de API é versionada. O arquivo `.env` na raiz é protegido pelo `.gitignore`; se você encontrar qualquer credencial em código, bundle, documentação, manifesto ou sidecar, trate como vulnerabilidade e reporte pelo canal acima.

---

*Rabelus Lab · 2026*
