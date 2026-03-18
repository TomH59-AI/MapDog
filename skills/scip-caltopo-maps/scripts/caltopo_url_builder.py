#!/usr/bin/env python3
"""
caltopo_url_builder.py
----------------------
Generates CalTopo map URLs with specific layers, overlays, and markers
for embedding in SCIP documents or sharing with team members.

CalTopo URL format:
  https://caltopo.com/map.html#ll=<lat>,<lon>&z=<zoom>&b=<base_layer>&a=<overlays>

Base layer codes:
  imagery, mbt (topo), mbh (hybrid), t (scanned topos), faa, om (OSM),
  r (relief), r2 (enhanced relief), r3 (terrain), mbr (roads)

Overlay codes (comma-separated):
  parcel_ln (parcel lines), parcel_no (parcel numbers), sma (public lands),
  c (contours), sf (slope), mba (mapbuilder overlay), geology, structures
"""

from urllib.parse import quote


# Base layer codes
BASE_LAYERS = {
    "aerial":    "imagery",
    "imagery":   "imagery",
    "topo":      "mbt",
    "hybrid":    "mbh",
    "scanned":   "t",
    "faa":       "faa",
    "osm":       "om",
    "relief":    "r",
    "enhanced":  "r2",
    "terrain":   "r3",
    "roads":     "mbr",
}

# Overlay codes
OVERLAYS = {
    "parcel":      "parcel_ln",
    "parcel_num":  "parcel_no",
    "public_land": "sma",
    "contours":    "c",
    "slope":       "sf",
    "overlay":     "mba",
    "geology":     "geology",
    "structures":  "structures",
}


def build_url(lat, lon, zoom=14, base="imagery", overlays=None):
    """
    Build a CalTopo map URL.

    Args:
        lat: Latitude
        lon: Longitude
        zoom: Zoom level (1-18, default 14)
        base: Base layer name or code
        overlays: List of overlay names or codes
    Returns:
        CalTopo URL string
    """
    base_code = BASE_LAYERS.get(base, base)
    url = f"https://caltopo.com/map.html#ll={lat},{lon}&z={zoom}&b={base_code}"

    if overlays:
        overlay_codes = []
        for o in overlays:
            code = OVERLAYS.get(o, o)
            overlay_codes.append(code)
        url += f"&a={','.join(overlay_codes)}"

    return url


def build_scip_urls(lat, lon, label="Site"):
    """
    Generate all standard SCIP map URLs for a site.

    Returns dict of map_type -> URL.
    """
    urls = {}

    # 01. Aerial
    urls["aerial"] = build_url(lat, lon, 16, "imagery", ["parcel"])

    # 02. Topography
    urls["topography"] = build_url(lat, lon, 14, "topo", ["contours"])

    # 03. Floodplain (CalTopo doesn't have FEMA, but topo + contours is useful)
    urls["floodplain"] = build_url(lat, lon, 14, "imagery")

    # 04. Zoning
    urls["zoning"] = build_url(lat, lon, 14, "hybrid", ["parcel"])

    # 05. FLU
    urls["flu"] = build_url(lat, lon, 14, "roads", ["parcel"])

    # 06. Wetlands
    urls["wetlands"] = build_url(lat, lon, 14, "imagery")

    # 07. Airport
    urls["airport"] = build_url(lat, lon, 11, "faa")

    # 08. Cell Towers
    urls["cell_towers"] = build_url(lat, lon, 13, "hybrid", ["structures"])

    # 09. Parcel
    urls["parcel"] = build_url(lat, lon, 17, "imagery", ["parcel", "parcel_num"])

    # 10. Wind Speed
    urls["wind_speed"] = build_url(lat, lon, 12, "terrain")

    # 11. Search Ring
    urls["search_ring"] = build_url(lat, lon, 13, "hybrid", ["parcel"])

    return urls


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python caltopo_url_builder.py <lat> <lon> [label]")
        sys.exit(1)

    lat = float(sys.argv[1])
    lon = float(sys.argv[2])
    label = sys.argv[3] if len(sys.argv) > 3 else "Site"

    urls = build_scip_urls(lat, lon, label)
    print(f"\nCalTopo SCIP Map URLs for {label} ({lat}, {lon}):")
    print("=" * 60)
    for name, url in urls.items():
        print(f"  {name:15s} → {url}")
