"""Ley de potencia con temporada, la misma que describe NuevoPlan.

log(V+1) = a + d·alta + b·log(M+1)
El estimado vuelve a conteos con el smearing de Duan.
"""
import numpy as np

B_MIN = 0.5
B_MAX = 1.3
MIN_MESES = 24
MIN_TOTAL = 1500


def fit_powerlaw(m, v, high=None) -> dict:
    m = np.asarray(m, dtype=float)
    v = np.asarray(v, dtype=float)
    if len(m) < 3:
        raise ValueError("hacen falta al menos 3 meses para ajustar")
    x = np.log1p(m)
    y = np.log1p(v)
    h = np.zeros_like(x) if high is None else np.asarray(high, dtype=float)
    coef, *_ = np.linalg.lstsq(np.column_stack([np.ones_like(x), h, x]), y, rcond=None)
    a, d, b = (float(coef[0]), float(coef[1]), float(coef[2]))
    res = y - (a + d * h + b * x)
    return {
        "a": a,
        "d": d,
        "b": b,
        "smear": float(np.mean(np.exp(res))),
        "res_p10": float(np.quantile(res, 0.10)),
        "res_p90": float(np.quantile(res, 0.90)),
        "n": int(len(m)),
    }


def predecir(params: dict, m, high):
    m = np.asarray(m, dtype=float)
    h = np.asarray(high, dtype=float)
    pred = params["a"] + params["d"] * h + params["b"] * np.log1p(m)
    est = np.exp(pred) * params["smear"] - 1.0
    lo = np.exp(pred + params["res_p10"]) * params["smear"] - 1.0
    hi = np.exp(pred + params["res_p90"]) * params["smear"] - 1.0
    return np.clip(est, 0, None), np.clip(lo, 0, None), np.clip(hi, 0, None)


def sirve(params: dict, meses_con_fuego: int, total: float | None = None) -> bool:
    """Descarta ajustes con pocos meses, poca quema o pendiente fuera de rango."""
    if total is not None and total < MIN_TOTAL:
        return False
    return meses_con_fuego >= MIN_MESES and B_MIN <= params["b"] <= B_MAX


def temporada_alta(por_mes: dict[int, float]) -> list[int]:
    """Meses cuyo promedio supera el promedio de los doce meses."""
    if not por_mes:
        return []
    media = float(np.mean([por_mes.get(m, 0.0) for m in range(1, 13)]))
    return [m for m in range(1, 13) if por_mes.get(m, 0.0) > media]
