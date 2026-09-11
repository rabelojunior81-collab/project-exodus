import * as THREE from 'three';
import { SelectableEntity, FactionType, EntityCategory } from './types.js';
import { ModelManager, ModelInstance } from '../engine/models.js';
import { getTerrainHeight } from '../engine/terrainHeight.js';
import { SIGHT_RADII } from '../engine/fog-of-war.js';
import { BUILDING_STATS, type BuildingType } from '@project-exodus/shared/units';

/** Reexporta o tipo canônico do shared (fonte única desde a 2.6.1). */
export type { BuildingType };

export class Building implements SelectableEntity {
  public id: string;
  public name: string;
  public category: EntityCategory = 'BUILDING';
  public faction: FactionType;
  public buildingType: BuildingType;
  public health: number;
  public maxHealth: number;
  public position: THREE.Vector3;
  public mesh: THREE.Group;
  public selectionRadius: number;
  public sightRadius: number = SIGHT_RADII.BUILDING;
  public isSelected: boolean = false;

  private selectionRing: THREE.Mesh;
  private turretHead: THREE.Group | null = null;
  private turretPivotNode: THREE.Object3D | null = null;
  private ccRadarSpinner: THREE.Group | null = null;
  private smokeParticles: THREE.Points | null = null;
  private smokePositions: Float32Array | null = null;
  private baseModel: ModelInstance | null = null;

  constructor(
    id: string,
    name: string,
    buildingType: BuildingType,
    faction: FactionType,
    initialPos: { x: number; z: number }
  ) {
    this.id = id;
    this.name = name;
    this.buildingType = buildingType;
    this.faction = faction;
    this.position = new THREE.Vector3(
      initialPos.x,
      getTerrainHeight(initialPos.x, initialPos.z),
      initialPos.z
    );

    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.mesh.userData.entity = this;

    const mm = ModelManager.getInstance();

    // HP — fonte única no shared (Fase 2.6.1); o cliente mantém só o
    // raio de clique visual e as partes procedurais de cada prédio.
    const sharedStats = BUILDING_STATS[buildingType];
    this.health = sharedStats.hp;
    this.maxHealth = sharedStats.hp;

    if (buildingType === 'COMMAND_CENTER') {
      this.selectionRadius = 12.2;
      this.baseModel = mm.createInstance('command_center', 2.2);
      if (this.baseModel) this.mesh.add(this.baseModel.scene);
      this.initSmokeParticles(new THREE.Vector3(0, 15.0, 0), 24, 18.0, 9.8);
      this.initRadarMast();
    } else if (buildingType === 'BUNKER_TURRET') {
      this.selectionRadius = 6.5;

      // Base do bunker fortificado
      this.baseModel = mm.createInstance('bunker', 1.3);
      if (this.baseModel) this.mesh.add(this.baseModel.scene);

      // Torreta dupla montada no teto do bunker: a varredura tática gira
      // só o nó Turret_GunDouble_Top (base estática); fallback = modelo todo
      const turretModel = mm.createInstance('turret', 2.6);
      if (turretModel) {
        this.turretHead = turretModel.scene;
        this.turretPivotNode = turretModel.scene.getObjectByName('Turret_GunDouble_Top') ?? null;
        this.turretHead.position.set(0, 6.9, 0);
        this.mesh.add(this.turretHead);
      }
    } else {
      this.selectionRadius = 8.5;
      this.baseModel = mm.createInstance('refinery', 1.7);
      if (this.baseModel) this.mesh.add(this.baseModel.scene);
      this.initSmokeParticles(new THREE.Vector3(1.7, 10.6, 0), 28, 15.6, 8.5);
    }

    // Anel tático de seleção no solo (fino e translúcido: o raio de
    // gameplay é grande, mas o visual deve abraçar o edifício sem poluir)
    const ringGeo = new THREE.RingGeometry(this.selectionRadius * 0.985, this.selectionRadius * 1.015, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe58e26,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRing.position.y = 0.1;
    this.selectionRing.visible = false;
    this.selectionRing.renderOrder = 10;
    this.mesh.add(this.selectionRing);
  }

  /**
   * Mastro de radar procedural no teto do CC: antena fina + disco giratório
   * lento (~0.4 rad/s). Altura medida via Box3 do modelo instanciado.
   */
  private initRadarMast(): void {
    if (!this.baseModel) return;
    this.baseModel.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.baseModel.scene);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());

    const mat = new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.45, metalness: 0.85 });
    const radar = new THREE.Group();
    radar.name = 'CC_RADAR_MAST';
    radar.position.set(center.x, box.max.y - 0.2, center.z);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 3.6, 8), mat);
    mast.position.y = 1.8;
    mast.castShadow = true;
    radar.add(mast);

    const spinner = new THREE.Group();
    spinner.position.y = 3.8;
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.22, 16), mat);
    dish.castShadow = true;
    spinner.add(dish);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), mat);
    boom.position.y = 0.35;
    spinner.add(boom);
    radar.add(spinner);

    this.ccRadarSpinner = spinner;
    this.mesh.add(radar);
  }

  private updateRadar(delta: number): void {
    if (this.ccRadarSpinner) {
      this.ccRadarSpinner.rotation.y += 0.4 * delta;
    }
  }

  private smokeTopY: number = 11.0;
  private smokeBaseY: number = 6.0;

  private initSmokeParticles(origin: THREE.Vector3, count: number, topY: number = 11.0, baseY: number = 6.0): void {
    this.smokeTopY = topY;
    this.smokeBaseY = baseY;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = origin.x + (Math.random() - 0.5) * 0.6;
      pos[i * 3 + 1] = origin.y + Math.random() * 3.5;
      pos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.6;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.smokePositions = pos;

    const pMat = new THREE.PointsMaterial({
      color: 0x222429,
      size: 1.1,
      transparent: true,
      opacity: 0.5
    });

    this.smokeParticles = new THREE.Points(pGeo, pMat);
    this.mesh.add(this.smokeParticles);
  }

  public setSelected(selected: boolean): void {
    this.isSelected = selected;
    this.selectionRing.visible = selected;
  }

  public update(delta: number): void {
    // 1. Rotação tática da torreta de sentinela (só o topo pivota)
    const pivot = this.turretPivotNode ?? this.turretHead;
    if (pivot) {
      pivot.rotation.y = Math.sin(Date.now() * 0.0006) * 0.9;
    }

    // 1b. Radar do CC gira continuamente
    this.updateRadar(delta);

    // 2. Animação de partículas de fumaça das chaminés industriais
    if (this.smokeParticles && this.smokePositions) {
      const count = this.smokePositions.length / 3;
      for (let i = 0; i < count; i++) {
        this.smokePositions[i * 3 + 1] += 2.2 * delta;
        this.smokePositions[i * 3] += (Math.random() - 0.45) * delta * 0.7;
        if (this.smokePositions[i * 3 + 1] > this.smokeTopY) {
          this.smokePositions[i * 3 + 1] = this.smokeBaseY;
        }
      }
      this.smokeParticles.geometry.attributes.position.needsUpdate = true;
    }
  }
}
