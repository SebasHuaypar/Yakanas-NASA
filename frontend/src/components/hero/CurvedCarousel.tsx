"use client";

import Image from "next/image";
import { useState } from "react";
import { CAROUSEL } from "@/lib/carousel";

/**
 * Carrusel curvo (tambor 3D) con fotos reales de incendios en el Perú.
 * Solo CSS para el giro; gira solo y se pausa/reanuda al hacer clic.
 * Cada foto muestra su crédito en letra pequeña (autor + licencia).
 */
export default function CurvedCarousel({ className = "" }: { className?: string }) {
  const n = CAROUSEL.length;
  const [paused, setPaused] = useState(false);

  return (
    <div
      className={`overflow-hidden [container-type:size] [perspective:3000px] ${className}`}
    >
      <ul
        aria-label="Fotografías reales de incendios en el Perú. Clic para pausar o reanudar."
        aria-live="off"
        onClick={() => setPaused((p) => !p)}
        // tarjeta 2:3. Escritorio: hasta 90% del alto y 50% del ancho. Móvil: más ancha y algo más baja.
        className={`absolute inset-0 animate-ring cursor-pointer [--w:min(calc(90cqh*0.66),50cqw)] [transform-style:preserve-3d] max-lg:[--w:min(calc(66cqh*0.66),68cqw)] ${
          paused ? "[animation-play-state:paused]" : ""
        }`}
        style={
          {
            "--h": "calc(var(--w) / 0.66)",
            "--n": n,
            "--r": "calc((var(--w) / 2 + 8px) / tan(calc(180deg / var(--n))))",
          } as React.CSSProperties
        }
      >
        {CAROUSEL.map((item, i) => (
          <li
            key={item.src}
            className="absolute inset-0 m-auto h-[var(--h)] w-[var(--w)] [backface-visibility:hidden]"
            style={{
              transform: `rotateY(calc(${i} * 360deg / var(--n))) translateZ(var(--r))`,
            }}
          >
            <figure className="relative size-full overflow-hidden rounded-md bg-navy">
              <Image
                src={item.src}
                alt={item.alt}
                fill
                priority={i < 3}
                sizes="(min-width: 1024px) 30vw, 60vw"
                draggable={false}
                className="object-cover [filter:grayscale(0.3)_saturate(0.85)_contrast(1.05)]"
              />
              {/* velo de paleta para unificar las fotos */}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(40_58_84/0.2)_0%,transparent_30%,rgb(12_9_10/0.75)_100%)]" />

              <figcaption className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <p className="text-[11px] font-medium leading-tight text-snow sm:text-xs">
                  {item.place}
                </p>
                <p className="mt-0.5 text-[10px] leading-tight text-snow/60 sm:text-[11px]">
                  {item.date}
                </p>
                <a
                  href={item.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1.5 block text-[8px] font-normal leading-tight text-snow/40 transition-colors hover:text-snow/80 sm:text-[9px]"
                >
                  Foto: {item.author} · {item.license}
                </a>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
