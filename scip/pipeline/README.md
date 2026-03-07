# SkyWave SCIP Pipeline — Automated Scripts

This directory contains the fully automated SCIP generation pipeline for Florida wireless site acquisition.

## Pipeline Steps

Run scripts in order:

| Script | Purpose |
|--------|---------|
| `01_collect_parcel_data.py` | Regrid API parcel lookup |
| `02_scrape_municode.py` | Apify/Municode zoning scraper |
| `03_generate_maps.py` | 11-map set generator (Mapbox, USGS, FEMA, USFWS, NREL) |
| `04_query_towers.py` | OpenCellID cell tower query |
| `05_build_excel.py` | Excel SCIP package builder |
| `06_embed_maps.py` | Map embedding into Excel |
| `07_push_supabase.py` | Supabase + Notion push |

## Required API Keys

Set in `.env` or `references/.secrets`:
- `REGRID_API_TOKEN`
- `APIFY_API_TOKEN`
- `MAPBOX_ACCESS_TOKEN`
- `OPENCELLID_API_KEY`
- `SUPABASE_URL` + `SUPABASE_SECRET_KEY`
- `GOOGLE_MAPS_API_KEY`
- `NREL_API_KEY`

## Test Run

This pipeline was validated on March 7, 2026 for:
- **Site:** Golden Hour | 1627 Golden Hour Ln, Cocoa, FL 32926
- **Parcel:** 24 3523-00-11 | Owner: Allegra At Cocoa LLC
- **Coordinates:** 28.384348, -80.792657
- **Supabase UUID:** 5bdee783-3d4e-4078-90cf-a779dd93707b
- **Notion:** https://www.notion.so/31c274bf71c181cdb62ae528e5ac8da0
