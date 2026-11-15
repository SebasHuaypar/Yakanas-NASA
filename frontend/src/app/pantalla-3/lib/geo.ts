import { PERU_GEO } from "./peru-geo";

/** Marco del mapa de todo el Perú (coincide con los contornos). */
export const PERU_VIEWBOX = { x: -1632, y: -2, w: 264, h: 372 };
export const PERU_VIEWBOX_STR = `${PERU_VIEWBOX.x} ${PERU_VIEWBOX.y} ${PERU_VIEWBOX.w} ${PERU_VIEWBOX.h}`;

/** Marco de la imagen de relieve (assets/peru-relief.webp): los contornos más un margen para la sombra. */
export const RELIEF_VIEWBOX = { x: -1652, y: -22, w: 304, h: 412 };
export const RELIEF_VIEWBOX_STR = `${RELIEF_VIEWBOX.x} ${RELIEF_VIEWBOX.y} ${RELIEF_VIEWBOX.w} ${RELIEF_VIEWBOX.h}`;

export type Pt = [number, number];
export type Ring = Pt[];

export type DeptShape = {
  id: string;
  name: string;
  /** Anillos en coordenadas de pantalla (Y hacia abajo). */
  rings: Ring[];
  /** Path SVG listo para dibujar. */
  d: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  /** km² aproximados. */
  area: number;
};

const ringToPath = (r: Ring) =>
  r.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("") + "Z";

export function ringsToPath(rings: Ring[]) {
  return rings.map(ringToPath).join("");
}

function parseRings(s: string): Ring[] {
  return s.split("|").map((r) =>
    r.split(" ").map((p) => {
      const [x, y] = p.split(",").map(Number);
      return [x, -y] as Pt; // la fuente trae Y hacia arriba
    }),
  );
}

function bboxOf(rings: Ring[]) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const r of rings)
    for (const [x, y] of r) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  return { x0, y0, x1, y1 };
}

function areaKm2(rings: Ring[]) {
  let A = 0,
    sy = 0,
    n = 0;
  for (const r of rings) {
    let s = 0;
    for (let i = 0; i < r.length; i++) {
      const p = r[i],
        q = r[(i + 1) % r.length];
      s += p[0] * q[1] - q[0] * p[1];
      sy += p[1];
      n++;
    }
    A += Math.abs(s) / 2;
  }
  // 20 unidades = 1 grado; 111,32 km por grado en el ecuador
  return A * Math.pow(111.32 / 20, 2) * Math.cos(((sy / n) / 20) * (Math.PI / 180));
}

export const DEPT_SHAPES: DeptShape[] = PERU_GEO.map((g) => {
  const rings = parseRings(g.rings);
  return {
    id: g.id,
    name: g.name,
    rings,
    d: ringsToPath(rings),
    bbox: bboxOf(rings),
    area: areaKm2(rings),
  };
});

export const SHAPE_BY_ID: Record<string, DeptShape> = Object.fromEntries(
  DEPT_SHAPES.map((s) => [s.id, s]),
);

function inRing(x: number, y: number, r: Ring) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i],
      [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInRings(x: number, y: number, rings: Ring[]) {
  let c = 0;
  for (const r of rings) if (inRing(x, y, r)) c++;
  return c % 2 === 1;
}

/** Generador pseudoaleatorio determinista (para que los datos simulados no cambien en cada carga). */
export function seeded(seed: string | number) {
  let h = 1779033703 ^ String(seed).length;
  for (const ch of String(seed)) {
    h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** n puntos al azar (estables) dentro del departamento. */
export function samplePoints(shape: DeptShape, n: number, seed: string | number): Pt[] {
  const rnd = seeded(seed);
  const { x0, y0, x1, y1 } = shape.bbox;
  const out: Pt[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 80) {
    const x = x0 + rnd() * (x1 - x0),
      y = y0 + rnd() * (y1 - y0);
    if (pointInRings(x, y, shape.rings)) out.push([x, y]);
  }
  return out;
}
