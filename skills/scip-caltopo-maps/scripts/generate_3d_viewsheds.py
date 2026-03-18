#!/usr/bin/env python3
"""
generate_3d_viewsheds.py
------------------------
Generates 3D tilted viewshed images from N/S/E/W above the treeline
using Cesium Ion terrain + imagery.

These are the "above treeline" perspective views required for RF analysis
in SCIP packages. Each view shows the terrain from an elevated vantage
point looking in one of four cardinal directions.

Uses Cesium Ion API with Playwright for browser-based 3D rendering.

Usage:
    python generate_3d_viewsheds.py <lat> <lon> <output_dir> [--label LABEL] [--height_m 60]
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

CESIUM_KEY = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
              "eyJqdGkiOiI2OWJlMWRlMi1jNmI4LTQxNGMtOWJkMi1mNDk2ZWM1ZjdkNGUiLCJpZCI6Mzk4MjgxLCJpYXQiOjE3NzI2NzM0Nzh9."
              "f0Z156eSEjHFiJGdAEbmrC1kuoqjZDw1k9cOg4SISuU")

# Cardinal directions: heading in degrees, pitch angle
DIRECTIONS = {
    "north": {"heading": 0, "pitch": -15, "label": "Looking North"},
    "east":  {"heading": 90, "pitch": -15, "label": "Looking East"},
    "south": {"heading": 180, "pitch": -15, "label": "Looking South"},
    "west":  {"heading": 270, "pitch": -15, "label": "Looking West"},
}


def create_cesium_html(lat, lon, heading, pitch, height_m, cesium_key):
    """Create the Cesium viewer HTML for a specific viewpoint."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<script src="https://cesium.com/downloads/cesiumjs/releases/1.124/Build/Cesium/Cesium.js"></script>
<link href="https://cesium.com/downloads/cesiumjs/releases/1.124/Build/Cesium/Widgets/widgets.css" rel="stylesheet">
<style>
html, body, #cesiumContainer {{
    margin: 0; padding: 0;
    width: 100%; height: 100%;
    overflow: hidden;
}}
.cesium-credit-logoContainer,
.cesium-credit-textContainer {{
    display: none !important;
}}
</style>
</head>
<body>
<div id="cesiumContainer"></div>
<script>
(async function() {{
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
        creditContainer: document.createElement('div'),
    }});

    viewer.scene.globe.enableLighting = false;

    viewer.camera.setView({{
        destination: Cesium.Cartesian3.fromDegrees({lon}, {lat}, {height_m}),
        orientation: {{
            heading: Cesium.Math.toRadians({heading}),
            pitch: Cesium.Math.toRadians({pitch}),
            roll: 0.0
        }}
    }});

    // Wait for terrain tiles to finish loading
    let checkCount = 0;
    const interval = setInterval(() => {{
        checkCount++;
        const remaining = viewer.scene.globe.tilesLoaded;
        if (remaining || checkCount > 60) {{
            clearInterval(interval);
            document.title = 'CESIUM_READY';
        }}
    }}, 500);

    // Fallback: mark ready after 15 seconds regardless
    setTimeout(() => {{
        document.title = 'CESIUM_READY';
    }}, 15000);
}})();
</script>
</body>
</html>"""


def generate_viewsheds_playwright(lat, lon, output_dir, label="site", height_m=60):
    """Generate 4 cardinal direction viewshed images using Playwright."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("  [!] Playwright not installed. Install with: pip install playwright && playwright install chromium")
        print("  [!] Falling back to static viewshed generation...")
        return generate_viewsheds_static(lat, lon, output_dir, label, height_m)

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-gpu"])

        for direction, config in DIRECTIONS.items():
            print(f"  [3D] Generating {config['label']} viewshed...")
            html_content = create_cesium_html(
                lat, lon, config["heading"], config["pitch"], height_m, CESIUM_KEY
            )

            # Write HTML to temp file
            html_path = output_dir / f"_temp_{direction}.html"
            with open(html_path, "w") as f:
                f.write(html_content)

            page = browser.new_page(viewport={"width": 1280, "height": 960})
            page.goto(f"file://{html_path}")

            # Wait for Cesium to finish loading terrain
            try:
                page.wait_for_function("document.title === 'CESIUM_READY'", timeout=20000)
            except Exception:
                print(f"    ⚠ Timeout waiting for terrain, capturing anyway...")
            time.sleep(2)  # Extra buffer for tile rendering

            # Screenshot
            img_path = output_dir / f"{label}_3d_{direction}.png"
            page.screenshot(path=str(img_path))
            page.close()

            # Clean up temp HTML
            html_path.unlink(missing_ok=True)

            # Add title bar using PIL
            from PIL import Image, ImageDraw, ImageFont
            img = Image.open(img_path)
            draw = ImageDraw.Draw(img)

            # Add direction label overlay
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
                font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
            except (IOError, OSError):
                font = ImageFont.load_default()
                font_sm = font

            # Title bar at top
            draw.rectangle([(0, 0), (img.width, 36)], fill=(33, 37, 41, 220))
            draw.text((10, 6), f"3D VIEWSHED — {config['label'].upper()} | {label}",
                      fill=(255, 255, 255), font=font)
            info = f"{lat:.6f}, {lon:.6f} | {height_m}m AGL"
            bbox = draw.textbbox((0, 0), info, font=font_sm)
            draw.text((img.width - (bbox[2]-bbox[0]) - 10, 12), info,
                      fill=(200, 200, 200), font=font_sm)

            img.save(img_path, "PNG")
            results[direction] = str(img_path)
            print(f"    ✓ {img_path}")

        browser.close()

    return results


def generate_viewsheds_static(lat, lon, output_dir, label="site", height_m=60):
    """
    Fallback: Generate viewshed-style maps using CalTopo terrain layers
    when Playwright is not available.
    """
    sys.path.insert(0, os.path.dirname(__file__))
    from caltopo_client import stitch_tiles, add_site_marker, add_title_bar, add_attribution

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    results = {}
    session = __import__("requests").Session()

    for direction, config in DIRECTIONS.items():
        print(f"  [2D Fallback] Generating {config['label']} terrain view...")
        img = stitch_tiles("G2710M", "r2", lat, lon, 14, 1280, 960, session)
        img = add_site_marker(img, lat, lon, lat, lon, 14, 1280, 960, label)
        img = add_title_bar(img, f"VIEWSHED — {config['label'].upper()} | {label}",
                            f"{lat:.6f}, {lon:.6f}")
        img = add_attribution(img, "CalTopo Enhanced Relief | SCIP")
        path = output_dir / f"{label}_3d_{direction}.png"
        img.convert("RGB").save(path, "PNG")
        results[direction] = str(path)
        print(f"    ✓ {path}")

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Generate 3D tilted viewshed images for SCIP.")
    parser.add_argument("lat", type=float, help="Site latitude")
    parser.add_argument("lon", type=float, help="Site longitude")
    parser.add_argument("output_dir", type=str, help="Output directory")
    parser.add_argument("--label", type=str, default="site", help="Site label")
    parser.add_argument("--height_m", type=int, default=60,
                        help="Camera height above ground in meters (default: 60)")
    args = parser.parse_args()

    print(f"\n  3D Viewshed Generator — Cesium Ion")
    print(f"  Site: {args.label} at ({args.lat}, {args.lon})")
    print(f"  Height: {args.height_m}m AGL\n")

    results = generate_viewsheds_playwright(
        args.lat, args.lon, args.output_dir, args.label, args.height_m
    )
    print(f"\n  ✅ {len(results)} viewshed images generated.")
    return results


if __name__ == "__main__":
    main()
