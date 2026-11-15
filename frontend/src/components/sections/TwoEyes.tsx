"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import SectionDivider from "@/components/SectionDivider";
import { sceneBus } from "@/lib/scene-bus";
import Card from "@/components/Card";

/* ---------- Simulación del mismo terreno visto por dos sensores ---------- */

const N = 96; // muestras por lado (~62 m cada una): 6 km x 6 km
const MODIS_CELL = 16; // 1 km
const VIIRS_CELL = 6; // 375 m
const DETECT = 0.045; // fracción de fuego por píxel para considerarlo un foco
const BLOBS = [
  { x: 51, y: 51, r: 1.7 }, // incendio pequeño: MODIS lo diluye, VIIRS lo ve
  { x: 27, y: 63, r: 1.4 }, // incendio pequeño
  { x: 71, y: 30, r: 5.5 }, // incendio grande: lo ven los dos
  { x: 60, y: 75, r: 1.8 }, // incendio pequeño
];
const FOCUS = 51 / N; // el zoom se centra en el incendio pequeño del medio

type Cell = { terrain: number; fire: number };

/** Terreno + fuego a resolución fina, agregados en cuadros de `size` muestras. */
function buildGrid(size: number): { n: number; cells: Cell[] } {
  const n = Math.ceil(N / size);
  const cells: Cell[] = [];
  for (let cy = 0; cy < n; cy++) {
    for (let cx = 0; cx < n; cx++) {
      let t = 0;
      let f = 0;
      let count = 0;
      for (let y = cy * size; y < Math.min(N, (cy + 1) * size); y++) {
        for (let x = cx * size; x < Math.min(N, (cx + 1) * size); x++) {
          t +=
            0.5 +
            0.2 * Math.sin(x * 0.21) +
            0.16 * Math.sin(y * 0.17 + 1) +
            0.1 * Math.sin((x + y) * 0.11 + 2);
          for (const b of BLOBS) {
            if ((x - b.x) ** 2 + (y - b.y) ** 2 <= b.r * b.r) {
              f += 1;
              break;
            }
          }
          count++;
        }
      }
      cells.push({
        terrain: Math.min(1, Math.max(0, t / count)),
        fire: f / count,
      });
    }
  }
  return { n, cells };
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * "Dos ojos en el cielo": sección normal de la landing.
 * Mientras se lee, el globo de fondo se acerca a Perú y traza su contorno. La lupa muestra el mismo
 * incendio visto por MODIS (cuadros de 1 km) y por VIIRS (cuadros de 375 m): se arrastra la línea
 * central para comparar y se puede acercar con el control de zoom.
 */
export default function TwoEyes() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const lensBox = useRef<HTMLDivElement>(null);
  const statBox = useRef<HTMLDivElement>(null);
  const statNum = useRef<HTMLSpanElement>(null);
  // Estado de la lupa: valores actuales (z, s) y objetivos (tz, ts); se suavizan en cada cuadro
  const view = useRef({
    z: 1,
    tz: 1,
    s: 0.1,
    ts: 0.1,
    visible: false,
    dragging: false,
  });
  const [zoomUi, setZoomUi] = useState(1);

  const grids = useMemo(() => {
    const modis = buildGrid(MODIS_CELL);
    const viirs = buildGrid(VIIRS_CELL);
    return {
      modis,
      viirs,
      modisHits: modis.cells.filter((c) => c.fire >= DETECT).length,
      viirsHits: viirs.cells.filter((c) => c.fire >= DETECT).length,
    };
  }, []);

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

  // Lupa: animación de entrada por tiempo y control directo del usuario
  useEffect(() => {
    const cv = canvas.current;
    const box = lensBox.current;
    if (!cv || !box) return;
    let size = 0;
    let raf = 0;
    let started = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = cv.clientWidth;
      cv.width = Math.round(size * dpr);
      cv.height = Math.round(size * dpr);
    };

    const draw = () => {
      const ctx = cv.getContext("2d");
      if (!ctx || !size) return;
      const { z: zoom, s: split } = view.current;
      const dpr = cv.width / size;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#0C090A";
      ctx.fillRect(0, 0, size, size);

      const drawSide = (
        g: { n: number; cells: Cell[] },
        cellSize: number,
        side: 0 | 1,
      ) => {
        ctx.save();
        ctx.beginPath();
        if (side === 0) ctx.rect(0, 0, split * size, size);
        else ctx.rect(split * size, 0, size, size);
        ctx.clip();
        // zoom centrado en el incendio pequeño
        ctx.translate(size / 2, size / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-FOCUS * size, -FOCUS * size);
        const px = (cellSize / N) * size;
        g.cells.forEach((c, i) => {
          const x = (i % g.n) * px;
          const y = Math.floor(i / g.n) * px;
          const k = c.terrain;
          ctx.fillStyle = `rgb(${lerp(24, 76, k)},${lerp(36, 102, k)},${lerp(56, 121, k)})`;
          ctx.fillRect(x, y, px + 0.5, px + 0.5);
          if (c.fire > 0) {
            ctx.fillStyle = `rgba(243,249,252,${Math.min(0.5, c.fire * 6)})`;
            ctx.fillRect(x, y, px + 0.5, px + 0.5);
          }
          if (c.fire >= DETECT) {
            ctx.save();
            ctx.shadowColor = "rgba(243,249,252,0.9)";
            ctx.shadowBlur = 16;
            ctx.fillStyle = "#F3F9FC";
            ctx.fillRect(x + px * 0.06, y + px * 0.06, px * 0.88, px * 0.88);
            ctx.restore();
          }
          ctx.strokeStyle = "rgba(243,249,252,0.13)";
          ctx.lineWidth = 1 / zoom;
          ctx.strokeRect(x, y, px, px);
        });
        ctx.restore();
      };

      drawSide(grids.modis, MODIS_CELL, 0);
      drawSide(grids.viirs, VIIRS_CELL, 1);

      // Línea central y asa para arrastrar
      const lx = split * size;
      ctx.strokeStyle = "rgba(243,249,252,0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, size);
      ctx.stroke();
      ctx.fillStyle = "#F3F9FC";
      ctx.beginPath();
      ctx.arc(lx, size / 2, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0C090A";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("◀▶", lx, size / 2 + 0.5);
      ctx.restore();
    };

    const frame = () => {
      const v = view.current;
      if (v.visible) {
        v.z += (v.tz - v.z) * 0.07;
        v.s += (v.ts - v.s) * 0.1;
        draw();
      }
      raf = requestAnimationFrame(frame);
    };

    // Al entrar en pantalla: la línea barre hasta el centro y la lupa se acerca al incendio
    const io = new IntersectionObserver(
      ([e]) => {
        view.current.visible = e.isIntersecting;
        if (e.isIntersecting && !started) {
          started = true;
          window.setTimeout(() => {
            view.current.ts = 0.5;
            view.current.tz = 2.2;
            setZoomUi(2.2);
          }, 500);
        }
      },
      { threshold: 0.3 },
    );
    io.observe(box);

    const moveTo = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      view.current.ts = clamp((e.clientX - r.left) / r.width, 0.04, 0.96);
      view.current.s = view.current.ts;
    };
    const down = (e: PointerEvent) => {
      view.current.dragging = true;
      cv.setPointerCapture(e.pointerId);
      moveTo(e);
    };
    const move = (e: PointerEvent) => {
      if (view.current.dragging) moveTo(e);
    };
    const up = () => {
      view.current.dragging = false;
    };

    resize();
    window.addEventListener("resize", resize);
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointercancel", up);
    };
  }, [grids]);

  // Cifra ×4,8: cuenta hacia arriba cuando aparece
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
          const v = 4.8 * (1 - Math.pow(1 - k, 3));
          if (statNum.current)
            statNum.current.textContent = `×${v.toFixed(1).replace(".", ",")}`;
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

  // Tocar una tarjeta de satélite mueve la línea de la lupa para ver solo lo que ve ese sensor
  const focusSide = (side: "modis" | "viirs") => {
    view.current.ts = side === "modis" ? 0.96 : 0.04;
    view.current.tz = 2.2;
    setZoomUi(2.2);
  };

  const sensors = [
    {
      id: "modis" as const,
      name: "MODIS",
      since: "2000",
      pixel: "1 km",
      hits: grids.modisHits,
      note: "El incendio pequeño se diluye en un cuadro enorme.",
    },
    {
      id: "viirs" as const,
      name: "VIIRS",
      since: "2012",
      pixel: "375 m",
      hits: grids.viirsHits,
      note: "El mismo incendio ocupa más del cuadro y se enciende.",
    },
  ];

  return (
    <section
      ref={section}
      id="satelites"
      className="relative px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32"
    >
      <div className="mx-auto w-full max-w-6xl">
        <SectionDivider index="03" label="Los satélites" />

        <div className="mt-10 grid gap-8 sm:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,33rem)] lg:gap-x-14 lg:gap-y-8">
          {/* Título y los dos satélites */}
          <div className="flex flex-col gap-7 lg:col-start-1 lg:row-start-1">
            <Reveal className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-x-8 -inset-y-6 -z-10 bg-[radial-gradient(ellipse_at_left,rgb(12_9_10/0.65),transparent_75%)]"
              />
              <h2 className="text-[1.9rem] leading-tight tracking-tight sm:text-5xl">
                Dos ojos en el cielo, con distinta vista
              </h2>
              <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-snow/75 sm:text-base">
                MODIS vigila la Tierra desde el año 2000. VIIRS se sumó en 2012
                con una mirada más nítida. Toca uno para ver qué ve.
              </p>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {sensors.map((s, i) => (
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
                        className="text-xs text-snow/50 transition-transform duration-300 group-hover:translate-x-1"
                      >
                        Ver en la lupa →
                      </span>
                    </span>
                    <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-snow/45">Desde</dt>
                        <dd className="mt-0.5 text-base font-medium text-snow">
                          {s.since}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-snow/45">Píxel</dt>
                        <dd className="mt-0.5 text-base font-medium text-snow">
                          {s.pixel}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-snow/45">En la lupa</dt>
                        <dd className="mt-0.5 text-base font-medium text-snow">
                          {s.hits} {s.hits === 1 ? "foco" : "focos"}
                        </dd>
                      </div>
                    </dl>
                    <span className="mt-4 block text-xs leading-relaxed text-snow/65">
                      {s.note}
                    </span>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Lupa interactiva (queda a la vista mientras se lee el texto) */}
          <Reveal className="lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
            <Card
              tone="dark"
              ref={lensBox}
              className="rounded-[2rem] p-4 sm:p-6"
            >
              <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-snow/55">
                <span>MODIS · 1 km</span>
                <span>VIIRS · 375 m</span>
              </div>
              <canvas
                ref={canvas}
                aria-label="Comparación de lo que ven MODIS y VIIRS sobre los mismos incendios. Arrastra la línea central."
                className="mx-auto block aspect-square w-full max-w-[520px] cursor-ew-resize touch-pan-y rounded-full ring-1 ring-snow/30"
              />
              <label className="mx-auto mt-5 flex max-w-[360px] items-center gap-3 text-xs text-snow/65">
                <span className="shrink-0">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoomUi}
                  onChange={(e) => {
                    view.current.tz = Number(e.target.value);
                    setZoomUi(Number(e.target.value));
                  }}
                  className="h-1 w-full cursor-pointer accent-[#F3F9FC]"
                />
              </label>
              <p className="mt-4 text-center text-xs text-snow/55">
                Arrastra la línea central para comparar
              </p>
            </Card>
          </Reveal>

          {/* Cifra: la diferencia entre los dos ojos */}
          <Reveal className="lg:col-start-1 lg:row-start-2">
            <Card
              tone="dark"
              ref={statBox}
              className="flex items-center gap-5 p-5 sm:gap-7 sm:p-6"
            >
              <p className="font-heading text-5xl font-bold leading-none tracking-tight text-snow sm:text-7xl">
                <span ref={statNum}>×4,8</span>
              </p>
              <p className="text-sm leading-relaxed text-snow/80 sm:text-base">
                VIIRS detecta casi cinco veces más focos que MODIS sobre el
                Perú. Compararlos tal cual sería injusto: por eso los unimos en
                un solo registro.
              </p>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
