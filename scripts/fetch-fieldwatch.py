#!/usr/bin/env python3
"""Year-long Sentinel-2 record for the Mesogeia field-watch demo plots.

Real: field outlines (OpenStreetMap ways), every Sentinel-2 L2A scene of tile
34SGH from 2025-11-01 to 2026-10-31 with < 60 % cloud, the per-date indices
measured over each outline, and the true-colour frames. Simulated: owners,
declarations and the in-duty zone, exactly as for the Drafi plots.

Each field's index is the median over pixels that sit wholly inside a 10 m
inward buffer of the outline and that the scene's own classification (SCL)
marks as vegetation or bare soil. A date is kept for a field only when at
least 80 % of its pixels are clear.

    python3 -m venv .venv && .venv/bin/pip install numpy rasterio shapely pyproj \
        pystac-client planetary-computer pillow requests
    .venv/bin/python scripts/fetch-fieldwatch.py

Writes public/imagery/fieldwatch/, data/fieldwatch.json, and merges the
field-watch plot into data/scenario.json and data/imagery.json.
"""

from __future__ import annotations

import io
import json
import math
import concurrent.futures as cf
from datetime import date, datetime, timezone
from pathlib import Path

import numpy as np
import planetary_computer as pc
import pystac_client
import rasterio
import requests
from PIL import Image, ImageDraw
from pyproj import Geod, Transformer
from rasterio.features import rasterize
from rasterio.windows import from_bounds
from shapely import transform as shp_transform
from shapely.geometry import Polygon, mapping

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "imagery" / "fieldwatch"
OUT_JSON = ROOT / "data" / "fieldwatch.json"
SCENARIO = ROOT / "data" / "scenario.json"
IMAGERY = ROOT / "data" / "imagery.json"

STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"
DATA_API = "https://planetarycomputer.microsoft.com/api/data/v1"
WMS = "https://gis.ktimanet.gr/wms/wmsopen/wmsserver.aspx"
OVERPASS = "https://overpass-api.de/api/interpreter"
TILE = "34SGH"
START, END = "2025-11-01", "2026-10-31"
SEASON_START, SEASON_END = "2026-05-01", "2026-10-31"
FRAME_PX = 384
CHIP_PX = 512

# One plot kept for the demo: open land with dry grass and shrubs between houses
# (OSM grassland, about 6,800 m2). Green on 1 May, then dries where it stands.
# Picked from 575 OSM fields near Pikermi/Spata after reading every curve and the
# orthophoto; most other candidates turned out to be vineyards being tilled, which
# is farm work, not plot clearing. "role" is what the curve and frames show.
CLUSTERS = [
    {"id": "B", "fields": [(1288746850, "covered", "DEMO-FIELD-001")]},
]

geod = Geod(ellps="WGS84")


def osm_rings(ids: list[int]) -> dict[int, dict]:
    query = f"[out:json][timeout:60];way(id:{','.join(map(str, ids))});out geom tags;"
    res = requests.post(OVERPASS, data={"data": query}, headers={"User-Agent": "plotcheck-demo"}, timeout=120)
    res.raise_for_status()
    out = {}
    for el in res.json()["elements"]:
        ring = [[round(p["lon"], 7), round(p["lat"], 7)] for p in el["geometry"]]
        out[el["id"]] = {"ring": ring, "tags": el.get("tags", {})}
    return out


def square_bounds(rings: list[list[list[float]]], pad_m: float, min_side_m: float) -> list[float]:
    lons = [p[0] for r in rings for p in r]
    lats = [p[1] for r in rings for p in r]
    cx, cy = (min(lons) + max(lons)) / 2, (min(lats) + max(lats)) / 2
    m_lon = 111_320 * math.cos(math.radians(cy))
    side = max((max(lons) - min(lons)) * m_lon, (max(lats) - min(lats)) * 110_540) + 2 * pad_m
    half = max(side, min_side_m) / 2
    return [cx - half / m_lon, cy - half / 110_540, cx + half / m_lon, cy + half / 110_540]


def side_m(b: list[float]) -> int:
    return round((b[2] - b[0]) * 111_320 * math.cos(math.radians((b[1] + b[3]) / 2)))


def draw_ring(img: Image.Image, ring, bounds, colour="#ffe14a", width=3) -> Image.Image:
    w, h = img.size
    pts = [((x - bounds[0]) / (bounds[2] - bounds[0]) * w, (bounds[3] - y) / (bounds[3] - bounds[1]) * h) for x, y in ring]
    ImageDraw.Draw(img).line(pts, fill=colour, width=width, joint="curve")
    return img


def wms(bounds: list[float], px: int) -> Image.Image:
    params = dict(SERVICE="WMS", VERSION="1.1.1", REQUEST="GetMap", LAYERS="BASEMAP", STYLES="",
                  FORMAT="image/jpeg", SRS="EPSG:4326", BBOX=",".join(map(str, bounds)), WIDTH=px, HEIGHT=px)
    res = requests.get(WMS, params=params, timeout=90)
    res.raise_for_status()
    return Image.open(io.BytesIO(res.content)).convert("RGB")


def s2_frame(item_id: str, bounds: list[float]) -> Image.Image:
    url = f"{DATA_API}/item/bbox/{','.join(map(str, bounds))}/{FRAME_PX}x{FRAME_PX}.png"
    params = {"collection": "sentinel-2-l2a", "item": item_id, "assets": "visual", "resampling": "nearest"}
    for attempt in range(5):
        try:
            res = requests.get(url, params=params, timeout=120)
            res.raise_for_status()
            return Image.open(io.BytesIO(res.content)).convert("RGB")
        except requests.RequestException:
            if attempt == 4:
                raise
    raise RuntimeError("unreachable")


def frame_items(items) -> list:
    """Clearest scene in each half-month: about two frames a month."""
    best: dict[str, object] = {}
    for item in items:
        d = item.datetime.date()
        key = f"{d.year}-{d.month:02d}-{'a' if d.day <= 15 else 'b'}"
        if item.properties["eo:cloud_cover"] > 15:
            continue
        if key not in best or item.properties["eo:cloud_cover"] < best[key].properties["eo:cloud_cover"]:
            best[key] = item
    return [best[k] for k in sorted(best)]


KEY_DATES = ["03-01", "04-29", "06-20", "08-15"]


def add_key_frames(doc: dict, scenario: dict) -> None:
    """Four frames per plot with its outline drawn in, for the model to read."""
    rings = {f["id"]: f["geometry"]["coordinates"][0] for f in scenario["parcels"]["features"]}
    for cluster in doc["clusters"]:
        frames = cluster["frames"]
        for pid in cluster["members"]:
            year = doc["seasonStart"][:4]
            picked = []
            for md in KEY_DATES:
                target = date.fromisoformat(f"{year}-{md}")
                best = min(frames, key=lambda f: abs((date.fromisoformat(f["date"]) - target).days))
                if best not in picked:
                    picked.append(best)
            keys = []
            for frame in picked:
                img = Image.open(ROOT / "public" / frame["src"].lstrip("/")).convert("RGB")
                img = img.resize((CHIP_PX, CHIP_PX), Image.NEAREST)
                for other in cluster["members"]:
                    if other != pid:
                        draw_ring(img, rings[other], cluster["bounds"], colour="#ffffff", width=1)
                draw_ring(img, rings[pid], cluster["bounds"])
                name = f"{pid}-key-{frame['date']}.jpg"
                img.save(OUT_DIR / name, quality=85)
                keys.append({"date": frame["date"], "src": f"/imagery/fieldwatch/{name}", "sideM": cluster["sideM"]})
            doc["parcels"][pid]["keyFrames"] = keys


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    all_ids = [fid for c in CLUSTERS for fid, _, _ in c["fields"]]
    osm = osm_rings(all_ids)

    cat = pystac_client.Client.open(STAC, modifier=pc.sign_inplace)
    lons = [p[0] for v in osm.values() for p in v["ring"]]
    lats = [p[1] for v in osm.values() for p in v["ring"]]
    search = cat.search(collections=["sentinel-2-l2a"], bbox=[min(lons), min(lats), max(lons), max(lats)],
                        datetime=f"{START}/{END}", query={"s2:mgrs_tile": {"eq": TILE}, "eo:cloud_cover": {"lt": 60}})
    items = sorted(search.items(), key=lambda i: i.datetime)
    print(f"{len(items)} scenes")

    with rasterio.open(items[0].assets["B04"].href) as ds:
        crs, grid = ds.crs, ds.transform
    to_utm = Transformer.from_crs("EPSG:4326", crs, always_xy=True).transform

    # Pixel masks on the common 10 m grid of the tile.
    fields = []
    for fid in all_ids:
        poly = Polygon(osm[fid]["ring"])
        inner = shp_transform(poly, lambda xy: np.column_stack(to_utm(xy[:, 0], xy[:, 1]))).buffer(-10)
        fields.append({"osmId": fid, "inner": inner, "areaM2": round(abs(geod.geometry_area_perimeter(poly)[0]))})
    minx = min(f["inner"].bounds[0] for f in fields) - 20
    miny = min(f["inner"].bounds[1] for f in fields) - 20
    maxx = max(f["inner"].bounds[2] for f in fields) + 20
    maxy = max(f["inner"].bounds[3] for f in fields) + 20
    win = from_bounds(minx, miny, maxx, maxy, grid).round_offsets().round_lengths()
    shape = (int(win.height), int(win.width))
    wtf = rasterio.windows.transform(win, grid)
    for f in fields:
        f["mask"] = rasterize([(mapping(f["inner"]), 1)], out_shape=shape, transform=wtf, dtype=np.uint8).astype(bool)
        f["pixels"] = int(f["mask"].sum())

    row0, col0 = int(win.row_off), int(win.col_off)

    def read(item, band):
        """Whole-pixel window on the 10 m grid; 20 m bands are read whole and repeated, never resampled."""
        with rasterio.open(pc.sign(item.assets[band].href)) as ds:
            k = round(ds.transform.a / grid.a)  # 1 for 10 m, 2 for 20 m
            r, c = row0 // k, col0 // k
            h = -(-(row0 + shape[0]) // k) - r
            w = -(-(col0 + shape[1]) // k) - c
            data = ds.read(1, window=rasterio.windows.Window(c, r, w, h), boundless=True)
            if k > 1:
                data = data.repeat(k, axis=0).repeat(k, axis=1)
            dr, dc = row0 - r * k, col0 - c * k
            return data[dr:dr + shape[0], dc:dc + shape[1]].astype(np.float32)

    def measure(item):
        offset = 1000.0 if float(item.properties.get("s2:processing_baseline", "5")) >= 4 else 0.0
        raw = {b: read(item, b) for b in ["B02", "B04", "B08", "B11", "B12", "SCL"]}
        r = {b: (raw[b] - offset) / 10_000 for b in ["B02", "B04", "B08", "B11", "B12"]}
        clear = np.isin(raw["SCL"], [4, 5])
        e = 1e-6
        ndvi = (r["B08"] - r["B04"]) / (r["B08"] + r["B04"] + e)
        ndti = (r["B11"] - r["B12"]) / (r["B11"] + r["B12"] + e)
        bsi = ((r["B11"] + r["B04"]) - (r["B08"] + r["B02"])) / ((r["B11"] + r["B04"]) + (r["B08"] + r["B02"]) + e)
        out = {}
        for f in fields:
            c = f["mask"] & clear
            if c.sum() >= max(3, 0.8 * f["pixels"]):
                out[f["osmId"]] = [round(float(np.median(x[c])), 3) for x in (ndvi, ndti, bsi)]
        print("measured", item.datetime.date())
        return item.datetime.date().isoformat(), out

    series: dict[int, list] = {f["osmId"]: [] for f in fields}
    with cf.ThreadPoolExecutor(6) as ex:
        for day, out in ex.map(measure, items):
            for fid, values in out.items():
                series[fid].append([day, *values])
    for fid in series:
        series[fid].sort()

    frames = frame_items(items)
    scenario = json.loads(SCENARIO.read_text())
    imagery = json.loads(IMAGERY.read_text())
    ours = {pid for c in CLUSTERS for _, _, pid in c["fields"]}
    scenario["parcels"]["features"] = [f for f in scenario["parcels"]["features"] if f["id"] not in ours]
    scenario["declarations"] = [d for d in scenario["declarations"] if d["parcelId"] not in ours]
    for key in [k for k in imagery["parcels"] if k in ours]:
        del imagery["parcels"][key]

    doc = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "seasonStart": SEASON_START,
        "seasonEnd": SEASON_END,
        "source": {
            "name": "Sentinel-2 L2A, tile 34SGH",
            "via": "Microsoft Planetary Computer",
            "scenes": len(items),
            "window": f"{START}/{END}",
            "outlines": "OpenStreetMap ways (© OpenStreetMap contributors, ODbL)",
            "index": "median over SCL-clear (vegetation, bare soil) pixels inside a 10 m inward buffer; BOA offset removed",
        },
        "clusters": [],
        "parcels": {},
    }

    n = 0
    for cluster in CLUSTERS:
        rings = [osm[fid]["ring"] for fid, _, _ in cluster["fields"]]
        bounds = square_bounds(rings, pad_m=90, min_side_m=360)
        cframes = []
        for item in frames:
            day = item.datetime.date().isoformat()
            name = f"{cluster['id']}-{day}.jpg"
            if not (OUT_DIR / name).exists():
                s2_frame(item.id, bounds).save(OUT_DIR / name, quality=82)
            cframes.append({"date": day, "src": f"/imagery/fieldwatch/{name}"})
        if not (OUT_DIR / f"{cluster['id']}-ortho.jpg").exists():
            wms(bounds, 768).save(OUT_DIR / f"{cluster['id']}-ortho.jpg", quality=82)
        members = []
        for fid, role, pid in cluster["fields"]:
            n += 1
            members.append(pid)
            field = next(f for f in fields if f["osmId"] == fid)
            ring = osm[fid]["ring"]
            tag = osm[fid]["tags"].get("landuse") or osm[fid]["tags"].get("natural") or "land"
            scenario["parcels"]["features"].append({
                "type": "Feature",
                "id": pid,
                "geometry": {"type": "Polygon", "coordinates": [ring]},
                "properties": {
                    "id": pid,
                    "areaM2": field["areaM2"],
                    "street": {"el": f"Μεσόγεια · OSM way {fid}", "en": f"Mesogeia · OSM way {fid}"},
                    "zone": "within_100m",
                    "owner": "Ιδιοκτήτης (προσομοίωση)",
                    "forestEdge": False,
                    "nearbyHouses": True,
                    "sensitiveSite": False,
                    "slopeClass": "low",
                    "poorEscapeRoad": False,
                    "enclosed": False,
                },
            })
            # Every field-watch owner declares cleaned before the season opens.
            scenario["declarations"].append({
                "parcelId": pid,
                "submittedAt": f"2026-04-{24 + n % 6:02d}T10:{10 + n:02d}:00+03:00",
                "claimedCleaned": True,
                "registryRef": f"SIM-ΔΗΛ-2026-{900 + n:04d}",
            })
            chip_b = square_bounds([ring], pad_m=60, min_side_m=240)
            if not (OUT_DIR / f"{pid}-ortho.jpg").exists():
                draw_ring(wms(chip_b, CHIP_PX), ring, chip_b).save(OUT_DIR / f"{pid}-ortho.jpg", quality=85)
            imagery["parcels"][pid] = {
                "ortho": {"src": f"/imagery/fieldwatch/{pid}-ortho.jpg", "bounds": chip_b, "sideM": side_m(chip_b)},
                "sentinel": None,
                "interiorAfterBufferM2": round(field["inner"].area, 1),
                "errors": [],
            }
            doc["parcels"][pid] = {
                "osmId": fid,
                "osmLanduse": tag,
                "cluster": cluster["id"],
                "pixels": field["pixels"],
                "curatedRole": role,
                "series": series[fid],
            }
            print(pid, fid, role, field["pixels"], "px", len(series[fid]), "dates")
        doc["clusters"].append({
            "id": cluster["id"],
            "bounds": bounds,
            "sideM": side_m(bounds),
            "ortho": f"/imagery/fieldwatch/{cluster['id']}-ortho.jpg",
            "members": members,
            "frames": cframes,
        })

    add_key_frames(doc, scenario)
    OUT_JSON.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
    SCENARIO.write_text(json.dumps(scenario, ensure_ascii=False, indent=2) + "\n")
    IMAGERY.write_text(json.dumps(imagery, ensure_ascii=False, indent=2) + "\n")
    print("wrote", OUT_JSON.relative_to(ROOT))


if __name__ == "__main__":
    import sys

    if "--key-frames-only" in sys.argv:
        doc = json.loads(OUT_JSON.read_text())
        add_key_frames(doc, json.loads(SCENARIO.read_text()))
        OUT_JSON.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
    else:
        main()
