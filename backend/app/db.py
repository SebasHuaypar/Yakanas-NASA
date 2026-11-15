"""Read-only DuckDB over the week's hotspots.

Reads the Parquet written by run_week.py. If it is missing (a fresh clone),
it uses data/out/fires.csv, the same week that ships with the repository.
"""
import duckdb

from app.config import OUT, PARQUET


def connect():
    from app.almacen import bajar
    bajar()
    parquet = PARQUET / "fires.parquet"
    csv = OUT / "fires.csv"
    con = duckdb.connect()
    if parquet.exists():
        con.execute(f"CREATE VIEW fires AS SELECT * FROM read_parquet('{parquet.as_posix()}')")
    elif csv.exists():
        con.execute(
            f"""CREATE VIEW fires AS
                SELECT * REPLACE (CAST(lat AS DOUBLE) AS lat, CAST(lon AS DOUBLE) AS lon,
                                  CAST(frp_mw AS DOUBLE) AS frp_mw, COALESCE(dep_id, '') AS dep_id)
                FROM read_csv('{csv.as_posix()}', all_varchar = true)"""
        )
    else:
        raise FileNotFoundError(parquet)
    return con
