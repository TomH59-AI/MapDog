---
name: scip-caltopo-maps
description: CalTopo-powered SCIP map generator for wireless site acquisition. Use when generating high-quality maps for Site Candidate Information Packages (SCIP), including aerial, topo, floodplain, zoning, FLU, wetlands, airport, cell tower, parcel, wind speed, search ring maps, and 3D tilted viewsheds. Requires CalTopo Pro account (API key G2710M). Replaces or supplements Mapbox/Regrid-based map generation with CalTopo WMTS tiles.
---

# CalTopo SCIP Map Generator

Generate all 11 standard SCIP maps + 4 tilted 3D viewsheds using CalTopo WMTS tiles, FEMA/USFWS overlays, and Cesium Ion.

## Prerequisites

- CalTopo Pro account (Account ID: `G2710M`, Skyline Trial)
- Python 3.11+ with `requests`, `Pillow`
- Optional: `playwright` for 3D Cesium viewsheds

## Quick Start

```bash
# Generate all 11 SCIP maps
python3 /home/ubuntu/skills/scip-caltopo-maps/scripts/generate_scip_maps.py \
  34.2572 -83.8451 /tmp/scip_maps --label "GA-SITE-001" --radius_ft 2640

# Generate 3D tilted viewsheds (N/S/E/W)
python3 /home/ubuntu/skills/scip-caltopo-maps/scripts/generate_3d_viewsheds.py \
  34.2572 -83.8451 /tmp/scip_maps --label "GA-SITE-001" --height_m 60

# Generate CalTopo interactive URLs for SCIP document
python3 /home/ubuntu/skills/scip-caltopo-maps/scripts/caltopo_url_builder.py \
  34.2572 -83.8451 "GA-SITE-001"
```

## Map Generation Workflow

### Step 1: Collect Site Info

Required inputs: latitude, longitude, site label.
Optional: search ring radius (default 2640ft = 0.5mi), image dimensions.

### Step 2: Generate Maps

Run `generate_scip_maps.py` with site coordinates. The script:

1. Fetches CalTopo WMTS tiles for each map type (see layer mapping below)
2. Composites external overlays (FEMA floodplain, USFWS wetlands)
3. Adds site markers, title bars, and attribution
4. Saves 11 PNG images + JSON manifest to output directory

### Step 3: Generate 3D Viewsheds

Run `generate_3d_viewsheds.py` for 4 cardinal direction views above treeline.
Uses Cesium Ion terrain + imagery via headless Chromium.
Falls back to CalTopo Enhanced Relief if Playwright unavailable.

### Step 4: Generate Interactive URLs

Run `caltopo_url_builder.py` to create shareable CalTopo map links for each SCIP map type. Embed these in the SCIP document for interactive reference.

## CalTopo Layer Mapping

| SCIP Map | CalTopo Layer | Zoom | External Overlay |
|----------|--------------|------|------------------|
| Aerial | `imagery` | 14-16 | — |
| Topography | `mbt` (Topo) | 14 | — |
| Floodplain | `imagery` | 14 | FEMA NFHL WMS |
| Zoning | `mbh` (Hybrid) | 14 | — |
| FLU | `mbr` (Roads) | 14 | — |
| Wetlands | `imagery` | 14 | USFWS NWI REST |
| Airport | `faa` (FAA Sectional) | 11 | ArcGIS Airport |
| Cell Tower | `imagery` | 14 | FCC ASR |
| Parcel | `imagery` + `mba` | 16-17 | — |
| Wind Speed | `r3` (Terrain) | 12-14 | NREL (optional) |
| Search Ring | `mbh` (Hybrid) | 13 | — |

## WMTS Tile URL Pattern

```
https://caltopo.com/api/G2710M/wmts/tile/{LAYER}/{ZOOM}/{COL}/{ROW}.png
```

Tiles: 256x256px, EPSG:3857. The `caltopo_client.py` module handles tile math and stitching.

## CalTopo Teams API

For creating maps and adding markers programmatically. Uses HMAC-SHA256 authentication.
Read `references/caltopo_api_reference.md` for full endpoint documentation.

Credential IDs available: `446E21VND1CG`, `NA1PM2NP8K5D`, `8K0JCN4HUH20`.

## Key Scripts

| Script | Purpose |
|--------|--------|
| `generate_scip_maps.py` | Main entry: generates all 11 SCIP maps |
| `generate_3d_viewsheds.py` | 3D tilted viewsheds via Cesium Ion |
| `caltopo_client.py` | Core library: tile fetching, stitching, annotations |
| `caltopo_url_builder.py` | Generate interactive CalTopo URLs |

## References

- `references/caltopo_api_reference.md` — Full API docs, endpoints, auth
- `references/scip_map_layer_mapping.md` — Detailed layer-to-map mapping
- `references/.secrets` — API keys (CalTopo, Cesium, OpenCellID, NREL)

## Notes

- CalTopo Pro trial expires 5/8/2026; renew or maps will degrade to free tier
- Parcel overlay is available via CalTopo interactive maps (`parcel_ln`) but not as a WMTS tile layer; use Regrid API for programmatic parcel boundary overlays
- For zoning/FLU data, supplement with Municode scraping (see `scip-municode` skill)
- 3D viewsheds require `playwright install chromium` on first run
