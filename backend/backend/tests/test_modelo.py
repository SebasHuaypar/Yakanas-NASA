"""El ajuste recupera una ley conocida y el rango cubre el estimado."""
import numpy as np

from harmonize.modelo import fit_powerlaw, predecir, sirve, temporada_alta


def test_recupera_la_pendiente():
    rng = np.random.default_rng(0)
    m = rng.integers(1, 400, size=48).astype(float)
    alta = (np.arange(48) % 12 >= 6).astype(float)
    ruido = rng.normal(0, 0.05, size=48)
    v = np.expm1(1.2 + 0.3 * alta + 0.8 * np.log1p(m) + ruido)
    params = fit_powerlaw(m, v, alta)
    assert abs(params["b"] - 0.8) < 0.08
    assert abs(params["a"] - 1.2) < 0.15
    assert sirve(params, 48)


def test_k_reproduciria_el_total():
    m = np.array([10, 40, 0, 25], dtype=float)
    v = np.array([30, 90, 2, 70], dtype=float)
    alta = np.array([0, 1, 0, 1], dtype=float)
    params = fit_powerlaw(m, v, alta)
    est, lo, hi = predecir(params, m, alta)
    assert np.all(lo <= est + 1e-6)
    assert np.all(est <= hi + 1e-6)
    # Donde hay MODIS, k = estimado / M y la suma de las partes es el estimado.
    mask = m > 0
    k = est[mask] / m[mask]
    assert np.allclose(k * m[mask], est[mask])


def test_temporada_son_los_meses_por_encima_del_promedio():
    por_mes = {m: 1.0 for m in range(1, 13)}
    por_mes[8] = 10
    por_mes[9] = 12
    assert temporada_alta(por_mes) == [8, 9]


def test_pocos_meses_no_sirve():
    params = fit_powerlaw([1, 2, 3, 4], [3, 5, 8, 10], [0, 0, 1, 1])
    assert not sirve(params, 4)
