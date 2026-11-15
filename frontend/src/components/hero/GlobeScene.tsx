"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { type RefObject, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PERU_BORDERS } from "@/lib/peru-borders";
import { sceneBus } from "@/lib/scene-bus";

/** Estado compartido con el contenedor: progreso del viaje, acercamiento y salida. */
export type SceneState = {
  /** 0..1: viaje desde el borde del globo hasta Perú (durante el hero). */
  p: number;
  /** 0..1: acercamiento lento mientras las secciones pasan por encima. */
  dive: number;
  /** 0..1: al final el globo se aleja y deja ver su borde inferior. */
  end: number;
};

type Props = {
  /** Progreso 0..1 del scroll (ya suavizado por el contenedor). */
  stateRef: RefObject<SceneState>;
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

/** Posición en la esfera unitaria con el mismo mapeo UV que SphereGeometry. */
function toSphere(
  lat: number,
  lon: number,
  r: number,
): [number, number, number] {
  const p = lat * RAD;
  const l = lon * RAD;
  return [
    Math.cos(p) * Math.cos(l) * r,
    Math.sin(p) * r,
    -Math.cos(p) * Math.sin(l) * r,
  ];
}

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
function Earth({ stateRef, reducedMotion, onReady }: Omit<Props, "running">) {
  const group = useRef<THREE.Group>(null);
  const bordersRef = useRef<THREE.LineSegments>(null);
  const smoothed = useRef({ zoom: 0, outline: 0 });
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

  // Contorno de Perú (departamentos) pegado a la superficie; se dibuja de a poco con drawRange
  const borders = useMemo(() => {
    const pos: number[] = [];
    for (const ring of PERU_BORDERS) {
      const n = ring.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        pos.push(...toSphere(ring[i * 2 + 1], ring[i * 2], 1.003));
        pos.push(...toSphere(ring[j * 2 + 1], ring[j * 2], 1.003));
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return { geo, vertices: pos.length / 3 };
  }, []);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const s = stateRef.current;
    const p = s.p;
    const b = smooth(0, 0.6, p); // viaje hacia Perú
    const f = smooth(0, 1, s.end); // al final el globo se aleja y deja ver su borde inferior

    const H = viewport.height;
    const W = viewport.width;

    // Radio: de un globo enorme (solo se ve el arco) a un acercamiento sobre Perú
    const basis = Math.min(H, W * 1.25);
    const r0 = Math.max(W * 0.95, H * 0.55);
    const r1 = basis * 1.25;
    // "dive": mientras se leen las tarjetas, el globo se acerca un poco más (entrando a Perú)
    // Acercamiento extra (sección de los satélites) y trazado del contorno, suavizados
    const sm = smoothed.current;
    const k = 1 - Math.exp(-dt * 1.6);
    sm.zoom += (sceneBus.zoom - sm.zoom) * k;
    sm.outline += (sceneBus.outline - sm.outline) * k;
    const radius = lerp(
      lerp(r0, r1, b) * (1 + 0.3 * s.dive) * (1 + 0.3 * sm.zoom),
      basis * 0.62,
      f,
    );

    const lines = bordersRef.current;
    if (lines) {
      const segs = Math.floor((borders.vertices / 2) * sm.outline);
      lines.geometry.setDrawRange(0, segs * 2);
      (lines.material as THREE.LineBasicMaterial).opacity =
        0.9 * Math.min(1, sm.outline * 4) * (1 - f);
    }

    // Posición: el borde superior asoma ~21% de la altura y luego Perú queda un poco abajo del centro
    const y0 = -H * 0.5 + H * 0.21 - r0;
    const y1 = lerp(-H * 0.12, H * 0.0, sm.zoom); // con el zoom, Perú sube para quedar centrado
    // Al alejarse, el borde inferior del globo queda a ~4% del final del escenario
    const yEnd = -H * 0.5 + H * 0.04 + basis * 0.62;
    g.position.set(0, lerp(lerp(y0, y1, b), yEnd, f), 0);
    g.scale.setScalar(radius);

    // Giro: Perú empieza arriba (horizonte) y baja hasta quedar de frente
    const idle = reducedMotion ? 0 : Math.sin(t * 0.15) * 0.06;
    const pitch = lerp(-1.32, PERU.lat * RAD, b);
    g.rotation.set(
      pitch,
      -Math.PI / 2 - PERU.lon * RAD + (-0.08 + idle) * (1 - b),
      0,
    );
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[1, 128, 128]} />
        <shaderMaterial
          vertexShader={GLOBE_VERT}
          fragmentShader={GLOBE_FRAG}
          uniforms={globeUniforms}
        />
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
      <lineSegments ref={bordersRef} geometry={borders.geo}>
        <lineBasicMaterial
          color="#F3F9FC"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

export default function GlobeScene({
  stateRef,
  reducedMotion,
  running,
  onReady,
}: Props) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 16], fov: 12 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={running ? "always" : "never"}
      className="!absolute inset-0"
    >
      <Suspense fallback={null}>
        <Earth
          stateRef={stateRef}
          reducedMotion={reducedMotion}
          onReady={onReady}
        />
      </Suspense>
    </Canvas>
  );
}
