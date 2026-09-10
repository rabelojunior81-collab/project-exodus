import * as THREE from 'three';
import { heightAtLocal } from './terrainHeight.js';
import { spawnWorldProps, type WorldProps } from './props.js';

export class TerrainManager {
  public terrainMesh: THREE.Mesh;
  public environmentGroup: THREE.Group;
  public worldProps: WorldProps;

  constructor(scene: THREE.Scene, size: number = 180) {
    // 1. Carrega as 3 Texturas Fotorrealistas Distintas para o Splat Blending
    const loader = new THREE.TextureLoader();
    
    const texDirt = loader.load('/assets/textures/terrain-diffuse.jpg');
    texDirt.wrapS = texDirt.wrapT = THREE.RepeatWrapping;
    texDirt.colorSpace = THREE.SRGBColorSpace;

    const texGravel = loader.load('/assets/textures/rocky-gravel.jpg');
    texGravel.wrapS = texGravel.wrapT = THREE.RepeatWrapping;
    texGravel.colorSpace = THREE.SRGBColorSpace;

    const texRust = loader.load('/assets/textures/rust-sand.jpg');
    texRust.wrapS = texRust.wrapT = THREE.RepeatWrapping;
    texRust.colorSpace = THREE.SRGBColorSpace;

    // 2. Cria Geometria de Alta Densidade com Relevo Variado
    const terrainGeo = new THREE.PlaneGeometry(size, size, 128, 128);
    const posAttr = terrainGeo.attributes.position;

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      // Fonte única de verdade: mesma função usada pelas entidades
      // para assentar unidades e efeitos sobre o relevo.
      const height = heightAtLocal(x, y);
      posAttr.setZ(i, height);
    }
    terrainGeo.computeVertexNormals();

    // 3. Material PBR com Shader de Mistura (Multi-Texture Splat Mapping sem Repetição)
    const terrainMat = new THREE.MeshStandardMaterial({
      roughness: 0.88,
      metalness: 0.15
    });

    terrainMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTexDirt = { value: texDirt };
      shader.uniforms.uTexGravel = { value: texGravel };
      shader.uniforms.uTexRust = { value: texRust };

      shader.vertexShader = `
        varying vec3 vWorldPos;
        ${shader.vertexShader}
      `.replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

      shader.fragmentShader = `
        uniform sampler2D uTexDirt;
        uniform sampler2D uTexGravel;
        uniform sampler2D uTexRust;
        varying vec3 vWorldPos;
        ${shader.fragmentShader}
      `.replace(
        '#include <map_fragment>',
        `
        // Amostragens de textura em escalas totalmente distintas para quebrar qualquer padrão repetitivo
        vec2 uv1 = vWorldPos.xz * 0.08;
        vec2 uv2 = vWorldPos.xz * 0.05;
        vec2 uv3 = vWorldPos.xz * 0.12;

        vec4 cDirt = texture2D(uTexDirt, uv1);
        vec4 cGravel = texture2D(uTexGravel, uv2);
        vec4 cRust = texture2D(uTexRust, uv3);

        // Pesos de mistura baseados em ruído espacial de grande comprimento de onda (40-60 metros)
        float n1 = sin(vWorldPos.x * 0.035) * cos(vWorldPos.z * 0.035) * 0.5 + 0.5;
        float n2 = sin(vWorldPos.x * 0.07 + vWorldPos.z * 0.06) * 0.5 + 0.5;

        float wDirt = clamp(n1 * 1.5 - 0.2, 0.0, 1.0);
        float wGravel = clamp((1.0 - n1) * n2 * 1.8, 0.0, 1.0);
        float wRust = clamp(1.0 - wDirt - wGravel, 0.0, 1.0);
        float totalW = max(0.001, wDirt + wGravel + wRust);

        vec4 finalDiffuse = (cDirt * wDirt + cGravel * wGravel + cRust * wRust) / totalW;
        diffuseColor *= finalDiffuse;
        `
      );
    };

    this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrainMesh.rotation.x = -Math.PI / 2;
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.name = 'TERRAIN_GROUND';
    scene.add(this.terrainMesh);

    // 4. Props procedurais do cenário (ruínas, destroços, escombros) via
    // biblioteca instanciada determinística — substitui o antigo kit de
    // ~50 clusters não instanciados de spawnEnvironmentKit.
    this.worldProps = spawnWorldProps(scene, size);
    this.environmentGroup = this.worldProps.group;
  }
}
