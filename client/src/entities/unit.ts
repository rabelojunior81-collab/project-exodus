import * as THREE from 'three';
import { SelectableEntity, FactionType, EntityCategory } from './types.js';
import { ModelManager, ModelInstance } from '../engine/models.js';
import { getTerrainHeight } from '../engine/terrainHeight.js';
import { SIGHT_RADII } from '../engine/fog-of-war.js';
import { TacticalAudio } from '../engine/audio.js';
import { CollisionWorld, UNIT_COLLISION_RADIUS, clampWorld, slopeSpeedFactor } from '../engine/collision.js';

export type UnitType = 'SCAVENGER_WORKER' | 'RUST_RAIDER' | 'SCRAP_BUGGY' | 'MAINTENANCE_DRONE' | 'BIPED_MECH';

/** Constantes do ciclo de coleta (espelham server/src/worker.ts). */
export const GATHER_CARRY_CAPACITY = 10;
export const GATHER_TIME_SECONDS = 3;
export const GATHER_RANGE = 4;
export const DROPOFF_RANGE = 10;

/** Tipos capazes de coletar veios de recurso. */
const GATHER_CAPABLE: ReadonlySet<UnitType> = new Set(['SCAVENGER_WORKER', 'MAINTENANCE_DRONE']);

/** Ponte com a cena (instalada por main.ts; servidor assume na Fase 2.6). */
export interface GatherContext {
  getNode(id: string): { x: number; z: number; kind: string; amount: number } | null;
  takeFromNode(id: string, wanted: number): number;
  dropPoint(): { x: number; z: number };
  deposit(kind: string, amount: number): void;
  notify(text: string): void;
}

export class Unit implements SelectableEntity {
  public id: string;
  public name: string;
  public category: EntityCategory = 'UNIT';
  public faction: FactionType;
  public unitType: UnitType;
  public health: number;
  public maxHealth: number;
  public position: THREE.Vector3;
  public mesh: THREE.Group;
  public selectionRadius: number = 1.3;
  public sightRadius: number = SIGHT_RADII.SCAVENGER_WORKER;
  public isSelected: boolean = false;

  private selectionRing: THREE.Mesh;
  private targetPosition: THREE.Vector3 | null = null;
  private moveSpeed: number = 7.5;
  private rotationSpeed: number = 10.0;
  private modelInstance: ModelInstance | null = null;

  // --- Modelo de locomoção por tipo (calibrado Sessão 4) ---
  // yawOffset: direção de "frente" do modelo medida via
  // tools/visual-check/measure-facing.mjs (visor/cano/pés vs corpo).
  // Soldier (Mixamo) olha para -Z → PI; Character (Quaternius) para +Z → 0;
  // Combat_Tank tem o cano para -X → +PI/2.
  private yawOffset: number = 0;
  // Aceleração (unidades/s²) e velocidade atual: blindado tem inércia,
  // infantaria responde quase instantâneo.
  private acceleration: number = 20.0;
  private currentSpeed: number = 0;

  // --- Colisão (Fase 1.12, spec 03) ---
  /** Raio físico (distinto do raio de clique `selectionRadius`). */
  public collisionRadius: number = 1;
  private collisionWorld: CollisionWorld | null = null;
  private blockedTime: number = 0;
  private detourSide: number = 1;
  private lastBlockNx: number = 0;
  private lastBlockNz: number = 0;

  // Patrulha (ping-pong entre dois pontos)
  private patrolPoints: [THREE.Vector3, THREE.Vector3] | null = null;
  private patrolIndex: number = 0;

  // Coleta de recursos (loop trabalhador → nó → CC; TEMPORÁRIO client-side — TODO-2.6)
  private gatherCtx: GatherContext | null = null;
  private gather: {
    nodeId: string;
    phase: 'goto' | 'harvest' | 'return';
    timer: number;
    carryKind: string;
    carry: number;
  } | null = null;

  // Barra de HP flutuante (legibilidade unidade × terreno)
  private hpCanvas: HTMLCanvasElement | null = null;
  private hpTexture: THREE.CanvasTexture | null = null;
  private hpRatio: number = 1;
  private lastDrawnRatio: number = -1;

  // Articulação do blindado (SCRAP_BUGGY): torreta lagada + canhão.
  // O GLB exporta Tank_Turret e Tank_Gun como irmãos (ambos filhos de
  // RootNode, pivôs distintos); reparentamos os dois num grupo pivot no
  // ponto da torreta para travar/rodar juntos.
  private turretPivot: THREE.Group | null = null;
  private tankGun: THREE.Object3D | null = null;
  private turretYaw = 0;
  private tankIdleTime = 0;
  private scanPhase = 0;

  // Caixa de carga nas costas enquanto carrega recurso (fase return)
  private cargoIndicator: THREE.Mesh | null = null;
  private cargoMaterial: THREE.MeshStandardMaterial | null = null;

  constructor(
    id: string,
    name: string,
    unitType: UnitType,
    faction: FactionType,
    initialPos: { x: number; z: number }
  ) {
    this.id = id;
    this.name = name;
    this.unitType = unitType;
    this.faction = faction;
    this.position = new THREE.Vector3(
      initialPos.x,
      getTerrainHeight(initialPos.x, initialPos.z),
      initialPos.z
    );

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.mesh.userData.entity = this;

    // 1. Instancia o modelo 3D GLTF Real com Animações Esqueléticas
    const mm = ModelManager.getInstance();

    if (unitType === 'SCAVENGER_WORKER') {
      this.health = 60;
      this.maxHealth = 60;
      this.moveSpeed = 6.0;
      this.selectionRadius = 1.4;
      this.sightRadius = SIGHT_RADII.SCAVENGER_WORKER;
      this.yawOffset = 0;
      this.rotationSpeed = 10.0;
      this.acceleration = 20.0;
      this.modelInstance = mm.createInstance('character', 1.5);
    } else if (unitType === 'RUST_RAIDER') {
      this.health = 100;
      this.maxHealth = 100;
      this.moveSpeed = 7.5;
      this.selectionRadius = 1.5;
      this.sightRadius = SIGHT_RADII.RUST_RAIDER;
      this.yawOffset = Math.PI;
      this.rotationSpeed = 10.0;
      this.acceleration = 20.0;
      this.modelInstance = mm.createInstance('soldier', 1.5);
    } else if (unitType === 'MAINTENANCE_DRONE') {
      // Escala calibrada via harness (measureModel/Box3): 0.44 dava 2.09m,
      // 0.38 ≈ 1.80m de altura. Frente medida no GLB (bind pose): pés e
      // cabeça apontam +Z (mesmo do Character) → yawOffset 0.
      this.health = 80;
      this.maxHealth = 80;
      this.moveSpeed = 5.0;
      this.selectionRadius = 1.5;
      this.sightRadius = SIGHT_RADII.MAINTENANCE_DRONE;
      this.yawOffset = 0;
      this.rotationSpeed = 8.0;
      this.acceleration = 16.0;
      this.modelInstance = mm.createInstance('robot', 0.38);
    } else if (unitType === 'BIPED_MECH') {
      // enemy-2-legs: olhos (Eye z=+0.18) e alvos dos pés (PT z=+0.61)
      // apontam +Z → yawOffset 0. Escala calibrada via harness: 5.3 dava
      // 3.58m, 6.7 ≈ 4.50m de altura (pesado, acima do blindado 2.85m).
      this.health = 300;
      this.maxHealth = 300;
      this.moveSpeed = 5.5;
      this.selectionRadius = 2.6;
      this.sightRadius = SIGHT_RADII.BIPED_MECH;
      this.yawOffset = 0;
      this.rotationSpeed = 3.5;
      this.acceleration = 8.0;
      this.modelInstance = mm.createInstance('mech_2legs', 6.7);
    } else {
      this.health = 220;
      this.maxHealth = 220;
      this.moveSpeed = 8.0;
      this.selectionRadius = 3.2;
      this.sightRadius = SIGHT_RADII.SCRAP_BUGGY;
      this.yawOffset = Math.PI / 2;
      this.rotationSpeed = 2.2;
      this.acceleration = 5.0;
      // Escala calibrada via harness visual (sweep 0.2–1.0 em cena:
      // altura = 7.5 × escala; 0.38 → ~2.85m de altura, menor que os
      // buildings e maior que a infantaria). Grounding/recentragem
      // automáticos no ModelManager (Box3 em bind pose).
      this.modelInstance = mm.createInstance('tank', 0.38);
    }

    // Raio físico de colisão (spec 03) — o raio de clique fica em selectionRadius.
    this.collisionRadius = UNIT_COLLISION_RADIUS[unitType];

    if (this.modelInstance) {
      this.mesh.add(this.modelInstance.scene);
    }

    if (unitType === 'SCRAP_BUGGY' && this.modelInstance) {
      this.setupTankArticulation(this.modelInstance.scene);
    }

    // 2. Anel de Seleção Tático 3D no Solo
    const ringGeo = new THREE.RingGeometry(this.selectionRadius * 0.85, this.selectionRadius * 1.05, 36);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      depthWrite: false
    });
    this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRing.position.y = 0.08;
    this.selectionRing.visible = false;
    this.selectionRing.renderOrder = 10;
    this.mesh.add(this.selectionRing);

    // 3. Barra de HP flutuante sobre a cabeça (sempre visível: leitura tática imediata)
    const barHeight =
      unitType === 'BIPED_MECH' ? 5.4
        : unitType === 'SCRAP_BUGGY' ? 3.6
          : unitType === 'RUST_RAIDER' ? 3.2
            : unitType === 'MAINTENANCE_DRONE' ? 2.5
              : 2.7;
    this.hpCanvas = document.createElement('canvas');
    this.hpCanvas.width = 64;
    this.hpCanvas.height = 8;
    this.hpTexture = new THREE.CanvasTexture(this.hpCanvas);
    const hpMat = new THREE.SpriteMaterial({
      map: this.hpTexture,
      transparent: true,
      depthTest: false
    });
    const hpSprite = new THREE.Sprite(hpMat);
    hpSprite.scale.set(2.2, 0.28, 1);
    hpSprite.position.y = barHeight;
    hpSprite.renderOrder = 999;
    this.mesh.add(hpSprite);
    this.drawHpBar();

    // 4. Caixa de carga nas costas (só coletores; visível na fase return)
    if (GATHER_CAPABLE.has(unitType)) {
      this.cargoMaterial = new THREE.MeshStandardMaterial({
        color: 0x8a6a45,
        roughness: 0.6,
        metalness: 0.3,
      });
      this.cargoIndicator = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.45), this.cargoMaterial);
      // Ligeiramente atrás do eixo do corpo (mesh local -z = costas)
      this.cargoIndicator.position.set(0, unitType === 'MAINTENANCE_DRONE' ? 1.3 : 1.55, -0.35);
      this.cargoIndicator.castShadow = true;
      this.cargoIndicator.visible = false;
      this.cargoIndicator.name = 'CARGO_INDICATOR';
      this.mesh.add(this.cargoIndicator);
    }
  }

  /** Redesenha a barra de HP (chamado sob demanda). */
  private drawHpBar(): void {
    if (!this.hpCanvas || !this.hpTexture) return;
    if (this.hpRatio === this.lastDrawnRatio) return;
    this.lastDrawnRatio = this.hpRatio;
    const ctx = this.hpCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 64, 8);
    ctx.fillStyle = 'rgba(2, 6, 12, 0.75)';
    ctx.fillRect(0, 0, 64, 8);
    const w = Math.round(62 * THREE.MathUtils.clamp(this.hpRatio, 0, 1));
    ctx.fillStyle = this.hpRatio > 0.55 ? '#22e07a' : this.hpRatio > 0.25 ? '#f5a623' : '#ef4444';
    ctx.fillRect(1, 1, w, 6);
    this.hpTexture.needsUpdate = true;
  }

  /** Reparenta Tank_Turret e Tank_Gun num pivot comum (pivôs originais diferem). */
  private setupTankArticulation(root: THREE.Group): void {
    const turret = root.getObjectByName('Tank_Turret');
    const gun = root.getObjectByName('Tank_Gun');
    if (!turret || !turret.parent) return;
    const pivot = new THREE.Group();
    pivot.name = 'SCRAP_BUGGY_TURRET_PIVOT';
    pivot.position.copy(turret.position);
    turret.parent.add(pivot);
    pivot.attach(turret);
    if (gun) {
      pivot.attach(gun);
      this.tankGun = gun;
    }
    this.turretPivot = pivot;
  }

  /**
   * Torreta persegue o heading do casco com mola amortecida; parada >2s faz
   * varredura idle ±25°. Canhão oscila 2-3° acompanhando.
   */
  private updateTankArticulation(delta: number): void {
    if (!this.turretPivot) return;
    const moving = this.currentSpeed > 0.3 || this.targetPosition !== null;
    let targetYaw = 0;
    if (!moving) {
      this.tankIdleTime += delta;
      if (this.tankIdleTime > 2) {
        this.scanPhase += delta * 0.55;
        targetYaw = Math.sin(this.scanPhase) * 0.436; // ±25°
      }
    } else {
      this.tankIdleTime = 0;
      this.scanPhase = 0;
    }
    const rate = Math.min(1, 2.5 * delta);
    this.turretYaw += (targetYaw - this.turretYaw) * rate;
    this.turretPivot.rotation.y = this.turretYaw;
    if (this.tankGun) {
      // Barril aponta -X: rotation.z negativo eleva
      this.tankGun.rotation.z = -(0.04 + this.turretYaw * 0.08 + Math.sin(this.scanPhase * 2) * 0.02);
    }
  }

  public updateHealth(hp: number): void {
    this.health = THREE.MathUtils.clamp(hp, 0, this.maxHealth);
    this.hpRatio = this.maxHealth > 0 ? this.health / this.maxHealth : 0;
    this.drawHpBar();
  }

  /** Nó em colheita ativa (FX de mineração viva consultam isso por frame). */
  public get harvestNodeId(): string | null {
    return this.gather && this.gather.phase === 'harvest' ? this.gather.nodeId : null;
  }

  /** Caixa de carga nas costas aparece apenas carregando (fase return com carga). */
  private refreshCargoIndicator(): void {
    if (!this.cargoIndicator) return;
    this.cargoIndicator.visible =
      !!this.gather && this.gather.phase === 'return' && this.gather.carry > 0;
  }

  public setSelected(selected: boolean): void {
    this.isSelected = selected;
    this.selectionRing.visible = selected;
  }

  public moveTo(destination: THREE.Vector3): void {
    this.targetPosition = destination.clone();
    // Fase 1.12: destino dentro de obstáculo é projetado para a borda do
    // círculo — a unidade para ENCOSTADA em vez de orbitar o alvo.
    if (this.collisionWorld) {
      const fixed = this.collisionWorld.resolveTarget(
        destination.x, destination.z, this.collisionRadius
      );
      this.targetPosition.x = fixed.x;
      this.targetPosition.z = fixed.z;
    }
    // Assenta o destino sobre o relevo (fora do platô y=0 enterra a unidade)
    this.targetPosition.y = getTerrainHeight(this.targetPosition.x, this.targetPosition.z);
    this.patrolPoints = null;
    this.gather = null;
    this.refreshCargoIndicator();

    // Ativa animação de corrida/andar nos modelos animados
    if (this.modelInstance?.setAnimation) {
      this.modelInstance.setAnimation('run');
    }
  }

  /** Patrulha em ping-pong entre dois pontos de solo. */
  public setPatrol(a: THREE.Vector3, b: THREE.Vector3): void {    const pa = a.clone();
    pa.y = getTerrainHeight(a.x, a.z);
    const pb = b.clone();
    pb.y = getTerrainHeight(b.x, b.z);
    this.patrolPoints = [pa, pb];
    this.patrolIndex = 0;
    this.targetPosition = this.patrolPoints[0].clone();
    if (this.modelInstance?.setAnimation) {
      this.modelInstance.setAnimation('run');
    }
  }

  public stop(): void {
    this.targetPosition = null;
    this.patrolPoints = null;
    this.gather = null;
    this.currentSpeed = 0;
    this.blockedTime = 0;
    this.refreshCargoIndicator();
    if (this.modelInstance?.setAnimation) {
      this.modelInstance.setAnimation('idle');
    }
  }

  public setGatherContext(ctx: GatherContext): void {
    this.gatherCtx = ctx;
  }

  /** Conecta o mundo de colisão (Fase 1.12). Chamado pelo main no spawn. */
  public setCollisionWorld(world: CollisionWorld): void {
    this.collisionWorld = world;
  }

  /** Empurrão da separação unidade×unidade (aplicado pelo main a cada frame). */
  public applyPhysicsPush(dx: number, dz: number): void {
    if (dx === 0 && dz === 0) return;
    this.mesh.position.x = clampWorld(this.mesh.position.x + dx);
    this.mesh.position.z = clampWorld(this.mesh.position.z + dz);
    this.mesh.position.y = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
    this.position.copy(this.mesh.position);
  }

  /**
   * Re-resolve colisões com o mundo sem mover (o empurrão da separação pode
   * ter jogado a unidade para dentro de um prop/prédio).
   */
  public resolveStaticCollision(): void {
    if (!this.collisionWorld) return;
    const x = this.mesh.position.x;
    const z = this.mesh.position.z;
    const hit = this.collisionWorld.resolveMove(x, z, x, z, this.collisionRadius);
    if (hit.x !== x || hit.z !== z) {
      this.mesh.position.x = hit.x;
      this.mesh.position.z = hit.z;
      this.mesh.position.y = getTerrainHeight(hit.x, hit.z);
      this.position.copy(this.mesh.position);
    }
  }

  /** Ordem de coleta: vai ao nó, colhe, retorna ao CC e repete até esgotar. */
  public setGather(nodeId: string): void {
    if (!GATHER_CAPABLE.has(this.unitType)) return;
    if (!this.gatherCtx) return;
    const node = this.gatherCtx.getNode(nodeId);
    if (!node || node.amount <= 0) return;
    this.patrolPoints = null;
    this.gather = { nodeId, phase: 'goto', timer: 0, carryKind: node.kind, carry: 0 };
    this.targetPosition = new THREE.Vector3(
      node.x, getTerrainHeight(node.x, node.z), node.z
    );
    if (this.modelInstance?.setAnimation) {
      this.modelInstance.setAnimation('run');
    }
  }

  /** Avança a FSM de coleta quando a unidade chega ao destino. Retorna true se consumiu a chegada. */
  private arrivalGather(): boolean {
    if (!this.gather || !this.gatherCtx) return false;
    const ctx = this.gatherCtx;
    const g = this.gather;

    if (g.phase === 'goto') {
      g.phase = 'harvest';
      // Droide de manutenção colhe ~50% mais lento que o catador
      g.timer = GATHER_TIME_SECONDS * (this.unitType === 'MAINTENANCE_DRONE' ? 2 : 1);
      TacticalAudio.playEffect('gather'); // TODO 1.7E: cue sonoro
      // Catador tem clipe próprio de colheita ('harvest' = Interact);
      // modelos sem ele ficam em idle junto ao veio.
      const harvestAnim = this.modelInstance?.actions && 'harvest' in this.modelInstance.actions ? 'harvest' : 'idle';
      if (this.modelInstance?.setAnimation) {
        this.modelInstance.setAnimation(harvestAnim);
      }
      this.targetPosition = null;
      return true;
    }
    if (g.phase === 'return') {
      if (g.carry > 0) {
        ctx.deposit(g.carryKind, g.carry);
        g.carry = 0;
        this.refreshCargoIndicator();
      }
      const node = ctx.getNode(g.nodeId);
      if (!node || node.amount <= 0) {
        this.gather = null;
        ctx.notify('Veio esgotado — trabalhador ocioso');
        return false; // cai no idle normal
      }
      g.phase = 'goto';
      this.targetPosition = new THREE.Vector3(
        node.x, getTerrainHeight(node.x, node.z), node.z
      );
      if (this.modelInstance?.setAnimation) {
        this.modelInstance.setAnimation('run');
      }
      return true;
    }
    return false;
  }

  public update(delta: number): void {
    // 1. Atualiza animação esquelética via AnimationMixer
    if (this.modelInstance?.update) {
      this.modelInstance.update(delta);
    }

    // 1b. Articulação procedural de torreta/canhão do blindado
    if (this.unitType === 'SCRAP_BUGGY') {
      this.updateTankArticulation(delta);
    }

    // 2. Animação de pulso no anel de seleção
    if (this.isSelected) {
      const s = 1 + Math.sin(Date.now() * 0.007) * 0.05;
      this.selectionRing.scale.set(s, s, s);
    }

    // 2b. Timer de colheita (parado junto ao veio)
    if (this.gather && this.gather.phase === 'harvest' && this.gatherCtx) {
      this.gather.timer -= delta;
      if (this.gather.timer <= 0) {
        const taken = this.gatherCtx.takeFromNode(this.gather.nodeId, GATHER_CARRY_CAPACITY);
        this.gather.carry = taken;
        if (taken <= 0) {
          this.gather = null;
          this.gatherCtx.notify('Veio esgotado — trabalhador ocioso');
          this.refreshCargoIndicator();
          if (this.modelInstance?.setAnimation) {
            this.modelInstance.setAnimation('idle');
          }
        } else {
          // Tingir a carga pela cor do recurso e pendurar nas costas.
          // Sabor RTS clássico: coletor carregado anda 10% mais lento.
          if (this.cargoMaterial) {
            const cargoColors: Record<string, number> = {
              RACAO_AGUA: 0x22d3ee,
              SUCATA: 0xf59e0b,
              CHIPS_IA: 0xc084fc,
              CONCRETO: 0x94a3b8,
            };
            const c = cargoColors[this.gather.carryKind];
            if (c !== undefined) this.cargoMaterial.color.setHex(c);
          }
          this.refreshCargoIndicator();
          const drop = this.gatherCtx.dropPoint();
          this.gather.phase = 'return';
          this.targetPosition = new THREE.Vector3(
            drop.x, getTerrainHeight(drop.x, drop.z), drop.z
          );
          if (this.modelInstance?.setAnimation) {
            this.modelInstance.setAnimation('run');
          }
        }
      }
    }

    // 3. Movimentação física no mundo (modelo de locomoção por tipo)
    if (this.targetPosition) {
      const dir = new THREE.Vector3().subVectors(this.targetPosition, this.mesh.position);
      dir.y = 0;
      const distance = dir.length();

      if (distance > 0.2) {
        // Coleta: começa a colher a 4m do veio e entrega a 10m do CC
        // (não entra na pilha nem atravessa o edifício).
        if (this.gather) {
          const reach = this.gather.phase === 'goto' ? GATHER_RANGE : this.gather.phase === 'return' ? DROPOFF_RANGE : 0;
          if (reach > 0 && distance < reach) {
            this.targetPosition = null;
            this.currentSpeed = 0;
            if (!this.arrivalGather()) {
              if (this.modelInstance?.setAnimation) {
                this.modelInstance.setAnimation('idle');
              }
            }
            this.position.copy(this.mesh.position);
            return;
          }
        }
        dir.normalize();

        // Fase 1.12: desvio frontal. Se o frame anterior terminou bloqueado de
        // frente, a intenção gira para a tangente do obstáculo (lado escolhido
        // de forma determinística) — a unidade orbita até a linha direta abrir.
        const steer = dir.clone();
        if (this.collisionWorld && this.blockedTime > 0.12) {
          const tx = -this.lastBlockNz;
          const tz = this.lastBlockNx;
          const along = dir.x * tx + dir.z * tz;
          let side = Math.abs(along) > 0.2 ? Math.sign(along) : this.detourSide;
          if (side === 0) side = 1;
          this.detourSide = side;
          steer.set(tx * side * 0.9 + dir.x * 0.1, 0, tz * side * 0.9 + dir.z * 0.1);
          if (steer.lengthSq() < 1e-6) steer.copy(dir);
          steer.normalize();
        }

        // Rotação suave em direção à intenção (direta ou de desvio),
        // compensando a frente do modelo. NOTA: frentes distintas — yawOffset.
        const targetAngle = Math.atan2(steer.x, steer.z) + this.yawOffset;
        const currentAngle = this.mesh.rotation.y;

        let diff = targetAngle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.mesh.rotation.y += diff * Math.min(1, this.rotationSpeed * delta);

        // Alinhamento casco↔intenção: blindado só traciona quando apontado
        // (esterçamento em arco, sem deslize lateral); infantaria é ágil.
        const alignment = Math.cos(diff);
        // Sabor RTS clássico: coletor carregando carga anda 10% mais lento
        const carryPenalty = this.gather && this.gather.phase === 'return' && this.gather.carry > 0 ? 0.9 : 1;
        // Fase 1.12: declive do terreno penaliza velocidade (crateras/rims).
        const slopeFactor = slopeSpeedFactor(this.mesh.position.x, this.mesh.position.z);
        const targetSpeed = this.moveSpeed * carryPenalty * slopeFactor
          * THREE.MathUtils.clamp((alignment - 0.2) / 0.8, 0, 1);

        // Aceleração/desaceleração com inércia (tanque pesado arranca e freia devagar)
        const rate = (targetSpeed > this.currentSpeed ? this.acceleration : this.acceleration * 1.6) * delta;
        this.currentSpeed += THREE.MathUtils.clamp(targetSpeed - this.currentSpeed, -rate, rate);

        // Esteiras só animam com tração real; parado, volta ao idle.
        // No blindado, giros no lugar usam os clipes de esteira
        // TurningLeft/Right (medido: diff>0 = giro anti-horário = esquerda).
        if (this.modelInstance?.setAnimation) {
          if (this.unitType === 'SCRAP_BUGGY') {
            if (this.currentSpeed > 0.6) {
              this.modelInstance.setAnimation('run');
            } else if (Math.abs(diff) > 0.35) {
              this.modelInstance.setAnimation(
                diff > 0 ? 'TankArmature|Tank_TurningLeft' : 'TankArmature|Tank_TurningRight'
              );
            } else {
              this.modelInstance.setAnimation('idle');
            }
          } else {
            this.modelInstance.setAnimation(this.currentSpeed > 0.6 ? 'run' : 'idle');
          }
        }

        const moveDist = Math.min(distance, this.currentSpeed * delta);

        // Fase 1.12: resolve a colisão ANTES de gravar a posição — projeção
        // com deslize embutido; contato persistente alimenta o desvio acima.
        if (this.collisionWorld) {
          const fromX = this.mesh.position.x;
          const fromZ = this.mesh.position.z;
          const hit = this.collisionWorld.resolveMove(
            fromX, fromZ,
            fromX + steer.x * moveDist, fromZ + steer.z * moveDist,
            this.collisionRadius,
          );
          if (hit.blocked) {
            this.blockedTime += delta;
            this.lastBlockNx = hit.nx;
            this.lastBlockNz = hit.nz;
          } else {
            this.blockedTime = Math.max(0, this.blockedTime - delta * 2);
          }
          this.mesh.position.x = hit.x;
          this.mesh.position.z = hit.z;
        } else {
          this.mesh.position.addScaledVector(steer, moveDist);
        }
        this.mesh.position.x = clampWorld(this.mesh.position.x);
        this.mesh.position.z = clampWorld(this.mesh.position.z);
        // Cola a unidade no relevo a cada frame — sem isso o terreno
        // corta/atravessa o modelo fora do platô plano (raio > 30).
        this.mesh.position.y = getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
        this.position.copy(this.mesh.position);
      } else {
        this.targetPosition = null;
        this.currentSpeed = 0;
        // Coleta: a chegada alimenta a FSM (pode definir novo destino)
        if (this.arrivalGather()) {
          this.position.copy(this.mesh.position);
          return;
        }
        // Patrulha: ao chegar, alterna para o outro ponto
        if (this.patrolPoints) {
          this.patrolIndex = 1 - this.patrolIndex;
          this.targetPosition = this.patrolPoints[this.patrolIndex].clone();
          if (this.modelInstance?.setAnimation) {
            this.modelInstance.setAnimation('run');
          }
        } else {
          // Volta para animação Idle ao parar
          if (this.modelInstance?.setAnimation) {
            this.modelInstance.setAnimation('idle');
          }
        }
      }
    }
  }
}
