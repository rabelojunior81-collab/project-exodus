import { GeminiStudioClient } from '../src/client.js';
import assert from 'assert';

console.log('[Test:GeminiStudio] Iniciando teste de conectividade com a API Gemini...');

async function runTest() {
  const client = new GeminiStudioClient();
  const result = await client.testConnectivity();

  console.log(`[Test:GeminiStudio] Modelo testado: ${result.model}`);
  console.log(`[Test:GeminiStudio] Resposta obtida: "${result.responseSnippet}"`);

  assert.strictEqual(result.success, true, 'A API Gemini deve responder com a confirmação esperada');
  console.log('[Test:GeminiStudio] Conectividade e chave .env validadas com sucesso!');
}

runTest().catch((err) => {
  console.error('[Test:GeminiStudio] Falha no teste de conectividade:', err.message);
  process.exit(1);
});
