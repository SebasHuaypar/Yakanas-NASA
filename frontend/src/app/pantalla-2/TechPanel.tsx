"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import Formula, { type TermKey } from "./Formula";
import { hud } from "./fonts";
import { REGION_FITS } from "./regions";
import Select from "@/components/Select";

const SECTIONS = [
  {
    id: "modelo",
    n: "01",
    label: "Probar el modelo",
    hint: "Mueve los controles y mira qué estima",
  },
  {
    id: "validacion",
    n: "02",
    label: "Validación",
    hint: "Cómo le fue con años que no vio",
  },
  {
    id: "supuestos",
    n: "03",
    label: "Supuestos y límites",
    hint: "Qué asumimos y qué no prometemos",
  },
  {
    id: "parametros",
    n: "04",
    label: "Parámetros por región",
    hint: "Los valores de cada unidad",
  },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const ZONES = [
  { id: "todas", label: "Todas" },
  { id: "costa", label: "Costa" },
  { id: "sierra", label: "Sierra" },
  { id: "selva", label: "Selva" },
] as const;

const nf = new Intl.NumberFormat("es");
const box = "glass rounded-3xl p-5";
const boxF = (on: boolean) =>
  `glass rounded-3xl p-5 transition-colors ${on ? "border-navy/70! bg-navy/10!" : ""}`;

/* ------------------------------------------------------------------ */
/* 01 · PROBAR EL MODELO                                              */
/* ------------------------------------------------------------------ */
function Calculator() {
  const idSel = useId();
  const idNum = useId();
  const [name, setName] = useState("Ucayali");
  const [modis, setModis] = useState(300);
  const [high, setHigh] = useState(true);
  const [focus, setFocus] = useState<TermKey | null>(null);

  const fit = REGION_FITS.find((r) => r.name === name) ?? REGION_FITS[0];
  const u = Math.log(modis + 1);
  const bu = fit.b * u;
  const d = high ? fit.d : 0;
  const w = fit.a + d + bu;
  const est = Math.max(0, Math.exp(w) - 1);
  const ratio = modis > 0 ? est / modis : 0;

  const steps: [string, string, string, TermKey][] = [
    [
      "1",
      "Pasamos MODIS a escala logarítmica",
      `ln(${nf.format(modis)} + 1) = ${u.toFixed(2)}`,
      "modis",
    ],
    [
      "2",
      "Lo multiplicamos por la pendiente b",
      `${fit.b.toFixed(2)} × ${u.toFixed(2)} = ${bu.toFixed(2)}`,
      "b",
    ],
    [
      "3",
      `Sumamos el nivel base a${high ? " y el ajuste de temporada alta d" : ""}`,
      `${bu.toFixed(2)} + ${fit.a.toFixed(2)}${high ? ` + ${fit.d.toFixed(2)}` : ""} = ${w.toFixed(2)}`,
      "a",
    ],
    [
      "4",
      "Deshacemos el logaritmo",
      `e^${w.toFixed(2)} − 1 ≈ ${nf.format(Math.round(est))}`,
      "viirs",
    ],
  ];

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-slate">
        Elige una región y cuántos focos contó MODIS en un mes. El modelo
        calcula cuántos habría contado VIIRS: la misma cuenta que hacemos para
        traducir los años anteriores a 2012.
      </p>

      <Formula
        a={fit.a}
        b={fit.b}
        d={fit.d}
        modis={modis}
        high={high}
        focus={focus}
        onFocus={setFocus}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Entradas */}
        <div className={`${box} space-y-6`}>
          <p className={`text-[11px] text-slate ${hud}`}>Tú eliges</p>

          <div>
            <label htmlFor={idSel} className="text-sm font-medium text-ink">
              Región
            </label>
            <div className="mt-2">
              <Select
                id={idSel}
                value={name}
                onChange={setName}
                options={REGION_FITS.map((r) => ({
                  value: r.name,
                  label: r.name,
                }))}
              />
            </div>
            <p className="mt-2 text-xs text-slate">
              {fit.own
                ? "Esta región tiene su propio ajuste."
                : "Esta región usa el ajuste nacional (pocos meses con fuego)."}
            </p>
          </div>

          <div>
            <div className="flex items-end justify-between gap-4">
              <label htmlFor={idNum} className="text-sm font-medium text-ink">
                Focos contados por MODIS en el mes
              </label>
              <input
                id={idNum}
                type="number"
                min={0}
                max={5000}
                value={modis}
                onChange={(e) =>
                  setModis(
                    Math.max(0, Math.min(5000, Number(e.target.value) || 0)),
                  )
                }
                className="w-24 rounded-xl border border-slate/40 bg-black/40 px-3 py-2 text-right font-heading text-lg font-bold text-navy outline-none focus-visible:ring-2 focus-visible:ring-navy"
              />
            </div>
            <input
              type="range"
              min={0}
              max={2000}
              step={10}
              value={Math.min(modis, 2000)}
              onChange={(e) => setModis(Number(e.target.value))}
              aria-label="Focos contados por MODIS"
              className="mt-4 h-7 w-full accent-(--accent)"
            />
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={high}
            onClick={() => setHigh((v) => !v)}
            className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate/30 px-4 py-3 text-left transition-colors hover:border-slate/60"
          >
            <span>
              <span className="block text-sm font-medium text-ink">
                Mes de temporada alta
              </span>
              <span className="block text-xs text-slate">
                Los meses con más fuego de esa región
              </span>
            </span>
            <span
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${high ? "bg-navy" : "bg-slate/40"}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-[#0C090A] transition-all ${high ? "left-6" : "left-1"}`}
              />
            </span>
          </button>
        </div>

        {/* Resultado */}
        <div className="glass flex flex-col rounded-3xl p-6" aria-live="polite">
          <p className={`text-[11px] text-slate ${hud}`}>El modelo estima</p>
          <p className="mt-2 font-heading text-6xl font-bold leading-none text-navy sm:text-7xl">
            ≈ {nf.format(Math.round(est))}
          </p>
          <p className="mt-3 text-slate">
            focos en escala VIIRS para ese mes en{" "}
            <b className="text-ink">{fit.name}</b>
            {modis > 0 && (
              <>
                {" "}
                — unas{" "}
                <b className="text-ink">
                  {ratio.toLocaleString("es", { maximumFractionDigits: 1 })}{" "}
                  veces
                </b>{" "}
                lo que contó MODIS.
              </>
            )}
          </p>

          <div className="mt-6 grid gap-2 text-xs text-slate sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div>
              <div className="mb-1 flex justify-between">
                <span>MODIS</span>
                <span className="text-ink">{nf.format(modis)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-(--mist)">
                <div
                  className="h-full rounded-full bg-slate"
                  style={{
                    width: `${Math.min(100, (modis / Math.max(est, modis, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <span aria-hidden className="hidden text-lg text-navy sm:block">
              →
            </span>
            <div>
              <div className="mb-1 flex justify-between">
                <span>VIIRS (estimado)</span>
                <span className="text-ink">{nf.format(Math.round(est))}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-(--mist)">
                <div
                  className="h-full rounded-full bg-navy"
                  style={{
                    width: `${Math.min(100, (est / Math.max(est, modis, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <p className="mt-auto pt-6 text-xs text-slate">
            Cálculo orientativo con los parámetros del prototipo; sin la
            corrección final por la transformación logarítmica, que sí aplica el
            algoritmo completo.
          </p>
        </div>
      </div>

      {/* Paso a paso */}
      <div>
        <p className={`text-[11px] text-slate ${hud}`}>
          Así llegó a ese número
        </p>
        <ol className="mt-3 grid gap-3 md:grid-cols-4">
          {steps.map(([n, t, calc, k]) => (
            <li
              key={n}
              className={boxF(focus === k || (k === "a" && focus === "d"))}
              onMouseEnter={() => setFocus(k)}
              onMouseLeave={() => setFocus(null)}
            >
              <span className="font-heading text-3xl font-semibold leading-none text-navy/40">
                {n}
              </span>
              <p className="mt-3 text-sm text-ink">{t}</p>
              <p className="mt-2 break-words font-mono text-xs text-navy">
                {calc}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Qué significa cada valor */}
      <div>
        <p className={`text-[11px] text-slate ${hud}`}>
          Qué significa cada valor de {fit.name}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div
            className={boxF(focus === "a")}
            onMouseEnter={() => setFocus("a")}
            onMouseLeave={() => setFocus(null)}
          >
            <p className="font-heading text-3xl font-bold text-navy">
              <span className="font-mono text-base text-slate">a = </span>
              {fit.a.toFixed(2)}
            </p>
            <p className="mt-2 text-sm font-medium text-ink">Nivel base</p>
            <p className="mt-1 text-xs text-slate">
              Cuánto más ve VIIRS que MODIS aunque haya pocos focos: el efecto
              de su resolución más fina.
            </p>
          </div>
          <div
            className={boxF(focus === "b")}
            onMouseEnter={() => setFocus("b")}
            onMouseLeave={() => setFocus(null)}
          >
            <p className="font-heading text-3xl font-bold text-navy">
              <span className="font-mono text-base text-slate">b = </span>
              {fit.b.toFixed(2)}
            </p>
            <p className="mt-2 text-sm font-medium text-ink">Pendiente</p>
            <p className="mt-1 text-xs text-slate">
              Si MODIS cuenta 10 % más, VIIRS sube ≈{" "}
              {(fit.b * 10).toFixed(1).replace(".", ",")} %. Cerca de 1 es una
              relación casi proporcional.
            </p>
          </div>
          <div
            className={boxF(focus === "d")}
            onMouseEnter={() => setFocus("d")}
            onMouseLeave={() => setFocus(null)}
          >
            <p className="font-heading text-3xl font-bold text-navy">
              <span className="font-mono text-base text-slate">d = </span>
              {fit.d.toFixed(2)}
            </p>
            <p className="mt-2 text-sm font-medium text-ink">Temporada alta</p>
            <p className="mt-1 text-xs text-slate">
              Corrección extra en los meses de más fuego
              {fit.high.length ? `: ${fit.high.join(", ")}` : ""}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 02 · VALIDACIÓN                                                    */
/* ------------------------------------------------------------------ */
function Validation() {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-slate">
        Para saber si la traducción es confiable, escondimos algunos años.
        Entrenamos con unos, probamos con otros que el modelo nunca vio y
        comparamos lo que predijo con lo que VIIRS contó de verdad.
      </p>

      <div className={box}>
        <p className={`text-[11px] text-slate ${hud}`}>
          Cómo repartimos los años
        </p>
        <div className="mt-4 flex h-12 overflow-hidden rounded-xl text-sm font-medium">
          <div
            className="flex items-center justify-center bg-navy/25 text-navy"
            style={{ flex: 8 }}
          >
            Entrenar · 2012–2019
          </div>
          <div
            className="flex items-center justify-center bg-navy text-[#0C090A]"
            style={{ flex: 3 }}
          >
            Probar · 2020–2022
          </div>
        </div>
        <p className="mt-3 text-xs text-slate">
          El modelo solo vio los años de la izquierda. La nota final sale de los
          de la derecha.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {/* R2 */}
        <div className={box}>
          <p className="font-heading text-5xl font-bold text-navy">0,98</p>
          <p className="mt-2 font-medium text-ink">Qué tanto lo explica</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-(--mist)">
            <div
              className="h-full rounded-full bg-navy"
              style={{ width: "98%" }}
            />
          </div>
          <p className="mt-1 flex justify-between text-[11px] text-slate">
            <span>0</span>
            <span>1 = perfecto</span>
          </p>
          <p className="mt-3 text-sm text-slate">
            R² del total mensual del Perú: casi toda la variación de un mes a
            otro queda explicada.
          </p>
        </div>

        {/* error */}
        <div className={box}>
          <p className="font-heading text-5xl font-bold text-navy">±11 %</p>
          <p className="mt-2 font-medium text-ink">Cuánto se equivoca</p>
          <div className="relative mt-5 h-3 rounded-full bg-(--mist)">
            <div
              className="absolute inset-y-0 rounded-full bg-navy/40"
              style={{ left: "39%", width: "22%" }}
            />
            <div
              className="absolute -top-1.5 h-6 w-0.5 bg-navy"
              style={{ left: "50%" }}
            />
          </div>
          <p className="mt-2 flex justify-between text-[11px] text-slate">
            <span>89</span>
            <span className="text-navy">100 real</span>
            <span>111</span>
          </p>
          <p className="mt-3 text-sm text-slate">
            Si un mes real fue 100, la estimación suele caer entre 89 y 111.
          </p>
        </div>

        {/* cobertura */}
        <div className={box}>
          <p className="font-heading text-5xl font-bold text-navy">78 %</p>
          <p className="mt-2 font-medium text-ink">
            Meses dentro del rango (78 de 100)
          </p>
          <div
            role="img"
            aria-label="78 de 100 meses cayeron dentro del rango anunciado"
            className="mt-4 grid grid-cols-20 gap-1"
          >
            {Array.from({ length: 100 }, (_, i) => (
              <span
                key={i}
                className={`aspect-square rounded-full ${i < 78 ? "bg-navy" : "bg-slate/30"}`}
              />
            ))}
          </div>
          <p className="mt-3 text-sm text-slate">
            Casi ocho de cada diez meses reales cayeron dentro del rango que
            anunciamos.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 03 · SUPUESTOS Y LÍMITES                                           */
/* ------------------------------------------------------------------ */
const Check = () => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="9.5" />
    <path d="m7.8 12.3 2.8 2.8 5.6-5.8" />
  </svg>
);
const Warn = () => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 3.5 2.8 19.5h18.4L12 3.5z" />
    <path d="M12 10v4.2M12 17h.01" />
  </svg>
);

function Assumptions() {
  const cols: {
    title: string;
    sub: string;
    icon: ReactNode;
    items: [string, string][];
  }[] = [
    {
      title: "Qué asumimos",
      sub: "Lo que damos por cierto para que el método funcione",
      icon: <Check />,
      items: [
        [
          "Fuente",
          "NASA FIRMS: MODIS colección 6.1 y VIIRS de 375 m, producto estándar.",
        ],
        [
          "Tipo de fuego",
          "Solo fuegos de vegetación, con confianza nominal y alta.",
        ],
        [
          "Un VIIRS por día",
          "Suomi-NPP hasta 2018 y NOAA-20 desde abril de 2018.",
        ],
        [
          "Relación estable",
          "Lo aprendido en 2012–2022 también vale antes de 2012.",
        ],
      ],
    },
    {
      title: "Qué no prometemos",
      sub: "Los límites que conviene tener presentes",
      icon: <Warn />,
      items: [
        [
          "Antes de 2012 es estimado",
          "No son observaciones: por eso cada año lleva un rango.",
        ],
        [
          "Fuegos muy chicos",
          "Los que MODIS nunca vio solo se pueden estimar en promedio.",
        ],
        [
          "Regiones con poco fuego",
          "Usan el ajuste nacional y tienen más incertidumbre.",
        ],
        [
          "Focos no son superficie",
          "Contar focos no mide hectáreas quemadas ni intensidad.",
        ],
      ],
    },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {cols.map((c) => (
        <div key={c.title} className={box}>
          <div className="flex items-center gap-3 text-navy">
            {c.icon}
            <h3 className="text-xl">{c.title}</h3>
          </div>
          <p className="mt-1 text-sm text-slate">{c.sub}</p>
          <ul className="mt-5 space-y-3">
            {c.items.map(([t, d], i) => (
              <li
                key={t}
                className="flex gap-4 rounded-xl border border-slate/20 bg-black/25 px-4 py-3"
              >
                <span className="font-heading text-xl font-semibold text-navy/40">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-medium text-ink">{t}</span>
                  <span className="block text-sm text-slate">{d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 04 · PARÁMETROS POR REGIÓN                                         */
/* ------------------------------------------------------------------ */
function Params() {
  const [zone, setZone] = useState<(typeof ZONES)[number]["id"]>("todas");
  const rows = REGION_FITS.filter((r) => zone === "todas" || r.zone === zone);
  const bmin = 0.4;
  const bmax = 1.3;

  function downloadCsv() {
    const head = "region,zona,ajuste,a,d,b,meses,temporada_alta\n";
    const body = REGION_FITS.map(
      (r) =>
        `${r.name},${r.zone},${r.own ? "propio" : "nacional"},${r.a},${r.d},${r.b},${r.months},${r.high.join(" ")}`,
    ).join("\n");
    const url = URL.createObjectURL(
      new Blob([head + body], { type: "text/csv" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "parametros_por_region.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-slate">
        Cada unidad tiene sus tres valores. La barra muestra la pendiente{" "}
        <b className="text-ink">b</b>: cuanto más larga, más acompaña VIIRS a
        MODIS.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filtrar por zona"
          className="flex flex-wrap gap-2"
        >
          {ZONES.map((z) => (
            <button
              key={z.id}
              type="button"
              aria-pressed={zone === z.id}
              onClick={() => setZone(z.id)}
              className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
                zone === z.id
                  ? "border-navy bg-navy text-[#0C090A]"
                  : "border-slate/40 text-navy hover:border-navy"
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-full border border-navy/60 px-5 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy hover:text-[#0C090A]"
        >
          Descargar CSV
        </button>
      </div>

      <div className="max-h-[28rem] overflow-auto rounded-2xl border border-slate/20 [color-scheme:dark] [scrollbar-color:rgb(76_102_121)_transparent] [scrollbar-width:thin]">
        <table className="w-full min-w-170 border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-[#0C090A] text-slate">
            <tr>
              {[
                "Región",
                "Ajuste",
                "a",
                "d",
                "b · pendiente",
                "Meses",
                "Temporada alta",
              ].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-slate/15">
                <th
                  scope="row"
                  className="whitespace-nowrap px-4 py-3 font-medium text-ink"
                >
                  {r.name}
                  <span className="ml-2 text-xs font-normal capitalize text-slate">
                    {r.zone}
                  </span>
                </th>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.own ? "bg-navy/15 text-navy" : "bg-slate/20 text-slate"}`}
                  >
                    {r.own ? "propio" : "nacional"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-ink">
                  {r.a.toFixed(2)}
                </td>
                <td className="px-4 py-3 font-mono text-ink">
                  {r.d.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <span className="h-2 w-24 overflow-hidden rounded-full bg-slate/25">
                      <span
                        className="block h-full rounded-full bg-navy"
                        style={{
                          width: `${Math.max(4, Math.min(100, ((r.b - bmin) / (bmax - bmin)) * 100))}%`,
                        }}
                      />
                    </span>
                    <span className="font-mono text-ink">{r.b.toFixed(2)}</span>
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-slate">{r.months}</td>
                <td className="px-4 py-3 text-slate">
                  {r.high.join(" ") || "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate">
        {rows.length} unidades. “Nacional” significa que no tiene suficientes
        meses con fuego para un ajuste propio.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export default function TechPanel() {
  const [sel, setSel] = useState<SectionId>("modelo");

  function onKey(e: React.KeyboardEvent, i: number) {
    const d =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? -1
          : 0;
    if (!d) return;
    e.preventDefault();
    const next = SECTIONS[(i + d + SECTIONS.length) % SECTIONS.length].id;
    setSel(next);
    document.getElementById(`tech-${next}`)?.focus();
  }

  const body: Record<SectionId, ReactNode> = {
    modelo: <Calculator />,
    validacion: <Validation />,
    supuestos: <Assumptions />,
    parametros: <Params />,
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
      <div
        role="tablist"
        aria-label="Detalle técnico"
        aria-orientation="vertical"
        className="grid gap-3 self-start sm:grid-cols-2 lg:grid-cols-1"
      >
        {SECTIONS.map((s, i) => {
          const on = sel === s.id;
          return (
            <button
              key={s.id}
              id={`tech-${s.id}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="tech-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setSel(s.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`glass flex items-start gap-4 rounded-3xl px-5 py-4 text-left transition-colors duration-300 ${
                on ? "border-navy/70! bg-navy/10!" : "hover:border-navy/40!"
              }`}
            >
              <span
                className={`font-heading text-3xl font-semibold leading-none ${on ? "text-navy" : "text-navy/35"}`}
              >
                {s.n}
              </span>
              <span>
                <span
                  className={`block font-semibold ${on ? "text-navy" : "text-navy/80"}`}
                >
                  {s.label}
                </span>
                <span className="mt-0.5 block text-xs text-slate">
                  {s.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="tech-panel"
        role="tabpanel"
        aria-labelledby={`tech-${sel}`}
        className="glass min-w-0 rounded-3xl p-6 sm:p-10"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={sel}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {body[sel]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
