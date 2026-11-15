"""Variables del modelo: usan solo años anteriores y el modelo guardado es coherente."""
import json

import duckdb
import numpy as np

from app import modelo


def _tabla(filas):
    con = duckdb.connect()
    con.execute("CREATE TABLE t (xi BIGINT, yi BIGINT, year BIGINT, acq_date_local VARCHAR, hs_h DOUBLE)")
    con.executemany("INSERT INTO t VALUES (?, ?, ?, ?, ?)", filas)
    return con


HISTORIA = [(0, 0, y, f"{y}-09-1{y % 5}", 2.0) for y in (2012, 2013, 2014)]
OBJETIVO = [(0, 0, 2015, "2015-09-10", 3.0), (30, 30, 2015, "2015-09-10", 1.0)]
FIN = [(60, 60, 2016, "2016-01-05", 1.0)]    # hace que 2015 sea un año completo
DIA = 253   # 10 de septiembre de 2015


def _variables(filas):
    d = modelo.cargar(_tabla(filas), "t")
    return d, modelo.variables(d, DIA, 2015, modelo.anual_de(d))


def test_solo_entran_zonas_con_historia_y_la_recurrencia_es_la_esperada():
    d, (x, con_historia, m, k) = _variables(HISTORIA + OBJETIVO + FIN)
    assert d["ultimo"] == 2015
    assert x.shape == (1, len(modelo.VARIABLES))      # la zona sin años anteriores no entra
    assert x[0, 0] == 1.0                              # ardió en la ventana los 3 años
    assert m[con_historia, k][0] == 1                  # y la respuesta es que ardió en 2015


def test_las_variables_no_ven_el_anio_que_se_predice():
    _, (con_objetivo, *_) = _variables(HISTORIA + OBJETIVO + FIN)
    _, (sin_objetivo, *_) = _variables(HISTORIA + [(30, 30, 2015, "2015-01-01", 1.0)] + FIN)
    np.testing.assert_array_equal(con_objetivo, sin_objetivo)


def test_el_modelo_guardado_tiene_un_peso_por_variable():
    if not modelo.GUARDADO.exists():
        return
    g = json.loads(modelo.GUARDADO.read_text(encoding="utf-8"))
    assert g["variables"] == modelo.VARIABLES
    assert len(g["coeficientes"]) == len(g["media"]) == len(g["escala"]) == len(modelo.VARIABLES)
    assert 0 < g["tasa_base"] < 1
