/**
 * collision.ts — Física de colisão 2D (plano XZ) — FONTE ÚNICA (Fase 1.12.4).
 *
 * Consumido por cliente e servidor (spec 03 + D-2.6-C). Regras centrais:
 * - Obstáculos são círculos conservadores; resposta é projetar para fora em
 *   passos ≤ 0,5 m (anti-tunneling) com até 2 iterações por passo.
 * - O deslize EMERGE da projeção; a tangente explícita é usada apenas para a
 *   intenção (desvio frontal no cliente).
 * - Sem RNG, sem Date.now, sem dependências de runtime (three/ws/node).
 *
 * Terreno (declive) é específico do cliente (depende do heightmap) e fica lá.
 */
import { BUILDING_STATS, UNIT_STATS } from './units.js';
import { NODE_COLLISION_RADIUS, clampToWorld } from './world.js';

export type ObstacleKind = 'building' | 'node' | 'prop';

export interface CircleObstacle {
  x: number;
  z: number;
  radius: number;
  kind: ObstacleKind;
  id?: string;
}

/** Raio de colisão por construção — derivado do shared (unit stats). */
export const BUILDING_COLLISION_RADIUS: Record<string, number> = {
  COMMAND_CENTER: BUILDING_STATS.COMMAND_CENTER.collisionRadius,
  SCRAP_REFINERY: BUILDING_STATS.SCRAP_REFINERY.collisionRadius,
  BUNKER_TURRET: BUILDING_STATS.BUNKER_TURRET.collisionRadius,
};

/** Raio de colisão dos veios — fonte única no shared/world. */
export { NODE_COLLISION_RADIUS };

/** Raio físico por tipo — derivado do shared (spec 03). */
export const UNIT_COLLISION_RADIUS = {
  SCAVENGER_WORKER: UNIT_STATS.SCAVENGER_WORKER.collisionRadius,
  RUST_RAIDER: UNIT_STATS.RUST_RAIDER.collisionRadius,
  MAINTENANCE_DRONE: UNIT_STATS.MAINTENANCE_DRONE.collisionRadius,
  BIPED_MECH: UNIT_STATS.BIPED_MECH.collisionRadius,
  SCRAP_BUGGY: UNIT_STATS.SCRAP_BUGGY.collisionRadius,
} as const;

export type CollidableUnitType = keyof typeof UNIT_COLLISION_RADIUS;

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
    let px = clampToWorld(x);
    let pz = clampToWorld(z);
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
    return { x: clampToWorld(px), z: clampToWorld(pz) };
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

    const cx = clampToWorld(x);
    const cz = clampToWorld(z);
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
