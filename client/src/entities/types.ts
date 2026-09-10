import * as THREE from 'three';

export type FactionType = 'RUST_WALKERS' | 'IRON_VAULT' | 'SILICON_DISCIPLES' | 'NEUTRAL';
export type EntityCategory = 'UNIT' | 'BUILDING' | 'RESOURCE_NODE';

export interface SelectableEntity {
  id: string;
  name: string;
  category: EntityCategory;
  faction: FactionType;
  health: number;
  maxHealth: number;
  position: THREE.Vector3;
  mesh: THREE.Object3D;
  selectionRadius: number;
  isSelected: boolean;
  
  setSelected(selected: boolean): void;
  update(delta: number): void;
}
