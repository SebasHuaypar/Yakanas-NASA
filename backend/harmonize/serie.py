"""Builds the series anchored on a single VIIRS satellite.

Seven steps of the new model: a common schema, confidence, vegetation,
deduplication, a grid, one VIIRS satellite per day, and calibration by
department and season. The grid is 0.02° (about 5 km²), the DuckDB
equivalent of an H3 cell at resolution 7.
"""
import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from shapely import points
from shapely.strtree import STRtree

from app.config import OUT, PROCESSED, RAW, SP
from harmonize.build import departamentos_html, escribir_geojson, nivel_confianza
from harmonize.modelo import fit_powerlaw, predecir, sirve, temporada_alta

CORTE = "2012-01-20"
CAL_DESDE, CAL_HASTA = 2012, 2022
VAL_TRAIN = (2012, 2019)
VAL_TEST = (2020, 2022)
VERSION = "v1-2026-11-14"
PASO = 0.02
ORIGEN_LON, ORIGEN_LAT = -81.5, -18.5
ZONAS = {
    "Selva": {"Loreto", "Ucayali", "San Martin", "Madre de Dios"},
    "Sierra": {"Cusco", "Puno", "Junin", "Huanuco", "Apurimac", "Ayacucho", "Huancavelica", "Cajamarca", "Amazonas", "Pasco"},
    "Costa": set(),
}


def _sin_acento(texto: str) -> str:
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn")


def _leer_csv(path, sensor: str, processing: str) -> pd.DataFrame:
    df = pd.read_csv(
        path,
        usecols=lambda c: c in {
            "latitude", "longitude", "acq_date", "acq_time", "satellite",
            "confidence", "frp", "type", "instrument",
        },
        dtype={"acq_time": str, "confidence": str, "satellite": str, "instrument": str},
    )
    if df.empty or "latitude" not in df.columns:
        return pd.DataFrame()
    df["sensor_group"] = sensor
    df["family"] = "MODIS" if sensor == "MODIS" else "VIIRS"
    df["processing"] = processing
    return df


def _sensor_de_carpeta(nombre: str) -> tuple[str, str]:
    processing = "NRT" if nombre.endswith("_NRT") else "SP"
    sensor = nombre.replace("_NRT", "").replace("_SP", "")
    return sensor, processing


def cargar(desde: int = 2010, hasta: int = 2026) -> pd.DataFrame:
    frames = []
    if SP.exists():
        for sensor_dir in sorted(p for p in SP.iterdir() if p.is_dir()):
            for path in sorted(sensor_dir.glob("*.csv")):
                try:
                    year = int(path.stem)
                except ValueError:
                    continue
                if desde <= year <= hasta:
                    frames.append(_leer_csv(path, sensor_dir.name, "SP"))
    if hasta >= 2026:
        base = RAW / "y2026"
        if base.exists():
            for sensor_dir in sorted(p for p in base.iterdir() if p.is_dir()):
                sensor, processing = _sensor_de_carpeta(sensor_dir.name)
                for path in sorted(sensor_dir.glob("*.csv")):
                    frames.append(_leer_csv(path, sensor, processing))
        nrt = {
            "MODIS_NRT": "MODIS",
            "VIIRS_SNPP_NRT": "VIIRS_SNPP",
            "VIIRS_NOAA20_NRT": "VIIRS_NOAA20",
            "VIIRS_NOAA21_NRT": "VIIRS_NOAA21",
        }
        for carpeta, sensor in nrt.items():
            carpeta_nrt = RAW / carpeta
            if not carpeta_nrt.exists():
                continue
            for path in sorted(carpeta_nrt.glob("*.csv")):
                frames.append(_leer_csv(path, sensor, "NRT"))
    frames = [f for f in frames if not f.empty]
    if not frames:
        raise SystemExit(f"No hay CSV entre {desde} y {hasta}")
    return pd.concat(frames, ignore_index=True)


def preparar(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    bruto = len(df)
    df = df.copy()
    df["lat"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["lon"] = pd.to_numeric(df["longitude"], errors="coerce")
    df["frp_mw"] = pd.to_numeric(df["frp"], errors="coerce").fillna(0.0)
    df["type_n"] = pd.to_numeric(df["type"], errors="coerce") if "type" in df.columns else np.nan
    df = df[df["lat"].notna() & df["lon"].notna()].copy()
    df["acq_date"] = pd.to_datetime(df["acq_date"], errors="coerce")
    df = df[df["acq_date"].notna()].copy()
    hora = df["acq_time"].fillna("0000").astype(str).str.replace(r"\.0$", "", regex=True)
    hora = hora.where(hora.str.fullmatch(r"\d{1,4}"), "0000").str.zfill(4)
    minutos = hora.str[:2].astype(int) * 60 + hora.str[2:4].astype(int)
    local = df["acq_date"] - pd.to_timedelta((minutos < 5 * 60).astype(int), unit="D")
    df["acq_date_local"] = local.dt.strftime("%Y-%m-%d")
    df["year"] = local.dt.year.astype(int)
    df["month"] = local.dt.month.astype(int)
    df["acq_time"] = hora
    df["xi"] = np.floor((df["lon"] - ORIGEN_LON) / PASO).astype(int)
    df["yi"] = np.floor((df["lat"] - ORIGEN_LAT) / PASO).astype(int)
    df["cell"] = df["xi"].astype(str) + ":" + df["yi"].astype(str)

    fijos = set(df.loc[df["type_n"].isin([1, 2, 3]), "cell"])
    df["conf_level"] = df["confidence"].map(nivel_confianza)
    df = df[df["conf_level"].isin(["nominal", "high"])].copy()
    vegetacion = df["type_n"].isna() | (df["type_n"] == 0)
    df = df[vegetacion & ~((df["processing"] == "NRT") & df["cell"].isin(fijos))].copy()

    df["lat_r"] = df["lat"].round(4)
    df["lon_r"] = df["lon"].round(4)
    df["prioridad"] = (df["processing"] == "SP").astype(int)
    df = df.sort_values("prioridad", ascending=False)
    df = df.drop_duplicates(
        ["family", "satellite", "acq_date", "acq_time", "lat_r", "lon_r"], keep="first"
    )
    info = {"brutos": int(bruto), "tras_filtros": int(len(df)), "celdas_fijas": len(fijos)}
    return df.reset_index(drop=True), info


def asignar(df: pd.DataFrame, deps: list[dict]) -> pd.DataFrame:
    geoms, ids = [], []
    for d in deps:
        geom = d.get("geom")
        if geom is not None and not geom.is_empty:
            geoms.append(geom)
            ids.append(d["id"])
    tree = STRtree(geoms)
    pares = tree.query(points(df["lon"].to_numpy(), df["lat"].to_numpy()), predicate="intersects")
    elegido = np.array([""] * len(df), dtype=object)
    if pares.size:
        orden = np.argsort(np.array([ids[i] == "PE-LMA" for i in pares[1]]))
        for k in orden:
            elegido[pares[0, k]] = ids[pares[1, k]]
    df = df.copy()
    df["dep_id"] = elegido
    return df


def un_viirs_por_dia(df: pd.DataFrame) -> pd.DataFrame:
    vii = df[df["family"] == "VIIRS"]
    grupos = vii.groupby("acq_date_local")["sensor_group"].agg(set)
    ref = {}
    for dia, presentes in grupos.items():
        if dia >= "2018-04-01" and "VIIRS_NOAA20" in presentes:
            ref[dia] = "VIIRS_NOAA20"
        elif "VIIRS_SNPP" in presentes:
            ref[dia] = "VIIRS_SNPP"
        elif "VIIRS_NOAA20" in presentes:
            ref[dia] = "VIIRS_NOAA20"
        elif "VIIRS_NOAA21" in presentes:
            ref[dia] = "VIIRS_NOAA21"
    keep_vii = vii["acq_date_local"].map(ref) == vii["sensor_group"]
    mod = df[df["family"] == "MODIS"]
    return pd.concat([mod, vii[keep_vii]], ignore_index=True)


def _tabla_mensual(df: pd.DataFrame, deps: list[str], y0: int, y1: int) -> pd.DataFrame:
    idx = pd.MultiIndex.from_product([deps, range(y0, y1 + 1), range(1, 13)], names=["dep_id", "year", "month"])
    if df.empty:
        vacia = pd.DataFrame(index=idx).reset_index()
        vacia["n"] = 0
        vacia["frp"] = 0.0
        return vacia
    g = df.groupby(["dep_id", "year", "month"], as_index=False).agg(n=("lat", "size"), frp=("frp_mw", "sum"))
    g = g.set_index(["dep_id", "year", "month"]).reindex(idx, fill_value=0).reset_index()
    g["n"] = g["n"].astype(int)
    g["frp"] = g["frp"].astype(float)
    return g


def _altas(tabla: pd.DataFrame, nacional: pd.DataFrame) -> tuple[dict, list[int]]:
    por_dep = {}
    for dep, sub in tabla.groupby("dep_id"):
        medias = sub.groupby("month")["n"].mean().to_dict()
        por_dep[dep] = temporada_alta({int(m): float(v) for m, v in medias.items()})
    medias_nac = nacional.groupby("month")["n"].mean().to_dict()
    return por_dep, temporada_alta({int(m): float(v) for m, v in medias_nac.items()})


def ajustar(modis: pd.DataFrame, viirs: pd.DataFrame, deps: list[dict]) -> tuple[pd.DataFrame, dict]:
    ids = [d["id"] for d in deps]
    nombres = {d["id"]: d["name"] for d in deps}
    m = _tabla_mensual(modis, ids, CAL_DESDE, CAL_HASTA).rename(columns={"n": "m", "frp": "frp_m"})
    v = _tabla_mensual(viirs, ids, CAL_DESDE, CAL_HASTA).rename(columns={"n": "v", "frp": "frp_v"})
    ambos = m.merge(v, on=["dep_id", "year", "month"])
    altas, alta_nacional = _altas(v.rename(columns={"v": "n"}), v.groupby(["year", "month"], as_index=False)["v"].sum().rename(columns={"v": "n"}))
    nac_m = ambos.groupby(["year", "month"], as_index=False)[["m", "frp_m", "v", "frp_v"]].sum()

    def _fit_bloque(bloque, alta_set, metrica):
        fuego = bloque[(bloque["m" if metrica == "hs" else "frp_m"] > 0) | (bloque["v" if metrica == "hs" else "frp_v"] > 0)]
        col_m = "m" if metrica == "hs" else "frp_m"
        col_v = "v" if metrica == "hs" else "frp_v"
        if len(fuego) < 3:
            return None, 0
        alta = np.array([1.0 if int(mes) in alta_set else 0.0 for mes in fuego["month"]])
        return fit_powerlaw(fuego[col_m], fuego[col_v], alta), int(len(fuego))

    def _fit_sin(bloque, metrica):
        col_m = "m" if metrica == "hs" else "frp_m"
        col_v = "v" if metrica == "hs" else "frp_v"
        fuego = bloque[(bloque[col_m] > 0) | (bloque[col_v] > 0)]
        if len(fuego) < 3:
            return None
        return fit_powerlaw(fuego[col_m], fuego[col_v], np.zeros(len(fuego)))

    params_nac, n_nac = _fit_bloque(nac_m, set(alta_nacional), "hs")
    frp_nac, n_frp_nac = _fit_bloque(nac_m, set(alta_nacional), "frp")
    if params_nac is None:
        raise SystemExit("No se pudo ajustar el modelo nacional")

    filas = []
    for dep in ids:
        alta = set(altas.get(dep, alta_nacional))
        bloque = ambos[ambos["dep_id"] == dep]
        params, n_fuego = _fit_bloque(bloque, alta, "hs")
        total_v = float(bloque["v"].sum())
        metodo = "departamento"
        if params is None or not sirve(params, n_fuego, total_v):
            params, metodo = params_nac, "nacional"
        frp_params, n_frp = _fit_bloque(bloque, alta, "frp")
        if metodo == "nacional" or frp_params is None or not sirve(frp_params, n_frp):
            frp_params = frp_nac or params
        for metrica, p in (("hs", params), ("frp", frp_params)):
            filas.append({
                "version": VERSION,
                "region_id": dep,
                "name": nombres[dep],
                "metric": metrica,
                "a": p["a"], "d": p["d"], "b": p["b"],
                "smear": p["smear"], "res_p10": p["res_p10"], "res_p90": p["res_p90"],
                "high_months": ",".join(str(m) for m in sorted(alta)),
                "method": metodo if metrica == "hs" else ("departamento" if frp_params is not frp_nac and frp_params is not params else "nacional"),
                "n": p["n"],
            })
    factores = pd.DataFrame(filas)
    return factores, {
        "ambos": ambos,
        "nac": nac_m,
        "altas": altas,
        "alta_nacional": alta_nacional,
        "nombres": nombres,
        "params_nac": params_nac,
        "frp_nac": frp_nac,
    }


def validar(ctx: dict) -> dict:
    ambos = ctx["ambos"]
    nombres = ctx["nombres"]
    altas = ctx["altas"]
    alta_nacional = ctx["alta_nacional"]

    def bloque_nacional(y0, y1):
        return ambos[(ambos["year"] >= y0) & (ambos["year"] <= y1)].groupby(["year", "month"], as_index=False)[["m", "v"]].sum()

    def ajustar_rango(y0, y1, con_temporada: bool):
        salida = {}
        nac = bloque_nacional(y0, y1)
        fuego = nac[(nac["m"] > 0) | (nac["v"] > 0)]
        alta_arr = np.array([1.0 if int(m) in set(alta_nacional) else 0.0 for m in fuego["month"]])
        if not con_temporada:
            alta_arr = np.zeros(len(fuego))
        nac_params = fit_powerlaw(fuego["m"], fuego["v"], alta_arr)
        for dep, sub in ambos.groupby("dep_id"):
            sub = sub[(sub["year"] >= y0) & (sub["year"] <= y1)]
            fuego_d = sub[(sub["m"] > 0) | (sub["v"] > 0)]
            alta = set(altas.get(dep, alta_nacional))
            arr = np.array([1.0 if int(m) in alta else 0.0 for m in fuego_d["month"]])
            if not con_temporada:
                arr = np.zeros(len(fuego_d))
            total_v = float(sub["v"].sum())
            if len(fuego_d) >= 3:
                params = fit_powerlaw(fuego_d["m"], fuego_d["v"], arr)
                if not sirve(params, len(fuego_d), total_v):
                    params = nac_params
                    alta = set(alta_nacional) if con_temporada else set()
            else:
                params = nac_params
                alta = set(alta_nacional) if con_temporada else set()
            salida[dep] = (params, alta if con_temporada else set())
        salida["PE"] = (nac_params, set(alta_nacional) if con_temporada else set())
        return salida

    def error_de(modelos) -> dict:
        por_dep = {}
        est_nac, obs_nac = [], []
        dentro = total = 0
        num_dm = den_dm = 0.0
        for dep, sub in ambos.groupby("dep_id"):
            sub = sub[(sub["year"] >= VAL_TEST[0]) & (sub["year"] <= VAL_TEST[1])]
            params, alta = modelos[dep]
            alta_arr = np.array([1.0 if int(m) in alta else 0.0 for m in sub["month"]])
            est, lo, hi = predecir(params, sub["m"], alta_arr)
            obs = sub["v"].to_numpy(dtype=float)
            den = float(obs.sum())
            num_dm += float(np.abs(est - obs).sum())
            den_dm += den
            por_dep[dep] = None if den == 0 else float(np.abs(est - obs).sum() / den)
            est_nac.append(est)
            obs_nac.append(obs)
            reales = obs > 0
            dentro += int(((obs >= lo) & (obs <= hi) & reales).sum())
            total += int(reales.sum())
        est_m = np.sum(est_nac, axis=0)
        obs_m = np.sum(obs_nac, axis=0)
        den = float(obs_m.sum())
        ss_tot = float(((obs_m - obs_m.mean()) ** 2).sum())
        r2 = None if ss_tot == 0 else float(1 - ((obs_m - est_m) ** 2).sum() / ss_tot)
        zonas = {}
        for zona, nombres_z in ZONAS.items():
            if zona == "Costa":
                ids = [i for i, n in nombres.items() if _sin_acento(n) not in ZONAS["Selva"] | ZONAS["Sierra"]]
            else:
                ids = [i for i, n in nombres.items() if _sin_acento(n) in nombres_z]
            num = den_z = 0.0
            for dep in ids:
                sub = ambos[(ambos["dep_id"] == dep) & (ambos["year"] >= VAL_TEST[0]) & (ambos["year"] <= VAL_TEST[1])]
                params, alta = modelos[dep]
                alta_arr = np.array([1.0 if int(m) in alta else 0.0 for m in sub["month"]])
                est, _, _ = predecir(params, sub["m"], alta_arr)
                obs = sub["v"].to_numpy(dtype=float)
                num += float(np.abs(est - obs).sum())
                den_z += float(obs.sum())
            zonas[zona] = None if den_z == 0 else num / den_z
        return {
            "error_nacional": None if den == 0 else float(np.abs(est_m - obs_m).sum() / den),
            "r2_nacional": r2,
            "dentro_p10_p90": None if total == 0 else dentro / total,
            "error_departamento_mes": None if den_dm == 0 else num_dm / den_dm,
            "por_zona": zonas,
            "por_departamento": {
                dep: {"name": nombres[dep], "error": por_dep[dep]} for dep in por_dep
            },
        }

    con = error_de(ajustar_rango(*VAL_TRAIN, True))
    sin = error_de(ajustar_rango(*VAL_TRAIN, False))
    return {
        "version": VERSION,
        "train": f"{VAL_TRAIN[0]}-{VAL_TRAIN[1]}",
        "test": f"{VAL_TEST[0]}-{VAL_TEST[1]}",
        "con_temporada": {k: con[k] for k in ("error_nacional", "r2_nacional", "dentro_p10_p90", "error_departamento_mes", "por_zona")},
        "sin_temporada": {k: sin[k] for k in ("error_nacional", "r2_nacional", "error_departamento_mes", "por_zona")},
        "por_departamento": con["por_departamento"],
        "nota": "El error es la suma de |estimado − observado| dividida entre el total observado. El rango p10–p90 se cuenta solo en meses con VIIRS observado. El modelo publicado se ajusta con 2012–2022; esta prueba entrena solo hasta 2019.",
    }


def _params_de(factores: pd.DataFrame) -> dict:
    out = {}
    for _, fila in factores.iterrows():
        out.setdefault(fila["region_id"], {})[fila["metric"]] = {
            "a": fila["a"], "d": fila["d"], "b": fila["b"],
            "smear": fila["smear"], "res_p10": fila["res_p10"], "res_p90": fila["res_p90"],
            "high": {int(x) for x in str(fila["high_months"]).split(",") if x},
        }
    return out


def construir_celdas(df: pd.DataFrame, factores: pd.DataFrame) -> pd.DataFrame:
    params = _params_de(factores)
    base = df[df["dep_id"] != ""].copy()
    antes = base[base["acq_date_local"] < CORTE]
    despues = base[(base["acq_date_local"] >= CORTE) & (base["family"] == "VIIRS")]
    mod = antes[antes["family"] == "MODIS"]
    grupos_m = mod.groupby(["cell", "acq_date_local", "dep_id", "xi", "yi", "year", "month"], as_index=False).agg(
        modis_n=("lat", "size"), frp=("frp_mw", "sum")
    )
    if len(grupos_m):
        totales = mod.groupby(["dep_id", "year", "month"], as_index=False).agg(m=("lat", "size"), frp_m=("frp_mw", "sum"))
        k_rows = []
        for dep, sub in totales.groupby("dep_id"):
            ph = params[dep]["hs"]
            pf = params[dep].get("frp", ph)
            alta = np.array([1.0 if int(m) in ph["high"] else 0.0 for m in sub["month"]])
            est, lo, hi = predecir(ph, sub["m"], alta)
            fest, _, _ = predecir(pf, sub["frp_m"], alta)
            m_mes = sub["m"].to_numpy(dtype=float)
            frp_mes = sub["frp_m"].to_numpy(dtype=float)
            k_rows.append(pd.DataFrame({
                "dep_id": dep,
                "year": sub["year"].to_numpy(),
                "month": sub["month"].to_numpy(),
                "k_hs": np.where(m_mes > 0, est / m_mes, 0.0),
                "k_lo": np.where(m_mes > 0, lo / m_mes, 0.0),
                "k_hi": np.where(m_mes > 0, hi / m_mes, 0.0),
                "k_frp": np.where(frp_mes > 0, fest / frp_mes, 0.0),
            }))
        grupos_m = grupos_m.merge(pd.concat(k_rows, ignore_index=True), on=["dep_id", "year", "month"], how="left")
        grupos_m["hs_h"] = grupos_m["modis_n"] * grupos_m["k_hs"]
        grupos_m["hs_lo"] = grupos_m["modis_n"] * grupos_m["k_lo"]
        grupos_m["hs_hi"] = grupos_m["modis_n"] * grupos_m["k_hi"]
        grupos_m["frp_h"] = grupos_m["frp"] * grupos_m["k_frp"]
        grupos_m["viirs_n"] = 0
        grupos_m["source"] = "MODIS_ADJ"
    grupos_v = despues.groupby(["cell", "acq_date_local", "dep_id", "xi", "yi", "year", "month"], as_index=False).agg(
        viirs_n=("lat", "size"), frp_h=("frp_mw", "sum")
    )
    if len(grupos_v):
        grupos_v["modis_n"] = 0
        grupos_v["hs_h"] = grupos_v["viirs_n"].astype(float)
        grupos_v["hs_lo"] = grupos_v["hs_h"]
        grupos_v["hs_hi"] = grupos_v["hs_h"]
        grupos_v["k_hs"] = 1.0
        grupos_v["source"] = "VIIRS"
    cols = ["cell", "acq_date_local", "dep_id", "xi", "yi", "year", "month",
            "hs_h", "hs_lo", "hs_hi", "frp_h", "source", "modis_n", "viirs_n", "k_hs"]
    partes = [p[cols] for p in (grupos_m, grupos_v) if len(p)]
    celdas = pd.concat(partes, ignore_index=True)
    celdas["calib_version"] = VERSION
    return celdas


def meses_region(celdas: pd.DataFrame, deps: list[str]) -> pd.DataFrame:
    if celdas.empty:
        raise SystemExit("No quedaron celdas dentro de los departamentos")
    g = celdas.groupby(["dep_id", "year", "month"], as_index=False).agg(
        hs=("hs_h", "sum"), hs_lo=("hs_lo", "sum"), hs_hi=("hs_hi", "sum"),
        frp=("frp_h", "sum"), active_cells=("cell", "nunique"),
        fuentes=("source", lambda s: set(s)),
    )
    y0 = int(celdas["year"].min())
    ultimo = celdas["acq_date_local"].max()
    y1, m1 = int(ultimo[:4]), int(ultimo[5:7])
    pares = [(y, m) for y in range(y0, y1 + 1) for m in range(1, 13) if (y, m) <= (y1, m1)]
    idx = pd.MultiIndex.from_product([deps, pares], names=["dep_id", "ym"])
    g["ym"] = list(zip(g["year"], g["month"]))
    g = g.set_index(["dep_id", "ym"]).reindex(idx)
    g = g.reset_index()
    g["year"] = g["ym"].map(lambda t: t[0])
    g["month"] = g["ym"].map(lambda t: t[1])
    for col in ("hs", "hs_lo", "hs_hi", "frp", "active_cells"):
        g[col] = g[col].fillna(0)
    g["active_cells"] = g["active_cells"].astype(int)

    def fuente(valor, year, month):
        if isinstance(valor, set) and valor:
            return "mixto" if len(valor) > 1 else next(iter(valor))
        if (year, month) < (2012, 1):
            return "MODIS_ADJ"
        if (year, month) == (2012, 1):
            return "mixto"
        return "VIIRS"

    g["source"] = [fuente(v, y, m) for v, y, m in zip(g["fuentes"], g["year"], g["month"])]
    return g.drop(columns=["ym", "fuentes"])


def construir(desde: int = 2010, hasta: int = 2026) -> dict:
    print(f"leyendo CSV de {desde} a {hasta}…", flush=True)
    crudo = cargar(desde, hasta)
    print(f"  {len(crudo):,} filas", flush=True)
    df, info = preparar(crudo)
    df = df[(df["year"] >= desde) & (df["year"] <= hasta)].copy()
    print(f"filtros: {info}; en {desde}–{hasta}: {len(df):,}", flush=True)
    deps = departamentos_html()
    escribir_geojson(deps)
    print("asignando departamentos…", flush=True)
    df = asignar(df, deps)
    df = un_viirs_por_dia(df)
    dentro = df[df["dep_id"] != ""]
    print(f"dentro del mapa: {len(dentro):,} de {len(df):,}", flush=True)
    modis = dentro[(dentro["family"] == "MODIS") & (dentro["year"] >= CAL_DESDE) & (dentro["year"] <= CAL_HASTA)]
    viirs = dentro[(dentro["family"] == "VIIRS") & (dentro["year"] >= CAL_DESDE) & (dentro["year"] <= CAL_HASTA)]
    print("calibrando 2012–2022…", flush=True)
    factores, ctx = ajustar(modis, viirs, deps)
    print("validando 2020–2022…", flush=True)
    informe = validar(ctx)
    factores.to_csv(OUT / "calibration_factors.csv", index=False)
    error = informe["con_temporada"]["error_nacional"]
    informe["desde"] = desde
    informe["hasta"] = hasta
    informe["nota"] = (
        f"Serie {desde}–{hasta}. Antes del 20 de enero de 2012 la serie es MODIS convertido; "
        f"desde esa fecha es VIIRS observado. Error nacional en 2020–2022: {error:.1%}."
    )
    print("celdas…", flush=True)
    celdas = construir_celdas(dentro, factores)
    regiones = meses_region(celdas, [d["id"] for d in deps])
    PROCESSED.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    celdas.to_parquet(PROCESSED / "fire_cell_day.parquet", index=False)
    regiones.to_parquet(PROCESSED / "region_month.parquet", index=False)
    (OUT / "regiones.json").write_text(
        json.dumps([{"id": d["id"], "name": d["name"]} for d in deps], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (OUT / "validation.json").write_text(json.dumps(informe, ensure_ascii=False, indent=2), encoding="utf-8")
    resumen = {
        "generado": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "version": VERSION,
        "anio_desde": desde,
        "anio_hasta": hasta,
        "corte": CORTE,
        "grilla": {"paso_grados": PASO, "origen": [ORIGEN_LON, ORIGEN_LAT], "nota": "0,02°, unos 5 km². Equivale a H3 resolución 7 en este prototipo DuckDB."},
        "filtros": info,
        "filas_dentro": int((df["dep_id"] != "").sum()),
        "fuera": int((df["dep_id"] == "").sum()),
        "celdas": int(len(celdas)),
        "desde": None if celdas.empty else str(celdas["acq_date_local"].min()),
        "hasta": None if celdas.empty else str(celdas["acq_date_local"].max()),
        "nota": informe.get("nota"),
    }
    (OUT / "armonizado.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: resumen[k] for k in ("anio_desde", "anio_hasta", "desde", "hasta", "celdas", "filas_dentro", "nota")}, ensure_ascii=False), flush=True)
    return resumen
