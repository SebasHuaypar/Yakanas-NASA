"""Retrains the logistic regression that the API serves.

Input is the harmonized cell-day table (data/processed/fire_cell_day.parquet).
It does not compare other methods: it only writes data/out/modelo_logistico.json.

Usage:  pip install -r requirements-modelo.txt  &&  python run_modelo.py
"""
import json
import time
import warnings
from datetime import datetime, timezone

import duckdb
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from app.almacen import REGISTRO, bajar, publicar, subir_atomico
from app.config import PROCESSED
from app.modelo import (
    ENTRENA_DESDE, FECHAS, GUARDADO, VARIABLES, _fecha, anual_de, cargar, fechas_entrenables, tabla,
)

warnings.filterwarnings("ignore")

TABLA = PROCESSED / "fire_cell_day.parquet"


def leer() -> dict:
    """Step 1: read the harmonized table and check for duplicates."""
    con = duckdb.connect()
    fuente = f"read_parquet('{TABLA.as_posix()}')"
    total, repetidas, frontera = con.execute(f"""
        WITH g AS (SELECT cell, acq_date_local, COUNT(*) n, COUNT(DISTINCT dep_id) deps FROM {fuente} GROUP BY 1, 2)
        SELECT SUM(n), SUM(CASE WHEN n > 1 THEN n - 1 ELSE 0 END),
               SUM(CASE WHEN n > 1 AND deps = n THEN n - 1 ELSE 0 END) FROM g""").fetchone()
    d = cargar(con, fuente)
    return {**d, "filas": int(total), "repetidas": int(repetidas), "repetidas_por_frontera": int(frontera)}


def armar(d: dict) -> dict:
    """One row per date and year, only when the window is fully observed."""
    anual = anual_de(d)
    partes = {}
    for anio, dia in fechas_entrenables(d["ultimo_fecha"]):
        partes[(dia, anio)] = tabla(d, dia, anio, anual)
    return partes


def juntar(partes: dict, anios) -> tuple[np.ndarray, np.ndarray]:
    pares = [(dia, anio) for anio in anios for dia in FECHAS if (dia, anio) in partes]
    return (np.vstack([partes[par][0] for par in pares]),
            np.concatenate([partes[par][1] for par in pares]))


def entrenar_final(d: dict, partes: dict) -> dict:
    """The model the API serves. It is stored as coefficients only."""
    x, y = juntar(partes, range(ENTRENA_DESDE, d["ultimo"] + 1))
    modelo = make_pipeline(StandardScaler(), LogisticRegression(max_iter=300)).fit(x, y)
    esc, reg = modelo.named_steps["standardscaler"], modelo.named_steps["logisticregression"]
    guardado = {
        "modelo": "regresion_logistica", "variables": VARIABLES,
        "entrenado_con": f"{ENTRENA_DESDE}-{d['ultimo']}", "filas": int(len(y)), "tasa_base": round(float(y.mean()), 4),
        "media": esc.mean_.tolist(), "escala": esc.scale_.tolist(),
        "coeficientes": reg.coef_[0].tolist(), "intercepto": float(reg.intercept_[0]),
    }
    return guardado


def _registro(final: dict, hasta: str, ejecutado: str) -> dict:
    pesos = sorted(
        ({"variable": v, "peso": round(float(w), 3)} for v, w in zip(VARIABLES, final["coeficientes"])),
        key=lambda fila: -abs(fila["peso"]),
    )
    return {
        "ejecutado": ejecutado,
        "datos_hasta": hasta,
        "filas": final["filas"],
        "entrenado_con": final["entrenado_con"],
        "pesos": pesos,
    }


def anexar_registro(fila: dict) -> None:
    previo = REGISTRO.read_text(encoding="utf-8") if REGISTRO.exists() else ""
    if previo and not previo.endswith("\n"):
        previo += "\n"
    guardar_atomico(REGISTRO, previo + json.dumps(fila, ensure_ascii=False) + "\n")


def main() -> None:
    inicio = time.time()
    bajar()
    d = leer()
    print(f"Tabla armonizada: {d['filas']} filas; {d['repetidas']} comparten celda y día, "
          f"{d['repetidas_por_frontera']} de ellas por estar en el límite entre dos departamentos.")
    partes = armar(d)
    if not partes:
        raise SystemExit(f"No hay fechas con la ventana cerrada hasta {d['ultimo_fecha']}. No se toca el modelo.")
    final = entrenar_final(d, partes)
    ejecutado = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    texto = json.dumps({**final, "reentrenado": ejecutado}, ensure_ascii=False, indent=1)
    publicar(GUARDADO, lambda: texto)
    fila = _registro(final, d["ultimo_fecha"].isoformat(), ejecutado)
    anexar_registro(fila)
    subir_atomico(GUARDADO)
    subir_atomico(REGISTRO)
    ultima = max(_fecha(anio, dia) for dia, anio in partes)
    print(
        f"Entrenado hasta {d['ultimo_fecha'].isoformat()} "
        f"(última fecha objetivo {ultima.isoformat()}, {final['filas']} filas) "
        f"en {time.time() - inicio:.0f} s"
    )


if __name__ == "__main__":
    main()
