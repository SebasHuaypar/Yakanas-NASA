#!/usr/bin/env python3
"""
Genera lib/peru-geo.ts (contornos de los 26 departamentos) desde geoBoundaries (gbOpen, PER, ADM1;
fuente Wikimedia Commons, dominio público).

Los contornos anteriores venían en una cuadrícula de 0,05° (~5,5 km): la costa no coincidía con la
imagen satelital (por ejemplo, Lima Metropolitana cortada en diagonal). Estos conservan los decimales.

Formato de salida (igual que antes): por departamento, anillos "x,y x,y ..." en grados × 20, con Y hacia
arriba, separados por "|". Se mantienen los ids y nombres del archivo actual.

Uso:  python3 -I tools/make_peru_geo.py geoBoundaries-PER-ADM1.geojson [tolerancia_grados]
Descarga: https://www.geoboundaries.org/api/current/gbOpen/PER/ADM1/  (campo gjDownloadURL)
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "lib", "peru-geo.ts")
SRC = sys.argv[1]
TOL = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0015  # ~150 m: invisible a la escala del mapa


def simplify(pts, tol):
    """Douglas-Peucker sobre un anillo cerrado: se parte en el punto más lejano al inicio (si no, el primer
    y el último punto coinciden, el segmento de referencia mide cero y no se descarta nada)."""
    if len(pts) < 5:
        return pts
    x0, y0 = pts[0]
    k = max(range(len(pts)), key=lambda i: (pts[i][0] - x0) ** 2 + (pts[i][1] - y0) ** 2)
    a, b = _dp(pts[: k + 1], tol), _dp(pts[k:], tol)
    out = a + b[1:]
    return out if len(out) >= 4 else pts


def _dp(pts, tol):
    """Douglas-Peucker (iterativo) sobre una polilínea abierta."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = pts[a], pts[b]
        dx, dy = bx - ax, by - ay
        L = (dx * dx + dy * dy) ** 0.5 or 1e-12
        best, idx = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / L
            if d > best:
                best, idx = d, i
        if best > tol and idx > 0:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


# Ids y nombres del archivo actual (la UI ya los conoce).
cur = open(OUT, encoding="utf-8").read()
names = dict(re.findall(r'id:\s*"([^"]+)",\s*name:\s*"([^"]+)"', cur))
order = list(names)

gb = json.load(open(SRC, encoding="utf-8"))
rings_by_id = {}
for f in gb["features"]:
    rid = f["properties"]["shapeISO"].rstrip("*")  # geoBoundaries marca Lima Metropolitana como "PE-LMA*"
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    rings = []
    for p in polys:
        if len(p) > 1:
            raise SystemExit(f"{rid}: el polígono tiene huecos; este formato no los soporta")
        ring = [(lon, lat) for lon, lat in p[0]]
        if ring[0] == ring[-1]:
            ring = ring[:-1]
        rings.append(simplify(ring + [ring[0]], TOL)[:-1])
    rings_by_id[rid] = rings

missing = [i for i in order if i not in rings_by_id]
if missing:
    raise SystemExit(f"Faltan en geoBoundaries: {missing}")

def fmt(v):
    s = f"{v * 20:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s

lines = [
    "// Contornos de los departamentos del Perú. Fuente: geoBoundaries (gbOpen PER ADM1, Wikimedia Commons,",
    "// dominio público), generado con tools/make_peru_geo.py. No editar a mano.",
    "// Cada anillo es una lista \"x,y x,y ...\" en grados*20 con el eje Y hacia arriba",
    "// (se invierte al dibujar). Es geometría estática: no contiene datos de fuego.",
    "",
    "export type DeptGeo = {",
    "  id: string;",
    "  /** Nombre oficial tal como viene de la fuente */",
    "  name: string;",
    "  rings: string;",
    "};",
    "",
    "export const PERU_GEO: DeptGeo[] = [",
]
total = 0
for rid in order:
    rs = rings_by_id[rid]
    total += sum(len(r) for r in rs)
    txt = "|".join(" ".join(f"{fmt(lon)},{fmt(lat)}" for lon, lat in r) for r in rs)
    lines.append(f'  {{ id: "{rid}", name: "{names[rid]}", rings: "{txt}" }},')
lines.append("];")
open(OUT, "w", encoding="utf-8").write("\n".join(lines) + "\n")
print(f"{len(order)} departamentos, {total} puntos → {OUT} ({os.path.getsize(OUT) // 1024} KB)")
