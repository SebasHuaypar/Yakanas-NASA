"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEPT_SHAPES, PERU_VIEWBOX, SHAPE_BY_ID, pointInRings } from "@/app/explorador/lib/geo";
import Card from "@/components/Card";
import { apiGet, type ApiEvents, type ApiFires, type ApiForecast, type ApiModelInfo, type ApiModelMap, type ApiPlaceRecurrence } from "@/lib/api";
import { bearing, compass, distanceKm, fmtCoord, weekOfYear } from "@/lib/geo-utils";
import { useLang, type Lang } from "@/lib/lang";
import { addPlace, MAX_PLACES, removePlace, useSavedPlaces, type SavedPlace } from "@/lib/saved-places";
import { useApi } from "@/lib/use-api";
import { COPY, type Copy } from "./copy";
import FireMap from "./FireMap";
import { FlameIcon, PinIcon } from "./Icons";
import RiskForecast, { type RiskMode, type RiskPoint } from "./RiskForecast";
import { MONTHS } from "./text";

type Loc = { id?: string; name: string; lat: number; lon: number };
type Level = "danger" | "watch" | "clear";

const nf = (n: number, loc: string, d = 0) => n.toLocaleString(loc, { maximumFractionDigits: d, minimumFractionDigits: d });
const dayLabel = (iso: string, loc: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(loc, { day: "numeric", month: "short", timeZone: "UTC" });
};

const BTN = "cursor-pointer rounded-full border border-snow/30 px-4 py-2 text-sm font-medium text-snow/90 transition-colors hover:border-snow hover:text-snow disabled:cursor-not-allowed disabled:opacity-50";
const BTN_MAIN = "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-snow px-6 py-3 text-sm font-semibold text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

/* ---------------------------------------------------------------- lógica */
function useNearby(p: { lat: number; lon: number } | null, fires: ApiFires | undefined) {
  return useMemo(() => {
    if (!p || !fires) return null;
    let nearest: { km: number; dir: number; date: string } | null = null;
    let w10 = 0;
    let w25 = 0;
    for (const f of fires.features) {
      const [lon, lat] = f.geometry.coordinates;
      const km = distanceKm(p.lat, p.lon, lat, lon);
      if (km <= 25) w25++;
      if (km <= 10) w10++;
      if (!nearest || km < nearest.km) nearest = { km, dir: bearing(p.lat, p.lon, lat, lon), date: f.properties.acq_date };
    }
    const level: Level = nearest && nearest.km <= 10 ? "danger" : nearest && nearest.km <= 25 ? "watch" : "clear";
    return { nearest, w10, w25, level };
  }, [p, fires]);
}

const LEVEL_STYLE: Record<Level, { card: string; pill: string; dot: string }> = {
  danger: { card: "border-ember/60 bg-ember/[0.09] shadow-[0_0_44px_rgb(255_122_47/0.16)]", pill: "bg-ember text-ink", dot: "bg-ember" },
  watch: { card: "border-amber/60 bg-amber/[0.08]", pill: "bg-amber text-ink", dot: "bg-amber" },
  clear: { card: "border-snow/20 bg-snow/[0.05]", pill: "bg-snow/12 text-snow/80", dot: "bg-snow/60" },
};

/* ---------------------------------------------------------------- elegir lugar */
function Picker({ c, lang, onPick }: { c: Copy; lang: Lang; onPick: (l: Loc) => void }) {
  const [msg, setMsg] = useState("");
  const [locating, setLocating] = useState(false);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Loc[] | null>(null);

  const choose = (lat: number, lon: number, name: string) => {
    if (!deptAt(lat, lon)) return setMsg(c.outside);
    setMsg("");
    onPick({ name, lat: Number(fmtCoord(lat)), lon: Number(fmtCoord(lon)) });
  };

  const locate = () => {
    if (!navigator.geolocation) return setMsg(c.locationDenied);
    setLocating(true);
    setMsg("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        choose(p.coords.latitude, p.coords.longitude, c.nameDefault);
      },
      () => {
        setLocating(false);
        setMsg(c.locationDenied);
      },
      { timeout: 15000 },
    );
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    setSearching(true);
    setMsg("");
    setResults(null);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&countrycodes=pe&accept-language=${lang}&q=${encodeURIComponent(text)}`);
      const j = (await r.json()) as { display_name: string; lat: string; lon: string }[];
      const out: Loc[] = [];
      for (const x of j) {
        const parts = x.display_name
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v && !/^(per[uú]|peru)$/i.test(v) && !/^\d+$/.test(v));
        const name = parts.slice(0, 3).join(", ");
        const lat = Number(x.lat);
        const lon = Number(x.lon);
        // Nominatim devuelve varios objetos del mismo sitio (límite, punto, etc.): se descartan los repetidos o a menos de 3 km con el mismo nombre
        const dup = out.some((o) => o.name === name || (o.name.split(",")[0] === name.split(",")[0] && distanceKm(o.lat, o.lon, lat, lon) < 3));
        if (!dup) out.push({ name, lat, lon });
      }
      setResults(out.slice(0, 5));
    } catch {
      setMsg(c.locationDenied);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      <button type="button" onClick={locate} disabled={locating} className={`${BTN_MAIN} w-full py-4 text-base sm:w-auto`}>
        <PinIcon className="size-5" />
        {locating ? c.locating : c.useLocation}
      </button>

      <form onSubmit={search} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={c.searchPlaceholder}
          aria-label={c.searchPlaceholder}
          className="min-w-0 flex-1 rounded-full border border-snow/30 bg-ink/50 px-5 py-3 text-base text-snow outline-none placeholder:text-snow/45 focus-visible:border-snow"
        />
        <button type="submit" disabled={searching || !q.trim()} className={BTN}>
          {searching ? c.searching : c.search}
        </button>
      </form>
      <p className="text-xs text-snow/50">{c.searchNote}</p>

      {results && (
        <ul className="space-y-1.5" aria-live="polite">
          {results.length ? (
            results.map((r, i) => (
              <li key={i}>
                <button type="button" onClick={() => choose(r.lat, r.lon, r.name)} className="w-full cursor-pointer rounded-2xl border border-snow/20 px-4 py-3 text-left text-sm text-snow/90 transition-colors hover:border-snow">
                  {r.name}
                </button>
              </li>
            ))
          ) : (
            <li className="text-sm text-snow/60">{c.noResults}</li>
          )}
        </ul>
      )}
      {msg && (
        <p role="status" className="text-sm text-ember">
          {msg}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- respuesta */
function Verdict({ loc, near, c, lang, cov, events, saved, onSave, onRemove, onChange }: {
  loc: Loc;
  near: NonNullable<ReturnType<typeof useNearby>>;
  c: Copy;
  lang: Lang;
  cov?: { desde: string; hasta: string };
  events?: ApiEvents;
  saved: boolean;
  onSave: (name: string) => void;
  onRemove: () => void;
  onChange: () => void;
}) {
  const [name, setName] = useState(loc.name);
  const [copied, setCopied] = useState(false);
  const st = LEVEL_STYLE[near.level];
  const km = near.nearest ? nf(near.nearest.km, c.loc, 1) : "";
  const dir = near.nearest ? compass(near.nearest.dir, lang) : "";
  const title = near.level === "danger" ? c.dangerTitle(km, dir) : near.level === "watch" ? c.watchTitle(km, dir) : c.clearTitle;
  const sub = near.level === "danger" ? c.dangerSub : near.level === "watch" ? c.watchSub : c.clearSub;
  const todo = near.level === "danger" ? c.todoDanger : near.level === "watch" ? c.todoWatch : c.todoClear;
  const when = cov ? `${dayLabel(cov.desde, c.loc)} – ${dayLabel(cov.hasta, c.loc)}` : "";

  const eventNear = useMemo(() => {
    let best: { km: number; n: number } | null = null;
    for (const e of events?.events ?? []) {
      if (!e.activo) continue;
      const k = distanceKm(loc.lat, loc.lon, e.centro[1], e.centro[0]);
      if (k <= 25 && (!best || k < best.km)) best = { km: k, n: e.detecciones.total };
    }
    return best;
  }, [events, loc.lat, loc.lon]);

  const message = () =>
    c.msg({ name: loc.name, status: title, extra: c.detail(near.w10, near.w25, cov ? dayLabel(cov.desde, c.loc) : "", cov ? dayLabel(cov.hasta, c.loc) : ""), coords: `${fmtCoord(loc.lat)}, ${fmtCoord(loc.lon)}`, when, url: `${location.origin}/prevencion` });
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="space-y-4">
      <div className={`rounded-3xl border p-5 sm:p-7 ${st.card}`} role="status" aria-live="polite">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-snow/70">
          <span className={`size-2.5 rounded-full ${st.dot}`} />
          {loc.name} · {c.states[near.level]}
        </div>
        <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-snow sm:text-4xl">{title}</h2>
        <p className="mt-2 text-base text-snow/80">{sub}</p>
        {eventNear && <p className="mt-3 text-sm font-medium text-snow">{c.eventNear(nf(eventNear.km, c.loc, 1), eventNear.n)}</p>}
        <p className="mt-3 text-xs text-snow/55">{c.detail(near.w10, near.w25, cov ? dayLabel(cov.desde, c.loc) : "", cov ? dayLabel(cov.hasta, c.loc) : "")}</p>
      </div>

      <Card className="rounded-3xl p-5">
        <p className="text-sm font-semibold text-snow">{c.tell}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(message())}`} target="_blank" rel="noopener noreferrer" className={BTN_MAIN}>
            {c.whatsapp}
          </a>
          {canShare && (
            <button type="button" className={BTN} onClick={() => navigator.share({ title: loc.name, text: message() }).catch(() => {})}>
              {c.share}
            </button>
          )}
          <button
            type="button"
            className={BTN}
            onClick={() => {
              void navigator.clipboard?.writeText(message()).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              });
            }}
          >
            {copied ? c.copied : c.copy}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-2 border-t border-snow/10 pt-4">
          {saved ? (
            <>
              <span className="mr-2 text-sm text-snow/70">{c.saved}</span>
              <button type="button" className={BTN} onClick={onRemove}>
                {c.remove}
              </button>
            </>
          ) : (
            <>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label={c.save} className="min-w-0 flex-1 rounded-full border border-snow/30 bg-ink/50 px-4 py-2 text-sm text-snow outline-none focus-visible:border-snow" />
              <button type="button" className={BTN} onClick={() => onSave(name.trim() || c.nameDefault)}>
                {c.save}
              </button>
            </>
          )}
          <button type="button" className={`${BTN} ml-auto`} onClick={onChange}>
            {c.change}
          </button>
        </div>
      </Card>

      <details open={near.level !== "clear"} className="rounded-3xl border border-snow/15 bg-snow/[0.03] px-5 py-4">
        <summary className="cursor-pointer select-none text-sm font-semibold text-snow">{c.whatToDo}</summary>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-snow/80">
          {todo.map((x) => (
            <li key={x} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-amber" />
              {x}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-snow/50">{c.caveat}</p>
      </details>
    </div>
  );
}

/* ---------------------------------------------------------------- temporada */
const level = (f: number) => (f >= 0.5 ? "high" : f >= 0.2 ? "mid" : "low");

function ForecastBars({ months, lang }: { months: { year: number; month: number; hs: number; hs_lo: number; hs_hi: number }[]; lang: Lang }) {
  const W = 360;
  const H = 150;
  const max = Math.max(1, ...months.map((m) => m.hs_hi)) * 1.05;
  const bw = W / months.length;
  const y = (v: number) => 10 + (1 - v / max) * (H - 36);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="forecast" className="block h-auto w-full">
      {months.map((m, i) => {
        const x = i * bw + bw / 2;
        return (
          <g key={`${m.year}-${m.month}`}>
            <rect x={x - bw * 0.26} y={y(m.hs)} width={bw * 0.52} height={Math.max(1, H - 26 - y(m.hs))} rx={4} fill="#FFB347" fillOpacity={0.9} />
            <line x1={x} x2={x} y1={y(m.hs_hi)} y2={y(m.hs_lo)} stroke="#F3F9FC" strokeOpacity={0.7} strokeWidth={1.4} />
            <text x={x} y={H - 8} textAnchor="middle" fontSize={11} fill="#F3F9FC" fillOpacity={0.65}>
              {MONTHS[lang][m.month - 1].slice(0, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Departamento que contiene un punto (se prueban primero los más pequeños: Callao y Lima Metropolitana van antes que Lima). */
const SHAPES_SMALL_FIRST = [...DEPT_SHAPES].sort((a, b) => a.area - b.area);
function deptAt(lat: number, lon: number) {
  const x = lon * 20;
  const y = -lat * 20;
  return SHAPES_SMALL_FIRST.find((d) => x >= d.bbox.x0 && x <= d.bbox.x1 && y >= d.bbox.y0 && y <= d.bbox.y1 && pointInRings(x, y, d.rings))?.id;
}

/** Probabilidad de fuego (regresión logística del backend) en la zona de un punto: 8 semanas o 14 días desde hoy. */
type ModelState = { key: string; pts: { date: string; p: number }[] | null };
function useModelSeries(loc: { lat: number; lon: number }, dept: string | undefined, mode: RiskMode, enabled: boolean) {
  const [state, setState] = useState<ModelState | null>(null);
  const key = dept && enabled ? `${dept}|${loc.lat}|${loc.lon}|${mode}` : "";
  useEffect(() => {
    if (!dept || !enabled) return;
    const ctl = new AbortController();
    const base = Date.now();
    const count = mode === "weeks" ? 8 : 14;
    const step = mode === "weeks" ? 7 : 1;
    const dates = Array.from({ length: count }, (_, i) => new Date(base + i * step * 864e5).toISOString().slice(0, 10));
    Promise.all(dates.map((fecha) => apiGet<ApiModelMap>("/prevention/model", { fecha, region_id: dept, minimo: 0.05, limit: 20000 }, ctl.signal).catch(() => (ctl.signal.aborted ? Promise.reject(new Error("aborted")) : apiGet<ApiModelMap>("/prevention/model", { fecha, region_id: dept, minimo: 0.05, limit: 20000 }, ctl.signal)))))
      .then((maps) => {
        const pts = maps.map((m, i) => {
          let p = 0;
          let best = 0.09; // grados: la zona del modelo mide 0,06°
          for (const f of m.features) {
            const [lo, la] = f.geometry.coordinates;
            const d = Math.hypot(la - loc.lat, lo - loc.lon);
            if (d < best) {
              best = d;
              p = f.properties.probabilidad;
            }
          }
          return { date: dates[i], p };
        });
        setState({ key, pts });
      })
      .catch(() => {
        if (!ctl.signal.aborted) setState({ key, pts: null });
      });
    return () => ctl.abort();
  }, [key, dept, enabled, mode, loc.lat, loc.lon]);
  if (!enabled || !dept) return { loading: false, pts: null as ModelState["pts"] };
  if (!state || state.key !== key) return { loading: true, pts: null as ModelState["pts"] };
  return { loading: false, pts: state.pts };
}

function Season({ loc, c, lang }: { loc: Loc; c: Copy; lang: Lang }) {
  const rec = useApi<ApiPlaceRecurrence>("/recurrence/place", { lat: Number(fmtCoord(loc.lat)), lon: Number(fmtCoord(loc.lon)) });
  const now = new Date();
  // Si el punto no tiene detecciones históricas, la API no dice su departamento: se calcula con los contornos.
  const deptId = rec.data ? rec.data.region_id || deptAt(loc.lat, loc.lon) : undefined;
  const dept = deptId ?? "PE";
  const deptName = (deptId && SHAPE_BY_ID[deptId]?.name) || rec.data?.name || "";
  const cur = useApi<ApiForecast>("/forecast", { region_id: dept, year: now.getFullYear() });
  const next = useApi<ApiForecast>("/forecast", { region_id: dept });

  const week = weekOfYear(now);
  const semanas = rec.data?.semanas;
  const [mode, setMode] = useState<RiskMode>("weeks");
  const wk = useModelSeries(loc, deptId, "weeks", true);
  const dy = useModelSeries(loc, deptId, "days", mode === "days");
  const model = mode === "days" && dy.pts ? dy : wk;
  const info = useApi<ApiModelInfo>("/prevention/model/info");
  // Con el modelo se muestra la probabilidad; si no responde, la recurrencia histórica de esa semana.
  const points: RiskPoint[] = model.pts
    ? model.pts.map((w) => ({ date: w.date, p: w.p, lv: level(w.p) }))
    : semanas && !wk.loading
      ? Array.from({ length: 8 }, (_, i) => semanas[(week - 1 + i) % semanas.length]).map((w) => {
          const [m, d] = w.inicia.split("-").map(Number);
          return { date: `${now.getFullYear()}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, p: null, lv: level(w.frecuencia) };
        })
      : [];
  const acc = info.data?.validacion?.regresion_logistica?.aciertos_zonas_marcadas;

  // Meses más críticos: los que tienen semanas de frecuencia alta (o, si no hay, los dos más frecuentes)
  const critical = useMemo(() => {
    if (!rec.data) return "";
    const byMonth = new Map<number, number>();
    for (const w of rec.data.semanas) {
      const m = Number(w.inicia.split("-")[0]);
      byMonth.set(m, Math.max(byMonth.get(m) ?? 0, w.frecuencia));
    }
    let ms = [...byMonth.entries()].filter(([, f]) => f >= 0.5).map(([m]) => m);
    if (!ms.length) ms = [...byMonth.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([m]) => m);
    ms.sort((a, b) => a - b);
    return ms.map((m) => MONTHS[lang][m - 1].toLowerCase()).join(lang === "en" ? " and " : " y ");
  }, [rec.data, lang]);

  const months = useMemo(() => {
    const curM = now.getMonth() + 1;
    const all = [...(cur.data?.months ?? []), ...(next.data?.months ?? [])].filter((m) => m.year > now.getFullYear() || m.month >= curM);
    return all.slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.data, next.data]);
  const peak = months.length ? months.reduce((a, b) => (b.hs > a.hs ? b : a)) : null;
  const val = next.data?.validacion ?? cur.data?.validacion;

  return (
    <Card className="rounded-3xl p-5 sm:p-7">
      <h2 className="text-xl font-bold text-snow sm:text-2xl">{c.seasonTitle}</h2>
      {rec.error ? (
        <p className="mt-4 text-sm text-snow/65">{c.seasonError}</p>
      ) : !rec.data ? (
        <p className="mt-4 animate-pulse text-sm text-snow/60">{c.seasonLoading}</p>
      ) : (
        <>
          <p className="mt-3 text-base text-snow/90">{c.criticalMonths(critical)}</p>

          <div className="mt-6">
            <RiskForecast points={points} mode={mode} setMode={setMode} canDays={!!wk.pts} loading={wk.loading || (mode === "days" && dy.loading)} lang={lang} />
          </div>
          {wk.pts && <p className="mt-3 text-xs text-snow/55">{c.modelNote(acc !== undefined ? `${Math.round(acc * 100)} %` : "")}</p>}
          {points.some((x) => x.lv !== "low") && <p className="mt-3 rounded-2xl border border-amber/40 bg-amber/[0.07] px-4 py-3 text-sm text-snow/85">{c.seasonTip}</p>}

          {peak && (
            <div className="mt-6 border-t border-snow/10 pt-5">
              <p className="text-sm font-semibold text-snow">{c.forecastTitle}</p>
              <p className="mt-1 text-sm text-snow/80">{c.forecastSentence(MONTHS[lang][peak.month - 1].toLowerCase(), deptName)}</p>
              <details className="mt-3">
                <summary className="cursor-pointer select-none text-xs font-medium text-snow/65">{c.forecastSee}</summary>
                <div className="mt-3 grid items-center gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <ForecastBars months={months} lang={lang} />
                  {val && <p className="text-xs leading-relaxed text-snow/60">{c.forecastAcc(`${nf(val.error_departamento_mes * 100, c.loc)} %`, `${nf(val.dentro_del_rango * 100, c.loc)} %`)}</p>}
                </div>
              </details>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- mis lugares */
function PlaceRow({ p, active, fires, c, onSelect }: { p: SavedPlace; active: boolean; fires?: ApiFires; c: Copy; onSelect: () => void }) {
  const near = useNearby(p, fires);
  const lv = near?.level ?? "clear";
  return (
    <li className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${active ? "border-snow/60 bg-snow/[0.07]" : "border-snow/15"}`}>
      <span className={`size-3 shrink-0 rounded-full ${LEVEL_STYLE[lv].dot}`} aria-hidden="true" />
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 cursor-pointer text-left">
        <span className="block truncate text-sm font-semibold text-snow">{p.name}</span>
        <span className="block text-xs text-snow/60">{near ? c.states[lv] : "…"}</span>
      </button>
      <button type="button" onClick={() => removePlace(p.id)} className="cursor-pointer text-xs text-snow/50 underline-offset-4 hover:text-snow hover:underline">
        {c.remove}
      </button>
    </li>
  );
}

type MapView = { lat: number; lon: number; span: number };
const ASPECT = PERU_VIEWBOX.w / PERU_VIEWBOX.h; // el recuadro conserva la forma del Perú entero
const WHOLE_SPAN = 18.6; // alto en grados del Perú entero; por encima de esto se vuelve a la vista completa // por encima de esto se vuelve a la vista de todo el Perú

/**
 * Mapa del Perú para elegir un punto:
 *  - rueda del ratón: acerca o aleja justo donde está el cursor; arrastrar: mover el mapa;
 *  - en el celular, tocar acerca paso a paso y, cuando ya está cerca, el siguiente toque elige el punto.
 */
function PickMap({ view, setView, onChoose, children }: { view: MapView | null; setView: (v: MapView | null) => void; onChoose: (lat: number, lon: number) => void; children: (v: MapView | null, onPick: (lat: number, lon: number) => void) => React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const live = useRef({ view, setView });
  const drag = useRef<{ x: number; y: number; v: MapView; moved: boolean } | null>(null);
  const [touch, setTouch] = useState(false);
  const [moved, setMoved] = useState(false);
  useEffect(() => {
    live.current = { view, setView };
  });

  // Rueda del ratón (listener no pasivo para poder evitar que la página se desplace)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const svg = el.querySelector("svg");
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      const { view: v, setView: set } = live.current;
      // punto (en grados) que está bajo el cursor
      const point = v
        ? { lat: v.lat - (fy - 0.5) * v.span, lon: v.lon + (fx - 0.5) * v.span * ASPECT }
        : { lat: -(PERU_VIEWBOX.y + fy * PERU_VIEWBOX.h) / 20, lon: (PERU_VIEWBOX.x + fx * PERU_VIEWBOX.w) / 20 };
      const span = (v?.span ?? WHOLE_SPAN) * (e.deltaY < 0 ? 0.8 : 1.25);
      if (span >= WHOLE_SPAN) return set(null);
      const s2 = Math.max(0.25, span);
      // el punto bajo el cursor se queda quieto
      set({ lat: point.lat + (fy - 0.5) * s2, lon: point.lon - (fx - 0.5) * s2 * ASPECT, span: s2 });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    setTouch(e.pointerType === "touch");
    if (e.pointerType === "touch" || !view) return;
    drag.current = { x: e.clientX, y: e.clientY, v: view, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    setMoved(true);
    const r = e.currentTarget.getBoundingClientRect();
    setView({ ...d.v, lon: d.v.lon - dx * ((d.v.span * ASPECT) / r.width), lat: d.v.lat + dy * (d.v.span / r.height) });
  };
  const endDrag = () => {
    window.setTimeout(() => {
      drag.current = null;
      setMoved(false);
    }, 0); // deja pasar el click del final del arrastre
  };

  const onPick = (lat: number, lon: number) => {
    if (moved) return;
    if (!deptAt(lat, lon)) return;
    const span = view?.span ?? WHOLE_SPAN;
    if (touch && span > 0.8) setView({ lat, lon, span: Math.max(0.6, span / 2.5) });
    else onChoose(lat, lon);
  };

  return (
    <div ref={box} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} className={`mx-auto max-w-xs select-none ${view ? "cursor-grab active:cursor-grabbing" : ""}`}>
      {children(view, onPick)}
    </div>
  );
}

/* ---------------------------------------------------------------- página */
export default function PreventionView() {
  const [lang] = useLang();
  const c = COPY[lang];
  const saved = useSavedPlaces();
  const [temp, setTemp] = useState<Loc | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [changing, setChanging] = useState(true);
  const [view, setView] = useState<MapView | null>(null);

  const fires = useApi<ApiFires>("/fires", { limit: 20000 });
  const events = useApi<ApiEvents>("/events", { limit: 1000 });

  const current: Loc | null = temp ?? saved.find((p) => p.id === selId) ?? saved[0] ?? null;
  const isSaved = !!current?.id && saved.some((p) => p.id === current.id);
  const near = useNearby(current, fires.data);
  const showPicker = !current || changing;

  const mapFires = useMemo(() => (fires.data?.features ?? []).map((f) => ({ lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] })), [fires.data]);
  const mapEvents = useMemo(() => (events.data?.events ?? []).map((e) => ({ lon: e.centro[0], lat: e.centro[1], n: e.detecciones.total, active: e.activo })), [events.data]);
  const pick = (l: Loc) => {
    setView(null);
    setTemp(l);
    setSelId(null);
    setChanging(false);
  };

  return (
    <div className="flex-1 text-snow">
      <div className="mx-auto w-full max-w-6xl px-4 pb-6 pt-24 sm:px-6 sm:pt-32">
        {showPicker ? (
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-14">
            <div>
              <h1 className="text-4xl leading-[1.05] tracking-tight sm:text-6xl">{c.h1}</h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-snow/75 sm:text-lg">{c.lead}</p>
              {saved.length > 0 && (
                <div className="mt-6 max-w-xl">
                  <p className="mb-2 text-sm font-semibold text-snow">{c.myPlaces}</p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {saved.map((p) => (
                      <PlaceRow key={p.id} p={p} active={false} fires={fires.data} c={c} onSelect={() => { setTemp(null); setSelId(p.id); setChanging(false); }} />
                    ))}
                  </ul>
                </div>
              )}
              {current && (
                <button type="button" onClick={() => setChanging(false)} className={`${BTN} mt-4`}>
                  ← {c.back}
                </button>
              )}
              <div className="mt-7 max-w-xl">
                <Picker c={c} lang={lang} onPick={pick} />
              </div>
            </div>
            <Card className="rounded-3xl p-4">
              <PickMap view={view} setView={setView} onChoose={(lat, lon) => pick({ name: c.nameDefault, lat: Number(fmtCoord(lat)), lon: Number(fmtCoord(lon)) })}>
                {(v, onPick) => <FireMap fires={mapFires} events={mapEvents} places={saved} view={v} aspect={ASPECT} onPick={onPick} aria={c.mapAria} />}
              </PickMap>
              <div className="mt-3 flex min-h-10 items-center justify-center">
                {view && (
                  <button type="button" onClick={() => setView(null)} className={BTN}>
                    {c.wholePeru}
                  </button>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] text-snow/55">{c.orTap}</p>
              <p className="mt-1 flex items-center justify-center gap-2 text-[11px] text-snow/55">
                <span className="size-1.5 rounded-full bg-amber" /> {c.legendFires}
              </p>
            </Card>
          </div>
        ) : (
          current && (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
              <div>
                {fires.error ? (
                  <Card className="rounded-3xl p-6 text-sm text-snow/75">
                    <p>{c.seasonError}</p>
                    <button type="button" onClick={fires.reload} className={`${BTN} mt-3`}>
                      {c.retry}
                    </button>
                  </Card>
                ) : !near ? (
                  <p className="animate-pulse py-16 text-center text-base text-snow/60">{c.loading}</p>
                ) : (
                  <Verdict
                    key={`${current.lat},${current.lon}`}
                    loc={current}
                    near={near}
                    c={c}
                    lang={lang}
                    cov={fires.data?.cobertura}
                    events={events.data}
                    saved={isSaved}
                    onSave={(name) => {
                      const id = addPlace({ name, lat: current.lat, lon: current.lon });
                      if (id) {
                        setTemp(null);
                        setSelId(id);
                      }
                    }}
                    onRemove={() => current.id && removePlace(current.id)}
                    onChange={() => setChanging(true)}
                  />
                )}
              </div>
              <Card className="rounded-3xl p-3 sm:p-4 lg:sticky lg:top-24">
                <FireMap fires={mapFires} events={mapEvents} places={saved} pending={isSaved ? null : current} focus={current} aria={c.mapAriaZoom} />
                <p className="mt-2 flex items-center justify-center gap-3 text-[11px] text-snow/55">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-amber" /> {c.legendFires}
                  </span>
                  <span>· 10 km · 25 km</span>
                </p>
              </Card>
            </div>
          )
        )}
      </div>

      {current && !showPicker && (
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-10 sm:px-6">
          <Season key={`${current.lat},${current.lon}`} loc={current} c={c} lang={lang} />

          <Card className="rounded-3xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-snow">{c.myPlaces}</h2>
            {saved.length ? (
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {saved.map((p) => (
                  <PlaceRow
                    key={p.id}
                    p={p}
                    active={current.id === p.id}
                    fires={fires.data}
                    c={c}
                    onSelect={() => {
                      setTemp(null);
                      setSelId(p.id);
                    }}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-snow/60">{c.myPlacesEmpty}</p>
            )}
            {saved.length >= MAX_PLACES && <p className="mt-2 text-xs text-snow/50">8 / 8</p>}
          </Card>
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 pb-16 sm:px-6">
        <Card className="flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 sm:p-6">
          <p className="max-w-md text-sm text-snow/80">{c.pro}</p>
          <Link href="/respuesta" className={BTN}>
            {c.proCta} →
          </Link>
        </Card>
        <p className="flex items-center gap-2 text-xs text-snow/65 sm:text-sm">
          <FlameIcon className="shrink-0 text-ember" />
          {c.emergency}
        </p>
      </div>

    </div>
  );
}
