"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { type RefObject, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type Props = {
  /** Progreso 0..1 del scroll (ya suavizado por el contenedor). */
  progressRef: RefObject<number>;
  reducedMotion: boolean;
  running: boolean;
  onReady: () => void;
};

const RAD = Math.PI / 180;
const PERU = { lat: -9.5, lon: -75.5 };
const SNOW = "vec3(0.953, 0.976, 0.988)";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Ajusta el filtrado anisotrópico para que el globo se vea nítido en ángulos rasantes. */
function tuneTexture(t: THREE.Texture, anisotropy: number) {
  t.anisotropy = anisotropy;
}

/* ------------------------------ shaders ------------------------------ */

const GLOBE_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GLOBE_FRAG = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform vec3 uSun;
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vec3 n = normalize(vN);
    float ndl = dot(n, normalize(uSun));

    vec3 day = texture2D(uDay, vUv).rgb;
    float dl = dot(day, vec3(0.299, 0.587, 0.114));
    day = mix(vec3(dl), day, 0.68) * vec3(0.92, 1.0, 1.08);

    float nl = dot(texture2D(uNight, vUv).rgb, vec3(0.299, 0.587, 0.114));
    vec3 lights = ${SNOW} * pow(nl, 0.85) * 1.5;

    vec3 nightSide = vec3(0.018, 0.030, 0.048) + day * 0.12 + lights;
    vec3 daySide = day * (0.6 + 1.3 * max(ndl, 0.0));
    vec3 col = mix(nightSide, daySide, smoothstep(-0.12, 0.38, ndl));

    float rim = pow(1.0 - max(n.z, 0.0), 4.0);
    col += vec3(0.55, 0.72, 0.86) * rim * 0.14;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const ATMO_VERT = /* glsl */ `
  varying vec3 vN;
  void main() {
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Halo atmosférico fino y suave: más intenso pegado al borde y se desvanece rápido
const ATMO_FRAG = /* glsl */ `
  varying vec3 vN;
  void main() {
    float f = max(0.55 - dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0);
    float i = pow(f, 3.2);
    gl_FragColor = vec4(vec3(0.58, 0.74, 0.88) * i * 0.55, i * 0.55);
  }
`;

/* ------------------------------ escena ------------------------------ */

/**
 * El globo sigue el progreso del scroll (b = 0 → 1):
 *  - Inicio: solo asoma un arco del globo, a todo lo ancho, con la zona de Perú arriba (horizonte).
 *  - Al bajar: el globo sube, gira (Perú baja hasta quedar de frente) y se acerca.
 */
function Earth({ progressRef, reducedMotion, onReady }: Omit<Props, "running">) {
  const group = useRef<THREE.Group>(null);
  const { viewport, gl } = useThree();

  const [day, night] = useLoader(THREE.TextureLoader, [
    "/images/earth/day.webp",
    "/images/earth/night.webp",
  ]);

  useEffect(() => {
    const max = gl.capabilities.getMaxAnisotropy();
    tuneTexture(day, Math.min(8, max));
    tuneTexture(night, Math.min(8, max));
    onReady();
  }, [day, night, gl, onReady]);

  const globeUniforms = useMemo(
    () => ({
      uDay: { value: day },
      uNight: { value: night },
      uSun: { value: new THREE.Vector3(0.45, 0.35, 0.85) },
    }),
    [day, night],
  );

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const b = smooth(0, 0.88, progressRef.current);

    const H = viewport.height;
    const W = viewport.width;

    // Radio: de un globo enorme (solo se ve el arco) a un acercamiento sobre Perú
    const basis = Math.min(H, W * 1.25);
    const r0 = Math.max(W * 0.95, H * 0.55);
    const r1 = basis * 1.25;
    const radius = lerp(r0, r1, b);

    // Posición: el borde superior asoma ~21% de la altura y luego Perú queda un poco abajo del centro
    const y0 = -H * 0.5 + H * 0.21 - r0;
    const y1 = -H * 0.12;
    g.position.set(0, lerp(y0, y1, b), 0);
    g.scale.setScalar(radius);

    // Giro: Perú empieza arriba (horizonte) y baja hasta quedar de frente
    const idle = reducedMotion ? 0 : Math.sin(t * 0.15) * 0.06;
    const pitch = lerp(-1.32, PERU.lat * RAD, b);
    g.rotation.set(pitch, -Math.PI / 2 - PERU.lon * RAD + (-0.08 + idle) * (1 - b), 0);
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1, 128, 128]} />
        <shaderMaterial vertexShader={GLOBE_VERT} fragmentShader={GLOBE_FRAG} uniforms={globeUniforms} />
      </mesh>
      <mesh scale={1.035}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          vertexShader={ATMO_VERT}
          fragmentShader={ATMO_FRAG}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function GlobeScene({ progressRef, reducedMotion, running, onReady }: Props) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 16], fov: 12 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={running ? "always" : "never"}
      className="!absolute inset-0"
    >
      <Suspense fallback={null}>
        <Earth progressRef={progressRef} reducedMotion={reducedMotion} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
