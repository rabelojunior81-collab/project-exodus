/**
 * collision.ts — Física de colisão 2D (plano XZ) do cliente — Fase 1.12.
 *
 * Ver `docs/specs/03-colisao-e-obstaculos.md`. Regras centrais:
 * - Obstáculos são círculos conservadores; resposta é projetar para fora em
 *   passos ≤ 0,5 m (anti-tunneling) com até 2 iterações por passo.
 * - O deslize EMERGE da projeção; a tangente explícita é usada apenas para a
 *   intenção (desvio frontal), decidida de forma determinística.
 * - Sem RNG, sem Date.now: seguro para virar código compartilhado em 2.6.3.
 */
import { getTerrainHeight } from './terrainHeight.js';

export type ObstacleKind = 'building' | 'node' | 'prop';

export interface CircleObstacle {
  x: number;
  z: number;
  radius: number;
  kind: ObstacleKind;
  id?: string;
}

/** Raio de colisão por construção — espelha `BUILDING_RADIUS` do servidor. */
export const BUILDING_COLLISION_RADIUS: Record<string, number> = {
  COMMAND_CENTER: 8,
  SCRAP_REFINERY: 6,
  BUNKER_TURRET: 4.5,
};

/** Raio de colisão dos veios (anel visual do veio: 2,6–3,0). */
export const NODE_COLLISION_RADIUS = 2.4;

/**
 * Raio físico por tipo de unidade (distinto do `selectionRadius`, que é o
 * raio generoso de CLIQUE do RTS). Mantido em sincronia manual até a 2.6.3.
 */
export const UNIT_COLLISION_RADIUS = {
  SCAVENGER_WORKER: 0.7,
  RUST_RAIDER: 0.75,
  MAINTENANCE_DRONE: 0.7,
  BIPED_MECH: 1.6,
  SCRAP_BUGGY: 2.0,
} as const;

export type CollidableUnitType = keyof typeof UNIT_COLLISION_RADIUS;

/** Metade útil do mundo (mapa 180 m; margem de 2 m). */
export const WORLD_HALF = 88;

export function clampWorld(v: number): number {
  if (v < -WORLD_HALF) return -WORLD_HALF;
  if (v > WORLD_HALF) return WORLD_HALF;
  return v;
}

export interface MoveResult {
  x: number;
  z: number;
  blocked: boolean;
  /** Normal acumulada da correção (unidade), ou (0,0) se não houve contato. */
  nx: number;
  nz: number;
}

/** Máximo de sub-passos por movimento (anti-tunneling). */
const MAX_STEP = 0.5;
/** Iterações de projeção por sub-passo (cantos entre círculos). */
const PROJECTION_ITERATIONS = 2;

export class CollisionWorld {
  private obstacles: CircleObstacle[] = [];

  public setObstacles(list: readonly CircleObstacle[]): void {
    this.obstacles = list.map((o) => ({ ...o }));
  }

  public addObstacle(o: CircleObstacle): void {
    this.obstacles.push({ ...o });
  }

  public list(): readonly CircleObstacle[] {
    return this.obstacles;
  }

  public get size(): number {
    return this.obstacles.length;
  }

  /** true se (x,z) está dentro de algum obstáculo (+ raio do agente). */
  public isPointBlocked(x: number, z: number, agentRadius: number): boolean {
    for (const o of this.obstacles) {
      const rr = o.radius + agentRadius;
      const dx = x - o.x;
      const dz = z - o.z;
      if (dx * dx + dz * dz < rr * rr) return true;
    }
    return false;
  }

  /**
   * Projeta um destino para fora dos obstáculos (usado por `moveTo` quando o
   * ponto pedido está dentro de um círculo — a unidade para ENCOSTADA).
   */
  public resolveTarget(x: number, z: number, agentRadius: number): { x: number; z: number } {
    let px = clampWorld(x);
    let pz = clampWorld(z);
    for (let iter = 0; iter < PROJECTION_ITERATIONS; iter++) {
      let moved = false;
      for (const o of this.obstacles) {
        const rr = o.radius + agentRadius + 0.1;
        const dx = px - o.x;
        const dz = pz - o.z;
        const d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2);
        if (d < 1e-6) {
          // Ponto exatamente no centro: empurra no +X (determinístico).
          px = o.x + rr;
        } else {
          px = o.x + (dx / d) * rr;
          pz = o.z + (dz / d) * rr;
        }
        moved = true;
      }
      if (!moved) break;
    }
    return { x: clampWorld(px), z: clampWorld(pz) };
  }

  /**
   * Resolve um movimento de (fromX,fromZ) até (toX,toZ) para um agente de
   * raio `radius`. Retorna a posição corrigida e se houve contato.
   */
  public resolveMove(
    fromX: number, fromZ: number,
    toX: number, toZ: number,
    radius: number,
  ): MoveResult {
    const totalDx = toX - fromX;
    const totalDz = toZ - fromZ;
    const dist = Math.hypot(totalDx, totalDz);
    const steps = Math.max(1, Math.ceil(dist / MAX_STEP));
    const stepX = totalDx / steps;
    const stepZ = totalDz / steps;

    let x = fromX;
    let z = fromZ;
    let blocked = false;
    let nx = 0;
    let nz = 0;

    for (let s = 0; s < steps; s++) {
      let px = x + stepX;
      let pz = z + stepZ;
      for (let iter = 0; iter < PROJECTION_ITERATIONS; iter++) {
        let moved = false;
        for (const o of this.obstacles) {
          const rr = o.radius + radius;
          const dx = px - o.x;
          const dz = pz - o.z;
          // Broadphase barato antes do sqrt.
          if (dx > rr || dx < -rr || dz > rr || dz < -rr) continue;
          const d2 = dx * dx + dz * dz;
          if (d2 >= rr * rr) continue;
          const d = Math.sqrt(d2);
          let ux: number;
          let uz: number;
          let push: number;
          if (d < 1e-6) {
            ux = 1; uz = 0; push = rr;
          } else {
            ux = dx / d; uz = dz / d; push = rr - d + 1e-3;
          }
          px += ux * push;
          pz += uz * push;
          nx += ux * push;
          nz += uz * push;
          blocked = true;
          moved = true;
        }
        if (!moved) break;
      }
      x = px;
      z = pz;
    }

    const cx = clampWorld(x);
    const cz = clampWorld(z);
    if (cx !== x || cz !== z) {
      blocked = true;
      nx += cx - x;
      nz += cz - z;
      x = cx;
      z = cz;
    }

    const len = Math.hypot(nx, nz);
    return {
      x,
      z,
      blocked,
      nx: len > 1e-6 ? nx / len : 0,
      nz: len > 1e-6 ? nz / len : 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Separação unidade × unidade (soft-body determinístico)
// ---------------------------------------------------------------------------

export interface SoftBodyLike {
  id: string;
  x: number;
  z: number;
  radius: number;
  offset(dx: number, dz: number): void;
}

/**
 * Empurra pares sobrepostos meio-a-meio. Iterado para estabilizar cadeias.
 * Ordem por id garante resultado repetível (sem RNG).
 */
export function separateUnits(bodies: SoftBodyLike[], iterations = 2): void {
  if (bodies.length < 2) return;
  const sorted = [...bodies].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const rSum = a.radius + b.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= rSum * rSum || d2 < 1e-9) continue;
        const d = Math.sqrt(d2);
        const push = (rSum - d) * 0.5;
        const ux = dx / d;
        const uz = dz / d;
        const ax = -ux * push;
        const az = -uz * push;
        const bx = ux * push;
        const bz = uz * push;
        a.offset(ax, az);
        b.offset(bx, bz);
        a.x += ax; a.z += az;
        b.x += bx; b.z += bz;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Terreno
// ---------------------------------------------------------------------------

/**
 * Fator de velocidade pelo declive local (amostra central a ±0,75 m).
 * Platô e dunas suaves ≈ 1,00; crateras e bordas íngremes ≈ 0,60–0,75.
 */
export function slopeSpeedFactor(x: number, z: number): number {
  const s = 0.75;
  const gx = (getTerrainHeight(x + s, z) - getTerrainHeight(x - s, z)) / (2 * s);
  const gz = (getTerrainHeight(x, z + s) - getTerrainHeight(x, z - s)) / (2 * s);
  const slope = Math.hypot(gx, gz);
  return 1 / (1 + 1.1 * slope);
}
