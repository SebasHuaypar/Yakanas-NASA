> Documento de la investigación inicial del equipo. La arquitectura que propone no es la que se construyó: el proyecto actual está descrito en el [README](../README.md) y el método en [metodo.md](metodo.md).

# Reto NASA – Incendios con FIRMS
## Documento técnico: armonización de datos y stack de backend

> Resumen de la investigación previa y propuesta de arquitectura backend para la solución del equipo.

---

## 1. Contexto: ¿qué es la armonización de datos?

Armonizar es hacer que datos de **fuentes distintas** (sensores, satélites, versiones de algoritmo) sean **comparables y combinables como una sola serie**, corrigiendo las diferencias sistemáticas de medición para que lo que cambie en los datos sea el fenómeno real y no el instrumento.

El referente de la NASA es **HLS (Harmonized Landsat Sentinel-2)**, cuya cadena de procesamiento incluye:

1. Corrección atmosférica (TOA → reflectancia de superficie, LaSRC).
2. Enmascarado de nubes y sombras (Fmask).
3. Co-registro y grilla común (tiles MGRS a 30 m).
4. Normalización BRDF (ángulo solar fijo y vista al nadir).
5. Ajuste espectral de bandas (S2 → bandpass de Landsat 8/OLI).
6. Validación contra una referencia independiente (MODIS).

### Lecturas recomendadas
- Claverie et al. (2018), *The Harmonized Landsat and Sentinel-2 surface reflectance data set*, Remote Sensing of Environment 219:145–161.
- *HLS Product User Guide v2.0* (LP DAAC).
- Técnicas específicas: Vermote et al. (LaSRC), Zhu & Woodcock (Fmask), Gao, Masek & Wolfe (AROP), Roy et al. (normalización NBAR).
- Libros base: Jensen, *Remote Sensing of the Environment*; Schowengerdt, *Remote Sensing: Models and Methods for Image Processing*.

---

## 2. Fuentes de datos de FIRMS

| Fuente | Producto | Píxel | Notas |
|---|---|---|---|
| MODIS Terra/Aqua | MCD14DL (NRT) / MCD14ML (SP) | 1 km | Serie más larga (desde nov. 2000) |
| VIIRS Suomi NPP | VNP14IMGTDL_NRT | 375 m | **Ya no entrega datos nuevos**: hay un corte en la serie |
| VIIRS NOAA-20 | VJ114IMGTDL_NRT | 375 m | Continuidad de VIIRS |
| VIIRS NOAA-21 | VJ214IMGTDL_NRT | 375 m | Continuidad de VIIRS |
| Landsat / HLS | Imágenes 30 m | 30 m | Área quemada y frentes de fuego. Es raster, no puntos |

Latencia global: ~3 horas tras la observación. Las descargas requieren **Earthdata Login** y la API requiere una **MAP_KEY**.

---

## 3. Variables y reglas de armonización

| Variable | MODIS | VIIRS | Regla de armonización |
|---|---|---|---|
| `latitude`, `longitude` | Centro del píxel de 1 km | Centro del píxel de 375 m | Llevar a una grilla común (H3) y eliminar duplicados entre satélites |
| `brightness` / `bright_ti4` | Canal 21/22 (K) | Canal I-4 (K) | **No son comparables** entre sensores: usar solo dentro de cada sensor o normalizar |
| `bright_t31` / `bright_ti5` | Canal 31 (K) | Canal I-5 (K) | Igual que la anterior |
| `scan`, `track` | Tamaño real del píxel | Tamaño real del píxel | Calcular `pixel_area_km2` para ponderar |
| `confidence` | Numérica, 0–100 % | Categórica: l/n/h | Mapear a `low` / `nominal` / `high` (MODIS: <30, 30–80, >80) |
| `frp` (MW) | Píxel de 1 km | Píxel de 375 m | Normalizar por área o calibrar MODIS↔VIIRS donde se solapan |
| `acq_date`, `acq_time` | UTC | UTC | Unir en un `TIMESTAMP` UTC y derivar la hora local de Lima (UTC-5) |
| `daynight` | D/N | D/N | Analizar por separado o usar como variable |
| `satellite`, `instrument` | Terra/Aqua | N/J1/J2 | Conservar para corregir el sesgo por sensor |
| `version` | 6.1NRT / 6.1 | 2.0NRT / 2.0 | No mezclar NRT y SP sin marcarlos |
| `type` | 0–3 | 0–3 | Solo en SP: filtrar `type ≠ 0` (volcanes, industria) |

**Precauciones**
- El significado de la confianza puede variar por región, así que hay que validarla localmente.
- La Anomalía del Atlántico Sur afecta a Sudamérica y puede generar falsos positivos nocturnos en VIIRS.
- Las horas de paso de los satélites difieren, y eso sesga las comparaciones por el ciclo diario del fuego.

### Pipeline de armonización
1. Unificar el esquema (renombrar columnas y añadir `sensor` y `satellite`).
2. Estandarizar la confianza.
3. Filtrar las fuentes no vegetales y las detecciones de baja confianza.
4. Asignar una celda H3 y agregar por celda y día (conteo, FRP total, confianza máxima).
5. Eliminar duplicados entre satélites.
6. Calibrar el sesgo entre sensores en los periodos de solapamiento.
7. Cruzar con capas externas: NDVI de HLS, meteorología, cobertura del suelo, límites administrativos.

---

## 4. Ingesta: límites de la API de FIRMS

- Límite: **5000 transacciones cada 10 minutos por MAP_KEY**.
- La API por área acepta de 1 a 10 días por petición, y **cada día cuenta como una transacción**.
- El tamaño del área no cambia el conteo, pero sí el tiempo de respuesta.

| Fuente | Días ≈ transacciones | Tiempo mínimo (por cuota) |
|---|---|---|
| MODIS (2000→hoy) | ~9 500 | ~19 min |
| VIIRS S-NPP (2012→) | ~5 400 | ~11 min |
| VIIRS NOAA-20 (2018→) | ~3 100 | ~7 min |
| VIIRS NOAA-21 (2024→) | ~1 000 | ~2 min |
| **Total** | **~19 000** | **~40 min** |

**Tiempos realistas**
- Perú o una región: de 1 a 2 horas en secuencia, o de 40 a 60 minutos con 4 a 6 hilos y un control de ritmo (*token bucket*).
- Todo el mundo: de 10 a 30 horas, por respuestas pesadas y errores 504.

**Estrategia**
- Historial: **Archive Download** de FIRMS (CSV/SHP por país y año), sin gastar cuota.
- Datos recientes: API con `day_range` de 1 a 3, cada pocas horas (unas 4 transacciones por día).
- HLS: Earthdata (CMR/STAC), sin cuota de FIRMS. El cuello de botella es el volumen de los raster.
- Guardar cada respuesta en crudo (un archivo por fuente y día) para poder reintentar y reproducir.

---

## 5. Almacenamiento

| Tipo de dato | Formato | Motor |
|---|---|---|
| CSV originales | CSV sin modificar (`raw/`) | Respaldo para rehacer la armonización |
| Puntos armonizados | **Parquet / GeoParquet** particionado por `sensor/year` | **DuckDB** (+ extensiones `spatial` y `h3`) |
| Agregados | Parquet `fires_daily_cell` | DuckDB |
| Imágenes HLS | **COG** (Cloud Optimized GeoTIFF) | Sistema de archivos u objetos. En la base solo los metadatos |
| Producción multiusuario (opcional) | Tablas | **PostgreSQL + PostGIS** |

**¿Por qué no JSON como almacenamiento?** Ocupa de 12 a 20 veces más que Parquet, se carga entero en memoria, no tiene tipos de fecha y no permite consultas eficientes. Se reserva como **formato de salida** (GeoJSON filtrado, JSON agregado y NDJSON para streaming).

### Esquema de la tabla armonizada

```sql
CREATE TABLE fires (
  sensor         TEXT,        -- MODIS / VIIRS
  satellite      TEXT,        -- Terra, Aqua, N, J1, J2
  acq_datetime   TIMESTAMP,   -- UTC
  lat            DOUBLE,
  lon            DOUBLE,
  cell_id        TEXT,        -- H3 (res 7-8)
  pixel_area_km2 DOUBLE,      -- scan * track
  bright_mir_k   DOUBLE,      -- brightness / bright_ti4
  bright_tir_k   DOUBLE,      -- bright_t31 / bright_ti5
  frp_mw         DOUBLE,
  conf_level     TEXT,        -- low / nominal / high
  conf_raw       TEXT,
  daynight       CHAR(1),
  version        TEXT,        -- NRT / SP
  fire_type      SMALLINT
);

CREATE TABLE fires_daily_cell AS
SELECT cell_id, CAST(acq_datetime AS DATE) AS fecha,
       COUNT(*) AS n_fuegos, SUM(frp_mw) AS frp_total,
       MAX(conf_level) AS conf_max, LIST(DISTINCT sensor) AS sensores
FROM fires GROUP BY ALL;
```

---

## 6. Consumo desde el frontend

```
Parquet (fuente maestra)
   │
   ├─► tippecanoe ─► fires.pmtiles ──► MapLibre GL JS (capa de mapa)
   │                 (archivo estático)
   │
   └─► FastAPI + DuckDB ─► JSON / GeoJSON ──► gráficos, popups, filtros
```

- **Mapa:** PMTiles (vector tiles) servidos como archivo estático. El navegador descarga solo la zona y el zoom visibles. Lleva dos capas: celdas agregadas para zoom bajo y puntos para zoom alto.
- **Datos dinámicos:** API con respuestas GeoJSON o JSON paginadas y limitadas.
- **Prototipo rápido:** GeoJSON estático de los últimos días (hasta unos 50 000 puntos o unos pocos MB).

---

## 7. Stack tecnológico del backend

### 7.1 Núcleo

| Capa | Tecnología | Rol |
|---|---|---|
| Lenguaje | **Python 3.11+** | Ecosistema geoespacial y científico |
| API | **FastAPI** + **Uvicorn** | REST asíncrono, OpenAPI/Swagger automático |
| Validación | **Pydantic v2** | Esquemas de request y response |
| Motor analítico | **DuckDB** (`spatial`, `h3`, `httpfs`) | SQL sobre Parquet, sin servidor |
| Formato de datos | **Parquet / GeoParquet** (`pyarrow`) | Almacenamiento columnar comprimido |
| Grilla espacial | **H3** (`h3-py` / extensión de DuckDB) | Celdas comunes para agregar y eliminar duplicados |
| DataFrames | **Polars** (o pandas) | Transformaciones en Python cuando no basta SQL |

### 7.2 Ingesta y procesamiento

| Componente | Tecnología | Rol |
|---|---|---|
| Cliente HTTP | **httpx** (async) + **tenacity** | Llamadas a FIRMS con reintentos y backoff ante errores 504 |
| Control de cuota | *Token bucket* propio (asyncio) | Respetar las 5000 transacciones cada 10 minutos con concurrencia |
| Programador | **APScheduler** (o cron / GitHub Actions) | Actualización NRT cada 3 a 6 horas |
| Datos HLS | **earthaccess**, **pystac-client** | Búsqueda y descarga autenticada con Earthdata |
| Raster | **rasterio**, **rioxarray**, **xarray**, **dask** | Lectura de COG, NDVI y estadísticas por celda en paralelo |
| Vector tiles | **tippecanoe** → **PMTiles** | Generación de las capas del mapa |

### 7.3 Infraestructura

| Componente | Tecnología |
|---|---|
| Contenedores | **Docker** + **docker-compose** |
| Archivos estáticos (PMTiles, COG) | Disco local, **Cloudflare R2** o un bucket S3 compatible |
| Despliegue de la API | Render, Railway, Fly.io o una VM |
| Base de datos de producción (opcional) | **PostgreSQL 16 + PostGIS** |
| Secretos | Variables de entorno (`.env`): `FIRMS_MAP_KEY`, credenciales de Earthdata |
| Calidad | **pytest**, **ruff**, **mypy** |

### 7.4 Estructura del repositorio

```
backend/
├── app/
│   ├── main.py              # FastAPI app
│   ├── api/
│   │   ├── fires.py         # /fires
│   │   ├── stats.py         # /stats
│   │   └── cells.py         # /cell/{id}
│   ├── db.py                # conexión DuckDB
│   ├── schemas.py           # modelos Pydantic
│   └── config.py            # settings (.env)
├── ingest/
│   ├── firms_archive.py     # carga histórica (Archive Download)
│   ├── firms_nrt.py         # API NRT + token bucket
│   ├── hls.py               # earthaccess / STAC
│   └── scheduler.py
├── harmonize/
│   ├── schema.sql           # esquema unificado
│   ├── harmonize.sql        # reglas de la sección 3
│   └── aggregate.sql        # fires_daily_cell
├── tiles/
│   └── build_pmtiles.sh     # tippecanoe
├── data/
│   ├── raw/                 # CSV originales (no versionar)
│   ├── parquet/             # sensor=.../year=...
│   └── tiles/
├── tests/
├── Dockerfile
├── docker-compose.yml
└── pyproject.toml
```

### 7.5 Endpoints propuestos

| Método | Ruta | Respuesta | Descripción |
|---|---|---|---|
| GET | `/health` | JSON | Estado de la API y fecha del último dato NRT |
| GET | `/fires?bbox=&desde=&hasta=&conf=&sensor=&page=` | GeoJSON | Puntos filtrados y paginados (tope de unos miles) |
| GET | `/stats/daily?region=&desde=&hasta=` | JSON | Serie temporal de conteos y FRP |
| GET | `/stats/sensors?desde=&hasta=` | JSON | Comparación MODIS frente a VIIRS |
| GET | `/cell/{cell_id}` | JSON | Detalle de la celda H3 (historial y NDVI) |
| GET | `/tiles/fires.pmtiles` | binario | Capa del mapa (estática / CDN) |

---

## 8. Plan de trabajo sugerido

1. **Fase 1, datos:** descargar el historial (Archive Download), convertirlo a Parquet y aplicar el script de armonización.
2. **Fase 2, API mínima:** FastAPI + DuckDB con `/fires` y `/stats/daily`, más un GeoJSON estático para el frontend.
3. **Fase 3, NRT:** ingesta programada con control de cuota.
4. **Fase 4, mapa:** generar PMTiles y entregarlos al frontend.
5. **Fase 5, valor agregado:** cruce con HLS/NDVI y meteorología, y el modelo o los indicadores del reto.

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Errores 504 o timeouts de FIRMS | Peticiones de 1 a 5 días, reintentos con backoff y guardar las respuestas crudas |
| Agotar la cuota de la MAP_KEY | Token bucket y uso de Archive Download para el historial |
| Corte de Suomi NPP | Calibrar contra NOAA-20/21 en el periodo de solapamiento |
| Falsos positivos (volcanes, industria, Anomalía del Atlántico Sur) | Filtro por `type` y por confianza, y validación local |
| Payloads pesados en el frontend | PMTiles más paginación y agregación |
| Volumen de los raster HLS | Recortar por zona y fechas, y procesar en paralelo con dask |

---

## Fuentes

- [FIRMS – NASA Earthdata](https://www.earthdata.nasa.gov/data/tools/firms)
- [Atributos de datos MODIS/VIIRS (FIRMS)](https://earthdata.nasa.gov/data/tools/firms/active-fire-data-attributes-modis-viirs)
- [FIRMS API / area](https://firms.modaps.eosdis.nasa.gov/api/area/csv)
- [Foro Earthdata – límite de transacciones](https://forum.earthdata.nasa.gov/viewtopic.php?p=23828)
- [Claverie et al. 2018 – NASA NTRS](https://ntrs.nasa.gov/citations/20190028663)
- [HLS User Guide v2.0](https://lpdaac.usgs.gov/documents/1698/HLS_User_Guide_V2.pdf)
- [HLS-Data-Resources (LP DAAC)](https://github.com/irinabird/HLS-Data-Resources)