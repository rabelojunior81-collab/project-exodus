import { GameServer } from '../src/index.js';
import assert from 'assert';

console.log('[Test:Server] Iniciando teste de sanidade do loop do GameServer...');

const server = new GameServer();
assert.strictEqual(server.getCurrentTick(), 0, 'O tick inicial deve ser 0');

console.log('[Test:Server] Teste de instância concluído com sucesso!');
process.exit(0);
