"""The forecast uses only the history before the cutoff."""
from app.pronostico import _historia, _mes

DATOS = {("PE-X", y, 9): float(v) for y, v in zip(range(2012, 2017), (10, 30, 20, 50, 40))}


def test_historia_respeta_el_corte():
    assert _historia(DATOS, "PE-X", 9, (2014, 12)) == [10.0, 30.0, 20.0]
    # with a cutoff in August 2014, September 2014 does not exist yet
    assert _historia(DATOS, "PE-X", 9, (2014, 8)) == [10.0, 30.0]


def test_mes_es_la_mediana_con_su_rango():
    m = _mes(DATOS, "PE-X", 9, (2016, 12))
    assert m["hs"] == 30.0
    assert m["hs_lo"] <= m["hs"] <= m["hs_hi"]
    assert m["anios_usados"] == 5
