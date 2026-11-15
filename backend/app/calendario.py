"""Calendario, anomalía y mapa de la serie armonizada."""
import csv
import io
import json
import unicodedata
from datetime import date, timedelta

import duckdb
from fastapi import HTTPException

from app.config import OUT, PROCESSED, VIIRS_DESDE

PASO = 0.02
ORIGEN = (-81.5, -18.5)


def _conexion():
    from app.almacen import bajar
    bajar()
    meses = PROCESSED / "region_month.parquet"
    celdas = PROCESSED / "fire_cell_day.parquet"
    if not meses.exists() or not celdas.exists():
        raise HTTPException(status_code=503, detail="No está la serie armonizada. Ejecuta python run_serie.py")
    con = duckdb.connect()
    con.execute(f"CREATE VIEW region_month AS SELECT * FROM read_parquet('{meses.as_posix()}')")
    con.execute(f"CREATE VIEW fire_cell_day AS SELECT * FROM read_parquet('{celdas.as_posix()}')")
    return con


def _nombres() -> dict[str, str]:
    path = OUT / "regiones.json"
    if path.exists():
        return {fila["id"]: fila["name"] for fila in json.loads(path.read_text(encoding="utf-8"))}
    csv_path = OUT / "calibration_factors.csv"
    if not csv_path.exists():
        return {}
    nombres = {}
    with csv_path.open(encoding="utf-8") as fh:
        for fila in csv.DictReader(fh):
            nombres[fila["region_id"]] = fila["name"]
    return nombres


def regiones() -> list[dict]:
    nombres = _nombres()
    return [{"id": "PE", "name": "Perú"}] + [
        {"id": i, "name": n} for i, n in nombres.items()
    ]


def _plano(texto: str) -> str:
    """Minúsculas y sin tildes: 'San Martín' y 'san martin' son lo mismo."""
    base = unicodedata.normalize("NFD", texto.strip().lower())
    return "".join(c for c in base if unicodedata.category(c) != "Mn")


def resolver(region_id: str) -> str:
    """Acepta el código (PE-CUS, pe-cus) o el nombre (Cusco, san martin). PE o Perú es todo el país."""
    clave = _plano(region_id)
    if clave in ("pe", "peru"):
        return "PE"
    nombres = _nombres()
    for codigo, nombre in nombres.items():
        if clave in (_plano(codigo), _plano(nombre)):
            return codigo
    validos = ", ".join(f"{c} ({n})" for c, n in sorted(nombres.items()))
    raise HTTPException(status_code=404, detail=f"Región desconocida: {region_id}. Usa PE o una de: {validos}")


def _serie(con, region_id: str) -> list[dict]:
    region_id = resolver(region_id)
    if region_id == "PE":
        sql = """
            SELECT year, month, SUM(hs) AS hs, SUM(hs_lo) AS hs_lo, SUM(hs_hi) AS hs_hi,
                   SUM(frp) AS frp, SUM(active_cells) AS active_cells
            FROM region_month GROUP BY year, month ORDER BY year, month
        """
        args: list = []
    else:
        sql = """
            SELECT year, month, hs, hs_lo, hs_hi, frp, active_cells, source
            FROM region_month WHERE dep_id = ? ORDER BY year, month
        """
        args = [region_id]
    cols = [d[0] for d in con.execute(sql, args).description]
    filas = [dict(zip(cols, row)) for row in con.execute(sql, args).fetchall()]
    return _clasificar(filas)


def _clasificar(filas: list[dict]) -> list[dict]:
    """Añade a cada mes la mediana 2003–2022, p25, p75 y el estado bajo / normal / alto."""
    base = [f for f in filas if 2003 <= int(f["year"]) <= 2022]
    clima: dict[int, list[float]] = {}
    for f in base:
        clima.setdefault(int(f["month"]), []).append(float(f["hs"]))
    stats = {}
    for mes, valores in clima.items():
        arr = sorted(valores)
        def q(p):
            if not arr:
                return 0.0
            i = (len(arr) - 1) * p
            lo, hi = int(i), min(int(i) + 1, len(arr) - 1)
            return arr[lo] * (1 - (i - lo)) + arr[hi] * (i - lo)
        stats[mes] = {"p25": q(0.25), "median": q(0.50), "p75": q(0.75)}
    salida = []
    for f in filas:
        mes = int(f["month"])
        st = stats.get(mes, {"p25": 0.0, "median": 0.0, "p75": 0.0})
        hs = float(f["hs"])
        if not clima:
            estado = "sin_base"
        elif hs > st["p75"]:
            estado = "alto"
        elif hs < st["p25"]:
            estado = "bajo"
        else:
            estado = "normal"
        mediana = st["median"]
        salida.append({
            "year": int(f["year"]),
            "month": mes,
            "hs": round(hs, 1),
            "hs_lo": round(float(f["hs_lo"]), 1),
            "hs_hi": round(float(f["hs_hi"]), 1),
            "frp": round(float(f["frp"]), 1),
            "active_cells": int(f["active_cells"]),
            "source": f.get("source") or ("MODIS_ADJ" if (int(f["year"]), mes) < (2012, 2) else "VIIRS"),
            "p25": round(st["p25"], 1),
            "median": round(mediana, 1),
            "p75": round(st["p75"], 1),
            "pct_mediana": None if mediana == 0 else round(100 * hs / mediana, 1),
            "estado": estado,
        })
    return salida


def calendario(region_id: str) -> dict:
    con = _conexion()
    region_id = resolver(region_id)
    nombres = _nombres()
    return {
        "region_id": region_id,
        "name": "Perú" if region_id == "PE" else nombres.get(region_id, region_id),
        "baseline": "2003-2022",
        "unidad": "hotspots equivalentes VIIRS 375 m",
        "months": _serie(con, region_id),
    }


def anomalia(region_id: str, year: int, month: int) -> dict:
    region_id = resolver(region_id)
    meses = _serie(_conexion(), region_id)
    for fila in meses:
        if fila["year"] == year and fila["month"] == month:
            return {"region_id": region_id, **fila}
    raise HTTPException(status_code=404, detail=f"No hay {year}-{month:02d} para {region_id}")


def ranking(desde: date, hasta: date) -> list[dict]:
    con = _conexion()
    nombres = _nombres()
    filas = con.execute(
        """
        SELECT dep_id, SUM(hs) AS hs
        FROM region_month
        WHERE make_date(year, month, 1) BETWEEN ? AND ?
        GROUP BY dep_id
        ORDER BY hs DESC
        """,
        [desde.replace(day=1), hasta.replace(day=1)],
    ).fetchall()
    return [{"region_id": dep, "name": nombres.get(dep, dep), "hs": round(float(hs), 1)} for dep, hs in filas]


def _recuadro(caja: tuple[float, float, float, float]) -> tuple[str, list]:
    """Filtro SQL de las celdas cuyo centro cae en (oeste, sur, este, norte)."""
    oeste, sur, este, norte = caja
    if not (-180 <= oeste < este <= 180 and -90 <= sur < norte <= 90):
        raise HTTPException(status_code=400, detail="Recuadro inválido: hace falta west < east y south < north, en grados")
    sql = f"({ORIGEN[0]} + (xi + 0.5) * {PASO}) BETWEEN ? AND ? AND ({ORIGEN[1]} + (yi + 0.5) * {PASO}) BETWEEN ? AND ?"
    return sql, [oeste, este, sur, norte]


def calor(desde: date, hasta: date, region_id: str = "PE", limite: int = 4000,
          caja: tuple[float, float, float, float] | None = None) -> dict:
    con = _conexion()
    filtro = "acq_date_local BETWEEN ? AND ?"
    args: list = [desde.isoformat(), hasta.isoformat()]
    region_id = resolver(region_id)
    if caja is not None:
        sql_caja, args_caja = _recuadro(caja)
        filtro += " AND " + sql_caja
        args += args_caja
    elif region_id != "PE":
        filtro += " AND dep_id = ?"
        args.append(region_id)
    total = con.execute(
        f"""
        SELECT COUNT(*) FROM (
            SELECT xi, yi FROM fire_cell_day
            WHERE {filtro}
            GROUP BY xi, yi
        )
        """,
        args,
    ).fetchone()[0]
    filas = con.execute(
        f"""
        SELECT xi, yi, SUM(hs_h) AS hs
        FROM fire_cell_day
        WHERE {filtro}
        GROUP BY xi, yi
        ORDER BY hs DESC
        LIMIT ?
        """,
        [*args, limite],
    ).fetchall()
    features = []
    for xi, yi, hs in filas:
        lon = ORIGEN[0] + (int(xi) + 0.5) * PASO
        lat = ORIGEN[1] + (int(yi) + 0.5) * PASO
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [round(lon, 5), round(lat, 5)]},
            "properties": {"hs": round(float(hs), 2)},
        })
    return {
        "type": "FeatureCollection",
        "desde": desde.isoformat(),
        "hasta": hasta.isoformat(),
        "celdas": int(total),
        "features": features,
    }


def area(oeste: float, sur: float, este: float, norte: float) -> dict:
    """El mismo calendario para un recuadro elegido por el usuario (lat/lon)."""
    con = _conexion()
    sql_caja, args = _recuadro((oeste, sur, este, norte))
    filas = con.execute(
        f"""
        SELECT year, month, SUM(hs_h), SUM(hs_lo), SUM(hs_hi), SUM(frp_h), COUNT(DISTINCT cell),
               COUNT(DISTINCT source), MIN(source)
        FROM fire_cell_day WHERE {sql_caja} GROUP BY year, month
        """,
        args,
    ).fetchall()
    por_mes = {(int(f[0]), int(f[1])): f for f in filas}
    todos = con.execute("SELECT DISTINCT year, month FROM region_month ORDER BY year, month").fetchall()
    serie = []
    for year, month in todos:
        f = por_mes.get((int(year), int(month)))
        serie.append({
            "year": int(year), "month": int(month),
            "hs": float(f[2]) if f else 0.0, "hs_lo": float(f[3]) if f else 0.0, "hs_hi": float(f[4]) if f else 0.0,
            "frp": float(f[5] or 0.0) if f else 0.0, "active_cells": int(f[6]) if f else 0,
            "source": ("mixto" if f[7] > 1 else f[8]) if f else None,
        })
    return {
        "region_id": "AREA",
        "name": "Área elegida",
        "bbox": [oeste, sur, este, norte],
        "baseline": "2003-2022",
        "unidad": "hotspots equivalentes VIIRS 375 m",
        "months": _clasificar(serie),
    }


ALERTA_DESDE = VIIRS_DESDE + 1   # 2012 está incompleto: VIIRS empieza el 20 de enero
ALERTA_MINIMO = 10    # con menos hotspots que esto no se llama "alto" ni "inusual"


def _mismo_dia(dia: date, year: int) -> date:
    try:
        return dia.replace(year=year)
    except ValueError:  # 29 de febrero
        return dia.replace(year=year, day=28)


def _cuantil(valores: list[float], p: float) -> float:
    arr = sorted(valores)
    if not arr:
        return 0.0
    i = (len(arr) - 1) * p
    lo, hi = int(i), min(int(i) + 1, len(arr) - 1)
    return arr[lo] * (1 - (i - lo)) + arr[hi] * (i - lo)


def alerta(dias: int = 7) -> dict:
    """Los últimos días frente a esos mismos días del calendario en los años con VIIRS observado.

    Compara VIIRS con VIIRS: no usa los años estimados desde MODIS. Es una señal para mirar,
    no un pronóstico: los últimos días son NRT y el día más reciente puede estar incompleto.
    """
    con = _conexion()
    ultimo = con.execute("SELECT MAX(acq_date_local) FROM fire_cell_day").fetchone()[0]
    if not ultimo:
        raise HTTPException(status_code=503, detail="La serie no tiene fechas")
    fin = date.fromisoformat(str(ultimo)[:10])
    ini = fin - timedelta(days=dias - 1)
    nombres = _nombres()

    def ventana(desde: date, hasta: date) -> dict[str, float]:
        filas = con.execute(
            "SELECT dep_id, SUM(hs_h) FROM fire_cell_day WHERE acq_date_local BETWEEN ? AND ? GROUP BY dep_id",
            [desde.isoformat(), hasta.isoformat()],
        ).fetchall()
        return {dep: float(hs) for dep, hs in filas}

    actual = ventana(ini, fin)
    anios = list(range(ALERTA_DESDE, fin.year))
    historia = []
    for year in anios:
        fin_y = _mismo_dia(fin, year)
        historia.append(ventana(fin_y - timedelta(days=dias - 1), fin_y))

    def fila(codigo: str, nombre: str, n: float, base: list[float]) -> dict:
        p25, med, p75, p90 = (_cuantil(base, p) for p in (0.25, 0.50, 0.75, 0.90))
        if not base:
            estado = "sin_base"
        elif n > p90 and n >= ALERTA_MINIMO:
            estado = "inusual"
        elif n > p75 and n >= ALERTA_MINIMO:
            estado = "alto"
        elif n < p25:
            estado = "bajo"
        else:
            estado = "normal"
        return {
            "region_id": codigo, "name": nombre, "hs": round(n, 1),
            "p25": round(p25, 1), "median": round(med, 1), "p75": round(p75, 1), "p90": round(p90, 1),
            "pct_mediana": None if med == 0 else round(100 * n / med, 1),
            "estado": estado,
        }

    deps = [fila(c, nom, actual.get(c, 0.0), [h.get(c, 0.0) for h in historia]) for c, nom in nombres.items()]
    deps.sort(key=lambda d: -d["hs"])
    peru = fila("PE", "Perú", sum(actual.values()), [sum(h.values()) for h in historia])
    return {
        "desde": ini.isoformat(), "hasta": fin.isoformat(), "dias": dias,
        "base": f"los mismos {dias} días del calendario en {anios[0]}–{anios[-1]} ({len(anios)} años, VIIRS observado)",
        "unidad": "hotspots equivalentes VIIRS 375 m",
        "regla": f"inusual: por encima del percentil 90. alto: por encima del 75. bajo: por debajo del 25. "
                 f"Con menos de {ALERTA_MINIMO} hotspots no se marca alto ni inusual.",
        "nota": "Los últimos días vienen del producto NRT y el día más reciente puede estar incompleto. "
                "La regla todavía no se probó contra años pasados: es una señal para mirar, no un aviso verificado.",
        "peru": peru,
        "departamentos": deps,
    }


def exportar(region_id: str, desde: date | None, hasta: date | None) -> str:
    region_id = resolver(region_id)
    meses = calendario(region_id)["months"]
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["region_id", "year", "month", "hs", "hs_lo", "hs_hi", "frp", "source", "estado", "median"])
    for fila in meses:
        dia = date(fila["year"], fila["month"], 1)
        if desde and dia < desde.replace(day=1):
            continue
        if hasta and dia > hasta.replace(day=1):
            continue
        writer.writerow([
            region_id, fila["year"], fila["month"], fila["hs"], fila["hs_lo"], fila["hs_hi"],
            fila["frp"], fila["source"], fila["estado"], fila["median"],
        ])
    return buf.getvalue()


def calibracion() -> list[dict]:
    path = OUT / "calibration_factors.csv"
    if not path.exists():
        raise HTTPException(status_code=503, detail="No está la calibración. Ejecuta python run_serie.py")
    with path.open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def validacion() -> dict:
    path = OUT / "validation.json"
    if not path.exists():
        raise HTTPException(status_code=503, detail="No está la validación. Ejecuta python run_serie.py")
    return json.loads(path.read_text(encoding="utf-8"))
