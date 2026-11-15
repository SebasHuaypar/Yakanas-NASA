"""Copies the data package to a bucket and downloads it again when the copy there is newer.

Without DATOS_BUCKET everything stays on disk. On Cloud Run the job disk is
wiped when the job ends, so the API and the job share the bucket.
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

SEMANA = (
    PARQUET / "fires.parquet",
    PROCESSED / "fire_cell_day.parquet",
    PROCESSED / "region_month.parquet",
    OUT / "meta.json",
    OUT / "week.json",
    OUT / "fires.csv",
)
MODELO = OUT / "modelo_logistico.json"
REGISTRO = OUT / "reentrenamientos.jsonl"
PAQUETE = (*SEMANA, MODELO, REGISTRO)
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
    """Downloads files that are newer in the bucket. At most once a minute."""
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


def publicar(destino: Path, producir) -> str:
    """Writes only if producir() finishes. A failure leaves the previous file in place."""
    texto = producir()
    guardar_atomico(destino, texto)
    return texto


def guardar_atomico(path: Path, texto: str) -> None:
    """Writes a temporary file and renames it. If it fails before the replace, the destination is unchanged."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporal = path.with_name(path.name + ".tmp")
    temporal.write_text(texto, encoding="utf-8")
    os.replace(temporal, path)


def _enviar(token: str, url: str, data: bytes | None, method: str, tipo: str) -> bytes:
    headers = {"Authorization": f"Bearer {token}"}
    if data is not None:
        headers["Content-Type"] = tipo
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def subir_atomico(path: Path) -> None:
    """Uploads to a temporary name and then renames it. The live file is left alone if this fails."""
    if not bucket():
        return
    token = _token()
    if not token:
        raise SystemExit("DATOS_BUCKET está definido pero no hay credencial de Cloud para subir")
    nombre = _relativo(path)
    temporal = nombre + ".tmp"
    destino = urllib.parse.quote(nombre, safe="")
    origen = urllib.parse.quote(temporal, safe="")
    carga = "https://storage.googleapis.com/upload/storage/v1/b/{}/o?uploadType=media&name={}".format(
        bucket(), origen
    )
    _enviar(token, carga, path.read_bytes(), "POST", "application/octet-stream")
    cambio = "https://storage.googleapis.com/storage/v1/b/{}/o/{}/rewriteTo/b/{}/o/{}".format(
        bucket(), origen, bucket(), destino
    )
    _enviar(token, cambio, b"{}", "POST", "application/json")
    borrar = f"https://storage.googleapis.com/storage/v1/b/{bucket()}/o/{origen}"
    _enviar(token, borrar, None, "DELETE", "application/json")
    print(f"publicado en el bucket {nombre}", flush=True)


def subir() -> None:
    """Uploads the week data. Only retraining publishes the model."""
    if not bucket():
        return
    token = _token()
    if not token:
        raise SystemExit("DATOS_BUCKET está definido pero no hay credencial de Cloud para subir")
    for path in SEMANA:
        if not path.exists():
            continue
        nombre = _relativo(path)
        url = "https://storage.googleapis.com/upload/storage/v1/b/{}/o?uploadType=media&name={}".format(
            bucket(), urllib.parse.quote(nombre, safe="")
        )
        _enviar(token, url, path.read_bytes(), "POST", "application/octet-stream")
        print(f"subido al bucket {nombre}", flush=True)
