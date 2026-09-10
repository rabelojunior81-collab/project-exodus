# Spec 00 — Governança e Arquitetura do Sistema

> **Status**: Aprovado  
> **Autor**: Rabelus Lab & Antigravity  
> **Data**: 2026-09-09T02:19:00-03:00  

---

## 1. Visão Geral
Este documento especifica a topologia do repositório, o protocolo de comunicação entre cliente e servidor, a orquestração de compilação do monorepo e o pipeline de geração de ativos via Gemini API.

---

## 2. Estrutura do Repositório (Monorepo Workspaces)

```text
game-rts/
├── .env                              # Variáveis de ambiente (ex: GEMINI_API_KEY)
├── AGENTS.md                         # Contrato e diretrizes multi-agente
├── estate.md                         # Estado vivo consolidado
├── handoff.md                        # Registro de handoff de turno
├── roadmap.md                        # Roadmap de fases e sub-fases
├── docs/
│   ├── specs/                        # Especificações técnicas detalhadas (SDD)
│   ├── journal/                      # Diário de bordo append-only (DDD)
│   └── knowledge/                    # Biblioteca viva de conhecimentos e ADRs
├── server/                           # Pacote do Servidor Autoritativo (Node.js/TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                  # Ponto de entrada do servidor
│   │   ├── net/                      # Gerenciador de conexões WebSocket
│   │   ├── sim/                      # Motor de simulação 20Hz
│   │   └── shared/                   # Tipos e DTOs de mensagens
│   └── tests/
├── client/                           # Pacote do Cliente Web (Vite + Three.js + TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/assets/                # Assets gerados (texturas, áudios, modelos)
│   ├── src/
│   │   ├── main.ts                   # Ponto de entrada do cliente
│   │   ├── engine/                   # Three.js viewport, câmera isométrica, cena
│   │   ├── input/                    # Mouse picker, raycast e box selection
│   │   ├── net/                      # Cliente WebSocket e buffer de interpolação
│   │   └── ui/                       # Interface HUD em Vanilla CSS moderno
│   └── tests/
└── tools/studio-gemini/              # Ferramenta de Build & Asset Generation (CLI)
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts                  # CLI para geração de assets
    │   ├── client.ts                 # Wrapper do SDK / REST da Gemini API
    │   ├── generators/
    │   │   ├── lore.ts               # Roteiros e crônicas das 4 Eras
    │   │   ├── tts.ts                # Geração de áudio para transmissões de rádio
    │   │   └── textures.ts           # Prompting de imagens PBR e conceitos
    └── tests/                        # Smoke test da API
```

---

## 3. Protocolo de Comunicação de Rede (Multiplayer LAN / Tailnet)

### 3.1 Transporte e Portas
- **Protocolo**: WebSockets (`ws://<IP>:8080`) sobre TCP para garantia de ordem de pacotes.
- **Formato**: JSON tipado para inicialização e comandos; snapshots delta de estado comprimidos.
- **Resolução de Endereço**: Conexão direta via IP de LAN (ex: `192.168.1.100`) ou IP seguro Tailscale (ex: `100.80.x.y`).

### 3.2 Formato das Mensagens Base
```typescript
export interface BasePacket {
  type: string;
  tick: number;
  timestamp: number;
}

export interface PlayerCommandPacket extends BasePacket {
  type: 'PLAYER_COMMAND';
  playerId: string;
  action: 'MOVE' | 'ATTACK' | 'GATHER' | 'BUILD' | 'RESEARCH_AGE';
  targetEntityId?: string;
  targetPosition?: { x: number; z: number };
  buildingType?: string;
}

export interface WorldSnapshotPacket extends BasePacket {
  type: 'WORLD_SNAPSHOT';
  entities: Array<{
    id: string;
    type: string;
    faction: string;
    position: { x: number; y: number; z: number };
    rotation: number;
    health: number;
    maxHealth: number;
    state: string;
  }>;
  playerResources: Record<string, {
    rations: number;
    scrap: number;
    chips: number;
    concrete: number;
    age: number;
  }>;
}
```

---

## 4. Pipeline do Estúdio Gemini (`tools/studio-gemini`)
- A ferramenta lê a chave `GEMINI_API_KEY` do arquivo `.env` localizado na raiz.
- Gera saídas diretamente em `client/public/assets/` em formatos estruturados:
  - Textos de lore: `client/public/assets/lore/*.json`
  - Áudios narrados: `client/public/assets/audio/*.mp3` ou `*.wav`
  - Retratos e ícones: `client/public/assets/images/*.webp`
- Inclui mecanismo de hash para evitar regerações desnecessárias caso o asset já exista em disco.

---
*Registro assinado por:*
- **Harness/Agente**: Antigravity IDE
- **Modelo LLM**: Gemini 3.8 Flash
- **Timestamp**: 2026-09-09T02:19:00-03:00
