import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface ModelInstance {
  scene: THREE.Group;
  mixer?: THREE.AnimationMixer;
  actions?: Record<string, THREE.AnimationAction>;
  currentAction?: string;
  setAnimation?: (name: string, duration?: number) => void;
  update?: (delta: number) => void;
}

export type ScaleOption = number | { targetHeight?: number; scale?: number };

export class ModelManager {
  private static instance: ModelManager;
  private loader: GLTFLoader = new GLTFLoader();
  private cache: Map<string, GLTF> = new Map();
  private isLoaded: boolean = false;

  private constructor() {}

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  public get ready(): boolean {
    return this.isLoaded;
  }

  public async preloadAll(
    onProgress?: (progressPct: number, currentModelName: string) => void
  ): Promise<void> {
    if (this.isLoaded) {
      if (onProgress) onProgress(100, 'Modelos em Cache');
      return;
    }

    const modelsToLoad = [
      { key: 'soldier', name: 'Infantaria de Assalto (Soldier)', url: '/assets/models/soldier.glb' },
      { key: 'character', name: 'Catador / Engenheiro (Character)', url: '/assets/models/character.glb' },
      { key: 'robot', name: 'Robô de Logística (RobotExpressive)', url: '/assets/models/robot-expressive.glb' },
      { key: 'tank', name: 'Blindado de Combate (Combat_Tank)', url: '/assets/models/combat-tank.glb' },
      { key: 'mech_2legs', name: 'Mech Bípede de Combate (Enemy_2Legs)', url: '/assets/models/enemy-2-legs.glb' },
      { key: 'turret', name: 'Torreta Dupla Balística (Turret_GunDouble)', url: '/assets/models/turret-gun-double.glb' },
      { key: 'command_center', name: 'Centro de Comando Tático (Building1_Large)', url: '/assets/models/building-1-large.glb' },
      { key: 'refinery', name: 'Fundição & Refinaria de Sucata (Building2_Large)', url: '/assets/models/building-2-large.glb' },
      { key: 'bunker', name: 'Casamata Fortificada Bunker (Building4)', url: '/assets/models/building-4.glb' }
    ];

    const total = modelsToLoad.length;
    let completed = 0;

    console.log(`[ModelManager] Iniciando carregamento de ${total} modelos 3D GLTF reais...`);

    for (const item of modelsToLoad) {
      try {
        if (onProgress) {
          const pct = Math.round((completed / total) * 100);
          onProgress(pct, item.name);
        }

        const gltf = await this.loadGLTF(item.url);

        // NOTA (Sessão 4): o antigo "Hips fix" (subtrair baseZ do track Z)
        // foi REMOVIDO — medição em cena provou que ele enterrava o Soldier
        // ~1.5m no solo: o valor Z do Hips em bone-local é a ALTURA do quadril
        // (~106cm no Mixamo), não um offset de exportação. Sem o fix, o modelo
        // volta a assentar os pés em y=0.

        this.cache.set(item.key, gltf);
        completed++;
        console.log(`[ModelManager] ✓ [${completed}/${total}] '${item.key}' carregado e calibrado.`);

        if (onProgress) {
          const pct = Math.round((completed / total) * 100);
          onProgress(pct, item.name);
        }
      } catch (err) {
        console.warn(`[ModelManager] Erro ao carregar '${item.key}':`, err);
        completed++;
      }
    }

    this.isLoaded = true;
    if (onProgress) onProgress(100, 'Todos os modelos 3D prontos.');
  }

  private loadGLTF(url: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.loader.load(url, resolve, undefined, reject);
    });
  }

  /**
   * Instancia um modelo 3D clonado com escala precisa e controle de animações estáveis
   */
  public createInstance(
    key: string,
    scaleOrOptions: ScaleOption = 1.0
  ): ModelInstance | null {
    const gltf = this.cache.get(key);
    if (!gltf) {
      console.warn(`[ModelManager] Modelo '${key}' não encontrado no cache!`);
      return null;
    }

    let finalScale = 1.0;
    if (typeof scaleOrOptions === 'number') {
      finalScale = scaleOrOptions;
    } else if (scaleOrOptions && typeof scaleOrOptions.scale === 'number') {
      finalScale = scaleOrOptions.scale;
    } else if (scaleOrOptions && typeof scaleOrOptions.targetHeight === 'number') {
      const h = scaleOrOptions.targetHeight;
      if (key === 'command_center') finalScale = h / 4.67;
      else if (key === 'refinery') finalScale = h / 5.91;
      else if (key === 'bunker') finalScale = h / 5.48;
      else if (key === 'turret') finalScale = h / 0.58;
      else if (key === 'character') finalScale = h / 1.37;
      else if (key === 'soldier') finalScale = h / 1.7;
      else if (key === 'tank') finalScale = h / 0.83;
      else finalScale = 1.0;
    }

    if (isNaN(finalScale) || finalScale <= 0) {
      finalScale = 1.0;
    }

    // Clona hierarquia de esqueletos e malhas sem conflito de ossos
    const clonedScene = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    clonedScene.scale.set(finalScale, finalScale, finalScale);

    // Remove attachments degenerados do Character (medido via
    // tools/visual-check/measure-facing.mjs): a malha 'Sword' tem bbox de
    // tamanho ZERO (192 vértices coincidentes) e rasteriza como glitch
    // flutuante ao lado do corpo. Corpo real = Cube.000/007/009.
    if (key === 'character') {
      clonedScene.traverse((child) => {
        if (child.name === 'Sword') child.visible = false;
      });
    }

    // Grounding + recentragem do veículo: o Combat_Tank chega com offset
    // de exportação (armature deslocada) e esteiras fora do solo. Mede a
    // bounding box real em bind pose e ancora min.y no solo, centro em x/z.
    if (key === 'tank') {
      clonedScene.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(clonedScene);
      if (!bbox.isEmpty()) {
        const center = bbox.getCenter(new THREE.Vector3());
        clonedScene.position.x -= center.x;
        clonedScene.position.z -= center.z;
        clonedScene.position.y -= bbox.min.y;
      }
    }

    // Habilita sombras de alta qualidade e ajuste PBR em cada malha
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const m = (child as THREE.Mesh).material;
        if (m && (m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          (m as THREE.MeshStandardMaterial).roughness = THREE.MathUtils.clamp(
            (m as THREE.MeshStandardMaterial).roughness,
            0.35,
            0.85
          );
        }
      }
    });

    // Se o modelo possuir animações esqueléticas
    if (gltf.animations && gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(clonedScene);
      const actions: Record<string, THREE.AnimationAction> = {};

      for (const clip of gltf.animations) {
        const action = mixer.clipAction(clip);
        actions[clip.name] = action;

        const nameLower = clip.name.toLowerCase();

        // Mapeamento semântico priorizado para evitar substituição por clipes incorretos
        if (clip.name === 'CharacterArmature|Idle_Neutral' || clip.name === 'Idle' || (!actions['idle'] && nameLower.includes('idle'))) {
          actions['idle'] = action;
        }
        if (clip.name === 'CharacterArmature|Run' || clip.name === 'Run' || (!actions['run'] && nameLower.includes('run') && !nameLower.includes('shoot') && !nameLower.includes('back'))) {
          actions['run'] = action;
        }
        if (clip.name === 'CharacterArmature|Walk' || clip.name === 'Walk' || (!actions['walk'] && nameLower.includes('walk'))) {
          actions['walk'] = action;
        }
        if (clip.name === 'CharacterArmature|Gun_Shoot' || (!actions['shoot'] && nameLower.includes('shoot'))) {
          actions['shoot'] = action;
        }
        // Colheita (CharacterArmature|Interact): toca durante o estado harvest
        if (!actions['harvest'] && nameLower.includes('interact')) {
          actions['harvest'] = action;
        }
        // Ataque mapeado sem gatilho (wire no combate — Fase 5)
        if (!actions['attack'] && nameLower.includes('|attack')) {
          actions['attack'] = action;
        }
        // Clipes do Combat_Tank (TankArmature|Tank_Forward etc.): esteiras em movimento
        if (!actions['run'] && (nameLower.includes('forward') || nameLower.includes('advance'))) {
          actions['run'] = action;
        }
        if (!actions['walk'] && nameLower.includes('backward')) {
          actions['walk'] = action;
        }
      }

      // Toca 'idle' por padrão; se o modelo não tem idle (ex: tank), congela
      // o primeiro clipe no frame 0 para não tocar animação de movimento parado.
      const firstClipName = Object.keys(actions)[0];
      const initialAction = actions['idle'] || actions[firstClipName];
      let initialName = 'idle';
      if (initialAction) {
        if (!actions['idle']) {
          initialName = firstClipName;
          initialAction.play();
          initialAction.paused = true;
        } else {
          initialAction.play();
        }
      }

      const instance: ModelInstance = {
        scene: clonedScene,
        mixer,
        actions,
        currentAction: initialName,
        setAnimation: (name: string, transitionDuration: number = 0.2) => {
          const next = actions[name];
          const prev = actions[instance.currentAction || ''];
          // Modelo sem o clipe pedido (ex: tank sem 'idle'): apenas
          // interrompe a animação atual em vez de travar em pose de movimento.
          if (!next) {
            if (prev && instance.currentAction !== '') {
              prev.fadeOut(transitionDuration);
              instance.currentAction = '';
            }
            return;
          }
          if (instance.currentAction === name) return;

          if (prev) {
            prev.fadeOut(transitionDuration);
          }
          next.reset().fadeIn(transitionDuration).play();
          instance.currentAction = name;
        },
        update: (delta: number) => {
          mixer.update(delta);
        }
      };

      return instance;
    }

    return {
      scene: clonedScene
    };
  }
}
