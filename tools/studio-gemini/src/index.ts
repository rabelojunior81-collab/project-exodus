import { GeminiStudioClient } from './client.js';
import { LoreGenerator } from './generators/lore.js';

async function main() {
  console.log('=== Project Exodus — Gemini Asset Studio CLI ===\n');

  try {
    const client = new GeminiStudioClient();
    const loreGen = new LoreGenerator(client);

    console.log('[CLI] Iniciando geração de crônicas das 4 Eras...');

    const eras = [
      { id: 1, name: 'Era dos Escombros' },
      { id: 2, name: 'Era do Reassentamento' },
      { id: 3, name: 'Era da Reengenharia' },
      { id: 4, name: 'Era do Renascimento Cibernético' }
    ];

    for (const era of eras) {
      const lore = await loreGen.generateEraLore(era.id, era.name);
      console.log(`✓ Era ${lore.eraId} (${lore.eraName}) pronta: [${lore.author}] - "${lore.radioTranscript.substring(0, 60)}..."`);
    }

    console.log('\n[CLI] Processamento concluído com sucesso! Assets gerados e armazenados em client/public/assets/lore.');
  } catch (error: any) {
    console.error('\n[CLI] Falha durante a execução do Studio:', error.message);
    process.exit(1);
  }
}

main();
