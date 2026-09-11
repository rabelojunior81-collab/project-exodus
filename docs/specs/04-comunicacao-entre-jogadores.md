# Spec 04 — Comunicação entre Jogadores: Chat, Taunts e Pings (Sub-fase 3.4)

> **Status**: DESIGN COMPLETO — executa junto da Fase 3 (multiplayer), como sub-fase 3.4.
> **Origem**: diretiva do usuário (10/09/2026) — "precisamos de um sistema de comunicação entre os
> jogadores, como existe nos jogos do gênero".
> **Referência de gênero**: AoE2/SC2/C&C — chat all/team, taunts de voz, pings e "flares" no mapa.
> **Princípio local-first**: nada de serviço externo; tudo trafega pelo servidor autoritativo da
> partida, com validação de dono e rate limit.

---

## 1. Escopo

| Canal | Descrição | Persistência |
| :--- | :--- | :--- |
| Chat (ALL) | Texto para todos | Histórico do HUD (ring de 50) + log de replay |
| Chat (TEAM) | Texto para o time | Idem |
| Sistema | Eventos do jogo no feed (já existe no HUD) | Feed existente |
| Taunts | 12 mensagens rápidas com **voz PT-BR** (pipeline Gemini existente) | Log de replay |
| Ping | Marca no mapa 3D + blip no minimapa + cue de áudio | Efêmero (2,5 s) |
| Flare | Ping de atenção com efeito mais forte (borda + som distinto) | Efêmero (3 s) |

**Fora de escopo**: voz em tempo real (WebRTC) — decisão futura; comandos de equipe por ping
("atacar aqui") chegam com o combate (Fase 5).

## 2. Protocolo (shared, versão 3 na Fase 3)

```ts
// cliente → servidor
interface ChatSendCommand  { kind: 'CHAT';  channel: 'ALL' | 'TEAM'; text: string }  // ≤ 200 chars
interface TauntSendCommand { kind: 'TAUNT'; tauntId: number }                         // 0–11
interface PingCommand      { kind: 'PING';  x: number; z: number; flare: boolean }

// servidor → clientes (eventos no snapshot/stream)
type CommsEvent =
  | { kind: 'CHAT';   tick; playerId; channel; text }
  | { kind: 'TAUNT';  tick; playerId; tauntId }
  | { kind: 'PING';   tick; playerId; x; z; flare };
```

**Regras do servidor (autoridade)**:
1. Validação de dono/partida e de canal (TEAM exige time definido).
2. **Rate limit**: chat 1 msg/2 s com burst 3; taunt 1/5 s; ping 1/1 s; flare 1/10 s.
   Excesso → `CMD_ACK {accepted: false, reason: 'RATE_LIMITED'}` (sem broadcast).
3. `text`: trim, limite 200 chars, rejeição de controle (sem HTML — o cliente escapa na renderização).
4. Broadcast determinístico no tick (todos os clientes recebem na mesma ordem de tick).
5. Tudo entra no **log de replay** com tick e playerId (auditoria e espectadores futuros).

## 3. Cliente (HUD/3D/áudio)

- **Painel de chat**: tecla `Enter` abre; `Tab` alterna ALL/TEAM; histórico rolável; timestamps;
  cor por jogador; mute individual (local, por playerId).
- **Roda de taunts**: tecla `Y` abre roda de 12; números 1–9/0/-/= atalhos diretos; cada taunt
  toca a voz PT-BR correspondente e imprime o texto no chat.
- **Ping**: `Alt+clique` no mapa (ou botão "Ping" no HUD) → ping na posição; `Alt+Shift+clique`
  = flare. Renderização: anel pulsante no terreno (cor do jogador) + blip piscando no minimapa
  + cue de áudio espacializado. Espectadores veem tudo com o autor marcado.
- **Acessibilidade**: chat com opção de fonte maior; pings com opção visual-only (sem áudio);
  taunts com legenda sempre (não depender do áudio).

## 4. Conteúdo de taunts (12, PT-BR, reuso da pipeline)

Pt-BR com identidade do jogo ("reconstrução", "escombros", "antenas mudas") — gravados via
`gemini-2.5-flash-preview-tts` (vozes Charon/Kore já disponíveis), 12 MP3 curtos (≤ 3 s) com
sidecars `.meta.json` + MANIFEST/ATTRIBUTION atualizados. Conjunto inicial:
`1 Ora essa… até que enfim alguém com coragem`;
`2 A sucata é minha, o deserto é de todos`; `3 Estou a caminho`; `4 Preciso de ajuda!`;
`5 Não olhe para as antenas, elas só escutam`; `6 Você chama isso de base?`; `7 Patrulhando`;
`8 Recuando`; `9 Vai ficar aí parado, holograma?`; `10 Boa sorte, vai precisar`;
`11 Todos contra um, é mais divertido`; `12 Defendam o posto!`.

## 5. Anti-abuso e moderação

- Rate limits no servidor (§2) — não burláveis pelo cliente.
- Mute local persistente por playerId (localStorage).
- Sem URLs/HTML: texto puro.
- **Chat é entrada hostil para agentes** (Fase 6): anotações de conteúdo não-confiável; nunca
  interpolar em prompt de sistema (ver spec 05 §7).

## 6. Gates da sub-fase 3.4

1. Teste no servidor: asserts de rate limit (flood rejeitado com motivo), validação de canal e
   limite de texto, ordem de broadcast determinística.
2. Harness LAN (2 clientes): mensagem enviada por A aparece idêntica em B no tick correto;
   ping/flare renderizam nos dois; mute local funciona.
3. Replay: eventos de comunicação presentes no log com tick/playerId.
4. Peso: taunts ≤ 3 s e ≤ 64 kbps cada (≤ ~25 KB por taunt).

## 7. Dependências

- Fase 3 (transporte/multiplayer) para 3.4; UI do chat pode entrar antes (servidor local) se a
  2.6.5 já tiver cliente WS.
- Audio bus `voice` existente; pipeline de TTS para os 12 taunts (script no studio-gemini).

---
*Registro assinado por:*
- **Harness/Agente**: Kilo CLI
- **Modelo LLM**: deepseek-v4.1-flash
- **Timestamp**: 2026-09-11T00:40:00-03:00
