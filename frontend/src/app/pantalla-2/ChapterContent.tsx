import DataNote from "./DataNote";
import { FIRST_VIIRS_YEAR, SERIES } from "./data";
import { hud } from "./fonts";
import OverlapTimeline from "./OverlapTimeline";
import PairsScatter from "./PairsScatter";
import PeruFitMap from "./PeruFitMap";
import { PAIR_TOTAL } from "./pairs";
import RangeBar from "./RangeBar";
import RangeYears from "./RangeYears";
import { REGION_FITS } from "./regions";
import Card from "@/components/Card";

const tile = "glass rounded-3xl p-5";
const i11 = SERIES.years.indexOf(FIRST_VIIRS_YEAR - 1);

function Stat({ v, t, d }: { v: string; t: string; d?: string }) {
  return (
    <div className={tile}>
      <p className="font-heading text-3xl font-bold text-navy">{v}</p>
      <p className="mt-1 text-sm font-medium text-ink">{t}</p>
      {d && <p className="mt-0.5 text-xs text-slate">{d}</p>}
    </div>
  );
}

/** 01 · DATOS: qué entra al método y cómo se prepara. */
export function DatosContent() {
  const steps = [
    [
      "Descargar",
      "Los focos de calor que publica NASA FIRMS: MODIS (colección 6.1) y VIIRS de 375 m.",
    ],
    [
      "Filtrar",
      "Nos quedamos con los fuegos de vegetación y con confianza nominal o alta.",
    ],
    [
      "Contar",
      "Se cuenta cuántos focos hubo cada mes en cada una de las 26 unidades territoriales.",
    ],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat v="2" t="satélites" d="MODIS y VIIRS" />
        <Stat v="23" t="años" d="2003 – 2025" />
        <Stat v="26" t="unidades" d="del territorio" />
        <Stat v="276" t="meses" d="de registro" />
      </div>
      <ol className="space-y-3">
        {steps.map(([t, d], i) => (
          <li
            key={t}
            className="flex items-center gap-5 glass rounded-3xl px-5 py-4"
          >
            <span className="font-heading text-4xl font-semibold leading-none text-navy/40">
              {i + 1}
            </span>
            <span>
              <span className="block font-semibold text-navy">{t}</span>
              <span className="block text-sm text-slate">{d}</span>
            </span>
          </li>
        ))}
      </ol>
      <DataNote>
        Descripción del prototipo; la fuente y los filtros finales los confirma
        el equipo de datos.
      </DataNote>
    </div>
  );
}

/** 02 · SOLAPE: dónde coinciden y qué se aprende. */
export function SolapeContent() {
  return (
    <div className="space-y-5">
      <Card className="rounded-3xl p-5">
        <OverlapTimeline />
      </Card>
      <div className="grid gap-5 md:grid-cols-[1.35fr_1fr]">
        <Card className="rounded-3xl p-5">
          <PairsScatter />
        </Card>
        <div className="grid content-start gap-3">
          <Stat v="11" t="años de solape" d="2012 – 2022" />
          <Stat
            v={String(PAIR_TOTAL).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
            t="pares mes-región"
            d="para aprender la regla"
          />
        </div>
      </div>
      <DataNote>
        Datos del prototipo (muestra de los pares); se reemplazan por los del
        algoritmo final.
      </DataNote>
    </div>
  );
}

/** 03 · MODELO: la regla, un ejemplo y el mapa de ajustes. */
export function ModeloContent() {
  const uc = REGION_FITS.find((r) => r.name === "Ucayali");
  const modis = 300;
  const est = uc
    ? Math.round(Math.exp(uc.a + uc.d + uc.b * Math.log(modis + 1)) - 1)
    : null;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-3xl p-5">
          <p className={`text-[11px] text-slate ${hud}`}>La regla</p>
          <code className="mt-2 block break-words font-mono text-[13px] leading-relaxed text-ink">
            log(VIIRS+1) = a + d·alta + b·log(MODIS+1)
          </code>
          <p className="mt-3 text-xs text-slate">
            En palabras: del conteo de MODIS se calcula cuánto habría contado
            VIIRS. Cada región tiene sus propios <b className="text-ink">a</b>,{" "}
            <b className="text-ink">d</b> y <b className="text-ink">b</b>.
          </p>
        </Card>
        <Card className="rounded-3xl p-5">
          <p className={`text-[11px] text-slate ${hud}`}>Un ejemplo</p>
          {est !== null ? (
            <p className="mt-2 text-sm text-slate">
              Un mes de temporada alta en <b className="text-ink">Ucayali</b>:
              MODIS cuenta <b className="text-ink">{modis}</b> focos. El modelo
              estima{" "}
              <b className="font-heading text-2xl text-navy">
                ≈ {est.toLocaleString("es")}
              </b>{" "}
              en escala VIIRS.
            </p>
          ) : null}
          <p className="mt-2 text-xs text-slate">
            Cálculo orientativo con los parámetros del prototipo.
          </p>
        </Card>
      </div>
      <PeruFitMap compact />
      <DataNote>
        Límites y parámetros del prototipo (26 unidades: departamentos, Callao y
        Lima Metropolitana).
      </DataNote>
    </div>
  );
}

/** 04 · RANGO: cuánto dudamos y cómo leerlo. */
export function RangoContent() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-3xl p-5 pt-4">
          <RangeBar
            year={FIRST_VIIRS_YEAR - 1}
            low={SERIES.low[i11]}
            mid={SERIES.harmonized[i11]}
            high={SERIES.high[i11]}
          />
        </Card>
        <Card className="rounded-3xl p-5">
          <RangeYears
            years={SERIES.years.slice(0, i11 + 1)}
            mid={SERIES.harmonized.slice(0, i11 + 1)}
            low={SERIES.low.slice(0, i11 + 1)}
            high={SERIES.high.slice(0, i11 + 1)}
          />
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["La marca", "Es la mejor estimación del conteo de ese año."],
          ["La franja", "Es donde probablemente estuvo el valor real."],
          [
            "Desde 2012",
            "No hay franja: esos años los mide VIIRS directamente.",
          ],
        ].map(([t, d]) => (
          <div key={t} className={tile}>
            <p className="font-semibold text-navy">{t}</p>
            <p className="mt-1 text-sm text-slate">{d}</p>
          </div>
        ))}
      </div>
      <DataNote>
        Valores del prototipo (p10–p90 de los residuos); el intervalo final lo
        define el algoritmo.
      </DataNote>
    </div>
  );
}
