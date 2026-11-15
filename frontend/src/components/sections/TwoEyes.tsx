"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Card from "@/components/Card";
import Reveal from "@/components/Reveal";
import SectionDivider from "@/components/SectionDivider";
import { DEPT_SHAPES } from "@/app/explorador/lib/geo";
import { type ApiFires } from "@/lib/api";
import { useLang } from "@/lib/lang";
import { SENSOR_RATIO } from "@/lib/sensor-series";
import { sceneBus } from "@/lib/scene-bus";
import { useApi } from "@/lib/use-api";

/* ---------------------------------------------------------------------------------------------
   «Dos ojos en el cielo»: la lupa muestra detecciones REALES de la última semana (API /fires).
   Cada cuadrado tiene el tamaño real del píxel del sensor: MODIS 1 km, VIIRS 375 m.
   --------------------------------------------------------------------------------------------- */

const MODIS_KM = 1;
const VIIRS_KM = 0.375;
const WINDOW_KM = 24; // ancho de la zona observada (≈ 0,2°)
const KM_LAT = 110.57;
const KM_LON = 111.32;

const TXT = {
  en: {
    label: "The satellites",
    title: "Two eyes in the sky, with different sight",
    lead: "MODIS has watched the Earth since 2000. VIIRS joined in 2012 with a sharper view. Tap one to see what it sees.",
    modisNote:
      "A small fire fills only part of a 1 km square, so MODIS reports the whole square.",
    viirsNote:
      "At 375 m the same area is split into several squares, so VIIRS locates the fire better.",
    see: "See in the lens →",
    since: "Since",
    pixel: "Pixel",
    inLens: "In the lens",
    hotspot: "hotspot",
    hotspots: "hotspots",
    lensAria:
      "Real MODIS and VIIRS detections over the same area. Drag the center line.",
    zoom: "Zoom",
    drag: "Drag the center line to compare",
    scale: "1 km",
    loading: "Loading real detections…",
    error: "We could not load the detections right now.",
    retry: "Retry",
    scene: (place: string, a: string, b: string) =>
      `Real detections near ${place}, ${a} – ${b} (NASA FIRMS, near real time).`,
    stat: (n: string) =>
      `Over Peru in 2012–2022, VIIRS detected about ${n} times more hotspots than MODIS. Comparing them as they are would be unfair, so we merge them into a single record.`,
    dec: ".",
    loc: "en-US",
  },
  es: {
    label: "Los satélites",
    title: "Dos ojos en el cielo, con distinta vista",
    lead: "MODIS vigila la Tierra desde el año 2000. VIIRS se sumó en 2012 con una mirada más nítida. Toca uno para ver qué ve.",
    modisNote:
      "Un incendio pequeño llena solo parte de un cuadro de 1 km, así que MODIS reporta el cuadro entero.",
    viirsNote:
      "A 375 m la misma zona se divide en varios cuadros, así que VIIRS ubica mejor el fuego.",
    see: "Ver en la lupa →",
    since: "Desde",
    pixel: "Píxel",
    inLens: "En la lupa",
    hotspot: "foco",
    hotspots: "focos",
    lensAria:
      "Detecciones reales de MODIS y VIIRS sobre la misma zona. Arrastra la línea central.",
    zoom: "Zoom",
    drag: "Arrastra la línea central para comparar",
    scale: "1 km",
    loading: "Cargando detecciones reales…",
    error: "No pudimos cargar las detecciones en este momento.",
    retry: "Reintentar",
    scene: (place: string, a: string, b: string) =>
      `Detecciones reales cerca de ${place}, ${a} – ${b} (NASA FIRMS, casi en tiempo real).`,
    stat: (n: string) =>
      `Sobre el Perú en 2012–2022, VIIRS detectó unas ${n} veces más focos que MODIS. Compararlos tal cual sería injusto: por eso los unimos en un solo registro.`,
    dec: ",",
    loc: "es-PE",
  },
};

const OVERLAP_RATIO = SENSOR_RATIO;

type Det = { x: number; y: number; km: number; sensor: "modis" | "viirs" };

/** Elige la zona de 0,2° con más detecciones de ambos sensores y devuelve sus detecciones en km respecto al centro. */
function pickScene(data: ApiFires) {
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
function Lens({
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

/** «Dos ojos en el cielo»: sección normal de la landing. */
export default function TwoEyes() {
  const [lang] = useLang();
  const L = TXT[lang];
  const section = useRef<HTMLElement>(null);
  const statBox = useRef<HTMLDivElement>(null);
  const [statV, setStatV] = useState(OVERLAP_RATIO);
  const [zoom, setZoom] = useState(2);
  const [split, setSplit] = useState(0.5);
  const fires = useApi<ApiFires>("/fires", { limit: 20000 });
  const scene = useMemo(
    () => (fires.data ? pickScene(fires.data) : null),
    [fires.data],
  );

  // El globo de fondo se acerca a Perú y traza el contorno mientras la sección está en pantalla
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          sceneBus.outline = 1;
          sceneBus.zoom = 1;
          sceneBus.clear = 1;
        } else if (e.boundingClientRect.top < 0) {
          // Se fue hacia abajo (siguiente sección): el globo se queda cerca de Perú y solo se
          // desvanece el contorno y el aclarado, poco a poco
          sceneBus.outline = 0;
          sceneBus.clear = 0;
        } else {
          // Todavía no llegamos (o volvimos arriba): estado inicial
          sceneBus.outline = 0;
          sceneBus.zoom = 0;
          sceneBus.clear = 0;
        }
      },
      { threshold: 0.12, rootMargin: "25% 0px 25% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      sceneBus.outline = 0;
      sceneBus.zoom = 0;
      sceneBus.clear = 0;
    };
  }, []);

  // Cifra: cuenta hacia arriba hasta la razón real cuando aparece
  useEffect(() => {
    const box = statBox.current;
    if (!box) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (now: number) => {
          const k = Math.min(1, (now - t0) / 1600);
          setStatV(OVERLAP_RATIO * (1 - Math.pow(1 - k, 3)));
          if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(box);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const size = WINDOW_KM / zoom;
  const inLens = (sensor: "modis" | "viirs") =>
    scene
      ? scene.dets.filter(
          (d) =>
            d.sensor === sensor &&
            Math.abs(d.x - scene.fx) <= size / 2 &&
            Math.abs(d.y - scene.fy) <= size / 2,
        ).length
      : 0;

  // Tocar una tarjeta de satélite mueve la línea para ver solo lo que ve ese sensor
  const focusSide = (side: "modis" | "viirs") => {
    setSplit(side === "modis" ? 0.96 : 0.04);
    setZoom(2.2);
  };

  const sensors = [
    {
      id: "modis" as const,
      name: "MODIS",
      since: "2000",
      pixel: "1 km",
      note: L.modisNote,
    },
    {
      id: "viirs" as const,
      name: "VIIRS",
      since: "2012",
      pixel: "375 m",
      note: L.viirsNote,
    },
  ];
  const fmtDay = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(L.loc, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  };

  return (
    <section
      ref={section}
      id="satelites"
      className="relative px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32"
    >
      <div className="mx-auto w-full max-w-6xl">
        <SectionDivider index="03" label={L.label} />

        <div className="mt-10 grid gap-8 sm:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,33rem)] lg:gap-x-14 lg:gap-y-8">
          {/* Título y los dos satélites */}
          <div className="flex flex-col gap-7 lg:col-start-1 lg:row-start-1">
            <Reveal className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-x-4 -inset-y-6 -z-10 bg-[radial-gradient(ellipse_at_left,rgb(12_9_10/0.65),transparent_75%)]"
              />
              <h2 className="text-[1.9rem] leading-tight tracking-tight sm:text-5xl">
                {L.title}
              </h2>
              <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-snow/75 sm:text-base">
                {L.lead}
              </p>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {sensors.map((s, i) => {
                const hits = inLens(s.id);
                return (
                  <Reveal key={s.id} delay={120 + i * 120}>
                    <button
                      type="button"
                      onClick={() => focusSide(s.id)}
                      className="group h-full w-full rounded-3xl border border-snow/15 bg-ink/55 p-5 text-left shadow-[inset_0_1px_0_rgb(243_249_252/0.1)] backdrop-blur-xl transition duration-300 hover:border-snow/40 hover:bg-ink/70"
                    >
                      <span className="flex items-baseline justify-between">
                        <span className="font-heading text-3xl font-bold text-snow">
                          {s.name}
                        </span>
                        <span
                          aria-hidden="true"
                          className="hidden text-xs text-snow/50 transition-transform duration-300 group-hover:translate-x-1 min-[1400px]:inline"
                        >
                          {L.see}
                        </span>
                      </span>
                      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-snow/45">{L.since}</dt>
                          <dd className="mt-0.5 text-base font-medium text-snow">
                            {s.since}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-snow/45">{L.pixel}</dt>
                          <dd className="mt-0.5 text-base font-medium text-snow">
                            {s.pixel}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-snow/45">{L.inLens}</dt>
                          <dd className="mt-0.5 text-base font-medium text-snow">
                            {scene
                              ? `${hits} ${hits === 1 ? L.hotspot : L.hotspots}`
                              : "–"}
                          </dd>
                        </div>
                      </dl>
                      <span className="mt-4 block text-xs leading-relaxed text-snow/65">
                        {s.note}
                      </span>
                    </button>
                  </Reveal>
                );
              })}
            </div>
          </div>

          {/* Lupa con detecciones reales */}
          <Reveal className="lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <Card tone="dark" className="rounded-[2rem] p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-snow/55">
                <span>MODIS · 1 km</span>
                <span>VIIRS · 375 m</span>
              </div>
              {scene && fires.data ? (
                <>
                  <Lens
                    dets={scene.dets}
                    fx={scene.fx}
                    fy={scene.fy}
                    zoom={zoom}
                    split={split}
                    onSplit={setSplit}
                    aria={L.lensAria}
                    scaleLabel={L.scale}
                  />
                  <label className="mx-auto mt-5 flex max-w-[360px] items-center gap-3 text-xs text-snow/65">
                    <span className="shrink-0">{L.zoom}</span>
                    <input
                      type="range"
                      min={1}
                      max={4}
                      step={0.05}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="h-1 w-full cursor-pointer accent-[#F3F9FC]"
                    />
                  </label>
                  <p className="mt-4 text-center text-xs text-snow/55">
                    {L.drag}
                  </p>
                  <p className="mt-2 text-center text-[11px] leading-relaxed text-snow/45">
                    {L.scene(
                      scene.dep,
                      fmtDay(fires.data.cobertura.desde),
                      fmtDay(fires.data.cobertura.hasta),
                    )}
                  </p>
                </>
              ) : (
                <div
                  role="status"
                  className="grid aspect-square w-full max-w-[520px] place-items-center rounded-full text-center text-sm text-snow/60 ring-1 ring-snow/20 mx-auto"
                >
                  {fires.error ? (
                    <div className="flex flex-col items-center gap-3 px-8">
                      <p>{L.error}</p>
                      <button
                        type="button"
                        onClick={fires.reload}
                        className="cursor-pointer rounded-full border border-snow/30 px-5 py-2 font-medium text-snow transition-colors hover:border-snow"
                      >
                        {L.retry}
                      </button>
                    </div>
                  ) : (
                    <p className="animate-pulse">{L.loading}</p>
                  )}
                </div>
              )}
            </Card>
          </Reveal>

          {/* Cifra real: la diferencia entre los dos ojos */}
          <Reveal className="lg:col-start-1 lg:row-start-2">
            <Card
              tone="dark"
              ref={statBox}
              className="flex items-center gap-5 p-5 sm:gap-7 sm:p-6"
            >
              <p className="font-heading text-5xl font-bold leading-none tracking-tight text-snow sm:text-7xl">
                <span>×{statV.toFixed(1).replace(".", L.dec)}</span>
              </p>
              <p className="text-sm leading-relaxed text-snow/80 sm:text-base">
                {L.stat(OVERLAP_RATIO.toFixed(1).replace(".", L.dec))}
              </p>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
