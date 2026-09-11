import { WebSocketServer, WebSocket } from 'ws';
import * as dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, resolve } from 'path';
import { Simulation, TICK_RATE } from './simulation.js';
import { deserializeMessage, ProtocolError } from '@project-exodus/shared/protocol';

// Carrega .env da raiz do monorepo
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0'; // Acessível via LAN e Tailscale

export class GameServer {
  private wss: WebSocketServer | null = null;
  private readonly tickRate = TICK_RATE; // 20 Hz (fonte única: simulation.ts)
  private readonly sim: Simulation;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(seed: number = 20260909) {
    this.sim = new Simulation(seed);
  }

  public start(): void {
    Simulation.createDefaultScenario(this.sim, 'player_1');

    this.wss = new WebSocketServer({ port: PORT, host: HOST });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientIp = req.socket.remoteAddress;
      console.log(`[GameServer] Cliente conectado: ${clientIp}`);

      ws.send(JSON.stringify({
        type: 'INIT_ACK',
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
    // Broadcast de snapshots entra na Fase 3 (rede). Por ora, sim puro.
  }

  public stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
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
