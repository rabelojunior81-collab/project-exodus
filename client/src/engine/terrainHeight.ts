/**
 * terrainHeight.ts — Função analítica única de altura do terreno.
 *
 * A malha do terreno (`terrain.ts`) é um PlaneGeometry rotacionado
 * `rotation.x = -PI/2`, logo: mundoX = localX, mundoZ = -localY.
 * `heightAtLocal` reproduz EXATAMENTE a fórmula usada na geração da
 * geometria; `getTerrainHeight` é a interface em coordenadas de mundo
 * para entidades, seleção e efeitos visuais (assentar unidades e
 * waypoints sobre o relevo em vez de flutuar/enterrar em y=0).
 */
function smoothstep(v: number, edge0: number, edge1: number): number {
  const t = Math.min(1, Math.max(0, (v - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function heightAtLocal(x: number, y: number): number {
  // Relevo orgânico com colinas, valas e crateras (idêntico a terrain.ts)
  let height =
    Math.sin(x * 0.04) * Math.cos(y * 0.04) * 2.2 +
    Math.sin(x * 0.09 + y * 0.07) * 0.8 +
    Math.cos(x * 0.02 - y * 0.03) * 1.5;

  // Crateras de impacto de bombas no deserto
  const crater1 = Math.hypot(x - 25, y - 20);
  if (crater1 < 12) {
    height -= (12 - crater1) * 0.35;
  }
  const crater2 = Math.hypot(x + 30, y + 15);
  if (crater2 < 10) {
    height -= (10 - crater2) * 0.4;
  }

  // Crateras menores de artilharia/leixões na periferia (mundo: (62,48) e (-58,-42))
  const crater3 = Math.hypot(x - 62, y + 48);
  if (crater3 < 6) {
    height -= (6 - crater3) * 0.28;
  }
  const crater4 = Math.hypot(x + 58, y - 42);
  if (crater4 < 7) {
    height -= (7 - crater4) * 0.25;
  }

  // Faixa de dunas suaves na região leste do mapa (mundo: x > ~45)
  const duneMask = smoothstep(x, 45, 60);
  if (duneMask > 0) {
    height += Math.sin(y * 0.12 + x * 0.02) * 0.8 * duneMask;
  }

  // Platô militar plano na base inicial (elimina clipping no núcleo do jogo)
  const dist = Math.hypot(x, y);
  if (dist < 30) {
    height = 0;
  } else if (dist < 45) {
    const t = (dist - 30) / 15;
    height *= t * t * (3 - 2 * t); // smoothstep
  }

  return height;
}

/** Altura do terreno em coordenadas de mundo (x, z). */
export function getTerrainHeight(worldX: number, worldZ: number): number {
  return heightAtLocal(worldX, -worldZ);
}
