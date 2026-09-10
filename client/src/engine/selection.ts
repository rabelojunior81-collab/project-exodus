import * as THREE from 'three';
import { SelectableEntity } from '../entities/types.js';
import { Unit } from '../entities/unit.js';
import { getTerrainHeight } from './terrainHeight.js';

export interface SelectionCallbacks {
  onSelectionChanged: (selected: SelectableEntity[]) => void;
}

export class SelectionManager {
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private domElement: HTMLElement;
  private marqueeElement: HTMLElement;
  private entities: SelectableEntity[] = [];
  public selectedEntities: SelectableEntity[] = [];
  private callbacks: SelectionCallbacks;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseCoords: THREE.Vector2 = new THREE.Vector2();

  // Modo de ordem pendente (botão de comando → próximo clique no solo)
  private pendingOrder: 'move' | 'patrol' | 'rally' | 'gather' | null = null;
  private patrolFirstPoint: THREE.Vector3 | null = null;
  private rallyCallback: ((point: THREE.Vector3) => void) | null = null;
  // Resolver de clique em nó de recurso (instalado por main.ts; retorna nodeId ou null)
  private nodePicker: ((clientX: number, clientY: number) => string | null) | null = null;

  public setPendingOrder(mode: 'move' | 'patrol' | 'rally' | 'gather' | null, onRally?: (point: THREE.Vector3) => void): void {
    this.pendingOrder = mode;
    this.patrolFirstPoint = null;
    this.rallyCallback = onRally ?? null;
  }

  public getPendingOrder(): 'move' | 'patrol' | 'rally' | 'gather' | null {
    return this.pendingOrder;
  }

  public setNodePicker(picker: ((clientX: number, clientY: number) => string | null) | null): void {
    this.nodePicker = picker;
  }

  // Estado do arrasto da caixa de seleção (Marquee)
  private isPointerDown: boolean = false;
  private dragStart: { x: number; y: number } = { x: 0, y: 0 };
  private isBoxSelecting: boolean = false;
  private minDragDistance: number = 8; // Pixels mínimos para considerar arrasto

  // Anel de feedback de comando de movimento
  private moveFeedbackRings: Array<{ mesh: THREE.Mesh; age: number }> = [];

  constructor(
    camera: THREE.Camera,
    scene: THREE.Scene,
    domElement: HTMLElement,
    callbacks: SelectionCallbacks
  ) {
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;
    this.callbacks = callbacks;

    const marquee = document.getElementById('selection-marquee');
    if (!marquee) throw new Error('Elemento #selection-marquee não encontrado no DOM.');
    this.marqueeElement = marquee;

    this.setupListeners();
  }

  public registerEntity(entity: SelectableEntity): void {
    this.entities.push(entity);
  }

  public unregisterEntity(entity: SelectableEntity): void {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) this.entities.splice(idx, 1);
  }

  private setupListeners(): void {
    // Evita abrir menu de contexto do navegador ao clicar com botão direito
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    this.domElement.addEventListener('pointerdown', (e) => {
      // Botão esquerdo: Seleção única ou início de arrasto
      if (e.button === 0) {
        this.isPointerDown = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.isBoxSelecting = false;
      }
      // Botão direito: Comando de ação / movimentação
      else if (e.button === 2) {
        this.handleRightClick(e.clientX, e.clientY);
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown) return;

      const dist = Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y);
      if (dist > this.minDragDistance) {
        this.isBoxSelecting = true;
        this.updateMarquee(e.clientX, e.clientY);
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;

      if (this.isBoxSelecting) {
        this.isBoxSelecting = false;
        this.marqueeElement.classList.add('hidden');
        this.finishBoxSelection(e.clientX, e.clientY);
      } else if (e.button === 0) {
        this.finishSingleClick(e.clientX, e.clientY, e.shiftKey);
      }
    });
  }

  private updateMarquee(currentX: number, currentY: number): void {
    const left = Math.min(this.dragStart.x, currentX);
    const top = Math.min(this.dragStart.y, currentY);
    const width = Math.abs(currentX - this.dragStart.x);
    const height = Math.abs(currentY - this.dragStart.y);

    this.marqueeElement.style.left = `${left}px`;
    this.marqueeElement.style.top = `${top}px`;
    this.marqueeElement.style.width = `${width}px`;
    this.marqueeElement.style.height = `${height}px`;
    this.marqueeElement.classList.remove('hidden');
  }

  private finishSingleClick(clientX: number, clientY: number, isShift: boolean): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouseCoords.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseCoords.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseCoords, this.camera);
    
    // Filtra interseções com as malhas das entidades
    const entityMeshes = this.entities.map(e => e.mesh);
    const intersects = this.raycaster.intersectObjects(entityMeshes, true);

    if (intersects.length > 0) {
      let hitEntity: SelectableEntity | null = null;
      let obj: THREE.Object3D | null = intersects[0].object;

      while (obj) {
        if (obj.userData?.entity) {
          hitEntity = obj.userData.entity;
          break;
        }
        obj = obj.parent;
      }

      if (hitEntity) {
        if (isShift) {
          this.toggleSelection(hitEntity);
        } else {
          this.clearSelection();
          this.selectEntity(hitEntity);
        }
        return;
      }
    }

    // Modo de ordem pendente: clique no solo resolve a ordem em vez de desselecionar
    if (this.pendingOrder) {
      const point = this.groundPointAt(clientX, clientY);
      if (point) {
        if (this.pendingOrder === 'move') {
          this.issueMoveOrder(point);
          this.setPendingOrder(null);
        } else if (this.pendingOrder === 'patrol') {
          if (!this.patrolFirstPoint) {
            this.patrolFirstPoint = point.clone();
            this.spawnMoveWaypoint(point);
          } else {
            const selectedUnits = this.selectedEntities.filter(
              (e): e is Unit => e instanceof Unit
            );
            for (const unit of selectedUnits) {
              unit.setPatrol(this.patrolFirstPoint, point);
            }
            this.spawnMoveWaypoint(point);
            this.setPendingOrder(null);
          }
        } else if (this.pendingOrder === 'rally') {
          this.rallyCallback?.(point);
          this.spawnMoveWaypoint(point);
          this.setPendingOrder(null);
        } else if (this.pendingOrder === 'gather') {
          // Clique em nó de recurso → ordem de coleta; no solo vazio, fallback p/ mover
          const nodeId = this.nodePicker ? this.nodePicker(clientX, clientY) : null;
          if (nodeId) {
            const workers = this.selectedEntities.filter(
              (e): e is Unit => e instanceof Unit && e.unitType === 'SCAVENGER_WORKER'
            );
            const targets = workers.length > 0 ? workers : this.selectedEntities.filter(
              (e): e is Unit => e instanceof Unit
            );
            for (const unit of targets) {
              unit.setGather(nodeId);
            }
            this.spawnMoveWaypoint(point);
            this.setPendingOrder(null);
          } else {
            this.issueMoveOrder(point);
            this.setPendingOrder(null);
          }
        }
      }
      return;
    }

    // Se clicou no solo e não segurava Shift, limpa a seleção
    if (!isShift) {
      this.clearSelection();
    }
  }

  private finishBoxSelection(clientX: number, clientY: number): void {
    const minX = Math.min(this.dragStart.x, clientX);
    const maxX = Math.max(this.dragStart.x, clientX);
    const minY = Math.min(this.dragStart.y, clientY);
    const maxY = Math.max(this.dragStart.y, clientY);

    const candidates: SelectableEntity[] = [];

    // Projeta as posições 3D das entidades na tela para verificar se caem no retângulo 2D
    const screenPos = new THREE.Vector3();
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (const entity of this.entities) {
      screenPos.copy(entity.position);
      screenPos.project(this.camera);

      // Converte coordenadas NDC (-1 a 1) para pixels na tela
      const px = ((screenPos.x + 1) * width) / 2;
      const py = ((-screenPos.y + 1) * height) / 2;

      if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
        candidates.push(entity);
      }
    }

    this.clearSelection();

    // Prioridade tática clássica (Age of Empires 2):
    // Se a seleção em área incluir Unidades móveis, seleciona apenas Unidades (ignora edifícios)
    const unitsOnly = candidates.filter(e => e.category === 'UNIT');
    const finalSelection = unitsOnly.length > 0 ? unitsOnly : candidates;

    for (const entity of finalSelection) {
      this.selectEntity(entity);
    }
  }

  /** Emite ordem de movimento com dispersão em formação (usado por right-click e minimapa). */
  public issueMoveOrder(targetPoint: THREE.Vector3): void {
    const selectedUnits = this.selectedEntities.filter(
      (e): e is Unit => e instanceof Unit
    );
    if (selectedUnits.length === 0) return;

    const ground = targetPoint.clone();
    ground.y = getTerrainHeight(targetPoint.x, targetPoint.z);

    selectedUnits.forEach((unit, index) => {
      // Dispersão suave em formação para que não colidam no mesmo ponto
      const offsetX = (index % 3 - 1) * 1.5;
      const offsetZ = Math.floor(index / 3) * 1.5;
      unit.moveTo(new THREE.Vector3(ground.x + offsetX, 0, ground.z + offsetZ));
    });

    // Cria feedback visual tático no solo (círculo pulsante que desaparece)
    this.spawnMoveWaypoint(ground);
  }

  /** Ponto de solo sob o cursor (plano Y=0 + snap no relevo). Retorna null se não acertar. */
  public groundPointAt(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.domElement.getBoundingClientRect();
    this.mouseCoords.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseCoords.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseCoords, this.camera);

    // Projeta contra o plano do solo (Y = 0)
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const targetPoint = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(groundPlane, targetPoint);
    if (!hit) return null;
    targetPoint.y = getTerrainHeight(targetPoint.x, targetPoint.z);
    return targetPoint;
  }

  private handleRightClick(clientX: number, clientY: number): void {
    const targetPoint = this.groundPointAt(clientX, clientY);
    if (targetPoint) {
      this.setPendingOrder(null);
      this.issueMoveOrder(targetPoint);
    }
  }

  private spawnMoveWaypoint(pos: THREE.Vector3): void {
    const ringGeo = new THREE.RingGeometry(0.5, 0.7, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(pos.x, pos.y + 0.12, pos.z);
    this.scene.add(ring);

    this.moveFeedbackRings.push({ mesh: ring, age: 0 });
  }

  public selectEntity(entity: SelectableEntity): void {
    if (!this.selectedEntities.includes(entity)) {
      this.selectedEntities.push(entity);
      entity.setSelected(true);
      this.callbacks.onSelectionChanged(this.selectedEntities);
    }
  }

  public deselectEntity(entity: SelectableEntity): void {
    const idx = this.selectedEntities.indexOf(entity);
    if (idx !== -1) {
      this.selectedEntities.splice(idx, 1);
      entity.setSelected(false);
      this.callbacks.onSelectionChanged(this.selectedEntities);
    }
  }

  public toggleSelection(entity: SelectableEntity): void {
    if (this.selectedEntities.includes(entity)) {
      this.deselectEntity(entity);
    } else {
      this.selectEntity(entity);
    }
  }

  public clearSelection(): void {
    for (const entity of this.selectedEntities) {
      entity.setSelected(false);
    }
    this.selectedEntities = [];
    this.callbacks.onSelectionChanged(this.selectedEntities);
  }

  public update(delta: number): void {
    // Atualiza animações de desvanecimento dos waypoints de movimento
    for (let i = this.moveFeedbackRings.length - 1; i >= 0; i--) {
      const item = this.moveFeedbackRings[i];
      item.age += delta;

      const scale = 1 + item.age * 2.5;
      item.mesh.scale.set(scale, scale, scale);

      const mat = item.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = THREE.MathUtils.clamp(1 - item.age * 2.2, 0, 1);

      if (item.age > 0.45) {
        this.scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        mat.dispose();
        this.moveFeedbackRings.splice(i, 1);
      }
    }
  }
}
