"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { DeptShape } from "@/app/explorador/lib/geo";
import {
  PLACES_BY_DEPT,
  hasSatellite,
  townsOf,
} from "@/app/explorador/lib/places";
import type {
  SpotCell,
  SpotPick,
  TerrainScene,
  ViewMode,
} from "@/app/explorador/lib/terrain-scene";
import type { Texts } from "@/app/explorador/lib/i18n";
import { BACKDROP, fmt } from "@/app/explorador/lib/ui";
import type { ApiHeatmap } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import CellPanel from "./CellPanel";
import Seg from "./Seg";
import type { TooltipApi } from "./Tooltip";

type Status = "loading" | "ready" | "error";

/** La vista elegida (2D o 3D) se recuerda al cambiar de región. Se empieza en 2D. */
let lastMode: ViewMode = "2d";

const BTN =
  "cursor-pointer rounded-full border border-snow/20 bg-ink/50 px-3.5 py-1.5 text-xs font-medium text-snow transition-colors hover:border-snow/60";

/**
 * Texto del tooltip de las celdas de calor. Una celda: sus focos, el periodo, la altitud y el poblado
 * más cercano. Varias juntas bajo el cursor: cuántas son y su suma, y las 3 con más focos (ninguna se pierde).
 */
function cellTip(hit: SpotPick, t: Texts, when: string) {
  const f = (n: number) => fmt(n, t.loc);
  const muted = (s: string) =>
    `<span style="color:rgb(243 249 252 / .65)">${s}</span>`;
  const near = hit.near
    ? muted(t.cellNear(hit.near.name, f(hit.near.km), hit.near.km < 1))
    : "";
  if (hit.cells.length === 1) {
    const c = hit.cells[0];
    return [
      `<b>${t.cellHs(f(c.hs), c.hs)}</b> · ${when}`,
      t.cellAlt(f(c.alt)),
      near,
    ]
      .filter(Boolean)
      .join("<br>");
  }
  const rows = hit.cells
    .slice(0, 3)
    .map((c) => `• ${t.cellHs(f(c.hs), c.hs)} · ${f(c.alt)} m`);
  const more =
    hit.cells.length > 3 ? [muted(t.cellMore(hit.cells.length - 3))] : [];
  return [
    `<b>${t.cellGroup(hit.cells.length, t.cellHs(f(hit.total), hit.total))}</b>`,
    muted(when),
    ...rows,
    ...more,
    near,
  ]
    .filter(Boolean)
    .join("<br>");
}

/**
 * Maqueta 3D con el relieve real del departamento (three.js + elevación AWS).
 * Mientras baja los tiles muestra la silueta plana; al estar listo, la silueta
 * se transforma en relieve con una animación de cámara y de altura.
 */
export default function Region3D({
  shape,
  name,
  year,
  month,
  t,
  tooltip,
  onBack,
}: {
  shape: DeptShape;
  name: string;
  /** Periodo elegido: año y mes (0–11) o -1 para todo el año. */
  year: number;
  month: number;
  t: Texts;
  /** El mismo tooltip del mapa y el calendario. */
  tooltip: TooltipApi;
  onBack: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<TerrainScene | null>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const when = month >= 0 ? `${t.months[month]} ${year}` : `${year}`;

  // Tooltip de las celdas: al pasar el cursor (mouse) o al tocar sin arrastrar (pantallas táctiles).
  const showCell = (e: PointerEvent<HTMLDivElement>) => {
    const el = host.current,
      s = scene.current;
    if (!el || !s) return;
    const r = el.getBoundingClientRect();
    const hit = s.pick(e.clientX - r.left, e.clientY - r.top);
    el.style.cursor = hit ? "pointer" : "";
    if (hit) tooltip.show(e, cellTip(hit, t, when));
    else tooltip.hide();
  };
  const hideCell = () => {
    tooltip.hide();
    if (host.current) host.current.style.cursor = "";
  };

  // Vista 2D / 3D. La escena se crea con la vista actual (ref) y luego se cambia sin recrearla.
  const [mode, setMode] = useState<ViewMode>(() => lastMode);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
    scene.current?.setMode(mode);
  }, [mode]);
  const changeMode = (m: ViewMode) => {
    lastMode = m;
    setMode(m);
  };

  // Celdas fijadas con un clic (se muestran en el panel de abajo y se resaltan en el mapa).
  const [pin, setPin] = useState<{ src: unknown; cells: SpotCell[] } | null>(
    null,
  );
  const [focus, setFocus] = useState<number | null>(null);
  const towns = useMemo(() => townsOf(shape.id), [shape.id]);

  const [status, setStatus] = useState<Status>("loading");
  const [tiles, setTiles] = useState(0);
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);
  const [sat, setSat] = useState(false);
  const wantsSatellite = hasSatellite(shape.id);

  useEffect(() => {
    let cancelled = false;
    let handle: TerrainScene | null = null;
    (async () => {
      try {
        const [{ getTerrain }, { createTerrainScene }] = await Promise.all([
          import("@/app/explorador/lib/terrain"),
          import("@/app/explorador/lib/terrain-scene"),
        ]);
        const terrain = await getTerrain(
          shape,
          wantsSatellite,
          (n) => !cancelled && setTiles(n),
        );
        if (cancelled || !host.current) return;
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        handle = createTerrainScene(host.current, terrain, shape, {
          reduceMotion: reduce,
          places: PLACES_BY_DEPT[shape.id],
          towns: townsOf(shape.id),
          mode: modeRef.current,
        });
        setSat(terrain.satellite);
        scene.current = handle;
        // Si la imagen satelital aún se está bajando, el relieve ya se ve; al llegar, se pone encima.
        if (!terrain.satellite) {
          const built = handle;
          void terrain.upgrade?.then(() => {
            if (cancelled || scene.current !== built) return;
            built.refreshTexture();
            setSat(terrain.satellite); // leyenda y atribución de la imagen (obligatoria por su licencia)
          });
        }
        setRange({ min: terrain.min, max: terrain.max });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      scene.current = null;
      handle?.dispose();
    };
  }, [shape, wantsSatellite]);

  // Ubicación REAL de los focos: celdas de 0,02° de la API (/heatmap) del periodo elegido.
  const last =
    month >= 0 ? new Date(Date.UTC(year, month + 1, 0)).getUTCDate() : 31;
  const mm = String(month + 1).padStart(2, "0");
  const heat = useApi<ApiHeatmap>("/heatmap", {
    start: month >= 0 ? `${year}-${mm}-01` : `${year}-01-01`,
    end: month >= 0 ? `${year}-${mm}-${last}` : `${year}-12-31`,
    region_id: shape.id,
  });
  const cells = useMemo(() => {
    const all = heat.data?.features ?? [];
    const top = [...all]
      .sort((a, b) => b.properties.hs - a.properties.hs)
      .slice(0, 900);
    return {
      shown: top.map(
        (f) =>
          [
            f.geometry.coordinates[0] * 20,
            -f.geometry.coordinates[1] * 20,
            f.properties.hs,
          ] as [number, number, number],
      ),
      total: all.length,
    };
  }, [heat.data]);

  useEffect(() => {
    if (status === "ready" && heat.data)
      scene.current?.setHotspots(cells.shown);
  }, [cells, status, heat.data]);

  const pickCells = (e: PointerEvent<HTMLDivElement>) => {
    const el = host.current,
      s = scene.current;
    if (!el || !s) return;
    const r = el.getBoundingClientRect();
    const hit = s.pick(e.clientX - r.left, e.clientY - r.top);
    tooltip.hide();
    if (hit) {
      setPin({ src: cells, cells: hit.cells });
      setFocus(hit.cells[0].id);
    } else setPin(null); // clic en un lugar sin celdas: se cierra el detalle
  };

  // Lo fijado vale solo para las celdas con que se eligió: al cambiar el periodo, el detalle se cierra solo.
  const pinned = pin && pin.src === cells ? pin.cells : null;
  useEffect(() => {
    scene.current?.highlight(
      pinned ? pinned.map((c) => c.id) : [],
      pinned ? focus : null,
    );
  }, [pinned, focus]);
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPin(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned]);

  const { x0, y0, x1, y1 } = shape.bbox;
  const pad = Math.max(x1 - x0, y1 - y0) * 0.06;

  return (
    <div>
      <div className={`${BACKDROP} h-130`}>
        {/* silueta plana: el punto de partida de la transformación */}
        <div
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-700 ${
            status === "ready" ? "opacity-0" : "opacity-100"
          }`}
        >
          <svg
            viewBox={`${x0 - pad} ${y0 - pad} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2}`}
            className={`h-60 w-auto ${status === "loading" ? "animate-pulse" : ""}`}
            aria-hidden
          >
            <path
              d={shape.d}
              fill="#f3f9fc"
              fillOpacity={0.16}
              stroke="#f3f9fc"
              strokeOpacity={0.7}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <p className="text-sm text-snow/60">
            {status === "error" ? t.stageError : t.stageLoading(tiles)}
          </p>
        </div>

        <div
          ref={host}
          className={`absolute inset-0 cursor-grab transition-opacity duration-500 active:cursor-grabbing ${
            status === "ready" ? "opacity-100" : "opacity-0"
          }`}
          role="img"
          aria-label={`${t.stageTitle}: ${name}`}
          onPointerMove={(e) => {
            if (e.buttons)
              hideCell(); // arrastrando: girar la cámara, sin tooltip
            else if (e.pointerType === "mouse") showCell(e);
          }}
          onPointerDown={(e) => {
            down.current = { x: e.clientX, y: e.clientY };
            hideCell();
          }}
          onPointerUp={(e) => {
            const d = down.current;
            down.current = null;
            // un clic o toque sin arrastrar fija la celda (o el grupo) en el panel de abajo
            if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6)
              pickCells(e);
          }}
          onPointerLeave={hideCell}
          onWheel={hideCell}
        />

        {/* Título y botones en una misma fila: un nombre largo se recorta en vez de montarse sobre los botones. */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start gap-3">
          <div
            className="min-w-0 flex-1 truncate text-xl font-bold text-snow"
            style={{ fontFamily: "var(--font-jakarta), system-ui" }}
            title={name}
          >
            {name}
          </div>
          <div className="pointer-events-auto flex shrink-0 flex-wrap justify-end gap-2">
            <Seg<ViewMode>
              label={t.viewLabel}
              value={mode}
              onChange={changeMode}
              options={[
                { value: "3d", label: "3D" },
                { value: "2d", label: "2D" },
              ]}
            />
            <button
              type="button"
              onClick={() => scene.current?.resetView()}
              className={BTN}
            >
              {t.stageReset}
            </button>
            <button type="button" onClick={onBack} className={BTN}>
              {t.stageBack}
            </button>
          </div>
        </div>
      </div>

      {pinned && (
        <CellPanel
          cells={pinned}
          focus={focus}
          onFocus={setFocus}
          onClose={() => setPin(null)}
          towns={towns}
          zoneName={name}
          when={when}
          t={t}
        />
      )}

      {range && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-snow/60">
          <span>{t.stageAlt}</span>
          <span className="tabular-nums">{fmt(range.min, t.loc)} m</span>
          <span
            className="h-2.5 w-36 rounded-full border border-snow/20"
            style={{
              background: sat
                ? "linear-gradient(90deg, rgb(20,17,15), rgb(40,58,84), rgb(76,102,121), rgb(243,249,252))"
                : "linear-gradient(90deg, rgb(108,166,82), rgb(132,158,74), rgb(160,128,62), rgb(192,142,86), rgb(238,224,198), rgb(252,250,248))",
            }}
          />
          <span className="tabular-nums">{fmt(range.max, t.loc)} m</span>
          {sat && <span className="ml-auto text-xs">{t.stageSat}</span>}
        </div>
      )}
      <p className="mt-1.5 text-[13px] text-snow/60">
        {heat.error
          ? t.stageCellsError
          : heat.data
            ? cells.total
              ? t.stageCells(cells.shown.length, cells.total)
              : t.stageNoCells
            : t.stageLoading(0)}
      </p>
      <p className="mt-1 text-[13px] text-snow/60">{t.stageHint}</p>
    </div>
  );
}
