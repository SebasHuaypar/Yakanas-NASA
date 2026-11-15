"use client";

import { memo } from "react";
import {
  DEPT_SHAPES,
  PERU_VIEWBOX,
  PERU_VIEWBOX_STR,
} from "@/app/explorador/lib/geo";

export type MapFire = { lon: number; lat: number };
export type MapEvent = { lon: number; lat: number; n: number; active: boolean };
export type MapPlace = { id: string; name: string; lat: number; lon: number };
export type MapZone = { lon: number; lat: number; f: number };

/** Los datos de la API se dibujan en coordenadas del mapa: x = longitud × 20, y = −latitud × 20. */
const X = (lon: number) => lon * 20;
const Y = (lat: number) => -lat * 20;

/**
 * Mapa del Perú con capas reales: detecciones de fuego, eventos activos, zonas históricas y lugares
 * guardados. Si recibe `onPick`, tocar el mapa devuelve la latitud y la longitud del punto.
 */
function FireMap({
  fires = [],
  events = [],
  places = [],
  zones = [],
  pending = null,
  onPick,
  aria,
  className = "",
}: {
  fires?: MapFire[];
  events?: MapEvent[];
  places?: MapPlace[];
  zones?: MapZone[];
  pending?: { lat: number; lon: number } | null;
  onPick?: (lat: number, lon: number) => void;
  aria: string;
  className?: string;
}) {
  const pick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPick) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x =
      PERU_VIEWBOX.x + ((e.clientX - r.left) / r.width) * PERU_VIEWBOX.w;
    const y =
      PERU_VIEWBOX.y + ((e.clientY - r.top) / r.height) * PERU_VIEWBOX.h;
    onPick(-y / 20, x / 20);
  };
  const maxN = Math.max(1, ...events.map((e) => e.n));

  return (
    <svg
      viewBox={PERU_VIEWBOX_STR}
      role="img"
      aria-label={aria}
      onClick={pick}
      className={`block h-auto w-full ${onPick ? "cursor-crosshair" : ""} ${className}`}
    >
      {DEPT_SHAPES.map((s) => (
        <path
          key={s.id}
          d={s.d}
          fill="#F3F9FC"
          fillOpacity={0.05}
          stroke="#F3F9FC"
          strokeOpacity={0.35}
          strokeWidth={0.7}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {zones.map((z, i) => (
        <rect
          key={i}
          x={X(z.lon) - 0.9}
          y={Y(z.lat) - 0.9}
          width={1.8}
          height={1.8}
          fill="#F3F9FC"
          fillOpacity={0.15 + 0.8 * z.f}
        />
      ))}

      {fires.map((f, i) => (
        <circle
          key={i}
          cx={X(f.lon)}
          cy={Y(f.lat)}
          r={0.6}
          fill="#F3F9FC"
          fillOpacity={0.55}
        />
      ))}

      {events
        .filter((e) => e.active)
        .map((e, i) => (
          <circle
            key={i}
            cx={X(e.lon)}
            cy={Y(e.lat)}
            r={1.4 + 2.2 * Math.sqrt(e.n / maxN)}
            fill="none"
            stroke="#F3F9FC"
            strokeWidth={0.9}
            vectorEffect="non-scaling-stroke"
          />
        ))}

      {places.map((p) => (
        <g key={p.id} transform={`translate(${X(p.lon)} ${Y(p.lat)})`}>
          <title>{p.name}</title>
          <circle
            r={4}
            fill="#0C090A"
            fillOpacity={0.7}
            stroke="#F3F9FC"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
          <circle r={1.5} fill="#F3F9FC" />
        </g>
      ))}

      {pending && (
        <g transform={`translate(${X(pending.lon)} ${Y(pending.lat)})`}>
          <circle
            r={4.5}
            fill="none"
            stroke="#F3F9FC"
            strokeWidth={1.4}
            strokeDasharray="1.5 1.5"
            vectorEffect="non-scaling-stroke"
          />
          <circle r={1.3} fill="#F3F9FC" />
        </g>
      )}
    </svg>
  );
}

export default memo(FireMap);
