/**
 * collision.ts — Wrapper do cliente (Fase 1.12.4): o resolvedor de colisão
 * agora vive em `@project-exodus/shared/collision` (fonte única cliente+servidor).
 *
 * Aqui fica apenas o que depende do heightmap local: a penalidade de declive.
 * Ver `docs/specs/03-colisao-e-obstaculos.md`.
 */
import { getTerrainHeight } from './terrainHeight.js';

export {
  CollisionWorld,
  BUILDING_COLLISION_RADIUS,
  NODE_COLLISION_RADIUS,
  UNIT_COLLISION_RADIUS,
  separateUnits,
} from '@project-exodus/shared/collision';
export type {
  CircleObstacle,
  ObstacleKind,
  MoveResult,
  SoftBodyLike,
  CollidableUnitType,
} from '@project-exodus/shared/collision';
export { clampToWorld as clampWorld } from '@project-exodus/shared/world';

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
