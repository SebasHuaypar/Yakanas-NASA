"use client";

import { memo } from "react";
import { DEPT_SHAPES, PERU_VIEWBOX } from "@/app/explorador/lib/geo";

export type MapFire = { lon: number; lat: number };
export type MapEvent = { lon: number; lat: number; n: number; active: boolean };
export type MapPlace = { id: string; name: string; lat: number; lon: number };

/** Los datos de la API se dibujan en coordenadas del mapa: x = longitud × 20, y = −latitud × 20. */
const X = (lon: number) => lon * 20;
const Y = (lat: number) => -lat * 20;

/**
 * Mapa del Perú con capas reales: detecciones de fuego, eventos activos y lugares guardados.
 * - Sin `focus` muestra todo el país. Con `focus` se acerca a un punto (`spanDeg` grados de ancho) y dibuja
 *   los anillos de 10 y 25 km alrededor del punto elegido.
 * - Si recibe `onPick`, tocar el mapa devuelve la latitud y la longitud del punto.
 */
function FireMap({
  fires = [],
  events = [],
  places = [],
  pending = null,
  focus = null,
  view = null,
  spanDeg = 1.2,
  onPick,
  aria,
  className = "",
}: {
  fires?: MapFire[];
  events?: MapEvent[];
  places?: MapPlace[];
  pending?: { lat: number; lon: number } | null;
  focus?: { lat: number; lon: number } | null;
  view?: { lat: number; lon: number; span: number } | null;
  spanDeg?: number;
  onPick?: (lat: number, lon: number) => void;
  aria: string;
  className?: string;
}) {
  const c = view ?? (focus ? { ...focus, span: spanDeg } : null);
  const s = (c?.span ?? 0) * 20;
  const vb = c ? { x: X(c.lon) - s / 2, y: Y(c.lat) - s / 2, w: s, h: s } : PERU_VIEWBOX;
  const zoomed = !!c;
  const dot = vb.w * (zoomed ? 0.0095 : 0.0027);
  const pin = vb.w * (zoomed ? 0.03 : 0.016);
  const maxN = Math.max(1, ...events.map((e) => e.n));

  const pick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPick) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = vb.x + ((e.clientX - r.left) / r.width) * vb.w;
    const y = vb.y + ((e.clientY - r.top) / r.height) * vb.h;
    onPick(-y / 20, x / 20);
  };

  const ring = (km: number) => (km / 111) * 20;

  return (
    <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} role="img" aria-label={aria} onClick={pick} className={`block h-auto w-full ${onPick ? "cursor-crosshair" : ""} ${className}`}>
      {DEPT_SHAPES.map((d) => (
        <path key={d.id} d={d.d} fill="#F3F9FC" fillOpacity={0.05} stroke="#F3F9FC" strokeOpacity={0.35} strokeWidth={0.7} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ))}

      {focus && (
        <g fill="none" stroke="#F3F9FC" strokeOpacity={0.35} strokeDasharray="3 3">
          <circle cx={X(focus.lon)} cy={Y(focus.lat)} r={ring(25)} vectorEffect="non-scaling-stroke" />
          <circle cx={X(focus.lon)} cy={Y(focus.lat)} r={ring(10)} vectorEffect="non-scaling-stroke" />
        </g>
      )}

      {fires.map((f, i) => (
        <circle key={i} cx={X(f.lon)} cy={Y(f.lat)} r={dot} fill="#FFB347" fillOpacity={0.85} />
      ))}

      {events
        .filter((e) => e.active)
        .map((e, i) => (
          <circle key={i} cx={X(e.lon)} cy={Y(e.lat)} r={vb.w * (zoomed ? 0.02 : 0.006) + vb.w * (zoomed ? 0.03 : 0.008) * Math.sqrt(e.n / maxN)} fill="none" stroke="#FF7A2F" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        ))}

      {places.map((p) => (
        <g key={p.id} transform={`translate(${X(p.lon)} ${Y(p.lat)})`}>
          <title>{p.name}</title>
          <circle r={pin} fill="#0C090A" fillOpacity={0.75} stroke="#F3F9FC" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
          <circle r={pin * 0.38} fill="#F3F9FC" />
        </g>
      ))}

      {pending && (
        <g transform={`translate(${X(pending.lon)} ${Y(pending.lat)})`}>
          <circle r={pin * 1.1} fill="none" stroke="#F3F9FC" strokeWidth={1.5} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          <circle r={pin * 0.34} fill="#F3F9FC" />
        </g>
      )}
    </svg>
  );
}

export default memo(FireMap);
