# Pantalla Método · cifras y afirmaciones a cotejar con el algoritmo

Estado de cada dato de la pantalla. Todo lo marcado **PROTOTIPO** viene del
`calendario-del-fuego.html` (modelo de regresión sobre FIRMS) y debe
reemplazarse con la salida del algoritmo de armonización final.

## Datos que la pantalla consume (`data.ts`, `regions.ts`)

| Dato                                                                      | Dónde se ve                                 | Origen actual                                                              | Qué debe entregar el backend                           |
| ------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| `SERIES.raw` (23 valores)                                                 | Gráfico "Pruébalo", salto ×8,9              | PROTOTIPO: MODIS + VIIRS sumados, Perú, vegetación, confianza nominal+alta | Suma anual sin armonizar por sensor, mismo filtro      |
| `SERIES.harmonized`                                                       | Gráfico, ×1,3, ejemplo 2011                 | PROTOTIPO: mediana del modelo, escala VIIRS                                | Serie anual armonizada                                 |
| `SERIES.low` / `SERIES.high`                                              | Banda de rango, "rango probable" 2011       | PROTOTIPO: suma de cuantiles mensuales p10–p90 de residuos                 | Intervalo de incertidumbre (definir si p10–p90 u otro) |
| `REGION_FITS` (26 filas: a, d, b, meses, temporada alta, propio/nacional) | Pestaña "Parámetros por región", "20 de 26" | PROTOTIPO                                                                  | Parámetros reales por unidad territorial               |
| `NATIONAL_FIT` (a=1,69; d=0; b=0,98; n=3 219)                             | Pestaña Modelo                              | PROTOTIPO                                                                  | Parámetros del ajuste nacional                         |

## Cifras escritas a mano en la página (`page.tsx`, `TechPanel.tsx`)

| Cifra                                                                     | Valor                 | Origen                            | Pendiente                  |
| ------------------------------------------------------------------------- | --------------------- | --------------------------------- | -------------------------- |
| Factor VIIRS/MODIS en Perú                                                | ×4,8                  | PROTOTIPO (ratio sobre 2012–2022) | Recalcular                 |
| R² del total mensual                                                      | 0,98                  | PROTOTIPO, prueba 2020–2022       | Métrica del pipeline final |
| Error mensual típico                                                      | ±11 %                 | PROTOTIPO                         | Idem                       |
| Meses dentro del rango                                                    | 78 %                  | PROTOTIPO                         | Idem                       |
| Entrenamiento / prueba                                                    | 2012–2019 / 2020–2022 | PROTOTIPO                         | Confirmar ventanas         |
| "23 años"                                                                 | 2003–2025             | Rango del dataset                 | Confirmar fechas finales   |
| "Ajuste desde 2012–2022", "menos de 24 meses con fuego → ajuste nacional" | —                     | Regla del PROTOTIPO               | Confirmar regla            |

## Hechos externos (verificables, no dependen del algoritmo)

- MODIS: píxel nominal de 1 km; VIIRS 375 m (banda I): documentación NASA FIRMS.
- MODIS observa desde 2000 (Terra); VIIRS 375 m activo desde 2012 (Suomi-NPP); NOAA-20 en FIRMS desde abril de 2018.
- Imagen comparativa: NASA Worldview (GIBS), 30-ago-2020, bbox lat −9,6…−8,1 / lon −75,9…−73,5.
  Capas `MODIS_Terra_Thermal_Anomalies_All` y `VIIRS_SNPP_Thermal_Anomalies_375m_All`
  sobre `MODIS_Terra_CorrectedReflectance_TrueColor`.
  - **Ubicación:** Amazonía central, alrededor de Pucallpa. Reparto del recuadro por
    departamento (puntos en rejilla sobre los límites del prototipo): ≈75 % Ucayali,
    ≈19 % Huánuco, ≈5 % Loreto, <1 % Pasco. No se afirma "Ucayali" a secas.
  - **Recuentos (≈):** MODIS ≈31 marcas, VIIRS ≈227 (diferencia de cada imagen contra la
    misma escena sin capa de focos; componentes conexos ≥3 px). Dos focos muy juntos
    pueden fundirse en una marca, así que son mínimos. Razón ≈7× en **esta escena**, que no
    es el factor medio (×4,8, prototipo).
  - Es ilustración visual, no un conteo oficial: Terra y Suomi-NPP pasan a horas distintas.

## Texto que NO debe afirmar más de lo que se sabe

- Se dice "buena parte de ese salto no es fuego nuevo", no "todo": tras armonizar
  queda un salto residual (×1,3).
- La descripción del modelo (log, d·temporada_alta, smearing de Duan) es la del
  prototipo. Si el algoritmo final difiere, actualizar la pestaña "Modelo".
