import * as THREE from 'three';

export class AssetMaterials {
  private static instance: AssetMaterials;
  private loader: THREE.TextureLoader = new THREE.TextureLoader();

  public terrainMat!: THREE.MeshStandardMaterial;
  public rustedMetalMat!: THREE.MeshStandardMaterial;
  public bunkerConcreteMat!: THREE.MeshStandardMaterial;
  public hazardStripeMat!: THREE.MeshStandardMaterial;
  public darkSteelMat!: THREE.MeshStandardMaterial;
  public glowCyanMat!: THREE.MeshBasicMaterial;
  public glowAmberMat!: THREE.MeshBasicMaterial;
  public glowGreenMat!: THREE.MeshBasicMaterial;
  public glowRedMat!: THREE.MeshBasicMaterial;

  private constructor() {
    this.initMaterials();
  }

  public static getInstance(): AssetMaterials {
    if (!AssetMaterials.instance) {
      AssetMaterials.instance = new AssetMaterials();
    }
    return AssetMaterials.instance;
  }

  private initMaterials(): void {
    // 1. Textura do Terreno PBR Fotorrealista
    const terrainTex = this.loader.load('/assets/textures/terrain-diffuse.jpg');
    terrainTex.wrapS = THREE.RepeatWrapping;
    terrainTex.wrapT = THREE.RepeatWrapping;
    terrainTex.repeat.set(16, 16);
    terrainTex.colorSpace = THREE.SRGBColorSpace;

    this.terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTex,
      bumpMap: terrainTex,
      bumpScale: 0.35,
      roughness: 0.85,
      metalness: 0.12
    });

    // 2. Textura de Metal Blindado e Enferrujado
    const metalTex = this.loader.load('/assets/textures/rusted-metal.jpg');
    metalTex.wrapS = THREE.RepeatWrapping;
    metalTex.wrapT = THREE.RepeatWrapping;
    metalTex.repeat.set(2, 2);
    metalTex.colorSpace = THREE.SRGBColorSpace;

    this.rustedMetalMat = new THREE.MeshStandardMaterial({
      map: metalTex,
      bumpMap: metalTex,
      bumpScale: 0.22,
      roughness: 0.52,
      metalness: 0.88
    });

    // 3. Textura de Concreto de Bunker Militar com Marcas de Bala e Rebar
    const concreteTex = this.loader.load('/assets/textures/bunker-concrete.jpg');
    concreteTex.wrapS = THREE.RepeatWrapping;
    concreteTex.wrapT = THREE.RepeatWrapping;
    concreteTex.repeat.set(2, 2);
    concreteTex.colorSpace = THREE.SRGBColorSpace;

    this.bunkerConcreteMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      bumpMap: concreteTex,
      bumpScale: 0.38,
      roughness: 0.92,
      metalness: 0.08
    });

    // 4. Aço Escuro Estrutural (Armações, Vigas, Canos)
    this.darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1f2429,
      roughness: 0.4,
      metalness: 0.92
    });

    // 5. Faixa de Perigo Amarelo/Preto (Hazard Stripes)
    const hazardCanvas = document.createElement('canvas');
    hazardCanvas.width = 128;
    hazardCanvas.height = 128;
    const hCtx = hazardCanvas.getContext('2d')!;
    hCtx.fillStyle = '#eab308';
    hCtx.fillRect(0, 0, 128, 128);
    hCtx.fillStyle = '#111827';
    hCtx.beginPath();
    for (let i = -128; i < 256; i += 32) {
      hCtx.moveTo(i, 0);
      hCtx.lineTo(i + 32, 128);
      hCtx.lineTo(i + 16, 128);
      hCtx.lineTo(i - 16, 0);
    }
    hCtx.fill();
    const hazardTex = new THREE.CanvasTexture(hazardCanvas);
    hazardTex.wrapS = THREE.RepeatWrapping;
    hazardTex.wrapT = THREE.RepeatWrapping;
    hazardTex.repeat.set(4, 1);
    this.hazardStripeMat = new THREE.MeshStandardMaterial({
      map: hazardTex,
      roughness: 0.5,
      metalness: 0.4
    });

    // 6. Materiais Emissivos para Bloom (Luzes, Lasers, Beacons)
    this.glowCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    this.glowAmberMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.glowGreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    this.glowRedMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
  }
}
