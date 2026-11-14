"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const links = [
  { href: "/pantalla-1", label: "Pantalla 1", short: "1" },
  { href: "/pantalla-2", label: "Pantalla 2", short: "2" },
  { href: "/pantalla-3", label: "Pantalla 3", short: "3" },
];

/** Barra superior compartida: tema oscuro (ink) con píldora activa en snow. */
export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-snow/10 bg-ink/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo className="whitespace-nowrap text-snow!" />
        <ul className="flex items-center gap-1 sm:gap-2">
          {links.map(({ href, label, short }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  className={`block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                    active
                      ? "bg-snow text-ink"
                      : "text-snow/65 hover:bg-snow/10 hover:text-snow"
                  }`}
                >
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
