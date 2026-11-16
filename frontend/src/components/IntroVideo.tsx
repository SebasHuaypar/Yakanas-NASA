"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/lang";

/**
 * Se recuerda solo mientras la página no se recargue: al cerrar el video y volver a Historia
 * navegando por la web no sale otra vez; con una recarga completa sí. (En el servidor nunca se marca.)
 */
let seen = false;

const TXT = {
  en: {
    close: "Close video",
    skip: "Skip",
    sound: "Sound on",
    mute: "Mute",
    play: "Play video",
    label: "Yakana’s Fire Intelligence — video",
  },
  es: {
    close: "Cerrar video",
    skip: "Saltar",
    sound: "Activar sonido",
    mute: "Silenciar",
    play: "Reproducir video",
    label: "Yakana’s Fire Intelligence — video",
  },
};

/** Video de presentación a pantalla completa, sin marcos, al entrar a Historia. */
export default function IntroVideo() {
  const [lang] = useLang();
  const t = TXT[lang];
  const [open, setOpen] = useState(() => !seen);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  const close = () => {
    seen = true;
    setOpen(false);
  };

  // Esc cierra, y mientras está abierto la página de debajo no se desplaza
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  // Con "reducir movimiento" no arranca solo: se espera a que la persona pulse reproducir
  useEffect(() => {
    if (!open) return;
    const v = ref.current;
    if (!v) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calm) return;
    v.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.label}
      onClick={close}
      className="animate-rise fixed inset-0 z-[70] grid place-items-center bg-ink/65 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative aspect-video w-[min(92vw,46rem)] overflow-hidden rounded-2xl bg-ink shadow-[0_24px_80px_rgb(0_0_0/0.6)]"
      >
        <video
          ref={ref}
          src="/video/yakana-intro.mp4"
          poster="/video/yakana-intro-poster.jpg"
          muted={muted}
          playsInline
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={close}
          className="size-full object-cover"
        />

        {!playing && (
          <button
            type="button"
            aria-label={t.play}
            onClick={(e) => {
              e.stopPropagation();
              void ref.current?.play();
            }}
            className="absolute inset-0 m-auto grid size-16 cursor-pointer place-items-center rounded-full bg-snow/90 text-ink transition hover:scale-105"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.5-6.5a1 1 0 0 0 0-1.8L9.500 4.600A1 1 0 0 0 8 5.500Z" />
            </svg>
          </button>
        )}

        <div className="absolute right-3 top-3 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="cursor-pointer rounded-full bg-ink/60 px-3.5 py-1.5 text-xs font-medium text-snow/90 backdrop-blur transition hover:bg-ink/80 hover:text-snow"
          >
            {t.skip}
          </button>
          <button
            type="button"
            aria-label={t.close}
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="grid size-8 cursor-pointer place-items-center rounded-full bg-ink/60 text-snow/90 backdrop-blur transition hover:bg-ink/80 hover:text-snow"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1.500 1.500l9 9M10.500 1.500l-9 9"
                stroke="currentColor"
                strokeWidth="1.600"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const v = ref.current;
            if (v) v.muted = !muted;
            setMuted((m) => !m);
          }}
          className="absolute bottom-3 right-3 flex cursor-pointer items-center gap-2 rounded-full bg-ink/60 px-3.5 py-1.5 text-xs font-medium text-snow/90 backdrop-blur transition hover:bg-ink/80 hover:text-snow"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.800"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            {muted ? (
              <path d="m16 9 5 6M21 9l-5 6" />
            ) : (
              <path d="M15.500 8.500a5 5 0 0 1 0 7M18.500 5.500a9 9 0 0 1 0 13" />
            )}
          </svg>
          {muted ? t.sound : t.mute}
        </button>
      </div>
    </div>
  );
}
