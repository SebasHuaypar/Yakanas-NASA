"""Model features: they use only earlier years, and the saved model is consistent."""
import json
from datetime import date, timedelta

import duckdb
import numpy as np
import pytest

from app import modelo
from app.almacen import guardar_atomico, publicar


def _tabla(filas):
    con = duckdb.connect()
    con.execute("CREATE TABLE t (xi BIGINT, yi BIGINT, year BIGINT, acq_date_local VARCHAR, hs_h DOUBLE)")
    con.executemany("INSERT INTO t VALUES (?, ?, ?, ?, ?)", filas)
    return con


HISTORIA = [(0, 0, y, f"{y}-09-1{y % 5}", 2.0) for y in (2012, 2013, 2014)]
OBJETIVO = [(0, 0, 2015, "2015-09-10", 3.0), (30, 30, 2015, "2015-09-10", 1.0)]
FIN = [(60, 60, 2016, "2016-01-05", 1.0)]    # makes 2015 a complete year
DIA = 253   # 10 September 2015


def _variables(filas):
    d = modelo.cargar(_tabla(filas), "t")
    return d, modelo.variables(d, DIA, 2015, modelo.anual_de(d))


def test_solo_entran_zonas_con_historia_y_la_recurrencia_es_la_esperada():
    d, (x, con_historia, m, k) = _variables(HISTORIA + OBJETIVO + FIN)
    assert d["ultimo"] == 2016
    assert d["ultimo_fecha"] == date(2016, 1, 5)
    assert x.shape == (1, len(modelo.VARIABLES))      # the zone with no earlier years is left out
    assert x[0, 0] == 1.0                              # it burned in the window in all 3 years
    assert m[con_historia, k][0] == 1                  # and the label is that it burned in 2015


def test_las_variables_no_ven_el_anio_que_se_predice():
    _, (con_objetivo, *_) = _variables(HISTORIA + OBJETIVO + FIN)
    _, (sin_objetivo, *_) = _variables(HISTORIA + [(30, 30, 2015, "2015-01-01", 1.0)] + FIN)
    np.testing.assert_array_equal(con_objetivo, sin_objetivo)


def test_la_ventana_incompleta_no_entra_al_entrenamiento():
    ultimo = date(2026, 11, 15)
    assert modelo.ventana_completa(2026, 15, ultimo)
    assert not modelo.ventana_completa(2026, ultimo.timetuple().tm_yday, ultimo)
    limite = (ultimo - timedelta(days=modelo.VENTANA)).timetuple().tm_yday
    assert modelo.ventana_completa(2026, limite, ultimo)
    assert not modelo.ventana_completa(2026, limite + 1, ultimo)
    pares = modelo.fechas_entrenables(ultimo)
    assert (2026, 15) in pares
    assert all(modelo.ventana_completa(anio, dia, ultimo) for anio, dia in pares)
    assert (2026, 345) not in pares


def test_un_fallo_no_sobrescribe_el_modelo(tmp_path):
    destino = tmp_path / "modelo_logistico.json"
    destino.write_text('{"viejo": true}', encoding="utf-8")

    def fallar():
        raise RuntimeError("el ajuste no terminó")

    with pytest.raises(RuntimeError):
        publicar(destino, fallar)
    assert json.loads(destino.read_text(encoding="utf-8")) == {"viejo": True}
    assert not (tmp_path / "modelo_logistico.json.tmp").exists()


def test_la_escritura_atomica_reemplaza_el_archivo(tmp_path):
    destino = tmp_path / "modelo_logistico.json"
    destino.write_text('{"viejo": true}', encoding="utf-8")
    guardar_atomico(destino, '{"nuevo": true}')
    assert json.loads(destino.read_text(encoding="utf-8")) == {"nuevo": True}
    assert not destino.with_name(destino.name + ".tmp").exists()


def test_el_modelo_guardado_tiene_un_peso_por_variable():
    if not modelo.GUARDADO.exists():
        return
    g = json.loads(modelo.GUARDADO.read_text(encoding="utf-8"))
    assert g["variables"] == modelo.VARIABLES
    assert len(g["coeficientes"]) == len(g["media"]) == len(g["escala"]) == len(modelo.VARIABLES)
    assert 0 < g["tasa_base"] < 1
