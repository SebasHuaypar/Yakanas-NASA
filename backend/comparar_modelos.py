"""Method comparison. No job runs this: it is evidence, not the model that is served.

Writes data/out/modelos_comparacion.json. The file that already exists is kept
if this script is not run.

Usage:  python comparar_modelos.py
"""
import json

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from app.config import OUT
from app.modelo import ENTRENA_DESDE, FECHAS, VENTANA
from run_modelo import armar, juntar, leer

PRUEBA = range(2019, 2026)
METODOS = {
    "recurrencia": None,
    "regresion_lineal": lambda: make_pipeline(StandardScaler(), LinearRegression()),
    "regresion_logistica": lambda: make_pipeline(StandardScaler(), LogisticRegression(max_iter=300)),
    "bosque_aleatorio": lambda: RandomForestClassifier(
        n_estimators=60, min_samples_leaf=50, max_samples=200_000, n_jobs=-1, random_state=0),
    "gradient_boosting": lambda: HistGradientBoostingClassifier(
        max_iter=200, learning_rate=0.08, random_state=0),
}


def comparar(partes: dict) -> dict:
    medidas: dict[str, list] = {nombre: [] for nombre in METODOS}
    for anio in PRUEBA:
        x_ent, y_ent = juntar(partes, range(ENTRENA_DESDE, anio))
        x, y = juntar(partes, [anio])
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
    d = leer()
    partes = armar(d)
    resultado = comparar(partes)
    salida = {
        "pregunta": f"¿Habrá fuego en una zona de 0,06° a {VENTANA} días o menos de una fecha, el año siguiente?",
        "prueba": f"{PRUEBA[0]}-{PRUEBA[-1]}",
        **resultado,
    }
    destino = OUT / "modelos_comparacion.json"
    destino.write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Escrito {destino}")


if __name__ == "__main__":
    main()
