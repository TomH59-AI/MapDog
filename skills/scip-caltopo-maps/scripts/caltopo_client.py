#!/usr/bin/env python3
"""
caltopo_client.py
-----------------
Core CalTopo client for WMTS tile fetching, WMS map export, and Teams API access.
Handles authentication, tile math, and image stitching for SCIP map generation.

CalTopo Account: G2710M (Skyline Trial - Pro)
WMTS: https://caltopo.com/api/G2710M/wmts
WMS:  https://caltopo.com/api/G2710M/wms?
"""

import base64
import hmac
import json
import math
import os
import time
import urllib.error
import urllib.request
from io import BytesIO
from pathlib import Path
from urllib.parse import urlencode

import requests
from PIL import Image, ImageDraw, ImageFont

# ─── Configuration ─────────────────────────────────────────────────────────

SECRETS_PATH = os.path.join(os.path.dirname(__file__), "../references/.secrets")
DEFAULT_TIMEOUT_MS = 2 * 60 * 1000
TILE_SIZE = 256

# CalTopo WMTS layer identifiers
LAYERS = {
    # Base layers
    "imagery":   "imagery",    # Satellite/aerial imagery (high-res)
    "topo":      "mbt",        # MapBuilder Topo
    "hybrid":    "mbh",        # Hybrid (imagery + labels)
    "roads":     "mbr",        # Roads layer
    "scanned":   "t",          # USGS Scanned Topos
    "osm":       "om",         # OpenStreetMap
    "faa":       "faa",        # FAA Sectional (airport)
    # Overlays
    "contours":  "c",          # Contour lines
    "slope":     "sf",         # Slope angle shading
    "public":    "sma",        # Public lands
    "geology":   "geology",    # Geology
    "overlay":   "mba",        # MapBuilder overlay (trails, roads, labels)
    "structures":"structures", # Structures
    # Relief
    "relief":    "r",          # Normal shaded relief
    "relief2":   "r2",         # Enhanced shaded relief
    "terrain":   "r3",         # Terrain shaded relief
}


def load_secrets():
    """Load API keys from the .secrets file."""
    secrets = {}
    try:
        with open(SECRETS_PATH) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    secrets[k.strip()] = v.strip()
    except FileNotFoundError:
        pass
    return secrets


# ─── Tile Math ─────────────────────────────────────────────────────────────

def latlon_to_tile(lat, lon, zoom):
    """Convert lat/lon to tile x,y at given zoom level."""
    n = 2 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.log(math.tan(math.radians(lat)) +
            1.0 / math.cos(math.radians(lat))) / math.pi) / 2.0 * n)
    return x, y


def tile_to_latlon(x, y, zoom):
    """Convert tile x,y to lat/lon (NW corner of tile)."""
    n = 2 ** zoom
    lon = x / n * 360.0 - 180.0
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    return lat, lon


def latlon_to_pixel(lat, lon, zoom):
    """Convert lat/lon to absolute pixel coordinates at given zoom."""
    n = 2 ** zoom
    px = (lon + 180.0) / 360.0 * n * TILE_SIZE
    py = (1.0 - math.log(math.tan(math.radians(lat)) +
          1.0 / math.cos(math.radians(lat))) / math.pi) / 2.0 * n * TILE_SIZE
    return px, py


def meters_to_degrees_lon(meters, lat):
    """Convert meters to degrees longitude at a given latitude."""
    return meters / (111320 * math.cos(math.radians(lat)))


def meters_to_degrees_lat(meters):
    """Convert meters to degrees latitude."""
    return meters / 110540


# ─── WMTS Tile Fetching ───────────────────────────────────────────────────

def fetch_tile(account_id, layer_id, zoom, x, y, session=None):
    """Fetch a single WMTS tile from CalTopo. Returns PIL Image or None."""
    url = f"https://caltopo.com/api/{account_id}/wmts/tile/{layer_id}/{zoom}/{x}/{y}.png"
    try:
        if session:
            r = session.get(url, timeout=15)
        else:
            r = requests.get(url, timeout=15)
        if r.status_code == 200 and len(r.content) > 0:
            return Image.open(BytesIO(r.content)).convert("RGBA")
    except Exception as e:
        print(f"  [!] Tile fetch failed ({layer_id}/{zoom}/{x}/{y}): {e}")
    return None


def stitch_tiles(account_id, layer_id, lat, lon, zoom, width_px=1024, height_px=768, session=None):
    """
    Fetch and stitch WMTS tiles into a single image centered on lat/lon.
    Returns a PIL RGBA Image of the specified dimensions.
    """
    # Calculate center pixel
    cx, cy = latlon_to_pixel(lat, lon, zoom)

    # Calculate tile range needed
    left_px = cx - width_px / 2
    top_px = cy - height_px / 2
    right_px = cx + width_px / 2
    bottom_px = cy + height_px / 2

    tile_x_min = int(left_px // TILE_SIZE)
    tile_x_max = int(right_px // TILE_SIZE)
    tile_y_min = int(top_px // TILE_SIZE)
    tile_y_max = int(bottom_px // TILE_SIZE)

    # Create canvas
    canvas_w = (tile_x_max - tile_x_min + 1) * TILE_SIZE
    canvas_h = (tile_y_max - tile_y_min + 1) * TILE_SIZE
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (255, 255, 255, 0))

    # Fetch and paste tiles
    for tx in range(tile_x_min, tile_x_max + 1):
        for ty in range(tile_y_min, tile_y_max + 1):
            tile_img = fetch_tile(account_id, layer_id, zoom, tx, ty, session)
            if tile_img:
                paste_x = (tx - tile_x_min) * TILE_SIZE
                paste_y = (ty - tile_y_min) * TILE_SIZE
                canvas.paste(tile_img, (paste_x, paste_y), tile_img)

    # Crop to the exact viewport
    offset_x = int(left_px - tile_x_min * TILE_SIZE)
    offset_y = int(top_px - tile_y_min * TILE_SIZE)
    cropped = canvas.crop((offset_x, offset_y, offset_x + width_px, offset_y + height_px))
    return cropped


def composite_layers(account_id, layers, lat, lon, zoom, width_px=1024, height_px=768, session=None):
    """
    Fetch and composite multiple CalTopo layers into a single image.
    layers: list of layer_id strings, rendered bottom to top.
    """
    base = None
    for layer_id in layers:
        layer_img = stitch_tiles(account_id, layer_id, lat, lon, zoom, width_px, height_px, session)
        if base is None:
            base = layer_img
        else:
            base = Image.alpha_composite(base, layer_img)
    return base


# ─── Map Annotations ──────────────────────────────────────────────────────

def add_site_marker(img, lat, lon, center_lat, center_lon, zoom, width_px, height_px,
                    label="SITE", color=(255, 0, 0)):
    """Draw a site marker pin on the image at the given lat/lon."""
    draw = ImageDraw.Draw(img)

    # Convert marker lat/lon to pixel position on the image
    cx, cy = latlon_to_pixel(center_lat, center_lon, zoom)
    mx, my = latlon_to_pixel(lat, lon, zoom)
    px = int(mx - cx + width_px / 2)
    py = int(my - cy + height_px / 2)

    # Draw crosshair
    size = 12
    draw.line([(px - size, py), (px + size, py)], fill=color, width=3)
    draw.line([(px, py - size), (px, py + size)], fill=color, width=3)

    # Draw circle
    r = 8
    draw.ellipse([(px - r, py - r), (px + r, py + r)], outline=color, width=2)

    # Draw label
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
    except (IOError, OSError):
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), label, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    label_x = px - tw // 2
    label_y = py - size - th - 6
    # Background
    draw.rectangle([(label_x - 3, label_y - 2), (label_x + tw + 3, label_y + th + 2)],
                   fill=color)
    draw.text((label_x, label_y), label, fill=(255, 255, 255), font=font)
    return img


def add_search_ring(img, center_lat, center_lon, radius_ft, zoom, width_px, height_px,
                    color=(255, 0, 0, 128)):
    """Draw a search ring circle on the image."""
    draw = ImageDraw.Draw(img)
    radius_m = radius_ft * 0.3048

    # Calculate pixel radius
    cx, cy = latlon_to_pixel(center_lat, center_lon, zoom)
    edge_lon = center_lon + meters_to_degrees_lon(radius_m, center_lat)
    ex, _ = latlon_to_pixel(center_lat, edge_lon, zoom)
    pixel_radius = int(abs(ex - cx))

    # Draw on image center
    img_cx = width_px // 2
    img_cy = height_px // 2
    draw.ellipse(
        [(img_cx - pixel_radius, img_cy - pixel_radius),
         (img_cx + pixel_radius, img_cy + pixel_radius)],
        outline=(255, 0, 0, 255), width=3
    )
    return img


def add_title_bar(img, title, subtitle=""):
    """Add a professional title bar at the top of the map image."""
    width = img.width
    bar_height = 40
    new_img = Image.new("RGBA", (width, img.height + bar_height), (255, 255, 255, 255))

    # Draw title bar
    draw = ImageDraw.Draw(new_img)
    draw.rectangle([(0, 0), (width, bar_height)], fill=(33, 37, 41, 255))

    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
    except (IOError, OSError):
        font_title = ImageFont.load_default()
        font_sub = font_title

    draw.text((10, 8), title, fill=(255, 255, 255), font=font_title)
    if subtitle:
        bbox = draw.textbbox((0, 0), subtitle, font=font_sub)
        sw = bbox[2] - bbox[0]
        draw.text((width - sw - 10, 12), subtitle, fill=(200, 200, 200), font=font_sub)

    # Paste original image below bar
    new_img.paste(img, (0, bar_height))
    return new_img


def add_attribution(img, text="CalTopo / SCIP Map Generator"):
    """Add small attribution text at bottom-right of image."""
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except (IOError, OSError):
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = img.width - tw - 5
    y = img.height - th - 5
    draw.rectangle([(x - 3, y - 1), (x + tw + 3, y + th + 1)], fill=(0, 0, 0, 160))
    draw.text((x, y), text, fill=(255, 255, 255, 220), font=font)
    return img


# ─── CalTopo Teams API ─────────────────────────────────────────────────────

def sign_request(method, endpoint, expires, payload_string, credential_secret):
    """Generate HMAC-SHA256 signature for CalTopo API authentication."""
    message = f"{method} {endpoint}\n{expires}\n{payload_string}"
    secret = base64.b64decode(credential_secret)
    signature = hmac.new(secret, message.encode(), "sha256").digest()
    return base64.b64encode(signature).decode()


def caltopo_api_request(method, endpoint, credential_id, credential_secret, payload=None):
    """Send an authenticated request to the CalTopo Teams API."""
    payload_string = json.dumps(payload) if payload else ""
    expires = int(time.time() * 1000) + DEFAULT_TIMEOUT_MS
    signature = sign_request(method, endpoint, expires, payload_string, credential_secret)

    parameters = {
        "id": credential_id,
        "expires": expires,
        "signature": signature,
    }

    if method.upper() == "POST" and payload is not None:
        parameters["json"] = payload_string
        query_string = ""
    else:
        query_string = f"?{urlencode(parameters)}"

    url = f"https://caltopo.com{endpoint}{query_string}"
    body = urlencode(parameters).encode() if method.upper() == "POST" and payload else None

    request = urllib.request.Request(url, data=body, method=method.upper())
    request.add_header("Content-Type", "application/x-www-form-urlencoded")
    if body is not None:
        request.add_header("Content-Length", str(len(body)))

    try:
        with urllib.request.urlopen(request) as response:
            response_data = response.read().decode("utf-8")
            if response_data:
                return json.loads(response_data).get("result")
    except urllib.error.HTTPError as e:
        print(f"  [!] CalTopo API error: {e.code} {e.reason}")
        return None


def create_map(credential_id, credential_secret, title="SCIP Site Map"):
    """Create a new map in the CalTopo team account. Returns map_id."""
    payload = {
        "properties": {
            "title": title,
            "class": "Map"
        }
    }
    result = caltopo_api_request("POST", "/api/v1/map", credential_id, credential_secret, payload)
    if result and "id" in result:
        return result["id"]
    return None


def add_marker_to_map(map_id, credential_id, credential_secret, lat, lon, title="Site", description=""):
    """Add a marker to an existing CalTopo map."""
    payload = {
        "type": "Feature",
        "id": None,
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat]
        },
        "properties": {
            "title": title,
            "description": description,
            "marker-symbol": "tower",
            "marker-color": "#FF0000",
            "marker-size": 1,
        }
    }
    return caltopo_api_request("POST", f"/api/v1/map/{map_id}/Marker",
                               credential_id, credential_secret, payload)
