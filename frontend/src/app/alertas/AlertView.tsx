"use client";

import { useMemo, useState } from "react";
import Card from "@/components/Card";
import Footer from "@/components/sections/Footer";
import Reveal from "@/components/Reveal";
import SectionDivider from "@/components/SectionDivider";
import Select from "@/components/Select";
import {
  apiUrl,
  type ApiAlert,
  type ApiAlertRow,
  type ApiEvents,
  type ApiForecast,
  type ApiHealth,
  type ApiRegion,
} from "@/lib/api";
import { useLang, type Lang } from "@/lib/lang";
import { useApi } from "@/lib/use-api";

/* ------------------------------------------------------------------ */
/* Textos                                                              */
/* ------------------------------------------------------------------ */
const MONTHS = {
  en: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ],
  es: [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ],
};

const TXT = {
  en: {
    loc: "en-US",
    kicker: "Fire alerts",
    h1a: "Where is fire above normal",
    h1b: "right now?",
    lead: "We compare the last days of satellite detections with the same days of previous years, department by department. It is a signal to look at, not a verified warning.",
    window: "Last days",
    updated: "Updated",
    live: "Near-real-time data",
    loading: "Loading…",
    error: "We could not reach the data. Check your connection and try again.",
    retry: "Retry",
    s1: "This week",
    s1t: "Which departments are above their usual level",
    s1d: "Each bar compares the last days with the same days of 2013–2025. The shaded band is the usual range (25th to 75th percentile); the line is the median.",
    country: "All of Peru",
    hs: "hotspots",
    typical: "typical",
    vsTypical: "of the typical level",
    onlyHigh: "Only above usual",
    all: "All departments",
    none: "No department is above its usual level in this window.",
    state: {
      bajo: "low",
      normal: "normal",
      alto: "high",
      inusual: "unusual",
    } as Record<string, string>,
    rule: "How we mark it",
    s2: "Active fires",
    s2t: "Detections grouped into events",
    s2d: "Detections less than 1.2 km and one day apart are chained into one event. These are raw MODIS and VIIRS detections of the last week, not harmonized counts.",
    events: "events",
    active: "active",
    growing: "growing",
    detections: "detections",
    maxFrp: "max power",
    days: "days",
    activeTag: "Active",
    endedTag: "Ended",
    trend: {
      estable: "steady",
      creciendo: "growing",
      decreciendo: "fading",
      bajando: "fading",
    } as Record<string, string>,
    openMap: "Open on the map",
    noEvents: "No events with enough detections in this window.",
    s3: "Forecast",
    s3t: "What a typical year looks like",
    s3d: "A statistical estimate for each month, built from the years with VIIRS observations. It is not a prediction of a specific fire and it does not anticipate exceptional years.",
    region: "Region",
    year: "Forecast year",
    total: "Expected in the year",
    range: "p10–p90 range",
    how: "How reliable it is",
    errMonth: "average error per department and month",
    errYear: "average error in the national yearly total",
    inRange: "of real values fell inside the range",
    backtest: "Tested on",
    pred: "Forecast",
    obs: "Observed",
    yr: "Year",
    err: "Error",
    s4: "Before you read this page",
    s4t: "What these numbers are, and what they are not",
    notes: [
      "The most recent days come from the near-real-time product (NRT), so the latest day can be incomplete.",
      "Counts in alerts and events are raw detections. The calendar and the forecast use VIIRS-equivalent hotspots, harmonized from MODIS before 2012.",
      "Hotspots are heat detections from satellites, not burned area, and they cannot tell an agricultural burn from a wildfire.",
      "The alert rule has not yet been tested against past years. Use it to know where to look, and confirm with local authorities.",
    ],
    csv: "Download the series (CSV)",
    trendLabel: "trend",
    ruleText:
      "unusual: above the 90th percentile. high: above the 75th. low: below the 25th. With fewer than 10 hotspots nothing is marked high or unusual.",
    alertNote:
      "The latest days come from the near-real-time product and the most recent day can be incomplete. The rule has not been tested against past years: it is a signal to look at, not a verified warning.",
    eventsNote:
      "These are raw MODIS and VIIRS detections (near real time), not harmonized, inside Peru's departments. Only events with at least 3 detections are listed.",
    method:
      "Median of that month across the years with observed VIIRS (2012 onward). The range goes from the 10th to the 90th percentile of those years.",
    fcNote: (e: string, a: string, r: string) =>
      `A statistical estimate of a typical year, not an observation or a warning. Tested against past years it was off by ${e} per department and month and ${a} in the national total; the range held the real value ${r} of the time.`,
    explore: "Explore the full record →",
  },
  es: {
    loc: "es-PE",
    kicker: "Alertas de fuego",
    h1a: "¿Dónde hay más fuego de lo normal",
    h1b: "ahora mismo?",
    lead: "Comparamos los últimos días de detecciones satelitales con los mismos días de años anteriores, departamento por departamento. Es una señal para mirar, no un aviso verificado.",
    window: "Últimos días",
    updated: "Actualizado",
    live: "Datos casi en tiempo real",
    loading: "Cargando…",
    error:
      "No pudimos conectar con los datos. Revisa tu conexión e inténtalo de nuevo.",
    retry: "Reintentar",
    s1: "Esta semana",
    s1t: "Qué departamentos están por encima de lo habitual",
    s1d: "Cada barra compara los últimos días con los mismos días de 2013–2025. La banda sombreada es el rango habitual (percentil 25 al 75); la línea es la mediana.",
    country: "Todo el Perú",
    hs: "focos",
    typical: "típico",
    vsTypical: "de lo típico",
    onlyHigh: "Solo sobre lo habitual",
    all: "Todos los departamentos",
    none: "Ningún departamento supera su nivel habitual en esta ventana.",
    state: {
      bajo: "bajo",
      normal: "normal",
      alto: "alto",
      inusual: "inusual",
    } as Record<string, string>,
    rule: "Cómo se marca",
    s2: "Fuegos activos",
    s2t: "Detecciones agrupadas en eventos",
    s2d: "Las detecciones a menos de 1,2 km y a un día o menos se encadenan en un solo evento. Son detecciones crudas de MODIS y VIIRS de la última semana, no conteos armonizados.",
    events: "eventos",
    active: "activos",
    growing: "creciendo",
    detections: "detecciones",
    maxFrp: "potencia máx.",
    days: "días",
    activeTag: "Activo",
    endedTag: "Terminó",
    trend: {
      estable: "estable",
      creciendo: "creciendo",
      decreciendo: "apagándose",
      bajando: "apagándose",
    } as Record<string, string>,
    openMap: "Abrir en el mapa",
    noEvents: "No hay eventos con suficientes detecciones en esta ventana.",
    s3: "Pronóstico",
    s3t: "Cómo luce un año típico",
    s3d: "Una estimación estadística para cada mes, hecha con los años con VIIRS observado. No predice un incendio concreto ni anticipa años excepcionales.",
    region: "Región",
    year: "Año del pronóstico",
    total: "Esperado en el año",
    range: "rango p10–p90",
    how: "Qué tan confiable es",
    errMonth: "error promedio por departamento y mes",
    errYear: "error promedio en el total anual del país",
    inRange: "de los valores reales cayó dentro del rango",
    backtest: "Probado en",
    pred: "Pronóstico",
    obs: "Observado",
    yr: "Año",
    err: "Error",
    s4: "Antes de leer esta página",
    s4t: "Qué son estos números y qué no son",
    notes: [
      "Los días más recientes vienen del producto casi en tiempo real (NRT), así que el último día puede estar incompleto.",
      "Los conteos de alertas y eventos son detecciones crudas. El calendario y el pronóstico usan focos equivalentes VIIRS, armonizados desde MODIS antes de 2012.",
      "Los focos son detecciones de calor por satélite, no superficie quemada, y no distinguen una quema agrícola de un incendio forestal.",
      "La regla de alerta aún no se probó contra años pasados. Úsala para saber dónde mirar y confirma con las autoridades locales.",
    ],
    csv: "Descargar la serie (CSV)",
    trendLabel: "tendencia",
    ruleText: "",
    alertNote: "",
    eventsNote: "",
    method: "",
    fcNote: (e: string, a: string, r: string) => `${e}${a}${r}`,
    explore: "Explorar el registro completo →",
  },
};

type T = (typeof TXT)["en"];

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
const ORDER: Record<string, number> = {
  inusual: 3,
  alto: 2,
  normal: 1,
  bajo: 0,
};
const nfmt = (n: number, loc: string, d = 0) =>
  n.toLocaleString(loc, { maximumFractionDigits: d, minimumFractionDigits: d });
const pct = (n: number, loc: string) => `${nfmt(n * 100, loc)} %`;

const deptName = (name: string, lang: Lang) =>
  name.startsWith("Municipalidad")
    ? lang === "en"
      ? "Metropolitan Lima"
      : "Lima Metropolitana"
    : name;

function dayLabel(iso: string, loc: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(loc, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const PILL: Record<string, string> = {
  inusual: "bg-snow text-ink",
  alto: "bg-snow/85 text-ink",
  normal: "bg-snow/10 text-snow/70",
  bajo: "bg-snow/10 text-snow/50",
};

function StatePill({ estado, t }: { estado: string; t: T }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${PILL[estado] ?? PILL.normal}`}
    >
      {t.state[estado] ?? estado}
    </span>
  );
}

function Loading({
  t,
  error,
  onRetry,
}: {
  t: T;
  error?: Error;
  onRetry: () => void;
}) {
  return (
    <div
      role="status"
      className="grid min-h-40 place-items-center rounded-3xl text-center text-sm text-snow/65"
    >
      {error ? (
        <div className="flex flex-col items-center gap-3">
          <p>{t.error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer rounded-full border border-snow/30 px-5 py-2 font-medium text-snow transition-colors hover:border-snow"
          >
            {t.retry}
          </button>
        </div>
      ) : (
        <p className="animate-pulse">{t.loading}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 01 · Semana                                                         */
/* ------------------------------------------------------------------ */
/** Una fila: el valor de los últimos días frente al rango habitual (p25–p75) y la mediana. */
function AlertRow({ row, t, lang }: { row: ApiAlertRow; t: T; lang: Lang }) {
  const max = Math.max(row.hs, row.p90, row.p75, 1) * 1.08;
  const at = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const ratio = row.pct_mediana;
  return (
    <li className="grid items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[11rem_minmax(0,1fr)_9rem]">
      <div className="flex items-center justify-between gap-3 sm:block">
        <p className="font-medium text-snow">{deptName(row.name, lang)}</p>
        <StatePill estado={row.estado} t={t} />
      </div>
      <div
        role="img"
        aria-label={`${deptName(row.name, lang)}: ${nfmt(row.hs, t.loc)} ${t.hs}, ${t.typical} ${nfmt(row.median, t.loc)}`}
        className="relative h-3 rounded-full bg-snow/[0.07]"
      >
        <div
          className="absolute inset-y-0 rounded-full bg-snow/20"
          style={{
            left: at(row.p25),
            width: `calc(${at(row.p75)} - ${at(row.p25)})`,
          }}
        />
        <div
          className="absolute -inset-y-1 w-px bg-snow/60"
          style={{ left: at(row.median) }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-snow"
          style={{
            width: at(row.hs),
            opacity: row.estado === "bajo" ? 0.5 : 1,
          }}
        />
      </div>
      <p className="text-right text-sm tabular-nums text-snow/70 sm:text-left">
        <b className="text-base font-semibold text-snow">
          {nfmt(row.hs, t.loc)}
        </b>{" "}
        {t.hs}
        <span className="block text-xs text-snow/50">
          {t.typical} {nfmt(row.median, t.loc)}
          {ratio != null && ratio > 0 ? ` · ${nfmt(ratio, t.loc)} %` : ""}
        </span>
      </p>
    </li>
  );
}

function WeekSection({
  t,
  lang,
  alert,
}: {
  t: T;
  lang: Lang;
  alert: ReturnType<typeof useApi<ApiAlert>>;
}) {
  const [onlyHigh, setOnlyHigh] = useState(false);
  const rows = useMemo(() => {
    const all = [...(alert.data?.departamentos ?? [])].sort(
      (a, b) =>
        ORDER[b.estado] - ORDER[a.estado] ||
        (b.pct_mediana ?? 0) - (a.pct_mediana ?? 0),
    );
    return onlyHigh ? all.filter((r) => ORDER[r.estado] >= 2) : all;
  }, [alert.data, onlyHigh]);

  return (
    <section className="relative px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
      <div className="mx-auto w-full max-w-6xl">
        <SectionDivider index="01" label={t.s1} className="mb-10 sm:mb-14" />
        <Reveal className="max-w-3xl">
          <h2 className="text-[1.9rem] leading-tight tracking-tight sm:text-5xl">
            {t.s1t}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-snow/70 sm:text-base">
            {t.s1d}
          </p>
        </Reveal>

        <Reveal delay={100} className="mt-10">
          {!alert.data ? (
            <Loading t={t} error={alert.error} onRetry={alert.reload} />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
              <Card className="h-fit rounded-3xl p-6">
                <p className="text-[11px] uppercase tracking-[0.14em] text-snow/60">
                  {t.country}
                </p>
                <p className="mt-3 font-heading text-6xl font-bold leading-none tabular-nums text-snow">
                  {nfmt(alert.data.peru.hs, t.loc)}
                </p>
                <p className="mt-2 text-sm text-snow/65">
                  {t.hs} · {dayLabel(alert.data.desde, t.loc)} –{" "}
                  {dayLabel(alert.data.hasta, t.loc)}
                </p>
                <div className="mt-4 flex items-center gap-3 text-sm text-snow/70">
                  <StatePill estado={alert.data.peru.estado} t={t} />
                  <span>
                    {alert.data.peru.pct_mediana != null
                      ? `${nfmt(alert.data.peru.pct_mediana, t.loc)} % ${t.vsTypical}`
                      : ""}
                  </span>
                </div>
                <p className="mt-5 border-t border-snow/10 pt-4 text-xs leading-relaxed text-snow/55">
                  <b className="text-snow/75">{t.rule}:</b>{" "}
                  {lang === "en" ? t.ruleText : alert.data.regla}
                </p>
              </Card>

              <Card className="rounded-3xl p-5 sm:p-7">
                <div
                  role="group"
                  aria-label={t.s1}
                  className="mb-2 flex flex-wrap gap-2"
                >
                  {[
                    [false, t.all],
                    [true, t.onlyHigh],
                  ].map(([v, label]) => (
                    <button
                      key={String(v)}
                      type="button"
                      aria-pressed={onlyHigh === v}
                      onClick={() => setOnlyHigh(v as boolean)}
                      className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                        onlyHigh === v
                          ? "border-snow bg-snow text-ink"
                          : "border-snow/25 text-snow/75 hover:border-snow/60"
                      }`}
                    >
                      {label as string}
                    </button>
                  ))}
                </div>
                {rows.length ? (
                  <ul className="divide-y divide-snow/10">
                    {rows.map((r) => (
                      <AlertRow key={r.region_id} row={r} t={t} lang={lang} />
                    ))}
                  </ul>
                ) : (
                  <p className="py-10 text-center text-sm text-snow/60">
                    {t.none}
                  </p>
                )}
                <p className="mt-3 border-t border-snow/10 pt-3 text-xs leading-relaxed text-snow/50">
                  {lang === "en" ? t.alertNote : alert.data.nota}
                </p>
              </Card>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 02 · Eventos                                                        */
/* ------------------------------------------------------------------ */
function EventsSection({ t, lang }: { t: T; lang: Lang }) {
  const ev = useApi<ApiEvents>("/events", { limit: 8 });
  const d = ev.data;
  return (
    <section className="relative px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
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
            <Loading t={t} error={ev.error} onRetry={ev.reload} />
          ) : (
            <>
              <dl className="grid grid-cols-3 gap-3 sm:gap-5">
                {[
                  [d.resumen.eventos, t.events],
                  [d.resumen.activos, t.active],
                  [d.resumen.creciendo, t.growing],
                ].map(([v, l]) => (
                  <Card
                    key={String(l)}
                    className="rounded-3xl px-4 py-5 text-center sm:py-7"
                  >
                    <dd className="font-heading text-4xl font-bold tabular-nums text-snow sm:text-6xl">
                      {nfmt(Number(v), t.loc)}
                    </dd>
                    <dt className="mt-1 text-xs uppercase tracking-[0.14em] text-snow/60">
                      {l}
                    </dt>
                  </Card>
                ))}
              </dl>

              {d.events.length ? (
                <ul className="mt-5 grid gap-4 md:grid-cols-2">
                  {d.events.map((e) => (
                    <li key={e.id}>
                      <Card className="flex h-full flex-col gap-3 rounded-3xl p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold text-snow">
                              {deptName(e.name, lang)}
                            </p>
                            <p className="text-xs text-snow/55">
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
                        <dl className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <dd className="font-heading text-2xl font-bold tabular-nums text-snow">
                              {nfmt(e.detecciones.total, t.loc)}
                            </dd>
                            <dt className="text-[11px] text-snow/55">
                              {t.detections}
                            </dt>
                          </div>
                          <div>
                            <dd className="font-heading text-2xl font-bold tabular-nums text-snow">
                              {nfmt(e.frp_max_mw, t.loc)}
                            </dd>
                            <dt className="text-[11px] text-snow/55">
                              {t.maxFrp} (MW)
                            </dt>
                          </div>
                          <div>
                            <dd className="font-heading text-2xl font-bold text-snow">
                              {t.trend[e.tendencia] ?? e.tendencia}
                            </dd>
                            <dt className="text-[11px] text-snow/55">
                              {t.trendLabel}
                            </dt>
                          </div>
                        </dl>
                        <a
                          href={`https://www.google.com/maps?q=${e.centro[1]},${e.centro[0]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-auto text-sm font-medium text-snow underline decoration-snow/30 underline-offset-4 transition-colors hover:decoration-snow"
                        >
                          {t.openMap} ↗
                        </a>
                      </Card>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 text-center text-sm text-snow/60">
                  {t.noEvents}
                </p>
              )}
              <p className="mt-5 max-w-3xl text-xs leading-relaxed text-snow/50">
                {lang === "en" ? t.eventsNote : d.nota}
              </p>
            </>
          )}
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 03 · Pronóstico                                                     */
/* ------------------------------------------------------------------ */
function ForecastChart({ f, t, lang }: { f: ApiForecast; t: T; lang: Lang }) {
  const W = 640,
    H = 240,
    L = 8,
    B = 26,
    T0 = 14;
  const max = Math.max(1, ...f.months.map((m) => m.hs_hi)) * 1.06;
  const bw = (W - L * 2) / 12;
  const y = (v: number) => T0 + (1 - v / max) * (H - B - T0);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${t.s3} ${f.year}: ${f.name}`}
      className="block h-auto w-full"
    >
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <line
          key={k}
          x1={L}
          x2={W - L}
          y1={y(max * k * 0.94)}
          y2={y(max * k * 0.94)}
          stroke="#F3F9FC"
          strokeOpacity={0.07}
        />
      ))}
      {f.months.map((m, i) => {
        const x = L + i * bw + bw / 2;
        return (
          <g key={m.month}>
            <rect
              x={x - bw * 0.3}
              y={y(m.hs)}
              width={bw * 0.6}
              height={Math.max(1, H - B - y(m.hs))}
              rx={4}
              fill="#F3F9FC"
              fillOpacity={0.85}
            />
            <line
              x1={x}
              x2={x}
              y1={y(m.hs_hi)}
              y2={y(m.hs_lo)}
              stroke="#F3F9FC"
              strokeOpacity={0.55}
              strokeWidth={1.5}
            />
            <line
              x1={x - 5}
              x2={x + 5}
              y1={y(m.hs_hi)}
              y2={y(m.hs_hi)}
              stroke="#F3F9FC"
              strokeOpacity={0.55}
              strokeWidth={1.5}
            />
            <line
              x1={x - 5}
              x2={x + 5}
              y1={y(m.hs_lo)}
              y2={y(m.hs_lo)}
              stroke="#F3F9FC"
              strokeOpacity={0.55}
              strokeWidth={1.5}
            />
            <text
              x={x}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill="#F3F9FC"
              fillOpacity={0.6}
            >
              {MONTHS[lang][i]}
            </text>
            <title>{`${MONTHS[lang][i]}: ${nfmt(m.hs, t.loc)} (${nfmt(m.hs_lo, t.loc)}–${nfmt(m.hs_hi, t.loc)})`}</title>
          </g>
        );
      })}
    </svg>
  );
}

function ForecastSection({ t, lang }: { t: T; lang: Lang }) {
  const regions = useApi<ApiRegion[]>("/regions");
  const [region, setRegion] = useState("PE");
  const f = useApi<ApiForecast>("/forecast", { region_id: region });
  const options = useMemo(
    () =>
      (regions.data ?? [{ id: "PE", name: "Perú" }]).map((r) => ({
        value: r.id,
        label: r.id === "PE" ? t.country : deptName(r.name, lang),
      })),
    [regions.data, t.country, lang],
  );
  const v = f.data?.validacion;
  return (
    <section className="relative px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
      <div className="mx-auto w-full max-w-6xl">
        <SectionDivider index="03" label={t.s3} className="mb-10 sm:mb-14" />
        <Reveal className="max-w-3xl">
          <h2 className="text-[1.9rem] leading-tight tracking-tight sm:text-5xl">
            {t.s3t}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-snow/70 sm:text-base">
            {t.s3d}
          </p>
        </Reveal>

        <Reveal
          delay={100}
          className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
        >
          <Card className="rounded-3xl p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="w-full max-w-xs">
                <label
                  htmlFor="fc-region"
                  className="text-[11px] uppercase tracking-[0.14em] text-snow/60"
                >
                  {t.region}
                </label>
                <div className="mt-1.5">
                  <Select
                    id="fc-region"
                    size="sm"
                    value={region}
                    onChange={setRegion}
                    options={options}
                  />
                </div>
              </div>
              {f.data && (
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-snow/60">
                    {t.total} · {f.data.year}
                  </p>
                  <p className="font-heading text-4xl font-bold tabular-nums text-snow">
                    ≈ {nfmt(f.data.total, t.loc)}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-5">
              {!f.data ? (
                <Loading t={t} error={f.error} onRetry={f.reload} />
              ) : (
                <ForecastChart f={f.data} t={t} lang={lang} />
              )}
            </div>
            {f.data && (
              <p className="mt-3 text-xs leading-relaxed text-snow/50">
                {t.range}: {lang === "en" ? t.method : f.data.metodo}
              </p>
            )}
          </Card>

          <Card className="rounded-3xl p-5 sm:p-7">
            <p className="text-[11px] uppercase tracking-[0.14em] text-snow/60">
              {t.how}
            </p>
            {!v ? (
              <Loading t={t} error={f.error} onRetry={f.reload} />
            ) : (
              <>
                <dl className="mt-4 space-y-4">
                  {[
                    [pct(v.error_nacional_anual, t.loc), t.errYear],
                    [pct(v.error_departamento_mes, t.loc), t.errMonth],
                    [pct(v.dentro_del_rango, t.loc), t.inRange],
                  ].map(([n, l]) => (
                    <div key={l}>
                      <dd className="font-heading text-4xl font-bold tabular-nums text-snow">
                        {n}
                      </dd>
                      <dt className="text-sm text-snow/65">{l}</dt>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 overflow-x-auto border-t border-snow/10 pt-4">
                  <p className="mb-2 text-xs text-snow/55">
                    {t.backtest} {v.prueba}
                  </p>
                  <table className="w-full min-w-64 text-left text-xs tabular-nums text-snow/75">
                    <thead className="text-snow/50">
                      <tr>
                        <th className="py-1 font-medium">{t.yr}</th>
                        <th className="py-1 font-medium">{t.pred}</th>
                        <th className="py-1 font-medium">{t.obs}</th>
                        <th className="py-1 text-right font-medium">{t.err}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.por_anio.map((r) => (
                        <tr key={r.year} className="border-t border-snow/10">
                          <td className="py-1.5">{r.year}</td>
                          <td>{nfmt(r.previsto, t.loc)}</td>
                          <td>{nfmt(r.observado, t.loc)}</td>
                          <td className="text-right">{`${r.error > 0 ? "+" : ""}${nfmt(r.error * 100, t.loc)} %`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </Reveal>
        {f.data && (
          <p className="mt-5 max-w-3xl text-xs leading-relaxed text-snow/50">
            {lang === "en"
              ? t.fcNote(
                  pct(f.data.validacion.error_departamento_mes, t.loc),
                  pct(f.data.validacion.error_nacional_anual, t.loc),
                  pct(f.data.validacion.dentro_del_rango, t.loc),
                )
              : f.data.nota}
          </p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */
export default function AlertView() {
  const [lang] = useLang();
  const t = TXT[lang];
  const alert = useApi<ApiAlert>("/alert");
  const health = useApi<ApiHealth>("/health");
  const win = alert.data;

  return (
    <div className="flex-1 text-snow">
      <header className="relative mx-auto w-full max-w-6xl px-4 pb-6 pt-28 text-center sm:px-6 sm:pt-40">
        <p className="animate-rise text-xs uppercase tracking-[0.22em] text-snow/60">
          {t.kicker}
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl animate-rise text-4xl leading-[1.06] tracking-tight [animation-delay:120ms] sm:text-6xl lg:text-7xl">
          {t.h1a}
          <span className="block text-snow/50">{t.h1b}</span>
        </h1>
        <p className="mx-auto mt-7 max-w-2xl animate-rise text-base leading-relaxed text-snow/75 [animation-delay:240ms] sm:text-lg">
          {t.lead}
        </p>
        <div className="mt-9 flex animate-rise flex-wrap items-center justify-center gap-3 text-xs text-snow/65 [animation-delay:360ms]">
          <span className="rounded-full border border-snow/20 bg-ink/40 px-3.5 py-1.5 backdrop-blur-sm">
            <span className="mr-2 inline-block size-1.5 rounded-full bg-snow align-middle" />
            {t.live}
          </span>
          {win && (
            <span className="rounded-full border border-snow/20 bg-ink/40 px-3.5 py-1.5 backdrop-blur-sm">
              {t.window}: {dayLabel(win.desde, t.loc)} –{" "}
              {dayLabel(win.hasta, t.loc)}
            </span>
          )}
          {health.data?.generated && (
            <span className="rounded-full border border-snow/20 bg-ink/40 px-3.5 py-1.5 backdrop-blur-sm">
              {t.updated}:{" "}
              {new Date(health.data.generated).toLocaleString(t.loc, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          )}
        </div>
      </header>

      <WeekSection t={t} lang={lang} alert={alert} />
      <EventsSection t={t} lang={lang} />
      <ForecastSection t={t} lang={lang} />

      <section className="relative px-4 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
        <div className="mx-auto w-full max-w-6xl">
          <SectionDivider index="04" label={t.s4} className="mb-10 sm:mb-14" />
          <Reveal className="max-w-3xl">
            <h2 className="text-[1.9rem] leading-tight tracking-tight sm:text-5xl">
              {t.s4t}
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <ul className="mt-8 grid gap-3 md:grid-cols-2">
              {t.notes.map((n, i) => (
                <li key={i}>
                  <Card className="flex h-full gap-4 rounded-3xl p-5">
                    <span className="font-heading text-3xl font-semibold leading-none text-snow/35">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-snow/75">{n}</p>
                  </Card>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap gap-3 text-sm font-medium">
              <a
                href={apiUrl("/export/mensual.csv", { region_id: "PE" })}
                download="calendario.csv"
                className="rounded-full bg-snow px-7 py-3.5 text-ink transition hover:-translate-y-0.5 hover:opacity-90"
              >
                {t.csv}
              </a>
              <a
                href="/pantalla-3"
                className="rounded-full border border-snow/40 px-7 py-3.5 text-snow transition-colors hover:border-snow"
              >
                {t.explore}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
