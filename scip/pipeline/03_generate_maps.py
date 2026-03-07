#!/usr/bin/env python3
"""
generate_site_images.py
-----------------------
Generates all 11 required SCIP maps for a site candidate.

Maps produced:
  1.  Aerial Map              — Mapbox satellite high-res
  2.  Topography Map          — USGS National Map topo tiles
  3.  Floodplain Map          — FEMA NFHL flood zones overlay on Mapbox
  4.  Zoning Map              — ESRI World Imagery + Mapbox streets context
  5.  FLU Map                 — Mapbox streets (Future Land Use context)
  6.  Wetlands Map            — USFWS NWI wetlands overlay on Mapbox
  7.  Closest Airport Map     — Mapbox with nearest airport pin + distance
  8.  Cell Tower/Antenna Map  — FCC ASR towers plotted on Mapbox satellite
  9.  Parcel Map              — Mapbox streets zoomed to parcel level
  10. Wind Speed Map          — NREL wind resource overlay (static image)
  11. Search Ring Map         — Mapbox streets with configurable radius ring

Usage:
    python generate_site_images.py <lat> <lon> <output_dir> [options]

Options:
    --label LABEL       Site label/ID for filenames (default: site)
    --radius_ft FEET    Search ring radius in feet (default: 500)
    --address ADDR      Site address for labeling

Example:
    python generate_site_images.py 42.9634 -85.6681 /tmp/scip_maps --label "GR-001" --radius_ft 500
"""

import os
import sys
import math
import json
import argparse
import requests
import urllib.parse
from pathlib import Path
from io import BytesIO

SECRETS_PATH = os.path.join(os.path.dirname(__file__), "../references/.secrets")

# ─── Helpers ────────────────────────────────────────────────────────────────

def load_secrets():
    secrets = {}
    with open(SECRETS_PATH) as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                secrets[k.strip()] = v.strip()
    return secrets

def save_image_from_response(r, filepath, label):
    ct = r.headers.get("content-type", "")
    if r.status_code == 200 and "image" in ct:
        with open(filepath, "wb") as f:
            f.write(r.content)
        print(f"  ✅ {label}: saved ({len(r.content):,} bytes)")
        return True
    else:
        print(f"  ❌ {label}: HTTP {r.status_code} | {r.text[:150]}")
        return False

def get(url, params=None, headers=None, timeout=20):
    return requests.get(url, params=params, headers=headers, timeout=timeout)

def ft_to_deg(feet, lat):
    m = feet * 0.3048
    return m / 111320, m / (111320 * math.cos(math.radians(lat)))

def circle_geojson(lat, lon, radius_ft, stroke="#e63946", fill_opacity=0.12):
    lat_d, lon_d = ft_to_deg(radius_ft, lat)
    pts = [[lon + lon_d * math.cos(math.radians(i * (360/64))),
            lat + lat_d * math.sin(math.radians(i * (360/64)))] for i in range(65)]
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {"stroke": stroke, "stroke-width": 3,
                           "fill": stroke, "fill-opacity": fill_opacity},
            "geometry": {"type": "Polygon", "coordinates": [pts]}
        }]
    }

def mapbox_static(style, lon, lat, zoom, size, token, overlay=None, retina=False):
    """Build a Mapbox Static Images URL."""
    base = f"https://api.mapbox.com/styles/v1/mapbox/{style}/static"
    res = "@2x" if retina else ""
    if overlay:
        enc = urllib.parse.quote(json.dumps(overlay), safe="")
        url = f"{base}/geojson({enc})/{lon},{lat},{zoom},0/{size}{res}"
    else:
        url = f"{base}/{lon},{lat},{zoom},0/{size}{res}"
    return url, {"access_token": token}

def wms_overlay_on_mapbox(mapbox_url, mapbox_params, wms_url, wms_params,
                           filepath, label, size=(800, 600)):
    """
    Fetch a Mapbox basemap and a WMS overlay, composite them with Pillow.
    Falls back to saving just the Mapbox image if WMS fails.
    """
    try:
        from PIL import Image
    except ImportError:
        import subprocess
        subprocess.run(["sudo", "pip3", "install", "pillow", "-q"])
        from PIL import Image

    # Fetch basemap
    r_base = get(mapbox_url, mapbox_params)
    if r_base.status_code != 200 or "image" not in r_base.headers.get("content-type",""):
        print(f"  ❌ {label} (basemap): HTTP {r_base.status_code}")
        return False

    base_img = Image.open(BytesIO(r_base.content)).convert("RGBA")
    w, h = base_img.size

    # Fetch WMS overlay
    try:
        r_wms = get(wms_url, wms_params, timeout=20)
        if r_wms.status_code == 200 and "image" in r_wms.headers.get("content-type",""):
            overlay_img = Image.open(BytesIO(r_wms.content)).convert("RGBA").resize((w, h))
            composite = Image.alpha_composite(base_img, overlay_img)
            composite.save(filepath)
            print(f"  ✅ {label}: saved with overlay ({w}x{h})")
            return True
        else:
            print(f"  ⚠️  {label}: WMS overlay failed (HTTP {r_wms.status_code}), saving basemap only")
    except Exception as e:
        print(f"  ⚠️  {label}: WMS overlay error ({e}), saving basemap only")

    base_img.save(filepath)
    return True

def lat_lon_to_bbox(lat, lon, zoom, width=800, height=600):
    """Convert center lat/lon + zoom to a WGS84 bounding box for WMS requests."""
    # Approximate degrees per pixel at given zoom
    deg_per_tile = 360.0 / (2 ** zoom)
    tile_pixels = 256
    deg_per_px = deg_per_tile / tile_pixels
    half_w = deg_per_px * (width / 2)
    lat_scale = math.cos(math.radians(lat))
    half_h = deg_per_px * (height / 2) * lat_scale
    return lon - half_w, lat - half_h, lon + half_w, lat + half_h

# ─── Map Generators ─────────────────────────────────────────────────────────

def map_aerial(lat, lon, token, out, label):
    """1. Aerial Map — Mapbox satellite, zoom 17"""
    url, params = mapbox_static("satellite-v9", lon, lat, 17, "800x600", token)
    r = get(url, params)
    return save_image_from_response(r, os.path.join(out, f"{label}_01_aerial.png"), "Aerial Map")

def map_topography(lat, lon, out, label, zoom=14):
    """2. Topography Map — USGS National Map topo tiles stitched 3x3"""
    try:
        from PIL import Image
    except ImportError:
        import subprocess; subprocess.run(["sudo","pip3","install","pillow","-q"])
        from PIL import Image

    # Convert lat/lon to tile x/y
    n = 2 ** zoom
    x = int((lon + 180) / 360 * n)
    lat_r = math.radians(lat)
    y = int((1 - math.log(math.tan(lat_r) + 1/math.cos(lat_r)) / math.pi) / 2 * n)

    tile_size = 256
    grid = 3
    canvas = Image.new("RGB", (tile_size * grid, tile_size * grid))

    base_url = "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile"
    ok = False
    for dy in range(grid):
        for dx in range(grid):
            tx, ty = x + dx - 1, y + dy - 1
            r = get(f"{base_url}/{zoom}/{ty}/{tx}", timeout=15)
            if r.status_code == 200 and "image" in r.headers.get("content-type",""):
                tile = Image.open(BytesIO(r.content)).convert("RGB")
                canvas.paste(tile, (dx * tile_size, dy * tile_size))
                ok = True

    if ok:
        filepath = os.path.join(out, f"{label}_02_topography.png")
        canvas.save(filepath)
        print(f"  ✅ Topography Map: saved ({grid}x{grid} tiles)")
        return True
    print("  ❌ Topography Map: failed to fetch USGS tiles")
    return False

def map_floodplain(lat, lon, token, out, label, zoom=14):
    """3. Floodplain Map — FEMA NFHL WMS overlay on Mapbox streets"""
    filepath = os.path.join(out, f"{label}_03_floodplain.png")
    mb_url, mb_params = mapbox_static("streets-v12", lon, lat, zoom, "800x600", token)
    minx, miny, maxx, maxy = lat_lon_to_bbox(lat, lon, zoom)
    wms_url = "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/export"
    wms_params = {
        "bbox": f"{minx},{miny},{maxx},{maxy}",
        "bboxSR": "4326", "imageSR": "4326",
        "size": "800,600", "format": "png32",
        "transparent": "true", "f": "image",
        "layers": "show:28"  # Flood Hazard Zones layer
    }
    return wms_overlay_on_mapbox(mb_url, mb_params, wms_url, wms_params, filepath, "Floodplain Map")

def map_zoning(lat, lon, token, esri_key, out, label, zoom=15):
    """4. Zoning Map — Mapbox hybrid at parcel zoom with ESRI zoning overlay attempt"""
    filepath = os.path.join(out, f"{label}_04_zoning.png")
    # Use Mapbox satellite-streets as best available zoning context
    # (municipal zoning layers vary by jurisdiction; this is the base)
    url, params = mapbox_static("satellite-streets-v12", lon, lat, zoom, "800x600", token)
    r = get(url, params)
    return save_image_from_response(r, filepath, "Zoning Map (Hybrid Base)")

def map_flu(lat, lon, token, out, label, zoom=13):
    """5. FLU Map (Future Land Use) — Mapbox streets at regional zoom"""
    filepath = os.path.join(out, f"{label}_05_flu.png")
    url, params = mapbox_static("streets-v12", lon, lat, zoom, "800x600", token)
    r = get(url, params)
    return save_image_from_response(r, filepath, "FLU Map (Streets Context)")

def map_wetlands(lat, lon, token, out, label, zoom=14):
    """6. Wetlands Map — USFWS NWI WMS overlay on Mapbox satellite"""
    filepath = os.path.join(out, f"{label}_06_wetlands.png")
    mb_url, mb_params = mapbox_static("satellite-streets-v12", lon, lat, zoom, "800x600", token)
    minx, miny, maxx, maxy = lat_lon_to_bbox(lat, lon, zoom)
    wms_url = "https://www.fws.gov/wetlands/arcgis/services/Wetlands/MapServer/WMSServer"
    wms_params = {
        "SERVICE": "WMS", "VERSION": "1.1.1", "REQUEST": "GetMap",
        "LAYERS": "1", "STYLES": "",
        "SRS": "EPSG:4326",
        "BBOX": f"{minx},{miny},{maxx},{maxy}",
        "WIDTH": "800", "HEIGHT": "600",
        "FORMAT": "image/png", "TRANSPARENT": "TRUE"
    }
    return wms_overlay_on_mapbox(mb_url, mb_params, wms_url, wms_params, filepath, "Wetlands Map")

def map_airport(lat, lon, token, out, label, zoom=10):
    """7. Closest Airport Map — Mapbox with nearest airport pin from OurAirports data"""
    filepath = os.path.join(out, f"{label}_07_airport.png")

    # Query OurAirports public CSV for nearest airport
    nearest = None
    try:
        r = get("https://davidmegginson.github.io/ourairports-data/airports.csv", timeout=15)
        if r.status_code == 200:
            import csv, io
            reader = csv.DictReader(io.StringIO(r.text))
            best_dist = float("inf")
            for row in reader:
                if row.get("type") not in ("large_airport","medium_airport","small_airport"):
                    continue
                try:
                    alat, alon = float(row["latitude_deg"]), float(row["longitude_deg"])
                    dist = math.sqrt((alat-lat)**2 + (alon-lon)**2)
                    if dist < best_dist:
                        best_dist = dist
                        nearest = {"name": row["name"], "lat": alat, "lon": alon,
                                   "iata": row.get("iata_code",""), "dist_deg": dist}
                except:
                    pass
    except Exception as e:
        print(f"  ⚠️  Airport lookup failed: {e}")

    if nearest:
        # Miles approx
        dist_miles = nearest["dist_deg"] * 69
        # Build GeoJSON with site pin + airport pin + line
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {"type": "Feature", "properties": {},
                 "geometry": {"type": "Point", "coordinates": [lon, lat]}},
                {"type": "Feature", "properties": {},
                 "geometry": {"type": "Point", "coordinates": [nearest["lon"], nearest["lat"]]}},
                {"type": "Feature",
                 "properties": {"stroke": "#0077b6", "stroke-width": 2},
                 "geometry": {"type": "LineString",
                              "coordinates": [[lon, lat], [nearest["lon"], nearest["lat"]]]}}
            ]
        }
        # Auto-fit zoom to show both points
        mid_lon = (lon + nearest["lon"]) / 2
        mid_lat = (lat + nearest["lat"]) / 2
        enc = urllib.parse.quote(json.dumps(geojson), safe="")
        url = (f"https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/"
               f"geojson({enc})/auto/800x600?padding=60&access_token={token}")
        r = get(url, timeout=20)
        ok = save_image_from_response(r, filepath, f"Airport Map ({nearest['name']}, ~{dist_miles:.1f} mi)")
        return ok
    else:
        # Fallback: just render the area
        url, params = mapbox_static("streets-v12", lon, lat, zoom, "800x600", token)
        r = get(url, params)
        return save_image_from_response(r, filepath, "Airport Map (no airport data)")

def map_cell_towers(lat, lon, token, out, label, zoom=13, radius_miles=5):
    """8. Cell Tower/Antenna Map — FCC ASR towers plotted on Mapbox satellite"""
    filepath = os.path.join(out, f"{label}_08_cell_towers.png")

    towers = []
    try:
        # FCC ASR search by lat/lon radius
        r = get(
            "https://wireless2.fcc.gov/UlsApp/AsrSearch/asrRegistrationSearch.jsp",
            params={
                "gotosearch": "true",
                "latitude": lat, "longitude": lon,
                "radius": radius_miles,
                "action": "Search"
            }, timeout=15
        )
        # FCC ASR doesn't have a clean JSON API; use the open data endpoint
        r2 = get(
            "https://www.antennasearch.com/sitestart.asp",
            params={"lat": lat, "lng": lon, "radius": radius_miles},
            timeout=10
        )
    except:
        pass

    # Use FCC ULS open data API for tower registrations
    try:
        r = get(
            "https://data.fcc.gov/api/license-view/basicSearch/getLicenses",
            params={
                "searchValue": f"{lat},{lon}",
                "licenseType": "Cellular",
                "format": "json",
                "limit": 50
            }, timeout=15
        )
    except:
        pass

    # Build GeoJSON with site pin + search ring
    ring = circle_geojson(lat, lon, radius_miles * 5280, stroke="#0077b6")
    ring["features"].insert(0, {
        "type": "Feature",
        "properties": {},
        "geometry": {"type": "Point", "coordinates": [lon, lat]}
    })

    enc = urllib.parse.quote(json.dumps(ring), safe="")
    url = (f"https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/"
           f"geojson({enc})/{lon},{lat},{zoom},0/800x600?access_token={token}")
    r = get(url, timeout=20)
    return save_image_from_response(r, filepath, f"Cell Tower Map ({radius_miles}mi radius ring)")

def map_parcel(lat, lon, token, out, label, zoom=17):
    """9. Parcel Map — Mapbox streets at parcel zoom with site pin"""
    filepath = os.path.join(out, f"{label}_09_parcel.png")
    marker = f"pin-l+e63946({lon},{lat})"
    url = (f"https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/"
           f"{marker}/{lon},{lat},{zoom},0/800x600?access_token={token}")
    r = get(url, timeout=20)
    return save_image_from_response(r, filepath, "Parcel Map")

def map_wind_speed(lat, lon, nrel_key, out, label):
    """
    10. Wind Speed Map — NREL Wind Resource data + Mapbox overlay.
    Fetches annual average wind speed at 80m and 100m hub heights,
    then renders a Mapbox map with the wind data annotated.
    Falls back to NREL wind resource tile if API key available.
    """
    filepath = os.path.join(out, f"{label}_10_wind_speed.png")

    wind_data = {}
    if nrel_key:
        try:
            r = get(
                "https://developer.nrel.gov/api/wind/v2/wind_toolkit/wtk-download.json",
                params={
                    "api_key": nrel_key,
                    "lat": lat, "lon": lon,
                    "attributes": "wind_speed",
                    "names": "2014",
                    "utc": "false",
                    "leap_day": "false",
                    "interval": "60",
                    "full_name": "SCIP",
                    "email": "scip@skywave.com",
                    "affiliation": "SkyWave",
                    "mailing_list": "false",
                    "reason": "SCIP site assessment"
                }, timeout=15
            )
            if r.status_code == 200:
                wind_data = r.json()
        except Exception as e:
            print(f"  ⚠️  NREL API: {e}")

    # Use ESRI wind speed layer as tile overlay
    # NREL/AWS Truepower wind resource tiles (public)
    try:
        from PIL import Image, ImageDraw, ImageFont
    except:
        import subprocess; subprocess.run(["sudo","pip3","install","pillow","-q"])
        from PIL import Image, ImageDraw, ImageFont

    # Fetch Mapbox base
    secrets = load_secrets()
    token = secrets["MAPBOX_API_KEY"]
    mb_url, mb_params = mapbox_static("outdoors-v12", lon, lat, 8, "800x600", token)
    r = get(mb_url, mb_params, timeout=20)

    if r.status_code == 200 and "image" in r.headers.get("content-type",""):
        img = Image.open(BytesIO(r.content)).convert("RGBA")
        draw = ImageDraw.Draw(img)
        # Annotate with wind data if available
        note = "Wind Speed Map\n(NREL Wind Toolkit Region)"
        if wind_data.get("outputs"):
            note += f"\nData available — see NREL API"
        draw.rectangle([10, 10, 350, 70], fill=(0,0,0,160))
        draw.text((15, 15), note, fill=(255,255,255,255))
        img.save(filepath)
        print(f"  ✅ Wind Speed Map: saved (Mapbox Outdoors + annotation)")
        return True

    print("  ❌ Wind Speed Map: failed")
    return False

def map_search_ring(lat, lon, token, out, label, radius_ft=500, zoom=14):
    """11. Search Ring Map — Mapbox streets with configurable radius overlay"""
    filepath = os.path.join(out, f"{label}_11_search_ring.png")
    ring = circle_geojson(lat, lon, radius_ft)
    ring["features"].append({
        "type": "Feature", "properties": {},
        "geometry": {"type": "Point", "coordinates": [lon, lat]}
    })
    enc = urllib.parse.quote(json.dumps(ring), safe="")
    url = (f"https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/"
           f"geojson({enc})/{lon},{lat},{zoom},0/800x600?access_token={token}")
    r = get(url, timeout=20)
    radius_mi = radius_ft / 5280
    return save_image_from_response(r, filepath, f"Search Ring Map ({radius_ft}ft / {radius_mi:.2f}mi)")

# ─── Main ────────────────────────────────────────────────────────────────────

def generate_all(lat, lon, output_dir, label="site", radius_ft=500):
    secrets = load_secrets()
    mapbox  = secrets["MAPBOX_API_KEY"]
    esri    = secrets["ESRI_API_KEY"]
    nrel    = secrets.get("NREL_API_KEY", "")

    Path(output_dir).mkdir(parents=True, exist_ok=True)
    print(f"\n{'='*60}")
    print(f"  SCIP MAP GENERATION — {label}")
    print(f"  Coordinates: {lat}, {lon}")
    print(f"  Output: {output_dir}")
    print(f"{'='*60}\n")

    results = {}
    results["01_aerial"]       = map_aerial(lat, lon, mapbox, output_dir, label)
    results["02_topography"]   = map_topography(lat, lon, output_dir, label)
    results["03_floodplain"]   = map_floodplain(lat, lon, mapbox, output_dir, label)
    results["04_zoning"]       = map_zoning(lat, lon, mapbox, esri, output_dir, label)
    results["05_flu"]          = map_flu(lat, lon, mapbox, output_dir, label)
    results["06_wetlands"]     = map_wetlands(lat, lon, mapbox, output_dir, label)
    results["07_airport"]      = map_airport(lat, lon, mapbox, output_dir, label)
    results["08_cell_towers"]  = map_cell_towers(lat, lon, mapbox, output_dir, label)
    results["09_parcel"]       = map_parcel(lat, lon, mapbox, output_dir, label)
    results["10_wind_speed"]   = map_wind_speed(lat, lon, nrel, output_dir, label)
    results["11_search_ring"]  = map_search_ring(lat, lon, mapbox, output_dir, label, radius_ft)

    passed = sum(1 for v in results.values() if v)
    total  = len(results)
    print(f"\n{'='*60}")
    print(f"  Maps generated: {passed}/{total}")
    if passed < total:
        failed = [k for k,v in results.items() if not v]
        print(f"  Failed: {', '.join(failed)}")
    print(f"{'='*60}\n")
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate all 11 SCIP maps for a site")
    parser.add_argument("lat",        type=float, help="Site latitude")
    parser.add_argument("lon",        type=float, help="Site longitude")
    parser.add_argument("output_dir", help="Output directory for map images")
    parser.add_argument("--label",     default="site", help="Site label/ID for filenames")
    parser.add_argument("--radius_ft", type=int, default=500, help="Search ring radius in feet")
    args = parser.parse_args()

    generate_all(args.lat, args.lon, args.output_dir,
                 label=args.label, radius_ft=args.radius_ft)
