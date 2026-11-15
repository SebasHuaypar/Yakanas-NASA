"use client";

import { useMemo, useState } from "react";
import Card from "@/components/Card";
import Reveal from "@/components/Reveal";
import SectionDivider from "@/components/SectionDivider";
import Select from "@/components/Select";
import type { ApiAlert, ApiEvent, ApiEvents } from "@/lib/api";
import { fmtCoord } from "@/lib/geo-utils";
import type { Lang } from "@/lib/lang";
import type { T } from "./text";

type Api<D> = { data?: D; error?: Error; loading: boolean; reload: () => void };

const nf = (n: number, loc: string, d = 0) =>
  n.toLocaleString(loc, { maximumFractionDigits: d, minimumFractionDigits: d });
const dayLabel = (iso: string, loc: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(loc, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};
const deptName = (name: string, lang: Lang) =>
  name.startsWith("Municipalidad")
    ? lang === "en"
      ? "Metropolitan Lima"
      : "Lima Metropolitana"
    : name;

const BTN =
  "cursor-pointer rounded-full border border-snow/25 px-4 py-2 text-xs font-medium text-snow/85 transition-colors hover:border-snow/70 hover:text-snow";
const ORDER: Record<string, number> = {
  inusual: 3,
  alto: 2,
  normal: 1,
  bajo: 0,
};

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const csvCell = (v: string | number | boolean) =>
  `"${String(v).replace(/"/g, '""')}"`;

function eventsToCsv(list: ApiEvent[]) {
  const head =
    "id,department,region_id,lat,lon,first_date,last_date,days_with_detection,active,trend,detections,modis,viirs_noaa20,viirs_noaa21,high_confidence,frp_total_mw,frp_max_mw,pixel_area_ha";
  const rows = list.map((e) =>
    [
      e.id,
      e.name,
      e.region_id,
      fmtCoord(e.centro[1]),
      fmtCoord(e.centro[0]),
      e.primera_fecha,
      e.ultima_fecha,
      e.dias_con_deteccion,
      e.activo,
      e.tendencia,
      e.detecciones.total,
      e.detecciones.modis,
      e.detecciones.viirs_noaa20,
      e.detecciones.viirs_noaa21,
      e.confianza_alta,
      e.frp_total_mw,
      e.frp_max_mw,
      e.area_pixeles_ha ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [head, ...rows].join("\n");
}

function eventsToGeoJson(list: ApiEvent[]) {
  return JSON.stringify({
    type: "FeatureCollection",
    features: list.map((e) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: e.centro },
      properties: {
        id: e.id,
        department: e.name,
        region_id: e.region_id,
        first_date: e.primera_fecha,
        last_date: e.ultima_fecha,
        active: e.activo,
        trend: e.tendencia,
        detections: e.detecciones.total,
        high_confidence: e.confianza_alta,
        frp_total_mw: e.frp_total_mw,
        frp_max_mw: e.frp_max_mw,
      },
    })),
  });
}

function EventCard({ e, t, lang }: { e: ApiEvent; t: T; lang: Lang }) {
  const [copied, setCopied] = useState(false);
  const coords = `${fmtCoord(e.centro[1])}, ${fmtCoord(e.centro[0])}`;
  return (
    <Card as="li" className="flex h-full flex-col gap-3 rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold leading-tight text-snow">
            {deptName(e.name, lang)}
          </p>
          <p className="mt-0.5 text-xs text-snow/55">
            {dayLabel(e.primera_fecha, t.loc)}
            {e.ultima_fecha !== e.primera_fecha
              ? ` – ${dayLabel(e.ultima_fecha, t.loc)}`
              : ""}{" "}
            · {e.dias_con_deteccion} {t.days}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${e.activo ? "bg-snow text-ink" : "bg-snow/10 text-snow/60"}`}
        >
          {e.activo ? t.activeTag : t.endedTag}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <div>
          <dd className="font-heading text-2xl font-bold tabular-nums text-snow">
            {nf(e.detecciones.total, t.loc)}
          </dd>
          <dt className="text-[11px] text-snow/55">{t.detections}</dt>
        </div>
        <div>
          <dd className="font-heading text-2xl font-bold tabular-nums text-snow">
            {nf(e.frp_max_mw, t.loc)}
          </dd>
          <dt className="text-[11px] text-snow/55">
            {t.power} {t.peak} (MW)
          </dt>
        </div>
        <div>
          <dd className="font-heading text-2xl font-bold text-snow">
            {t.trend[e.tendencia] ?? e.tendencia}
          </dd>
          <dt className="text-[11px] text-snow/55">trend</dt>
        </div>
      </dl>

      <p className="text-xs leading-relaxed text-snow/55">
        {t.sensors}: MODIS {e.detecciones.modis} · NOAA-20{" "}
        {e.detecciones.viirs_noaa20} · NOAA-21 {e.detecciones.viirs_noaa21} ·{" "}
        {e.confianza_alta} {t.highConf}
        {e.area_pixeles_ha ? ` · ≈ ${nf(e.area_pixeles_ha, t.loc)} ha` : ""}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-snow/10 pt-3">
        <code
          className="rounded-lg bg-snow/[0.07] px-2.5 py-1 text-xs tabular-nums text-snow/85"
          aria-label={t.coords}
        >
          {coords}
        </code>
        <button
          type="button"
          className={BTN}
          onClick={() => {
            void navigator.clipboard?.writeText(coords).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? t.copied : t.copyCoords}
        </button>
        <a
          href={`https://www.google.com/maps?q=${e.centro[1]},${e.centro[0]}`}
          target="_blank"
          rel="noopener noreferrer"
          className={BTN}
        >
          {t.openMap} ↗
        </a>
      </div>
    </Card>
  );
}

export default function FieldSection({
  t,
  lang,
  events,
  alert,
}: {
  t: T;
  lang: Lang;
  events: Api<ApiEvents>;
  alert: Api<ApiAlert>;
}) {
  const [dept, setDept] = useState("ALL");
  const [sort, setSort] = useState<"size" | "power" | "recent">("size");
  const [onlyActive, setOnlyActive] = useState(true);
  const [shown, setShown] = useState(12);
  const [copiedReport, setCopiedReport] = useState(false);

  const all = useMemo(() => events.data?.events ?? [], [events.data]);
  const deptOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of all) m.set(e.region_id, e.name);
    return [
      { value: "ALL", label: t.allDepts },
      ...[...m.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], "es"))
        .map(([value, name]) => ({ value, label: deptName(name, lang) })),
    ];
  }, [all, t.allDepts, lang]);

  const list = useMemo(() => {
    const f = all.filter(
      (e) =>
        (dept === "ALL" || e.region_id === dept) && (!onlyActive || e.activo),
    );
    return f.sort((a, b) =>
      sort === "size"
        ? b.detecciones.total - a.detecciones.total
        : sort === "power"
          ? b.frp_max_mw - a.frp_max_mw
          : b.ultima_fecha.localeCompare(a.ultima_fecha) ||
            b.detecciones.total - a.detecciones.total,
    );
  }, [all, dept, onlyActive, sort]);

  const d = events.data;
  const above = (alert.data?.departamentos ?? [])
    .filter(
      (r) => ORDER[r.estado] >= 2 && (dept === "ALL" || r.region_id === dept),
    )
    .sort(
      (a, b) =>
        ORDER[b.estado] - ORDER[a.estado] ||
        (b.pct_mediana ?? 0) - (a.pct_mediana ?? 0),
    );
  const totalDet = list.reduce((s, e) => s + e.detecciones.total, 0);
  const scope =
    dept === "ALL"
      ? t.allDepts
      : (deptOptions.find((o) => o.value === dept)?.label ?? "");
  const win = d
    ? `${dayLabel(d.desde, t.loc)} – ${dayLabel(d.hasta, t.loc)}`
    : "";
  const top = list.slice(0, 5);

  const reportText = () =>
    [
      t.reportTitle.toUpperCase(),
      `${t.reportScope}: ${scope}`,
      `${t.reportWindow}: ${win}`,
      `${t.reportTotals}: ${list.length} ${t.events} (${list.filter((e) => e.activo).length} ${t.activeLabel}), ${nf(totalDet, t.loc)} ${t.detections}`,
      `${t.reportAbove}: ${above.length ? above.map((r) => `${deptName(r.name, lang)} (${t.state[r.estado]}, ${nf(r.hs, t.loc)} ${t.hs})`).join("; ") : t.reportNone}`,
      `${t.reportTop}:`,
      ...top.map(
        (e, i) =>
          `${i + 1}. ${deptName(e.name, lang)} · ${fmtCoord(e.centro[1])}, ${fmtCoord(e.centro[0])} · ${e.detecciones.total} ${t.detections} · ${nf(e.frp_max_mw, t.loc)} MW · ${e.activo ? t.activeTag : t.endedTag}`,
      ),
      t.reportSource,
    ].join("\n");

  return (
    <section
      id="campo"
      className="relative scroll-mt-20 px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32"
    >
      <div className="mx-auto w-full max-w-6xl">
        <SectionDivider index="02" label={t.s2} className="mb-10 sm:mb-14" />
        <Reveal className="max-w-3xl">
          <h2 className="text-[1.9rem] leading-tight tracking-tight sm:text-5xl">
            {t.s2t}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-snow/70 sm:text-base">
            {t.s2d}
          </p>
        </Reveal>

        <Reveal delay={100} className="mt-10">
          {!d ? (
            <div
              role="status"
              className="grid min-h-40 place-items-center text-sm text-snow/65"
            >
              {events.error ? (
                <div className="flex flex-col items-center gap-3">
                  <p>{t.error}</p>
                  <button type="button" onClick={events.reload} className={BTN}>
                    {t.retry}
                  </button>
                </div>
              ) : (
                <p className="animate-pulse">{t.loading}</p>
              )}
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-3 gap-3 sm:gap-5">
                {[
                  [d.resumen.eventos, t.events],
                  [d.resumen.activos, t.activeLabel],
                  [d.resumen.creciendo, t.growingLabel],
                ].map(([v, l]) => (
                  <Card
                    key={String(l)}
                    className="rounded-3xl px-4 py-5 text-center sm:py-7"
                  >
                    <dd className="font-heading text-4xl font-bold tabular-nums text-snow sm:text-6xl">
                      {nf(Number(v), t.loc)}
                    </dd>
                    <dt className="mt-1 text-xs uppercase tracking-[0.14em] text-snow/60">
                      {l}
                    </dt>
                  </Card>
                ))}
              </dl>

              <div className="mt-6 flex flex-wrap items-end gap-4">
                <div className="w-full max-w-[16rem]">
                  <label
                    htmlFor="f-dept"
                    className="text-[11px] uppercase tracking-[0.14em] text-snow/60"
                  >
                    {t.dept}
                  </label>
                  <div className="mt-1.5">
                    <Select
                      id="f-dept"
                      size="sm"
                      value={dept}
                      onChange={setDept}
                      options={deptOptions}
                    />
                  </div>
                </div>
                <div className="w-full max-w-[13rem]">
                  <label
                    htmlFor="f-sort"
                    className="text-[11px] uppercase tracking-[0.14em] text-snow/60"
                  >
                    {t.sortBy}
                  </label>
                  <div className="mt-1.5">
                    <Select
                      id="f-sort"
                      size="sm"
                      value={sort}
                      onChange={(v) => setSort(v as typeof sort)}
                      options={[
                        { value: "size", label: t.sortSize },
                        { value: "power", label: t.sortPower },
                        { value: "recent", label: t.sortRecent },
                      ]}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={onlyActive}
                  onClick={() => setOnlyActive((v) => !v)}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-xs font-medium transition-colors ${onlyActive ? "border-snow bg-snow text-ink" : "border-snow/25 text-snow/75 hover:border-snow/60"}`}
                >
                  {t.onlyActive}
                </button>
                <div className="ml-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={BTN}
                    onClick={() =>
                      download("fire-events.csv", eventsToCsv(list), "text/csv")
                    }
                  >
                    {t.downloadCsv}
                  </button>
                  <button
                    type="button"
                    className={BTN}
                    onClick={() =>
                      download(
                        "fire-events.geojson",
                        eventsToGeoJson(list),
                        "application/geo+json",
                      )
                    }
                  >
                    {t.downloadGeo}
                  </button>
                </div>
              </div>

              {list.length ? (
                <>
                  <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {list.slice(0, shown).map((e) => (
                      <EventCard key={e.id} e={e} t={t} lang={lang} />
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center justify-between text-xs text-snow/55">
                    <span>
                      {t.showAll(Math.min(shown, list.length))} / {list.length}
                    </span>
                    {shown < list.length && (
                      <button
                        type="button"
                        className={BTN}
                        onClick={() => setShown((n) => n + 12)}
                      >
                        {t.showMore}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-8 text-center text-sm text-snow/60">
                  {t.noEvents}
                </p>
              )}

              {/* Parte de situación: lo único que se imprime */}
              <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">{t.report}</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={BTN}
                    onClick={() => window.print()}
                  >
                    {t.reportPrint}
                  </button>
                  <button
                    type="button"
                    className={BTN}
                    onClick={() => {
                      void navigator.clipboard
                        ?.writeText(reportText())
                        .then(() => {
                          setCopiedReport(true);
                          setTimeout(() => setCopiedReport(false), 1800);
                        });
                    }}
                  >
                    {copiedReport ? t.copied : t.reportCopy}
                  </button>
                </div>
              </div>

              <article
                data-print-area
                className="glass mt-4 rounded-3xl p-6 text-snow print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none sm:p-8"
              >
                <h4 className="font-heading text-2xl font-bold print:text-black">
                  {t.reportTitle}
                </h4>
                <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-snow/55 print:text-black/60">
                      {t.reportScope}
                    </dt>
                    <dd className="font-medium">{scope}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.12em] text-snow/55 print:text-black/60">
                      {t.reportWindow}
                    </dt>
                    <dd className="font-medium">{win}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-[0.12em] text-snow/55 print:text-black/60">
                      {t.reportTotals}
                    </dt>
                    <dd className="font-medium">
                      {list.length} {t.events} (
                      {list.filter((e) => e.activo).length} {t.activeLabel}) ·{" "}
                      {nf(totalDet, t.loc)} {t.detections}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-[0.12em] text-snow/55 print:text-black/60">
                      {t.reportAbove}
                    </dt>
                    <dd className="font-medium">
                      {above.length
                        ? above
                            .map(
                              (r) =>
                                `${deptName(r.name, lang)} (${t.state[r.estado]}, ${nf(r.hs, t.loc)} ${t.hs} · ${t.typical} ${nf(r.median, t.loc)})`,
                            )
                            .join(" · ")
                        : t.reportNone}
                    </dd>
                  </div>
                </dl>

                <p className="mt-6 text-xs uppercase tracking-[0.12em] text-snow/55 print:text-black/60">
                  {t.reportTop}
                </p>
                <table className="mt-2 w-full text-left text-sm">
                  <thead className="text-snow/55 print:text-black/60">
                    <tr className="text-xs">
                      <th className="py-1.5 font-medium">#</th>
                      <th className="font-medium">{t.dept}</th>
                      <th className="font-medium">{t.coords}</th>
                      <th className="text-right font-medium">{t.detections}</th>
                      <th className="text-right font-medium">MW</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {top.map((e, i) => (
                      <tr
                        key={e.id}
                        className="border-t border-snow/10 print:border-black/20"
                      >
                        <td className="py-1.5">{i + 1}</td>
                        <td>
                          {deptName(e.name, lang)} {e.activo ? "●" : ""}
                        </td>
                        <td>
                          {fmtCoord(e.centro[1])}, {fmtCoord(e.centro[0])}
                        </td>
                        <td className="text-right">{e.detecciones.total}</td>
                        <td className="text-right">
                          {nf(e.frp_max_mw, t.loc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-5 text-[11px] leading-relaxed text-snow/50 print:text-black/60">
                  {t.reportSource}
                </p>
              </article>
            </>
          )}
        </Reveal>
      </div>
    </section>
  );
}
