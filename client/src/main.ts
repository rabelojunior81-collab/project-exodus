import * as THREE from 'three';
import { RTSCameraController } from './engine/camera.js';
import { TerrainManager } from './engine/terrain.js';
import { getTerrainHeight } from './engine/terrainHeight.js';
import {
  CollisionWorld,
  BUILDING_COLLISION_RADIUS,
  NODE_COLLISION_RADIUS,
  separateUnits,
  type CircleObstacle,
  type SoftBodyLike,
} from './engine/collision.js';
import { FogOfWar } from './engine/fog-of-war.js';
import { ParticleFx } from './fx/particles.js';
import { TacticalAudio } from './engine/audio.js';
import { SelectionManager } from './engine/selection.js';
import { HudController, OrderType } from './ui/hud.js';
import { ModelManager } from './engine/models.js';
import { Unit } from './entities/unit.js';
import { Building } from './entities/building.js';
import { INITIAL_RESOURCE_NODES } from '@project-exodus/shared/world';
import { POP_MAX, STARTING_RESOURCES } from '@project-exodus/shared/economy';
import { TRAINING_SPECS as SHARED_TRAINING_SPECS } from '@project-exodus/shared/units';
import type { ResourceKind } from '@project-exodus/shared/protocol';

console.log('[Project Exodus] Inicializando motor Three.js RTS com Suporte PBR e Modelos GLTF Reais...');

const canvas = document.getElementById('rts-canvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas #rts-canvas não encontrado no DOM.');

// 1. Cena Three.js com Névoa Atmosférica SUTIL (legibilidade primeiro)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d12);
scene.fog = new THREE.FogExp2(0x0a0d12, 0.0032);

// 2. Renderizador PBR de Alta Performance
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.55;

// 3. Iluminação PBR Cinematográfica (legibilidade unidade × terreno)
const ambientLight = new THREE.AmbientLight(0x4a5568, 1.5);
scene.add(ambientLight);

// Hemisfério: modela o relevo (céu frio × solo quente) sem achatar as unidades
const hemiLight = new THREE.HemisphereLight(0x9db8d9, 0x8a6a45, 0.85);
scene.add(hemiLight);

// Luz Solar Desértica Direcional
const sunLight = new THREE.DirectionalLight(0xffedd5, 3.3);
sunLight.position.set(60, 90, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.bias = -0.0003;
sunLight.shadow.camera.near = 1.0;
sunLight.shadow.camera.far = 200;
const shadowDist = 60;
sunLight.shadow.camera.left = -shadowDist;
sunLight.shadow.camera.right = shadowDist;
sunLight.shadow.camera.top = shadowDist;
sunLight.shadow.camera.bottom = -shadowDist;
scene.add(sunLight);

// Luz de Rebatimento Avermelhada (Poeira de Ferrugem do Solo)
const groundBounceLight = new THREE.DirectionalLight(0x9a3412, 0.6);
groundBounceLight.position.set(-30, -10, -30);
scene.add(groundBounceLight);

// 4. Câmera Isométrica Tática RTS
const aspect = window.innerWidth / window.innerHeight;
const cameraController = new RTSCameraController(canvas, aspect, {
  moveSpeed: 48,
  edgePanMargin: 20,
  minFrustum: 9,
  maxFrustum: 110
});

// 5. Terreno PBR com Shader de Mistura (Multi-Texture Splat Mapping sem Repetição)
const terrainManager = new TerrainManager(scene, 180);

// 5a. Mundo de colisão (Fase 1.12, spec 03): círculos de construções, veios e
// props sólidos. O cliente físico reconstrói a lista no início da partida.
const collisionWorld = new CollisionWorld();

// 5b. Fog of War (exploração do mapa): grade 90×90 client-side
const fogOfWar = new FogOfWar(180);
scene.add(fogOfWar.shroud);

// 5c. FX de partículas (mineração viva: faíscas de coleta, burst de entrega)
const particleFx = new ParticleFx(scene);

// 6. Controlador do HUD (Zero emojis, 100% SVG militar)
const hud = new HudController();
hud.setResources(250, 180, 75, 50);
hud.setPopulation(6, 15);
hud.setEra('I. Era dos Escombros');

// 7. Gerenciador de Seleção RTS
const selectionManager = new SelectionManager(
  cameraController.camera,
  scene,
  canvas,
  {
    onSelectionChanged: (selected) => {
      hud.updateSelection(selected);
      if (selected.length > 0 && selected[0].category === 'UNIT') {
        TacticalAudio.playSelect((selected[0] as Unit).unitType);
      }
    }
  }
);

// 7b. Ordens do HUD, economia local e treinamento (client-authoritative
// TEMPORÁRIO até a Fase 2.6, quando o servidor assume — TODO-2.6)
// Tesouro inicial — fonte única no shared (2.6.2); chaves do HUD.
const resources = {
  rations: STARTING_RESOURCES.RACAO_AGUA,
  scrap: STARTING_RESOURCES.SUCATA,
  chips: STARTING_RESOURCES.CHIPS_IA,
  concrete: STARTING_RESOURCES.CONCRETO,
};
// POP_MAX vem do shared (fonte única desde a 2.6.1).
let rallyPoint = new THREE.Vector3(8, 0, 14);

function unitCount(): number {
  return allEntities.filter((e) => e.category === 'UNIT').length;
}

function refreshTopbar(): void {
  hud.setResources(
    Math.floor(resources.rations),
    Math.floor(resources.scrap),
    Math.floor(resources.chips),
    Math.floor(resources.concrete)
  );
  hud.setPopulation(unitCount(), POP_MAX);
  hud.refreshOrderAvailability();
}

interface TrainingJob {
  id: string;
  unitType: 'SCAVENGER_WORKER' | 'RUST_RAIDER' | 'SCRAP_BUGGY' | 'MAINTENANCE_DRONE' | 'BIPED_MECH';
  label: string;
  totalTime: number;
  elapsed: number;
}
// Custos e tempos vêm do shared (fonte única, decisão D-2.6-A); aqui ficam
// apenas os rótulos de UI — o servidor adota a tabela na 2.6.2.
const TRAINING_SPECS = {
  SCAVENGER_WORKER: { label: 'Catador', ...SHARED_TRAINING_SPECS.SCAVENGER_WORKER },
  RUST_RAIDER: { label: 'Guarda de Ferro', ...SHARED_TRAINING_SPECS.RUST_RAIDER },
  SCRAP_BUGGY: { label: 'Blindado Sucateiro', ...SHARED_TRAINING_SPECS.SCRAP_BUGGY },
  BIPED_MECH: { label: 'Mech Bípede', ...SHARED_TRAINING_SPECS.BIPED_MECH },
  MAINTENANCE_DRONE: { label: 'Droide de Manutenção', ...SHARED_TRAINING_SPECS.MAINTENANCE_DRONE },
} as const;
const RECRUIT_ORDER_TO_TYPE: Record<string, keyof typeof TRAINING_SPECS> = {
  recruit_worker: 'SCAVENGER_WORKER',
  recruit_guard: 'RUST_RAIDER',
  recruit_buggy: 'SCRAP_BUGGY',
  recruit_mech: 'BIPED_MECH',
  recruit_drone: 'MAINTENANCE_DRONE',
};

// Disponibilidade dos botões de recrutamento no HUD (custo + população)
hud.setOrderAvailability((order) => {
  const unitType = RECRUIT_ORDER_TO_TYPE[order];
  if (!unitType) return true;
  if (unitCount() >= POP_MAX) return false;
  return canAfford(TRAINING_SPECS[unitType].cost);
});
let trainingQueue: TrainingJob[] = [];
let trainingSeq = 0;

function canAfford(cost: { rations: number; scrap: number; chips: number; concrete: number }): boolean {
  return (
    resources.rations >= cost.rations &&
    resources.scrap >= cost.scrap &&
    resources.chips >= cost.chips &&
    resources.concrete >= cost.concrete
  );
}

function startTraining(unitType: keyof typeof TRAINING_SPECS): void {
  const spec = TRAINING_SPECS[unitType];
  if (unitCount() >= POP_MAX) {
    hud.pushEvent('aviso', 'Capacidade populacional máxima — construa mais alojamentos (Fase 4)');
    return;
  }
  if (!canAfford(spec.cost)) {
    hud.pushEvent('aviso', `Recursos insuficientes para treinar ${spec.label}`);
    return;
  }
  resources.rations -= spec.cost.rations;
  resources.scrap -= spec.cost.scrap;
  resources.chips -= spec.cost.chips;
  resources.concrete -= spec.cost.concrete;
  trainingSeq += 1;
  trainingQueue.push({ id: `tq_${trainingSeq}`, unitType, label: spec.label, totalTime: spec.time, elapsed: 0 });
  hud.setProductionQueue(
    trainingQueue.map((j) => ({ id: j.id, label: j.label, cost: `${spec.time}s`, progress: j.elapsed / j.totalTime }))
  );
  refreshTopbar();
  hud.pushEvent('info', `Treinamento iniciado: ${spec.label}`);
}

function completeTraining(job: TrainingJob): void {
  const idx = trainingQueue.indexOf(job);
  if (idx >= 0) trainingQueue.splice(idx, 1);
  const n = unitCount() + 1;
  const names: Record<string, string> = {
    SCAVENGER_WORKER: `Catador Recruta #${n}`,
    RUST_RAIDER: `Guarda de Ferro #${n}`,
    SCRAP_BUGGY: `Blindado Sucateiro #${n}`,
    BIPED_MECH: `Mech Bípede #${n}`,
    MAINTENANCE_DRONE: `Droide de Manutenção #${n}`,
  };
  const unit = new Unit(
    `u_t${Date.now().toString(36)}${trainingSeq}`,
    names[job.unitType],
    job.unitType,
    'RUST_WALKERS',
    { x: rallyPoint.x + (Math.random() - 0.5) * 3, z: rallyPoint.z + (Math.random() - 0.5) * 3 }
  );
  scene.add(unit.mesh);
  selectionManager.registerEntity(unit);
  allEntities.push(unit);
  installGatherContext(unit);
  unit.setCollisionWorld(collisionWorld);
  hud.pushEvent('info', `${job.label} pronto para combate`);
  if (trainingQueue.length === 0) {
    hud.clearProductionQueue();
  }
  refreshTopbar();
}

function resolveEntities(ids: string[]): (Unit | Building)[] {
  return ids
    .map((id) => allEntities.find((e) => e.id === id))
    .filter((e): e is Unit | Building => !!e);
}

hud.bindOrderCallbacks({
  onOrder: (order, entityIds) => {
    const entities = resolveEntities(entityIds);
    const units = entities.filter((e): e is Unit => e instanceof Unit);
    const firstUnitType = units[0]?.unitType;
    if (order === 'move') {
      selectionManager.setPendingOrder('move');
      TacticalAudio.playCommand(firstUnitType, 'move');
      hud.pushEvent('sistema', 'Ordem MOVER: clique no destino');
    } else if (order === 'gather') {
      selectionManager.setPendingOrder('gather');
      TacticalAudio.playCommand(firstUnitType, 'gather');
      selectionManager.setPendingOrder('gather');
      hud.pushEvent('sistema', 'Ordem COLETAR: clique num veio de recurso');
    } else if (order === 'stop') {
      for (const u of units) u.stop();
      selectionManager.setPendingOrder(null);
      TacticalAudio.playCommand(firstUnitType, 'stop');
      hud.pushEvent('sistema', 'Ordem PARAR executada');
    } else if (order === 'patrol') {
      selectionManager.setPendingOrder('patrol');
      TacticalAudio.playCommand(firstUnitType, 'patrol');
      hud.pushEvent('sistema', 'PATRULHA: clique no 1º ponto e depois no 2º');
    } else if (order === 'rally') {
      selectionManager.setPendingOrder('rally', (point) => {
        rallyPoint = point.clone();
        hud.pushEvent('sistema', 'Ponto de reunião definido');
      });
      hud.pushEvent('sistema', 'REUNIÃO: clique no ponto de encontro');
    } else if (order in RECRUIT_ORDER_TO_TYPE) {
      startTraining(RECRUIT_ORDER_TO_TYPE[order]);
    } else if (order === 'disperse') {
      const cx = units.reduce((s, u) => s + u.position.x, 0) / Math.max(1, units.length);
      const cz = units.reduce((s, u) => s + u.position.z, 0) / Math.max(1, units.length);
      units.forEach((u, i) => {
        const a = (i / Math.max(1, units.length)) * Math.PI * 2;
        u.moveTo(new THREE.Vector3(cx + Math.cos(a) * 6, 0, cz + Math.sin(a) * 6));
      });
      TacticalAudio.playCommand(firstUnitType, 'disperse');
      hud.pushEvent('sistema', 'Formação dispersada');
    } else if (order === 'attack' || order === 'defend') {
      hud.pushEvent('aviso', 'Sistema de combate chega na Fase 5 — use MOVER por enquanto');
    } else {
      hud.pushEvent('aviso', 'Comando disponível nas próximas fases (construção/pesquisa)');
    }
  },
  onPortraitClick: (entityId) => {
    const entity = allEntities.find((e) => e.id === entityId);
    if (entity) {
      selectionManager.clearSelection();
      selectionManager.selectEntity(entity);
    }
  },
  onCancelProduction: (itemId) => {
    const idx = trainingQueue.findIndex((j) => j.id === itemId);
    if (idx >= 0) {
      const [job] = trainingQueue.splice(idx, 1);
      const spec = TRAINING_SPECS[job.unitType];
      resources.rations += spec.cost.rations;
      resources.scrap += spec.cost.scrap;
      resources.chips += spec.cost.chips;
      resources.concrete += spec.cost.concrete;
      if (trainingQueue.length === 0) hud.clearProductionQueue();
      refreshTopbar();
      hud.pushEvent('sistema', `Treinamento de ${job.label} cancelado (reembolsado)`);
    }
  },
});

// 8. Lista Global de Entidades no Mundo
const allEntities: (Unit | Building)[] = [];
let gameStarted = false;

// 8. Lista Global de Entidades no Mundo
// (declarada abaixo, após o bloco 7b de ordens — ver seção 8)

// 8b. Nós de recurso visuais (espelham server/src/resources.ts — MESMAS
// coordenadas; o servidor assume na Fase 2.6 sem remapear o mapa — TODO-2.6)
import { AssetMaterials } from './engine/textures.js';

type ClientNodeKind = ResourceKind;
interface ClientNode {
  id: string;
  kind: ClientNodeKind;
  x: number;
  z: number;
  amount: number;
  maxAmount: number;
  group: THREE.Group;
  /** Materiais clonados por nó que recebem pulso emissivo durante a coleta. */
  pulseMats: THREE.MeshStandardMaterial[];
  /** Intensidade atual do pulso emissivo (0 = apagado; FX de mineração viva). */
  pulse: number;
}
const KIND_COLORS: Record<ClientNodeKind, number> = {
  RACAO_AGUA: 0x22d3ee,
  SUCATA: 0xf59e0b,
  CHIPS_IA: 0xc084fc,
  CONCRETO: 0x94a3b8,
};
// Layout canônico do shared (2.6.1): mesmas coordenadas que o servidor
// usa — antes esta lista era uma cópia manual de server/src/resources.ts.
const resourceNodes: ClientNode[] = INITIAL_RESOURCE_NODES.map((nd) => ({
  id: nd.id,
  kind: nd.kind,
  x: nd.x,
  z: nd.z,
  amount: nd.amount,
  maxAmount: nd.maxAmount,
  group: new THREE.Group(),
  pulseMats: [],
  pulse: 0,
}));

const nodeRingFades: Array<{
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  node: ClientNode;
  fade: number;
  baseOpacity: number;
}> = [];

// Estado do FX de mineração viva (reutilizado por frame — sem alocação no loop)
const harvestedNodeIds = new Set<string>();
const fxScratch = new THREE.Vector3();

function buildNodeVisual(node: ClientNode): void {
  const mats = AssetMaterials.getInstance();
  const g = node.group;
  const gy = getTerrainHeight(node.x, node.z);
  g.position.set(node.x, gy, node.z);

  // Depleção em estágios: userData.minFrac = item some quando a fração
  // restante fica abaixo; userData.onlyBelowFrac = restos que só aparecem
  // no final; userData.tipBelowFrac/rotZ0 = item tomba quando o veio mingua.
  if (node.kind === 'SUCATA') {
    const scrapMat = mats.rustedMetalMat.clone();
    scrapMat.emissive.setHex(0xff7733);
    scrapMat.emissiveIntensity = 0;
    node.pulseMats.push(scrapMat);
    const thresholds = [0, 0.05, 0.33, 0.66];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1.6 + (i % 2), 1.1, 1.4),
        scrapMat
      );
      m.position.set((i - 1.5) * 1.2, 0.55, ((i * 7) % 3 - 1) * 0.9);
      m.rotation.y = i * 0.7;
      m.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.12;
      m.userData.rotZ0 = m.rotation.z;
      m.userData.minFrac = thresholds[i];
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }
    // Restos rasos de sucata quando o veio quase zera
    for (let i = 0; i < 2; i++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.9), scrapMat);
      d.position.set((i - 0.5) * 2.0, 0.12, (i - 0.5) * 1.4);
      d.rotation.y = i * 1.1;
      d.userData.onlyBelowFrac = 0.34;
      g.add(d);
    }
  } else if (node.kind === 'RACAO_AGUA') {
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1f6f8b, roughness: 0.5, metalness: 0.6 });
    barrelMat.emissive.setHex(0x22d3ee);
    barrelMat.emissiveIntensity = 0;
    node.pulseMats.push(barrelMat);
    const thresholds = [0.05, 0.33, 0.66];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.0, 14), barrelMat);
      m.position.set((i - 1) * 1.9, 1.0, (i % 2) * 1.2);
      m.userData.rotZ0 = 0;
      m.userData.minFrac = thresholds[i];
      // Barril solitário tomba quando o veio míngua
      if (i === 0) m.userData.tipBelowFrac = 0.34;
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }
  } else if (node.kind === 'CHIPS_IA') {
    const serverMat = new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.4, metalness: 0.7 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x0b0b12, emissive: 0xc084fc, emissiveIntensity: 1.6, roughness: 0.4,
    });
    node.pulseMats.push(glowMat);
    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 1.6), serverMat);
    rack.position.y = 1.5;
    rack.castShadow = true;
    g.add(rack);
    // Faixas emissivas apagam de cima para baixo conforme o veio esgota
    const stripThresholds = [0.05, 0.33, 0.66];
    const stripHeights = [2.4, 1.9, 1.4];
    for (let i = 0; i < 3; i++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.25, 1.7), glowMat);
      strip.position.y = stripHeights[i];
      strip.userData.minFrac = stripThresholds[stripThresholds.length - 1 - i]; // topo apaga primeiro
      g.add(strip);
    }
  } else {
    const concreteMat = mats.bunkerConcreteMat.clone();
    concreteMat.emissive.setHex(0xff7733);
    concreteMat.emissiveIntensity = 0;
    node.pulseMats.push(concreteMat);
    const thresholds = [0.05, 0.33, 0.66];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.8), concreteMat);
      m.position.set((i - 1) * 1.7, 0.6, ((i * 5) % 2) * 1.1);
      m.rotation.y = i * 0.5;
      m.userData.minFrac = thresholds[i];
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }
  }

  // Anel marcador do veio (cor do recurso) — só aparece quando a célula do
  // veio já foi explorada (fade-in via nodeRingFades no loop principal)
  const ringGeo = new THREE.RingGeometry(2.6, 3.0, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: KIND_COLORS[node.kind], transparent: true, opacity: 0, depthWrite: false });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.1;
  ring.renderOrder = 9;
  ring.visible = false;
  g.add(ring);
  nodeRingFades.push({ mesh: ring, mat: ringMat, node, fade: 0, baseOpacity: 0.55 });

  // Cilindro de clique invisível e generoso (veio pequeno à distância = difícil de acertar)
  const hitProxy = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5, 4.5, 7, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitProxy.position.y = 3.0;
  g.add(hitProxy);

  g.traverse((child) => {
    child.userData.nodeId = node.id;
  });
  scene.add(g);
}
for (const node of resourceNodes) buildNodeVisual(node);

function refreshNodeVisual(node: ClientNode): void {
  // Depleção em 4 estágios pela fração restante (100%→66%→33%→0):
  // itens somem por threshold, restos aparecem no final, pilha colapsa
  // gradualmente e o anel morre para cinza fraco.
  const frac = node.maxAmount > 0 ? node.amount / node.maxAmount : 0;
  const s = frac <= 0 ? 0.6 : frac <= 0.33 ? 0.82 : frac <= 0.66 ? 0.92 : 1;
  node.group.scale.set(s, s, s);
  for (const child of node.group.children) {
    const minFrac = child.userData.minFrac as number | undefined;
    if (minFrac !== undefined) child.visible = frac > minFrac;
    const onlyBelow = child.userData.onlyBelowFrac as number | undefined;
    if (onlyBelow !== undefined) child.visible = frac <= onlyBelow;
    const tipBelow = child.userData.tipBelowFrac as number | undefined;
    if (tipBelow !== undefined && child.visible) {
      child.rotation.z = frac <= tipBelow ? 1.15 : (child.userData.rotZ0 as number | undefined) ?? 0;
    }
  }
  const fade = nodeRingFades.find((f) => f.node === node);
  if (fade) fade.baseOpacity = frac > 0 ? 0.55 : 0.12;
}

// Raycast de clique nos veios (instalado no SelectionManager)
const nodeRaycaster = new THREE.Raycaster();
const nodeNdc = new THREE.Vector2();
selectionManager.setNodePicker((clientX, clientY) => {
  nodeNdc.x = (clientX / window.innerWidth) * 2 - 1;
  nodeNdc.y = -(clientY / window.innerHeight) * 2 + 1;
  nodeRaycaster.setFromCamera(nodeNdc, cameraController.camera);
  const groups = resourceNodes.filter((n) => n.amount > 0).map((n) => n.group);
  const hits = nodeRaycaster.intersectObjects(groups, true);
  for (const hit of hits) {
    let obj: THREE.Object3D | null = hit.object;
    while (obj) {
      const nodeId = obj.userData?.nodeId as string | undefined;
      if (nodeId) return nodeId;
      obj = obj.parent;
    }
  }
  return null;
});

// Contexto de coleta das unidades (servidor assume na 2.6 — TODO-2.6)
let firstDeliveryDone = false;
const KIND_TO_RES: Record<ClientNodeKind, 'rations' | 'scrap' | 'chips' | 'concrete'> = {
  RACAO_AGUA: 'rations',
  SUCATA: 'scrap',
  CHIPS_IA: 'chips',
  CONCRETO: 'concrete',
};
const KIND_LABEL: Record<ClientNodeKind, string> = {
  RACAO_AGUA: 'RAÇÕES',
  SUCATA: 'SUCATA',
  CHIPS_IA: 'CHIPS',
  CONCRETO: 'CONCRETO',
};
function installGatherContext(unit: Unit): void {
  unit.setGatherContext({
    getNode: (id) => {
      const n = resourceNodes.find((r) => r.id === id);
      return n ? { x: n.x, z: n.z, kind: n.kind, amount: n.amount } : null;
    },
    takeFromNode: (id, wanted) => {
      const n = resourceNodes.find((r) => r.id === id);
      if (!n || n.amount <= 0) return 0;
      const taken = Math.min(wanted, n.amount);
      n.amount -= taken;
      refreshNodeVisual(n);
      return taken;
    },
    dropPoint: () => {
      const cc = allEntities.find((e) => e.category === 'BUILDING');
      return cc ? { x: cc.position.x + 4, z: cc.position.z + 2 } : { x: 0, z: -2 };
    },
    deposit: (kind, amount) => {
      const nodeKind = kind as ClientNodeKind;
      const key = KIND_TO_RES[nodeKind];
      if (!key) return;
      resources[key] += amount;
      refreshTopbar();
      if (!firstDeliveryDone) {
        firstDeliveryDone = true;
        hud.pushEvent('info', `Primeira entrega: +${amount} ${KIND_LABEL[nodeKind]} no Centro de Comando`);
      }
      // FX de entrega: burst de partículas + texto flutuante + cue sonoro
      const cc = allEntities.find((e) => e.category === 'BUILDING');
      const dx = cc ? cc.position.x + 4 : 0;
      const dz = cc ? cc.position.z + 2 : -2;
      const dy = getTerrainHeight(dx, dz);
      const color = KIND_COLORS[nodeKind];
      particleFx.burst({
        x: dx, y: dy + 1.4, z: dz, count: 18, color,
        speed: 2.6, spread: 1.0, life: 0.7, upBias: 1.4,
      });
      particleFx.spawnText(`+${amount} ${KIND_LABEL[nodeKind]}`, dx, dy + 2.6, dz, `#${color.toString(16).padStart(6, '0')}`);
      TacticalAudio.playEffect('deposit');
    },
    notify: (text) => hud.pushEvent('aviso', text),
  });
}

// Carimbo de build honesto (CRIT-02): constante injetada pelo Vite em tempo
// de build (`client/vite.config.ts`). A versão anterior usava
// `document.lastModified`, que sem header `Last-Modified` retorna a hora do
// teste — nunca a do build. Inútil contra o bug de cache da Sessão 6.
declare const __BUILD_STAMP__: string;
{
  const tag = document.querySelector('.hud-tag');
  if (tag) {
    tag.textContent = `MIL-SPEC 0.2.0 · BUILD ${__BUILD_STAMP__}`;
  }
}

// 9. Minimapa Tático (thumbnail real do relevo + cliques funcionais)
const minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
const minimapCtx = minimapCanvas?.getContext('2d');

// Overlay de fog do minimapa (90×90, mesma grade lógica do FogOfWar;
// redesenhado só quando a grade muda — refreshMinimapFog no loop)
const minimapFog = document.createElement('canvas');
{
  minimapFog.width = 90;
  minimapFog.height = 90;
  const fctx = minimapFog.getContext('2d')!;
  fctx.fillStyle = 'rgba(3, 5, 9, 0.97)';
  fctx.fillRect(0, 0, 90, 90);
}

function refreshMinimapFog(): void {
  const fctx = minimapFog.getContext('2d')!;
  const img = fctx.createImageData(90, 90);
  for (let gz = 0; gz < 90; gz++) {
    for (let gx = 0; gx < 90; gx++) {
      const st = fogOfWar.state[gz * 90 + gx];
      const i = (gz * 90 + gx) * 4;
      if (st === 0) {
        // Desconhecido: preto quase opaco
        img.data[i] = 3; img.data[i + 1] = 5; img.data[i + 2] = 9; img.data[i + 3] = 247;
      } else if (st === 1) {
        // Explorado: escurecido ~50%
        img.data[i] = 3; img.data[i + 1] = 5; img.data[i + 2] = 9; img.data[i + 3] = 128;
      }
      // Visível (2): pixel transparente (já zero no ImageData)
    }
  }
  fctx.putImageData(img, 0, 0);
}

// Thumbnail do relevo pré-renderizada uma vez (rampa de altura → cor tática)
const minimapTerrain = document.createElement('canvas');
{
  const S = 160;
  minimapTerrain.width = S;
  minimapTerrain.height = S;
  const tctx = minimapTerrain.getContext('2d')!;
  const img = tctx.createImageData(S, S);
  const mapSize = 180;
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      const wx = (px / S) * mapSize - mapSize / 2;
      const wz = (py / S) * mapSize - mapSize / 2;
      const h = getTerrainHeight(wx, wz);
      // Rampa: valas fundas → areia base → cristas claras; platô com tom próprio
      const t = THREE.MathUtils.clamp((h + 5) / 10, 0, 1);
      const r = Math.round(28 + t * 72);
      const g = Math.round(22 + t * 52);
      const b = Math.round(18 + t * 30);
      const i = (py * S + px) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  tctx.putImageData(img, 0, 0);

  // Overlay de densidade de props: pontos escuros por cima do relevo
  // (posições determinísticas exportadas pelo sistema de props).
  tctx.fillStyle = 'rgba(12, 10, 8, 0.85)';
  for (const p of terrainManager.worldProps.positions) {
    const px = ((p.x + mapSize / 2) / mapSize) * S;
    const py = ((p.z + mapSize / 2) / mapSize) * S;
    tctx.fillRect(px - 1, py - 1, 2, 2);
  }
}

function updateMinimap(): void {
  if (!minimapCtx || !minimapCanvas) return;
  const w = minimapCanvas.width;
  const h = minimapCanvas.height;
  const mapSize = 180;

  // Fundo = relevo real (não mais quadrado preto decorativo)
  if (minimapTerrain.width > 0) {
    minimapCtx.drawImage(minimapTerrain, 0, 0, w, h);
  } else {
    minimapCtx.fillStyle = '#05070a';
    minimapCtx.fillRect(0, 0, w, h);
  }

  // Fog of War: cobre o relevo conforme a grade (desconhecido preto,
  // explorado ao meio, visível limpo)
  if (minimapFog.width > 0) {
    minimapCtx.imageSmoothingEnabled = true;
    minimapCtx.drawImage(minimapFog, 0, 0, w, h);
  }

  // Grade tática
  minimapCtx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
  minimapCtx.lineWidth = 1;
  minimapCtx.beginPath();
  minimapCtx.moveTo(w / 2, 0);
  minimapCtx.lineTo(w / 2, h);
  minimapCtx.moveTo(0, h / 2);
  minimapCtx.lineTo(w, h / 2);
  minimapCtx.stroke();

  // Entidades
  for (const entity of allEntities) {
    const mx = ((entity.position.x + mapSize / 2) / mapSize) * w;
    const my = ((entity.position.z + mapSize / 2) / mapSize) * h;

    if (entity.category === 'BUILDING') {
      minimapCtx.fillStyle = entity.isSelected ? '#ffffff' : '#f59e0b';
      minimapCtx.fillRect(mx - 3.5, my - 3.5, 7, 7);
    } else {
      minimapCtx.fillStyle = entity.isSelected ? '#ffffff' : '#06b6d4';
      minimapCtx.beginPath();
      minimapCtx.arc(mx, my, 2.5, 0, Math.PI * 2);
      minimapCtx.fill();
    }
  }

  // Veios de recurso (losangos por tipo; esgotado = cinza vazado) — só em
  // células já exploradas
  const NODE_COLORS: Record<string, string> = {
    RACAO_AGUA: '#22d3ee',
    SUCATA: '#f59e0b',
    CHIPS_IA: '#c084fc',
    CONCRETO: '#94a3b8',
  };
  for (const node of resourceNodes) {
    if (!fogOfWar.isExploredAt(node.x, node.z)) continue;
    const nx = ((node.x + mapSize / 2) / mapSize) * w;
    const ny = ((node.z + mapSize / 2) / mapSize) * h;
    const depleted = node.amount <= 0;
    minimapCtx.fillStyle = depleted ? '#3a3f47' : (NODE_COLORS[node.kind] ?? '#ffffff');
    minimapCtx.beginPath();
    minimapCtx.moveTo(nx, ny - 4);
    minimapCtx.lineTo(nx + 4, ny);
    minimapCtx.lineTo(nx, ny + 4);
    minimapCtx.lineTo(nx - 4, ny);
    minimapCtx.closePath();
    minimapCtx.fill();
  }

  // Caixa de Viewport da Câmera
  const cx = ((cameraController.target.x + mapSize / 2) / mapSize) * w;
  const cy = ((cameraController.target.z + mapSize / 2) / mapSize) * h;
  minimapCtx.strokeStyle = '#10b981';
  minimapCtx.lineWidth = 1.5;
  minimapCtx.strokeRect(cx - 14, cy - 10, 28, 20);
}

// Navegação e ordens pelo minimapa — FONTE ÚNICA via HudController
// (o handler próprio antigo foi removido: ele duplicava o movimento de câmera).
// Clique esquerdo: move a câmera. Botão direito: ordem de movimento + ping.
if (minimapCanvas) {
  minimapCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
  hud.bindMinimap(minimapCanvas, {
    onMoveCamera: (nx, ny) => {
      const { x: worldX, z: worldZ } = HudController.minimapToWorld(nx, ny, 180);
      cameraController.setTarget({ x: worldX, z: worldZ });
    },
    onIssueOrder: (nx, ny) => {
      const { x: worldX, z: worldZ } = HudController.minimapToWorld(nx, ny, 180);
      const before = selectionManager.selectedEntities.length;
      selectionManager.issueMoveOrder(new THREE.Vector3(worldX, 0, worldZ));
      if (before > 0) {
        hud.addPing('move', nx, ny);
        hud.pushEvent('info', `Ordem de movimento via radar (${Math.round(worldX)}, ${Math.round(worldZ)})`);
      }
    }
  });
}

// 10. Orquestração da Aplicação (Menu Principal, Loading, Lore e Início do Jogo)
const menuOverlay = document.getElementById('main-menu-overlay')!;
const loadingOverlay = document.getElementById('loading-overlay')!;
const loadingBarFill = document.getElementById('loading-bar-fill')!;
const loadingStatusText = document.getElementById('loading-status-text')!;
const loadingPercent = document.getElementById('loading-percent')!;

const hudTop = document.getElementById('hud-topbar')!;
const hudBottom = document.getElementById('hud-bottombar')!;

const btnStartGame = document.getElementById('btn-start-game')!;
const btnOpenLore = document.getElementById('btn-open-lore')!;
const btnCloseLore = document.getElementById('btn-close-lore')!;
const loreModal = document.getElementById('lore-modal')!;

const btnOpenControls = document.getElementById('btn-open-controls')!;
const btnCloseControls = document.getElementById('btn-close-controls')!;
const controlsModal = document.getElementById('controls-modal')!;

const btnOpenMenuInGame = document.getElementById('btn-open-menu-ingame')!;

/**
 * Reconstrói os obstáculos de colisão (Fase 1.12, spec 03): construções +
 * veios (estáticos) + props sólidos do cenário. Chamado no início da partida.
 */
function rebuildCollisionWorld(): void {
  const list: CircleObstacle[] = [];
  for (const e of allEntities) {
    if (e instanceof Building) {
      list.push({
        x: e.position.x,
        z: e.position.z,
        radius: BUILDING_COLLISION_RADIUS[e.buildingType] ?? 5,
        kind: 'building',
        id: e.id,
      });
    }
  }
  for (const n of resourceNodes) {
    list.push({ x: n.x, z: n.z, radius: NODE_COLLISION_RADIUS, kind: 'node', id: n.id });
  }
  for (const p of terrainManager.worldProps.obstacles) {
    list.push({ x: p.x, z: p.z, radius: p.radius, kind: 'prop' });
  }
  collisionWorld.setObstacles(list);
}

// Inicialização da Operação de Combate com Pré-Carregamento Assíncrono de Modelos GLTF
async function startCombatOperation(): Promise<void> {
  // 1. Exibe tela de carregamento tática
  menuOverlay.classList.add('hidden');
  loadingOverlay.classList.remove('hidden');

  const modelManager = ModelManager.getInstance();

  await modelManager.preloadAll((pct, modelName) => {
    loadingBarFill.style.width = `${pct}%`;
    loadingPercent.textContent = `${pct}%`;
    loadingStatusText.textContent = `Carregando ativo: ${modelName}`;
  });

  // 2. Cria as estruturas e unidades com os modelos GLTF reais
  if (allEntities.length === 0) {
    // Centro de Comando
    const commandCenter = new Building(
      'bld_cc_1',
      'Posto Central de Comando',
      'COMMAND_CENTER',
      'RUST_WALKERS',
      { x: 0, z: -2 }
    );
    scene.add(commandCenter.mesh);
    selectionManager.registerEntity(commandCenter);
    allEntities.push(commandCenter);

    // Refinaria de Sucata
    const refinery = new Building(
      'bld_ref_1',
      'Fundição de Sucata',
      'SCRAP_REFINERY',
      'RUST_WALKERS',
      { x: -16, z: 2 }
    );
    refinery.mesh.rotation.y = Math.PI / 6;
    scene.add(refinery.mesh);
    selectionManager.registerEntity(refinery);
    allEntities.push(refinery);

    // Bunker com Torreta Dupla
    const turret = new Building(
      'bld_tur_1',
      'Bunker de Sentinela',
      'BUNKER_TURRET',
      'RUST_WALKERS',
      { x: 16, z: 2 }
    );
    turret.mesh.rotation.y = -Math.PI / 6;
    scene.add(turret.mesh);
    selectionManager.registerEntity(turret);
    allEntities.push(turret);

    // 3 Trabalhadores Catadores
    const worker1 = new Unit('u_w1', 'Catador Alfa', 'SCAVENGER_WORKER', 'RUST_WALKERS', { x: -6, z: 8 });
    const worker2 = new Unit('u_w2', 'Catador Beta', 'SCAVENGER_WORKER', 'RUST_WALKERS', { x: -3, z: 9 });
    const worker3 = new Unit('u_w3', 'Catador Gama', 'SCAVENGER_WORKER', 'RUST_WALKERS', { x: 0, z: 9 });

    // 2 Atiradores de Infantaria
    const soldier1 = new Unit('u_s1', 'Guarda de Ferro #1', 'RUST_RAIDER', 'RUST_WALKERS', { x: 6, z: 8 });
    const soldier2 = new Unit('u_s2', 'Guarda de Ferro #2', 'RUST_RAIDER', 'RUST_WALKERS', { x: 9, z: 8 });

    // 1 Blindado de Reconhecimento
    const buggy = new Unit('u_v1', 'Blindado Sucateiro', 'SCRAP_BUGGY', 'RUST_WALKERS', { x: 13, z: 9 });

    // 1 Droide de Manutenção (civil) e 1 Mech Bípede (pesado)
    const drone = new Unit('u_d1', 'Droide de Manutenção Alfa', 'MAINTENANCE_DRONE', 'RUST_WALKERS', { x: 3, z: 11 });
    const mech = new Unit('u_m1', 'Mech Bípede Vigia', 'BIPED_MECH', 'RUST_WALKERS', { x: 17, z: 11 });

    const units = [worker1, worker2, worker3, soldier1, soldier2, buggy, drone, mech];
    for (const u of units) {
      scene.add(u.mesh);
      selectionManager.registerEntity(u);
      allEntities.push(u);
      installGatherContext(u);
    }

    // Fase 1.12: colisão da base + veios + props, conectada a cada unidade.
    rebuildCollisionWorld();
    for (const u of units) u.setCollisionWorld(collisionWorld);
  }

  // 3. Oculta carregamento e revela HUD in-game
  loadingOverlay.classList.add('hidden');
  hudTop.classList.remove('hidden');
  hudBottom.classList.remove('hidden');
  gameStarted = true;
  refreshTopbar();
  hud.pushEvent('sistema', 'Operação iniciada — Era dos Escombros');
  hud.pushEvent('info', 'Botão direito: mover. Botões: Mover, Parar, Patrulha e Recrutar funcionais');

  // Centraliza imediatamente na base inicial (Centro de Comando)
  cameraController.setTarget({ x: 0, z: 4 }, true);
}

btnStartGame.addEventListener('click', () => {
  startCombatOperation();
});

// Modal de Controles
btnOpenControls.addEventListener('click', () => {
  controlsModal.classList.remove('hidden');
});
btnCloseControls.addEventListener('click', () => {
  controlsModal.classList.add('hidden');
});

// Modal de Lore (Crônicas da Queda)
const loreCache: Record<number, any> = {};

async function loadLoreEra(eraId: number): Promise<void> {
  if (!loreCache[eraId]) {
    try {
      const res = await fetch(`/assets/lore/era-${eraId}-lore.json`);
      loreCache[eraId] = await res.json();
    } catch (e) {
      console.warn(`[Lore] Falha ao carregar era-${eraId}-lore.json:`, e);
      return;
    }
  }

  const data = loreCache[eraId];
  if (!data) return;

  const dateEl = document.getElementById('lore-date');
  const authorEl = document.getElementById('lore-author');
  const transcriptEl = document.getElementById('lore-transcript');
  const bodyEl = document.getElementById('lore-body');
  const breakthroughEl = document.getElementById('lore-breakthrough');

  if (dateEl) dateEl.textContent = data.historicalLogDate || 'DATA DESCONHECIDA';
  if (authorEl) authorEl.textContent = data.author || 'FONTE NÃO IDENTIFICADA';
  if (transcriptEl) transcriptEl.textContent = data.radioTranscript || '...';
  if (bodyEl) bodyEl.textContent = data.historicalContext || '...';
  if (breakthroughEl) breakthroughEl.textContent = data.technologicalBreakthrough || '...';
}

btnOpenLore.addEventListener('click', () => {
  loreModal.classList.remove('hidden');
  loadLoreEra(1);
  TacticalAudio.playBriefing(1);
});

btnCloseLore.addEventListener('click', () => {
  loreModal.classList.add('hidden');
});

// Abas de Eras no Modal de Lore
const eraTabs = document.querySelectorAll('.lore-tab');
eraTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    eraTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const eraId = parseInt(tab.getAttribute('data-era') || '1', 10);
    loadLoreEra(eraId);
    TacticalAudio.playBriefing(eraId);
  });
});

// Botão In-Game para Retornar ao Menu
btnOpenMenuInGame.addEventListener('click', () => {
  if (menuOverlay.classList.contains('hidden')) {
    menuOverlay.classList.remove('hidden');
    hudTop.classList.add('hidden');
    hudBottom.classList.add('hidden');
  } else {
    menuOverlay.classList.add('hidden');
    hudTop.classList.remove('hidden');
    hudBottom.classList.remove('hidden');
  }
});

// 11. Loop Principal de Animação e Renderização
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);

  // Deriva cinemática lenta da câmera no menu principal
  if (!gameStarted && !menuOverlay.classList.contains('hidden')) {
    cameraController.target.x = Math.sin(Date.now() * 0.0003) * 10;
    cameraController.target.z = Math.cos(Date.now() * 0.0003) * 10;
    cameraController.target.y = getTerrainHeight(cameraController.target.x, cameraController.target.z);
  }

  // Atualiza controles da câmera
  cameraController.update(delta);

  // Atualiza entidades (animações esqueléticas, movimentação, fumaça, torreta)
  for (const entity of allEntities) {
    entity.update(delta);
  }

  // Fase 1.12: separação unidade×unidade (soft-body determinístico por id).
  const liveUnits = allEntities.filter((e): e is Unit => e instanceof Unit);
  if (liveUnits.length > 1) {
    const bodies: SoftBodyLike[] = liveUnits.map((u) => ({
      id: u.id,
      x: u.mesh.position.x,
      z: u.mesh.position.z,
      radius: u.collisionRadius,
      offset: (dx: number, dz: number) => u.applyPhysicsPush(dx, dz),
    }));
    separateUnits(bodies);
    // O empurrão pode ter jogado alguém para dentro de um obstáculo do mundo:
    // re-resolve sem mover (custo baixo, garante invariante do gate 1.12).
    for (const u of liveUnits) u.resolveStaticCollision();
  }

  // Avança fila de treinamento local (TEMPORÁRIO até o servidor — TODO-2.6)
  if (trainingQueue.length > 0) {
    const job = trainingQueue[0];
    job.elapsed += delta;
    hud.updateProductionProgress(Math.min(1, job.elapsed / job.totalTime), job.label);
    if (job.elapsed >= job.totalTime) {
      completeTraining(job);
    }
  }

  // Atualiza desvanecimento de cliques
  selectionManager.update(delta);

  // Fog of War: recalcula a grade com throttle interno (~250ms)
  const fogChanged = fogOfWar.update(
    allEntities.map((e) => ({ x: e.position.x, z: e.position.z, sightRadius: e.sightRadius }))
  );
  if (fogChanged) refreshMinimapFog();

  // Anéis dos veios: fade-in conforme a célula é explorada
  for (const f of nodeRingFades) {
    const target = fogOfWar.isExploredAt(f.node.x, f.node.z) ? 1 : 0;
    f.fade += (target - f.fade) * Math.min(1, 4 * delta);
    f.mesh.visible = f.fade > 0.02;
    f.mat.opacity = f.baseOpacity * f.fade;
  }

  // Mineração viva: pulso emissivo + faíscas no veio sob colheita.
  // Fog gate: só há FX quando a célula está visível — nada vaza pelo shroud.
  harvestedNodeIds.clear();
  for (const entity of allEntities) {
    if (entity instanceof Unit && entity.harvestNodeId) {
      harvestedNodeIds.add(entity.harvestNodeId);
    }
  }
  for (const node of resourceNodes) {
    const active = harvestedNodeIds.has(node.id) && fogOfWar.isVisibleAt(node.x, node.z);
    const target = active ? 0.5 + 0.35 * Math.sin(clock.elapsedTime * 7) : 0;
    node.pulse += (target - node.pulse) * Math.min(1, 6 * delta);
    for (const mat of node.pulseMats) mat.emissiveIntensity = node.pulse;
    if (active) {
      // Emissor acima da pilha: as faíscas nascem no ponto de contato e
      // ficam visíveis mesmo com o modelo alto (não são ocluídas pelas caixas).
      fxScratch.set(node.x, getTerrainHeight(node.x, node.z) + 1.7, node.z);
      particleFx.setEmitter(`node_${node.id}`, {
        position: fxScratch,
        color: KIND_COLORS[node.kind],
        rate: 18,
      });
    } else {
      particleFx.clearEmitter(`node_${node.id}`);
    }
  }
  particleFx.update(delta);

  // Atualiza minimapa se o jogo estiver ativo
  if (gameStarted) {
    updateMinimap();
  }

  renderer.render(scene, cameraController.camera);
}

animate();

// 12b. Handle de debug para o harness de validação visual (tools/visual-check).
// Expõe cena e entidades para medição (Box3) e screenshots automatizados.
(window as unknown as { __rts: unknown }).__rts = {
  scene,
  cameraController,
  selectionManager,
  fogOfWar,
  audio: TacticalAudio,
  // Apoio ao harness de teste (não usar em gameplay): injeta recursos
  debugAddResources: (amounts: Partial<typeof resources>) => {
    for (const key of ['rations', 'scrap', 'chips', 'concrete'] as const) {
      if (amounts[key]) resources[key] += amounts[key]!;
    }
    refreshTopbar();
  },
  // Apoio ao harness de teste (não usar em gameplay): força a depleção de um
  // veio para fotografar os 4 estágios visuais.
  debugSetNodeAmount: (id: string, amount: number) => {
    const n = resourceNodes.find((x) => x.id === id);
    if (!n) return;
    n.amount = THREE.MathUtils.clamp(amount, 0, n.maxAmount);
    refreshNodeVisual(n);
  },
  getEntities: () => allEntities,
  isGameStarted: () => gameStarted,
  getResources: () => ({ ...resources }),
  getNodes: () => resourceNodes.map((n) => ({ id: n.id, kind: n.kind, amount: n.amount })),
  // Fase 1.12 — apoio ao harness de colisão (spec 03)
  getObstacles: () =>
    collisionWorld.list().map((o) => ({ x: o.x, z: o.z, radius: o.radius, kind: o.kind, id: o.id })),
  getUnitStates: () =>
    allEntities
      .filter((e): e is Unit => e instanceof Unit)
      .map((u) => ({
        id: u.id,
        type: u.unitType,
        radius: u.collisionRadius,
        x: +u.mesh.position.x.toFixed(3),
        z: +u.mesh.position.z.toFixed(3),
      })),
  // Apoio ao harness (não usar em gameplay): emite MOVE programático.
  debugOrderMove: (id: string, x: number, z: number) => {
    const u = allEntities.find((e): e is Unit => e instanceof Unit && e.id === id);
    if (!u) return false;
    u.moveTo(new THREE.Vector3(x, getTerrainHeight(x, z), z));
    return true;
  },
  // Box3 só do modelo GLTF (children[0] = modelInstance.scene), sem a
  // poluição do anel de seleção e da barra de HP — usado p/ calibração.
  measureModel: (id: string) => {
    const e = allEntities.find((x) => x.id === id);
    if (!e || e.mesh.children.length === 0) return null;
    const box = new THREE.Box3().setFromObject(e.mesh.children[0]);
    const size = box.getSize(new THREE.Vector3());
    return {
      sizeY: +size.y.toFixed(3),
      minY: +box.min.y.toFixed(3),
      maxY: +box.max.y.toFixed(3),
    };
  },
  measure: () =>
    allEntities.map((e) => {
      const box = new THREE.Box3().setFromObject(e.mesh);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      return {
        id: e.id,
        type: (e as Unit).unitType ?? (e as Building).buildingType,
        pos: { x: +e.position.x.toFixed(2), y: +e.position.y.toFixed(2), z: +e.position.z.toFixed(2) },
        size: { x: +size.x.toFixed(2), y: +size.y.toFixed(2), z: +size.z.toFixed(2) },
        centerY: +center.y.toFixed(2),
        minY: +box.min.y.toFixed(2),
      };
    }),
};

// Atalhos de teclado: mesmos caminhos dos botões do HUD (triggerOrder).
// Recrutar (Q/W/E/R/T) exige o CC selecionado; ordens de unidade aplicam
// à seleção atual. Ignorado com menu/modais abertos ou foco em input.
const RECRUIT_HOTKEYS: Record<string, OrderType> = {
  q: 'recruit_worker',
  w: 'recruit_guard',
  e: 'recruit_buggy',
  r: 'recruit_mech',
  t: 'recruit_drone',
};
const ORDER_HOTKEYS: Record<string, OrderType> = {
  m: 'move',
  s: 'stop',
  p: 'patrol',
  g: 'gather',
  x: 'disperse',
  d: 'defend',
};
window.addEventListener('keydown', (ev) => {
  if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
  if (!gameStarted) return;
  if (!menuOverlay.classList.contains('hidden')) return;
  if (!loreModal.classList.contains('hidden') || !controlsModal.classList.contains('hidden')) return;

  const key = ev.key.toLowerCase();
  const recruitOrder = RECRUIT_HOTKEYS[key];
  if (recruitOrder) {
    const ccSelected = selectionManager.selectedEntities.some(
      (e) => e instanceof Building && e.buildingType === 'COMMAND_CENTER'
    );
    if (ccSelected) hud.triggerOrder(recruitOrder);
    return;
  }
  const unitOrder = ORDER_HOTKEYS[key];
  if (unitOrder && selectionManager.selectedEntities.length > 0) {
    hud.triggerOrder(unitOrder);
  }
});

// 12. Redimensionamento Responsivo
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  cameraController.handleResize();
});

console.log('[Project Exodus] Sistema Operacional. Menu Principal e Shaders PBR ativos.');
