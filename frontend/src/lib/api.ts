/**
 * Cliente de la API del equipo de backend (FastAPI "Calendario del Fuego").
 *
 * La dirección vive en UNA sola variable de entorno para poder cambiarla cuando la API pase a la
 * repo oficial: `NEXT_PUBLIC_API_URL` (ver `.env.example`). Sin variable usa el despliegue actual.
 * Todas las rutas son GET, sin autenticación y con CORS abierto, así que se llaman desde el navegador.
 */
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://calendario-fuego-1022991169828.southamerica-west1.run.app"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** GET con tiempo límite y los errores de la API (`{"detail": "..."}`) convertidos en `ApiError`. */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const qs = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
        )
        .join("&")
    : "";
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30000);
  signal?.addEventListener("abort", () => ctl.abort());
  try {
    const r = await fetch(`${API_URL}${path}${qs}`, { signal: ctl.signal });
    if (!r.ok) {
      let detail = r.statusText;
      try {
        detail = (await r.json()).detail ?? detail;
      } catch {}
      throw new ApiError(String(detail), r.status);
    }
    return (await r.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(e instanceof Error ? e.message : "network");
  } finally {
    clearTimeout(timer);
  }
}

/** Enlace directo (para botones de descarga: no hace falta `fetch`). */
export const apiUrl = (
  path: string,
  params?: Record<string, string | number | undefined>,
) => {
  const qs = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
        )
        .join("&")
    : "";
  return `${API_URL}${path}${qs}`;
};

/* ---------------- Tipos de las respuestas (la API no las describe en su OpenAPI) ---------------- */

export type ApiRegion = { id: string; name: string };

export type ApiMonth = {
  year: number;
  month: number;
  hs: number;
  hs_lo: number;
  hs_hi: number;
  frp: number;
  active_cells: number;
  /** MODIS_ADJ = estimado desde MODIS; VIIRS = observado. */
  source: "MODIS_ADJ" | "VIIRS";
  p25: number;
  median: number;
  p75: number;
  pct_mediana: number | null;
  estado: "bajo" | "normal" | "alto";
};

export type ApiCalendar = {
  region_id: string;
  name: string;
  baseline: string;
  unidad: string;
  months: ApiMonth[];
};

export type ApiHeatmap = {
  desde: string;
  hasta: string;
  celdas: number;
  features: {
    geometry: { coordinates: [number, number] };
    properties: { hs: number };
  }[];
};

export type ApiAlertRow = {
  region_id: string;
  name: string;
  hs: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  pct_mediana: number | null;
  estado: "bajo" | "normal" | "alto" | "inusual";
};

export type ApiAlert = {
  desde: string;
  hasta: string;
  dias: number;
  base: string;
  unidad: string;
  regla: string;
  nota: string;
  peru: ApiAlertRow;
  departamentos: ApiAlertRow[];
};

export type ApiForecast = {
  region_id: string;
  name: string;
  year: number;
  tipo: string;
  unidad: string;
  datos_hasta: string;
  metodo: string;
  nota: string;
  total: number;
  validacion: {
    prueba: string;
    como: string;
    error_departamento_mes: number;
    error_nacional_anual: number;
    dentro_del_rango: number;
    por_anio: {
      year: number;
      previsto: number;
      observado: number;
      error: number;
    }[];
  };
  months: {
    year: number;
    month: number;
    hs: number;
    hs_lo: number;
    hs_hi: number;
    anios_usados: number;
  }[];
};

export type ApiEvent = {
  id: string;
  region_id: string;
  name: string;
  centro: [number, number];
  primera_fecha: string;
  ultima_fecha: string;
  dias_con_deteccion: number;
  activo: boolean;
  tendencia: string;
  detecciones: {
    total: number;
    modis: number;
    viirs_noaa20: number;
    viirs_noaa21: number;
  };
  confianza_alta: number;
  frp_total_mw: number;
  frp_max_mw: number;
  bbox?: [number, number, number, number];
  area_pixeles_ha?: number;
  por_dia?: { fecha: string; detecciones: number; frp_mw: number }[];
};

export type ApiEvents = {
  desde: string;
  hasta: string;
  regla: string;
  nota: string;
  resumen: {
    detecciones: number;
    eventos: number;
    activos: number;
    creciendo: number;
    detecciones_en_eventos: number;
    detecciones_sueltas: number;
  };
  events: ApiEvent[];
};

export type ApiHealth = {
  status: string;
  generated: string | null;
  completo: boolean;
  ventana: { desde: string; hasta: string } | null;
  filas: number | null;
};

export type ApiValidation = {
  version: string;
  train: string;
  test: string;
  con_temporada: {
    error_nacional: number;
    r2_nacional: number;
    dentro_p10_p90: number;
    error_departamento_mes: number;
    por_zona: Record<string, number>;
  };
  sin_temporada: {
    error_nacional: number;
    r2_nacional: number;
    error_departamento_mes: number;
    por_zona: Record<string, number>;
  };
  por_departamento: Record<string, { name: string; error: number }>;
};

/** Todos los valores de /calibration llegan como texto. */
export type ApiCalibration = {
  version: string;
  region_id: string;
  name: string;
  metric: "hs" | "frp";
  a: string;
  d: string;
  b: string;
  smear: string;
  res_p10: string;
  res_p90: string;
  high_months: string;
  method: string;
  n: string;
};

/** Detecciones individuales (/fires): solo cubre la ventana reciente que descargó el backend. */
export type ApiFires = {
  desde: string;
  hasta: string;
  cobertura: { desde: string; hasta: string };
  total: number;
  features: {
    geometry: { coordinates: [number, number] };
    properties: {
      acq_date: string;
      sensor: "MODIS" | "VIIRS_NOAA20" | "VIIRS_NOAA21";
      satellite: string;
      frp_mw: number;
      conf_level: string;
      dep_id: string;
    };
  }[];
};

/** Zonas de 0,06° donde suele haber fuego alrededor de una fecha del calendario (/recurrence). */
export type ApiRecurrence = {
  fecha: string;
  ventana_dias: number;
  ventana: { desde: string; hasta: string };
  anios_base: number[];
  zona_grados: number;
  nota: string;
  resumen: { zonas_con_historia: number; zonas_desde_30: number; zonas_desde_50: number; zonas_desde_70: number };
  validacion: {
    prueba: string;
    por_frecuencia: { desde: number; hasta: number; zonas: number; ardieron: number }[];
    por_corte: { frecuencia_minima: number; aciertos: number; cobertura: number }[];
  };
  features: {
    geometry: { coordinates: [number, number] };
    properties: { frecuencia: number; anios_con_fuego: number; anios: number; region_id: string; name: string };
  }[];
};

/** Semana por semana, en cuántos años hubo fuego en la zona de un punto (/recurrence/place). */
export type ApiPlaceRecurrence = {
  region_id: string;
  name: string;
  anios_base: number[];
  anios_con_fuego: number[];
  semanas_mas_frecuentes: number[];
  semanas: { semana: number; inicia: string; anios_con_fuego: number; frecuencia: number; cuales: number[] }[];
};

/** Probabilidad de fuego por zona de ~6 km (regresión logística del backend, /prevention/model). */
export type ApiModelMap = {
  fecha: string;
  region_id: string;
  features: { geometry: { coordinates: [number, number] }; properties: { probabilidad: number; frecuencia: number; region_id: string; name: string } }[];
};

/** Variables, pesos y validación del modelo (/prevention/model/info). */
export type ApiModelInfo = {
  modelo: string;
  validacion?: { regresion_logistica?: { auc: number; aciertos_zonas_marcadas: number; cobertura_zonas_marcadas: number } };
};
