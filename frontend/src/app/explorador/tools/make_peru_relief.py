#!/usr/bin/env python3
"""
Genera assets/peru-relief.webp: relieve sombreado de todo el Perú (verde en costa y
selva, pardo y blanco en los Andes) con sombra proyectada, alineado con el SVG de
departamentos de lib/peru-geo.ts.

Uso:  python3 -I tools/make_peru_relief.py [salida.webp] [carpeta_cache_tiles]
Requiere: numpy, scipy, pillow y curl. Datos: AWS Terrain Tiles ("Terrarium", sin clave).
Se ejecuta una sola vez; el resultado se versiona y la app lo sirve como archivo estático.
"""
import math, os, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, shift

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "assets", "peru-relief.webp")
CACHE = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, ".tiles")
os.makedirs(CACHE, exist_ok=True)

# Marco del mapa (debe coincidir con RELIEF_VIEWBOX en lib/geo.ts): unidades = grados * 20
VX, VY, VW, VH = -1652, -22, 304, 412
SS = 10           # píxeles por unidad al calcular
OUT_PX = 5        # píxeles por unidad en la imagen final
Z = 9             # zoom de los tiles de elevación

# ---------- contornos ----------
src = open(os.path.join(HERE, "..", "lib", "peru-geo.ts"), encoding="utf-8").read()
rings = []
for m in re.finditer(r'rings: "([^"]+)"', src):
    for ring in m.group(1).split("|"):
        rings.append([(float(p.split(",")[0]), -float(p.split(",")[1])) for p in ring.split(" ")])  # Y hacia abajo

W, H = VW * SS, VH * SS
mask_img = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(mask_img)
for r in rings:
    d.polygon([((x - VX) * SS, (y - VY) * SS) for x, y in r], fill=255)
mask = np.asarray(mask_img, dtype=np.float32) / 255.0
del mask_img

# ---------- elevación (tiles Terrarium → grilla equirrectangular del SVG) ----------
n = 256 * 2 ** Z
def tile_xy(lon, lat):
    return ((lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)

tx_a, ty_a = [int(v // 256) for v in tile_xy(VX / 20.0, -VY / 20.0)]
tx_b, ty_b = [int(v // 256) for v in tile_xy((VX + VW) / 20.0, -(VY + VH) / 20.0)]

def fetch(t):
    tx, ty = t
    f = os.path.join(CACHE, f"{Z}_{tx}_{ty}.png")
    for _ in range(2):
        if not os.path.exists(f):
            # Descarga atómica: se baja a .part y se renombra, así una interrupción no deja tiles truncados.
            # curl usa los certificados del sistema (el Python de python.org suele no tenerlos).
            for intento in range(6):  # reintentos con espera: la red puede cortar una conexión suelta
                r = subprocess.run(["curl", "-sSf", "--retry", "3", "-o", f + ".part",
                                    f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png"])
                if r.returncode == 0:
                    break
                time.sleep(1.5 * (intento + 1))
            else:
                raise RuntimeError(f"no se pudo bajar el tile {Z}/{tx}/{ty}")
            os.replace(f + ".part", f)
        try:
            a = np.asarray(Image.open(f).convert("RGB"), dtype=np.float32)
            return t, a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
        except OSError:
            os.remove(f)  # archivo dañado: se vuelve a bajar
    raise RuntimeError(f"tile {Z}/{tx}/{ty} inválido")

tiles = [(x, y) for y in range(ty_a, ty_b + 1) for x in range(tx_a, tx_b + 1)]
print(f"{len(tiles)} tiles…", flush=True)
mos = np.zeros(((ty_b - ty_a + 1) * 256, (tx_b - tx_a + 1) * 256), dtype=np.float32)
with ThreadPoolExecutor(6) as ex:
    for (tx, ty), e in ex.map(fetch, tiles):
        mos[(ty - ty_a) * 256:(ty - ty_a + 1) * 256, (tx - tx_a) * 256:(tx - tx_a + 1) * 256] = e

def lin_axis(m, pos, axis):
    """Interpolación lineal separable a lo largo de un eje."""
    i0 = np.clip(np.floor(pos).astype(int), 0, m.shape[axis] - 2)
    f = (pos - i0).astype(np.float32)
    a, b = np.take(m, i0, axis=axis), np.take(m, i0 + 1, axis=axis)
    shp = [1, 1]; shp[axis] = -1
    return a * (1 - f.reshape(shp)) + b * f.reshape(shp)

gx = VX + (np.arange(W) + 0.5) / SS            # x del SVG → lon = x/20 (px depende solo de x)
gy = VY + (np.arange(H) + 0.5) / SS            # y del SVG → lat = -y/20 (py depende solo de y)
px = (gx / 20.0 + 180) / 360 * n - tx_a * 256 - 0.5
lat = -gy / 20.0
py = (1 - np.arcsinh(np.tan(np.radians(lat))) / math.pi) / 2 * n - ty_a * 256 - 0.5
elev = lin_axis(lin_axis(mos, py, 0), px, 1)
del mos
elev = np.maximum(elev, 0).astype(np.float32)

# ---------- sombreado del terreno ----------
dy_m = 111320.0 / (20 * SS)
dx_m = (dy_m * np.cos(np.radians(lat))).astype(np.float32)[:, None]
dzdy = np.gradient(elev, dy_m, axis=0)
dzdx = np.gradient(elev, axis=1) / dx_m
# Más exageración vertical en las tierras bajas (selva y costa): ahí el relieve es sutil y, sin
# ayuda, se vería liso. En la sierra se mantiene moderada para no saturar las cordilleras.
low_w = np.clip(1 - elev / 700.0, 0, 1)
ZF = 2.8 + 9.0 * low_w
slope = np.arctan(ZF * np.hypot(dzdx, dzdy))
aspect = np.arctan2(dzdy, -dzdx)
del dzdx, dzdy
def hill(az_deg, alt_deg):
    az, zen = np.radians(az_deg), np.radians(90 - alt_deg)
    return np.clip(np.cos(zen) * np.cos(slope) + np.sin(zen) * np.sin(slope) * np.cos(az - aspect), 0, 1)
hs = 0.6 * hill(315, 38) + 0.25 * hill(45, 55) + 0.15 * hill(200, 60)
del slope, aspect
# realce de contraste local: saca a la luz el micro‑relieve de las llanuras y las quebradas
hs_hp = hs - gaussian_filter(hs, 24)
hs_fine = hs - gaussian_filter(hs, 5)           # textura fina (copa de árboles / ondulaciones)
# oclusión de valles: lo que queda por debajo del entorno se oscurece
ao = np.clip((gaussian_filter(elev, 14) - elev) / 260.0, 0, 1)
# textura de selva: variación fina de la elevación, solo en tierras bajas
e_hp = (elev - gaussian_filter(elev, 4)) * low_w
k = np.clip(0.34 + 0.95 * hs ** 1.25 + 2.0 * hs_hp + 1.5 * hs_fine * low_w + np.clip(e_hp / 14.0, -0.12, 0.12) - 0.55 * ao,
            0.05, 1.3).astype(np.float32)
del hs, hs_hp, hs_fine, ao, e_hp, low_w

# ---------- color por altitud (verde → pardo → crema → blanco) ----------
STOPS = [(0, (108, 166, 82)), (600, (104, 160, 78)), (1000, (130, 158, 74)), (1600, (158, 124, 60)),
         (2500, (164, 108, 54)), (3300, (178, 126, 72)), (4000, (202, 160, 106)),
         (4800, (232, 214, 186)), (5600, (252, 250, 248))]
xs = [s[0] for s in STOPS]
rgb = np.stack([np.interp(elev, xs, [s[1][c] for s in STOPS]) for c in range(3)], -1).astype(np.float32)
del elev
rgb = np.clip(rgb * k[..., None], 0, 255)
del k

# ---------- sombras proyectadas (larga y suave + contacto) ----------
def drop(offset_xy, sigma, alpha):
    s = shift(mask, (offset_xy[1] * SS, offset_xy[0] * SS), order=1, mode="constant")
    return gaussian_filter(s, sigma * SS) * alpha
sh = np.clip(drop((-4.2, 4.6), 3.4, 0.42) + drop((-0.9, 1.1), 0.9, 0.34), 0, 0.7)
a = mask
out_a = a + sh * (1 - a)
shadow_col = np.array([52, 62, 78], dtype=np.float32)
out_rgb = (rgb * a[..., None] + shadow_col * (sh * (1 - a))[..., None]) / np.maximum(out_a, 1e-6)[..., None]

img = Image.fromarray(np.dstack([np.clip(out_rgb, 0, 255), np.clip(out_a * 255, 0, 255)]).astype(np.uint8))
img = img.resize((VW * OUT_PX, VH * OUT_PX), Image.LANCZOS)
img.save(OUT, "WEBP", quality=78, method=6)
print("listo:", OUT, os.path.getsize(OUT) // 1024, "KB", img.size)
