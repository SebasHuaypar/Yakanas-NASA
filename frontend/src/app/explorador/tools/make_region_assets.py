#!/usr/bin/env python3
"""
Pre-genera los datos del relieve 3D de cada departamento para que el navegador no tenga que
bajar y unir decenas de teselas cada vez que se abre una región.

Por región escribe, en public/explorador/regions/v2/<id>/:
  meta.json  recuadro, tamaños, rango de altitud (solo dentro del contorno) y origen de los mosaicos
  dem.bin    alturas (uint16, 0,125 m, desplazadas +200 m) con delta horizontal, little-endian
  sat.webp   mosaico Sentinel-2 SIN recortar (el cliente lo recorta con la silueta)

Replica lo que hace lib/terrain.ts (mismo margen, mismo zoom, mismas teselas).

Uso:  python3 -I tools/make_region_assets.py [salida] [cache_tiles] [PE-CUS PE-CAL ...]
Requiere: numpy, pillow y curl. Datos: AWS Terrain Tiles (Terrarium) y EOX Sentinel-2 cloudless 2020
(CC BY-NC-SA: la app muestra la atribución). Se ejecuta una vez; el resultado se versiona.
"""
import gzip, io, json, math, os, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
FRONT = os.path.normpath(os.path.join(HERE, "..", "..", "..", ".."))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(FRONT, "public", "explorador", "regions", "v2")
CACHE = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, ".tiles")
ONLY = sys.argv[3:]
os.makedirs(CACHE, exist_ok=True)

PAD = 0.04          # margen alrededor de la silueta (igual que terrain.ts)
DEM_MAX = 760       # lado máximo del mosaico de elevación (igual que terrain.ts)
SAT_MAX = 1400      # lado máximo del mosaico satelital (igual que terrain.ts)
DEM_OUT = 512       # lado máximo del DEM guardado (la malla 3D usa como mucho 256)
OFFSET, SCALE = 200, 8  # uint16 = (altura + 200) * 8

DEM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
IMG_URL = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"


def px(lon, lat, z):
    n = 256 * 2 ** z
    return ((lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)


# ---------- contornos (lon = x/20, lat = y/20; la fuente trae Y hacia arriba) ----------
src = open(os.path.join(HERE, "..", "lib", "peru-geo.ts"), encoding="utf-8").read()
DEPTS = []
for m in re.finditer(r'\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*rings:\s*"([^"]+)"', src):
    rings = [[(float(p.split(",")[0]) / 20, float(p.split(",")[1]) / 20) for p in r.split(" ")] for r in m.group(3).split("|")]
    DEPTS.append((m.group(1), m.group(2), rings))


# ---------- descarga atómica con reintentos ----------
def fetch(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    last = ""
    for intento in range(6):
        r = subprocess.run(["curl", "-sSf", "--max-time", "40", "-o", path + ".part", url], capture_output=True, text=True)
        if r.returncode == 0 and os.path.getsize(path + ".part") > 0:
            os.replace(path + ".part", path)
            return path
        last = r.stderr.strip()
        time.sleep(1 + intento)
    raise RuntimeError(f"{url}: {last}")


def mosaic(kind, url_t, z, x0, y0, w, h, workers):
    """Une las teselas que cubren [x0,x0+w]×[y0,y0+h] (píxeles del zoom z) y recorta."""
    tx0, tx1 = int(x0 // 256), int((x0 + w) // 256)
    ty0, ty1 = int(y0 // 256), int((y0 + h) // 256)
    jobs = [(tx, ty) for ty in range(ty0, ty1 + 1) for tx in range(tx0, tx1 + 1)]
    ext = "png" if kind == "dem" else "jpg"

    def one(t):
        tx, ty = t
        f = fetch(url_t.format(z=z, x=tx, y=ty), os.path.join(CACHE, f"{kind}_{z}_{tx}_{ty}.{ext}"))
        return t, Image.open(f).convert("RGB")

    big = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    with ThreadPoolExecutor(workers) as ex:
        for (tx, ty), im in ex.map(one, jobs):
            big.paste(im, ((tx - tx0) * 256, (ty - ty0) * 256))
    sx, sy = int(round(x0 - tx0 * 256)), int(round(y0 - ty0 * 256))
    return big.crop((sx, sy, sx + w, sy + h)), len(jobs)


def build(rid, name, rings):
    lons = [p[0] for r in rings for p in r]
    lats = [p[1] for r in rings for p in r]
    west, east = min(lons) - PAD, max(lons) + PAD
    south, north = min(lats) - PAD, max(lats) + PAD

    def size(z):
        a, b = px(west, north, z)
        c, d = px(east, south, z)
        return max(c - a, d - b)

    # --- elevación ---
    z = 10
    while z > 5 and size(z) > DEM_MAX:
        z -= 1
    x0, y0 = px(west, north, z)
    x1, y1 = px(east, south, z)
    cols, rows = round(x1 - x0), round(y1 - y0)
    im, nd = mosaic("dem", DEM_URL, z, x0, y0, cols, rows, 8)
    a = np.asarray(im, dtype=np.float32)
    dem = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768

    # rango de altitud SOLO dentro del contorno (percentiles, ignora huecos y atípicos)
    mk = Image.new("L", (cols, rows), 0)
    dr = ImageDraw.Draw(mk)
    for r in rings:
        dr.polygon([(px(lo, la, z)[0] - x0, px(lo, la, z)[1] - y0) for lo, la in r], fill=255)
    inside = dem[np.asarray(mk) > 0]
    if inside.size < 50:
        inside = dem.ravel()
    vmin = max(0.0, float(np.percentile(inside, 0.3)))
    vmax = float(np.percentile(inside, 99.9))

    # DEM reducido y codificado (delta horizontal: comprime mucho mejor)
    k = min(1.0, DEM_OUT / max(cols, rows))
    cs, rs = max(2, round(cols * k)), max(2, round(rows * k))
    small = np.asarray(Image.fromarray(dem).resize((cs, rs), Image.Resampling.BILINEAR), dtype=np.float32)
    enc = np.clip(np.round((small + OFFSET) * SCALE), 0, 65535).astype(np.int64)
    dlt = enc.copy()
    dlt[:, 1:] = (enc[:, 1:] - enc[:, :-1]) & 0xFFFF
    raw = dlt.astype("<u2").tobytes()

    # --- satélite (sin recortar) ---
    zs = z
    while zs < 14 and size(zs + 1) <= SAT_MAX:
        zs += 1
    sx0, sy0 = px(west, north, zs)
    sx1, sy1 = px(east, south, zs)
    sw, sh = round(sx1 - sx0), round(sy1 - sy0)
    sim, ns = mosaic("sat", IMG_URL, zs, sx0, sy0, sw, sh, 5)
    buf = io.BytesIO()
    sim.save(buf, "WEBP", quality=80, method=6)

    wkm = (east - west) * 111.32 * math.cos(math.radians((south + north) / 2))
    meta = {
        "id": rid, "name": name, "cols": cs, "rows": rs,
        "min": round(vmin, 1), "max": round(vmax, 1),
        "bb": {"west": round(west, 5), "east": round(east, 5), "south": round(south, 5), "north": round(north, 5)},
        "wKm": round(wkm, 3), "hKm": round(wkm * rows / cols, 3),
        "dem": {"z": z, "x0": round(x0, 3), "y0": round(y0, 3), "sc": round(cs / cols, 6), "offset": OFFSET, "scale": SCALE},
        "sat": {"z": zs, "x0": round(sx0, 3), "y0": round(sy0, 3), "w": sw, "h": sh},
    }
    d = os.path.join(OUT, rid)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "dem.bin"), "wb").write(raw)
    open(os.path.join(d, "sat.webp"), "wb").write(buf.getvalue())
    json.dump(meta, open(os.path.join(d, "meta.json"), "w"), separators=(",", ":"))
    return {
        "dem_tiles": nd, "sat_tiles": ns, "dem": f"{cs}x{rs}", "sat": f"{sw}x{sh}",
        "dem_kb": len(raw) // 1024, "dem_gz_kb": len(gzip.compress(raw, 6)) // 1024, "sat_kb": len(buf.getvalue()) // 1024,
        "min": meta["min"], "max": meta["max"],
    }


if __name__ == "__main__":
    todo = [d for d in DEPTS if not ONLY or d[0] in ONLY]
    print(f"{len(todo)} regiones → {OUT}")
    tot = 0
    for rid, name, rings in todo:
        t = time.time()
        r = build(rid, name, rings)
        tot += r["dem_gz_kb"] + r["sat_kb"]
        print(f"{rid} {name:<16} dem {r['dem']} ({r['dem_kb']} KB, gz {r['dem_gz_kb']}) sat {r['sat']} ({r['sat_kb']} KB) "
              f"alt {r['min']:.0f}–{r['max']:.0f} m  tiles {r['dem_tiles']}+{r['sat_tiles']}  {time.time() - t:.1f}s", flush=True)
    print(f"total ≈ {tot / 1024:.1f} MB")
