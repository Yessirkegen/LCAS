"""Build routes by snapping endpoints within 200m tolerance, then Dijkstra."""

import json
import math
import heapq
from collections import defaultdict

RAILWAYS_FILE = "frontend/public/geo/kz_railways.json"
OUTPUT_FILE = "backend/app/simulator/routes_osm.py"

MAJOR_CITIES = {
    "Астана": (51.17, 71.45),
    "Караганда": (49.80, 73.10),
    "Алматы": (43.24, 76.95),
    "Шу": (43.60, 73.76),
    "Костанай": (53.21, 63.63),
    "Павлодар": (52.28, 76.97),
    "Семей": (50.41, 80.23),
    "Актобе": (50.28, 57.17),
    "Жезказган": (47.80, 67.71),
    "Балхаш": (46.84, 74.95),
    "Шымкент": (42.32, 69.60),
    "Кызылорда": (44.85, 65.50),
    "Туркестан": (43.30, 68.25),
    "Тараз": (42.90, 71.37),
}


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
    return R * 2 * math.asin(min(1, math.sqrt(a)))


def snap(lat, lon, precision=2):
    """Round to ~1.1km grid — enough to connect adjacent segments."""
    return (round(lat, precision), round(lon, precision))


def build_graph(railways):
    graph = defaultdict(list)
    for feat in railways["features"]:
        coords = feat["geometry"]["coordinates"]
        if len(coords) < 2:
            continue
        start = snap(coords[0][1], coords[0][0])
        end = snap(coords[-1][1], coords[-1][0])
        if start == end:
            continue
        dist = sum(haversine(coords[i][1], coords[i][0], coords[i+1][1], coords[i+1][0]) for i in range(len(coords)-1))
        full = [(c[1], c[0]) for c in coords]
        graph[start].append({"to": end, "dist": dist, "pts": full})
        graph[end].append({"to": start, "dist": dist, "pts": list(reversed(full))})
    return graph


def nearest(graph, lat, lon):
    best, bd = None, 1e9
    for n in graph:
        d = haversine(lat, lon, n[0], n[1])
        if d < bd:
            bd = d
            best = n
    return best


def dijkstra(graph, start, end):
    dist_map = {start: 0}
    prev = {}
    pq = [(0, id(start), start)]
    visited = set()

    while pq:
        d, _, node = heapq.heappop(pq)
        if node in visited:
            continue
        visited.add(node)
        if node == end:
            break
        for edge in graph.get(node, []):
            nb, nd = edge["to"], d + edge["dist"]
            if nd > 3000:
                continue
            if nb not in dist_map or nd < dist_map[nb]:
                dist_map[nb] = nd
                prev[nb] = (node, edge["pts"])
                heapq.heappush(pq, (nd, id(nb), nb))

    if end not in prev and end != start:
        return None, 0

    segs = []
    n = end
    while n in prev:
        parent, pts = prev[n]
        segs.append(pts)
        n = parent
    segs.reverse()

    all_pts = []
    for seg in segs:
        all_pts.extend(seg)

    # dedup
    if all_pts:
        clean = [all_pts[0]]
        for p in all_pts[1:]:
            if abs(p[0]-clean[-1][0]) > 1e-6 or abs(p[1]-clean[-1][1]) > 1e-6:
                clean.append(p)
        all_pts = clean

    return all_pts, dist_map.get(end, 0)


def thin(pts, max_n=200):
    if len(pts) <= max_n:
        return pts
    step = max(1, (len(pts)-2) // (max_n-2))
    r = [pts[0]]
    for i in range(step, len(pts)-1, step):
        r.append(pts[i])
    r.append(pts[-1])
    return r


def with_km(pts):
    r = [(pts[0][0], pts[0][1], 0.0)]
    c = 0
    for i in range(1, len(pts)):
        c += haversine(pts[i-1][0], pts[i-1][1], pts[i][0], pts[i][1])
        r.append((pts[i][0], pts[i][1], round(c, 1)))
    return r


def main():
    with open(RAILWAYS_FILE) as f:
        rw = json.load(f)
    print(f"Segments: {len(rw['features'])}")

    graph = build_graph(rw)
    print(f"Graph nodes: {len(graph)}")

    pairs = [
        ("astana_karaganda", "Астана", "Караганда"),
        ("astana_pavlodar", "Астана", "Павлодар"),
        ("astana_kostanay", "Астана", "Костанай"),
        ("karaganda_balkhash", "Караганда", "Балхаш"),
        ("aktobe_kyzylorda", "Актобе", "Кызылорда"),
        ("semey_pavlodar", "Семей", "Павлодар"),
        ("karaganda_zhezkazgan", "Караганда", "Жезказган"),
        ("almaty_shu", "Алматы", "Шу"),
        ("almaty_taraz", "Алматы", "Тараз"),
        ("shymkent_turkestan", "Шымкент", "Туркестан"),
    ]

    routes = {}
    for rid, oname, dname in pairs:
        o = MAJOR_CITIES[oname]
        d = MAJOR_CITIES[dname]
        sn = nearest(graph, o[0], o[1])
        en = nearest(graph, d[0], d[1])
        print(f"\n{rid}: {oname}->{dname}  start={sn} end={en}")

        pts, km = dijkstra(graph, sn, en)
        if pts and len(pts) > 3:
            t = thin(pts, 200)
            wk = with_km(t)
            routes[rid] = {"name": f"{oname} — {dname}", "total_km": round(km), "origin": oname, "destination": dname, "points": wk}
            print(f"  OK: {len(pts)} raw -> {len(t)} thin, {km:.0f}km")
        else:
            print(f"  FAIL")

    with open(OUTPUT_FILE, "w") as f:
        f.write('"""Routes from real OSM railway tracks (Dijkstra on segment graph)."""\n\n')
        f.write("ROUTES_KZ = {\n")
        for rid, rt in routes.items():
            f.write(f'    "{rid}": {{\n')
            f.write(f'        "name": "{rt["name"]}",\n')
            f.write(f'        "total_km": {rt["total_km"]},\n')
            f.write(f'        "origin": "{rt["origin"]}",\n')
            f.write(f'        "destination": "{rt["destination"]}",\n')
            f.write(f'        "points": [\n')
            for p in rt["points"]:
                f.write(f"            ({p[0]}, {p[1]}, {p[2]}),\n")
            f.write("        ],\n")
            f.write('        "stations": [],\n')
            f.write('        "restrictions": [],\n')
            f.write("    },\n")
        f.write("}\n\nALL_ROUTE_IDS = list(ROUTES_KZ.keys())\n")

    print(f"\n=== {len(routes)} routes -> {OUTPUT_FILE} ===")


if __name__ == "__main__":
    main()
