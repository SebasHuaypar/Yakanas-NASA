# Método — serie anclada en VIIRS

El plan inicial conectaba el backend con `calendario-del-fuego.html` y dejaba la armonización en el navegador. Este plan lo sustituye por el modelo de `NuevoPlan.md`, dentro del mismo proyecto.

La página de la historia no se reescribe y no se le pisan las series embebidas. La serie nueva vive en su propia página, `armonizado.html`, y en endpoints nuevos. La API de la semana (`/week`, `/fires`, `/heat`) sigue filtrando el Parquet de noviembre de 2026.

## Qué cambia respecto del plan inicial

| Plan inicial | Este modelo |
|---|---|
| Contar focos MODIS y un VIIRS, y armonizar en el navegador | La serie publicada ya está en hotspots equivalentes VIIRS 375 m |
| `VAy` suma todos los VIIRS del año | Un solo satélite por día. Sumar satélites infla la serie desde 2018 |
| H3 y el mapa de celdas quedaban para después | La unidad del archivo es la celda-día |
| El mes se cortaba en UTC | La fecha es la local de Perú, UTC−5 |
| VIIRS desde enero de 2012 | VIIRS observado desde el 20 de enero de 2012; antes, MODIS convertido |

Se deja fuera de esta ejecución, a propósito: PostgreSQL, el zip `modis-viirs-peru`, Supabase y la acción diaria. Docker sí está, sin contenedor de base de datos. El propio modelo ofrece DuckDB sobre Parquet como el camino del hackathon, y el proyecto ya corre así. La grilla es de 0,02° (unos 5 km²), el equivalente local de una celda H3 de resolución 7.

## La serie

1. Esquema común para MODIS y VIIRS: familia, satélite, fecha local, confianza `low/nominal/high`, FRP, tipo y si el archivo es estándar o NRT.
2. Confianza nominal o alta. En MODIS, 30 a 79 es nominal y 80 o más es alta.
3. Solo vegetación (`type = 0`). El NRT no trae `type`: se descartan las celdas que en el archivo estándar alguna vez fueron volcán, fuente fija o mar (`type` 1, 2 o 3).
4. Una detección es única por familia, satélite, hora y posición. Si el mismo punto llega en estándar y en NRT, se queda el estándar.
5. Cada detección cae en una celda de 0,02° y en un solo departamento. Los polígonos son los anillos de `web/calendario-del-fuego.html`, con Lima Metropolitana restada de Lima.
6. Un VIIRS por día: NOAA-20 desde abril de 2018; S-NPP antes, o ese día si NOAA-20 no tuvo detecciones; NOAA-21 solo de respaldo.
7. Con los totales mensuales de 2012–2022 se ajusta, por departamento:

```
log(V + 1) = a + d · alta + b · log(M + 1)
```

`alta` vale 1 en los meses cuyo promedio de VIIRS supera el promedio de los doce meses de ese departamento. El departamento usa los coeficientes nacionales si tiene menos de 24 meses con fuego, menos de 1500 hotspots VIIRS en 2012–2022, o si `b` cae fuera de 0,5–1,3. Así Callao y Moquegua, con muy poca quema, no se quedan con un ajuste local inestable. El estimado vuelve a conteos con el smearing de Duan y guarda el percentil 10 y 90 del residuo.

Antes del 20 de enero de 2012 cada celda-día MODIS se multiplica por `k = estimado / M` de su departamento y mes, así la suma de las celdas reproduce el total mensual estimado. Desde esa fecha la celda guarda el VIIRS observado y el rango es ese mismo valor. El FRP lleva su propio ajuste.

La calibración publicada usa 2012–2022 y queda congelada en `calibration_factors.csv` con versión `v1-2026-11-14`. La validación entrena con 2012–2019 y mide 2020–2022, sin ver esos años.

## Datos

Archivo por país, sin MAP_KEY:

```
data/raw/sp/MODIS/2003.csv … 2025.csv
data/raw/sp/VIIRS_SNPP/2012.csv … 2025.csv
data/raw/sp/VIIRS_NOAA20/2018.csv … 2025.csv
```

NOAA-20 está publicado como `viirs-jpss1`. NOAA-21 no tiene archivo por país; solo entra el NRT de la semana ya descargada, y solo los días en que NOAA-20 no tuvo detecciones.

Salida:

| Archivo | Qué es |
|---|---|
| `data/processed/fire_cell_day.parquet` | celda, día, departamento, `hs_h`, `hs_lo`, `hs_hi`, FRP, fuente |
| `data/processed/region_month.parquet` | departamento y mes, con los meses en cero |
| `data/out/calibration_factors.csv` | `a`, `d`, `b`, smear, p10, p90, meses altos |
| `data/out/validation.json` | error con y sin temporada |
| `data/out/armonizado.json` | cobertura y resumen |

Los Parquet no se versionan. La calibración y la validación sí.

## API y puesta en marcha

Las rutas, sus parámetros y las respuestas están en [API.md](API.md). Cómo instalar y correr el proyecto, con o sin Docker, está en el [README](../README.md).

## Qué queda para cuando haya base de datos

Cargar `fire_cell_day` en PostgreSQL + PostGIS, aceptar un polígono dibujado con `ST_Intersects` (hoy el área es un recuadro) y publicar la actualización diaria. Hasta entonces el mapa y el CSV filtran por departamento o por el intervalo de fechas, que es lo que esta ejecución deja funcionando.
