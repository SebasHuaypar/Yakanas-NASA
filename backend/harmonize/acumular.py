"""Adds the week's new hotspots to the harmonized series without deleting what is already there.

Each run replaces only its own dates and keeps the rest. From 2012 on, one
VIIRS satellite is kept per day, the same rule as the rest of the series.
"""
import json

import numpy as np
import pandas as pd

from app.config import OUT, PROCESSED
from harmonize.serie import ORIGEN_LAT, ORIGEN_LON, PASO, VERSION, meses_region

PRIORIDAD = ("VIIRS_NOAA20", "VIIRS_SNPP", "VIIRS_NOAA21")
CELDAS = PROCESSED / "fire_cell_day.parquet"
MESES = PROCESSED / "region_month.parquet"


def _fecha_local(df: pd.DataFrame) -> pd.DataFrame:
    hora = df["acq_time"].fillna("0000").astype(str).str.replace(r"\.0$", "", regex=True).str.zfill(4)
    minutos = hora.str[:2].astype(int) * 60 + hora.str[2:4].astype(int)
    local = pd.to_datetime(df["acq_date"]) - pd.to_timedelta((minutos < 5 * 60).astype(int), unit="D")
    df = df.copy()
    df["acq_date_local"] = local.dt.strftime("%Y-%m-%d")
    df["year"] = local.dt.year.astype(int)
    df["month"] = local.dt.month.astype(int)
    return df


def un_viirs(df: pd.DataFrame) -> pd.DataFrame:
    """Keeps the highest-priority VIIRS detection for each day."""
    if "acq_date_local" not in df.columns:
        df = _fecha_local(df)
    vii = df[df["sensor"] == "VIIRS"].copy()
    if vii.empty:
        return vii
    rango = {nombre: i for i, nombre in enumerate(PRIORIDAD)}
    vii["rango"] = vii["sensor_group"].map(lambda s: rango.get(s, 9))
    mejor = vii.groupby("acq_date_local")["rango"].min().rename("mejor")
    vii = vii.merge(mejor, on="acq_date_local")
    return vii[vii["rango"] == vii["mejor"]].drop(columns=["rango", "mejor"])


def _celdas(df: pd.DataFrame) -> pd.DataFrame:
    df = _fecha_local(df)
    df = un_viirs(df)
    df = df[df["dep_id"].astype(str) != ""].copy()
    if df.empty:
        return df
    df["xi"] = np.floor((df["lon"] - ORIGEN_LON) / PASO).astype(int)
    df["yi"] = np.floor((df["lat"] - ORIGEN_LAT) / PASO).astype(int)
    df["cell"] = df["xi"].astype(str) + ":" + df["yi"].astype(str)
    grupos = df.groupby(
        ["cell", "acq_date_local", "dep_id", "xi", "yi", "year", "month"], as_index=False
    ).agg(viirs_n=("lat", "size"), frp_h=("frp_mw", "sum"))
    grupos["modis_n"] = 0
    grupos["hs_h"] = grupos["viirs_n"].astype(float)
    grupos["hs_lo"] = grupos["hs_h"]
    grupos["hs_hi"] = grupos["hs_h"]
    grupos["k_hs"] = 1.0
    grupos["source"] = "VIIRS"
    grupos["calib_version"] = VERSION
    return grupos


def incorporar(ventana: pd.DataFrame) -> int:
    """Adds this window's dates to fire_cell_day and rebuilds the months."""
    nuevas = _celdas(ventana)
    if nuevas.empty:
        print("acumular: la ventana no trae VIIRS dentro de un departamento", flush=True)
        return 0
    fechas = set(nuevas["acq_date_local"])
    if CELDAS.exists():
        viejo = pd.read_parquet(CELDAS)
        viejo = viejo[~viejo["acq_date_local"].isin(fechas)]
        celdas = pd.concat([viejo, nuevas], ignore_index=True)
    else:
        celdas = nuevas
    celdas.to_parquet(CELDAS, index=False)
    nombres = json.loads((OUT / "regiones.json").read_text(encoding="utf-8"))
    meses_region(celdas, [fila["id"] for fila in nombres]).to_parquet(MESES, index=False)
    print(f"acumular: {len(fechas)} fechas VIIRS guardadas en la serie ({celdas['acq_date_local'].max()})", flush=True)
    return len(fechas)
