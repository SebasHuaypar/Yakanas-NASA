import type { ComponentPropsWithRef, ElementType } from "react";

type CardProps<T extends ElementType> = {
  /** Etiqueta HTML a renderizar (por defecto `div`). */
  as?: T;
  /**
   * `light`: cristal claro translúcido (el de las tarjetas de la pantalla 1: reloj y regiones).
   * `dark`: cristal más oscuro, para texto sobre zonas muy claras del globo.
   */
  tone?: "light" | "dark";
  className?: string;
} & Omit<ComponentPropsWithRef<T>, "as" | "className">;

/**
 * Tarjeta de cristal: la única tarjeta de la web (borde fino, desenfoque, brillo interior).
 * Se usa igual en la pantalla 1 y en la 2 para que todas se vean iguales.
 * Si `className` trae su propio `rounded-*`, ese radio reemplaza al de 24 px.
 */
export default function Card<T extends ElementType = "div">({
  as,
  tone = "light",
  className = "",
  children,
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const base = tone === "dark" ? "glass-dark" : "glass";
  const rounded = /\brounded-/.test(className) ? "" : "rounded-3xl";
  return (
    <Tag
      className={`${base} ${rounded} ${className}`.replace(/\s+/g, " ").trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}
