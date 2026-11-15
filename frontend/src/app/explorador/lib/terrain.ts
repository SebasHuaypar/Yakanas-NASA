import type { DeptShape } from "./geo";

/**
 * Relieve real de un departamento.
 *
 * Baja los tiles de elevación "Terrarium" (AWS Open Data, sin clave), arma la
 * grilla de altitudes y pinta una textura hipsométrica con sombreado del
 * terreno, recortada con la silueta del departamento (fuera = transparente).
 * No depende de three.js.
 */

export type Terrain = {
  /** Grilla de elevación en metros (cols × rows, en espacio Mercator). */
  dem: Float32Array;
  cols: number;
  rows: number;
  min: number;
  max: number;
  bb: { west: number; east: number; south: number; north: number };
  /** Ancho y alto del recuadro en km. */
  wKm: number;
  hKm: number;
  /** Textura (color o satélite) con alfa recortada a la silueta. */
  texture: HTMLCanvasElement;
  /** Versión pequeña y SIN recortar de la textura: de ahí se toma el color de las paredes. */
  edge: HTMLCanvasElement;
  /** true si la textura es imagen satelital (si no, relieve hipsométrico en verde). */
  satellite: boolean;
  /**
   * Solo si se pidió satélite: se resuelve cuando la imagen ya se descargó. Entonces este mismo objeto
   * se actualiza (`texture`, `edge`, `satellite`). Así el relieve se muestra YA con el color por altitud
   * y la imagen satelital se pone encima al llegar.
   */
  upgrade?: Promise<void>;
};

const DEM_URL = (z: number, x: number, y: number) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

const IMG_URL = (z: number, x: number, y: number) =>
  `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/${z}/${y}/${x}.jpg`;

const px = (lon: number, lat: number, z: number): [number, number] => {
  const n = 256 * 2 ** z;
  return [((lon + 180) / 360) * n, ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n];
};

/** Las siluetas están en grados × 20 con el eje Y de pantalla (hacia abajo). */
export const svgToLonLat = (x: number, y: number): [number, number] => [x / 20, -y / 20];

type Tile = { tx: number; ty: number; im: ImageBitmap };

/**
 * Descarga el tile COMPLETO (fetch) y lo decodifica con createImageBitmap.
 * Es determinista: un <img> decodificado de forma progresiva puede dejar franjas sin pintar
 * al dibujarlo en un lienzo; así, una descarga truncada falla y se reintenta.
 */
const TILE_CACHE = "yakana-tiles-v1";

/** Caché del navegador (Cache API): los tiles ya vistos cargan al instante, también en visitas futuras. */
async function openTileCache(): Promise<Cache | null> {
  try {
    return typeof caches !== "undefined" ? await caches.open(TILE_CACHE) : null;
  } catch {
    return null;
  }
}

async function loadImg(src: string): Promise<ImageBitmap> {
  const store = await openTileCache();
  const saved = await store?.match(src).catch(() => undefined);
  if (saved) {
    try {
      return await createImageBitmap(await saved.blob());
    } catch {
      void store?.delete(src); // copia dañada: se vuelve a bajar
    }
  }
  let lastErr: unknown;
  for (let intento = 0; intento < 4; intento++) {
    // Tiempo límite por petición: sin él, una descarga que se cuelga bloquea toda la carga del mosaico.
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(intento ? `${src}${src.includes("?") ? "&" : "?"}r=${intento}` : src, { mode: "cors", signal: ctl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const im = await createImageBitmap(blob);
      // Solo se guarda si decodificó bien (una descarga truncada no entra a la caché).
      void store?.put(src, new Response(blob, { headers: { "Content-Type": blob.type } })).catch(() => {});
      return im;
    } catch (e) {
      lastErr = e;
      await new Promise((ok) => setTimeout(ok, 250 * (intento + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("tile");
}

/** Ejecuta `fn` sobre cada elemento con como mucho `limit` descargas a la vez (el navegador solo hace ~6 por servidor). */
async function mapPool<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/* Rampa hipsométrica por altitud (m), igual que el mapa de relieve del Perú:
   selva y costa en verde, pardos en la sierra, crema y blanco en las cumbres. */
const RAMP: [number, [number, number, number]][] = [
  [0, [108, 166, 82]],
  [600, [104, 160, 78]],
  [1000, [132, 158, 74]],
  [1600, [160, 128, 62]],
  [2500, [166, 112, 58]],
  [3300, [192, 142, 86]],
  [4000, [216, 180, 126]],
  [4700, [238, 224, 198]],
  [5500, [252, 250, 248]],
];

function ramp(m: number): [number, number, number] {
  if (m <= RAMP[0][0]) return RAMP[0][1];
  for (let i = 1; i < RAMP.length; i++) {
    if (m <= RAMP[i][0]) {
      const [a, ca] = RAMP[i - 1],
        [b, cb] = RAMP[i];
      const k = (m - a) / (b - a);
      return [ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k];
    }
  }
  return RAMP[RAMP.length - 1][1];
}

const cache = new Map<string, Promise<Terrain>>();

export function getTerrain(shape: DeptShape, satellite: boolean, onProgress?: (tiles: number) => void): Promise<Terrain> {
  const key = `${shape.id}|${satellite}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = buildTerrain(shape, satellite, onProgress);
  cache.set(key, p);
  p.catch(() => cache.delete(key)); // reintentar si falló la red
  if (cache.size > 8) cache.delete(cache.keys().next().value as string);
  return p;
}

/**
 * Datos pre-generados por región (tools/make_region_assets.py): meta.json + dem.bin + sat.webp.
 * Reemplazan la descarga y unión de decenas de teselas. Si una región no los tiene (404) o algo
 * falla, `buildTerrain` sigue por el camino de teselas de siempre.
 */
const BAKED = "/explorador/regions/v2"; // v2: recuadros con los contornos de geoBoundaries

type BakedMeta = {
  cols: number;
  rows: number;
  min: number;
  max: number;
  bb: Terrain["bb"];
  wKm: number;
  hKm: number;
  dem: { z: number; x0: number; y0: number; sc: number; offset: number; scale: number };
  sat: { z: number; x0: number; y0: number; w: number; h: number };
};

async function loadBaked(shape: DeptShape, wantSatellite: boolean, onProgress?: (tiles: number) => void): Promise<Terrain | null> {
  try {
    const base = `${BAKED}/${shape.id}`;
    const mr = await fetch(`${base}/meta.json`);
    if (!mr.ok || !(mr.headers.get("content-type") ?? "").includes("json")) return null; // sin archivos (o página 404)
    const meta = (await mr.json()) as BakedMeta;
    const dr = await fetch(`${base}/dem.bin`);
    if (!dr.ok) return null;
    const enc = new Uint16Array(await dr.arrayBuffer());
    const { cols, rows } = meta;
    if (enc.length !== cols * rows) return null;
    onProgress?.(1);
    // Deshace el delta horizontal (aritmética de 16 bits) y vuelve a metros.
    const dem = new Float32Array(cols * rows);
    const { offset, scale } = meta.dem;
    for (let y = 0; y < rows; y++) {
      let acc = 0;
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        acc = (acc + enc[i]) & 0xffff;
        dem[i] = acc / scale - offset;
      }
    }
    const { min, max, bb, wKm, hKm } = meta;
    const { texture, raw } = paintTexture({ dem, cols, rows, min, max, wKm, hKm }, shape, meta.dem.z, meta.dem.x0, meta.dem.y0, meta.dem.sc);
    const terrain: Terrain = { dem, cols, rows, min, max, bb, wKm, hKm, texture, edge: shrink(raw, 512), satellite: false };
    if (wantSatellite) {
      terrain.upgrade = (async () => {
        try {
          const sr = await fetch(`${base}/sat.webp`);
          if (!sr.ok) return;
          const im = await createImageBitmap(await sr.blob());
          const cv = document.createElement("canvas");
          cv.width = im.width;
          cv.height = im.height;
          cv.getContext("2d", { willReadFrequently: true })!.drawImage(im, 0, 0);
          const s = meta.sat;
          terrain.texture = clipToShape(cv, shape, s.z, s.x0, s.y0);
          terrain.edge = shrink(cv, 512);
          terrain.satellite = true;
          onProgress?.(2);
        } catch {
          /* se queda con el relieve en verde */
        }
      })();
    }
    return terrain;
  } catch {
    return null;
  }
}

async function buildTerrain(shape: DeptShape, wantSatellite: boolean, onProgress?: (tiles: number) => void): Promise<Terrain> {
  const baked = await loadBaked(shape, wantSatellite, onProgress);
  if (baked) return baked;

  const pad = 0.04; // un poco de margen alrededor de la silueta
  const [w0, n0] = svgToLonLat(shape.bbox.x0, shape.bbox.y0);
  const [e0, s0] = svgToLonLat(shape.bbox.x1, shape.bbox.y1);
  const bb = { west: w0 - pad, east: e0 + pad, north: n0 + pad, south: s0 - pad };

  // El zoom más fino cuyo mosaico no pase de ~760 px por lado (≈ 2× menos tiles que antes; el 3D se ve igual).
  const sizeAt = (z: number) => {
    const [x0, y0] = px(bb.west, bb.north, z),
      [x1, y1] = px(bb.east, bb.south, z);
    return Math.max(x1 - x0, y1 - y0);
  };
  let z = 10;
  while (z > 5 && sizeAt(z) > 760) z--;

  const [x0, y0] = px(bb.west, bb.north, z),
    [x1, y1] = px(bb.east, bb.south, z);
  const cols = Math.round(x1 - x0),
    rows = Math.round(y1 - y0);

  // La imagen satelital (si se pide) se baja justo después de la elevación; si falla se usa el verde.
  let done = 0;
  const tick = () => onProgress?.(++done);
  let startSat: () => void = () => {};
  const satGate = new Promise<void>((ok) => (startSat = ok));
  const satPromise: Promise<Painted | null> = wantSatellite ? satGate.then(() => satelliteTexture(shape, bb, z, tick).catch(() => null)) : Promise.resolve(null);

  const cv = document.createElement("canvas");
  cv.width = cols;
  cv.height = rows;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  const coords: [number, number][] = [];
  for (let ty = Math.floor(y0 / 256); ty <= Math.floor(y1 / 256); ty++)
    for (let tx = Math.floor(x0 / 256); tx <= Math.floor(x1 / 256); tx++) coords.push([tx, ty]);
  const tiles = await mapPool(coords, 12, async ([tx, ty]): Promise<Tile> => {
    const im = await loadImg(DEM_URL(z, tx, ty));
    tick();
    return { tx, ty, im };
  });
  startSat(); // el relieve ya llegó: ahora sí se baja la imagen satelital
  // Se pinta todo junto cuando ya están todas decodificadas (evita tiles sin pintar).
  for (const { tx, ty, im } of tiles) ctx.drawImage(im, tx * 256 - x0, ty * 256 - y0);

  const data = ctx.getImageData(0, 0, cols, rows).data;
  const dem = new Float32Array(cols * rows);
  for (let i = 0; i < dem.length; i++) dem[i] = data[i * 4] * 256 + data[i * 4 + 1] + data[i * 4 + 2] / 256 - 32768;
  // Rango por percentiles: ignora huecos y valores atípicos del modelo de elevación.
  const sample: number[] = [];
  for (let i = 0; i < dem.length; i += 7) sample.push(dem[i]);
  sample.sort((a, b) => a - b);
  const min = Math.max(0, sample[Math.floor(sample.length * 0.003)]);
  const max = sample[Math.floor(sample.length * 0.999)];

  const wKm = (bb.east - bb.west) * 111.32 * Math.cos((((bb.south + bb.north) / 2) * Math.PI) / 180);
  const hKm = (wKm * rows) / cols;

  // Textura inmediata (color por altitud + sombreado); la satelital llega después sin bloquear.
  const { texture, raw } = paintTexture({ dem, cols, rows, min, max, wKm, hKm }, shape, z, x0, y0);
  const terrain: Terrain = { dem, cols, rows, min, max, bb, wKm, hKm, texture, edge: shrink(raw, 512), satellite: false };
  if (wantSatellite) {
    terrain.upgrade = satPromise.then((painted) => {
      if (!painted) return; // si falla la descarga se queda con el relieve en verde
      terrain.texture = painted.texture;
      terrain.edge = shrink(painted.raw, 512);
      terrain.satellite = true;
    });
  }
  return terrain;
}

type Painted = { texture: HTMLCanvasElement; raw: HTMLCanvasElement };

/** Copia reducida (máx. `max` px por lado). */
function shrink(src: HTMLCanvasElement, max: number) {
  const k = Math.min(1, max / Math.max(src.width, src.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(src.width * k));
  c.height = Math.max(1, Math.round(src.height * k));
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function paintTexture(
  t: { dem: Float32Array; cols: number; rows: number; min: number; max: number; wKm: number; hKm: number },
  shape: DeptShape,
  z: number,
  x0: number,
  y0: number,
  sc = 1,
): Painted {
  const { dem, cols, rows } = t;
  const cellX = (t.wKm * 1000) / cols,
    cellY = (t.hKm * 1000) / rows;

  // Sombreado clásico (luz desde el noroeste, 45° de altura), con la pendiente realzada.
  const zen = (45 * Math.PI) / 180,
    az = (315 * Math.PI) / 180,
    zf = 2.2;
  const img = new ImageData(cols, rows);
  const at = (x: number, y: number) => dem[Math.min(rows - 1, Math.max(0, y)) * cols + Math.min(cols - 1, Math.max(0, x))];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dzdx = ((at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1))) / (8 * cellX);
      const dzdy = ((at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1))) / (8 * cellY);
      const slope = Math.atan(zf * Math.hypot(dzdx, dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);
      const shade = Math.max(0, Math.cos(zen) * Math.cos(slope) + Math.sin(zen) * Math.sin(slope) * Math.cos(az - aspect));
      const k = 0.3 + 1.0 * shade;
      const [r, g, b] = ramp(at(x, y));
      const i = (y * cols + x) * 4;
      img.data[i] = Math.min(255, r * k);
      img.data[i + 1] = Math.min(255, g * k);
      img.data[i + 2] = Math.min(255, b * k);
      img.data[i + 3] = 255;
    }
  }
  const raw = document.createElement("canvas");
  raw.width = cols;
  raw.height = rows;
  raw.getContext("2d")!.putImageData(img, 0, 0);

  return { texture: clipToShape(raw, shape, z, x0, y0, sc), raw };
}

/**
 * Recorta un lienzo con la silueta: afuera queda transparente. `z`,`x0`,`y0`: zoom y origen del mosaico;
 * `sc`: escala del lienzo respecto al mosaico (1 salvo que esté reducido, como el DEM pre-generado).
 */
function clipToShape(src: HTMLCanvasElement, shape: DeptShape, z: number, x0: number, y0: number, sc = 1) {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const c2 = out.getContext("2d", { willReadFrequently: true })!;
  c2.beginPath();
  for (const ring of shape.rings) {
    ring.forEach(([sx, sy], i) => {
      const [lon, lat] = svgToLonLat(sx, sy);
      const [qx, qy] = px(lon, lat, z);
      if (i) c2.lineTo((qx - x0) * sc, (qy - y0) * sc);
      else c2.moveTo((qx - x0) * sc, (qy - y0) * sc);
    });
    c2.closePath();
  }
  c2.clip();
  c2.drawImage(src, 0, 0);
  return out;
}

/** Mosaico de Sentinel-2 (EOX, sin clave) recortado a la silueta. */
async function satelliteTexture(shape: DeptShape, bb: Terrain["bb"], zDem: number, tick: () => void): Promise<Painted> {
  const size = (z: number) => {
    const [a, b] = px(bb.west, bb.north, z),
      [c, d] = px(bb.east, bb.south, z);
    return Math.max(c - a, d - b);
  };
  let z = zDem;
  // Suficiente para la vista 3D (≈700 px en pantalla): menos tiles que el siguiente zoom.
  while (z < 14 && size(z + 1) <= 1400) z++;
  const [x0, y0] = px(bb.west, bb.north, z),
    [x1, y1] = px(bb.east, bb.south, z);
  const cv = document.createElement("canvas");
  cv.width = Math.round(x1 - x0);
  cv.height = Math.round(y1 - y0);
  // Lienzo por CPU: con tantos megapíxeles el lienzo acelerado por GPU puede dejar tiles sin pintar.
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  const coords: [number, number][] = [];
  for (let ty = Math.floor(y0 / 256); ty <= Math.floor(y1 / 256); ty++)
    for (let tx = Math.floor(x0 / 256); tx <= Math.floor(x1 / 256); tx++) coords.push([tx, ty]);
  const tiles = await mapPool(coords, 12, async ([tx, ty]): Promise<Tile> => {
    const im = await loadImg(IMG_URL(z, tx, ty));
    tick();
    return { tx, ty, im };
  });
  for (const { tx, ty, im } of tiles) ctx.drawImage(im, tx * 256 - x0, ty * 256 - y0);
  return { texture: clipToShape(cv, shape, z, x0, y0), raw: cv };
}
