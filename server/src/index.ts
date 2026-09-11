import { WebSocketServer, WebSocket } from 'ws';
import * as dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, resolve } from 'path';
import { Simulation, TICK_RATE } from './simulation.js';
import { takeTickPayload, viewFor, type TickPayload } from './broadcast.js';
import { deserializeMessage, serializeSnapshot, ProtocolError } from '@project-exodus/shared/protocol';

// Carrega .env da raiz do monorepo
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0'; // Acessível via LAN e Tailscale

/** Limite de backpressure: acima disso, o tick é PULADO para o cliente (não enfileira). */
const MAX_BUFFERED_BYTES = 256 * 1024;
/** Resumo de rede no console a cada N ticks de broadcast (20 = 1 s a 20 Hz). */
const NET_LOG_EVERY_TICKS = 20;

interface ClientInfo {
  clientId: string;
  droppedTicks: number;
}

export interface NetworkStats {
  clients: number;
  ticksBroadcast: number;
  payloadBytesTotal: number;
  bytesOutTotal: number;
  avgPayloadBytes: number;
  maxPayloadBytes: number;
  droppedTicks: number;
}

export class GameServer {
  private wss: WebSocketServer | null = null;
  private readonly tickRate = TICK_RATE; // 20 Hz (fonte única: simulation.ts)
  private readonly sim: Simulation;
  private intervalId: NodeJS.Timeout | null = null;

  // Fase 2.6.4 — broadcast por tick
  private readonly clients: Map<WebSocket, ClientInfo> = new Map();
  private clientSeq: number = 0;
  private ticksBroadcast: number = 0;
  private payloadBytesTotal: number = 0;
  private bytesOutTotal: number = 0;
  private maxPayloadBytes: number = 0;
  private droppedTicks: number = 0;

  constructor(seed: number = 20260909) {
    this.sim = new Simulation(seed);
  }

  public start(): void {
    Simulation.createDefaultScenario(this.sim, 'player_1');

    this.wss = new WebSocketServer({ port: PORT, host: HOST });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIp = req.socket.remoteAddress;
      console.log(`[GameServer] Cliente conectado: ${clientIp}`);

      this.clientSeq += 1;
      const info: ClientInfo = { clientId: `client_${this.clientSeq}`, droppedTicks: 0 };
      this.clients.set(ws, info);

      ws.send(JSON.stringify({
        type: 'INIT_ACK',
        clientId: info.clientId,
        tick: this.getCurrentTick(),
        message: 'Conectado ao Servidor Autoritativo Project Exodus'
      }));

      ws.on('message', (data) => {
        try {
          const decoded = deserializeMessage(data.toString());
          if (decoded.channel === 'COMMAND') {
            const accepted: boolean = this.sim.issueCommand(decoded.command);
            ws.send(JSON.stringify({ type: 'CMD_ACK', cmdId: decoded.command.cmdId, accepted, tick: this.getCurrentTick() }));
          } else {
            console.log(`[GameServer] Canal inesperado do cliente: ${decoded.channel}`);
          }
        } catch (err) {
          if (err instanceof ProtocolError) {
            console.error('[GameServer] Protocolo:', err.message);
          } else {
            console.error('[GameServer] Erro ao processar mensagem:', err);
          }
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[GameServer] Cliente desconectado: ${clientIp}`);
      });
    });

    // Inicia loop autoritativo de ticks (dt fixo; ver Simulation.step).
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000 / this.tickRate);

    console.log(`[GameServer] Servidor rodando em ws://${HOST}:${PORT} (LAN / Tailscale pronto) [Tick: ${this.tickRate}Hz]`);
  }

  private tick(): void {
    this.sim.step();
    // Fase 2.6.4: drena o snapshot de CADA tick (sem acúmulo de eventos) e o
    // transmite como payload base; as views por cliente são projeções puras.
    const base: TickPayload = takeTickPayload(this.sim);
    this.maxPayloadBytes = Math.max(this.maxPayloadBytes, base.bytes);
    if (this.clients.size === 0) return;

    this.ticksBroadcast += 1;
    this.payloadBytesTotal += base.bytes;

    for (const [ws, info] of this.clients) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      // Backpressure: cliente lento perde o tick (NUNCA enfileira — fila
      // crescente vira latência infinita; em LAN/Tailnet perder 1 tick é ok).
      if (ws.bufferedAmount > MAX_BUFFERED_BYTES) {
        info.droppedTicks += 1;
        this.droppedTicks += 1;
        continue;
      }
      const json: string = serializeSnapshot(viewFor(info.clientId, base.snapshot));
      ws.send(json);
      this.bytesOutTotal += Buffer.byteLength(json, 'utf8');
    }

    if (this.ticksBroadcast % NET_LOG_EVERY_TICKS === 0) {
      const s: NetworkStats = this.getNetworkStats();
      console.log(
        `[GameServer] rede: ${s.avgPayloadBytes} B/tick · máx ${s.maxPayloadBytes} B · ` +
        `${s.clients} cliente(s) · drops=${s.droppedTicks}`,
      );
    }
  }

  /** Métricas de rede do broadcast (2.6.4) — usadas pelo harness/E2E. */
  public getNetworkStats(): NetworkStats {
    return {
      clients: this.clients.size,
      ticksBroadcast: this.ticksBroadcast,
      payloadBytesTotal: this.payloadBytesTotal,
      bytesOutTotal: this.bytesOutTotal,
      avgPayloadBytes: Math.round(this.payloadBytesTotal / Math.max(1, this.ticksBroadcast)),
      maxPayloadBytes: this.maxPayloadBytes,
      droppedTicks: this.droppedTicks,
    };
  }

  public stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    for (const ws of this.clients.keys()) ws.close();
    this.clients.clear();
    if (this.wss) this.wss.close();
    console.log('[GameServer] Servidor finalizado.');
  }

  public getCurrentTick(): number {
    return this.sim.getTick();
  }

  /** Acesso à simulação autoritativa (harness/testes/Fase 2.6). */
  public getSimulation(): Simulation {
    return this.sim;
  }
}

// Inicializa apenas quando executado diretamente (importar não abre porta:
// antes, qualquer import com NODE_ENV != test subia o WebSocket).
const invokedAsMain: boolean =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (process.env.NODE_ENV !== 'test' && invokedAsMain) {
  const server = new GameServer();
  server.start();
}
