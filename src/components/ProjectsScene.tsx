'use client';

import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, RoundedBox, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

export type CardData = { url: string; texture: string; title: string };

// Organic "tossed on a table" scatter for up to 4 cards. Each entry has a
// position spread across X/Y *and depth Z* (some near the camera, some far) and
// its own base rotation on all three axes so every card shows its thickness and
// sits at a different angle — not a flat aligned row.
type Slot = { position: [number, number, number]; rotation: [number, number, number] };
const SLOTS: Slot[] = [
  { position: [-2.95, 0.55, 0.7], rotation: [0.26, -0.30, 0.10] },
  { position: [-1.05, -0.6, -1.1], rotation: [0.20, 0.26, -0.09] },
  { position: [1.25, 0.62, 0.45], rotation: [0.30, 0.22, 0.07] },
  { position: [2.95, -0.7, -0.6], rotation: [0.22, -0.36, -0.12] },
];

const reduceMotion =
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// A real 3D card: a rounded box with thickness, the site screenshot on the
// front face. It rests at its own base angle (all axes), floats gently, and on
// hover tilts further toward the cursor (added on top of the base) + lifts.
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
      const s = hovered ? 1.05 : 1;
      m.scale.setScalar(m.scale.x + (s - m.scale.x) * 0.2);
      return;
    }
    const t = state.clock.elapsedTime;
    m.position.y = slot.position[1] + Math.sin(t * 0.6 + index * 1.5) * 0.1;
    // hover adds cursor-follow tilt on top of the base angle; at rest a tiny wobble
    const addX = hovered ? -mouse.y * 0.26 : Math.sin(t * 0.4 + index) * 0.03;
    const addY = hovered ? mouse.x * 0.34 : Math.cos(t * 0.3 + index) * 0.04;
    m.rotation.x += (bx + addX - m.rotation.x) * 0.08;
    m.rotation.y += (by + addY - m.rotation.y) * 0.08;
    m.rotation.z += (bz - m.rotation.z) * 0.08;
    const s = hovered ? 1.08 : 1;
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
        {/* Card body — real thickness, rounded corners */}
        <RoundedBox args={[2.7, 1.52, 0.16]} radius={0.06} smoothness={4}>
          <meshStandardMaterial color="#16161c" roughness={0.45} metalness={0} />
        </RoundedBox>
        {/* Front face with the site screenshot, just in front of the box */}
        <mesh position={[0, 0, 0.085]}>
          <planeGeometry args={[2.6, 1.44]} />
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
        <Card key={c.url} data={c} index={i} slot={SLOTS[i % SLOTS.length]} />
      ))}
      {/* Soft contact shadow on the "table" below the cards -> they read as
          floating above the background. */}
      <ContactShadows
        position={[0, -1.65, 0]}
        scale={15}
        blur={2.3}
        opacity={0.55}
        far={5}
        resolution={1024}
        color="#0a0f1a"
      />
    </>
  );
}

export default function ProjectsScene({ cards }: { cards: CardData[] }) {
  return (
    <div className="relative w-full" style={{ height: 'clamp(420px, 52vw, 640px)' }}>
      <Canvas
        // slightly elevated + closer: the cards fill more of the frame and are
        // viewed a touch from above, like a mockup laid out on a desk.
        camera={{ position: [0, 1.85, 6.6], fov: 40 }}
        onCreated={({ camera }) => camera.lookAt(0, -0.1, 0)}
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
