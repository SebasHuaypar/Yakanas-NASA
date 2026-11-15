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

/** Puntos de calor: puntos suaves que laten (cada uno con su propia fase) sobre la superficie. */
const HOT_VERT = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uSize;
  varying float vPulse;
  void main() {
    vPulse = 0.5 + 0.5 * sin(uTime * 2.2 + aPhase * 6.2831);
    gl_PointSize = uSize * (0.75 + 0.55 * vPulse);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const HOT_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying float vPulse;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(1.0, 0.0, d);
    float a = core * core * (0.45 + 0.55 * vPulse) * uOpacity;
    vec3 ember = vec3(1.0, 0.478, 0.184);
    vec3 amber = vec3(1.0, 0.702, 0.278);
    gl_FragColor = vec4(mix(ember, amber, core * core), a);
  }
`;

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
  const hotRef = useRef<THREE.Points>(null);
  const hotVersion = useRef(0);
  const smoothed = useRef({ zoom: 0, outline: 0, hot: 0 });
  const { viewport, gl, size } = useThree();

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

  const hotUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 4 },
      uOpacity: { value: 0 },
    }),
    [],
  );
  const hotMat = useRef<THREE.ShaderMaterial>(null);

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
    sm.hot += (sceneBus.hot - sm.hot) * k;
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

    // Puntos de calor reales: se reconstruyen solo cuando cambian los datos
    if (sceneBus.points && hotVersion.current !== sceneBus.pointsVersion) {
      hotVersion.current = sceneBus.pointsVersion;
      const src = sceneBus.points;
      const n = src.length / 2;
      const pos = new Float32Array(n * 3);
      const ph = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const [x, y, z] = toSphere(src[i * 2], src[i * 2 + 1], 1.004);
        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;
        ph[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1; // fase estable por punto
      }
      const geo = hotRef.current?.geometry;
      if (geo) {
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
        geo.computeBoundingSphere();
      }
    }
    const hm = hotMat.current;
    if (hm) {
      hm.uniforms.uTime.value = reducedMotion ? 0 : t;
      hm.uniforms.uOpacity.value = sm.hot * (1 - f);
    }
    // Tamaño en píxeles proporcional al globo (así crece al acercarse a Perú)
    const pxPerUnit = size.height / viewport.height;
    if (hm)
      hm.uniforms.uSize.value = Math.min(
        9,
        Math.max(2.2, radius * pxPerUnit * 0.0062),
      );
    if (hotRef.current) hotRef.current.visible = sm.hot > 0.01;

    // Posición: el borde superior asoma ~21% de la altura y luego Perú queda un poco abajo del centro
    const y0 = -H * 0.5 + H * 0.21 - r0;
    const y1 = lerp(-H * 0.12, H * 0.0, sm.zoom); // con el zoom, Perú sube para quedar centrado
    // Al alejarse, el borde inferior del globo queda a ~4% del final del escenario
    const yEnd = -H * 0.5 + H * 0.04 + basis * 0.62;
    // En pantallas anchas, Perú se corre a la derecha para dejar espacio al texto
    const xShift = W > H * 1.15 ? W * 0.045 * sm.zoom * (1 - f) : 0;
    g.position.set(xShift, lerp(lerp(y0, y1, b), yEnd, f), 0);
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
      <points ref={hotRef} frustumCulled={false}>
        <bufferGeometry />
        <shaderMaterial
          ref={hotMat}
          vertexShader={HOT_VERT}
          fragmentShader={HOT_FRAG}
          uniforms={hotUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
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
