import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { DeptShape } from "./geo";
import { groundKm, nearestTown, type Place } from "./places";
import { svgToLonLat, type Terrain } from "./terrain";

/**
 * Maqueta 3D de un departamento con su relieve real (three.js).
 * Se importa de forma perezosa desde Region3D para no cargar three hasta
 * que el usuario elige un departamento.
 */

/** Una celda de calor bajo el cursor: id (para resaltarla), focos, altitud (m) y centro de la celda. */
export type SpotCell = { id: number; hs: number; alt: number; lon: number; lat: number };

/** "3d": maqueta con relieve que se puede girar. "2d": vista cenital plana, norte arriba. */
export type ViewMode = "3d" | "2d";

/** Lo que hay bajo el cursor: las celdas cercanas (de más a menos focos), su suma y el poblado más cercano. */
export type SpotPick = {
  cells: SpotCell[];
  total: number;
  near: { name: string; km: number } | null;
};

export type TerrainScene = {
  dispose: () => void;
  resetView: () => void;
  /** Vuelve a leer `terrain.texture` (por ejemplo cuando llega la imagen satelital) y la aplica. */
  refreshTexture: () => void;
  /** Celdas con focos de calor reales: [x, y, focos] con x, y en coordenadas de la silueta (grados × 20). */
  setHotspots: (cells: [number, number, number][]) => void;
  /** Celdas de calor visibles bajo el punto (x, y), en píxeles relativos al visor; null si no hay ninguna. */
  pick: (x: number, y: number) => SpotPick | null;
  /** Resalta las celdas `ids` (el grupo elegido) y, más fuerte, `focus` (la fila elegida). [] quita el resaltado. */
  highlight: (ids: number[], focus: number | null) => void;
  /** Cambia entre la maqueta 3D y la vista 2D, con una transición suave. */
  setMode: (mode: ViewMode) => void;
};

/** Radio (px) alrededor del cursor en el que se buscan celdas: las que caen dentro se agrupan en el tooltip. */
const PICK_PX = 12;
/** Más lejos que esto, nombrar el "poblado más cercano" no orienta: se omite. */
const NEAR_MAX_KM = 30;
/**
 * Las celdas bajo el cursor solo se agrupan si además están cerca EN EL TERRENO (km): con la perspectiva,
 * celdas lejanas (por ejemplo una en el valle y otra en la puna) pueden caer en el mismo punto de la pantalla.
 */
const GROUP_KM = 5;
/** Duración (ms) del cambio entre 3D y 2D. */
const MODE_MS = 800;

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

/** Lado mínimo, en píxeles, con el que se dibuja una celda de calor (entero y par: va dentro del shader). */
const SPOT_MIN_PX = 6;

export function makeSpotMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
    // Todas las celdas miden lo mismo (la celda real de la API); los focos de cada una se leen por la
    // intensidad (instanceColor.r = 0..1): más focos → núcleo amarillo más extenso y color más opaco.
    // uPx = unidades de escena por píxel a profundidad 1; uShow = 0..1 (entrada animada).
    // Tamaño mínimo en pantalla (SPOT_MIN_PX): de lejos la celda real (≈3 px) casi no se vería; al acercarse
    // el cuadrado vuelve a medir exactamente su celda.
    // instanceColor.g = resaltado (0 nada, 0,5 parte del grupo elegido, 1 la celda elegida): aro blanco y algo
    // más grande, para que se distinga aunque la celda mida pocos píxeles.
    uniforms: { uPx: { value: 0 }, uShow: { value: 1 } },
    vertexShader: `
      uniform float uPx;
      uniform float uShow;
      varying vec2 vP;
      varying float vI;
      varying float vH;
      void main() {
        vP = position.xz;
        vI = 1.0;
        vH = 0.0;
        #ifdef USE_INSTANCING_COLOR
        vI = instanceColor.r;
        vH = instanceColor.g;
        #endif
        vec4 ctr = viewMatrix * modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float minHalf = -ctr.z * uPx * ${SPOT_MIN_PX / 2}.0 * uShow * (1.0 + 0.7 * vH);
        float hx = max(length(instanceMatrix[0].xyz), 1e-6), hz = max(length(instanceMatrix[2].xyz), 1e-6);
        vec3 p = vec3(position.x * max(1.0, minHalf / hx), position.y, position.z * max(1.0, minHalf / hz));
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vP;
      varying float vI;
      varying float vH;
      void main() {
        float vR = max(abs(vP.x), abs(vP.y)); // distancia "cuadrada": el degradado y el aro siguen el borde del cuadrado
        float vc = vR * (1.5 - 0.9 * vI);     // con más focos el núcleo claro ocupa más de la celda
        vec3 core = vec3(1.0, 0.90, 0.55), mid = vec3(0.96, 0.42, 0.14), edge = vec3(0.64, 0.17, 0.09);
        vec3 c = mix(core, mid, smoothstep(0.10, 0.45, vc));
        c = mix(c, edge, smoothstep(0.45, 0.85, vc));
        float body = 1.0 - smoothstep(0.70, 0.96, vR);          // la celda se rellena casi entera y se suaviza en el borde
        float ring = smoothstep(0.86, 0.90, vR) * (1.0 - smoothstep(0.96, 1.0, vR)); // aro fino
        float k = 0.55 + 0.45 * vI;                              // pocos focos → más tenue
        float a = max(body * 0.92 * k, ring * 0.9 * k);
        vec3 col = mix(c, vec3(1.0, 0.55, 0.28), ring);
        if (vH > 0.25) {                                         // resaltada: aro blanco más grueso, opaca
          float hr = smoothstep(vH > 0.75 ? 0.62 : 0.74, vH > 0.75 ? 0.70 : 0.80, vR);
          col = mix(c, vec3(1.0), hr);
          a = max(body * 0.95, hr * (vH > 0.75 ? 1.0 : 0.8));
        }
        gl_FragColor = vec4(col, a);
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
  const spotWarm = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), spotMat, 1);
  spotWarm.setColorAt(0, new THREE.Color(1, 0, 0)); // la escena real usa color por instancia: se compila esa variante
  const meshes = [
    new THREE.Mesh(new THREE.PlaneGeometry(1, 1), terrainMat),
    new THREE.Mesh(wallGeo, wallMat),
    spotWarm,
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
  /**
   * places: los que se rotulan; towns: referencias para "a X km de …" en el tooltip (si falta, usa places);
   * mode: vista inicial (en 2D se abre directo, sin la animación de entrada).
   */
  opts: { reduceMotion: boolean; places?: Place[]; towns?: Place[]; mode?: ViewMode },
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
  // Zoom hacia donde apunta el cursor (no hacia el centro). Con el desplazamiento paralelo al suelo, el
  // punto de giro queda sobre el terreno, y no se aleja más allá de la región.
  controls.zoomToCursor = true;
  controls.screenSpacePanning = false;
  controls.maxTargetRadius = D * 0.6;

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
  // Cada marcador es UNA celda de la cuadrícula de la API (0,02° ≈ 2,2 km por lado), con su tamaño real y
  // alineada con los ejes del mapa: pegada al terreno, con núcleo amarillo → naranja → rojo y un aro fino.
  // Todas miden lo mismo (no se solapan); los focos de cada celda se leen por la intensidad del color.
  // Estático y discreto: sin animación.
  const CELL_DEG = 0.02;
  const spotGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2); // lado 2 → se escala a media celda
  const spotMat = makeSpotMaterial();
  type Marker = {
    id: number;
    x: number;
    z: number;
    hx: number;
    hz: number;
    t: number;
    hs: number;
    alt: number;
    lon: number;
    lat: number;
  };
  let markers: Marker[] = [];
  let spotMesh: THREE.InstancedMesh | null = null;
  let pillarS = 0;
  const m4 = new THREE.Matrix4(),
    sc = new THREE.Vector3(),
    ps = new THREE.Vector3(),
    pv = new THREE.Vector3(),
    qid = new THREE.Quaternion();

  const markerMatrix = (p: Marker, s: number) => {
    ps.set(p.x, yOf(p.alt) + D * 0.0008, p.z);
    return m4.compose(ps, qid, sc.set(p.hx * s, 1, p.hz * s));
  };
  const placePillars = () => {
    if (!spotMesh) return;
    const s = Math.max(0.001, pillarS);
    spotMat.uniforms.uShow.value = Math.min(1, s);
    markers.forEach((p, i) => spotMesh!.setMatrixAt(i, markerMatrix(p, s)));
    spotMesh.instanceMatrix.needsUpdate = true;
    spotMesh.visible = pillarS > 0.02;
    if (hlMesh) {
      hlIds.forEach((id, i) => markers[id] && hlMesh!.setMatrixAt(i, markerMatrix(markers[id], s)));
      hlMesh.instanceMatrix.needsUpdate = true;
      hlMesh.visible = spotMesh.visible;
    }
  };

  // Celdas resaltadas (las del panel): una capa aparte que se dibuja encima de las demás.
  let hlMesh: THREE.InstancedMesh | null = null;
  let hlIds: number[] = [];
  let hlFocus: number | null = null;
  const disposeHighlight = () => {
    if (!hlMesh) return;
    relief.remove(hlMesh);
    hlMesh.dispose();
    hlMesh = null;
  };
  const buildHighlight = () => {
    disposeHighlight();
    // La celda elegida va al final: se dibuja encima de las del grupo.
    hlIds = hlIds.filter((id) => markers[id] && id !== hlFocus);
    if (hlFocus !== null && markers[hlFocus]) hlIds.push(hlFocus);
    if (hlIds.length) {
      hlMesh = new THREE.InstancedMesh(spotGeo, spotMat, hlIds.length);
      const tint = new THREE.Color();
      hlIds.forEach((id, i) => hlMesh!.setColorAt(i, tint.setRGB(markers[id].t, id === hlFocus ? 1 : 0.5, 0)));
      hlMesh.frustumCulled = false;
      hlMesh.renderOrder = 2;
      relief.add(hlMesh);
      placePillars();
    }
    dirty = true;
  };

  const disposeMarkers = () => {
    disposeHighlight();
    hlIds = [];
    hlFocus = null;
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
  /** true si el relieve tapa el punto `v` visto desde la cámara (se usa para nombres y celdas de calor). */
  const occluded = (v: THREE.Vector3) => {
    const cp = camera.position,
      eps = 0.01 * (D / 20);
    for (let t = 0.03; t < 0.97; t += 0.03) {
      const x = cp.x + (v.x - cp.x) * t,
        y = cp.y + (v.y - cp.y) * t,
        z = cp.z + (v.z - cp.z) * t;
      if (
        Math.abs(x) < W / 2 &&
        Math.abs(z) < H / 2 &&
        yOf(elevAt(x, z)) * relief.scale.y > y + eps // en 2D el relieve está aplanado
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
      l.v.set(l.x, yOf(l.m) * relief.scale.y + 0.02 * (D / 20), l.z);
      tmp.copy(l.v).project(camera);
      let on =
        tmp.z < 1 &&
        Math.abs(tmp.x) < 1.1 &&
        Math.abs(tmp.y) < 1.1 &&
        !occluded(l.v);
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
  let mode: ViewMode = opts.mode ?? "3d";
  const FLAT = 0.02; // altura del relieve en 2D (prácticamente plano)
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
  /** Encuadre de inicio del modo actual: 3D oblicuo, o 2D cenital con el norte arriba y la región entera. */
  const goal = () => {
    if (mode === "3d") {
      computeHome();
      return { target: target.clone(), sph: homeSph.clone(), s: 1 };
    }
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const r = Math.max(H / 2 / tanH, W / 2 / (tanH * camera.aspect)) * 1.25; // margen para los botones de arriba
    return { target: new THREE.Vector3(), sph: new THREE.Spherical(r, 0.0001, 0), s: FLAT };
  };
  /** En 2D no se gira: arrastrar desplaza el mapa y la cámara queda mirando hacia abajo. */
  const applyControls = () => {
    const flat = mode === "2d";
    controls.enableRotate = !flat;
    controls.maxPolarAngle = flat ? 0 : Math.PI * 0.49;
    controls.mouseButtons.LEFT = flat ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    controls.touches.ONE = flat ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
  };
  const resetView = () => {
    if (anim) return;
    const g = goal();
    relief.scale.y = g.s;
    controls.target.copy(g.target);
    camera.position.setFromSpherical(g.sph).add(g.target);
    camera.lookAt(g.target);
    controls.update();
    dirty = true;
  };

  // Transición entre 3D y 2D: el relieve se aplana (o crece) mientras la cámara pasa a la vista de ese modo.
  type ModeAnim = {
    t0: number;
    fromS: number;
    toS: number;
    fromT: THREE.Vector3;
    toT: THREE.Vector3;
    fromSph: THREE.Spherical;
    toSph: THREE.Spherical;
  };
  let anim: ModeAnim | null = null;
  const startMode = (animate: boolean) => {
    if (!animate || opts.reduceMotion) {
      applyControls();
      resetView();
      return;
    }
    const g = goal();
    const from = (anim ? animTarget : controls.target).clone(); // si ya había una transición, sigue desde donde va
    anim = {
      t0: performance.now(),
      fromS: relief.scale.y,
      toS: g.s,
      fromT: from,
      toT: g.target,
      fromSph: new THREE.Spherical().setFromVector3(camera.position.clone().sub(from)),
      toSph: g.sph,
    };
    controls.enabled = false;
    dirty = true;
  };
  const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const animTarget = new THREE.Vector3();

  /* ---------- bucle ---------- */
  let dirty = true;
  let disposed = false;
  const DURATION = opts.reduceMotion ? 0 : 1500;
  const t0 = performance.now();
  // La animación de entrada (del plano al relieve) solo tiene sentido si se abre en 3D.
  let intro = DURATION > 0 && mode === "3d";

  computeHome();
  applyRelief();
  applyControls();
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
    if (anim) {
      const a = anim;
      const k = easeInOut(clamp((now - a.t0) / MODE_MS, 0, 1));
      relief.scale.y = a.fromS + (a.toS - a.fromS) * k;
      animTarget.lerpVectors(a.fromT, a.toT, k);
      const dTheta = ((a.toSph.theta - a.fromSph.theta + Math.PI * 3) % (Math.PI * 2)) - Math.PI; // giro corto
      sph.set(
        a.fromSph.radius + (a.toSph.radius - a.fromSph.radius) * k,
        a.fromSph.phi + (a.toSph.phi - a.fromSph.phi) * k,
        a.fromSph.theta + dTheta * k,
      );
      camera.position.setFromSpherical(sph).add(animTarget);
      camera.lookAt(animTarget);
      dirty = true;
      if (k >= 1) {
        anim = null;
        applyControls();
        controls.enabled = true;
        resetView(); // deja la cámara y los controles exactamente en el encuadre del modo
      }
    }
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
        if (mode === "2d") startMode(true); // se pidió 2D durante la entrada
      }
    }
    // Durante las animaciones la cámara la mueve este bucle, no los controles.
    if (!anim && !intro && controls.update()) dirty = true;
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
    spotMat.uniforms.uPx.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h; // para el tamaño mínimo de las celdas
    dirty = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  if (!intro) resetView(); // ya con la proporción real del visor (el encuadre 2D la necesita)

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
      markers = cells.map(([sx, sy, hs], id) => {
        const [lon, lat] = svgToLonLat(sx, sy); // centro de la celda
        const [x, z] = toXZ(lon, lat);
        const [x1, z1] = toXZ(lon + CELL_DEG / 2, lat + CELL_DEG / 2); // media celda, en unidades de la escena (km)
        // La intensidad crece con los focos de la celda (raíz, para que unas pocas no apaguen al resto)
        return {
          id,
          x,
          z,
          hx: Math.abs(x1 - x),
          hz: Math.abs(z1 - z),
          t: Math.sqrt(hs / top),
          hs,
          alt: elevAt(x, z),
          lon,
          lat,
        };
      });
      spotMesh = new THREE.InstancedMesh(
        spotGeo,
        spotMat,
        Math.max(1, markers.length),
      );
      const tint = new THREE.Color();
      markers.forEach((p, i) => spotMesh!.setColorAt(i, tint.setRGB(p.t, 0, 0)));
      if (spotMesh.instanceColor) spotMesh.instanceColor.needsUpdate = true;
      spotMesh.frustumCulled = false;
      spotMesh.renderOrder = 1;
      relief.add(spotMesh);
      if (!intro) pillarS = 1;
      placePillars();
      dirty = true;
    },
    pick(px, py) {
      if (disposed || intro || anim || !spotMesh || !markers.length) return null;
      const w = host.clientWidth,
        h = host.clientHeight;
      const uPx = spotMat.uniforms.uPx.value as number;
      if (!w || !h || !uPx) return null;
      camera.updateMatrixWorld();
      const cand: { m: Marker; d: number }[] = [];
      for (const m of markers) {
        pv.set(m.x, (yOf(m.alt) + D * 0.0008) * relief.scale.y, m.z);
        const depth = -tmp.copy(pv).applyMatrix4(camera.matrixWorldInverse).z;
        if (depth <= 0) continue;
        tmp.copy(pv).project(camera);
        if (tmp.z > 1) continue;
        const sx = (tmp.x * 0.5 + 0.5) * w,
          sy = (-tmp.y * 0.5 + 0.5) * h;
        // Medio lado del cuadrado en pantalla (el mismo mínimo que usa el shader).
        const half = Math.max(SPOT_MIN_PX / 2, Math.max(m.hx, m.hz) / (depth * uPx));
        const d = Math.hypot(sx - px, sy - py);
        if (d > Math.max(PICK_PX, half)) continue;
        if (!occluded(pv)) cand.push({ m, d }); // una celda tapada por una montaña no responde
      }
      if (!cand.length) return null;
      // La celda más cercana al cursor manda; se le suman solo las que están cerca en el terreno.
      const anchor = cand.reduce((a, b) => (b.d < a.d ? b : a)).m;
      const hits = cand.map((c) => c.m).filter((m) => groundKm(m, anchor) <= GROUP_KM);
      hits.sort((a, b) => b.hs - a.hs);
      // Poblado más cercano a la celda con más focos.
      const near = nearestTown(hits[0], opts.towns ?? opts.places ?? [], NEAR_MAX_KM);
      return {
        cells: hits.map(({ id, hs, alt, lon, lat }) => ({ id, hs, alt, lon, lat })),
        total: hits.reduce((s, m) => s + m.hs, 0),
        near,
      };
    },
    highlight(ids, focus) {
      hlIds = ids;
      hlFocus = focus;
      buildHighlight();
    },
    setMode(next) {
      if (disposed || next === mode) return;
      mode = next;
      if (intro) return; // la animación de entrada termina en el modo que toque
      startMode(true);
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
