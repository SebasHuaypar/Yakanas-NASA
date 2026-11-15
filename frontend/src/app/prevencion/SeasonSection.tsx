"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Card from "@/components/Card";
import Select from "@/components/Select";
import { apiUrl, type ApiRecurrence } from "@/lib/api";
import type { Lang } from "@/lib/lang";
import { useApi } from "@/lib/use-api";
import FireMap from "./FireMap";
import { MONTHS, type T } from "./text";

const nf = (n: number, loc: string) => n.toLocaleString(loc);
const deptName = (name: string, lang: Lang) =>
  name.startsWith("Municipalidad")
    ? lang === "en"
      ? "Metropolitan Lima"
      : "Lima Metropolitana"
    : name;

/** true solo en el navegador: así el mes por defecto (hoy) no desajusta la hidratación. */
const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

function SeasonBody({
  t,
  lang,
  initialMonth,
}: {
  t: T;
  lang: Lang;
  initialMonth: number;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [win, setWin] = useState(15);
  const [min, setMin] = useState(0.5);
  const year = new Date().getFullYear();
  const rec = useApi<ApiRecurrence>("/recurrence", {
    fecha: `${year}-${String(month + 1).padStart(2, "0")}-15`,
    ventana: win,
    minimo: min,
    limit: 5000,
  });

  const d = rec.data;
  const zones = useMemo(
    () =>
      (d?.features ?? []).map((f) => ({
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        f: f.properties.frecuencia,
      })),
    [d],
  );
  const byDept = useMemo(() => {
    const m = new Map<string, { name: string; n: number }>();
    for (const f of d?.features ?? []) {
      const c = m.get(f.properties.region_id) ?? {
        name: f.properties.name,
        n: 0,
      };
      c.n++;
      m.set(f.properties.region_id, c);
    }
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 8);
  }, [d]);
  const topN = Math.max(1, byDept[0]?.n ?? 1);

  return (
    <>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full max-w-[12rem]">
          <label
            htmlFor="s-month"
            className="text-[11px] uppercase tracking-[0.14em] text-snow/60"
          >
            {t.month}
          </label>
          <div className="mt-1.5">
            <Select
              id="s-month"
              size="sm"
              value={month}
              onChange={setMonth}
              options={MONTHS[lang].map((m, i) => ({ value: i, label: m }))}
            />
          </div>
        </div>
        <div className="w-full max-w-[10rem]">
          <label
            htmlFor="s-win"
            className="text-[11px] uppercase tracking-[0.14em] text-snow/60"
          >
            {t.windowDays}
          </label>
          <div className="mt-1.5">
            <Select
              id="s-win"
              size="sm"
              value={win}
              onChange={setWin}
              options={[7, 15, 30].map((v) => ({
                value: v,
                label: t.windowOpt(v),
              }))}
            />
          </div>
        </div>
        <div className="w-full max-w-[13rem]">
          <label
            htmlFor="s-min"
            className="text-[11px] uppercase tracking-[0.14em] text-snow/60"
          >
            {t.minFreq}
          </label>
          <div className="mt-1.5">
            <Select
              id="s-min"
              size="sm"
              value={min}
              onChange={setMin}
              options={[0.3, 0.5, 0.7].map((v) => ({
                value: v,
                label: t.freqOpt(v * 100),
              }))}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <Card className="rounded-3xl p-4 sm:p-5">
          <div className="mx-auto max-w-sm">
            {!d ? (
              <div
                role="status"
                className="grid min-h-72 place-items-center text-sm text-snow/60"
              >
                {rec.error ? (
                  <div className="flex flex-col items-center gap-3">
                    <p>{t.error}</p>
                    <button
                      type="button"
                      onClick={rec.reload}
                      className="cursor-pointer rounded-full border border-snow/30 px-4 py-2 text-xs font-medium text-snow hover:border-snow"
                    >
                      {t.retry}
                    </button>
                  </div>
                ) : (
                  <p className="animate-pulse">{t.loading}</p>
                )}
              </div>
            ) : (
              <FireMap zones={zones} aria={t.seasonMapAria} />
            )}
          </div>
          {d && (
            <p className="mt-3 text-center text-xs text-snow/55">
              {t.zonesAt}:{" "}
              <b className="text-snow/85">{nf(zones.length, t.loc)}</b> ·{" "}
              {d.ventana.desde} → {d.ventana.hasta}
            </p>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="rounded-3xl p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.14em] text-snow/60">
              {t.topDepts}
            </p>
            {d ? (
              <ul className="mt-4 space-y-2.5">
                {byDept.map((b) => (
                  <li
                    key={b.name}
                    className="grid grid-cols-[8.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm"
                  >
                    <span className="truncate text-snow">
                      {deptName(b.name, lang)}
                    </span>
                    <span className="h-2 overflow-hidden rounded-full bg-snow/[0.08]">
                      <span
                        className="block h-full rounded-full bg-snow"
                        style={{ width: `${(b.n / topN) * 100}%` }}
                      />
                    </span>
                    <span className="text-right tabular-nums text-snow/70">
                      {nf(b.n, t.loc)}
                    </span>
                  </li>
                ))}
                {!byDept.length && <li className="text-sm text-snow/55">—</li>}
              </ul>
            ) : (
              <p className="mt-4 animate-pulse text-sm text-snow/55">
                {t.loading}
              </p>
            )}
          </Card>

          <Card className="rounded-3xl p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.14em] text-snow/60">
              {t.howReliable}
            </p>
            {d ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-snow/70">
                  {t.howBody(d.validacion.prueba)}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {d.validacion.por_frecuencia.map((b) => (
                    <li
                      key={b.desde}
                      className="grid grid-cols-[7rem_minmax(0,1fr)_3.2rem] items-center gap-3 text-sm"
                    >
                      <span className="text-snow/75">
                        {Math.round(b.desde * 100)}–{Math.round(b.hasta * 100)}{" "}
                        %
                      </span>
                      <span className="h-2 overflow-hidden rounded-full bg-snow/[0.08]">
                        <span
                          className="block h-full rounded-full bg-snow"
                          style={{ width: `${b.ardieron * 100}%` }}
                        />
                      </span>
                      <span className="text-right tabular-nums font-semibold text-snow">
                        {Math.round(b.ardieron * 100)} %
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-snow/55">
                  {lang === "en"
                    ? "Left: share of past years with fire in the zone. Right: how often it really burned in the test years."
                    : "Izquierda: porcentaje de años pasados con fuego en la zona. Derecha: cuántas veces ardió de verdad en los años de prueba."}
                </p>
              </>
            ) : (
              <p className="mt-3 animate-pulse text-sm text-snow/55">
                {t.loading}
              </p>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm font-medium">
        <a
          href="#lugares"
          className="rounded-full bg-snow px-6 py-3 text-ink transition hover:-translate-y-0.5 hover:opacity-90"
        >
          {t.checkPlace}
        </a>
        <a
          href={apiUrl("/export/mensual.csv", { region_id: "PE" })}
          download="calendario.csv"
          className="rounded-full border border-snow/40 px-6 py-3 text-snow transition-colors hover:border-snow"
        >
          {t.csvAll}
        </a>
        <a
          href="/explorador"
          className="rounded-full border border-snow/40 px-6 py-3 text-snow transition-colors hover:border-snow"
        >
          {t.explore}
        </a>
      </div>
      <p className="mt-5 max-w-3xl text-xs leading-relaxed text-snow/50">
        {lang === "en" ? t.seasonNote : (d?.nota ?? t.seasonNote)}
      </p>
    </>
  );
}

export default function SeasonSection({ t, lang }: { t: T; lang: Lang }) {
  const mounted = useMounted();
  return (
    <section
      id="temporada"
      className="relative scroll-mt-20 px-4 pb-12 pt-2 sm:px-6"
    >
      <div className="mx-auto w-full max-w-6xl">
        <p className="max-w-3xl text-sm leading-relaxed text-snow/70">
          {t.s3d}
        </p>
        <div className="mt-4">
          {mounted ? (
            <SeasonBody
              t={t}
              lang={lang}
              initialMonth={new Date().getMonth()}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
