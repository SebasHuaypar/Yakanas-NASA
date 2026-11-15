"""Monthly forecast by department.

A seasonal baseline: for each month, the median of that same month in the years
with observed VIIRS (from 2012), with the range between the 10th and 90th
percentiles. Adjusting it with the last 12 months of activity did not reduce
the error, so that adjustment is not used. Error is measured by forecasting
2019–2025 with only the data available at the end of October of the year before.
"""
from functools import lru_cache
from statistics import median

from fastapi import HTTPException

from app.calendario import _conexion, _cuantil, _nombres, resolver
from app.config import VIIRS_DESDE as DESDE
PRUEBA = range(2019, 2026)
UNIDAD = "hotspots equivalentes VIIRS 375 m"


@lru_cache(maxsize=1)
def _datos() -> tuple[dict, tuple[int, int]]:
    """{(dep, year, month): hs} and the last complete month of the series."""
    con = _conexion()
    filas = con.execute(
        "SELECT dep_id, year, month, hs FROM region_month WHERE year >= ?", [DESDE]
    ).fetchall()
    datos = {(d, int(y), int(m)): float(h) for d, y, m, h in filas}
    ultimo_y, ultimo_m = max((y, m) for _, y, m in datos)
    # The last month of the series is still in progress: it does not enter the history.
    completo = (ultimo_y, ultimo_m - 1) if ultimo_m > 1 else (ultimo_y - 1, 12)
    for clave in [k for k in datos if (k[1], k[2]) > completo]:
        del datos[clave]
    peru: dict[tuple, float] = {}
    for (_, y, m), h in datos.items():
        peru[("PE", y, m)] = peru.get(("PE", y, m), 0.0) + h
    datos.update(peru)
    return datos, completo


def _historia(datos: dict, dep: str, mes: int, hasta: tuple[int, int]) -> list[float]:
    """That calendar month in every available year up to the cutoff (year, month)."""
    return [
        datos[(dep, y, mes)]
        for y in range(DESDE, hasta[0] + 1)
        if (dep, y, mes) in datos and (y, mes) <= hasta
    ]


def _mes(datos: dict, dep: str, mes: int, corte: tuple[int, int]) -> dict:
    h = sorted(_historia(datos, dep, mes, corte))
    return {
        "hs": round(median(h), 1),
        "hs_lo": round(_cuantil(h, 0.10), 1),
        "hs_hi": round(_cuantil(h, 0.90), 1),
        "anios_usados": len(h),
    }


@lru_cache(maxsize=1)
def validacion() -> dict:
    datos, _ = _datos()
    deps = sorted({d for d, _, _ in datos if d != "PE"})
    error = total = dentro = n = 0.0
    por_anio = []
    for anio in PRUEBA:
        corte = (anio - 1, 10)
        previsto = real = 0.0
        for dep in deps:
            for mes in range(1, 13):
                p = _mes(datos, dep, mes, corte)
                a = datos[(dep, anio, mes)]
                error += abs(p["hs"] - a)
                total += a
                dentro += p["hs_lo"] <= a <= p["hs_hi"]
                n += 1
                previsto += p["hs"]
                real += a
        por_anio.append({
            "year": anio, "previsto": round(previsto), "observado": round(real),
            "error": round((previsto - real) / real, 3),
        })
    return {
        "prueba": f"{PRUEBA[0]}-{PRUEBA[-1]}",
        "como": "Cada año se pronosticó solo con los datos disponibles a fines de octubre del año anterior.",
        "error_departamento_mes": round(error / total, 3),
        "error_nacional_anual": round(sum(abs(f["error"]) for f in por_anio) / len(por_anio), 3),
        "dentro_del_rango": round(dentro / n, 3),
        "por_anio": por_anio,
    }


def pronostico(region_id: str, year: int | None) -> dict:
    dep = resolver(region_id)
    datos, completo = _datos()
    year = year or completo[0] + 1
    if year < completo[0] or year > completo[0] + 1:
        raise HTTPException(
            status_code=400,
            detail=f"El pronóstico cubre {completo[0]} (meses que faltan) y {completo[0] + 1}",
        )
    meses = []
    for mes in range(1, 13):
        if (year, mes) <= completo:
            continue  # that month is already observed: it is queried on /calendar
        meses.append({"year": year, "month": mes, **_mes(datos, dep, mes, completo)})
    v = validacion()
    return {
        "region_id": dep,
        "name": "Perú" if dep == "PE" else _nombres().get(dep, dep),
        "year": year,
        "tipo": "pronostico",
        "unidad": UNIDAD,
        "datos_hasta": f"{completo[0]}-{completo[1]:02d}",
        "metodo": f"Mediana de ese mes en los años con VIIRS observado ({DESDE} en adelante). "
                  "El rango va del percentil 10 al 90 de esos años.",
        "nota": "Es una estimación estadística de un año típico, no una observación ni un aviso. "
                f"Al probarla contra {v['prueba']} se equivocó en promedio "
                f"{round(v['error_departamento_mes'] * 100)} % por departamento y mes y "
                f"{round(v['error_nacional_anual'] * 100)} % en el total anual del país; "
                f"el rango contuvo el valor real {round(v['dentro_del_rango'] * 100)} % de las veces. "
                "No anticipa años excepcionales.",
        "validacion": v,
        "total": round(sum(m["hs"] for m in meses), 1),
        "months": meses,
    }
