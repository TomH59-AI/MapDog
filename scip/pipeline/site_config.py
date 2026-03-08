#!/usr/bin/env python3
"""
site_config.py — Central configuration for the MapDog SCIP Pipeline
=====================================================================
Edit ONLY this file to run the pipeline for any site in the contiguous
United States. All other pipeline scripts import from here.

Usage:
    1. Fill in the SITE PARAMETERS section below.
    2. Run scripts 01–07 in order.
    3. Output will be saved to OUTPUT_DIR/{SITE_SLUG}/

CONUS Coverage:
    - Parcel data:      Regrid national API (all 50 states)
    - Power lines:      HIFLD/EIA + OpenStreetMap Overpass (national)
    - Maps:             Mapbox Static API (national)
    - Cell towers:      OpenCellID + FCC ASR (national)
    - Flood zones:      FEMA NFHL (national)
    - Wetlands:         USFWS NWI (national)
    - Zoning:           Municode + ZoningPoint (national)
    - Wind speed:       NREL Wind Toolkit (national)
"""

import os
import re

# ══════════════════════════════════════════════════════════════════════════════
# SITE PARAMETERS — Edit these for each new site
# ══════════════════════════════════════════════════════════════════════════════

# Core coordinates (decimal degrees, WGS84)
LAT           = 29.239368          # Site latitude
LON           = -82.207856         # Site longitude

# Site identity
SITE_NAME     = "Ocala Preserve"   # Human-readable site name
SITE_SLUG     = "ocala_preserve"   # Filesystem-safe slug (no spaces/special chars)
COUNTY        = "Marion County"    # Full county name (e.g. "Marion County")
STATE         = "Florida"          # Full state name (e.g. "Florida")
STATE_ABBR    = "FL"               # Two-letter state abbreviation
PARCEL_ID     = "13683-001-01"     # Parcel/APN number from county records

# Search ring / project parameters
SEARCH_RADIUS_MI  = 0.50           # Search ring radius in miles
SARF_HEIGHT_FT    = 199            # SARF (Structure Above Reference Feature) height in feet
TOWER_TYPE        = "Monopole (Stealth/Camouflage preferred)"
AGENT_NAME        = "Tom Hodges"
AGENT_PHONE       = "(248) 787-1888"
AGENT_EMAIL       = "hodgesthomas@outlook.com"
CLIENT_NAME       = "AnthemNet"    # Carrier / client name

# Nearest airport (for FAA coordination)
AIRPORT_NAME      = "Ocala International Airport – Jim Taylor Field"
AIRPORT_CODE      = "KOCF"
AIRPORT_DIST_MI   = 4.72
AIRPORT_BEARING   = "SSW"

# ══════════════════════════════════════════════════════════════════════════════
# DERIVED / COMPUTED VALUES — Do not edit unless overriding
# ══════════════════════════════════════════════════════════════════════════════

# Output directory (all pipeline output goes here)
BASE_OUTPUT_DIR = "/home/ubuntu/scip-output"
OUTPUT_DIR      = os.path.join(BASE_OUTPUT_DIR, SITE_SLUG)
MAPS_DIR        = os.path.join(OUTPUT_DIR, "maps")
EXCEL_FILE      = os.path.join(OUTPUT_DIR, f"{SITE_SLUG}_SCIP_Package.xlsx")

# Data file paths (written by earlier scripts, read by later ones)
PARCEL_DATA_FILE  = os.path.join(OUTPUT_DIR, "parcel_data.json")
TOWER_DATA_FILE   = os.path.join(OUTPUT_DIR, "tower_data.json")
POWER_DATA_FILE   = os.path.join(OUTPUT_DIR, "power_data.json")
ZONING_TEXT_FILE  = os.path.join(OUTPUT_DIR, "zoning_text.txt")

# Map filename prefix (e.g. "OcalaPreserve_01_aerial.png")
MAP_PREFIX = re.sub(r'[^A-Za-z0-9]', '', SITE_NAME)  # strip spaces/special chars

# Search ring radius in feet (for map generation)
SEARCH_RADIUS_FT = int(SEARCH_RADIUS_MI * 5280)

# ══════════════════════════════════════════════════════════════════════════════
# SECRETS / API KEYS — Loaded from .secrets file
# ══════════════════════════════════════════════════════════════════════════════

SECRETS_PATHS = [
    "/home/ubuntu/skills/scip-florida-v2/references/.secrets",
    "/home/ubuntu/skills/scip-florida/references/.secrets",
    "/home/ubuntu/skills/scip/references/.secrets",
    os.path.expanduser("~/.scip_secrets"),
]

def load_secrets():
    """Load API keys from the first .secrets file found."""
    for path in SECRETS_PATHS:
        if os.path.exists(path):
            secrets = {}
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if "=" in line and not line.startswith("#"):
                        k, v = line.split("=", 1)
                        secrets[k.strip()] = v.strip()
            return secrets
    return {}

SECRETS = load_secrets()

REGRID_TOKEN       = SECRETS.get("REGRID_API_TOKEN", "")
APIFY_TOKEN        = SECRETS.get("APIFY_API_TOKEN", "")
MAPBOX_TOKEN       = SECRETS.get("MAPBOX_ACCESS_TOKEN", "")
OPENCELLID_TOKEN   = SECRETS.get("OPENCELLID_API_KEY", "pk.6d4e560229de9121955a48aa246647b2")
SUPABASE_URL       = SECRETS.get("SUPABASE_URL", "")
SUPABASE_KEY       = SECRETS.get("SUPABASE_SECRET_KEY", "")
GOOGLE_MAPS_KEY    = SECRETS.get("GOOGLE_MAPS_API_KEY", "")
NREL_API_KEY       = SECRETS.get("NREL_API_KEY", "")

# ══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

import math

def haversine(lat1, lon1, lat2, lon2):
    """Return distance in miles between two lat/lon points."""
    R = 3958.8
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def ensure_output_dirs():
    """Create output directories if they don't exist."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(MAPS_DIR, exist_ok=True)


def print_site_banner():
    """Print a formatted site info banner at script startup."""
    print("=" * 65)
    print(f"  MapDog SCIP Pipeline")
    print(f"  Site:    {SITE_NAME}")
    print(f"  County:  {COUNTY}, {STATE_ABBR}")
    print(f"  Coords:  {LAT}, {LON}")
    print(f"  Parcel:  {PARCEL_ID}")
    print(f"  Output:  {OUTPUT_DIR}")
    print("=" * 65)


# ══════════════════════════════════════════════════════════════════════════════
# QUICK-CHANGE TEMPLATE (copy/paste for a new site)
# ══════════════════════════════════════════════════════════════════════════════
#
# LAT           = 42.9634
# LON           = -85.6681
# SITE_NAME     = "Grand Rapids North"
# SITE_SLUG     = "grand_rapids_north"
# COUNTY        = "Kent County"
# STATE         = "Michigan"
# STATE_ABBR    = "MI"
# PARCEL_ID     = "41-14-07-200-001"
# SEARCH_RADIUS_MI  = 0.50
# SARF_HEIGHT_FT    = 199
# AIRPORT_NAME      = "Gerald R. Ford International Airport"
# AIRPORT_CODE      = "KGRR"
# AIRPORT_DIST_MI   = 6.2
# AIRPORT_BEARING   = "SE"
