"""Downloads a short FIRMS (NRT) window by area, in 5-day blocks.

The URL carries the key. No error message prints it.
"""
import hashlib
import json
import time
import urllib.error
import urllib.request
from datetime import date, timedelta
from pathlib import Path

from app.config import BBOX, FUENTES, RAW, map_key, redact

API = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
PASO = 5


def tramos(desde: date, hasta: date, paso: int = PASO):
    cursor = desde
    while cursor <= hasta:
        n = min(paso, (hasta - cursor).days + 1)
        yield cursor, n
        cursor += timedelta(days=n)


def _bajar(url: str, key: str, fuente: str, inicio: date) -> str:
    ultimo = "sin respuesta"
    for intento in (1, 2):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "calendario-del-fuego/0.1"})
            with urllib.request.urlopen(req, timeout=180) as resp:
                return resp.read().decode("utf-8-sig", "replace")
        except urllib.error.HTTPError as exc:
            cuerpo = exc.read().decode("utf-8", "replace")[:240]
            ultimo = f"{fuente} {inicio.isoformat()}: HTTP {exc.code}: {redact(cuerpo, key)}"
            if exc.code in (429, 500, 502, 503, 504) and intento == 1:
                time.sleep(4)
                continue
            raise SystemExit(ultimo)
        except urllib.error.URLError as exc:
            ultimo = f"{fuente} {inicio.isoformat()}: {redact(str(exc.reason), key)}"
            if intento == 1:
                time.sleep(3)
                continue
            raise SystemExit(ultimo)
    raise SystemExit(ultimo)


def descargar(desde: date, hasta: date) -> list[dict]:
    key = map_key()
    RAW.mkdir(parents=True, exist_ok=True)
    manifiesto = []
    errores = []
    for fuente in FUENTES:
        for inicio, n in tramos(desde, hasta):
            destino = RAW / fuente / f"{inicio.isoformat()}_{n}.csv"
            destino.parent.mkdir(parents=True, exist_ok=True)
            if destino.exists() and "latitude" in destino.read_text(encoding="utf-8", errors="replace").splitlines()[0].lower():
                texto = destino.read_text(encoding="utf-8")
                print(f"ya estaba {fuente} {inicio.isoformat()} ({n} días)")
            else:
                url = f"{API}/{key}/{fuente}/{BBOX}/{n}/{inicio.isoformat()}"
                texto = _bajar(url, key, fuente, inicio)
                primera = texto.splitlines()[0] if texto.strip() else ""
                if "latitude" not in primera.lower():
                    errores.append(f"{fuente} {inicio.isoformat()}: {redact(primera[:180], key)}")
                    print(errores[-1])
                    time.sleep(0.4)
                    continue
                destino.write_text(texto, encoding="utf-8")
                print(f"bajado {fuente} {inicio.isoformat()} ({n} días, {max(0, texto.count(chr(10)) - 1)} filas)")
                time.sleep(0.4)
            filas = max(0, texto.count("\n") - (0 if texto.endswith("\n") else 0))
            # the header counts as one line; if the file ends in a newline, count('\n') includes the header
            filas = max(0, sum(1 for linea in texto.splitlines() if linea.strip()) - 1)
            manifiesto.append({
                "fuente": fuente,
                "inicio": inicio.isoformat(),
                "dias": n,
                "filas": filas,
                "sha256": hashlib.sha256(texto.encode("utf-8")).hexdigest(),
                "archivo": str(destino.relative_to(RAW.parent.parent)),
            })
    (RAW / "manifest.json").write_text(
        json.dumps({"desde": desde.isoformat(), "hasta": hasta.isoformat(), "archivos": manifiesto, "errores": errores}, indent=2),
        encoding="utf-8",
    )
    if not manifiesto:
        raise SystemExit("La API no entregó ningún CSV. " + " | ".join(errores))
    return manifiesto
