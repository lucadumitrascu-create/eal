'use client';

import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export type CardData = { url: string; texture: string; title: string };

// Tight, nearly-frontal cluster (modelled on tasteskill.dev): cards sit almost
// square to the camera with only a few degrees of tilt, big and overlapping.
// Depth comes from the slight Z layering + soft shadows, NOT from perspective.
type Slot = { position: [number, number, number]; rotation: [number, number, number] };
const SLOTS: Slot[] = [
  { position: [-1.45, 0.45, -0.1], rotation: [0.05, 0.08, 0.025] },
  { position: [-1.3, -0.46, 0.42], rotation: [0.05, -0.06, -0.03] },
  { position: [1.45, 0.5, -0.15], rotation: [0.04, -0.09, 0.02] },
  { position: [1.3, -0.42, 0.5], rotation: [0.05, 0.10, -0.03] },
];

const reduceMotion =
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A real 3D card: a rounded box with a little thickness (visible on one edge
// since the cards are nearly frontal), the site screenshot on the front face.
// It rests near-square to the camera, floats gently, and on hover tilts a touch
// toward the cursor (added on top of its small base angle) + lifts.
function Card({ data, index, slot }: { data: CardData; index: number; slot: Slot }) {
  const g = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const texture = useTexture(data.texture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const { mouse } = useThree();
  const [bx, by, bz] = slot.rotation;

  useFrame((state) => {
    const m = g.current;
    if (!m) return;
    if (reduceMotion) {
      m.rotation.set(bx, by, bz);
      m.position.y = slot.position[1];
      const s = hovered ? 1.04 : 1;
      m.scale.setScalar(m.scale.x + (s - m.scale.x) * 0.2);
      return;
    }
    const t = state.clock.elapsedTime;
    m.position.y = slot.position[1] + Math.sin(t * 0.55 + index * 1.6) * 0.06;
    // small cursor-follow tilt on hover, on top of the base angle; tiny wobble at rest
    const addX = hovered ? -mouse.y * 0.14 : Math.sin(t * 0.4 + index) * 0.015;
    const addY = hovered ? mouse.x * 0.18 : Math.cos(t * 0.3 + index) * 0.02;
    m.rotation.x += (bx + addX - m.rotation.x) * 0.08;
    m.rotation.y += (by + addY - m.rotation.y) * 0.08;
    m.rotation.z += (bz - m.rotation.z) * 0.08;
    const s = hovered ? 1.05 : 1;
    m.scale.setScalar(m.scale.x + (s - m.scale.x) * 0.1);
  });

  return (
    <group position={slot.position}>
      <group
        ref={g}
        rotation={slot.rotation}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
        onClick={() => window.open(data.url, '_blank', 'noopener,noreferrer')}
      >
        {/* Card body — subtle thickness, rounded corners */}
        <RoundedBox args={[3.05, 1.72, 0.14]} radius={0.05} smoothness={4} castShadow>
          <meshStandardMaterial color="#16161c" roughness={0.5} metalness={0} />
        </RoundedBox>
        {/* Front face with the site screenshot, just in front of the box */}
        <mesh position={[0, 0, 0.075]}>
          <planeGeometry args={[2.97, 1.64]} />
          <meshStandardMaterial map={texture} roughness={0.55} metalness={0} />
        </mesh>
      </group>
    </group>
  );
}

function Scene({ cards }: { cards: CardData[] }) {
  return (
    <>
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#ffffff', '#aab8d0', 0.5]} />
      <directionalLight
        position={[2, 4.5, 5.5]}
        intensity={1.15}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-radius={12}
        shadow-bias={-0.0006}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <directionalLight position={[-5, 2, 3]} intensity={0.35} color="#8ab4ff" />

      {cards.map((c, i) => (
        <Card key={c.url} data={c} index={i} slot={SLOTS[i % SLOTS.length]} />
      ))}

      {/* Transparent shadow catcher just behind the cluster -> soft shadows sit
          close behind the cards, like they float a few cm off a back wall. */}
      <mesh position={[0, -0.05, -0.85]} receiveShadow>
        <planeGeometry args={[26, 16]} />
        <shadowMaterial transparent opacity={0.26} />
      </mesh>
    </>
  );
}

export default function ProjectsScene({ cards }: { cards: CardData[] }) {
  return (
    <div className="relative w-full" style={{ height: 'clamp(420px, 50vw, 600px)' }}>
      <Canvas
        // Frontal, slightly above. A longer lens (low fov + camera pulled back)
        // keeps the cards looking square to the camera instead of skewed.
        camera={{ position: [0, 0.55, 8.2], fov: 30 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
        shadows={{ type: THREE.VSMShadowMap }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene cards={cards} />
        </Suspense>
      </Canvas>

      {/* Keyboard/screen-reader accessible links (the 3D meshes aren't focusable). */}
      <nav aria-label="Projects" className="sr-only">
        {cards.map((c) => (
          <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer">
            Open {c.title}
          </a>
        ))}
      </nav>
    </div>
  );
}
