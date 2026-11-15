"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Card from "@/components/Card";
import type { ApiEvents, ApiFires, ApiForecast, ApiPlaceRecurrence } from "@/lib/api";
import { bearing, compass, distanceKm, fmtCoord, inPeru, weekOfYear } from "@/lib/geo-utils";
import { useLang, type Lang } from "@/lib/lang";
import { addPlace, MAX_PLACES, removePlace, useSavedPlaces, type SavedPlace } from "@/lib/saved-places";
import { useApi } from "@/lib/use-api";
import { COPY, type Copy } from "./copy";
import FireMap from "./FireMap";
import { FlameIcon, PinIcon } from "./Icons";
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
    if (!inPeru(lat, lon)) return setMsg(c.outside);
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
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=pe&accept-language=${lang}&q=${encodeURIComponent(text)}`);
      const j = (await r.json()) as { display_name: string; lat: string; lon: string }[];
      setResults(j.map((x) => ({ name: x.display_name.split(",").slice(0, 2).join(",").trim(), lat: Number(x.lat), lon: Number(x.lon) })));
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
      <p className="text-sm text-snow/60">{c.orTap}</p>
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
const TILE: Record<string, string> = { high: "bg-ember text-ink border-ember", mid: "bg-amber/85 text-ink border-amber", low: "bg-snow/[0.07] text-snow/75 border-snow/15" };

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

function Season({ loc, c, lang }: { loc: Loc; c: Copy; lang: Lang }) {
  const rec = useApi<ApiPlaceRecurrence>("/recurrence/place", { lat: Number(fmtCoord(loc.lat)), lon: Number(fmtCoord(loc.lon)) });
  const now = new Date();
  const dept = rec.data?.region_id ?? "PE";
  const cur = useApi<ApiForecast>("/forecast", { region_id: dept, year: now.getFullYear() });
  const next = useApi<ApiForecast>("/forecast", { region_id: dept });

  const week = weekOfYear(now);
  const semanas = rec.data?.semanas;
  const weeks = semanas ? Array.from({ length: 8 }, (_, i) => semanas[(week - 1 + i) % semanas.length]) : [];
  const highCount = weeks.filter((w) => level(w.frecuencia) === "high").length;

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

          <p className="mt-6 text-sm font-semibold text-snow">{c.next8}</p>
          <p className="text-xs text-snow/55">{c.next8Help}</p>
          <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {weeks.map((w) => {
              const lv = level(w.frecuencia);
              const [m, d] = w.inicia.split("-").map(Number);
              return (
                <li key={w.semana} className={`rounded-2xl border px-2 py-3 text-center ${TILE[lv]}`}>
                  <p className="text-[10px] uppercase tracking-wide opacity-80">{c.weekOf}</p>
                  <p className="text-sm font-semibold">{new Date(Date.UTC(2026, m - 1, d)).toLocaleDateString(c.loc, { day: "numeric", month: "short", timeZone: "UTC" })}</p>
                  <p className="mt-1 text-[11px] font-bold">{lv === "high" ? c.high : lv === "mid" ? c.mid : c.low}</p>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-base font-medium text-snow">{c.highCount(highCount)}</p>
          <p className="mt-3 rounded-2xl border border-amber/40 bg-amber/[0.07] px-4 py-3 text-sm text-snow/85">{c.seasonTip}</p>

          {peak && (
            <div className="mt-6 border-t border-snow/10 pt-5">
              <p className="text-sm font-semibold text-snow">{c.forecastTitle}</p>
              <p className="mt-1 text-sm text-snow/80">{c.forecastSentence(MONTHS[lang][peak.month - 1].toLowerCase(), rec.data.name)}</p>
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

/* ---------------------------------------------------------------- página */
export default function PreventionView() {
  const [lang] = useLang();
  const c = COPY[lang];
  const saved = useSavedPlaces();
  const [temp, setTemp] = useState<Loc | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  const fires = useApi<ApiFires>("/fires", { limit: 20000 });
  const events = useApi<ApiEvents>("/events", { limit: 1000 });

  const current: Loc | null = temp ?? saved.find((p) => p.id === selId) ?? saved[0] ?? null;
  const isSaved = !!current?.id && saved.some((p) => p.id === current.id);
  const near = useNearby(current, fires.data);
  const showPicker = !current || changing;

  const mapFires = useMemo(() => (fires.data?.features ?? []).map((f) => ({ lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] })), [fires.data]);
  const mapEvents = useMemo(() => (events.data?.events ?? []).map((e) => ({ lon: e.centro[0], lat: e.centro[1], n: e.detecciones.total, active: e.activo })), [events.data]);
  const pick = (l: Loc) => {
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
              <div className="mt-7 max-w-xl">
                <Picker c={c} lang={lang} onPick={pick} />
              </div>
            </div>
            <Card className="rounded-3xl p-4">
              <div className="mx-auto max-w-xs">
                <FireMap fires={mapFires} events={mapEvents} places={saved} onPick={(lat, lon) => (inPeru(lat, lon) ? pick({ name: c.nameDefault, lat: Number(fmtCoord(lat)), lon: Number(fmtCoord(lon)) }) : undefined)} aria={c.mapAria} />
              </div>
              <p className="mt-2 flex items-center justify-center gap-2 text-[11px] text-snow/55">
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
