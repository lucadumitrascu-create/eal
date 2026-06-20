'use client';

import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export type CardData = { url: string; texture: string; title: string };

// Scatter positions for up to 4 cards: x spread, varied height + depth.
const POSITIONS: [number, number, number][] = [
  [-3.7, 0.5, -0.4],
  [-1.25, -0.35, 0.5],
  [1.25, 0.35, 0.15],
  [3.7, -0.45, -0.55],
];

const reduceMotion =
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A real 3D card: a rounded box with thickness, the site screenshot on the
// front face, ambient float, hover tilt-toward-mouse + lift, click -> link.
function Card({ data, index, position }: { data: CardData; index: number; position: [number, number, number] }) {
  const g = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const texture = useTexture(data.texture);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const { mouse } = useThree();

  useFrame((state) => {
    const m = g.current;
    if (!m) return;
    if (reduceMotion) {
      m.rotation.x = 0.03 * Math.sin(index);
      m.rotation.y = 0.06 * Math.cos(index);
      m.position.y = position[1];
      const s = hovered ? 1.05 : 1;
      m.scale.setScalar(m.scale.x + (s - m.scale.x) * 0.2);
      return;
    }
    const t = state.clock.elapsedTime;
    m.position.y = position[1] + Math.sin(t * 0.6 + index * 1.5) * 0.12;
    const targetRotX = hovered ? -mouse.y * 0.35 : Math.sin(t * 0.4 + index) * 0.04;
    const targetRotY = hovered ? mouse.x * 0.45 : Math.cos(t * 0.3 + index) * 0.06;
    m.rotation.x += (targetRotX - m.rotation.x) * 0.08;
    m.rotation.y += (targetRotY - m.rotation.y) * 0.08;
    const targetScale = hovered ? 1.08 : 1;
    m.scale.setScalar(m.scale.x + (targetScale - m.scale.x) * 0.1);
  });

  return (
    <group position={position}>
      <group
        ref={g}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
        onClick={() => window.open(data.url, '_blank', 'noopener,noreferrer')}
      >
        {/* Card body — real thickness, rounded corners */}
        <RoundedBox args={[2.4, 1.35, 0.1]} radius={0.05} smoothness={4}>
          <meshStandardMaterial color="#16161c" roughness={0.45} metalness={0} />
        </RoundedBox>
        {/* Front face with the site screenshot, just in front of the box */}
        <mesh position={[0, 0, 0.052]}>
          <planeGeometry args={[2.32, 1.28]} />
          <meshStandardMaterial map={texture} roughness={0.55} metalness={0} />
        </mesh>
      </group>
    </group>
  );
}

function Scene({ cards }: { cards: CardData[] }) {
  return (
    <>
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#ffffff', '#9fb6d6', 0.5]} />
      <directionalLight position={[5, 6, 6]} intensity={1.3} />
      <directionalLight position={[-6, 3, 2]} intensity={0.45} color="#8ab4ff" />
      {cards.map((c, i) => (
        <Card key={c.url} data={c} index={i} position={POSITIONS[i % POSITIONS.length]} />
      ))}
    </>
  );
}

export default function ProjectsScene({ cards }: { cards: CardData[] }) {
  return (
    <div className="relative w-full" style={{ height: 'clamp(360px, 44vw, 560px)' }}>
      <Canvas
        camera={{ position: [0, 0, 7.6], fov: 42 }}
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
