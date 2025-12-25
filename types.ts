import * as THREE from 'three';

export enum AppState {
  TREE = 'TREE',
  EXPLODED = 'EXPLODED',
  FOCUS = 'FOCUS'
}

export type ParticleData = {
  id: number;
  position: THREE.Vector3; // Current position
  targetPosition: THREE.Vector3; // Where it wants to go
  treePosition: THREE.Vector3; // Its home in the tree
  explodedPosition: THREE.Vector3; // Its random spot
  rotation: THREE.Euler;
  scale: number;
  color: THREE.Color;
  type: 'SPHERE' | 'CUBE' | 'PHOTO';
  textureUrl?: string;
};

export interface HandGesture {
  isFist: boolean;
  isOpenPalm: boolean;
  isPinching: boolean;
  handPosition: { x: number; y: number }; // Normalized 0-1
  rotation: number;
}
