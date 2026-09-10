/**
 * props.ts — Biblioteca de props procedurais do cenário ("mundo denso").
 *
 * Cada família vira UM InstancedMesh (budget de draw calls); a distribuição
 * é 100% determinística via mulberry32 seedado — sem Math.random — para que
 * o cenário, os screenshots do harness e o overlay do minimapa sejam
 * reproduzíveis. Instâncias assentam em getTerrainHeight e respeitam as
 * zonas de exclusão (núcleo da base e veios de recurso).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { AssetMaterials } from './textures.js';
import { getTerrainHeight } from './terrainHeight.js';

// ---------------------------------------------------------------------------
// Seed e PRNG determinístico
// ---------------------------------------------------------------------------
export const WORLD_SEED = 0x5eed1;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Caps por família (total alvo ~250-400 instâncias somadas)
// ---------------------------------------------------------------------------
const WALL_RUIN_CAP = 40; // ruínas de parede (blocos de concreto parciais)
const COLUMN_CAP = 30; // pilares/colunas caídas
const VEHICLE_WRECK_CAP = 20; // destroços de veículos
const POLE_CAP = 40; // postes/antenas tombados
const STAKE_CAP = 40; // estacas de defesa / arame
const DEAD_TREE_CAP = 45; // árvores mortas
const BARREL_CAP = 40; // barris/aglomerados industriais (em clusters)
const HAZARD_SIGN_CAP = 25; // placas hazard verticais
const RUBBLE_CAP = 50; // escombros (substitui o antigo spawnEnvironmentKit)
const RUBBLE_BEAM_CAP = 35; // vigas metálicas sobre uma fração dos escombros

// Espelha as coordenadas dos veios em main.ts (que por sua vez espelham
// server/src/resources.ts). Manter as duas listas sincronizadas.
const VEIN_POSITIONS: ReadonlyArray<readonly [number, number]> = [
  [45, 10], [-40, 25], [-15, -55], [30, 45],
  [60, -25], [-60, -20], [10, 60], [-28, 48],
];
const VEIN_EXCLUSION_RADIUS = 8;
const CORE_EXCLUSION_RADIUS = 18;

export interface PropPlacement {
  x: number;
  z: number;
}

/** Círculo de colisão derivado de um prop sólido (Fase 1.12, spec 03). */
export interface PropCircle {
  x: number;
  z: number;
  radius: number;
}

export interface WorldProps {
  group: THREE.Group;
  positions: readonly PropPlacement[];
  /** Props sólidos (ruínas, colunas, destroços, árvores, barris, escombros). */
  obstacles: readonly PropCircle[];
  /** Quantidade de props num raio (m) ao redor do ponto — usado pelo minimapa. */
  sampleDensity(x: number, z: number, radius?: number): number;
}

type SpawnCheck = (x: number, z: number) => boolean;

function makeExclusionCheck(): SpawnCheck {
  return (x, z) => {
    if (Math.hypot(x, z) < CORE_EXCLUSION_RADIUS) return false;
    for (const [vx, vz] of VEIN_POSITIONS) {
      if (Math.hypot(x - vx, z - vz) < VEIN_EXCLUSION_RADIUS) return false;
    }
    return true;
  };
}

interface ScatterOptions {
  cap: number;
  half: number;
  rng: () => number;
  allowed: SpawnCheck;
}

/** Gera `cap` posições uniformes (rejeição nas zonas de exclusão). */
function scatter({ cap, half, rng, allowed }: ScatterOptions): PropPlacement[] {
  const out: PropPlacement[] = [];
  const maxTries = cap * 8;
  for (let tries = 0; tries < maxTries && out.length < cap; tries++) {
    const x = (rng() - 0.5) * half * 2;
    const z = (rng() - 0.5) * half * 2;
    if (allowed(x, z)) out.push({ x, z });
  }
  return out;
}

/** Posições de barris em pequenos aglomerados de 2-4 unidades. */
function scatterBarrelClusters(opts: ScatterOptions): PropPlacement[] {
  const { cap, rng } = opts;
  const centers = scatter({ ...opts, cap: Math.ceil(cap / 3) });
  const out: PropPlacement[] = [];
  for (const c of centers) {
    const count = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < count && out.length < cap; i++) {
      const a = rng() * Math.PI * 2;
      const r = rng() * 1.4;
      out.push({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Geometrias mescladas das famílias compostas
// ---------------------------------------------------------------------------
function buildVehicleWreckGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const hull = new THREE.BoxGeometry(3.2, 1.1, 1.8);
  hull.translate(0, 0.8, 0);
  parts.push(hull);

  const wheelOffsets: Array<[number, number]> = [
    [-1.1, -0.95], [1.1, -0.95], [-1.1, 0.95], [1.1, 0.95],
  ];
  for (const [wx, wz] of wheelOffsets) {
    const wheel = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 10);
    wheel.rotateX(Math.PI / 2);
    wheel.translate(wx, 0.45, wz);
    parts.push(wheel);
  }

  const turret = new THREE.BoxGeometry(1.2, 0.5, 1.1);
  turret.rotateZ(0.35);
  turret.translate(-0.4, 1.55, 0.1);
  parts.push(turret);

  return mergeGeometries(parts);
}

function buildStakeGeo(): THREE.BufferGeometry {
  const a = new THREE.CylinderGeometry(0.1, 0.13, 1.7, 6);
  a.rotateZ(0.6);
  a.translate(0, 0.65, 0);
  const b = new THREE.CylinderGeometry(0.1, 0.13, 1.7, 6);
  b.rotateZ(-0.6);
  b.translate(0, 0.65, 0);
  return mergeGeometries([a, b]);
}

function buildDeadTreeGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.1, 0.34, 3.4, 7);
  trunk.translate(0, 1.7, 0);
  parts.push(trunk);

  const branchSpecs: Array<[number, number, number, number]> = [
    // [altura no tronco, ângulo Y, inclinação, comprimento]
    [2.4, 0.4, 0.9, 1.3],
    [2.8, 2.4, 1.1, 1.1],
    [1.9, 4.4, 0.7, 0.9],
  ];
  for (const [baseY, yaw, tilt, len] of branchSpecs) {
    const branch = new THREE.CylinderGeometry(0.03, 0.07, len, 5);
    branch.translate(0, len / 2, 0);
    branch.rotateZ(tilt);
    branch.rotateY(yaw);
    branch.translate(0, baseY, 0);
    parts.push(branch);
  }
  return mergeGeometries(parts);
}

// ---------------------------------------------------------------------------
// Material local: madeira morta (escura, sem folhas)
// ---------------------------------------------------------------------------
const deadWoodMat = new THREE.MeshStandardMaterial({
  color: 0x2b2118,
  roughness: 0.95,
  metalness: 0.05,
});

// ---------------------------------------------------------------------------
// Instanciamento
// ---------------------------------------------------------------------------
interface InstanceTransform {
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
  /** Altura acima do relevo onde a instância assenta. */
  yOffset: number;
}

function buildFamily(
  parent: THREE.Group,
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  placements: PropPlacement[],
  makeTransform: (rng: () => number) => InstanceTransform,
  rng: () => number,
  castShadow: boolean,
  solidRadius?: (t: InstanceTransform) => number,
  solidOut?: PropCircle[]
): void {
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  mesh.name = name;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    const t = makeTransform(rng);
    dummy.position.set(p.x, getTerrainHeight(p.x, p.z) + t.yOffset, p.z);
    dummy.rotation.set(t.rx, t.ry, t.rz);
    dummy.scale.set(t.sx, t.sy, t.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (solidRadius !== undefined && solidOut !== undefined) {
      solidOut.push({ x: p.x, z: p.z, radius: solidRadius(t) });
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
}

const rand = (rng: () => number, min: number, max: number): number => min + rng() * (max - min);

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
export function spawnWorldProps(scene: THREE.Scene, mapSize: number): WorldProps {
  const rng = mulberry32(WORLD_SEED);
  const half = mapSize * 0.45;
  const allowed = makeExclusionCheck();
  const mats = AssetMaterials.getInstance();
  const group = new THREE.Group();
  group.name = 'WORLD_PROPS';

  const allPlacements: PropPlacement[] = [];
  const solidOut: PropCircle[] = [];
  const place = (family: PropPlacement[]): PropPlacement[] => {
    allPlacements.push(...family);
    return family;
  };

  // Ruínas de parede: blocos parciais, alguns tombados
  buildFamily(
    group, 'prop_wall_ruins',
    new THREE.BoxGeometry(2.6, 2.0, 0.7),
    mats.bunkerConcreteMat,
    place(scatter({ cap: WALL_RUIN_CAP, half, rng, allowed })),
    (r) => {
      const tipped = r() < 0.25;
      return {
        rx: tipped ? Math.PI / 2 + rand(r, -0.15, 0.15) : rand(r, -0.06, 0.06),
        ry: r() * Math.PI * 2,
        rz: rand(r, -0.1, 0.1),
        sx: rand(r, 0.6, 1.5),
        sy: rand(r, 0.3, 1.2),
        sz: rand(r, 0.9, 1.3),
        yOffset: tipped ? 0.45 : rand(r, 0.1, 0.5),
      };
    },
    rng, true,
    // Colisão (1.12): bloco 2.6×0.7 — círculo conservador 1,15·sx
    (t) => 1.15 * Math.max(t.sx, 1.0), solidOut
  );

  // Pilares caídos: cilindros deitados ou inclinados
  buildFamily(
    group, 'prop_fallen_columns',
    new THREE.CylinderGeometry(0.42, 0.52, 4.4, 10),
    mats.bunkerConcreteMat,
    place(scatter({ cap: COLUMN_CAP, half, rng, allowed })),
    (r) => {
      const fallen = r() < 0.7;
      return {
        rx: fallen ? rand(r, -0.06, 0.06) : rand(r, -0.25, 0.25),
        ry: fallen ? r() : r() * Math.PI * 2,
        rz: fallen ? Math.PI / 2 + rand(r, -0.08, 0.08) : rand(r, -0.25, 0.25),
        sx: rand(r, 0.8, 1.2),
        sy: rand(r, 0.5, 1.1),
        sz: rand(r, 0.8, 1.2),
        yOffset: fallen ? 0.5 : 1.6,
      };
    },
    rng, true,
    // Colisão (1.12): cilindro de 4,4 m de comprimento — raio médio 1,20·sx
    (t) => 1.2 * t.sx, solidOut
  );

  // Destroços de veículos: casco + rodas + torreta mesclados numa geometria
  buildFamily(
    group, 'prop_vehicle_wrecks',
    buildVehicleWreckGeo(),
    mats.rustedMetalMat,
    place(scatter({ cap: VEHICLE_WRECK_CAP, half, rng, allowed })),
    (r) => {
      const s = rand(r, 0.8, 1.25);
      return {
        rx: rand(r, -0.12, 0.12),
        ry: r() * Math.PI * 2,
        rz: rand(r, -0.22, 0.22),
        sx: s,
        sy: rand(r, 0.75, 1.0) * s,
        sz: s,
        yOffset: 0,
      };
    },
    rng, true,
    // Colisão (1.12): casco 3,2×1,8 — círculo 1,70·sx
    (t) => 1.7 * t.sx, solidOut
  );

  // Postes/antenas: finos e altos, parte caída a 90°
  buildFamily(
    group, 'prop_poles',
    new THREE.CylinderGeometry(0.09, 0.14, 6.5, 8),
    mats.darkSteelMat,
    place(scatter({ cap: POLE_CAP, half, rng, allowed })),
    (r) => {
      const fallen = r() < 0.35;
      return {
        rx: fallen ? rand(r, -0.04, 0.04) : rand(r, -0.12, 0.12),
        ry: fallen ? r() : r() * Math.PI * 2,
        rz: fallen ? Math.PI / 2 + rand(r, -0.1, 0.1) : rand(r, -0.12, 0.12),
        sx: rand(r, 0.8, 1.3),
        sy: rand(r, 0.6, 1.15),
        sz: rand(r, 0.8, 1.3),
        yOffset: fallen ? 0.15 : 3.0,
      };
    },
    rng, false
  );

  // Estacas de defesa / arame cruzado
  buildFamily(
    group, 'prop_stakes',
    buildStakeGeo(),
    mats.rustedMetalMat,
    place(scatter({ cap: STAKE_CAP, half, rng, allowed })),
    (r) => {
      const s = rand(r, 0.8, 1.3);
      return {
        rx: rand(r, -0.08, 0.08),
        ry: r() * Math.PI * 2,
        rz: rand(r, -0.08, 0.08),
        sx: s,
        sy: rand(r, 0.7, 1.2),
        sz: s,
        yOffset: 0,
      };
    },
    rng, false
  );

  // Árvores mortas: tronco cônico + galhos, sem folhas
  buildFamily(
    group, 'prop_dead_trees',
    buildDeadTreeGeo(),
    deadWoodMat,
    place(scatter({ cap: DEAD_TREE_CAP, half, rng, allowed })),
    (r) => {
      const s = rand(r, 0.7, 1.6);
      return {
        rx: rand(r, -0.1, 0.1),
        ry: r() * Math.PI * 2,
        rz: rand(r, -0.1, 0.1),
        sx: s,
        sy: rand(r, 0.8, 1.4),
        sz: s,
        yOffset: 0,
      };
    },
    rng, false,
    // Colisão (1.12): tronco (r 0,34) + galhos — círculo 0,55·sx
    (t) => 0.55 * t.sx, solidOut
  );

  // Barris industriais em pequenos aglomerados
  buildFamily(
    group, 'prop_barrels',
    new THREE.CylinderGeometry(0.5, 0.5, 1.4, 12),
    mats.rustedMetalMat,
    place(scatterBarrelClusters({ cap: BARREL_CAP, half, rng, allowed })),
    (r) => {
      const onSide = r() < 0.2;
      return {
        rx: onSide ? Math.PI / 2 + rand(r, -0.1, 0.1) : rand(r, -0.08, 0.08),
        ry: r() * Math.PI * 2,
        rz: onSide ? 0 : rand(r, -0.08, 0.08),
        sx: rand(r, 0.85, 1.15),
        sy: rand(r, 0.8, 1.2),
        sz: rand(r, 0.85, 1.15),
        yOffset: onSide ? 0.5 : 0.7,
      };
    },
    rng, false,
    // Colisão (1.12): barril r 0,5 — círculo 0,60·sx
    (t) => 0.6 * t.sx, solidOut
  );

  // Placas de sinalização hazard, verticais
  buildFamily(
    group, 'prop_hazard_signs',
    new THREE.BoxGeometry(1.1, 1.4, 0.08),
    mats.hazardStripeMat,
    place(scatter({ cap: HAZARD_SIGN_CAP, half, rng, allowed })),
    (r) => ({
      rx: 0,
      ry: r() * Math.PI * 2,
      rz: rand(r, -0.15, 0.15),
      sx: rand(r, 0.8, 1.4),
      sy: rand(r, 0.8, 1.4),
      sz: 1,
      yOffset: rand(r, 0.9, 1.3),
    }),
    rng, false
  );

  // Escombros de concreto (sucessor do spawnEnvironmentKit)
  const rubblePlacements = place(scatter({ cap: RUBBLE_CAP, half, rng, allowed }));
  buildFamily(
    group, 'prop_rubble_blocks',
    new THREE.BoxGeometry(2.4, 1.2, 2.4),
    mats.bunkerConcreteMat,
    rubblePlacements,
    (r) => ({
      rx: rand(r, -0.06, 0.06),
      ry: r() * Math.PI,
      rz: rand(r, -0.15, 0.15),
      sx: rand(r, 1.0, 1.6),
      sy: rand(r, 0.5, 1.3),
      sz: rand(r, 1.0, 1.5),
      yOffset: rand(r, 0.15, 0.45),
    }),
    rng, true,
    // Colisão (1.12): bloco 2,4×2,4 — círculo 1,25·sx
    (t) => 1.25 * t.sx, solidOut
  );

  // Vigas metálicas retorcidas sobre parte dos escombros
  const beamPlacements = rubblePlacements.slice(0, RUBBLE_BEAM_CAP);
  allPlacements.push(...beamPlacements);
  buildFamily(
    group, 'prop_rubble_beams',
    new THREE.BoxGeometry(0.35, 4.5, 0.35),
    mats.rustedMetalMat,
    beamPlacements,
    (r) => ({
      rx: rand(r, -0.1, 0.1),
      ry: r() * Math.PI,
      rz: Math.PI / 4 + rand(r, -0.25, 0.25),
      sx: 1,
      sy: rand(r, 0.8, 1.5),
      sz: 1,
      yOffset: rand(r, 1.2, 1.9),
    }),
    rng, false
  );

  scene.add(group);

  const positions: readonly PropPlacement[] = allPlacements;
  return {
    group,
    positions,
    obstacles: solidOut,
    sampleDensity(x: number, z: number, radius = 3): number {
      const r2 = radius * radius;
      let count = 0;
      for (const p of positions) {
        const dx = p.x - x;
        const dz = p.z - z;
        if (dx * dx + dz * dz <= r2) count++;
      }
      return count;
    },
  };
}
