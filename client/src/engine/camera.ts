import * as THREE from 'three';
import { getTerrainHeight } from './terrainHeight.js';

export interface CameraConfig {
  moveSpeed: number;
  edgePanMargin: number;
  minFrustum: number;
  maxFrustum: number;
  zoomSpeed: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export class RTSCameraController {
  public camera: THREE.OrthographicCamera;
  private domElement: HTMLElement;
  private config: CameraConfig;

  // Pivô central para onde a câmera está olhando no solo (plano Y=0)
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private desiredTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Controle de Zoom
  private frustumSize: number = 38;
  private targetFrustumSize: number = 38;

  // Controle de Rotação (Yaw)
  private currentYaw: number = Math.PI / 4; // 45 graus inicial
  private targetYaw: number = Math.PI / 4;
  private pitch: number = Math.atan(1 / Math.SQRT2); // 35.264 graus clássico

  // Estados de entrada
  private keysPressed: Record<string, boolean> = {};
  private mousePos: { x: number; y: number } = { x: -1, y: -1 };
  private isMouseInside: boolean = false;
  private isDraggingRight: boolean = false;
  private lastDragPos: { x: number; y: number } = { x: 0, y: 0 };

  constructor(
    domElement: HTMLElement,
    aspect: number,
    configPartial?: Partial<CameraConfig>
  ) {
    this.domElement = domElement;
    this.config = {
      moveSpeed: 45,
      edgePanMargin: 22,
      minFrustum: 9,
      maxFrustum: 110,
      zoomSpeed: 0.15,
      bounds: { minX: -80, maxX: 80, minZ: -80, maxZ: 80 },
      ...configPartial
    };

    this.camera = new THREE.OrthographicCamera(
      (-this.frustumSize * aspect) / 2,
      (this.frustumSize * aspect) / 2,
      this.frustumSize / 2,
      -this.frustumSize / 2,
      1,
      1000
    );

    this.updateCameraPosition();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.code] = true;

      // Rotação com Q e E em passos de 45 graus (PI / 4)
      if (e.code === 'KeyQ') {
        this.targetYaw += Math.PI / 4;
      } else if (e.code === 'KeyE') {
        this.targetYaw -= Math.PI / 4;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.code] = false;
    });

    this.domElement.addEventListener('mousemove', (e) => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
      this.isMouseInside = true;

      // Pan com arrasto de botão do meio ou botão direito
      if (this.isDraggingRight) {
        const dx = e.clientX - this.lastDragPos.x;
        const dy = e.clientY - this.lastDragPos.y;
        this.lastDragPos = { x: e.clientX, y: e.clientY };

        const panScale = this.frustumSize / window.innerHeight;
        const forward = new THREE.Vector3(-Math.sin(this.currentYaw), 0, -Math.cos(this.currentYaw));
        const right = new THREE.Vector3(Math.cos(this.currentYaw), 0, -Math.sin(this.currentYaw));

        this.desiredTarget.addScaledVector(right, -dx * panScale);
        this.desiredTarget.addScaledVector(forward, dy * panScale);
        this.clampBounds();
      }
    });

    this.domElement.addEventListener('mouseleave', () => {
      this.isMouseInside = false;
    });

    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = Math.sign(e.deltaY) * this.targetFrustumSize * this.config.zoomSpeed;
      this.targetFrustumSize = THREE.MathUtils.clamp(
        this.targetFrustumSize + zoomDelta,
        this.config.minFrustum,
        this.config.maxFrustum
      );
    }, { passive: false });

    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 1) { // Botão do meio do mouse para pan livre
        this.isDraggingRight = true;
        this.lastDragPos = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 1) {
        this.isDraggingRight = false;
      }
    });
  }

  public update(delta: number): void {
    // 1. Processa movimentação por Teclado e Edge Pan
    const moveDir = new THREE.Vector3();

    // Vetores de direção alinhados com a rotação atual da câmera
    const forward = new THREE.Vector3(-Math.sin(this.currentYaw), 0, -Math.cos(this.currentYaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.currentYaw), 0, -Math.sin(this.currentYaw)).normalize();

    // Teclado (WASD / Setas)
    if (this.keysPressed['KeyW'] || this.keysPressed['ArrowUp']) moveDir.add(forward);
    if (this.keysPressed['KeyS'] || this.keysPressed['ArrowDown']) moveDir.sub(forward);
    if (this.keysPressed['KeyD'] || this.keysPressed['ArrowRight']) moveDir.add(right);
    if (this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft']) moveDir.sub(right);

    // Edge Panning (quando o mouse está nas bordas da tela)
    if (this.isMouseInside && !this.isDraggingRight) {
      const margin = this.config.edgePanMargin;
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (this.mousePos.x <= margin) moveDir.sub(right);
      if (this.mousePos.x >= width - margin) moveDir.add(right);
      if (this.mousePos.y <= margin) moveDir.add(forward);
      if (this.mousePos.y >= height - margin) moveDir.sub(forward);
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const speed = this.config.moveSpeed * (this.frustumSize / 40); // Move mais rápido quando com zoom out
      this.desiredTarget.addScaledVector(moveDir, speed * delta);
      this.clampBounds();
    }

    // 2. Interpolação suave do Target (Damping)
    this.target.lerp(this.desiredTarget, 10 * delta);

    // 3. Interpolação de Zoom
    this.frustumSize = THREE.MathUtils.lerp(this.frustumSize, this.targetFrustumSize, 12 * delta);
    this.updateFrustum();

    // 4. Interpolação de Rotação (Yaw)
    this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.targetYaw, 10 * delta);

    // 5. Atualiza posição final da Câmera
    this.updateCameraPosition();
  }

  private clampBounds(): void {
    const b = this.config.bounds;
    this.desiredTarget.x = THREE.MathUtils.clamp(this.desiredTarget.x, b.minX, b.maxX);
    this.desiredTarget.z = THREE.MathUtils.clamp(this.desiredTarget.z, b.minZ, b.maxZ);
  }

  private updateCameraPosition(): void {
    const distance = 80;
    // Coordenadas esféricas adaptadas para vista isométrica
    const x = this.target.x + distance * Math.sin(this.currentYaw) * Math.cos(this.pitch);
    const y = this.target.y + distance * Math.sin(this.pitch);
    const z = this.target.z + distance * Math.cos(this.currentYaw) * Math.cos(this.pitch);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  private updateFrustum(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.left = (-this.frustumSize * aspect) / 2;
    this.camera.right = (this.frustumSize * aspect) / 2;
    this.camera.top = this.frustumSize / 2;
    this.camera.bottom = -this.frustumSize / 2;
    this.camera.updateProjectionMatrix();
  }

  public handleResize(): void {
    this.updateFrustum();
  }

  public setTarget(pos: { x: number; z: number }, immediate: boolean = false): void {
    // O alvo acompanha o relevo: nas colinas a câmera enquadra o solo real,
    // não o plano Y=0 (que deixava tudo fora de centro no zoom).
    const y = getTerrainHeight(pos.x, pos.z);
    this.desiredTarget.set(pos.x, y, pos.z);
    if (immediate) {
      this.target.set(pos.x, y, pos.z);
    }
    this.clampBounds();
  }
}
