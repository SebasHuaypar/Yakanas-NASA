"""Segundo pipeline: compara métodos para predecir dónde habrá fuego.

Entra la tabla armonizada por celda y día (data/processed/fire_cell_day.parquet,
la que escribe run_serie.py). No toca la armonización ni la API.

Pregunta: una zona de 0,06° (unos 6,6 km), ¿tendrá fuego a 15 días o menos de una
fecha del calendario, el año que viene? Cada método recibe solo años anteriores
al que se prueba (2019 a 2025) y se mide contra lo que ardió de verdad.

Uso:  pip install -r requirements-modelo.txt  &&  python run_modelo.py
Sale: data/out/modelos_comparacion.json y data/out/modelo_logistico.json (el que sirve la API)
"""
import json
import time
import warnings

import duckdb
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from app.config import OUT, PROCESSED
from app.modelo import (ENTRENA_DESDE, FECHAS, GUARDADO, VARIABLES, VENTANA, anual_de, cargar, tabla)

warnings.filterwarnings("ignore")

TABLA = PROCESSED / "fire_cell_day.parquet"
PRUEBA = range(2019, 2026)
METODOS = {
    "recurrencia": None,   # la regla que ya sirve la API: ordenar por f_ventana
    "regresion_lineal": lambda: make_pipeline(StandardScaler(), LinearRegression()),
    "regresion_logistica": lambda: make_pipeline(StandardScaler(), LogisticRegression(max_iter=300)),
    "bosque_aleatorio": lambda: RandomForestClassifier(
        n_estimators=60, min_samples_leaf=50, max_samples=200_000, n_jobs=-1, random_state=0),
    "gradient_boosting": lambda: HistGradientBoostingClassifier(
        max_iter=200, learning_rate=0.08, random_state=0),
}


def leer() -> dict:
    """Paso 1: leer la tabla armonizada y revisar repetidos."""
    con = duckdb.connect()
    fuente = f"read_parquet('{TABLA.as_posix()}')"
    total, repetidas, frontera = con.execute(f"""
        WITH g AS (SELECT cell, acq_date_local, COUNT(*) n, COUNT(DISTINCT dep_id) deps FROM {fuente} GROUP BY 1, 2)
        SELECT SUM(n), SUM(CASE WHEN n > 1 THEN n - 1 ELSE 0 END),
               SUM(CASE WHEN n > 1 AND deps = n THEN n - 1 ELSE 0 END) FROM g""").fetchone()
    d = cargar(con, fuente)
    return {**d, "filas": int(total), "repetidas": int(repetidas), "repetidas_por_frontera": int(frontera)}


def armar(d: dict) -> dict:
    """Una fila por fecha y año. El año en curso solo entra hasta el último día observado."""
    anual = anual_de(d)
    partes = {}
    for anio in range(ENTRENA_DESDE, d["ultimo"] + 1):
        for dia in FECHAS:
            if anio == d["ultimo"] and dia > d["ultimo_doy"]:
                continue
            partes[(dia, anio)] = tabla(d, dia, anio, anual)
    return partes


def juntar(partes: dict, anios) -> tuple[np.ndarray, np.ndarray]:
    pares = [(dia, anio) for anio in anios for dia in FECHAS if (dia, anio) in partes]
    return (np.vstack([partes[par][0] for par in pares]),
            np.concatenate([partes[par][1] for par in pares]))


def entrenar_final(d: dict, partes: dict) -> dict:
    """Paso 4: el modelo que sirve la API, con todos los años completos; se guarda como coeficientes."""
    x, y = juntar(partes, range(ENTRENA_DESDE, d["ultimo"] + 1))
    modelo = make_pipeline(StandardScaler(), LogisticRegression(max_iter=300)).fit(x, y)
    esc, reg = modelo.named_steps["standardscaler"], modelo.named_steps["logisticregression"]
    guardado = {
        "modelo": "regresion_logistica", "variables": VARIABLES,
        "entrenado_con": f"{ENTRENA_DESDE}-{d['ultimo']}", "filas": int(len(y)), "tasa_base": round(float(y.mean()), 4),
        "media": esc.mean_.tolist(), "escala": esc.scale_.tolist(),
        "coeficientes": reg.coef_[0].tolist(), "intercepto": float(reg.intercept_[0]),
    }
    GUARDADO.write_text(json.dumps(guardado, ensure_ascii=False, indent=1), encoding="utf-8")
    return guardado


def comparar(d: dict, partes: dict) -> dict:
    """Paso 3: cada año de prueba se entrena con los anteriores y se mide con ese año."""
    medidas: dict[str, list] = {n: [] for n in METODOS}
    for anio in PRUEBA:
        x_ent, y_ent = juntar(partes, range(ENTRENA_DESDE, anio))
        x, y = juntar(partes, [anio])
        # Todos marcan el mismo número de zonas que la recurrencia con 7 de 10 años o más.
        marcadas = int((x[:, 0] >= 0.7).sum())
        for nombre, crear in METODOS.items():
            if crear is None:
                p = x[:, 0]
            else:
                modelo = crear().fit(x_ent, y_ent)
                p = modelo.predict_proba(x)[:, 1] if hasattr(modelo, "predict_proba") else np.clip(modelo.predict(x), 0, 1)
            orden = np.argsort(-p, kind="stable")[:marcadas]
            medidas[nombre].append((
                roc_auc_score(y, p), average_precision_score(y, p), brier_score_loss(y, p),
                y[orden].mean(), y[orden].sum() / y.sum()))
        print(f"  {anio} listo", flush=True)

    campos = ("auc", "precision_media", "brier", "aciertos_zonas_marcadas", "cobertura_zonas_marcadas")
    return {
        "filas_de_entrenamiento_y_prueba": int(sum(len(v[1]) for v in partes.values())),
        "metodos": {n: {c: round(float(v), 3) for c, v in zip(campos, np.mean(r, 0))} for n, r in medidas.items()},
        "precision_media_por_anio": {n: {str(a): round(float(f[1]), 3) for a, f in zip(PRUEBA, r)}
                                     for n, r in medidas.items()},
    }


def main() -> None:
    inicio = time.time()
    from app.almacen import bajar, subir
    bajar()
    d = leer()
    print(f"Tabla armonizada: {d['filas']} filas; {d['repetidas']} comparten celda y día, "
          f"{d['repetidas_por_frontera']} de ellas por estar en el límite entre dos departamentos.")
    partes = armar(d)
    r = comparar(d, partes)
    final = entrenar_final(d, partes)
    mejor = max(r["metodos"], key=lambda n: r["metodos"][n]["precision_media"])
    salida = {
        "pregunta": f"¿Habrá fuego en una zona de 0,06° a {VENTANA} días o menos de una fecha, el año siguiente?",
        "entrada": "data/processed/fire_cell_day.parquet (tabla armonizada por celda y día)",
        "prueba": f"{PRUEBA[0]}-{PRUEBA[-1]}, cada año con modelos entrenados solo con años anteriores",
        "revision_de_repetidos": {
            "filas": d["filas"], "comparten_celda_y_dia": d["repetidas"],
            "por_limite_entre_departamentos": d["repetidas_por_frontera"],
            "nota": "Una celda en el límite entre dos departamentos tiene una fila por departamento, "
                    "con sus propios hotspots: no es doble conteo. Al pasar a zonas se cuentan una vez.",
        },
        "variables": VARIABLES,
        "como_leer": {
            "precision_media": "Qué tan bien ordena las zonas de más a menos probable; 1 es perfecto.",
            "auc": "Probabilidad de que una zona que ardió quede por encima de una que no.",
            "brier": "Error de la probabilidad; más bajo es mejor.",
            "aciertos_zonas_marcadas": "De las zonas marcadas, cuántas ardieron. Todos los métodos marcan "
                                       "el mismo número: las que la recurrencia da con 7 de 10 años o más.",
            "cobertura_zonas_marcadas": "De las zonas que ardieron, cuántas estaban marcadas.",
        },
        **r,
        "mejor_por_precision_media": mejor,
    }
    (OUT / "modelos_comparacion.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n{'método':22} prec.media  AUC    Brier  aciertos  cobertura")
    for n, v in r["metodos"].items():
        print(f"{n:22} {v['precision_media']:.3f}       {v['auc']:.3f}  {v['brier']:.3f}  "
              f"{v['aciertos_zonas_marcadas']:.3f}     {v['cobertura_zonas_marcadas']:.3f}")
    print(f"\nMejor por precisión media: {mejor}. Escritos modelos_comparacion.json y modelo_logistico.json (entrenado con {final['entrenado_con']}) en {time.time() - inicio:.0f} s")
    subir()


if __name__ == "__main__":
    main()
