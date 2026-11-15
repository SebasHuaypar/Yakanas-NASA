# API reference for the front end

Everything the pages need comes from one FastAPI app. This file lists every route, its parameters, and the exact shape of what comes back, so the front end can be built without reading the Python.

- **Base URL (local):** `http://127.0.0.1:8000`
- **Interactive docs:** `http://127.0.0.1:8000/docs`
- **Methods:** `GET` only. No authentication. CORS is open to any origin.
- **Format:** JSON, except the two `.csv` routes.
- **Dates:** `YYYY-MM-DD`, in Peru local time (UTC−5). Ranges include both ends.
- **Coordinates:** degrees, WGS84. GeoJSON points are `[lon, lat]`.

## Two groups of routes

| Group | What it holds | Needs |
|---|---|---|
| **Harmonized series** | 2003 to today, by department and month, in one unit | `python run_serie.py` (or `docker compose run --rm serie`) |
| **Recent week** | Raw near-real-time detections from the last days | `python run_week.py` (or `docker compose run --rm semana`) and a FIRMS key |

Build the main product on the harmonized series. The recent-week routes read the week downloaded by `run_week.py`. On a fresh clone they use the 7–14 November 2026 week that ships in the repository (`backend/data/out/fires.csv`).

## Shared conventions

### Region ids

`region_id` accepts `PE` (the whole country), a code such as `PE-CUS`, or the department name without caring about case or accents (`Cusco`, `cusco`, `San Martin`). Get the list from `/regions`. An unknown region answers `404` and the message lists the valid ones.

### Unit

All harmonized counts are in **VIIRS 375 m equivalent hotspots**. Before 20 January 2012 the value is estimated from MODIS; from that date on it is the VIIRS count.

### Fields of a month

`/calendar`, `/calendar/area` and `/anomaly` return months with these fields:

| Field | Type | Meaning |
|---|---|---|
| `year`, `month` | int | Month is 1 to 12 |
| `hs` | number | Hotspots in the harmonized unit |
| `hs_lo`, `hs_hi` | number | 10th to 90th percentile range. Equal to `hs` when the month is observed |
| `frp` | number | Fire radiative power, MW, harmonized the same way |
| `active_cells` | int | 0.02° cells with at least one detection |
| `source` | string | `MODIS_ADJ` = estimated from MODIS. `VIIRS` = observed |
| `p25`, `median`, `p75` | number | That calendar month across 2003–2022 |
| `pct_mediana` | number | `hs` as a percentage of `median` |
| `estado` | string | `bajo` (below p25), `normal`, `alto` (above p75) |

Draw months with `source: "MODIS_ADJ"` differently (the pages use a dashed border) and show `hs_lo`–`hs_hi` as the uncertainty.

### Errors

Errors are JSON: `{"detail": "message in Spanish"}`.

| Code | When |
|---|---|
| `400` | Invalid box, or start date after end date |
| `404` | Unknown region |
| `422` | A parameter has the wrong type or is out of range (FastAPI's own format) |
| `503` | The data for that route has not been built yet |

## Harmonized series

### `GET /regions`

List for the region selector.

```json
[{"id": "PE", "name": "Perú"}, {"id": "PE-PUN", "name": "Puno"}]
```

27 entries: the country plus 26 departments.

### `GET /calendar`

The whole series of one region, one item per month from January 2003. This is the main route: the year × month grid and the time series both come from it.

| Parameter | Default | Notes |
|---|---|---|
| `region_id` | `PE` | Code or name |

```json
{
  "region_id": "PE-CUS",
  "name": "Cusco",
  "baseline": "2003-2022",
  "unidad": "hotspots equivalentes VIIRS 375 m",
  "months": [
    {"year": 2003, "month": 1, "hs": 17.4, "hs_lo": 5.3, "hs_hi": 40.3,
     "frp": 146.3, "active_cells": 3, "source": "MODIS_ADJ",
     "p25": 7.8, "median": 10.0, "p75": 13.0,
     "pct_mediana": 174.3, "estado": "alto"}
  ]
}
```

To get a year total, add `hs` over that year's months.

### `GET /calendar/area`

Same answer as `/calendar`, for a box instead of a department. All four parameters are required.

| Parameter | Notes |
|---|---|
| `west`, `south`, `east`, `north` | Degrees. Needs `west < east` and `south < north`, otherwise `400` |

The answer has `"region_id": "AREA"`, `"name": "Área elegida"` and an extra `"bbox": [west, south, east, north]`. With Leaflet, send `map.getBounds()`.

For months before 2012 the box uses the conversion of the department each cell belongs to.

### `GET /anomaly`

One month of one region, with the same fields as a month of `/calendar`, plus `region_id`.

| Parameter | Default |
|---|---|
| `region_id` | `PE` |
| `year` | `2024` |
| `month` | `9` |

```json
{"region_id": "PE-UCA", "year": 2024, "month": 9, "hs": 9665.0,
 "hs_lo": 9665.0, "hs_hi": 9665.0, "frp": 106164.0, "active_cells": 2446,
 "source": "VIIRS", "p25": 3379.4, "median": 3791.4, "p75": 5169.8,
 "pct_mediana": 254.9, "estado": "alto"}
```

### `GET /heatmap`

Points for the map: one per 0.02° cell with detections in the date range, as GeoJSON. Returns the 4,000 cells with the most hotspots.

| Parameter | Default | Notes |
|---|---|---|
| `start` | `2026-08-01` | Note: `start` / `end`, not `desde` / `hasta` |
| `end` | `2026-09-30` | |
| `region_id` | `PE` | |
| `west`, `south`, `east`, `north` | none | Optional. Send all four to limit the map to a box |

```json
{
  "type": "FeatureCollection",
  "desde": "2024-09-01",
  "hasta": "2024-09-30",
  "celdas": 2446,
  "features": [
    {"type": "Feature",
     "geometry": {"type": "Point", "coordinates": [-74.99, -8.01]},
     "properties": {"hs": 90.0}}
  ]
}
```

`coordinates` is the center of the cell. Scale the color or the radius with `properties.hs`.

### `GET /ranking`

Departments ordered by hotspots in a date range, highest first.

| Parameter | Default |
|---|---|
| `desde` | `2024-01-01` |
| `hasta` | `2024-12-31` |

```json
[{"region_id": "PE-UCA", "name": "Ucayali", "hs": 18925.0}]
```

### `GET /alert`

The last days compared with the same calendar days in 2013–2025, for the country and each department.

| Parameter | Default | Notes |
|---|---|---|
| `dias` | `7` | 1 to 31 |

```json
{
  "desde": "2026-11-07", "hasta": "2026-11-13", "dias": 7,
  "base": "los mismos 7 días del calendario en 2013–2025 (13 años, VIIRS observado)",
  "unidad": "hotspots equivalentes VIIRS 375 m",
  "regla": "…",
  "nota": "…",
  "peru": {"region_id": "PE", "name": "Perú", "hs": 972.0, "p25": 388.0,
           "median": 996.0, "p75": 1592.0, "p90": 1955.8,
           "pct_mediana": 97.6, "estado": "normal"},
  "departamentos": [
    {"region_id": "PE-UCA", "name": "Ucayali", "hs": 372.0, "p25": 22.0,
     "median": 32.0, "p75": 209.0, "p90": 239.8,
     "pct_mediana": 1162.5, "estado": "inusual"}
  ]
}
```

`estado` here has four values: `bajo`, `normal`, `alto` (above p75) and `inusual` (above p90). A department with fewer than 10 hotspots is never marked `alto` or `inusual`.

Show `nota` next to the alert. The rule has not been tested against past years, and the most recent day can be incomplete, so present it as a signal to look at, not as a verified warning.

### `GET /forecast`

A monthly forecast for the months not observed yet. **It is a statistical estimate, not data.** Keep it visually apart from the observed series (another color, a "forecast" label) and show `nota` next to it.

| Parameter | Default | Notes |
|---|---|---|
| `region_id` | `PE` | Code or name |
| `year` | next year | The current year (remaining months only) or the next one. Anything else answers `400` |

```json
{
  "region_id": "PE-UCA", "name": "Ucayali", "year": 2027,
  "tipo": "pronostico",
  "unidad": "hotspots equivalentes VIIRS 375 m",
  "datos_hasta": "2026-10",
  "metodo": "…",
  "nota": "…",
  "validacion": {"…": "same content as /forecast/validation"},
  "total": 10887.0,
  "months": [
    {"year": 2027, "month": 1, "hs": 139.0, "hs_lo": 59.4, "hs_hi": 311.1, "anios_usados": 15}
  ]
}
```

`hs` is the median of that calendar month across the observed VIIRS years (2012 onward). `hs_lo`–`hs_hi` is the 10th to 90th percentile of those years. It describes a typical year and does not anticipate exceptional ones.

### `GET /forecast/validation`

How wrong the forecast was when tested on 2019–2025, each year forecast only with the data available at the end of October of the year before. Errors are fractions.

```json
{
  "prueba": "2019-2025",
  "como": "…",
  "error_departamento_mes": 0.388,
  "error_nacional_anual": 0.216,
  "dentro_del_rango": 0.666,
  "por_anio": [{"year": 2024, "previsto": 63964, "observado": 95028, "error": -0.327}]
}
```

Say these numbers whenever the forecast is shown: about 39 % off per department and month, about 22 % off on the national yearly total, and the range held the real value 67 % of the time.

### `GET /recurrence`

The prevention map: zones where fire tends to come back around a calendar date. For each zone of 0.06° (about 6.6 km a side) it counts in how many years, from 2003 on, there was fire within the window around that date. Years 2003–2011 count a MODIS detection; from 2012 on, only VIIRS. Each year is counted once, even when a zone touches two departments. MODIS misses small fires, so those years lower the frequency.

| Parameter | Default | Notes |
|---|---|---|
| `fecha` | the day after the last data | Any year works; only the day of the calendar is used. Send next year's date to plan ahead |
| `ventana` | `15` | Days on each side of the date: `7`, `15` or `30`. Anything else answers `400` |
| `region_id` | `PE` | Code or name |
| `minimo` | `0.3` | Lowest frequency to return, 0 to 1 |
| `limit` | `5000` | 1 to 20000. Most frequent first |

```json
{
  "type": "FeatureCollection",
  "tipo": "recurrencia",
  "fecha": "2027-09-15", "ventana_dias": 15,
  "ventana": {"desde": "08-31", "hasta": "09-30"},
  "region_id": "PE",
  "anios_base": [2003, 2004, "…", 2026],
  "zona_grados": 0.06,
  "metodo": "…", "nota": "…",
  "resumen": {"zonas_con_historia": 11917, "zonas_desde_30": 5166,
              "zonas_desde_50": 3390, "zonas_desde_70": 2358},
  "validacion": {"…": "same content as /recurrence/validation"},
  "features": [
    {"type": "Feature",
     "geometry": {"type": "Point", "coordinates": [-79.55, -7.43]},
     "properties": {"frecuencia": 1.0, "anios_con_fuego": 24, "anios": 24,
                    "cuales": [2003, 2004, "…"], "region_id": "PE-LAL", "name": "La Libertad"}}
  ]
}
```

`coordinates` is the center of the zone; draw a square of `zona_grados` a side. `frecuencia` is `anios_con_fuego / anios`. The current year enters `anios_base` only when its window has already passed.

Say it as "fire in 12 of 15 years", not as a probability of a wildfire. It is history that repeats, mostly seasonal agricultural burning. It uses no weather, so a very dry or very wet year changes the outcome. Show `nota` with the map.

### `GET /recurrence/place`

The yearly profile of the zone that contains a point: week by week, in how many years it had fire. Use it for "when does it usually burn here".

| Parameter | Notes |
|---|---|
| `lat`, `lon` | Required, in degrees |

```json
{
  "tipo": "recurrencia",
  "centro": [-79.55, -7.43],
  "bbox": [-79.58, -7.46, -79.52, -7.4],
  "region_id": "PE-LAL", "name": "La Libertad",
  "anios_base": [2003, "…", 2025],
  "anios_con_fuego": [2003, "…", 2025],
  "semanas_mas_frecuentes": [34, 28, 29, 30],
  "semanas": [
    {"semana": 34, "inicia": "08-20", "anios_con_fuego": 11, "frecuencia": 0.786, "cuales": [2012, "…"]}
  ]
}
```

`semanas` always has 52 items. A zone with no detections answers with empty `anios_con_fuego` and zeros.

### `GET /recurrence/validation`

How often the marked zones really burned. Each year from 2019 to 2025 was marked using only the years before it, on 25 dates across the year, and compared with what burned that year. `ventana` is `7`, `15` (default) or `30`.

```json
{
  "prueba": "2019-2025", "ventana_dias": 15, "como": "…",
  "por_frecuencia": [{"desde": 0.8, "hasta": 1.0, "zonas": 78427, "ardieron": 0.872}],
  "por_corte": [{"frecuencia_minima": 0.7, "aciertos": 0.821, "cobertura": 0.276}]
}
```

`aciertos`: of the zones marked at that frequency or more, the share that burned. `cobertura`: of the zones that burned, the share that was marked. With ±15 days: zones at 70 % or more burned 82 % of the time and held 28 % of the zones with fire; at 50 % or more, 69 % and 42 %.

### `GET /export/mensual.csv`

The monthly series as a CSV download (`calendario.csv`).

| Parameter | Default | Notes |
|---|---|---|
| `region_id` | `PE` | |
| `desde`, `hasta` | whole series | Optional |

```
region_id,year,month,hs,hs_lo,hs_hi,frp,source,estado,median
PE-UCA,2024,9,9665.0,9665.0,9665.0,106164.0,VIIRS,alto,3791.4
```

For a download button, point a link at the URL; no `fetch` is needed.

### `GET /calibration`

The conversion coefficients, two rows per department (`metric`: `hs` and `frp`). Meant for a "how we did it" panel. **All values arrive as strings**, so convert them with `Number()`.

| Field | Meaning |
|---|---|
| `version` | Version of the frozen calibration |
| `region_id`, `name` | Department |
| `metric` | `hs` or `frp` |
| `a`, `d`, `b` | `log(V+1) = a + d·high + b·log(M+1)` |
| `smear` | Duan correction factor |
| `res_p10`, `res_p90` | Residual percentiles used for the range |
| `high_months` | Months of the high season, comma separated |
| `method` | `departamento`, or the fallback used when data were too few |
| `n` | Months used in the fit |

### `GET /validation`

How well the conversion works on years the model never saw (trained on 2012–2019, tested on 2020–2022). Errors are fractions: `0.134` means 13.4 %.

```json
{
  "version": "v1-2026-11-14",
  "train": "2012-2019",
  "test": "2020-2022",
  "con_temporada": {
    "error_nacional": 0.134,
    "r2_nacional": 0.943,
    "dentro_p10_p90": 0.632,
    "error_departamento_mes": 0.243,
    "por_zona": {"Selva": 0.180, "Sierra": 0.253, "Costa": 0.515}
  },
  "sin_temporada": {"…": "same fields, model without the season term"},
  "por_departamento": {"PE-AMA": {"name": "Amazonas", "error": 0.315}}
}
```

Departments with very few fires (El Callao, Arequipa) have very large relative errors. Do not show their percentage without that context.

## Recent week

These routes read the near-real-time download. `desde` and `hasta` are optional everywhere; without them the route uses everything downloaded. The answers include `cobertura: {desde, hasta}` with the dates actually available.

Counts here are **raw detections per sensor**, not the harmonized unit. Do not mix them with `hs` from the series in the same chart.

### `GET /health`

Use it to check that the API is up and whether the week exists.

```json
{"status": "ok", "generated": "2026-11-14T20:28Z", "completo": false,
 "ventana": {"desde": "2026-11-07", "hasta": "2026-11-14"},
 "filas": 2596, "parquet": true}
```

`status` is `vacio` when the week has never been downloaded. The harmonized routes can still work in that case.

### `GET /meta`

Details of the last download: window, filters applied, rows per sensor, and notes on data quality (`calidad`, `nota_type`, `snpp`). Useful for a "data sources" footer.

### `GET /week`

Summary of the window.

```json
{
  "desde": "2026-11-07", "hasta": "2026-11-14",
  "cobertura": {"desde": "2026-11-07", "hasta": "2026-11-14"},
  "nota": "…",
  "totales": {"modis": 132, "viirs_noaa20": 1303, "viirs_noaa21": 1161,
              "asignados": 1972, "fuera": 624},
  "departamentos": [
    {"id": "PE-PUN", "name": "Puno", "modis": 0, "viirs_noaa20": 13,
     "viirs_noaa21": 13, "total": 26, "frp_mw": 0.0}
  ],
  "por_dia": [
    {"region_id": "PE-PUN", "acq_date": "2026-11-07",
     "sensor": "VIIRS_NOAA20", "hotspots": 5, "frp_mw": 12.3}
  ]
}
```

`fuera` counts detections inside the bounding box but outside Peru's polygons.

### `GET /fires`

Individual detections as GeoJSON points.

| Parameter | Default | Notes |
|---|---|---|
| `desde`, `hasta` | whole window | |
| `limit` | `5000` | 1 to 20000 |
| `sensor` | all | `MODIS`, `VIIRS_NOAA20` or `VIIRS_NOAA21` |

Each feature has `properties`: `acq_date`, `sensor`, `satellite`, `frp_mw`, `conf_level`, `dep_id`. The answer also has `total` (matches before the limit) and `cobertura`.

### `GET /events`

The detections of the window grouped into events: detections 1.2 km or less apart and one day or less apart belong to the same event, and groups chain together. Largest first. Only detections inside a Peruvian department are used.

| Parameter | Default | Notes |
|---|---|---|
| `desde`, `hasta` | whole window | |
| `region_id` | all of Peru | Code or name |
| `min_detecciones` | `3` | 1 to 100. Smaller groups are counted in `resumen` but not listed |
| `limit` | `200` | 1 to 1000 |

```json
{
  "desde": "2026-11-07", "hasta": "2026-11-14",
  "cobertura": {"desde": "2026-11-07", "hasta": "2026-11-14"},
  "region_id": "PE",
  "regla": "…", "nota": "…",
  "resumen": {"detecciones": 1972, "eventos": 162, "activos": 24, "creciendo": 6,
              "detecciones_en_eventos": 791, "detecciones_sueltas": 1181},
  "events": [
    {"id": "20261112_-9.485_-73.543", "region_id": "PE-UCA", "name": "Ucayali",
     "centro": [-73.54299, -9.48549],
     "bbox": [-73.55965, -9.4949, -73.52606, -9.47439],
     "primera_fecha": "2026-11-12", "ultima_fecha": "2026-11-13",
     "dias_con_deteccion": 2, "activo": true, "tendencia": "estable",
     "detecciones": {"total": 37, "modis": 5, "viirs_noaa20": 22, "viirs_noaa21": 10},
     "confianza_alta": 4, "frp_total_mw": 1627.5, "frp_max_mw": 362.4,
     "area_pixeles_ha": 350,
     "por_dia": [{"fecha": "2026-11-12", "detecciones": 17, "frp_mw": 1458.9}]}
  ]
}
```

| Field | Meaning |
|---|---|
| `centro` | `[lon, lat]`, the mean position |
| `bbox` | `[west, south, east, north]` |
| `activo` | `true` when the last detection is on the last day of the window or the day before |
| `tendencia` | `nuevo` (one day only), `creciendo`, `estable` or `bajando`: the last day against the earlier days of the event |
| `area_pixeles_ha` | Surface of the pixels with a detection. **An approximate ceiling, not burned area** |

What this route does not say: where the fire is heading, how fast, or whether it is a forest fire or an agricultural burn. There is no wind or spread model. Show `nota` with it.

### `GET /events/{id}`

One event with each of its detections. Same fields as an item of `/events`, plus a GeoJSON `features` list with `acq_date`, `acq_time`, `sensor`, `satellite`, `frp_mw` and `conf_level`. Send the same `desde` / `hasta` used in `/events`; an unknown id answers `404`.

### `GET /heat`

A coarse grid (0.25°) of VIIRS NOAA-20 counts for the window.

```json
{"desde": "…", "hasta": "…", "cobertura": {"…": "…"},
 "origin": [-81.5, -18.5], "step": 0.25, "min_count": 1,
 "sensor": "VIIRS_NOAA20", "cells": [[26, 42, 17]]}
```

Each cell is `[xi, yi, count]`. Its south-west corner is `lon = origin[0] + xi·step`, `lat = origin[1] + yi·step`.

### `GET /series`

Week totals per department in the shape the story page expects (`departments[].semana`). Prefer `/week` for new code.

### `GET /export.csv`

The week as CSV (`semana.csv`), one row per day and sensor.

| Parameter | Notes |
|---|---|
| `region` | **Required.** `PE` or a code such as `PE-CUS`. This route takes codes only, not names |
| `desde`, `hasta` | Optional |

Columns: `region_id, acq_date, sensor, hotspots, frp_mw`.

## Typical front-end flow

1. On load, call `/regions` for the selector and `/alert` for the alert panel.
2. When the region changes, call `/calendar?region_id=…` and draw the grid and the series.
3. When the dates or the region change, call `/heatmap?start=…&end=…&region_id=…` and draw the points.
4. For a custom area, call `/calendar/area` and `/heatmap` with the same four box parameters.
5. For next year, call `/forecast?region_id=…` and draw it apart from the observed months.
6. For downloads, link to `/export/mensual.csv`.

```js
const API = "http://127.0.0.1:8000";

async function get(path) {
  const res = await fetch(API + path);
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail || res.statusText);
  return body;
}

const regions = await get("/regions");
const cal = await get("/calendar?region_id=PE-UCA");
const heat = await get("/heatmap?start=2024-09-01&end=2024-09-30&region_id=PE-UCA");
```

Keep the base URL in one constant so it can change when the API is deployed. `web/armonizado.html` is a working example of this flow, `web/prevencion.html` of `/recurrence`, and `web/radar.html` of the recent-week routes (`/events`, `/fires`, `/alert`, `/forecast`).
