import Link from "next/link";

/** Logo = el nombre del equipo en Irish Grover. */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/pantalla-1"
      aria-label="Yakana's Team - inicio"
      className={`font-logo text-2xl leading-none text-navy sm:text-3xl ${className}`}
    >
      Yakana&apos;s Team
    </Link>
  );
}
