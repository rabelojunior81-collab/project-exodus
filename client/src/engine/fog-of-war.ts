/**
 * fog-of-war.ts — Fog of War client-side (exploração do mapa).
 *
 * Grade 90×90 de células de 2m cobrindo o mundo 180×180 (mesmo passo do
 * grid do server — migração autoritativa futura). Estados por célula:
 *   0 = desconhecido (nunca visto)
 *   1 = explorado (já visto, fora de visão atual — persistente)
 *   2 = visível agora
 *
 * A grade lógica é Uint8Array; para render, os estados viram uma rampa
 * (0.0 desconhecido / 0.5 explorado / 1.0 visível) com blur 3×3 nas bordas
 * e sobem como DataTexture lida pelo shader do plano de shroud.
 *
 * TODO(Fase 3/5): ocultação de unidades/prédios hostis sob o véu. Hoje só
 * existem entidades do jogador — o shroud cobre o mundo, não esconde inimigos.
 */
import * as THREE from 'three';

/** Rios de visão por tipo (metros), consumidos por unit.ts / building.ts. */
export const SIGHT_RADII = {
  SCAVENGER_WORKER: 10,
  RUST_RAIDER: 14,
  SCRAP_BUGGY: 12,
  MAINTENANCE_DRONE: 10,
  BIPED_MECH: 14,
  BUILDING: 16,
} as const;

const GRID_CELLS = 90; // 90 células × 2m = 180m de mundo
const CELL_SIZE = 2;
const UPDATE_INTERVAL_MS = 250;

// Rampa de render: desconhecido → véu → visível
const V_UNKNOWN = 0;
const V_EXPLORED = 0.5;
const V_VISIBLE = 1;

export interface VisionSource {
  x: number;
  z: number;
  sightRadius: number;
}

export class FogOfWar {
  /** 0 desconhecido · 1 explorado · 2 visível. idx = gz * GRID_CELLS + gx. */
  public readonly state: Uint8Array;
  public readonly shroud: THREE.Mesh;

  private readonly half: number;
  private readonly visibleNow: Uint8Array;
  private readonly renderGrid: Float32Array;
  private readonly blurScratch: Float32Array;
  private readonly texData: Uint8Array;
  private readonly texture: THREE.DataTexture;
  private lastUpdate = -Infinity;

  constructor(mapSize: number = 180) {
    this.half = mapSize / 2;
    const n = GRID_CELLS * GRID_CELLS;
    this.state = new Uint8Array(n);
    this.visibleNow = new Uint8Array(n);
    this.renderGrid = new Float32Array(n);
    this.blurScratch = new Float32Array(n);

    this.texData = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) this.texData[i * 4 + 3] = 255;
    this.texture = new THREE.DataTexture(
      this.texData,
      GRID_CELLS,
      GRID_CELLS,
      THREE.RGBAFormat
    );
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;

    const geo = new THREE.PlaneGeometry(mapSize, mapSize);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false,
      uniforms: {
        uFog: { value: this.texture },
        uMapSize: { value: mapSize },
        uTint: { value: new THREE.Color(0x0a0d12) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uFog;
        uniform float uMapSize;
        uniform vec3 uTint;
        varying vec3 vWorldPos;
        void main() {
          vec2 uv = (vWorldPos.xz + uMapSize * 0.5) / uMapSize;
          float v = texture2D(uFog, uv).r;
          // Desconhecido (0) → 0.92 quase opaco; explorado (0.5) → véu 0.45;
          // visível (1) → transparente. Rampas suaves nos dois trechos.
          float alpha = v < 0.5
            ? mix(0.92, 0.45, smoothstep(0.0, 0.5, v))
            : mix(0.45, 0.0, smoothstep(0.5, 1.0, v));
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(uTint, alpha);
        }
      `,
    });

    // Plano acima do ponto mais alto do relevo+coberturas (~7m): sem clipping
    // com o terreno; corta prédios altos apenas onde o shroud é opaco.
    this.shroud = new THREE.Mesh(geo, mat);
    this.shroud.position.y = 7.0;
    this.shroud.renderOrder = 20;
    this.shroud.castShadow = false;
    this.shroud.receiveShadow = false;
    // Nunca captura raycasts de seleção/ordens
    this.shroud.raycast = () => undefined;
    this.shroud.name = 'FOG_OF_WAR_SHROUD';
  }

  private toCell(v: number): number {
    return THREE.MathUtils.clamp(Math.floor((v + this.half) / CELL_SIZE), 0, GRID_CELLS - 1);
  }

  public isVisibleAt(x: number, z: number): boolean {
    return this.state[this.toCell(z) * GRID_CELLS + this.toCell(x)] === 2;
  }

  public isExploredAt(x: number, z: number): boolean {
    return this.state[this.toCell(z) * GRID_CELLS + this.toCell(x)] > 0;
  }

  /**
   * Recalcula a grade a partir das fontes de visão. Explorado é persistente
   * (nunca volta a 0). Throttle interno de ~250ms; retorna true quando a
   * grade mudou de fato (para o minimapa atualizar seu overlay).
   */
  public update(sources: VisionSource[], force = false): boolean {
    const now = performance.now();
    if (!force && now - this.lastUpdate < UPDATE_INTERVAL_MS) return false;
    this.lastUpdate = now;

    this.visibleNow.fill(0);
    for (const s of sources) {
      const cx = this.toCell(s.x);
      const cz = this.toCell(s.z);
      const cellR = s.sightRadius / CELL_SIZE;
      const r2 = s.sightRadius * s.sightRadius;
      const minG = Math.max(0, Math.floor(cx - cellR));
      const maxG = Math.min(GRID_CELLS - 1, Math.ceil(cx + cellR));
      const minZ = Math.max(0, Math.floor(cz - cellR));
      const maxZ = Math.min(GRID_CELLS - 1, Math.ceil(cz + cellR));
      for (let gz = minZ; gz <= maxZ; gz++) {
        const wz = gz * CELL_SIZE + CELL_SIZE / 2 - this.half;
        const dz = wz - s.z;
        for (let gx = minG; gx <= maxG; gx++) {
          const wx = gx * CELL_SIZE + CELL_SIZE / 2 - this.half;
          const dx = wx - s.x;
          if (dx * dx + dz * dz <= r2) {
            this.visibleNow[gz * GRID_CELLS + gx] = 1;
          }
        }
      }
    }

    let logicChanged = false;
    for (let i = 0; i < this.state.length; i++) {
      if (this.visibleNow[i] === 1) {
        if (this.state[i] !== 2) {
          this.state[i] = 2;
          logicChanged = true;
        }
        this.renderGrid[i] = V_VISIBLE;
      } else if (this.state[i] === 2) {
        this.state[i] = 1;
        this.renderGrid[i] = V_EXPLORED;
        logicChanged = true;
      } else if (this.state[i] === 1) {
        this.renderGrid[i] = V_EXPLORED;
      } else {
        this.renderGrid[i] = V_UNKNOWN;
      }
    }

    // Blur 3×3 leve na rampa de render (suaviza as bordas do shroud)
    for (let gz = 0; gz < GRID_CELLS; gz++) {
      for (let gx = 0; gx < GRID_CELLS; gx++) {
        let sum = 0;
        let count = 0;
        for (let dz = -1; dz <= 1; dz++) {
          const zz = gz + dz;
          if (zz < 0 || zz >= GRID_CELLS) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = gx + dx;
            if (xx < 0 || xx >= GRID_CELLS) continue;
            sum += this.renderGrid[zz * GRID_CELLS + xx];
            count++;
          }
        }
        this.blurScratch[gz * GRID_CELLS + gx] = sum / count;
      }
    }
    this.renderGrid.set(this.blurScratch);

    for (let i = 0; i < this.state.length; i++) {
      this.texData[i * 4] = Math.round(this.renderGrid[i] * 255);
    }
    this.texture.needsUpdate = true;
    return logicChanged;
  }
}
