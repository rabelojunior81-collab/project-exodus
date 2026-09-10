/**
 * particles.ts — FX leves de partícula/texto flutuante (pool fixo, sem deps).
 *
 * Um único THREE.Points com pool de 256 partículas recicladas cobre bursts
 * (entrega de recursos) e emissores contínuos (faíscas de veio trabalhado).
 * Textos flutuantes (+10 SUCATA) usam um pool pequeno de sprites de canvas
 * que sobem e desvanecem.
 */
import * as THREE from 'three';

const MAX_PARTICLES = 256;
const MAX_FLOATERS = 12;
const GRAVEYARD_Y = -9999; // partícula morta estaciona fora do mundo

export interface BurstOptions {
  x: number;
  y: number;
  z: number;
  count: number;
  color: number;
  speed?: number; // módulo da velocidade inicial
  spread?: number; // raio de nascimento
  life?: number; // segundos
  upBias?: number; // viés vertical da velocidade inicial
}

export interface EmitterSpec {
  position: THREE.Vector3;
  color: number;
  rate: number; // partículas por segundo
}

export class ParticleFx {
  private points: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private life: Float32Array;
  private cursor = 0;
  private emitters = new Map<string, EmitterSpec & { acc: number }>();
  private floaters: Array<{ sprite: THREE.Sprite; life: number }> = [];

  constructor(private scene: THREE.Scene) {
    const geo = new THREE.BufferGeometry();
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.life = new Float32Array(MAX_PARTICLES);
    for (let i = 0; i < MAX_PARTICLES; i++) this.positions[i * 3 + 1] = GRAVEYARD_Y;
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const mat = new THREE.PointsMaterial({
      // Câmera ortográfica (RTS): sizeAttenuation não se aplica ao projection
      // matrix — o tamanho do ponto é literalmente em pixels na tela.
      size: 5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.name = 'FX_PARTICLE_POOL';
    this.points.frustumCulled = false; // pool se move por todo o mapa
    this.points.raycast = () => undefined;
    scene.add(this.points);
  }

  private spawn(x: number, y: number, z: number, color: THREE.Color, o: Required<Omit<BurstOptions, 'x' | 'y' | 'z' | 'count' | 'color'>>): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random();
    this.positions[i * 3] = x + Math.cos(a) * o.spread * Math.random();
    this.positions[i * 3 + 1] = y + Math.random() * 0.3;
    this.positions[i * 3 + 2] = z + Math.sin(a) * o.spread * Math.random();
    this.velocities[i * 3] = Math.cos(a) * o.speed * r;
    this.velocities[i * 3 + 1] = o.speed * (0.4 + Math.random() * 0.6) * o.upBias;
    this.velocities[i * 3 + 2] = Math.sin(a) * o.speed * r;
    this.colors[i * 3] = color.r;
    this.colors[i * 3 + 1] = color.g;
    this.colors[i * 3 + 2] = color.b;
    this.life[i] = o.life * (0.7 + Math.random() * 0.6);
  }

  private gravity = 4.5;

  public burst(o: BurstOptions): void {
    const color = new THREE.Color(o.color);
    const opts = {
      speed: o.speed ?? 2.2,
      spread: o.spread ?? 0.6,
      life: o.life ?? 0.6,
      upBias: o.upBias ?? 1.0,
    };
    for (let k = 0; k < o.count; k++) this.spawn(o.x, o.y, o.z, color, opts);
  }

  /** Emissor contínuo idempotente (faíscas do veio trabalhado).
   *  Atualizar um emissor existente preserva o acumulador (chamadas por frame
   *  não podem zerar o progresso do rate). */
  public setEmitter(id: string, spec: EmitterSpec): void {
    const existing = this.emitters.get(id);
    if (existing) {
      existing.position.copy(spec.position);
      existing.color = spec.color;
      existing.rate = spec.rate;
      return;
    }
    this.emitters.set(id, { ...spec, acc: 0 });
  }

  public clearEmitter(id: string): void {
    this.emitters.delete(id);
  }

  /** Texto flutuante que sobe e desvanece (~1.2s). */
  public spawnText(text: string, x: number, y: number, z: number, cssColor = '#fbbf24'): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(2, 6, 12, 0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText(text, 128, 32);
    ctx.fillStyle = cssColor;
    ctx.fillText(text, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4.2, 1.05, 1);
    sprite.position.set(x, y, z);
    sprite.renderOrder = 998;
    this.scene.add(sprite);

    this.floaters.push({ sprite, life: 1.2 });
    if (this.floaters.length > MAX_FLOATERS) {
      const old = this.floaters.shift()!;
      this.disposeFloater(old.sprite);
    }
  }

  private disposeFloater(sprite: THREE.Sprite): void {
    this.scene.remove(sprite);
    const mat = sprite.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.dispose();
  }

  public update(delta: number): void {
    // Emissores contínuos (fog controla fora quais podem existir)
    for (const [id, em] of this.emitters) {
      em.acc += em.rate * delta;
      while (em.acc >= 1) {
        em.acc -= 1;
        this.burst({
          x: em.position.x,
          y: em.position.y,
          z: em.position.z,
          count: 1,
          color: em.color,
          speed: 1.6,
          spread: 1.4,
          life: 0.5,
          upBias: 1.3,
        });
      }
      void id;
    }

    // Partículas vivas
    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= delta;
      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = GRAVEYARD_Y;
        continue;
      }
      this.velocities[i * 3 + 1] -= this.gravity * delta;
      this.positions[i * 3] += this.velocities[i * 3] * delta;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * delta;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * delta;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;

    // Textos flutuantes
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= delta;
      f.sprite.position.y += 1.4 * delta;
      (f.sprite.material as THREE.SpriteMaterial).opacity = THREE.MathUtils.clamp(f.life / 0.9, 0, 1);
      if (f.life <= 0) {
        this.disposeFloater(f.sprite);
        this.floaters.splice(i, 1);
      }
    }
  }
}
