import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Environment, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';
import { AppState, HandGesture, ParticleData } from '../types';
import { generateTreeLayout, COLORS } from '../utils/math';

interface SceneProps {
  appState: AppState;
  gesture: HandGesture;
  photos: string[];
}

// Reusable component for a specific shape group
const ParticleGroup: React.FC<{ 
  data: ParticleData[], 
  appState: AppState, 
  gesture: HandGesture,
  geometry: React.ReactNode 
}> = ({ data, appState, gesture, geometry }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Dummy object for calculating matrices
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // Use refs for animation smoothing
  const currentPositions = useRef(data.map(p => p.position.clone()));

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    let i = 0;
    for (const particle of data) {
      let target: THREE.Vector3;
      let scale = particle.scale;

      // Logic State Machine
      if (appState === AppState.TREE) {
        target = particle.treePosition;
      } else if (appState === AppState.EXPLODED) {
        target = particle.explodedPosition;
        
        // Gentle float noise
        target = target.clone().add(new THREE.Vector3(
           Math.sin(state.clock.elapsedTime + particle.id) * 0.5,
           Math.cos(state.clock.elapsedTime * 0.8 + particle.id) * 0.5,
           0
        ));
      } else { // FOCUS
        target = particle.explodedPosition.clone().multiplyScalar(1.5); 
      }

      // Interpolate Position
      currentPositions.current[i].lerp(target, delta * 3);

      // Apply to Dummy
      dummy.position.copy(currentPositions.current[i]);
      
      // Rotate objects
      dummy.rotation.x += delta * 0.2;
      dummy.rotation.y += delta * 0.1;
      
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, particle.color);
      
      i++;
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, data.length]}
    >
      {geometry}
      <meshStandardMaterial 
        toneMapped={false}
        roughness={0.3}
        metalness={0.6}
        envMapIntensity={1}
      />
    </instancedMesh>
  );
};

// Separate component for Photos
const PhotoCloud: React.FC<{ particles: ParticleData[], appState: AppState, gesture: HandGesture }> = ({ particles, appState, gesture }) => {
    // Only render if we have particles
    if (particles.length === 0) return null;

    return (
        <group>
            {particles.map((p, index) => (
                <SinglePhoto key={`photo-${p.id}-${index}`} particle={p} appState={appState} gesture={gesture} />
            ))}
        </group>
    );
};

const SinglePhoto: React.FC<{ particle: ParticleData, appState: AppState, gesture: HandGesture }> = ({ particle, appState }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    // Load texture manually to avoid Suspense issues in this structure
    const texture = useMemo(() => {
        if (!particle.textureUrl) return null;
        const tex = new THREE.TextureLoader().load(particle.textureUrl);
        // Ensure standard encoding for consistency
        tex.colorSpace = THREE.SRGBColorSpace; 
        return tex;
    }, [particle.textureUrl]);

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        let target = particle.treePosition;
        let scale = 1.5;
        
        if (appState === AppState.EXPLODED) {
            target = particle.explodedPosition;
            // Add gentle floating motion
            target.add(new THREE.Vector3(0, Math.sin(state.clock.elapsedTime + particle.id) * 0.5, 0));
        } else if (appState === AppState.FOCUS) {
             // Example focus logic based on ID
             const isFocusTarget = (particle.id % 5 === 0); 
             
             if (isFocusTarget) {
                 // Move significantly closer to camera (z=25) and scale up
                 target = new THREE.Vector3(0, 0, 15);
                 scale = 6; 
                 meshRef.current.lookAt(state.camera.position);
             } else {
                 // Push others back and shrink slightly
                 target = particle.explodedPosition.clone().multiplyScalar(1.5);
                 scale = 1.0; 
             }
        }

        // Smooth position transition
        meshRef.current.position.lerp(target, delta * 3);
        
        // Smooth scale transition with easing (lower factor = smoother/heavier)
        meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), delta * 2);
        
        // Handle Rotation
        if (appState === AppState.FOCUS) {
             const isFocusTarget = (particle.id % 5 === 0);
             if (isFocusTarget) {
                 // Already handled in logic block for immediate lookAt, 
                 // but ensure it sticks if we didn't use lookAt there.
                 meshRef.current.lookAt(state.camera.position);
             } else {
                 meshRef.current.lookAt(0, 0, 30);
             }
        } else {
             // Always face viewer in Tree/Exploded modes
             meshRef.current.lookAt(0, 0, 30);
        }
    });

    return (
        <mesh ref={meshRef} position={particle.treePosition}>
            {/* Photo Plane - Moved slightly forward to ensure visibility */}
            <planeGeometry args={[1, 1]} />
            {texture ? (
                 <meshBasicMaterial map={texture} side={THREE.DoubleSide} transparent />
            ) : (
                 <meshBasicMaterial color="#333" side={THREE.DoubleSide} /> 
            )}
            
            {/* Gold Frame - Moved backward to prevent Z-fighting/occlusion */}
            {/* Box depth is 0.05. Center at -0.05 means front face is at -0.025, which is behind the photo plane at 0 */}
            <mesh position={[0, 0, -0.05]}>
                <boxGeometry args={[1.1, 1.1, 0.05]} />
                <meshStandardMaterial color={COLORS.GOLD} metalness={0.9} roughness={0.2} />
            </mesh>
        </mesh>
    );
};

const CameraController: React.FC<{ appState: AppState, gesture: HandGesture }> = ({ appState, gesture }) => {
    const { camera } = useThree();
    
    useFrame((state, delta) => {
        if (appState === AppState.EXPLODED) {
           const targetX = (gesture.handPosition.x - 0.5) * 8;
           const targetY = (gesture.handPosition.y - 0.5) * 8;
           
           camera.position.x += (targetX - camera.position.x) * delta * 2;
           camera.position.y += (targetY - camera.position.y) * delta * 2;
           camera.lookAt(0, 0, 0);
        } else if (appState === AppState.TREE) {
            camera.position.lerp(new THREE.Vector3(0, 0, 25), delta);
            camera.lookAt(0, 0, 0);
        }
    });
    return null;
}

const ChristmasScene: React.FC<SceneProps> = ({ appState, gesture, photos }) => {
  const ornamentCount = 400;
  // Memoize ornaments so they don't regenerate
  const ornaments = useMemo(() => generateTreeLayout(ornamentCount, []), []);

  const sphereOrnaments = useMemo(() => ornaments.filter(p => p.type === 'SPHERE'), [ornaments]);
  const cubeOrnaments = useMemo(() => ornaments.filter(p => p.type === 'CUBE'), [ornaments]);
  
  // Memoize photos particles. Ensure ID uniqueness by offset or just treatment.
  const photoParticles = useMemo(() => {
     if (photos.length === 0) return [];
     const raw = generateTreeLayout(photos.length, photos);
     // Offset ID to ensure no animation sync issues if that was a factor, though separate meshes handle it fine.
     return raw.map((p, i) => ({ 
         ...p, 
         id: i + 10000, // Safe offset
         type: 'PHOTO' as const, 
         scale: 1.5 
     }));
  }, [photos]);

  return (
    <Canvas 
      camera={{ position: [0, 0, 25], fov: 45 }}
      gl={{ antialias: false, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#051015']} />
      
      <CameraController appState={appState} gesture={gesture} />
      
      <ambientLight intensity={0.5} color="#ffffff" />
      <directionalLight position={[0, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[10, 5, 10]} intensity={1} color="#ffd700" />
      <pointLight position={[-10, -5, 10]} intensity={0.5} color="#ff0000" />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
         <ParticleGroup 
            data={sphereOrnaments} 
            appState={appState} 
            gesture={gesture} 
            geometry={<sphereGeometry args={[0.3, 32, 32]} />} 
         />
         
         <ParticleGroup 
            data={cubeOrnaments} 
            appState={appState} 
            gesture={gesture} 
            geometry={<boxGeometry args={[0.45, 0.45, 0.45]} />} 
         />
         
         <PhotoCloud particles={photoParticles} appState={appState} gesture={gesture} />
      </Float>

      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.8} mipmapBlur intensity={1.2} radius={0.5} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
      
      <Environment preset="city" />
    </Canvas>
  );
};

export default ChristmasScene;