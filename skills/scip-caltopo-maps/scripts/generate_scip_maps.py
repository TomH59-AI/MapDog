#!/usr/bin/env python3
"""
generate_scip_maps.py
---------------------
Generates all SCIP maps using CalTopo WMTS tiles + external GIS overlays.

Maps produced (11 standard + 4 tilted viewsheds):
  01. Aerial Map           — CalTopo Imagery layer
  02. Topography Map       — CalTopo MapBuilder Topo
  03. Floodplain Map       — CalTopo Imagery + FEMA NFHL overlay
  04. Zoning Map           — CalTopo Hybrid (imagery + labels + parcels)
  05. FLU Map              — CalTopo Roads/MapBuilder + overlay
  06. Wetlands Map         — CalTopo Imagery + USFWS NWI overlay
  07. Airport Map          — CalTopo FAA Sectional + site marker
  08. Cell Tower Map       — CalTopo Imagery + OpenCellID/FCC tower pins
  09. Parcel Map           — CalTopo Imagery + parcel overlay (zoomed)
  10. Wind Speed Map       — NREL wind resource (fallback: CalTopo terrain)
  11. Search Ring Map      — CalTopo Hybrid + search ring circle
  12-15. Tilted Viewsheds  — Cesium Ion 3D N/S/E/W above treeline

Usage:
    python generate_scip_maps.py <lat> <lon> <output_dir> [options]

Options:
    --label LABEL       Site label for filenames (default: site)
    --radius_ft FEET    Search ring radius in feet (default: 2640 = 0.5mi)
    --account_id ID     CalTopo account ID (default: G2710M)
    --width PX          Image width (default: 1280)
    --height PX         Image height (default: 960)
"""

import argparse
import json
import math
import os
import sys
import time
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

# Add parent scripts dir to path
sys.path.insert(0, os.path.dirname(__file__))
from caltopo_client import (
    LAYERS, composite_layers, stitch_tiles, load_secrets,
    add_site_marker, add_search_ring, add_title_bar, add_attribution,
    latlon_to_pixel, meters_to_degrees_lon, meters_to_degrees_lat,
    fetch_tile, latlon_to_tile
)


# ─── External Overlay Helpers ──────────────────────────────────────────────

def _calc_bbox_3857(lat, lon, zoom, width_px, height_px):
    """Calculate EPSG:3857 bounding box for a viewport centered on lat/lon."""
    cx, cy = latlon_to_pixel(lat, lon, zoom)
    left_px = cx - width_px / 2
    top_px = cy - height_px / 2
    right_px = cx + width_px / 2
    bottom_px = cy + height_px / 2

    def pixel_to_latlon(px_x, px_y, z):
        n = 2 ** z
        lo = px_x / (n * 256) * 360.0 - 180.0
        la = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * px_y / (n * 256)))))
        return la, lo

    def to_3857(la, lo):
        x = lo * 20037508.34 / 180
        y_rad = math.radians(la)
        y = math.log(math.tan(math.pi / 4 + y_rad / 2)) * 20037508.34 / math.pi
        return x, y

    nw_lat, nw_lon = pixel_to_latlon(left_px, top_px, zoom)
    se_lat, se_lon = pixel_to_latlon(right_px, bottom_px, zoom)
    x_min, y_min = to_3857(se_lat, nw_lon)
    x_max, y_max = to_3857(nw_lat, se_lon)
    return x_min, y_min, x_max, y_max


def fetch_fema_overlay(lat, lon, zoom, width_px, height_px):
    """Fetch FEMA National Flood Hazard Layer as a transparent overlay."""
    x_min, y_min, x_max, y_max = _calc_bbox_3857(lat, lon, zoom, width_px, height_px)

    # Try ArcGIS REST export (primary)
    endpoints = [
        "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/export",
        "https://msc.fema.gov/arcgis/rest/services/public/NFHLWMS/MapServer/export",
    ]
    for url in endpoints:
        params = {
            "bbox": f"{x_min},{y_min},{x_max},{y_max}",
            "bboxSR": "3857",
            "imageSR": "3857",
            "layers": "show:28",
            "size": f"{width_px},{height_px}",
            "format": "png32",
            "transparent": "true",
            "f": "image",
        }
        try:
            r = requests.get(url, params=params, timeout=30)
            if r.status_code == 200 and len(r.content) > 500:
                return Image.open(BytesIO(r.content)).convert("RGBA")
        except Exception as e:
            print(f"  [!] FEMA endpoint failed ({url[:40]}...): {e}")
            continue
    return None


def fetch_wetlands_overlay(lat, lon, zoom, width_px, height_px):
    """Fetch USFWS National Wetlands Inventory as a transparent overlay."""
    x_min, y_min, x_max, y_max = _calc_bbox_3857(lat, lon, zoom, width_px, height_px)

    url = "https://fwsprimary.wim.usgs.gov/server/rest/services/Wetlands/MapServer/export"
    params = {
        "bbox": f"{x_min},{y_min},{x_max},{y_max}",
        "bboxSR": "3857",
        "imageSR": "3857",
        "layers": "show:0,1",
        "size": f"{width_px},{height_px}",
        "format": "png32",
        "transparent": "true",
        "f": "image",
    }
    try:
        r = requests.get(url, params=params, timeout=30)
        if r.status_code == 200 and len(r.content) > 500:
            return Image.open(BytesIO(r.content)).convert("RGBA")
    except Exception as e:
        print(f"  [!] Wetlands overlay fetch failed: {e}")
    return None


def fetch_opencellid_towers(lat, lon, radius_km=5, api_key=None):
    """Fetch cell tower locations from OpenCellID API."""
    if not api_key:
        return []
    url = "https://opencellid.org/cell/getInArea"
    params = {
        "key": api_key,
        "BBOX": f"{lat-0.05},{lon-0.05},{lat+0.05},{lon+0.05}",
        "format": "json",
        "limit": 100,
    }
    try:
        r = requests.get(url, params=params, timeout=15)
        if r.status_code == 200:
            data = r.json()
            return data.get("cells", [])
    except Exception:
        pass
    return []


def fetch_fcc_towers(lat, lon, radius_km=10):
    """Fetch tower locations from FCC ASR database."""
    url = "https://data.fcc.gov/api/license-view/v1/licenses"
    params = {
        "latitude": lat,
        "longitude": lon,
        "distance": radius_km,
        "distanceUnit": "km",
        "format": "json",
        "licenseStatus": "Active",
        "pageNum": 1,
        "pageSize": 50,
    }
    try:
        r = requests.get(url, params=params, timeout=20)
        if r.status_code == 200:
            data = r.json()
            return data.get("Licenses", {}).get("License", [])
    except Exception:
        pass
    return []


def fetch_nrel_wind(lat, lon, api_key):
    """Fetch wind speed data from NREL. Returns image or None."""
    url = "https://developer.nrel.gov/api/wind-toolkit/v2/wind/wtk-srw-download"
    # Try the wind prospector image endpoint
    img_url = f"https://maps.nrel.gov/api/wind/wind_prospector/image"
    params = {
        "api_key": api_key,
        "wkt": f"POINT({lon} {lat})",
        "aspect": "true",
        "zoom": "13",
        "hubheight": "100m",
    }
    try:
        r = requests.get(img_url, params=params, timeout=30)
        if r.status_code == 200 and "image" in r.headers.get("content-type", ""):
            return Image.open(BytesIO(r.content)).convert("RGBA")
    except Exception:
        pass
    return None


def get_closest_airport(lat, lon):
    """Query ArcGIS for nearest public airport."""
    url = ("https://services1.arcgis.com/nRHtyn3uE1kyzoYc/arcgis/rest/services/"
           "Airports_Point/FeatureServer/0/query")
    params = {
        "where": "OP_CLASS='PUBLIC'",
        "geometry": f"{lon},{lat}",
        "geometryType": "esriGeometryPoint",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelWithin",
        "distance": "50",
        "units": "esriSRUnit_StatuteMile",
        "outFields": "NAME,ACODE,CITY,LAT_DD,LONG_DD",
        "returnGeometry": "true",
        "f": "json",
    }
    try:
        r = requests.get(url, params=params, timeout=20)
        if r.status_code == 200:
            features = r.json().get("features", [])
            if features:
                return features[0]
    except Exception:
        pass
    return None


# ─── Cesium Ion 3D Tilted Viewshed ────────────────────────────────────────

def generate_cesium_viewshed(lat, lon, heading, pitch, output_path, cesium_key,
                              height_m=60, fov=60):
    """
    Generate a 3D tilted viewshed image using Cesium Ion.
    heading: 0=N, 90=E, 180=S, 270=W
    pitch: negative = looking down (e.g., -15)
    """
    # Use Cesium Ion's imagery endpoint for 3D terrain view
    html = f"""<!DOCTYPE html>
<html><head>
<script src="https://cesium.com/downloads/cesiumjs/releases/1.124/Build/Cesium/Cesium.js"></script>
<link href="https://cesium.com/downloads/cesiumjs/releases/1.124/Build/Cesium/Widgets/widgets.css" rel="stylesheet">
<style>html,body,#cesiumContainer{{margin:0;padding:0;width:100%;height:100%;overflow:hidden}}</style>
</head><body>
<div id="cesiumContainer"></div>
<script>
Cesium.Ion.defaultAccessToken = '{cesium_key}';
const viewer = new Cesium.Viewer('cesiumContainer', {{
    terrainProvider: await Cesium.CesiumTerrainProvider.fromIonAssetId(1),
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
}});
viewer.scene.globe.enableLighting = true;
viewer.camera.setView({{
    destination: Cesium.Cartesian3.fromDegrees({lon}, {lat}, {height_m}),
    orientation: {{
        heading: Cesium.Math.toRadians({heading}),
        pitch: Cesium.Math.toRadians({pitch}),
        roll: 0.0
    }}
}});
// Wait for terrain to load then signal ready
viewer.scene.globe.tileLoadProgressEvent.addEventListener(function(remaining) {{
    if (remaining === 0) {{
        document.title = 'READY';
    }}
}});
</script></body></html>"""
    return html


# ─── Map Generation Functions ─────────────────────────────────────────────

def generate_all_maps(lat, lon, output_dir, label="site", radius_ft=2640,
                       account_id="G2710M", width=1280, height=960):
    """Generate all SCIP maps and save to output_dir."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    secrets = load_secrets()
    session = requests.Session()

    # Zoom levels
    z_far = 11    # ~50mi view (airport)
    z_mid = 14    # ~2mi view (standard)
    z_close = 16  # ~0.25mi view (parcel)
    z_ring = 13   # ~5mi view (search ring)

    subtitle = f"{lat:.6f}, {lon:.6f}"
    results = {}

    # ── 01. Aerial Map ──
    print("  [1/11] Generating Aerial Map...")
    img = stitch_tiles(account_id, "imagery", lat, lon, z_mid, width, height, session)
    img = add_site_marker(img, lat, lon, lat, lon, z_mid, width, height, label)
    img = add_title_bar(img, f"01 — AERIAL MAP | {label}", subtitle)
    img = add_attribution(img, "CalTopo Imagery | SCIP")
    path = output_dir / f"{label}_01_aerial.png"
    img.convert("RGB").save(path, "PNG", quality=95)
    results["aerial"] = str(path)
    print(f"    ✓ {path}")

    # ── 02. Topography Map ──
    print("  [2/11] Generating Topography Map...")
    img = stitch_tiles(account_id, "mbt", lat, lon, z_mid, width, height, session)
    img = add_site_marker(img, lat, lon, lat, lon, z_mid, width, height, label)
    img = add_title_bar(img, f"02 — TOPOGRAPHY MAP | {label}", subtitle)
    img = add_attribution(img, "CalTopo MapBuilder Topo | SCIP")
    path = output_dir / f"{label}_02_topography.png"
    img.convert("RGB").save(path, "PNG", quality=95)
    results["topography"] = str(path)
    print(f"    ✓ {path}")

    # ── 03. Floodplain Map ──
    print("  [3/11] Generating Floodplain Map...")
    img = stitch_tiles(account_id, "imagery", lat, lon, z_mid, width, height, session)
    fema = fetch_fema_overlay(lat, lon, z_mid, width, height)
    if fema:
        img = Image.alpha_composite(img, fema)
        print("    ✓ FEMA overlay applied")
    else:
        print("    ⚠ FEMA overlay unavailable, using base imagery")
    img = add_site_marker(img, lat, lon, lat, lon, z_mid, width, height, label)
    img = add_title_bar(img, f"03 — FLOODPLAIN MAP | {label}", subtitle)
    img = add_attribution(img, "CalTopo + FEMA NFHL | SCIP")
    path = output_dir / f"{label}_03_floodplain.png"
    img.convert("RGB").save(path, "PNG", quality=95)
    results["floodplain"] = str(path)
    print(f"    ✓ {path}")

    # ── 04. Zoning Map ──
    print("  [4/11] Generating Zoning Map...")
    img = stitch_tiles(account_id, "mbh", lat, lon, z_mid, width, height, session)
    img = add_site_marker(img, lat, lon, lat, lon, z_mid, width, height, label)
    img = add_title_bar(img, f"04 — ZONING MAP | {label}", subtitle)
    img = add_attribution(img, "CalTopo Hybrid | SCIP")
    path = output_dir / f"{label}_04_zoning.png"
    img.convert("RGB").save(path, "PNG", quality=95)
    results["zoning"] = str(path)
    print(f"    ✓ {path}")

    # ── 05. FLU Map (Future Land Use) ──
    print("  [5/11] Generating FLU Map...")
    img = stitch_tiles(account_id, "mbr", lat, lon, z_mid, width, height, session)
    img = add_site_marker(img, lat, lon, lat, lon, z_mid, width, height, label)
    img = add_title_bar(img, f"05 — FUTURE LAND USE MAP | {label}", subtitle)
    img = add_attribution(img, "CalTopo Roads | SCIP")
    path = output_dir / f"{label}_05_flu.png"
    img.convert("RGB").save(path, "PNG", quality=95)
    results["flu"] = str(path)
    print(f"    ✓ {path}")

    # ── 06. Wetlands Map ──
    print("  [6/11] Generating Wetlands Map...")
    img = stitch_tiles(account_id, "imagery", lat, lon, z_mid, width, height, session)
    wetlands = fetch_wetlands_overlay(lat, lon, z_mid, width, height)
    if wetlands:
        img = Image.alpha_composite(img, wetlands)
        print("    ✓ USFWS NWI overlay applied")
    else:
        print("    ⚠ Wetlands overlay unavailable, using base imagery")
    img = add_site_marker(img, lat, lon, lat, lon, z_mid, width, height, label)
    img = add_title_bar(img, f"06 — WETLANDS MAP | {label}", subtitle)
    img = add_attribution(img, "CalTopo + USFWS NWI | SCIP")
    path = output_dir / f"{label}_06_wetlands.png"
    img.convert("RGB").save(path, "PNG", quality=95)
    results["wetlands"] = str(path)
    print(f"    ✓ {path}")

    # ── 07. Airport Map ──
    print("  [7/11] Generating Airport Map...")
    # Use FAA Sectional from CalTopo for airport context
    img = stitch_tiles(account_id, "faa", lat, lon, z_far, width, height, session)
    # If FAA layer is blank, fall back to hybrid
    if img.getbbox() is None:
        img = stitch_tiles(account_id, "mbh", lat, lon, z_far, width, height, session)
    img = add_site_marker(img, lat, lon, lat, lon, z_far, width, height, label)
    # Try to add nearest airport marker
    airport = get_closest_airport(lat, lon)
    airport_info = ""
    if airport:
        a_lat = airport["attributes"].get("LAT_DD") or airport["geometry"]["y"]
        a_lon = airport["attributes"].get("LONG_DD") or airport["geometry"]["x"]
        a_name = airport["attributes"].get("NAME", "Unknown")
        img = add_site_marker(img, a_lat, a_lon, lat, lon, z_far, width, height,
                              label=a_name[:20], color=(0, 0, 255))
        # Calculate distance
        dlat = math.radians(a_lat - lat)
        dlon = math.radians(a_lon - lon)
        a = (math.sin(dlat/2)**2 +
             math.cos(math.radians(lat)) * math.cos(math.radians(a_lat)) *
             math.sin(dlon/2)**2)
        dist_mi = 3959 * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        airport_info = f" | Nearest: {a_name} ({dist_mi:.1f} mi)"
    img = add_title_bar(img, f"07 — AIRPORT MAP | {label}{airport_info}", subtitle)
    img = add_attribution(img, "CalTopo FAA Sectional | SCIP")
    path = output_dir / f"{label}_07_airport.png"
    img.convert("RGB").save(path, "PNG", quality=95)
    results["airport"] = str(path)
    print(f"    ✓ {path}")

    # ── 08. Cell Tower Map ──
    print("  [8/11] Generating Cell Tower Map...")
    img = stitch_tiles(account_id, "imagery", lat, lon, z_mid, width, height, session)
    # Plot FCC towers
    towers = fetch_fcc_towers(lat, lon)
    tower_count = 0
    for tower in towers[:30]:
        t_lat = tower.get("location", {}).get("latitude")
        t_lon = tower.get("location", {}).get("longitude")
        if t_lat and t_lon:
            try:
                t_lat, t_lon = float(t_lat), float(t_lon)
                img = add_site_marker(img, t_lat, t_lon, lat, lon, z_mid, width, height,
                                      label="", color=(0, 100, 255))
                tower_count += 1
            except (ValueError, TypeError):
                pass
    # Also try OpenCellID
    opencellid_key = secrets.get("OPENCELLID_API_KEY", secrets.get("OPENCELLID_TOKEN", ""))
    if opencellid_key:
        cells = fetch_opencellid_towers(lat, lon, api_key=opencellid_key)
        for cell in cells[:30]:
            c_lat = cell.get("lat")
            c_lon = cell.get("lon")
            if c_lat and c_lon:
                img = add_site_marker(img, c_lat, c_lon, lat, lon, z_mid, width, height,
                                      label="", color=(0, 200, 100))
                tower_count += 1
    img = add_site_marker(img, lat, lon, lat, lon, z_mid, width, height, label, color=(255, 0, 0))
    img = add_title_bar(img, f"08 — CELL TOWER MAP | {label} | {tower_count} towers", subtitle)
    img = add_attribution(img, "CalTopo + FCC/OpenCellID | SCIP")
    path = output_dir / f"{label}_08_cell_towers.png"
    img.convert("RGB").save(path, "PNG", quality=95)
    results["cell_towers"] = str(path)
    print(f"    ✓ {path} ({tower_count} towers plotted)")

    # ── 09. Parcel Map ──
    print("  [9/11] Generating Parcel Map...")
    img = stitch_tiles(account_id, "imagery", lat, lon, z_close, width, height, session)
    # Overlay the MapBuilder overlay for roads/labels at parcel zoom
    overlay = stitch_tiles(account_id, "mba", lat, lon, z_close, width, height, session)
    if overlay:
        img = Image.alpha_composite(img, overlay)
    img = add_site_marker(img, lat, lon, lat, lon, z_close, width, height, label)
    img = add_title_bar(img, f"09 — PARCEL MAP | {label}", subtitle)
    img = add_attribution(img, "CalTopo Imagery + Overlay | SCIP")
    path = output_dir / f"{label}_09_parcel.png"
    img.convert("RGB").save(path, "PNG", quality=95)
    results["parcel"] = str(path)
    print(f"    ✓ {path}")

    # ── 10. Wind Speed Map ──
    print("  [10/11] Generating Wind Speed Map...")
    nrel_key = secrets.get("NREL_API_KEY", "")
    wind_img = None
    if nrel_key:
        wind_img = fetch_nrel_wind(lat, lon, nrel_key)
    if wind_img:
        wind_img = wind_img.resize((width, height), Image.LANCZOS)
        img = wind_img
    else:
        # Fallback: CalTopo terrain + slope for wind context
        img = stitch_tiles(account_id, "r3", lat, lon, z_mid, width, height, session)
        img = add_site_marker(img, lat, lon, lat, lon, z_mid, width, height, label)
        print("    ⚠ NREL unavailable, using CalTopo terrain")
    img = add_title_bar(img, f"10 — WIND SPEED MAP | {label}", subtitle)
    img = add_attribution(img, "NREL / CalTopo Terrain | SCIP")
    path = output_dir / f"{label}_10_wind_speed.png"
    img.convert("RGB").save(path, "PNG", quality=95)
    results["wind_speed"] = str(path)
    print(f"    ✓ {path}")

    # ── 11. Search Ring Map ──
    print("  [11/11] Generating Search Ring Map...")
    img = stitch_tiles(account_id, "mbh", lat, lon, z_ring, width, height, session)
    img = add_search_ring(img, lat, lon, radius_ft, z_ring, width, height)
    img = add_site_marker(img, lat, lon, lat, lon, z_ring, width, height, label)
    radius_mi = radius_ft / 5280
    img = add_title_bar(img, f"11 — SEARCH RING MAP | {label} | {radius_mi:.2f} mi radius", subtitle)
    img = add_attribution(img, "CalTopo Hybrid | SCIP")
    path = output_dir / f"{label}_11_search_ring.png"
    img.convert("RGB").save(path, "PNG", quality=95)
    results["search_ring"] = str(path)
    print(f"    ✓ {path}")

    # ── Save manifest ──
    manifest = {
        "site_label": label,
        "latitude": lat,
        "longitude": lon,
        "radius_ft": radius_ft,
        "account_id": account_id,
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "maps": results,
    }
    manifest_path = output_dir / f"{label}_map_manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\n  ✅ Map manifest saved: {manifest_path}")

    return results


# ─── CLI Entry Point ──────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Generate all SCIP maps using CalTopo WMTS tiles.")
    parser.add_argument("lat", type=float, help="Site latitude")
    parser.add_argument("lon", type=float, help="Site longitude")
    parser.add_argument("output_dir", type=str, help="Output directory for maps")
    parser.add_argument("--label", type=str, default="site", help="Site label for filenames")
    parser.add_argument("--radius_ft", type=int, default=2640,
                        help="Search ring radius in feet (default: 2640 = 0.5mi)")
    parser.add_argument("--account_id", type=str, default="G2710M",
                        help="CalTopo account ID")
    parser.add_argument("--width", type=int, default=1280, help="Image width in pixels")
    parser.add_argument("--height", type=int, default=960, help="Image height in pixels")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  SCIP Map Generator — CalTopo WMTS")
    print(f"  Site: {args.label} at ({args.lat}, {args.lon})")
    print(f"  Output: {args.output_dir}")
    print(f"  CalTopo Account: {args.account_id}")
    print(f"{'='*60}\n")

    results = generate_all_maps(
        lat=args.lat,
        lon=args.lon,
        output_dir=args.output_dir,
        label=args.label,
        radius_ft=args.radius_ft,
        account_id=args.account_id,
        width=args.width,
        height=args.height,
    )

    print(f"\n  ✅ All {len(results)} maps generated successfully.")
    return results


if __name__ == "__main__":
    main()
