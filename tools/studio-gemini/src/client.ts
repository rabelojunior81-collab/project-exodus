import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const possibleEnvPaths = [
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../.env'),
  resolve(__dirname, '../../../../.env')
];

for (const p of possibleEnvPaths) {
  dotenv.config({ path: p });
  if (process.env.GEMINI_API_KEY) break;
}

const DEFAULT_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash';
const API_BASE_URL = process.env.GEMINI_API_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta';

export interface TokenUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export class GeminiStudioClient {
  private apiKey: string;
  private baseUrl: string;
  private textModel: string;

  constructor(key?: string) {
    this.apiKey = key || process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Chave GEMINI_API_KEY obrigatória para instanciar GeminiStudioClient.');
    }
    this.baseUrl = API_BASE_URL;
    this.textModel = DEFAULT_TEXT_MODEL;
  }

  public getTextModel(): string {
    return this.textModel;
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    attempt = 1,
    maxAttempts = 3
  ): Promise<Response> {
    const signal = AbortSignal.timeout(30000);
    try {
      const response = await fetch(url, { ...init, signal });
      if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
        const delayMs = Math.min(1000 * 2 ** attempt, 16000);
        console.warn(`[GeminiClient] HTTP ${response.status} na tentativa ${attempt}; retry em ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
        return this.fetchWithRetry(url, init, attempt + 1, maxAttempts);
      }
      return response;
    } catch (err: any) {
      if (attempt < maxAttempts && err?.name !== 'AbortError') {
        const delayMs = Math.min(1000 * 2 ** attempt, 16000);
        console.warn(`[GeminiClient] Erro de rede na tentativa ${attempt}; retry em ${delayMs}ms...`);
        await new Promise((r) => setTimeout(r, delayMs));
        return this.fetchWithRetry(url, init, attempt + 1, maxAttempts);
      }
      throw err;
    }
  }

  private logUsage(data: { usageMetadata?: TokenUsage }): void {
    const u = data.usageMetadata;
    if (!u) return;
    const total = u.totalTokenCount ?? 0;
    if (total > 0) {
      const costUsd = total * 0.00000125;
      console.log(`[GeminiClient] tokens=${total} (in=${u.promptTokenCount ?? 0}, out=${u.candidatesTokenCount ?? 0}) custo_est~$${costUsd.toFixed(6)}`);
    }
  }

  public async generateText(prompt: string, model?: string): Promise<string> {
    const resolvedModel = model || this.textModel;
    const url = `${this.baseUrl}/models/${resolvedModel}:generateContent`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[Gemini API Error] HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    this.logUsage(data);
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('[Gemini API Error] Nenhuma resposta de texto retornada pelo modelo.');
    }

    return text;
  }

  public async generateInlineData(
    prompt: string,
    model: string,
    generationConfig: Record<string, unknown>
  ): Promise<{ mimeType: string; data: string; usage?: TokenUsage }> {
    const url = `${this.baseUrl}/models/${model}:generateContent`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[Gemini API Error] HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    this.logUsage(data);
    const parts = data.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) {
      throw new Error('[Gemini API Error] Resposta sem parts.');
    }
    const inline = parts.find((p: any) => p.inlineData);
    if (!inline?.inlineData?.data) {
      throw new Error('[Gemini API Error] Nenhum inlineData retornado.');
    }
    return {
      mimeType: inline.inlineData.mimeType as string,
      data: inline.inlineData.data as string,
      usage: data.usageMetadata
    };
  }

  public async testConnectivity(): Promise<{ success: boolean; model: string; responseSnippet: string }> {
    const response = await this.generateText('Responda estritamente com: "CONECTIVIDADE_CONFIRMADA_RABELUS_LAB"', this.textModel);
    return {
      success: response.includes('CONECTIVIDADE_CONFIRMADA_RABELUS_LAB'),
      model: this.textModel,
      responseSnippet: response.trim()
    };
  }
}
