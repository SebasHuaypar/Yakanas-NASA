"""Risk model: logistic regression trained on the harmonized table.

Question: will a 0.06° zone (about 6.6 km) burn within 15 days of a calendar
date in the coming season? The features come from earlier years (recurrence
over several windows, neighbors, intensity, and time of year) and the model
weights each one from what it learned between 2016 and 2025.

The feature calculation lives here and is shared by training (run_modelo.py)
and the API, so what was validated is what gets served. The API does not need
scikit-learn: the model is stored as coefficients in
data/out/modelo_logistico.json and evaluated here with numpy.
"""
import json
import time
from datetime import date, timedelta
from functools import lru_cache

import numpy as np
from fastapi import HTTPException

from app.calendario import ORIGEN, PASO, _conexion, _nombres, resolver
from app.config import OUT
from app.recurrencia import _datos as _recurrencia

LADO = 3                       # 0.02° cells along each side of a zone
GRADOS = PASO * LADO           # 0.06°
DESDE = 2012                   # years with observed VIIRS
VENTANA = 15                   # days on each side of the date
FECHAS = [15 + 30 * i for i in range(12)]      # one day per month, as day of year
ENTRENA_DESDE = 2016           # first year used as the label (needs history before it)
BASE = 100_000                 # packs (zx, zy) into one number
CORTES = (0.3, 0.5, 0.7)
GUARDADO = OUT / "modelo_logistico.json"
COMPARACION = OUT / "modelos_comparacion.json"
REGISTRO = OUT / "reentrenamientos.jsonl"
RECARGA_SEGUNDOS = 300
_MODELO = {"datos": None, "mtime": None, "visto": 0.0}
VARIABLES = [
    "f_ventana",    # years with fire in the window / years looked at: the recurrence
    "f_ult3",       # the same, using only the last 3 years
    "ardio_ult",    # whether it burned in the window last year
    "anios_desde",  # years since the last time
    "f_vecinos",    # mean recurrence of the 8 neighboring zones
    "f_ancha",      # recurrence with a ±30 day window
    "f_angosta",    # recurrence with a ±7 day window
    "f_anual",      # years with fire on any date
    "log_hs",       # mean intensity on the years it burned
    "sin", "cos",   # time of year
]


def cargar(con, fuente: str) -> dict:
    """Reads the harmonized table (`fuente` is a table name or read_parquet(...))."""
    filas = con.execute(f"""
        SELECT xi // {LADO}, yi // {LADO}, year, dayofyear(CAST(acq_date_local AS DATE)), hs_h
        FROM {fuente} WHERE year >= {DESDE}""").fetchall()
    zx, zy, anio, doy, hs = (np.array(c) for c in zip(*filas))
    indice = int(np.argmax(anio.astype(np.int64) * 1000 + doy.astype(np.int64)))
    zona = zx * BASE + zy
    zonas = np.unique(zona)
    pos = {z: i for i, z in enumerate(zonas.tolist())}
    return {
        "zonas": zonas, "zi": np.array([pos[z] for z in zona.tolist()]),
        "anio": anio, "doy": doy, "hs": hs, "n": len(zonas),
        "ultimo": int(anio.max()),
        "ultimo_doy": int(doy[anio == anio.max()].max()),
        "ultimo_fecha": _fecha(int(anio[indice]), int(doy[indice])),
        "vecinos": [[pos[z + dx * BASE + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                     if (dx or dy) and (z + dx * BASE + dy) in pos] for z in zonas.tolist()],
    }


def anual_de(d: dict) -> np.ndarray:
    """Zone by year: whether there was fire on any date that year (complete years only)."""
    anual = np.zeros((d["n"], d["ultimo"] - DESDE + 1), dtype=np.float32)
    m = d["anio"] <= d["ultimo"]
    anual[d["zi"][m], d["anio"][m] - DESDE] = 1
    return anual


def _matriz(d: dict, dia: int, ventana: int, sumar_hs: bool = False) -> np.ndarray:
    """Zone by year: whether there was fire (or how many hotspots) within `ventana` days of that day of year."""
    dist = np.abs(d["doy"] - dia)
    m = (np.minimum(dist, 365 - dist) <= ventana) & (d["anio"] <= d["ultimo"])
    out = np.zeros((d["n"], d["ultimo"] - DESDE + 1), dtype=np.float32)
    if sumar_hs:
        np.add.at(out, (d["zi"][m], d["anio"][m] - DESDE), d["hs"][m])
    else:
        out[d["zi"][m], d["anio"][m] - DESDE] = 1
    return out


def variables(d: dict, dia: int, anio: int, anual: np.ndarray):
    """Features for each zone using the years before `anio`.

    Returns (x, con_historia, m, k): x has one row per zone with history,
    m is the zone-by-year window matrix, and k is the column of `anio` in it.
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


def _fecha(anio: int, dia: int) -> date:
    return date(anio, 1, 1) + timedelta(days=dia - 1)


def ventana_completa(anio: int, dia: int, ultimo: date, margen: int = VENTANA) -> bool:
    """The ±margen-day window has already ended in the data: date + margen <= last day."""
    return _fecha(anio, dia) + timedelta(days=margen) <= ultimo


def fechas_entrenables(ultimo: date) -> list[tuple[int, int]]:
    """Years and days of year whose window is already closed. The rest are not labeled 'no fire'."""
    return [
        (anio, dia)
        for anio in range(ENTRENA_DESDE, ultimo.year + 1)
        for dia in FECHAS
        if ventana_completa(anio, dia, ultimo)
    ]


def tabla(d: dict, dia: int, anio: int, anual: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Features and label (whether it burned that year) for zones with history."""
    x, con_historia, m, k = variables(d, dia, anio, anual)
    return x, m[con_historia, k]


# ---- API -----------------------------------------------------------------

def _modelo() -> dict:
    """Reads the JSON again if it changed. The check runs every RECARGA_SEGUNDOS."""
    ahora = time.time()
    if _MODELO["datos"] is not None and ahora - _MODELO["visto"] < RECARGA_SEGUNDOS:
        return _MODELO["datos"]
    from app.almacen import bajar
    bajar()
    _MODELO["visto"] = ahora
    if not GUARDADO.exists():
        raise HTTPException(status_code=503, detail="Aún no hay modelo entrenado. Ejecuta python run_modelo.py")
    mtime = GUARDADO.stat().st_mtime
    if _MODELO["datos"] is None or mtime != _MODELO["mtime"]:
        _MODELO["datos"] = json.loads(GUARDADO.read_text(encoding="utf-8"))
        _MODELO["mtime"] = mtime
    return _MODELO["datos"]


def ultimo_reentrenamiento() -> str | None:
    if not REGISTRO.exists():
        return None
    lineas = [ln for ln in REGISTRO.read_text(encoding="utf-8").splitlines() if ln.strip()]
    if not lineas:
        return None
    return json.loads(lineas[-1]).get("ejecutado")


@lru_cache(maxsize=1)
def _datos() -> dict:
    d = cargar(_conexion(), "fire_cell_day")
    d["anual"] = anual_de(d)
    return d


@lru_cache(maxsize=16)
def _riesgo(dia: int):
    """Probability for each zone with history on that day of year."""
    mod, d = _modelo(), _datos()
    x, con_historia, _, _ = variables(d, dia, d["ultimo"] + 1, d["anual"])
    z = ((x - np.array(mod["media"])) / np.array(mod["escala"])) @ np.array(mod["coeficientes"]) + mod["intercepto"]
    return d["zonas"][con_historia], x[:, 0], 1 / (1 + np.exp(-z))


def _centro(z: int) -> tuple[float, float]:
    zx, zy = divmod(z, BASE)
    return (round(ORIGEN[0] + (zx + 0.5) * GRADOS, 4), round(ORIGEN[1] + (zy + 0.5) * GRADOS, 4))


def validacion() -> dict:
    """2019-2025 test stored in modelos_comparacion.json."""
    if not COMPARACION.exists():
        raise HTTPException(status_code=503, detail="Aún no hay comparación. El archivo modelos_comparacion.json se conserva como evidencia.")
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
        "ultimo_reentrenamiento": ultimo_reentrenamiento(),
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
