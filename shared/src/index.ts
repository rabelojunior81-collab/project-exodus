/**
 * index.ts — Barrel do workspace `@project-exodus/shared` (Fase 2.6.1).
 *
 * Regra dura do workspace: ZERO dependências de runtime (sem Three.js,
 * sem ws, sem Node). Se precisa de qualquer um deles, não pertence aqui.
 */
export * from './protocol.js';
export * from './units.js';
export * from './economy.js';
export * from './world.js';
export * from './collision.js';
