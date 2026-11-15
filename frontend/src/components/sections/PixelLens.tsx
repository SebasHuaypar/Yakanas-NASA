"use client";

import { useRef } from "react";
import { DEPT_SHAPES } from "@/app/explorador/lib/geo";
import type { ApiFires } from "@/lib/api";

/* Lupa MODIS vs VIIRS con detecciones REALES de la última semana (API /fires).
   Cada cuadrado tiene el tamaño real del píxel del sensor: MODIS 1 km, VIIRS 375 m. */

export const WINDOW_KM = 24; // ancho de la zona observada (≈ 0,2°)
const MODIS_KM = 1;
const VIIRS_KM = 0.375;
const KM_LAT = 110.57;
const KM_LON = 111.32;

export type Det = {
  x: number;
  y: number;
  km: number;
  sensor: "modis" | "viirs";
};

/** Elige la zona de 0,2° con más detecciones de ambos sensores y devuelve sus detecciones en km respecto al centro. */
export function pickScene(data: ApiFires) {
  const bins = new Map<
    string,
    { m: number; v: number; lon: number; lat: number; dep: string }
  >();
  for (const f of data.features) {
    const sensor = f.properties.sensor;
    if (sensor !== "MODIS" && sensor !== "VIIRS_NOAA20") continue;
    const [lon, lat] = f.geometry.coordinates;
    const key = `${Math.floor(lon / 0.2)}|${Math.floor(lat / 0.2)}`;
    const b = bins.get(key) ?? {
      m: 0,
      v: 0,
      lon: (Math.floor(lon / 0.2) + 0.5) * 0.2,
      lat: (Math.floor(lat / 0.2) + 0.5) * 0.2,
      dep: f.properties.dep_id,
    };
    if (sensor === "MODIS") b.m++;
    else b.v++;
    bins.set(key, b);
  }
  let best: {
    m: number;
    v: number;
    lon: number;
    lat: number;
    dep: string;
  } | null = null;
  for (const b of bins.values()) {
    if (b.m < 2 || b.v < 2) continue;
    if (
      !best ||
      Math.min(b.m, b.v) * 100 + b.m + b.v >
        Math.min(best.m, best.v) * 100 + best.m + best.v
    )
      best = b;
  }
  if (!best) return null;
  const dets: Det[] = [];
  for (const f of data.features) {
    const sensor = f.properties.sensor;
    if (sensor !== "MODIS" && sensor !== "VIIRS_NOAA20") continue;
    const [lon, lat] = f.geometry.coordinates;
    const x = (lon - best.lon) * KM_LON * Math.cos((best.lat * Math.PI) / 180);
    const y = -(lat - best.lat) * KM_LAT; // el norte queda arriba
    if (Math.abs(x) > WINDOW_KM / 2 || Math.abs(y) > WINDOW_KM / 2) continue;
    dets.push({
      x,
      y,
      km: sensor === "MODIS" ? MODIS_KM : VIIRS_KM,
      sensor: sensor === "MODIS" ? "modis" : "viirs",
    });
  }
  // El zoom se centra donde hay más detecciones juntas
  let fx = 0;
  let fy = 0;
  let top = -1;
  for (const d of dets) {
    const n = dets.filter((o) => Math.hypot(o.x - d.x, o.y - d.y) < 3).length;
    if (n > top) {
      top = n;
      fx = d.x;
      fy = d.y;
    }
  }
  const dept = DEPT_SHAPES.find((s) => s.id === best.dep);
  return { dets, fx, fy, dep: dept?.name ?? "Perú" };
}

/** Lupa: a la izquierda de la línea se ven los cuadros de MODIS y a la derecha los de VIIRS. */
export function Lens({
  dets,
  fx,
  fy,
  zoom,
  split,
  onSplit,
  aria,
  scaleLabel,
}: {
  dets: Det[];
  fx: number;
  fy: number;
  zoom: number;
  split: number;
  onSplit: (s: number) => void;
  aria: string;
  scaleLabel: string;
}) {
  const size = WINDOW_KM / zoom;
  const k = 100 / size;
  const drag = useRef(false);
  const place = (e: React.PointerEvent<SVGSVGElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    onSplit(Math.min(0.98, Math.max(0.02, (e.clientX - b.left) / b.width)));
  };
  const sq = (d: Det) => ({
    x: 50 + (d.x - fx) * k - (d.km * k) / 2,
    y: 50 + (d.y - fy) * k - (d.km * k) / 2,
    w: d.km * k,
  });
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={aria}
      className="mx-auto block aspect-square w-full max-w-[520px] cursor-ew-resize touch-pan-y rounded-full ring-1 ring-snow/30"
      onPointerDown={(e) => {
        drag.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        place(e);
      }}
      onPointerMove={(e) => drag.current && place(e)}
      onPointerUp={() => (drag.current = false)}
      onPointerCancel={() => (drag.current = false)}
    >
      <defs>
        <clipPath id="lens-circle">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
        <clipPath id="lens-left">
          <rect x="0" y="0" width={split * 100} height="100" />
        </clipPath>
        <clipPath id="lens-right">
          <rect x={split * 100} y="0" width={100 - split * 100} height="100" />
        </clipPath>
      </defs>
      <g clipPath="url(#lens-circle)">
        <rect width="100" height="100" fill="#0C090A" fillOpacity="0.7" />
        <g clipPath="url(#lens-left)">
          {dets
            .filter((d) => d.sensor === "modis")
            .map((d, i) => {
              const r = sq(d);
              return (
                <rect
                  key={i}
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.w}
                  fill="#F3F9FC"
                  fillOpacity="0.5"
                  stroke="#F3F9FC"
                  strokeOpacity="0.9"
                  strokeWidth="0.25"
                />
              );
            })}
        </g>
        <g clipPath="url(#lens-right)">
          {dets
            .filter((d) => d.sensor === "viirs")
            .map((d, i) => {
              const r = sq(d);
              return (
                <rect
                  key={i}
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.w}
                  fill="#F3F9FC"
                  fillOpacity="0.95"
                />
              );
            })}
        </g>
        <line
          x1={split * 100}
          x2={split * 100}
          y1="0"
          y2="100"
          stroke="#F3F9FC"
          strokeWidth="0.5"
        />
        <circle
          cx={split * 100}
          cy="50"
          r="2.6"
          fill="#F3F9FC"
          stroke="#0C090A"
          strokeWidth="0.6"
        />
        {/* barra de escala: 1 km */}
        <g transform="translate(8 92)" fill="#F3F9FC">
          <rect x="0" y="0" width={k} height="0.9" />
          <text x="0" y="-1.6" fontSize="3.4" fillOpacity="0.8">
            {scaleLabel}
          </text>
        </g>
      </g>
    </svg>
  );
}
