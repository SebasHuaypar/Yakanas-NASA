"use client";

import { useState } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import Footer from "@/components/sections/Footer";
import {
  GitHubIcon,
  InstagramIcon,
  LinkedInIcon,
  MailIcon,
} from "@/components/SocialIcons";
import { useLang } from "@/lib/lang";
import { TEAM, type Member } from "./team";

const TXT = {
  en: {
    kicker: "The team",
    title: "The people behind Yakana's Team",
    lead: "Six people, one goal: make twenty years of satellite fire data understandable and useful for everyone in Peru.",
    soon: "Contribution coming soon.",
    hint: "show contribution",
    social: {
      linkedin: "LinkedIn",
      instagram: "Instagram",
      github: "GitHub",
      email: "Email",
    },
  },
  es: {
    kicker: "El equipo",
    title: "Las personas detrás de Yakana's Team",
    lead: "Seis personas, un objetivo: que veinte años de datos satelitales de fuego sean comprensibles y útiles para todo el Perú.",
    soon: "Aporte por completar.",
    hint: "ver aporte",
    social: {
      linkedin: "LinkedIn",
      instagram: "Instagram",
      github: "GitHub",
      email: "Correo",
    },
  },
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

function Face({ m }: { m: Member }) {
  return m.photo ? (
    <Image
      src={m.photo}
      alt={m.name}
      fill
      sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 100vw"
      className="object-cover"
    />
  ) : (
    <span
      aria-hidden="true"
      className="absolute inset-0 grid place-items-center bg-[linear-gradient(160deg,#283A54,#4C6679)] font-heading text-8xl font-bold text-snow/80"
    >
      {initials(m.name)}
    </span>
  );
}

type Soc = { key: string; href: string; label: string; icon: React.ReactNode };

function FlipCard({
  m,
  socials,
  back,
  hint,
}: {
  m: Member;
  socials: Soc[];
  back: string;
  hint: string;
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${m.name} - ${hint}`}
      onClick={() => setFlipped((v) => !v)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setFlipped((v) => !v);
        }
      }}
      className="group/card relative aspect-[4/5] w-full cursor-pointer rounded-3xl outline-none [perspective:1200px] focus-visible:ring-2 focus-visible:ring-amber"
    >
      <div
        className={`relative size-full transition-transform duration-700 ease-out [transform-style:preserve-3d] motion-reduce:transition-none [@media(hover:hover)]:group-hover/card:[transform:rotateY(180deg)] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Frente */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl border border-snow/15 bg-navy [backface-visibility:hidden] group-hover/card:border-amber/60">
          <Face m={m} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/90 via-ink/50 to-transparent backdrop-blur-[2px] [mask-image:linear-gradient(to_top,black_55%,transparent)]"
          />
          {socials.length > 0 && (
            <ul className="absolute inset-x-0 bottom-0 flex justify-center gap-2 p-4">
              {socials.map((l) => (
                <li key={l.key}>
                  <a
                    href={l.href}
                    target={l.key === "email" ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    aria-label={`${m.name} - ${l.label}`}
                    title={l.label}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="grid size-10 place-items-center rounded-full border border-snow/30 bg-ink/40 text-snow/90 backdrop-blur transition-colors hover:border-amber hover:text-amber focus-visible:outline-2 focus-visible:outline-amber"
                  >
                    {l.icon}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Reverso */}
        <div className="absolute inset-0 flex items-center overflow-hidden rounded-3xl border border-amber/50 bg-[linear-gradient(160deg,#283A54,#0C090A)] p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="text-sm leading-relaxed text-snow/85 sm:text-base">
            {back}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TeamView() {
  const [lang] = useLang();
  const t = TXT[lang];

  const links = (m: Member) =>
    [
      m.links.linkedin && {
        key: "linkedin",
        href: m.links.linkedin,
        label: t.social.linkedin,
        icon: <LinkedInIcon />,
      },
      m.links.instagram && {
        key: "instagram",
        href: m.links.instagram,
        label: t.social.instagram,
        icon: <InstagramIcon />,
      },
      m.links.github && {
        key: "github",
        href: m.links.github,
        label: t.social.github,
        icon: <GitHubIcon />,
      },
      m.links.email && {
        key: "email",
        href: `mailto:${m.links.email}`,
        label: t.social.email,
        icon: <MailIcon />,
      },
    ].filter(Boolean) as {
      key: string;
      href: string;
      label: string;
      icon: React.ReactNode;
    }[];

  return (
    <div className="flex-1 text-snow">
      <header className="mx-auto w-full max-w-6xl px-4 pb-4 pt-28 text-center sm:px-6 sm:pt-36">
        <p className="animate-rise text-xs uppercase tracking-[0.22em] text-snow/60">
          {t.kicker}
        </p>
        <h1 className="mx-auto mt-5 max-w-4xl animate-rise text-4xl leading-[1.06] tracking-tight [animation-delay:120ms] sm:text-6xl">
          {t.title}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl animate-rise text-base leading-relaxed text-snow/75 [animation-delay:240ms] sm:text-lg">
          {t.lead}
        </p>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pb-28">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((m, i) => (
            <li key={m.id}>
              <Reveal delay={i * 90} className="h-full">
                <div className="flex flex-col gap-4">
                  <FlipCard
                    m={m}
                    socials={links(m)}
                    back={m.contribution ? m.contribution[lang] : t.soon}
                    hint={t.hint}
                  />
                  <div className="text-center">
                    <h2 className="font-heading text-xl font-bold leading-tight text-snow">
                      {m.name}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-amber">
                      {m.role[lang]}
                    </p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <Footer />
    </div>
  );
}
