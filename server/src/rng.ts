/**
 * rng.ts — Gerador pseudo-aleatório seedável (mulberry32).
 *
 * REGRA DE DETERMINISMO (Fase 2): nenhum `Math.random` na simulação.
 * Todo sorteio do servidor autoritativo passa por uma instância criada
 * aqui, com seed explícita, de modo que duas partidas com mesma seed e
 * mesmos comandos produzem snapshots idênticos tick a tick.
 */

/** Função de sorteio: retorna float em [0, 1). */
export type Rng = () => number;

/**
 * Cria um RNG mulberry32 a partir de uma seed inteira de 32 bits.
 * Sequência 100% determinística por seed (puro: sem Date.now/Math.random).
 */
export function createRng(seed: number): Rng {
  let a: number = seed >>> 0;
  return (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t: number = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Converte string arbitrária em seed de 32 bits (FNV-1a). Puro. */
export function hashSeed(text: string): number {
  let h: number = 0x811c9dc5;
  for (let i: number = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Float em [min, max) usando o rng fornecido. Puro. */
export function randRange(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Inteiro em [min, max] (inclusive) usando o rng fornecido. Puro. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Escolhe um elemento do array usando o rng fornecido. Puro. */
export function pickFrom<T>(rng: Rng, items: ReadonlyArray<T>): T {
  if (items.length === 0) throw new Error('[rng] pickFrom: array vazio');
  return items[Math.floor(rng() * items.length)];
}
