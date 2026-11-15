"""Copia el paquete de datos a un bucket y lo vuelve a bajar si allá está más nuevo.

Sin la variable DATOS_BUCKET todo se queda en disco. En Cloud Run el disco del
trabajo se borra al terminar, así que la API y el trabajo comparten el bucket.
"""
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from app.config import DATA, OUT, PARQUET, PROCESSED

PAQUETE = (
    PARQUET / "fires.parquet",
    PROCESSED / "fire_cell_day.parquet",
    PROCESSED / "region_month.parquet",
    OUT / "modelo_logistico.json",
    OUT / "modelos_comparacion.json",
    OUT / "meta.json",
    OUT / "week.json",
    OUT / "fires.csv",
)
_REVISADO = 0.0


def bucket() -> str:
    return os.environ.get("DATOS_BUCKET", "").strip()


def _relativo(path: Path) -> str:
    return path.relative_to(DATA.parent).as_posix()


def _token() -> str | None:
    try:
        req = urllib.request.Request(
            "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
            headers={"Metadata-Flavor": "Google"},
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            return json.load(resp)["access_token"]
    except (OSError, urllib.error.URLError, KeyError, json.JSONDecodeError):
        return None


def _meta(token: str, nombre: str) -> dict | None:
    url = f"https://storage.googleapis.com/storage/v1/b/{bucket()}/o/{urllib.parse.quote(nombre, safe='')}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise


def _mas_nuevo(remoto: str, local: Path) -> bool:
    if not local.exists():
        return True
    llegada = datetime.fromisoformat(remoto.replace("Z", "+00:00"))
    propio = datetime.fromtimestamp(local.stat().st_mtime, timezone.utc)
    return llegada > propio


def bajar() -> None:
    """Trae del bucket los archivos que allá sean más nuevos. Como mucho una vez por minuto."""
    global _REVISADO
    if not bucket():
        return
    ahora = time.time()
    if ahora - _REVISADO < 60:
        return
    _REVISADO = ahora
    token = _token()
    if not token:
        return
    for path in PAQUETE:
        nombre = _relativo(path)
        meta = _meta(token, nombre)
        if not meta or not _mas_nuevo(meta["updated"], path):
            continue
        url = "https://storage.googleapis.com/storage/v1/b/{}/o/{}?alt=media".format(
            bucket(), urllib.parse.quote(nombre, safe="")
        )
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        path.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(req, timeout=120) as resp:
            path.write_bytes(resp.read())
        print(f"bajado del bucket {nombre}", flush=True)


def subir() -> None:
    """Sube el paquete que esta corrida acaba de escribir."""
    if not bucket():
        return
    token = _token()
    if not token:
        raise SystemExit("DATOS_BUCKET está definido pero no hay credencial de Cloud para subir")
    for path in PAQUETE:
        if not path.exists():
            continue
        nombre = _relativo(path)
        url = "https://storage.googleapis.com/upload/storage/v1/b/{}/o?uploadType=media&name={}".format(
            bucket(), urllib.parse.quote(nombre, safe="")
        )
        req = urllib.request.Request(
            url, data=path.read_bytes(), method="POST",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/octet-stream"},
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            resp.read()
        print(f"subido al bucket {nombre}", flush=True)
