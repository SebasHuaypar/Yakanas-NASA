"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEPT_SHAPES,
  PERU_VIEWBOX_STR,
  SHAPE_BY_ID,
} from "@/app/explorador/lib/geo";
import { hasSatellite } from "@/app/explorador/lib/places";
import { BACKDROP, CARD, fmt, H2_SMALL } from "@/app/explorador/lib/ui";
import type { FireDataset, FireZone } from "@/app/explorador/lib/types";
import type { Texts } from "@/app/explorador/lib/i18n";
import SectionDivider from "@/components/SectionDivider";
import Select from "@/components/Select";
import ExportPanel from "./ExportPanel";
import FireCalendar, { type CalMode } from "./FireCalendar";
import PeruMap, { type MapMode } from "./PeruMap";
import Region3D from "./Region3D";
import Seg from "./Seg";
import Summary from "./Summary";
import Tooltip, { useTooltip } from "./Tooltip";

/** Explorador: región + año + mes, resumen, mapa con relieve 3D y calendario. */
export default function Explorer({ ds, t }: { ds: FireDataset; t: Texts }) {
  const [zoneId, setZoneId] = useState("PE");
  const [year, setYear] = useState(2024);
  const [month, setMonth] = useState(-1);
  const [mapMode, setMapMode] = useState<MapMode>("dep");
  const [calMode, setCalMode] = useState<CalMode>("n");
  const tooltip = useTooltip();

  const byId = useMemo(() => {
    const m: Record<string, FireZone> = { PE: ds.country };
    for (const d of ds.departments) m[d.id] = d;
    return m;
  }, [ds]);

  const deptName = useCallback(
    (id: string) => {
      if (id === "PE") return t.allPeru;
      const raw = byId[id]?.name ?? id;
      return raw.startsWith("Municipalidad") ? t.lima : raw;
    },
    [byId, t],
  );

  const pickMonth = useCallback((y: number, m: number) => {
    setYear(y);
    setMonth(m);
  }, []);

  // Precarga: si el cursor se queda ~300 ms sobre un departamento, se empieza a bajar su relieve
  // (y el código 3D), así al hacer clic ya está listo o falta poco.
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetch = useCallback((id: string | null) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (!id || id === "PE") return;
    hoverTimer.current = setTimeout(() => {
      const shape = SHAPE_BY_ID[id];
      if (!shape) return;
      void import("@/app/explorador/lib/terrain-scene");
      void import("@/app/explorador/lib/terrain")
        .then((m) => m.getTerrain(shape, hasSatellite(id)))
        .catch(() => {});
    }, 300);
  }, []);
  useEffect(
    () => () => void (hoverTimer.current && clearTimeout(hoverTimer.current)),
    [],
  );

  // En reposo (poco después de abrir la pantalla) se baja el código del 3D y se precalienta el renderizador
  // (contexto WebGL + shaders), para que el primer clic no lo espere.
  useEffect(() => {
    const id = setTimeout(() => {
      void import("@/app/explorador/lib/terrain-scene").then((m) =>
        m.warmUpRenderer(),
      );
      void import("@/app/explorador/lib/terrain");
    }, 1200);
    return () => clearTimeout(id);
  }, []);

  const zone = byId[zoneId];
  const when = month >= 0 ? `${t.months[month]} ${year}` : `${year}`;
  const sortedDepts = useMemo(
    () =>
      [...ds.departments].sort((a, b) =>
        deptName(a.id).localeCompare(deptName(b.id), "es"),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ds, t],
  );

  const shape = zoneId !== "PE" ? SHAPE_BY_ID[zoneId] : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 text-snow sm:px-6 sm:pb-24">
      <SectionDivider
        index="01"
        label={t.exKicker}
        className="mb-10 sm:mb-14"
      />
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
        <div>
          <h2
            key={zoneId}
            className="animate-rise text-3xl leading-[1.1] tracking-tight sm:text-5xl"
          >
            {deptName(zoneId)}
          </h2>
          {/* contexto del periodo y de la región, sin recargar */}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-snow/20 bg-ink/40 px-3 py-1 text-snow/80 backdrop-blur-sm">
              {when}
            </span>
            <span className="rounded-full border border-snow/20 bg-ink/40 px-3 py-1 text-snow/60 backdrop-blur-sm">
              {fmt(zone.area, t.loc)} km²
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t.lblArea} id="f3-zone">
            <Select
              id="f3-zone"
              size="sm"
              value={zoneId}
              onChange={setZoneId}
              options={[
                { value: "PE", label: t.allPeru },
                ...sortedDepts.map((d) => ({
                  value: d.id,
                  label: deptName(d.id),
                })),
              ]}
            />
          </Field>
          <Field label={t.lblYear} id="f3-year">
            <Select
              id="f3-year"
              size="sm"
              value={year}
              onChange={setYear}
              options={Array.from(
                { length: ds.yearCount },
                (_, i) => ds.startYear + ds.yearCount - 1 - i,
              ).map((y) => ({
                value: y,
                label: `${y}${y <= ds.lastEstimatedYear ? ` (${t.est})` : ""}`,
              }))}
            />
          </Field>
          <Field label={t.lblMonth} id="f3-month">
            <Select
              id="f3-month"
              size="sm"
              value={month}
              onChange={setMonth}
              options={[
                { value: -1, label: t.wholeYear },
                ...t.months.map((m, k) => ({
                  value: k,
                  label: m[0].toUpperCase() + m.slice(1),
                })),
              ]}
            />
          </Field>
        </div>
      </div>

      <Summary
        zone={zone}
        zoneName={deptName(zoneId)}
        ds={ds}
        t={t}
        year={year}
        month={month}
      />

      <div className="mb-4 grid animate-rise gap-4 [animation-delay:900ms] lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <section className={CARD} aria-labelledby="f3-map-h">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
            <h2 id="f3-map-h" className={H2_SMALL}>
              {t.mapTitle}
            </h2>
            <Seg
              label={t.mapTitle}
              value={mapMode}
              onChange={setMapMode}
              options={[
                { value: "dep", label: t.mmDep },
                { value: "heat", label: t.mmHeat },
              ]}
            />
          </div>
          <p className="mb-2 text-sm text-snow/65">
            {mapMode === "dep" ? t.mapHowDep(when) : t.mapHowHeat}
          </p>
          <PeruMap
            ds={ds}
            t={t}
            deptName={deptName}
            selected={zoneId}
            onSelect={setZoneId}
            year={year}
            month={month}
            mode={mapMode}
            tooltip={tooltip}
            onHover={prefetch}
          />
        </section>

        <section className={CARD} aria-labelledby="f3-3d-h">
          <h2 id="f3-3d-h" className={`${H2_SMALL} mb-2`}>
            {t.stageTitle}
          </h2>
          {shape ? (
            <Region3D
              key={shape.id}
              shape={shape}
              name={deptName(shape.id)}
              year={year}
              month={month}
              t={t}
              tooltip={tooltip}
              onBack={() => setZoneId("PE")}
            />
          ) : (
            <div
              className={`${BACKDROP} flex h-130 flex-col items-center justify-center gap-4 px-6 text-center`}
            >
              <svg
                viewBox={PERU_VIEWBOX_STR}
                className="h-56 w-auto opacity-30"
                aria-hidden
              >
                {DEPT_SHAPES.map((s) => (
                  <path
                    key={s.id}
                    d={s.d}
                    fill="#f3f9fc"
                    stroke="#f3f9fc"
                    strokeOpacity={0.6}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
              <p className="max-w-xs text-sm text-snow/60">{t.stageEmpty}</p>
            </div>
          )}
        </section>
      </div>

      <section
        className={`${CARD} mb-4 animate-rise [animation-delay:1000ms]`}
        aria-labelledby="f3-cal-h"
      >
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="f3-cal-h" className={H2_SMALL}>
            {t.calTitle}
          </h2>
          <Seg
            label={t.calTitle}
            value={calMode}
            onChange={setCalMode}
            options={[
              { value: "n", label: t.cmN },
              { value: "a", label: t.cmA },
            ]}
          />
        </div>
        <p className="mb-2 text-sm text-snow/65">{t.calHow}</p>
        <FireCalendar
          zone={zone}
          ds={ds}
          t={t}
          year={year}
          month={month}
          mode={calMode}
          onPick={pickMonth}
          tooltip={tooltip}
        />
      </section>

      <ExportPanel zone={zone} t={t} />
      <Tooltip api={tooltip} />
    </div>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.14em] text-snow/60"
    >
      <span>{label}</span>
      {children}
    </label>
  );
}
