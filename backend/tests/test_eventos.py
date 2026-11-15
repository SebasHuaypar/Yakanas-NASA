"""Agrupar detecciones en eventos."""
from app.eventos import _area_ha, _tendencia, agrupar


def p(lat, lon, dia, sensor="VIIRS_NOAA20"):
    return {"lat": lat, "lon": lon, "dia": dia, "sensor": sensor}


def test_cerca_y_el_mismo_dia_es_un_evento():
    assert len(agrupar([p(-9.0, -74.0, 1), p(-9.005, -74.0, 1)])) == 1


def test_lejos_son_dos_eventos():
    assert len(agrupar([p(-9.0, -74.0, 1), p(-9.05, -74.0, 1)])) == 2


def test_cerca_pero_con_dias_de_diferencia_son_dos():
    assert len(agrupar([p(-9.0, -74.0, 1), p(-9.0, -74.0, 4)])) == 2


def test_un_frente_que_avanza_se_encadena():
    cadena = [p(-9.0 - 0.008 * i, -74.0, 1 + i) for i in range(4)]
    assert len(agrupar(cadena)) == 1


def test_area_cuenta_pixeles_distintos():
    mismo_pixel = [p(-9.0, -74.0, 1), p(-9.0, -74.0, 1, "VIIRS_NOAA21")]
    assert _area_ha(mismo_pixel) == 14.0
    assert _area_ha([p(-9.0, -74.0, 1, "MODIS")]) == 100.0


def test_tendencia():
    dia = lambda n: {"detecciones": n}
    assert _tendencia([dia(5)]) == "nuevo"
    assert _tendencia([dia(4), dia(10)]) == "creciendo"
    assert _tendencia([dia(10), dia(2)]) == "bajando"
    assert _tendencia([dia(10), dia(10)]) == "estable"
