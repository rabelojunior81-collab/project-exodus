/**
 * measure-facing.mjs — direção de "frente" de cada modelo + inspeção de gears.
 * Compõe matrizes dos nós (bind pose) e compara centroides de partes
 * dianteiras com o centro do corpo. Math puro (three só p/ Matrix4).
 */
import * as THREE from 'three';
import { readFileSync } from 'node:fs';

function loadGLB(path) {
  const buf = readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
  const bin = buf.subarray(20 + jsonLen + 8);
  return { json, bin };
}

function nodeMatrix(n) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...(n.translation || [0, 0, 0])),
    new THREE.Quaternion(...(n.rotation || [0, 0, 0, 1])),
    new THREE.Vector3(...(n.scale || [1, 1, 1]))
  );
}

function worldMatrices(json) {
  const nodes = json.nodes || [];
  const parent = new Array(nodes.length).fill(-1);
  nodes.forEach((n, i) => (n.children || []).forEach((c) => (parent[c] = i)));
  const cache = {};
  const wm = (i) => {
    if (cache[i]) return cache[i];
    const m = parent[i] >= 0 ? wm(parent[i]).clone().multiply(nodeMatrix(nodes[i])) : nodeMatrix(nodes[i]);
    cache[i] = m;
    return m;
  };
  nodes.forEach((_, i) => wm(i));
  return cache;
}

function meshInfo(json, bin, meshIdx) {
  const prim = json.meshes[meshIdx].primitives[0];
  const acc = json.accessors[prim.attributes.POSITION];
  const bv = json.bufferViews[acc.bufferView];
  const arr = new Float32Array(bin.buffer, bin.byteOffset + (bv.byteOffset || 0) + (acc.byteOffset || 0), acc.count * 3);
  const c = new THREE.Vector3();
  for (let i = 0; i < acc.count; i++) c.add(new THREE.Vector3(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]));
  c.multiplyScalar(1 / acc.count);
  const size = acc.max.map((v, k) => v - acc.min[k]);
  return { centroid: c, count: acc.count, size };
}

function analyze(path, meshParts, nodeParts) {
  console.log('=====', path.split('/').pop(), '=====');
  const { json, bin } = loadGLB(path);
  const wm = worldMatrices(json);
  const meshNode = {};
  (json.nodes || []).forEach((n, i) => { if (n.mesh !== undefined) meshNode[n.mesh] = i; });
  const P = {};
  for (const [label, mi] of Object.entries(meshParts)) {
    const { centroid, count, size } = meshInfo(json, bin, mi);
    const w = centroid.clone().applyMatrix4(wm[meshNode[mi]]);
    P[label] = w;
    console.log(label, `mesh${mi}`, 'verts', count, 'localsize', size.map((v) => +v.toFixed(3)), 'world', w.toArray().map((v) => +v.toFixed(3)));
  }
  for (const [label, ni] of Object.entries(nodeParts)) {
    const w = new THREE.Vector3().setFromMatrixPosition(wm[ni]);
    P[label] = w;
    console.log(label, `node${ni}`, 'world', w.toArray().map((v) => +v.toFixed(3)));
  }
  for (const [a, b] of [['visor', 'head'], ['toeL', 'footL'], ['footL', 'hips'], ['gun', 'body'], ['turret', 'body'], ['head', 'body'], ['sword', 'body'], ['weapon', 'body']]) {
    if (P[a] && P[b]) {
      const d = P[a].clone().sub(P[b]);
      console.log(` dir ${a}-${b}: xz=(${d.x.toFixed(2)},${d.z.toFixed(2)})`);
    }
  }
}

const M = (nodes, name) => nodes.findIndex((n) => n.name === name);

// Soldier: visor vs cabeça; dedo do pé vs calcanhar
{
  const { json } = loadGLB('/Users/adilsonrrabelojunior/Desktop/game-rts/client/public/assets/models/Soldier.glb');
  analyze('/Users/adilsonrrabelojunior/Desktop/game-rts/client/public/assets/models/Soldier.glb',
    { visor: 1, body: 0 },
    { head: M(json.nodes, 'mixamorig:Head'), toeL: M(json.nodes, 'mixamorig:LeftToe_End'), footL: M(json.nodes, 'mixamorig:LeftFoot'), hips: M(json.nodes, 'mixamorig:Hips') });
}
// Character: cabeça/pés/espada/arma vs corpo (corpo = cubos?)
{
  const { json } = loadGLB('/Users/adilsonrrabelojunior/Desktop/game-rts/client/public/assets/models/Character.glb');
  analyze('/Users/adilsonrrabelojunior/Desktop/game-rts/client/public/assets/models/Character.glb',
    { sword: 0, cubeA: 1, cubeB: 2, cubeC: 3 },
    { head: M(json.nodes, 'Head'), body: M(json.nodes, 'Body'), hips: M(json.nodes, 'Hips'), weapon: M(json.nodes, 'Weapon'), footL: M(json.nodes, 'Foot.L'), toeL: M(json.nodes, 'Foot.L_end') });
}
// Tank: cano vs corpo
{
  const { json } = loadGLB('/Users/adilsonrrabelojunior/Desktop/game-rts/client/public/assets/models/Combat_Tank.glb');
  analyze('/Users/adilsonrrabelojunior/Desktop/game-rts/client/public/assets/models/Combat_Tank.glb',
    { gun: 0, body: 1, turret: 2 },
    {});
}
