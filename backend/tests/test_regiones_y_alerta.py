"""Region name or code, bounding box, and alert. Does not need the Parquet files."""
from datetime import date

import pytest
from fastapi import HTTPException

from app import calendario

NOMBRES = {"PE-CUS": "Cusco", "PE-SAM": "San Martín", "PE-UCA": "Ucayali"}


@pytest.fixture(autouse=True)
def nombres(monkeypatch):
    monkeypatch.setattr(calendario, "_nombres", lambda: NOMBRES)


@pytest.mark.parametrize("entrada,esperado", [
    ("PE-CUS", "PE-CUS"), ("pe-cus", "PE-CUS"), ("Cusco", "PE-CUS"), (" cusco ", "PE-CUS"),
    ("San Martín", "PE-SAM"), ("san martin", "PE-SAM"), ("PE", "PE"), ("Perú", "PE"),
])
def test_acepta_codigo_o_nombre(entrada, esperado):
    assert calendario.resolver(entrada) == esperado


def test_region_desconocida_lista_las_validas():
    with pytest.raises(HTTPException) as err:
        calendario.resolver("CuZco")
    assert err.value.status_code == 404
    assert "PE-CUS" in err.value.detail


def test_recuadro_invertido_es_un_error():
    with pytest.raises(HTTPException) as err:
        calendario._recuadro((-69.0, -13.0, -70.0, -12.0))
    assert err.value.status_code == 400


def test_cuantiles_y_29_de_febrero():
    assert calendario._cuantil([0, 10, 20, 30, 40], 0.5) == 20
    assert calendario._cuantil([], 0.9) == 0.0
    assert calendario._mismo_dia(date(2024, 2, 29), 2023) == date(2023, 2, 28)
