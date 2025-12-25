import * as THREE from 'three';
import { ParticleData } from '../types';

export const COLORS = {
  GREEN: new THREE.Color('#2F5A47'),
  GOLD: new THREE.Color('#FFD700'),
  RED: new THREE.Color('#C41E3A'),
  WHITE: new THREE.Color('#FFFFFF')
};

// Generate positions for a spiral cone (Christmas Tree)
export const generateTreeLayout = (count: number, photoUrls: string[]): ParticleData[] => {
  const particles: ParticleData[] = [];
  const height = 18; // Slightly taller
  const bottomRadius = 7;
  
  // Golden Angle in radians (approx 137.5 degrees)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)); 

  for (let i = 0; i < count; i++) {
    const isPhoto = i < photoUrls.length;
    const y = (i / count) * height; // 0 to height
    const inverseY = 1 - (y / height); // 1 at bottom, 0 at top
    
    // Use Golden Angle for even distribution regardless of count
    // Multiply i by a larger factor for photos to ensure they spread out if count is low
    const angle = i * goldenAngle; 
    
    const radius = bottomRadius * inverseY + (Math.random() * 0.5);
    
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Tree Position (Home)
    const treePos = new THREE.Vector3(x, y - height / 2, z);
    
    // Exploded Position (Random Sphere)
    const explodeRadius = 25;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const exX = explodeRadius * Math.sin(phi) * Math.cos(theta);
    const exY = explodeRadius * Math.sin(phi) * Math.sin(theta);
    const exZ = explodeRadius * Math.cos(phi);
    const explodedPos = new THREE.Vector3(exX, exY, exZ);

    // Color & Type
    let type: 'SPHERE' | 'CUBE' | 'PHOTO' = 'SPHERE';
    let color = COLORS.GREEN;
    
    if (isPhoto) {
      type = 'PHOTO';
      color = COLORS.WHITE;
    } else {
      const rand = Math.random();
      if (rand > 0.9) {
        type = 'CUBE';
        color = COLORS.GOLD;
      } else if (rand > 0.7) {
        color = COLORS.RED;
      } else if (rand > 0.6) {
        color = COLORS.GOLD;
      }
    }

    particles.push({
      id: i,
      position: explodedPos.clone(),
      targetPosition: treePos.clone(),
      treePosition: treePos,
      explodedPosition: explodedPos,
      rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
      scale: isPhoto ? 1.5 : Math.random() * 0.3 + 0.1,
      color: color,
      type: type,
      textureUrl: isPhoto ? photoUrls[i] : undefined
    });
  }
  return particles;
};