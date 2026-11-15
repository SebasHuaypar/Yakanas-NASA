import Link from "next/link";

/** Logo oficial de Yakana: el logotipo (letras) en pantallas anchas y solo el isotipo (la llama en la A) en las angostas. */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/historia"
      aria-label="Yakana's Team - inicio"
      className={`flex shrink-0 items-center ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/yakana-isotipo.svg"
        alt=""
        width={826}
        height={588}
        className="h-8 w-auto min-[520px]:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/yakana-logotipo.svg"
        alt=""
        width={1279}
        height={167}
        className="hidden h-6 w-auto min-[520px]:block sm:h-7"
      />
    </Link>
  );
}
