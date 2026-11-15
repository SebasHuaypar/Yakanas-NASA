#!/usr/bin/env python3
"""
Genera lib/places-generated.ts: los poblados más grandes de cada departamento (nombre, lat, lon)
para rotular el relieve 3D.

Uso:  python3 -I tools/make_places.py ruta/a/PE.txt
Datos: GeoNames (https://download.geonames.org/export/dump/PE.zip), licencia CC BY 4.0.
Los contornos salen de lib/peru-geo.ts; la altitud de cada lugar la calcula la app con el modelo de elevación.
"""
import math, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1]
OUT = os.path.join(HERE, "..", "lib", "places-generated.ts")

# ---------- departamentos (anillos en x = lon*20, y = lat*20 con Y hacia arriba, igual que peru-geo.ts) ----------
geo = open(os.path.join(HERE, "..", "lib", "peru-geo.ts"), encoding="utf-8").read()
depts = {}
for m in re.finditer(r'id: "([^"]+)".*?rings: "([^"]+)"', geo):
    depts[m.group(1)] = [[tuple(map(float, p.split(","))) for p in r.split(" ")] for r in m.group(2).split("|")]

def inside(x, y, ring):
    c = False
    for i in range(len(ring)):
        x1, y1 = ring[i]; x2, y2 = ring[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c

def bbox(rings):
    xs = [p[0] for r in rings for p in r]; ys = [p[1] for r in rings for p in r]
    return min(xs), max(xs), min(ys), max(ys)
boxes = {k: bbox(v) for k, v in depts.items()}

def dept_of(lat, lon):
    x, y = lon * 20, lat * 20
    for k, rings in depts.items():
        x0, x1, y0, y1 = boxes[k]
        if x0 <= x <= x1 and y0 <= y <= y1 and any(inside(x, y, r) for r in rings):
            return k
    return None

# ---------- poblados ----------
by_dept = {k: [] for k in depts}
for line in open(SRC, encoding="utf-8"):
    f = line.rstrip("\n").split("\t")
    if len(f) < 15 or f[6] != "P":
        continue
    try:
        pop = int(f[14] or 0)
    except ValueError:
        pop = 0
    if pop <= 0:
        continue
    name = re.sub(r"\s*\(.*?\)", "", f[1]).strip()  # "El Triunfo ( El Cruce)" → "El Triunfo"
    if not name or len(name) > 24:                       # nombres larguísimos no caben en el rótulo
        continue
    f[1] = name
    lat, lon = float(f[4]), float(f[5])
    k = dept_of(lat, lon)
    if k:
        by_dept[k].append((pop, f[1], lat, lon))

# ---------- los más grandes de cada uno, separados entre sí ----------
def pick(places, min_sep, n=12, n1=6):
    chosen = []
    for pop, name, lat, lon in sorted(places, reverse=True):
        if any(math.hypot(lat - c[2], (lon - c[3]) * math.cos(math.radians(lat))) < min_sep for c in chosen):
            continue
        if any(c[1].lower() == name.lower() for c in chosen):
            continue
        chosen.append((pop, name, lat, lon))
        if len(chosen) == n:
            break
    return [(name, lat, lon, 1 if i < n1 else 2) for i, (pop, name, lat, lon) in enumerate(chosen)]

lines = ['// Generado por tools/make_places.py a partir de GeoNames (CC BY 4.0). No editar a mano.',
         'import type { Place } from "./places";', '',
         'const P = (name: string, lat: number, lon: number, level: 1 | 2): Place => ({ name, lat, lon, level });', '',
         '/** Los poblados más grandes de cada departamento (los de nivel 1 se rotulan siempre). */',
         'export const GENERATED_PLACES: Record<string, Place[]> = {']
for k in sorted(by_dept):
    x0, x1, y0, y1 = boxes[k]
    span = max(x1 - x0, y1 - y0) / 20  # grados
    sep = 0.05 if span < 1 else 0.18   # separación mínima en grados (más fina en departamentos pequeños)
    items = pick(by_dept[k], sep)
    body = ", ".join('P(%s, %.4f, %.4f, %d)' % (repr(n).replace("'", '"') if '"' not in n else '"%s"' % n.replace('"', ''), la, lo, lv) for n, la, lo, lv in items)
    lines.append('  "%s": [%s],' % (k, body))
    print(k, len(by_dept[k]), "poblados →", len(items), ":", ", ".join(n for n, *_ in items[:6]))
lines.append('};\n')
open(OUT, "w", encoding="utf-8").write("\n".join(lines))
print("listo:", OUT, os.path.getsize(OUT) // 1024, "KB")
