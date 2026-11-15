"""Modelo de riesgo: regresión logística entrenada con la tabla armonizada.

Pregunta: ¿habrá fuego en una zona de 0,06° (unos 6,6 km) a 15 días o menos de una
fecha del calendario, en la próxima temporada? Las variables salen de los años
anteriores (la recurrencia en varias ventanas, los vecinos, la intensidad y la
época del año) y el modelo pesa cada una con lo que aprendió de 2016 a 2025.

Aquí vive el cálculo de las variables, que usan por igual el entrenamiento
(run_modelo.py) y la API, para que lo validado sea lo que se sirve. La API no
necesita scikit-learn: el modelo se guarda como coeficientes en
data/out/modelo_logistico.json y aquí se evalúa con numpy.
"""
import json
from datetime import date, timedelta
from functools import lru_cache

import numpy as np
from fastapi import HTTPException

from app.calendario import ORIGEN, PASO, _conexion, _nombres, resolver
from app.config import OUT
from app.recurrencia import _datos as _recurrencia

LADO = 3                       # celdas de 0,02° por lado de la zona
GRADOS = PASO * LADO           # 0,06°
DESDE = 2012                   # años con VIIRS observado
VENTANA = 15                   # días a cada lado de la fecha
FECHAS = [15 + 30 * i for i in range(12)]      # un día por mes, como día del año
ENTRENA_DESDE = 2016           # primer año usado como respuesta (necesita historia antes)
BASE = 100_000                 # para juntar (zx, zy) en un solo número
CORTES = (0.3, 0.5, 0.7)
GUARDADO = OUT / "modelo_logistico.json"
COMPARACION = OUT / "modelos_comparacion.json"
VARIABLES = [
    "f_ventana",    # años con fuego en la ventana / años mirados: es la recurrencia
    "f_ult3",       # lo mismo, solo los 3 últimos años
    "ardio_ult",    # si ardió en la ventana el último año
    "anios_desde",  # años desde la última vez
    "f_vecinos",    # recurrencia media de las 8 zonas vecinas
    "f_ancha",      # recurrencia con ventana de ±30 días
    "f_angosta",    # recurrencia con ventana de ±7 días
    "f_anual",      # años con fuego en cualquier fecha
    "log_hs",       # intensidad media cuando ardió
    "sin", "cos",   # época del año
]


def cargar(con, fuente: str) -> dict:
    """Lee la tabla armonizada (`fuente` es un nombre de tabla o read_parquet(...))."""
    filas = con.execute(f"""
        SELECT xi // {LADO}, yi // {LADO}, year, dayofyear(CAST(acq_date_local AS DATE)), hs_h
        FROM {fuente} WHERE year >= {DESDE}""").fetchall()
    zx, zy, anio, doy, hs = (np.array(c) for c in zip(*filas))
    zona = zx * BASE + zy
    zonas = np.unique(zona)
    pos = {z: i for i, z in enumerate(zonas.tolist())}
    return {
        "zonas": zonas, "zi": np.array([pos[z] for z in zona.tolist()]),
        "anio": anio, "doy": doy, "hs": hs, "n": len(zonas),
        "ultimo": int(anio.max()) - 1,       # último año completo
        "vecinos": [[pos[z + dx * BASE + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                     if (dx or dy) and (z + dx * BASE + dy) in pos] for z in zonas.tolist()],
    }


def anual_de(d: dict) -> np.ndarray:
    """Zona × año: si hubo fuego en cualquier fecha del año (solo años completos)."""
    anual = np.zeros((d["n"], d["ultimo"] - DESDE + 1), dtype=np.float32)
    m = d["anio"] <= d["ultimo"]
    anual[d["zi"][m], d["anio"][m] - DESDE] = 1
    return anual


def _matriz(d: dict, dia: int, ventana: int, sumar_hs: bool = False) -> np.ndarray:
    """Zona × año: si hubo fuego (o cuántos hotspots) a `ventana` días o menos de ese día del año."""
    dist = np.abs(d["doy"] - dia)
    m = (np.minimum(dist, 365 - dist) <= ventana) & (d["anio"] <= d["ultimo"])
    out = np.zeros((d["n"], d["ultimo"] - DESDE + 1), dtype=np.float32)
    if sumar_hs:
        np.add.at(out, (d["zi"][m], d["anio"][m] - DESDE), d["hs"][m])
    else:
        out[d["zi"][m], d["anio"][m] - DESDE] = 1
    return out


def variables(d: dict, dia: int, anio: int, anual: np.ndarray):
    """Variables de cada zona con los años anteriores a `anio`.

    Devuelve (x, con_historia, m, k): x tiene una fila por zona con historia,
    m es la matriz zona × año de la ventana y k la columna de `anio` en ella.
    """
    k = anio - DESDE
    m, ancha, angosta, hs = (_matriz(d, dia, VENTANA), _matriz(d, dia, 30),
                             _matriz(d, dia, 7), _matriz(d, dia, VENTANA, True))
    h = m[:, :k]
    con_historia = anual[:, :k].sum(1) > 0
    f = h.mean(1)
    al_reves = h[:, ::-1]
    desde = np.where(al_reves.any(1), al_reves.argmax(1), k).astype(np.float32)
    vecinos = np.array([f[v].mean() if v else 0 for v in d["vecinos"]], dtype=np.float32)
    x = np.column_stack([
        f, h[:, -3:].mean(1), h[:, -1], desde, vecinos, ancha[:, :k].mean(1), angosta[:, :k].mean(1),
        anual[:, :k].mean(1), np.log1p(hs[:, :k].sum(1) / np.maximum(h.sum(1), 1)),
        np.full(d["n"], np.sin(2 * np.pi * dia / 365)), np.full(d["n"], np.cos(2 * np.pi * dia / 365)),
    ])
    return x[con_historia], con_historia, m, k


def tabla(d: dict, dia: int, anio: int, anual: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Variables y respuesta (si ardió ese año) de las zonas con historia."""
    x, con_historia, m, k = variables(d, dia, anio, anual)
    return x, m[con_historia, k]


# ---- API -----------------------------------------------------------------

@lru_cache(maxsize=1)
def _modelo() -> dict:
    if not GUARDADO.exists():
        raise HTTPException(status_code=503, detail="Aún no hay modelo entrenado. Ejecuta python run_modelo.py")
    return json.loads(GUARDADO.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _datos() -> dict:
    d = cargar(_conexion(), "fire_cell_day")
    d["anual"] = anual_de(d)
    return d


@lru_cache(maxsize=16)
def _riesgo(dia: int):
    """Probabilidad de cada zona con historia para ese día del año."""
    mod, d = _modelo(), _datos()
    x, con_historia, _, _ = variables(d, dia, d["ultimo"] + 1, d["anual"])
    z = ((x - np.array(mod["media"])) / np.array(mod["escala"])) @ np.array(mod["coeficientes"]) + mod["intercepto"]
    return d["zonas"][con_historia], x[:, 0], 1 / (1 + np.exp(-z))


def _centro(z: int) -> tuple[float, float]:
    zx, zy = divmod(z, BASE)
    return (round(ORIGEN[0] + (zx + 0.5) * GRADOS, 4), round(ORIGEN[1] + (zy + 0.5) * GRADOS, 4))


def validacion() -> dict:
    """Prueba 2019-2025 con años que cada modelo no vio, guardada por run_modelo.py."""
    if not COMPARACION.exists():
        raise HTTPException(status_code=503, detail="Aún no hay comparación. Ejecuta python run_modelo.py")
    c = json.loads(COMPARACION.read_text(encoding="utf-8"))
    return {
        "prueba": c["prueba"], "pregunta": c["pregunta"], "como_leer": c["como_leer"],
        "regresion_logistica": c["metodos"]["regresion_logistica"],
        "recurrencia": c["metodos"]["recurrencia"],
    }


def info() -> dict:
    mod = _modelo()
    pesos = sorted(zip(VARIABLES, mod["coeficientes"]), key=lambda t: -abs(t[1]))
    return {
        "modelo": "regresion_logistica", "variables": VARIABLES,
        "entrenado_con": mod["entrenado_con"], "filas_de_entrenamiento": mod["filas"],
        "tasa_base": mod["tasa_base"],
        "pesos": [{"variable": v, "peso": round(float(w), 3)} for v, w in pesos],
        "como_leer_los_pesos": "Con las variables estandarizadas, un peso positivo sube la probabilidad "
                               "de fuego y uno negativo la baja; cuanto mayor el valor absoluto, más pesa. f_ventana, f_ancha y "
                               "f_angosta son la misma recurrencia con ventanas distintas y se reparten el peso entre sí.",
        "validacion": validacion(),
    }


def mapa(fecha: date | None, region_id: str, minimo: float, limite: int) -> dict:
    mod, d = _modelo(), _datos()
    fecha = fecha or (date.today() + timedelta(days=1))
    dep = resolver(region_id)
    zonas, frec, prob = _riesgo(fecha.timetuple().tm_yday)
    deps = _recurrencia()["dep"]
    nombres = _nombres()
    orden = np.argsort(-prob, kind="stable")
    elegidas = [i for i in orden.tolist()
                if prob[i] >= minimo and (dep == "PE" or deps.get(int(zonas[i])) == dep)]
    en_region = [i for i in range(len(zonas)) if dep == "PE" or deps.get(int(zonas[i])) == dep]
    features = [
        {"type": "Feature",
         "geometry": {"type": "Point", "coordinates": list(_centro(int(zonas[i])))},
         "properties": {"probabilidad": round(float(prob[i]), 3), "frecuencia": round(float(frec[i]), 3),
                        "region_id": deps.get(int(zonas[i]), ""),
                        "name": nombres.get(deps.get(int(zonas[i]), ""), "")}}
        for i in elegidas[:limite]
    ]
    return {
        "type": "FeatureCollection",
        "tipo": "modelo",
        "modelo": "regresion_logistica",
        "fecha": fecha.isoformat(),
        "ventana_dias": VENTANA,
        "region_id": dep,
        "anios_base": list(range(DESDE, d["ultimo"] + 1)),
        "entrenado_con": mod["entrenado_con"],
        "zona_grados": GRADOS,
        "metodo": f"Una regresión logística calcula, para cada zona de {GRADOS:.2f}° (unos 6,6 km), la "
                  f"probabilidad de que haya fuego a {VENTANA} días o menos de esa fecha del calendario. Usa "
                  "como variables la recurrencia de los años anteriores (ventanas de 7, 15 y 30 días), la de las "
                  "zonas vecinas, la intensidad pasada y la época del año, y se entrenó con años pasados "
                  "probando siempre con años que no había visto.",
        "nota": "Aprende de la historia del fuego: no usa lluvia, viento ni sequía, así que un año atípico "
                "cambia el resultado. La probabilidad es relativa a esta base de datos, no la de un incendio "
                "concreto, y no cubre todo el fuego: sirve para priorizar dónde prevenir.",
        "resumen": {
            "zonas_con_historia": len(en_region),
            **{f"zonas_desde_{int(c * 100)}": sum(1 for i in en_region if prob[i] >= c) for c in CORTES},
        },
        "validacion": validacion(),
        "features": features,
    }
