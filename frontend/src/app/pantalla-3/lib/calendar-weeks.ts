/** Semanas del calendario: 53 celdas por año, agrupadas por mes (4 o 5 semanas por mes). */
export const WEEKS = 53;

/** Día del año en que empieza cada mes (año no bisiesto) y el total. */
export const MONTH_START = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];

/** Mes (0–11) al que pertenece cada semana, según su día central. */
export const WEEK_MONTH: number[] = Array.from({ length: WEEKS }, (_, k) => {
  const day = Math.min(7 * k + 3, 364);
  let m = 11;
  while (MONTH_START[m] > day) m--;
  return m;
});

/** Semanas (índices) de cada mes. */
export const MONTH_WEEKS: number[][] = Array.from({ length: 12 }, (_, m) => WEEK_MONTH.flatMap((wm, k) => (wm === m ? [k] : [])));
