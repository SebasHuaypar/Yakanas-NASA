"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

const links = [
  { href: "/pantalla-1", label: "Pantalla 1" },
  { href: "/pantalla-2", label: "Pantalla 2" },
  { href: "/pantalla-3", label: "Pantalla 3" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate/20 bg-snow/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <ul className="flex items-center gap-1 sm:gap-2">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                    active
                      ? "bg-navy text-snow"
                      : "text-slate hover:bg-navy/10 hover:text-navy"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
