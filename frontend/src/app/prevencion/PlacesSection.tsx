"use client";

import { useMemo, useState } from "react";
import Card from "@/components/Card";
import type {
  ApiAlert,
  ApiEvents,
  ApiFires,
  ApiPlaceRecurrence,
} from "@/lib/api";
import {
  bearing,
  compass,
  distanceKm,
  fmtCoord,
  inPeru,
  weekOfYear,
} from "@/lib/geo-utils";
import type { Lang } from "@/lib/lang";
import {
  addPlace,
  MAX_PLACES,
  removePlace,
  useSavedPlaces,
  type SavedPlace,
} from "@/lib/saved-places";
import { useApi } from "@/lib/use-api";
import FireMap from "./FireMap";
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

const BTN =
  "cursor-pointer rounded-full border border-snow/25 px-4 py-2 text-xs font-medium text-snow/85 transition-colors hover:border-snow/70 hover:text-snow disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY =
  "cursor-pointer rounded-full bg-snow px-5 py-2 text-xs font-semibold text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

/* ---------------- Estado de un lugar frente a las detecciones ---------------- */
type Hit = { km: number; dir: number; date: string; sensor: string };
function useNearby(
  place: { lat: number; lon: number },
  fires: ApiFires | undefined,
) {
  return useMemo(() => {
    if (!fires) return null;
    let nearest: Hit | null = null;
    let w10 = 0;
    let w25 = 0;
    for (const f of fires.features) {
      const [lon, lat] = f.geometry.coordinates;
      const km = distanceKm(place.lat, place.lon, lat, lon);
      if (km <= 25) w25++;
      if (km <= 10) w10++;
      if (!nearest || km < nearest.km)
        nearest = {
          km,
          dir: bearing(place.lat, place.lon, lat, lon),
          date: f.properties.acq_date,
          sensor: f.properties.sensor,
        };
    }
    return { nearest, w10, w25 };
  }, [place.lat, place.lon, fires]);
}

function WeekChart({
  rec,
  t,
  week,
}: {
  rec: ApiPlaceRecurrence;
  t: T;
  week: number;
}) {
  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-[11px] uppercase tracking-[0.12em] text-snow/55">
        {t.weeksChart}
      </figcaption>
      <svg
        viewBox="0 0 208 44"
        role="img"
        aria-label={t.weeksChart}
        className="block h-12 w-full"
      >
        {rec.semanas.map((w, i) => {
          const h = Math.max(1, w.frecuencia * 38);
          return (
            <rect
              key={w.semana}
              x={i * 4}
              y={42 - h}
              width={3}
              height={h}
              rx={1}
              fill="#F3F9FC"
              fillOpacity={w.semana === week ? 1 : 0.35}
            />
          );
        })}
        <line
          x1={(week - 1) * 4 + 1.5}
          x2={(week - 1) * 4 + 1.5}
          y1={0}
          y2={44}
          stroke="#F3F9FC"
          strokeOpacity={0.6}
          strokeDasharray="1.5 1.5"
        />
      </svg>
      <p className="mt-1 text-[11px] text-snow/50">↑ {t.thisWeek}</p>
    </figure>
  );
}

function PlaceCard({
  place,
  t,
  lang,
  fires,
  events,
  alert,
}: {
  place: SavedPlace;
  t: T;
  lang: Lang;
  fires: Api<ApiFires>;
  events: Api<ApiEvents>;
  alert: Api<ApiAlert>;
}) {
  const near = useNearby(place, fires.data);
  const rec = useApi<ApiPlaceRecurrence>("/recurrence/place", {
    lat: Number(fmtCoord(place.lat)),
    lon: Number(fmtCoord(place.lon)),
  });
  const [copied, setCopied] = useState(false);
  const week = weekOfYear();

  const level = !near
    ? null
    : near.nearest && near.nearest.km <= 10
      ? "alert"
      : near.nearest && near.nearest.km <= 25
        ? "watch"
        : "clear";
  const status =
    level === "alert"
      ? t.statusAlert
      : level === "watch"
        ? t.statusWatch
        : level === "clear"
          ? t.statusClear
          : t.loading;
  const pill =
    level === "alert"
      ? "bg-snow text-ink"
      : level === "watch"
        ? "bg-snow/80 text-ink"
        : "bg-snow/10 text-snow/75";

  // Evento activo más cercano (≤ 25 km)
  const activeEvent = useMemo(() => {
    let best: { km: number; n: number } | null = null;
    for (const e of events.data?.events ?? []) {
      if (!e.activo) continue;
      const km = distanceKm(place.lat, place.lon, e.centro[1], e.centro[0]);
      if (km <= 25 && (!best || km < best.km))
        best = { km, n: e.detecciones.total };
    }
    return best;
  }, [events.data, place.lat, place.lon]);

  const nearestTxt = near?.nearest
    ? `${t.nearest}: ${t.away(nf(near.nearest.km, t.loc, 1), compass(near.nearest.dir, lang))} ${t.on} ${dayLabel(near.nearest.date, t.loc)}`
    : `${t.nearest}: ${t.none}`;
  const wk = rec.data?.semanas[week - 1];
  const years = rec.data?.anios_base.length ?? 0;
  const seasonTxt = wk && years ? t.seasonFreq(wk.anios_con_fuego, years) : "";
  const dept = alert.data?.departamentos.find(
    (d) => d.region_id === rec.data?.region_id,
  );

  const message = () =>
    t.msg({
      name: place.name,
      status,
      nearest: nearestTxt,
      season: seasonTxt ? `${t.seasonHere}: ${seasonTxt}` : "",
      coords: `${fmtCoord(place.lat)}, ${fmtCoord(place.lon)}`,
      when: fires.data
        ? `${dayLabel(fires.data.cobertura.desde, t.loc)} – ${dayLabel(fires.data.cobertura.hasta, t.loc)}`
        : "",
      url: `${location.origin}/prevencion`,
    });
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <Card as="li" className="flex flex-col gap-4 rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight text-snow">
            {place.name}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-snow/50">
            {fmtCoord(place.lat)}, {fmtCoord(place.lon)}{" "}
            {rec.data ? `· ${rec.data.name}` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${pill}`}
        >
          {status}
        </span>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.12em] text-snow/50">
            {t.nearest}
          </dt>
          <dd className="mt-1 font-medium text-snow">
            {near?.nearest ? (
              <>
                {t.away(
                  nf(near.nearest.km, t.loc, 1),
                  compass(near.nearest.dir, lang),
                )}
                <span className="block text-xs font-normal text-snow/55">
                  {t.on} {dayLabel(near.nearest.date, t.loc)} ·{" "}
                  {near.w10 > 0
                    ? t.within(near.w10, 10)
                    : t.within(near.w25, 25)}
                </span>
              </>
            ) : near ? (
              t.none
            ) : (
              "…"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.12em] text-snow/50">
            {t.seasonHere}
          </dt>
          <dd className="mt-1 text-snow">
            {rec.error ? (
              <span className="text-snow/55">{t.seasonError}</span>
            ) : rec.data ? (
              seasonTxt
            ) : (
              <span className="text-snow/55">{t.seasonLoading}</span>
            )}
          </dd>
        </div>
      </dl>

      {activeEvent && (
        <p className="rounded-2xl border border-snow/25 bg-snow/[0.06] px-4 py-2.5 text-sm text-snow">
          {t.activeEvent(nf(activeEvent.km, t.loc, 1), activeEvent.n)}
        </p>
      )}

      <details className="rounded-2xl border border-snow/10 px-4 py-2.5">
        <summary className="cursor-pointer select-none text-xs font-medium text-snow/70">
          {t.moreDetails}
        </summary>
        <div className="mt-3 space-y-3">
          {dept && (
            <p className="text-xs text-snow/60">
              {t.deptNow}: <b className="text-snow/85">{dept.name}</b> ·{" "}
              {t.state[dept.estado]} ({nf(dept.hs, t.loc)} {t.hs}, {t.typical}{" "}
              {nf(dept.median, t.loc)})
            </p>
          )}
          {rec.data && <WeekChart rec={rec.data} t={t} week={week} />}
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-2 border-t border-snow/10 pt-4">
        <span className="mr-1 text-xs font-medium text-snow/70">
          {t.share}:
        </span>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(near ? message() : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className={BTN_PRIMARY}
        >
          {t.whatsapp}
        </a>
        {canShare && (
          <button
            type="button"
            className={BTN}
            onClick={() =>
              navigator
                .share({ title: place.name, text: message() })
                .catch(() => {})
            }
          >
            {t.shareNative}
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
          {copied ? t.copied : t.copy}
        </button>
        <button
          type="button"
          className={`${BTN} ml-auto`}
          onClick={() => removePlace(place.id)}
        >
          {t.remove}
        </button>
      </div>
    </Card>
  );
}

/* ---------------- Agregar un lugar ---------------- */
type Hitg = { name: string; lat: number; lon: number };

export default function PlacesSection({
  t,
  lang,
  fires,
  events,
  alert,
}: {
  t: T;
  lang: Lang;
  fires: Api<ApiFires>;
  events: Api<ApiEvents>;
  alert: Api<ApiAlert>;
}) {
  const places = useSavedPlaces();
  const [pending, setPending] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Hitg[] | null>(null);

  const choose = (lat: number, lon: number, label?: string) => {
    if (!inPeru(lat, lon)) {
      setMsg(t.outside);
      return;
    }
    setMsg("");
    setPending({ lat, lon });
    if (label) setName(label);
  };

  const locate = () => {
    if (!navigator.geolocation) return setMsg(t.locationDenied);
    setLocating(true);
    setMsg("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        choose(p.coords.latitude, p.coords.longitude, t.placeNameDefault);
      },
      () => {
        setLocating(false);
        setMsg(t.locationDenied);
      },
      { enableHighAccuracy: false, timeout: 15000 },
    );
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setMsg("");
    setResults(null);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=pe&accept-language=${lang}&q=${encodeURIComponent(q)}`,
      );
      const j = (await r.json()) as {
        display_name: string;
        lat: string;
        lon: string;
      }[];
      setResults(
        j.map((x) => ({
          name: x.display_name.split(",").slice(0, 2).join(",").trim(),
          lat: Number(x.lat),
          lon: Number(x.lon),
        })),
      );
    } catch {
      setMsg(t.error);
    } finally {
      setSearching(false);
    }
  };

  const save = () => {
    if (!pending) return;
    if (
      !addPlace({
        name: name.trim() || t.placeNameDefault,
        lat: Number(fmtCoord(pending.lat)),
        lon: Number(fmtCoord(pending.lon)),
      })
    )
      return setMsg(t.maxPlaces);
    setPending(null);
    setName("");
    setResults(null);
    setQuery("");
  };

  const mapFires = useMemo(
    () =>
      (fires.data?.features ?? []).map((f) => ({
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      })),
    [fires.data],
  );
  const mapEvents = useMemo(
    () =>
      (events.data?.events ?? []).map((e) => ({
        lon: e.centro[0],
        lat: e.centro[1],
        n: e.detecciones.total,
        active: e.activo,
      })),
    [events.data],
  );

  return (
    <section
      id="lugares"
      className="relative scroll-mt-20 px-4 pb-12 pt-2 sm:px-6"
    >
      <div className="mx-auto w-full max-w-6xl">
        <p className="max-w-3xl text-xs leading-relaxed text-snow/60 sm:text-sm">
          {t.s1d}
        </p>

        <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <Card className="order-2 rounded-3xl p-5 sm:p-7 lg:order-1">
            <h3 className="text-lg font-semibold">{t.addTitle}</h3>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={locate}
                disabled={locating}
                className={BTN_PRIMARY}
              >
                {locating ? t.locating : `📍 ${t.useLocation}`}
              </button>
            </div>

            <form onSubmit={search} className="mt-4 flex flex-wrap gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlace}
                aria-label={t.searchPlace}
                className="min-w-0 flex-1 rounded-full border border-snow/25 bg-ink/40 px-4 py-2 text-sm text-snow outline-none placeholder:text-snow/40 focus-visible:border-snow/70"
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className={BTN}
              >
                {searching ? t.searching : t.searchBtn}
              </button>
            </form>
            <p className="mt-1.5 text-[11px] text-snow/45">{t.searchNote}</p>

            {results && (
              <ul className="mt-3 space-y-1.5" aria-live="polite">
                {results.length ? (
                  results.map((r, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => choose(r.lat, r.lon, r.name)}
                        className="w-full cursor-pointer rounded-xl border border-snow/15 px-3 py-2 text-left text-sm text-snow/85 transition-colors hover:border-snow/50"
                      >
                        {r.name}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-snow/55">{t.noResults}</li>
                )}
              </ul>
            )}

            <p className="mt-4 text-xs text-snow/55">{t.tapMap}</p>

            {pending && (
              <div className="mt-5 rounded-2xl border border-snow/20 bg-snow/[0.04] p-4">
                <p className="text-xs tabular-nums text-snow/60">
                  {fmtCoord(pending.lat)}, {fmtCoord(pending.lon)}
                </p>
                <label
                  className="mt-3 block text-[11px] uppercase tracking-[0.12em] text-snow/55"
                  htmlFor="place-name"
                >
                  {t.placeName}
                </label>
                <input
                  id="place-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.placeNameDefault}
                  maxLength={40}
                  className="mt-1.5 w-full rounded-xl border border-snow/25 bg-ink/40 px-3 py-2 text-sm text-snow outline-none focus-visible:border-snow/70"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={save}
                    disabled={places.length >= MAX_PLACES}
                    className={BTN_PRIMARY}
                  >
                    {t.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPending(null)}
                    className={BTN}
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}
            {msg && (
              <p role="status" className="mt-3 text-sm text-snow/80">
                {msg}
              </p>
            )}
          </Card>

          <Card className="order-1 rounded-3xl p-4 sm:p-5 lg:order-2">
            <div className="mx-auto max-w-sm">
              {!fires.data && !fires.error ? (
                <p
                  className="animate-pulse py-24 text-center text-sm text-snow/60"
                  role="status"
                >
                  {t.loading}
                </p>
              ) : (
                <FireMap
                  fires={mapFires}
                  events={mapEvents}
                  places={places}
                  pending={pending}
                  onPick={(lat, lon) => choose(lat, lon)}
                  aria={t.mapAria}
                />
              )}
              <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-snow/60">
                <li className="inline-flex items-center gap-1.5">
                  <i className="inline-block size-1.5 rounded-full bg-snow/70" />
                  {t.legendFires}
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <i className="inline-block size-2.5 rounded-full border border-snow" />
                  {t.legendEvents}
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <i className="inline-block size-2.5 rounded-full border-2 border-snow bg-ink" />
                  {t.legendPlaces}
                </li>
              </ul>
            </div>
            {fires.error && (
              <div className="mt-3 text-center text-sm text-snow/65">
                <p>{t.error}</p>
                <button
                  type="button"
                  onClick={fires.reload}
                  className={`${BTN} mt-2`}
                >
                  {t.retry}
                </button>
              </div>
            )}
          </Card>
        </div>

        <div className="mt-6">
          {places.length ? (
            <ul className="grid gap-4 lg:grid-cols-2">
              {places.map((p) => (
                <PlaceCard
                  key={p.id}
                  place={p}
                  t={t}
                  lang={lang}
                  fires={fires}
                  events={events}
                  alert={alert}
                />
              ))}
            </ul>
          ) : (
            <p className="rounded-3xl border border-dashed border-snow/20 px-6 py-10 text-center text-sm text-snow/60">
              {t.empty}
            </p>
          )}
        </div>
        {places.length > 0 && (
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-snow/50">
            {t.caveat}
          </p>
        )}
      </div>
    </section>
  );
}
