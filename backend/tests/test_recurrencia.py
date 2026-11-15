"""Calendar windows and the years that enter the recurrence."""
from datetime import date

import numpy as np

from app.recurrencia import DESDE, _anios, _cerca


def test_la_ventana_da_la_vuelta_al_anio():
    doy = np.array([1, 10, 180, 360, 365])
    assert _cerca(doy, 3, 7).tolist() == [True, True, False, False, True]


def test_solo_entran_los_anios_con_la_ventana_terminada():
    ultimo = date(2026, 11, 13)
    assert _anios(date(2027, 9, 15), 15, ultimo)[-1] == 2026      # September 2026 has already passed
    assert _anios(date(2027, 11, 20), 15, ultimo)[-1] == 2025     # November 2026 has not finished
    assert _anios(date(2027, 9, 15), 15, ultimo)[0] == DESDE == 2003


def test_los_anios_de_prueba_no_ven_su_propio_anio():
    assert max(_anios(date(2020, 9, 15), 15, date(2026, 11, 13), hasta=2019)) == 2019
