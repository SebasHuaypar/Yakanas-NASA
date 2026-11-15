import RegionCard from "@/components/hero/RegionCard";
import Reveal from "@/components/Reveal";
import SectionDivider from "@/components/SectionDivider";
import { REGIONS } from "@/lib/fire-data";

/** Reparte los focos del país entre las regiones (porcentaje entero que suma ~100). */
function regionShares() {
  const totals = REGIONS.map((r) => r.data.reduce((s, v) => s + v, 0));
  const all = totals.reduce((s, v) => s + v, 0);
  return totals.map((t) => Math.round((t / all) * 100));
}

/** Sección normal de la landing: tres regiones, tres temporadas de fuego. */
export default function Regions() {
  const shares = regionShares();

  return (
    <section
      id="regiones"
      className="relative px-4 pb-24 pt-32 sm:px-6 sm:pb-32 sm:pt-44"
    >
      <div className="mx-auto w-full max-w-6xl">
        <SectionDivider
          index="02"
          label="Tres regiones"
          className="mb-14 sm:mb-20"
        />
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-[1.9rem] leading-tight tracking-tight sm:text-5xl">
            Costa, Andes y Amazonía arden en momentos distintos
          </h2>
          <p className="mt-4 text-sm text-snow/65 sm:text-base">
            Cada región tiene su propia temporada de fuego, y por eso las
            miramos por separado.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:mt-16 md:grid-cols-3 md:gap-6">
          {REGIONS.map((region, i) => (
            <Reveal key={region.id} delay={i * 140} className="h-full">
              <RegionCard region={region} share={shares[i]} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
