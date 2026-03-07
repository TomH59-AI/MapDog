---
name: scip-florida-v2
description: "Site Candidate Information Package (SCIP) workflow for wireless site acquisition in Florida. Use this skill for generating SCIP documents, looking up Florida parcel data, scraping Municode zoning ordinances, and generating 11-map technical sets. Integrates Regrid, Apify, OpenCellID, Mapbox, FEMA, USFWS, NREL, Supabase, and Notion."
---

# Florida SCIP Workflow v2

Complete, end-to-end pipeline for generating a Site Candidate Information Package (SCIP) for wireless site acquisition in Florida. Integrates Regrid, Apify/Municode, OpenCellID, Mapbox, FEMA, USFWS, NREL, Supabase, and Notion.

## Required Inputs

| Field | Example |
|---|---|
| Parcel Address | 1627 GOLDEN HOUR LN, COCOA, FL 32926 |
| Parcel ID | 24 3523-00-11 |
| Owner Name | Allegra At Cocoa LLC |
| Owner Mailing Address | 750 Bering Dr Ste 400, Houston, TX 77057 |
| Latitude | 28.384348 |
| Longitude | -80.792657 |
| Parcel Acres | 42.05 |
| Zoning | C-G |
| FEMA Risk Factor | Relatively Moderate |

## Pipeline Steps (run in order)

### Step 1 — Collect Parcel Data
`scripts/01_collect_parcel_data.py`

Calls Regrid API (`/api/v1/parcel/point`) with lat/lon. Saves full JSON to `parcel_data.json`. Extracts owner, acreage, legal description, sale history, DOR code, PLSS, census tract.

### Step 2 — Scrape Municode Zoning
`scripts/02_scrape_municode.py`

Uses Apify actor `apify/web-scraper` to scrape the target municipality's Municode page. Searches for telecom tower sections (Art. XIII, Sec. 27 pattern for Cocoa FL). Saves to `sec27_content.txt` and `municode_*.json` files.

**Cocoa FL Municode URL:** `https://library.municode.com/fl/cocoa/codes/code_of_ordinances`
**Telecom section:** `?nodeId=PTIICO_APXAZO_ARTXIIISUDIRE_S27TETOAN`

### Step 3 — Generate 11 Maps
`scripts/03_generate_maps.py`

Generates maps to `maps/` directory using:
- **Mapbox Static API** — Aerial (01), Zoning (04), FLU (05), Cell Towers (08), Parcel (09), Search Ring (11)
- **USGS Topo WMS** — Topography (02)
- **FEMA WMS** — Floodplain (03): `https://hazards.fema.gov/gis/nfhl/services/public/NFHL/MapServer/WMSServer`
- **USFWS NWI WMS** — Wetlands (06): `https://fwsprimary.wim.usgs.gov/server/services/Wetlands/MapServer/WMSServer`
- **Google Static Maps** — Airport proximity (07)
- **NREL Wind API** — Wind speed (10): `https://developer.nrel.gov/api/wind-toolkit/v2/wind/wtk-srw-download`

Output naming: `{SiteName}_01_aerial.png` through `{SiteName}_11_search_ring.png`

### Step 4 — Query Cell Towers
`scripts/04_query_towers.py`

Calls OpenCellID API (`https://opencellid.org/cell/getInArea`) with a 0.01-degree bounding box. Returns carrier, radio type, lat/lon, distance. Saves to `tower_data.json`.

### Step 5 — Build Excel SCIP Package
`scripts/05_build_excel.py`

Loads `ExampleBlankSCIPPackage.xlsx` template. **Must unmerge all cells first** before writing values (merged cells are read-only). Populates both the `Candidate` and `Site Contact Summary` tabs with all collected data. Saves to `{SiteName}_SCIP_Package.xlsx`.

**Critical fix:** Add this before writing any cell values:
```python
for merged_range in list(ws.merged_cells.ranges):
    ws.unmerge_cells(str(merged_range))
```

### Step 6 — Embed Maps
`scripts/06_embed_maps.py`

Creates a `Maps` sheet in the Excel file with all 11 maps embedded full-size. Also embeds thumbnail versions in the `Candidate` sheet at the appropriate rows. Uses `openpyxl.drawing.image.Image` and `PIL` for resizing.

### Step 7 — Push to Supabase & Notion
`scripts/07_push_supabase.py`

Pushes to these Supabase tables (URL: `https://skpxeouvikzgsaurkohf.supabase.co`):
- `sites` — main site record with lat/lon/geom
- `parcels` — parcel data with raw_data JSONB
- `scip_documents` — document record (`maps_included` is `text[]` array, NOT boolean)
- `zoning_ordinances` — zoning data (see column names below)
- `existing_towers` — tower records (`tower_owner`, `tower_type`, `carriers` as `text[]`)

**Key Supabase column names:**
- `zoning_ordinances`: `jurisdiction_name`, `max_tower_height_ft`, `setback_requirement`, `fall_zone_requirement`, `residential_separation_ft`, `ldc_section_reference`, `ordinance_source_url`
- `existing_towers`: `tower_owner`, `tower_type`, `height_ft`, `distance_from_site_ft`, `carriers` (array), `data_source`
- `scip_documents`: `maps_included` is `text[]` (pass list of filenames, not boolean)

**Notion:** Create page under `a16a0a71-f45e-4d96-91eb-94526bec8832` (SCIPs parent page) using `notion-create-pages` MCP tool with `pages` array format. Use `notion_template.md` as content template.

## Supabase Table Reference

Key tables in the SkyWave Supabase project:

| Table | Purpose |
|---|---|
| `sites` | Master site records |
| `parcels` | Parcel ownership/value data |
| `scip_documents` | SCIP package file records |
| `zoning_ordinances` | Scraped zoning rules |
| `existing_towers` | Nearby cell tower inventory |
| `landlords` | Owner contact info |
| `leases` | Lease terms |
| `site_contacts` | Jurisdiction/utility contacts |
| `municode_ordinances` | Raw scraped ordinance text |

## Known Issues & Fixes

- **Merged cells error**: Always unmerge all cells before writing to Excel template
- **Apify Municode**: Use `apify/web-scraper` actor, NOT `apify/cheerio-scraper` (JS-rendered pages)
- **FEMA WMS**: Layer name is `0` (not `NFHL`); use `GetMap` with `LAYERS=0`
- **USFWS NWI**: Layer `1` for wetlands polygons
- **OpenCellID bbox**: Use 0.01 degree radius (~0.7 miles), not larger (rate limits)
- **Supabase `scip_documents`**: `maps_included` expects `text[]`, not boolean
- **Notion `notion-create-pages`**: Requires `pages` array, not flat `parent_id`/`content` keys

## Secrets File Location

`/home/ubuntu/skills/scip-florida-v2/references/.secrets`

Required keys: `REGRID_API_TOKEN`, `APIFY_API_TOKEN`, `MAPBOX_ACCESS_TOKEN`, `OPENCELLID_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `GOOGLE_MAPS_API_KEY`, `NREL_API_KEY`
