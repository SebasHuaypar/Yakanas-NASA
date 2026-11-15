"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLang } from "@/lib/lang";

/**
 * YakaLlama: chatbot flotante. Las preguntas van a /api/chat (servidor), que llama al modelo de NVIDIA
 * con la clave guardada en el servidor; la respuesta llega en streaming y se va escribiendo.
 * La llama va sin fondo ni marco; el mensaje y el cuadro de conversación son de cristal,
 * igual que las tarjetas del resto de la web.
 */
const TXT = {
  en: {
    chat: "Chat with YakaLlama",
    closeChat: "Close the chat",
    role: "Yakana’s Fire Intelligence assistant",
    hello:
      "Hi! I'm YakaLlama. Ask me about fire in Peru, how the method works, how to use the site, or who built it.",
    placeholder: "Type your question…",
    ask: "Your question",
    send: "Send",
    writing: "YakaLlama is writing…",
    errGeneric: "I couldn't answer right now. Please try again in a moment.",
    errBusy: "Too many questions in a row. Wait a moment and try again.",
    errSetup: "The chat isn't set up yet.",
    suggestions: {
      default: [
        "Which region had the most fires this week?",
        "Explain the method to me, step by step",
        "Who built this project?",
        "What do I do if there is fire near me?",
      ],
      historia: [
        "Why are there two satellites?",
        "Which region had the most fires this week?",
        "Who built this project?",
      ],
      equipo: [
        "Who is on the team and what did each person do?",
        "Who built the predictive model?",
        "Explain the method to me, step by step",
      ],
      metodo: [
        "Explain the method to me, step by step",
        "Why is a year before 2012 an estimate?",
        "What does the range mean?",
      ],
      explorador: [
        "How do I use the explorer?",
        "Which month burned the most in Peru last year?",
        "What does \"unusual\" mean in the calendar?",
      ],
      prevencion: [
        "How does the fire prediction work?",
        "What do I do if there is fire near me?",
        "When is the fire season in Peru?",
      ],
      respuesta: [
        "Which fires are active right now?",
        "Which region had the most fires this week?",
        "How reliable is the satellite data?",
      ],
    } as Record<string, string[]>,
    greetName: "Hi, I'm YakaLlama",
    greetRest: "and I can help",
    closeGreet: "Close the greeting",
    open: "Open the YakaLlama chat",
    close: "Close the YakaLlama chat",
  },
  es: {
    chat: "Chat con YakaLlama",
    closeChat: "Cerrar el chat",
    role: "Asistente de Yakana’s Fire Intelligence",
    hello:
      "¡Hola! Soy YakaLlama. Pregúntame sobre el fuego en el Perú, cómo funciona el método, cómo usar la web o quién la hizo.",
    placeholder: "Escribe tu pregunta…",
    ask: "Tu pregunta",
    send: "Enviar",
    writing: "YakaLlama está escribiendo…",
    errGeneric: "No pude responder ahora. Intenta de nuevo en un momento.",
    errBusy:
      "Muchas preguntas seguidas. Espera un momento y vuelve a intentar.",
    errSetup: "El chat todavía no está configurado.",
    suggestions: {
      default: [
        "¿Qué región tuvo más focos esta semana?",
        "Explícame el método paso a paso",
        "¿Quién hizo este proyecto?",
        "¿Qué hago si hay fuego cerca de mí?",
      ],
      historia: [
        "¿Por qué hay dos satélites?",
        "¿Qué región tuvo más focos esta semana?",
        "¿Quién hizo este proyecto?",
      ],
      equipo: [
        "¿Quiénes son el equipo y qué hizo cada uno?",
        "¿Quién hizo el modelo predictivo?",
        "Explícame el método paso a paso",
      ],
      metodo: [
        "Explícame el método paso a paso",
        "¿Por qué un año antes de 2012 es una estimación?",
        "¿Qué significa el rango?",
      ],
      explorador: [
        "¿Cómo uso el explorador?",
        "¿Qué mes ardió más en el Perú el año pasado?",
        "¿Qué significa \"inusual\" en el calendario?",
      ],
      prevencion: [
        "¿Cómo funciona la predicción de fuego?",
        "¿Qué hago si hay fuego cerca de mí?",
        "¿Cuándo es la temporada de fuego en el Perú?",
      ],
      respuesta: [
        "¿Qué fuegos están activos ahora?",
        "¿Qué región tuvo más focos esta semana?",
        "¿Qué tan confiables son los datos satelitales?",
      ],
    } as Record<string, string[]>,
    greetName: "Hola, soy YakaLlama",
    greetRest: "y te puedo ayudar",
    closeGreet: "Cerrar el saludo",
    open: "Abrir el chat de YakaLlama",
    close: "Cerrar el chat de YakaLlama",
  },
};

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

/** El modelo a veces marca **negritas**: se muestran como negrita (sin inyectar HTML). */
function rich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

export default function YakaLlama() {
  const [lang] = useLang();
  const page = (usePathname() ?? "").split("/")[1] ?? "";
  const L = TXT[lang];
  const [open, setOpen] = useState(false);
  const [greet, setGreet] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const ctl = useRef<AbortController | null>(null);

  // La conversación baja sola mientras llega la respuesta.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);
  // Si el componente se desmonta a mitad de una respuesta, se corta la petición.
  useEffect(() => () => ctl.current?.abort(), []);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const history: Msg[] = [
      ...msgs.filter((m) => !m.error),
      { role: "user", content: q },
    ];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const setLast = (patch: (m: Msg) => Msg) =>
      setMsgs((all) => [...all.slice(0, -1), patch(all[all.length - 1])]);
    try {
      ctl.current = new AbortController();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
        signal: AbortSignal.any([ctl.current.signal, AbortSignal.timeout(55_000)]),
      });
      if (!res.ok || !res.body) {
        const code =
          res.status === 429
            ? L.errBusy
            : res.status === 503
              ? L.errSetup
              : L.errGeneric;
        setLast(() => ({ role: "assistant", content: code, error: true }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setLast((m) => ({ ...m, content: m.content + chunk }));
      }
      setLast((m) =>
        m.content.trim() ? m : { ...m, content: L.errGeneric, error: true },
      );
    } catch {
      setLast((m) =>
        m.content.trim()
          ? m
          : { role: "assistant", content: L.errGeneric, error: true },
      );
    } finally {
      setBusy(false);
    }
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

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
    <div className="pointer-events-none fixed bottom-3 right-3 z-40 sm:bottom-5 sm:right-5">
      <div className="relative flex justify-end">
        {/* Cuadro de conversación */}
        <div
          id="yakallama-chat"
          role="dialog"
          aria-label={L.chat}
          aria-hidden={!open}
          className={`glass-dark absolute bottom-full right-0 mb-1 flex max-h-[calc(100dvh-10.5rem)] w-[min(22rem,calc(100vw-1.5rem))] origin-bottom-right flex-col overflow-hidden rounded-3xl transition duration-300 ${
            open
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "translate-y-3 scale-95 opacity-0"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-snow/10 px-5 py-3.5">
            <div>
              <p className="font-heading text-base font-bold text-snow">
                YakaLlama
              </p>
              <p className="text-[11px] text-snow/50">{L.role}</p>
            </div>
            <button
              type="button"
              onClick={toggle}
              tabIndex={open ? 0 : -1}
              aria-label={L.closeChat}
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

          <div
            ref={listRef}
            className="min-h-0 max-h-[28rem] flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-5 py-5"
            aria-live="polite"
          >
            <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-snow/10 bg-snow/[0.07] px-4 py-2.5 text-sm leading-relaxed text-snow">
              {L.hello}
            </p>
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(L.suggestions[page] ?? L.suggestions.default).map((s) => (
                  <button
                    key={s}
                    type="button"
                    tabIndex={open ? 0 : -1}
                    onClick={() => void ask(s)}
                    className="cursor-pointer rounded-full border border-snow/15 px-3 py-1 text-xs text-snow/80 transition hover:border-snow/40 hover:text-snow"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <p
                  key={i}
                  className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-snow px-4 py-2.5 text-sm leading-relaxed text-ink"
                >
                  {m.content}
                </p>
              ) : (
                <p
                  key={i}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md border px-4 py-2.5 text-sm leading-relaxed ${
                    m.error
                      ? "border-snow/15 bg-transparent text-snow/70"
                      : "border-snow/10 bg-snow/[0.07] text-snow"
                  }`}
                >
                  {(m.content && rich(m.content)) || (
                    <span className="animate-pulse text-snow/50">
                      {L.writing}
                    </span>
                  )}
                </p>
              ),
            )}
          </div>

          <form onSubmit={onSubmit} className="shrink-0 border-t border-snow/10 p-3">
            <div className="flex items-center gap-2 rounded-full border border-snow/10 bg-snow/[0.04] py-1.5 pl-4 pr-1.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={1200}
                tabIndex={open ? 0 : -1}
                placeholder={L.placeholder}
                aria-label={L.ask}
                className="min-w-0 flex-1 bg-transparent text-sm text-snow placeholder:text-snow/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                tabIndex={open ? 0 : -1}
                aria-label={L.send}
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-snow text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-snow/20 disabled:text-snow/50"
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
          </form>
        </div>

        {/* Saludo */}
        <div
          className={`glass-dark absolute bottom-full right-0 mb-1 w-max max-w-[14rem] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-snug text-snow transition duration-500 ${
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
            <span className="font-medium">{L.greetName}</span> {L.greetRest}
          </button>
          <button
            type="button"
            onClick={() => setGreet(false)}
            tabIndex={greet && !open ? 0 : -1}
            aria-label={L.closeGreet}
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
          aria-label={open ? L.close : L.open}
          className="pointer-events-auto block origin-bottom animate-bob transition-transform duration-300 group outline-none hover:scale-105"
        >
          <Image
            src="/images/yakallama.webp"
            alt=""
            width={480}
            height={788}
            priority
            className="h-[4.2rem] w-auto drop-shadow-[0_8px_18px_rgb(0_0_0/0.45)] transition group-focus-visible:brightness-110 sm:h-24"
          />
        </button>
      </div>
    </div>
  );
}
