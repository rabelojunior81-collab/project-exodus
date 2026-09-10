import { defineConfig } from 'vite';

// CRIT-02 — carimbo de build honesto.
// O carimbo anterior (`document.lastModified` em main.ts) exibia a hora do
// teste, porque o Vite não emite header `Last-Modified`. Esta constante é
// injetada no bundle em tempo de build e NÃO muda ao recarregar a página —
// o gate negativo que faltava na 1.9.4.
const stampParts = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
}).formatToParts(new Date());
const pick = (type: string): string =>
  stampParts.find((p) => p.type === type)?.value ?? '??';
const buildStamp = `${pick('day')}/${pick('month')} ${pick('hour')}:${pick('minute')}`;

export default defineConfig({
  define: {
    __BUILD_STAMP__: JSON.stringify(buildStamp)
  },
  server: {
    host: true, // Habilita acesso na rede local e Tailscale (0.0.0.0)
    port: 5173,
    strictPort: true
  },
  build: {
    target: 'esnext'
  }
});
