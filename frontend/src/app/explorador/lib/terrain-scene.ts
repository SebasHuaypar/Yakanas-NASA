import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { DeptShape } from "./geo";
import type { Place } from "./places";
import { svgToLonLat, type Terrain } from "./terrain";

/**
 * Maqueta 3D de un departamento con su relieve real (three.js).
 * Se importa de forma perezosa desde Region3D para no cargar three hasta
 * que el usuario elige un departamento.
 */

export type TerrainScene = {
  dispose: () => void;
  resetView: () => void;
  /** Vuelve a leer `terrain.texture` (por ejemplo cuando llega la imagen satelital) y la aplica. */
  refreshTexture: () => void;
  /** Celdas con focos de calor reales: [x, y, focos] con x, y en coordenadas de la silueta (grados × 20). */
  setHotspots: (cells: [number, number, number][]) => void;
};

const KM = 1 / 1000;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mercY = (lat: number) => Math.asinh(Math.tan((lat * Math.PI) / 180));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

const SLATE = 0x4c6679;
/** Relieve extra respecto al estándar: el mismo para todas las regiones (el que se ajustó en Cusco). */
const RELIEF_BOOST = 1.4;

/* ---------- renderizador compartido ----------
   Crear un contexto WebGL y compilar los shaders es lo más lento de abrir una región. Se crea UNA vez,
   se reutiliza entre regiones (y se precalienta en reposo), así cada selección posterior es casi inmediata. */
let sharedRenderer: THREE.WebGLRenderer | null = null;
function getRenderer() {
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    sharedRenderer.setClearColor(0x000000, 0);
    sharedRenderer.domElement.style.cssText =
      "display:block;width:100%;height:100%;touch-action:none";
  }
  return sharedRenderer;
}

export function makeSpotMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
    vertexShader: `
      varying float vR;
      void main() {
        vR = length(position.xz);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying float vR;
      void main() {
        vec3 core = vec3(1.0, 0.90, 0.55), mid = vec3(0.96, 0.42, 0.14), edge = vec3(0.64, 0.17, 0.09);
        vec3 c = mix(core, mid, smoothstep(0.10, 0.45, vR));
        c = mix(c, edge, smoothstep(0.45, 0.85, vR));
        float body = 1.0 - smoothstep(0.55, 0.88, vR);          // mancha que se desvanece hacia el borde
        float ring = smoothstep(0.86, 0.90, vR) * (1.0 - smoothstep(0.96, 1.0, vR)); // aro fino
        float a = max(body * 0.92, ring * 0.9);
        gl_FragColor = vec4(mix(c, vec3(1.0, 0.55, 0.28), ring), a);
      }`,
  });
}

/** Crea el renderizador y compila de antemano los shaders que usa la escena (llamar en reposo). */
export async function warmUpRenderer() {
  const r = getRenderer();
  const sc = new THREE.Scene();
  sc.add(
    new THREE.HemisphereLight(0xffffff, 0x4c6679, 1.15),
    new THREE.DirectionalLight(0xffffff, 1.9),
  );
  const dt = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  dt.needsUpdate = true;
  const terrainMat = new THREE.MeshLambertMaterial({
    map: dt,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  const wallMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
  );
  wallGeo.setAttribute(
    "color",
    new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1], 3),
  );
  const spotMat = makeSpotMaterial();
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const meshes = [
    new THREE.Mesh(new THREE.PlaneGeometry(1, 1), terrainMat),
    new THREE.Mesh(wallGeo, wallMat),
    new THREE.InstancedMesh(new THREE.CircleGeometry(1, 8), spotMat, 1),
    new THREE.LineLoop(wallGeo, lineMat),
  ];
  meshes.forEach((m) => sc.add(m));
  try {
    await r.compileAsync(sc, new THREE.PerspectiveCamera());
  } catch {
    /* si falla, se compilará al abrir la primera región */
  }
  meshes.forEach((m) => m.geometry.dispose());
  [terrainMat, wallMat, spotMat, lineMat].forEach((m) => m.dispose());
  dt.dispose();
}

export function createTerrainScene(
  host: HTMLElement,
  terrain: Terrain,
  shape: DeptShape,
  opts: { reduceMotion: boolean; places?: Place[] },
): TerrainScene {
  const { dem, cols, rows, bb, min, max } = terrain;
  const W = terrain.wKm,
    H = terrain.hKm,
    D = Math.max(W, H);

  const renderer = getRenderer();
  // Resolución base moderada; mientras se mueve la cámara baja más (ver más abajo) y se restaura al soltar.
  const BASE_RATIO = Math.min(window.devicePixelRatio, 1.25);
  renderer.setPixelRatio(BASE_RATIO);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, D * 0.01, D * 25);
  scene.add(new THREE.HemisphereLight(0xffffff, SLATE, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(-D, D * 1.1, D * 0.6);
  scene.add(sun);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12; // se detiene antes → menos fotogramas de inercia
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = D * 0.2;
  controls.maxDistance = D * 4;

  /* ---------- geometría ---------- */
  const base = min - 100; // metros: el “suelo” de la maqueta queda un poco bajo el punto más bajo
  // Exageración vertical (entre 1× y 3,2×, más el extra de cada región): que la sierra se note sin deformar.
  const exag =
    clamp((0.06 * W) / Math.max(0.3, (max - min) * KM), 1, 3.2) * RELIEF_BOOST;
  const yOf = (m: number) => Math.max(0, m - base) * KM * exag;

  const toXZ = (lon: number, lat: number): [number, number] => [
    ((lon - bb.west) / (bb.east - bb.west) - 0.5) * W,
    ((mercY(bb.north) - mercY(lat)) / (mercY(bb.north) - mercY(bb.south)) -
      0.5) *
      H,
  ];
  const elevAt = (x: number, z: number) => {
    const fx = clamp((x / W + 0.5) * (cols - 1), 0, cols - 1.001),
      fy = clamp((z / H + 0.5) * (rows - 1), 0, rows - 1.001);
    const x0 = fx | 0,
      y0 = fy | 0,
      tx = fx - x0,
      ty = fy - y0;
    const g = (i: number, j: number) => dem[(y0 + j) * cols + x0 + i];
    return (
      (g(0, 0) * (1 - tx) + g(1, 0) * tx) * (1 - ty) +
      (g(0, 1) * (1 - tx) + g(1, 1) * tx) * ty
    );
  };

  const relief = new THREE.Group();
  scene.add(relief);

  // Malla ligera: el detalle fino lo lleva la textura (sombreado o satélite), no la geometría.
  const nx = Math.min(cols, 256),
    ny = Math.max(2, Math.round((nx * rows) / cols));
  const vidx = new Int32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const r = Math.round((j * (rows - 1)) / (ny - 1));
    for (let i = 0; i < nx; i++)
      vidx[j * nx + i] = r * cols + Math.round((i * (cols - 1)) / (nx - 1));
  }
  const makeTex = () => {
    const t = new THREE.CanvasTexture(terrain.texture);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(2, renderer.capabilities.getMaxAnisotropy());
    return t;
  };
  let tex = makeTex();
  // Lambert: iluminación difusa más barata que la PBR estándar (el material ya era rugoso al máximo).
  const terrainMat = new THREE.MeshLambertMaterial({
    map: tex,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  const setLook = () => terrainMat.color.setScalar(terrain.satellite ? 1.3 : 1); // la selva en satélite sale muy oscura
  setLook();
  const terrainMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H, nx - 1, ny - 1).rotateX(-Math.PI / 2),
    terrainMat,
  );
  relief.add(terrainMesh);

  // Contorno: puntos densificados (x,z) de cada anillo de la silueta.
  const step = D / 260;
  const rings: [number, number][][] = shape.rings.map((ring) => {
    const out: [number, number][] = [];
    for (let i = 0; i < ring.length; i++) {
      const a = toXZ(...svgToLonLat(ring[i][0], ring[i][1])),
        b = toXZ(
          ...svgToLonLat(
            ring[(i + 1) % ring.length][0],
            ring[(i + 1) % ring.length][1],
          ),
        );
      const n = Math.max(
        1,
        Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step),
      );
      for (let k = 0; k < n; k++)
        out.push([
          a[0] + ((b[0] - a[0]) * k) / n,
          a[1] + ((b[1] - a[1]) * k) / n,
        ]);
    }
    return out;
  });

  const wallMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  const walls = new THREE.Mesh(new THREE.BufferGeometry(), wallMat);
  relief.add(walls);

  // Contorno blanco sobre el relieve (solo con imagen satelital, como en hotspots-cusco).
  const outlineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const outlines: THREE.LineLoop[] = [];
  for (let k = 0; k < rings.length; k++) {
    const l = new THREE.LineLoop(new THREE.BufferGeometry(), outlineMat);
    l.visible = terrain.satellite;
    outlines.push(l);
    relief.add(l);
  }

  // Espesor de la maqueta: las paredes bajan por debajo del suelo con el mismo color del terreno.
  const slabD = D * 0.038;

  // Color de cada punto del borde, tomado de la textura (sin recortar) para que la pared sea continua.
  const tmpC = new THREE.Color();
  let wallTone: THREE.Color[][] = [];
  const computeWallTone = () => {
    const ew = terrain.edge.width,
      eh = terrain.edge.height;
    const edata = terrain.edge
      .getContext("2d")!
      .getImageData(0, 0, ew, eh).data;
    wallTone = rings.map((ring) =>
      ring.map(([x, z]) => {
        const ix = clamp(Math.round((x / W + 0.5) * (ew - 1)), 0, ew - 1),
          iy = clamp(Math.round((z / H + 0.5) * (eh - 1)), 0, eh - 1);
        const i = (iy * ew + ix) * 4;
        return tmpC
          .setRGB(
            edata[i] / 255,
            edata[i + 1] / 255,
            edata[i + 2] / 255,
            THREE.SRGBColorSpace,
          )
          .clone();
      }),
    );
  };
  computeWallTone();

  /* ---------- marcadores de focos de calor ---------- */
  // Un foco de calor es, en origen, un píxel térmico del satélite: se dibuja así, como una mancha de
  // calor pegada al terreno (núcleo amarillo → naranja → rojo que se desvanece) con un aro fino.
  // Estático y discreto: sin animación.
  const spotGeo = new THREE.CircleGeometry(1, 36).rotateX(-Math.PI / 2);
  const spotMat = makeSpotMaterial();
  type Marker = { x: number; z: number; r: number };
  let markers: Marker[] = [];
  let spotMesh: THREE.InstancedMesh | null = null;
  let pillarS = 0;
  const SPOT_R = D * 0.0075;
  const m4 = new THREE.Matrix4(),
    sc = new THREE.Vector3(),
    ps = new THREE.Vector3(),
    qid = new THREE.Quaternion();

  const placePillars = () => {
    if (!spotMesh) return;
    const s = Math.max(0.001, pillarS);
    markers.forEach((p, i) => {
      ps.set(p.x, yOf(elevAt(p.x, p.z)) + D * 0.0008, p.z);
      m4.compose(ps, qid, sc.set(SPOT_R * p.r * s, 1, SPOT_R * p.r * s));
      spotMesh!.setMatrixAt(i, m4);
    });
    spotMesh.instanceMatrix.needsUpdate = true;
    spotMesh.visible = pillarS > 0.02;
  };
  const disposeMarkers = () => {
    if (!spotMesh) return;
    relief.remove(spotMesh);
    spotMesh.dispose();
    spotMesh = null;
  };

  /* ---------- nombres de lugares ---------- */
  const labelLayer = document.createElement("div");
  labelLayer.style.cssText =
    "position:absolute;inset:0;overflow:hidden;pointer-events:none;opacity:0;transition:opacity .6s";
  host.appendChild(labelLayer);
  const labels = (opts.places ?? [])
    .filter(
      (p) =>
        p.level === 1 &&
        p.lat > bb.south &&
        p.lat < bb.north &&
        p.lon > bb.west &&
        p.lon < bb.east,
    )
    .map((p) => {
      const [x, z] = toXZ(p.lon, p.lat);
      const m = elevAt(x, z);
      const el = document.createElement("div");
      el.style.cssText =
        "position:absolute;left:0;top:0;white-space:nowrap;text-align:center;will-change:transform;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.95),0 0 10px rgba(0,0,0,.7);font-family:var(--font-inter),system-ui,sans-serif";
      el.innerHTML = `<span style="font-weight:600;font-size:13px">${p.name}</span><span style="display:block;font-size:10px;color:#d5dde3">${Math.round(m)} m</span><span style="display:block;width:1px;height:9px;margin:2px auto 0;background:rgba(255,255,255,.65)"></span>`;
      labelLayer.appendChild(el);
      return { el, x, z, m, len: p.name.length, v: new THREE.Vector3() };
    });
  const tmp = new THREE.Vector3();
  const occluded = (l: (typeof labels)[number]) => {
    const cp = camera.position,
      eps = 0.01 * (D / 20);
    for (let t = 0.03; t < 0.97; t += 0.03) {
      const x = cp.x + (l.v.x - cp.x) * t,
        y = cp.y + (l.v.y - cp.y) * t,
        z = cp.z + (l.v.z - cp.z) * t;
      if (
        Math.abs(x) < W / 2 &&
        Math.abs(z) < H / 2 &&
        yOf(elevAt(x, z)) > y + eps
      )
        return true;
    }
    return false;
  };
  const updateLabels = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    const boxes: number[][] = [];
    for (const l of labels) {
      l.v.set(l.x, yOf(l.m) + 0.02 * (D / 20), l.z);
      tmp.copy(l.v).project(camera);
      let on =
        tmp.z < 1 &&
        Math.abs(tmp.x) < 1.1 &&
        Math.abs(tmp.y) < 1.1 &&
        !occluded(l);
      const x = (tmp.x * 0.5 + 0.5) * w,
        y = (-tmp.y * 0.5 + 0.5) * h;
      if (on) {
        const bw = l.len * 8,
          b = [x - bw / 2, y - 34, x + bw / 2, y];
        on = boxes.every(
          (o) => b[2] < o[0] || b[0] > o[2] || b[3] < o[1] || b[1] > o[3],
        );
        if (on) boxes.push(b);
      }
      l.el.style.display = on ? "" : "none";
      if (on)
        l.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
    }
  };

  /* ---------- relieve ---------- */
  const applyRelief = () => {
    const pos = terrainMesh.geometry.attributes
      .position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, yOf(dem[vidx[i]]));
    pos.needsUpdate = true;
    terrainMesh.geometry.computeVertexNormals();
    terrainMesh.geometry.computeBoundingSphere();

    const v: number[] = [],
      col: number[] = [],
      idx: number[] = [];
    rings.forEach((ring, r) => {
      const s0 = v.length / 3;
      ring.forEach(([x, z], i) => {
        const cx = clamp(x, -W / 2, W / 2),
          cz = clamp(z, -H / 2, H / 2);
        const c = wallTone[r][i];
        v.push(x, yOf(elevAt(cx, cz)), z, x, -slabD, z);
        // continuo con el terreno: casi el mismo color arriba, más oscuro hacia la base
        col.push(
          c.r * 0.8,
          c.g * 0.8,
          c.b * 0.8,
          c.r * 0.34,
          c.g * 0.34,
          c.b * 0.34,
        );
      });
      const n = ring.length;
      for (let i = 0; i < n; i++) {
        const a = s0 + i * 2,
          b = s0 + ((i + 1) % n) * 2;
        idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    });
    walls.geometry.dispose();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    walls.geometry = g;
    outlines.forEach((l, k) => {
      const a: number[] = [];
      for (const [x, z] of rings[k]) {
        const cx = clamp(x, -W / 2, W / 2),
          cz = clamp(z, -H / 2, H / 2);
        a.push(x, yOf(elevAt(cx, cz)) + D * 0.0006, z);
      }
      l.geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(a, 3),
      );
    });
    placePillars();
    dirty = true;
  };

  /* ---------- cámara ---------- */
  const target = new THREE.Vector3();
  const home = new THREE.Vector3();
  const homeSph = new THREE.Spherical();
  const computeHome = () => {
    target.set(0, yOf((min + max) / 2) * 0.5, 0);
    // Encuadre cercano: la región llena el visor. Las regiones altas (más alto que ancho) necesitan algo más de aire.
    const tall = H / W;
    const k = tall > 1 ? Math.min(1.15, 0.86 + 0.5 * (tall - 1)) : 0.86;
    home.set(-D * 0.14 * k, D * 1.0 * k, D * 1.12 * k).add(target);
    homeSph.setFromVector3(home.clone().sub(target));
  };
  const resetView = () => {
    computeHome();
    controls.target.copy(target);
    camera.position.copy(home);
    controls.update();
    dirty = true;
  };

  /* ---------- bucle ---------- */
  let dirty = true;
  let disposed = false;
  const DURATION = opts.reduceMotion ? 0 : 1500;
  const t0 = performance.now();
  let intro = DURATION > 0;

  computeHome();
  applyRelief();
  if (intro) {
    controls.enabled = false;
    relief.scale.y = 0.02;
  } else {
    resetView();
    labelLayer.style.opacity = "1";
  }

  const sph = new THREE.Spherical();
  const frame = (now: number) => {
    if (disposed) return;
    if (intro) {
      const t = clamp((now - t0) / DURATION, 0, 1);
      const e = easeOut(t);
      relief.scale.y = 0.02 + 0.98 * e;
      // La cámara baja desde la vista cenital (como el mapa plano) hasta la vista oblicua.
      sph.set(
        homeSph.radius,
        0.04 + (homeSph.phi - 0.04) * e,
        homeSph.theta + (1 - e) * 0.7,
      );
      camera.position.setFromSpherical(sph).add(target);
      camera.lookAt(target);
      pillarS = easeOut((t - 0.55) / 0.45);
      placePillars();
      dirty = true;
      if (t >= 1) {
        intro = false;
        controls.enabled = true;
        resetView();
        labelLayer.style.opacity = "1";
      }
    }
    if (controls.update()) dirty = true;
    if (dirty) {
      renderer.render(scene, camera);
      dirty = false;
      if (!intro && labels.length) updateLabels();
    }
  };
  renderer.setAnimationLoop(frame);

  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // Resolución adaptativa: al mover la cámara (arrastrar o zoom) se dibuja a menor resolución y se
  // restaura la nitidez a los ~250 ms de soltar. El zoom/giro se siente fluido aunque la GPU sea modesta.
  let settle: ReturnType<typeof setTimeout> | null = null;
  let ratio = BASE_RATIO;
  const setRatio = (r: number) => {
    if (r === ratio) return; // cambiar el tamaño del lienzo reasigna memoria: solo si de verdad cambia
    ratio = r;
    renderer.setPixelRatio(r);
    resize();
  };
  controls.addEventListener("start", () => {
    if (settle) clearTimeout(settle);
    setRatio(Math.max(0.6, BASE_RATIO * 0.6));
  });
  controls.addEventListener("end", () => {
    if (settle) clearTimeout(settle);
    settle = setTimeout(() => setRatio(BASE_RATIO), 250);
  });

  const refreshTexture = () => {
    if (disposed) return;
    const old = tex;
    tex = makeTex();
    terrainMat.map = tex;
    setLook();
    terrainMat.needsUpdate = true;
    old.dispose();
    computeWallTone();
    applyRelief(); // rehace las paredes con el color de la textura nueva
    outlines.forEach((l) => (l.visible = terrain.satellite));
    dirty = true;
  };

  return {
    resetView,
    refreshTexture,
    setHotspots(cells) {
      disposeMarkers();
      const top = Math.max(1, ...cells.map((c) => c[2]));
      markers = cells.map(([sx, sy, hs]) => {
        const [x, z] = toXZ(...svgToLonLat(sx, sy));
        // El tamaño crece con los focos de la celda (raíz, para que las grandes no tapen todo)
        return { x, z, r: 0.45 + 0.85 * Math.sqrt(hs / top) };
      });
      spotMesh = new THREE.InstancedMesh(
        spotGeo,
        spotMat,
        Math.max(1, markers.length),
      );
      spotMesh.frustumCulled = false;
      relief.add(spotMesh);
      if (!intro) pillarS = 1;
      placePillars();
      dirty = true;
    },
    dispose() {
      disposed = true;
      if (settle) clearTimeout(settle);
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      [wallMat, spotMat].forEach((m) => m.dispose());
      (terrainMesh.material as THREE.Material).dispose();
      tex.dispose();
      disposeMarkers();
      spotGeo.dispose();
      renderer.domElement.remove(); // el renderizador NO se destruye: lo reutiliza la próxima región
      labelLayer.remove();
      outlineMat.dispose();
    },
  };
}
