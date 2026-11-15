import Link from "next/link";

/** Logo = el nombre del equipo en Irish Grover. */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/historia"
      aria-label="Yakana's Team - inicio"
      className={`shrink-0 whitespace-nowrap font-logo text-base leading-none text-snow sm:text-xl ${className}`}
    >
      Yakana&apos;s<span className="hidden min-[400px]:inline"> Team</span>
    </Link>
  );
}
