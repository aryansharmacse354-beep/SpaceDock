import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { createCircuitTexture } from '../../lib/circuitTexture';

function Die() {
  const texture = useMemo(() => createCircuitTexture(1024), []);
  const pinGeometry = useMemo(() => new THREE.BoxGeometry(0.045, 0.045, 0.16), []);
  const pinMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#a8bdd4',
        metalness: 0.95,
        roughness: 0.28,
      }),
    [],
  );

  useEffect(
    () => () => {
      texture.dispose();
      pinGeometry.dispose();
      pinMaterial.dispose();
    },
    [texture, pinGeometry, pinMaterial],
  );

  const pins = useMemo(() => {
    const list: Array<{ position: [number, number, number]; rotation: number }> = [];
    const count = 13;
    const span = 2.02;

    for (let i = 0; i < count; i += 1) {
      const offset = -span / 2 + (span / (count - 1)) * i;
      list.push({ position: [offset, 0, -1.3], rotation: 0 });
      list.push({ position: [offset, 0, 1.3], rotation: 0 });
      list.push({ position: [-1.3, 0, offset], rotation: Math.PI / 2 });
      list.push({ position: [1.3, 0, offset], rotation: Math.PI / 2 });
    }
    return list;
  }, []);

  return (
    <group>
      <RoundedBox args={[2.52, 0.18, 2.52]} radius={0.04} smoothness={3}>
        <meshStandardMaterial color="#091422" metalness={0.85} roughness={0.34} />
      </RoundedBox>

      <mesh position={[0, 0.094, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.44, 2.44]} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive="#7ae9ff"
          emissiveIntensity={1.05}
          metalness={0.35}
          roughness={0.52}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, -0.108, 0]}>
        <boxGeometry args={[2.36, 0.02, 2.36]} />
        <meshStandardMaterial color="#040a12" metalness={0.7} roughness={0.5} />
      </mesh>

      {pins.map((pin, index) => (
        <mesh
          key={index}
          geometry={pinGeometry}
          material={pinMaterial}
          position={pin.position}
          rotation={[0, pin.rotation, 0]}
        />
      ))}

      <pointLight position={[0, 1.25, 0]} color="#4fe3ff" intensity={6} distance={5.5} decay={2} />
    </group>
  );
}

function Satellite({ color = '#7ef0ff' }: { color?: string }) {
  const beacon = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!beacon.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 3.2) * 0.28;
    beacon.current.scale.setScalar(pulse);
  });

  return (
    <group>
      <mesh>
        <boxGeometry args={[0.11, 0.1, 0.2]} />
        <meshStandardMaterial color="#d7e3f2" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0.235, 0, 0]}>
        <boxGeometry args={[0.31, 0.012, 0.15]} />
        <meshStandardMaterial
          color="#0e2740"
          metalness={0.7}
          roughness={0.35}
          emissive="#1f6f92"
          emissiveIntensity={0.65}
        />
      </mesh>
      <mesh position={[-0.235, 0, 0]}>
        <boxGeometry args={[0.31, 0.012, 0.15]} />
        <meshStandardMaterial
          color="#0e2740"
          metalness={0.7}
          roughness={0.35}
          emissive="#1f6f92"
          emissiveIntensity={0.65}
        />
      </mesh>
      <mesh ref={beacon} position={[0, 0.095, 0]}>
        <sphereGeometry args={[0.032, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <pointLight color={color} intensity={1.1} distance={1.6} decay={2} />
    </group>
  );
}

function Orbiter({
  radius,
  tilt,
  speed,
  offset,
  color,
  children,
}: {
  radius: number;
  tilt: [number, number, number];
  speed: number;
  offset: number;
  color: string;
  children?: ReactNode;
}) {
  const orbit = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (orbit.current) {
      orbit.current.rotation.y = offset + state.clock.elapsedTime * speed;
    }
  });

  return (
    <group rotation={tilt}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.0045, 6, 220]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} />
      </mesh>
      <group ref={orbit}>
        <group position={[radius, 0, 0]}>{children}</group>
      </group>
    </group>
  );
}

function ScanRings({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!group.current || still) return;
    group.current.rotation.z += delta * 0.18;
  });

  return (
    <group ref={group} position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[1.98, 2.01, 128, 1, 0, Math.PI * 1.25]} />
        <meshBasicMaterial color="#4fe3ff" transparent opacity={0.38} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[2.2, 2.215, 128, 1, Math.PI * 1.1, Math.PI * 0.6]} />
        <meshBasicMaterial color="#9a7bff" transparent opacity={0.26} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Starfield() {
  const positions = useMemo(() => {
    const count = 1500;
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 7 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      array[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      array[i * 3 + 1] = radius * Math.cos(phi) * 0.7;
      array[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return array;
  }, []);

  const stars = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (stars.current) {
      stars.current.rotation.y = state.clock.elapsedTime * 0.012;
    }
  });

  return (
    <points ref={stars}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#b9d6ff"
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function Scene({ still }: { still: boolean }) {
  const rig = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  useFrame((_, delta) => {
    if (!rig.current || still) return;
    rig.current.rotation.y = THREE.MathUtils.damp(rig.current.rotation.y, pointer.x * 0.22, 3, delta);
    rig.current.rotation.x = THREE.MathUtils.damp(rig.current.rotation.x, -pointer.y * 0.14, 3, delta);
  });

  return (
    <>
      <color attach="background" args={['#03060f']} />
      <fog attach="fog" args={['#03060f', 9, 19]} />

      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#8fb8ff', '#04070d', 0.7]} />
      <directionalLight position={[4, 7, 4]} intensity={1.5} color="#d7e8ff" />
      <pointLight position={[-3.5, 2.2, 3]} intensity={7} color="#6f8cff" distance={12} decay={2} />

      <Starfield />

      <group ref={rig}>
        <Float speed={still ? 0 : 1.2} rotationIntensity={still ? 0 : 0.18} floatIntensity={still ? 0 : 0.5} floatingRange={[-0.06, 0.06]}>
          <group rotation={[0.16, 0, 0.06]} scale={1.02}>
            <Die />
          </group>
        </Float>

        <Orbiter radius={2.35} tilt={[0.34, 0.16, 0.08]} speed={0.22} offset={0.6} color="#4fe3ff">
          <Satellite color="#7ef0ff" />
        </Orbiter>

        <Orbiter radius={3.05} tilt={[-0.22, -0.32, 0.42]} speed={-0.14} offset={2.4} color="#9a7bff">
          <Satellite color="#b8a6ff" />
        </Orbiter>

        <Orbiter radius={3.65} tilt={[0.58, 0.82, 0.18]} speed={0.09} offset={4.1} color="#6f8cff" />

        <ScanRings still={still} />
      </group>

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.9} luminanceThreshold={0.62} luminanceSmoothing={0.25} mipmapBlur radius={0.72} />
      </EffectComposer>
    </>
  );
}

export function HeroScene({ still = false }: { still?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 2.2, 5.4], fov: 38 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      frameloop="always"
      fallback={
        <div className="flex h-full items-center justify-center text-xs text-muted">
          3D view unavailable on this device.
        </div>
      }
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <Scene still={still} />
    </Canvas>
  );
}
