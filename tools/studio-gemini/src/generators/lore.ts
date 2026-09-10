import { GeminiStudioClient } from '../client.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EraLore {
  eraId: number;
  eraName: string;
  historicalLogDate: string;
  author: string;
  radioTranscript: string;
  historicalContext: string;
  technologicalBreakthrough: string;
}

export class LoreGenerator {
  private client: GeminiStudioClient;
  private outputDir: string;

  constructor(client: GeminiStudioClient) {
    this.client = client;
    // Resolve caminho relativo robusto até a pasta client/public/assets/lore
    const candidatePaths = [
      path.resolve(process.cwd(), 'client/public/assets/lore'),
      path.resolve(__dirname, '../../../client/public/assets/lore'),
      path.resolve(__dirname, '../../../../client/public/assets/lore')
    ];
    this.outputDir = candidatePaths.find(p => fs.existsSync(path.dirname(p))) || candidatePaths[0];
  }

  public async generateEraLore(eraId: number, eraName: string): Promise<EraLore> {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const targetFile = path.join(this.outputDir, `era_${eraId}_lore.json`);

    // Se já estiver em cache no disco, não gasta requisição
    if (fs.existsSync(targetFile)) {
      console.log(`[LoreGenerator] Carregando Era ${eraId} do cache em disco: ${targetFile}`);
      const cached = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
      return cached;
    }

    console.log(`[LoreGenerator] Gerando nova crônica para ${eraName} via Gemini API...`);

    const prompt = `Você é o roteirista-chefe do RTS "Project Exodus". A humanidade está se recuperando de um apocalipse onde as IAs rebeldes entraram em colapso e destruíram as infraestruturas globais, forçando o retorno da humanidade à idade da pedra tecnológica.
Gere um registro militar/arqueológico para a Era ${eraId}: "${eraName}".
Responda EXCLUSIVAMENTE em formato JSON com as seguintes chaves:
{
  "eraId": ${eraId},
  "eraName": "${eraName}",
  "historicalLogDate": "Data fictícia após a queda (ex: Ano 42 P.C. - Pós-Colapso)",
  "author": "Nome e patente do remetente (ex: Dra. Elena Ramos, Comandante Miller, Operador de Rádio Jack)",
  "radioTranscript": "Mensagem curta de rádio com estática e dramatismo narrativo (máximo 3 frases)",
  "historicalContext": "Breve explicação histórica sobre o que as IAs fizeram nessa fase do colapso e o que a humanidade descobriu nos escombros",
  "technologicalBreakthrough": "O principal salto técnico desta era (ex: refino de sucata, motores a vapor, chips reaproveitados)"
}`;

    const rawJson = await this.client.generateText(prompt);
    
    // Limpeza de possíveis blocos markdown do json ```json ... ```
    const cleanedJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const loreData: EraLore = JSON.parse(cleanedJson);

    fs.writeFileSync(targetFile, JSON.stringify(loreData, null, 2), 'utf-8');
    console.log(`[LoreGenerator] Salvo com sucesso em: ${targetFile}`);

    return loreData;
  }
}
