"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * YakaLlama: chatbot flotante (por ahora solo avisa que pronto responderá consultas).
 * La llama va sin fondo ni marco; el mensaje y el cuadro de conversación son de cristal,
 * igual que las tarjetas del resto de la web.
 */
export default function YakaLlama() {
  const [open, setOpen] = useState(false);
  const [greet, setGreet] = useState(false);

  // El saludo aparece un momento después de cargar la página
  useEffect(() => {
    const t = window.setTimeout(() => setGreet(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    setOpen((o) => !o);
    setGreet(false);
  };

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-40 flex flex-col items-end gap-2 sm:bottom-5 sm:right-5">
      {/* Cuadro de conversación */}
      <div
        id="yakallama-chat"
        role="dialog"
        aria-label="Chat con YakaLlama"
        aria-hidden={!open}
        className={`glass-dark w-[min(21rem,calc(100vw-1.5rem))] origin-bottom-right overflow-hidden rounded-3xl transition duration-300 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-snow/10 px-5 py-3.5">
          <div>
            <p className="font-heading text-base font-bold text-snow">
              YakaLlama
            </p>
            <p className="text-[11px] text-snow/50">
              Asistente de Yakana&apos;s Team
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            tabIndex={open ? 0 : -1}
            aria-label="Cerrar el chat"
            className="grid size-8 place-items-center rounded-full text-snow/60 transition hover:bg-snow/10 hover:text-snow"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1.5 1.5l9 9M10.5 1.5l-9 9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-2.5 px-5 py-5" aria-live="polite">
          <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-snow/10 bg-snow/[0.07] px-4 py-2.5 text-sm leading-relaxed text-snow">
            ¡Hola! Soy YakaLlama y te puedo ayudar.
          </p>
          <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-snow/10 bg-snow/[0.07] px-4 py-2.5 text-sm leading-relaxed text-snow">
            Pronto podré responder a tus consultas.
          </p>
        </div>

        <div className="border-t border-snow/10 p-3">
          <div className="flex items-center gap-2 rounded-full border border-snow/10 bg-snow/[0.04] py-1.5 pl-4 pr-1.5">
            <input
              type="text"
              disabled
              tabIndex={open ? 0 : -1}
              placeholder="Pronto podrás escribirme…"
              aria-label="Escribe tu pregunta (disponible pronto)"
              className="min-w-0 flex-1 bg-transparent text-sm text-snow placeholder:text-snow/40 focus:outline-none disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled
              tabIndex={-1}
              aria-label="Enviar (disponible pronto)"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-snow/20 text-snow/50"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Saludo */}
      <div
        className={`glass-dark relative max-w-[14rem] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-snug text-snow transition duration-500 ${
          greet && !open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "translate-y-2 opacity-0"
        }`}
        aria-hidden={!(greet && !open)}
      >
        <button
          type="button"
          onClick={toggle}
          tabIndex={greet && !open ? 0 : -1}
          className="text-left"
        >
          <span className="font-medium">Hola, soy YakaLlama</span> y te puedo
          ayudar
        </button>
        <button
          type="button"
          onClick={() => setGreet(false)}
          tabIndex={greet && !open ? 0 : -1}
          aria-label="Cerrar el saludo"
          className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full border border-snow/20 bg-ink text-[10px] text-snow/70 transition hover:text-snow"
        >
          ×
        </button>
      </div>

      {/* La llama: sin fondo ni marco */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="yakallama-chat"
        aria-label={
          open ? "Cerrar el chat de YakaLlama" : "Abrir el chat de YakaLlama"
        }
        className="pointer-events-auto block origin-bottom animate-bob transition-transform duration-300 group outline-none hover:scale-105"
      >
        <Image
          src="/images/yakallama.webp"
          alt=""
          width={480}
          height={788}
          priority
          className="h-28 w-auto drop-shadow-[0_8px_18px_rgb(0_0_0/0.45)] transition group-focus-visible:brightness-110 sm:h-40"
        />
      </button>
    </div>
  );
}
