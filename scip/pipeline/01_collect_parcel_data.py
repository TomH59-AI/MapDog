#!/usr/bin/env python3
"""
collect_parcel_data.py
Collects all parcel and enrichment data for 1627 Golden Hour Ln, Cocoa FL
using Regrid, FGIO/FDOR, Zonenomics, and other APIs.
"""

import requests
import json
import os
import sys

# ── Site constants ────────────────────────────────────────────────────────────
LAT = 28.384348
LON = -80.792657
ADDRESS = "1627 GOLDEN HOUR LN, COCOA, FL 32926"
PARCEL_ID_RAW = "24 3523-00-11"
PARCEL_ID_CLEAN = "2435230011"  # Brevard County format

# ── API Keys ──────────────────────────────────────────────────────────────────
REGRID_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJyZWdyaWQuY29tIiwiaWF0IjoxNzcyNjM1MTEyLCJleHAiOjE3ODA0MTExMTIsImciOjExMzQ2MywidCI6MSwiY2FwIjoicGE6dHMiLCJ0aSI6MTE4NX0.CRW3Ne-0vB22qu9oVu0BIIPav9mUmuy0YJBsRidkOr4"
ESRI_KEY = "AAPTaUOC0q9LoiSc3sjypDCfbWA..9koUFgKpKlFa4VlU-BxNtLFFgOUaY0ArJ7zD6IF1KeTQERyPb8Uuk8BMjt1c8ozP1qb0S-FZEsmaw7VqMfQx9Y5_c39ZD_6aQnGhbh8IX0ArZnJDQ5xhksKjUNmkljMIvybeaMbbIP-Y-T7X1qPV3ImcYsu-KOYuJFOpeNFDesdiesTMHey9bFhg6Snll-sldza58eKMp5SDLL6uV7vgcWkG8RFunjQeYeKUYpH-_aDx6lCKUsiO2VrRnw..AT1_TMlUTFMH"
ZONENOMICS_TOKEN = "036b09b7713b7d2d543a9ea3c73afceb4cbedf3d"
GOOGLE_MAPS_KEY = "AIzaSyBZyS6oMANyDrZZZE6Hr1Aeuj6Z1P1k7EE"

results = {}

# ── 1. Regrid Parcel Lookup ───────────────────────────────────────────────────
print("\n[1] Querying Regrid API...")
try:
    # Try by coordinates first
    r = requests.get(
        "https://app.regrid.com/api/v2/parcels/point",
        params={"lat": LAT, "lon": LON, "token": REGRID_TOKEN, "return_custom": "false"},
        timeout=20
    )
    print(f"  Regrid point query: HTTP {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        results["regrid_point"] = data
        print(f"  Response keys: {list(data.keys())}")
        # Try to extract parcel info
        parcels = data.get("parcels", {}).get("features", [])
        if parcels:
            props = parcels[0].get("properties", {})
            print(f"  Found parcel: {props.get('fields', {}).get('parcelnumb', 'N/A')}")
            results["regrid_parcel"] = props
        else:
            print(f"  No features found. Full response: {json.dumps(data)[:500]}")
    else:
        print(f"  Error: {r.text[:300]}")
except Exception as e:
    print(f"  Regrid error: {e}")

# ── 2. Regrid by Address ──────────────────────────────────────────────────────
print("\n[2] Regrid address search...")
try:
    r = requests.get(
        "https://app.regrid.com/api/v2/parcels/address",
        params={"query": ADDRESS, "token": REGRID_TOKEN, "limit": 1},
        timeout=20
    )
    print(f"  Regrid address query: HTTP {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        results["regrid_address"] = data
        parcels = data.get("parcels", {}).get("features", [])
        if parcels:
            props = parcels[0].get("properties", {}).get("fields", {})
            print(f"  Owner: {props.get('owner', 'N/A')}")
            print(f"  Parcel #: {props.get('parcelnumb', 'N/A')}")
            print(f"  Acres: {props.get('ll_gisacre', 'N/A')}")
            results["regrid_fields"] = props
        else:
            print(f"  No parcels in address result. Keys: {list(data.keys())}")
    else:
        print(f"  Error: {r.text[:300]}")
except Exception as e:
    print(f"  Regrid address error: {e}")

# ── 3. FGIO/FDOR Statewide Cadastral ─────────────────────────────────────────
print("\n[3] Querying FGIO/FDOR Statewide Cadastral...")
try:
    FGIO_URL = "https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0/query"
    delta = 0.002
    params = {
        "geometry": json.dumps({
            "xmin": LON - delta, "ymin": LAT - delta,
            "xmax": LON + delta, "ymax": LAT + delta,
            "spatialReference": {"wkid": 4326}
        }),
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "*",
        "returnGeometry": "false",
        "f": "json",
        "resultRecordCount": 3
    }
    r = requests.get(FGIO_URL, params=params, timeout=25)
    print(f"  FGIO query: HTTP {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        features = data.get("features", [])
        print(f"  Found {len(features)} features")
        if features:
            attrs = features[0].get("attributes", {})
            results["fgio_attrs"] = attrs
            print(f"  PARCELNO: {attrs.get('PARCELNO', 'N/A')}")
            print(f"  OWN_NAME: {attrs.get('OWN_NAME', 'N/A')}")
            print(f"  PHY_ADDR1: {attrs.get('PHY_ADDR1', 'N/A')}")
            print(f"  DOR_UC: {attrs.get('DOR_UC', 'N/A')}")
            print(f"  LND_VAL: {attrs.get('LND_VAL', 'N/A')}")
            print(f"  JV: {attrs.get('JV', 'N/A')}")
            print(f"  LND_SQFOOT: {attrs.get('LND_SQFOOT', 'N/A')}")
            print(f"  S_LEGAL: {attrs.get('S_LEGAL', 'N/A')}")
            print(f"  TWN/RNG/SEC: {attrs.get('TWN')}/{attrs.get('RNG')}/{attrs.get('SEC')}")
        else:
            print(f"  No features. Error: {data.get('error', 'none')}")
    else:
        print(f"  Error: {r.text[:300]}")
except Exception as e:
    print(f"  FGIO error: {e}")

# ── 4. Zonenomics Zoning Lookup ───────────────────────────────────────────────
print("\n[4] Querying Zonenomics...")
try:
    r = requests.get(
        "https://zonenomics.com/api/v1/zone",
        params={"lat": LAT, "lng": LON},
        headers={"Authorization": f"Token {ZONENOMICS_TOKEN}"},
        timeout=15
    )
    print(f"  Zonenomics: HTTP {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        results["zonenomics"] = data
        print(f"  Zone: {data.get('zone', 'N/A')}")
        print(f"  Description: {data.get('description', 'N/A')}")
        print(f"  Jurisdiction: {data.get('jurisdiction', 'N/A')}")
    else:
        print(f"  Response: {r.text[:300]}")
except Exception as e:
    print(f"  Zonenomics error: {e}")

# ── 5. Google Maps Geocode / Place Details ────────────────────────────────────
print("\n[5] Google Maps reverse geocode...")
try:
    r = requests.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        params={"latlng": f"{LAT},{LON}", "key": GOOGLE_MAPS_KEY},
        timeout=15
    )
    print(f"  Google Geocode: HTTP {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        results["google_geocode"] = data
        if data.get("results"):
            addr = data["results"][0]
            print(f"  Formatted: {addr.get('formatted_address', 'N/A')}")
            # Extract components
            components = {c["types"][0]: c["long_name"] for c in addr.get("address_components", []) if c.get("types")}
            results["address_components"] = components
            print(f"  County: {components.get('administrative_area_level_2', 'N/A')}")
            print(f"  State: {components.get('administrative_area_level_1', 'N/A')}")
except Exception as e:
    print(f"  Google Maps error: {e}")

# ── 6. Brevard County Property Appraiser ─────────────────────────────────────
print("\n[6] Brevard County Property Appraiser (BCPA)...")
try:
    # BCPA has a public REST API
    r = requests.get(
        "https://www.bcpao.us/api/v1/search",
        params={"parcel": PARCEL_ID_CLEAN, "activeonly": "true", "size": 1, "page": 1},
        headers={"Accept": "application/json"},
        timeout=15
    )
    print(f"  BCPA search: HTTP {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        results["bcpa_search"] = data
        print(f"  Result: {json.dumps(data)[:500]}")
    else:
        print(f"  Response: {r.text[:300]}")
        
    # Try account lookup
    r2 = requests.get(
        f"https://www.bcpao.us/api/v1/account/{PARCEL_ID_CLEAN}",
        headers={"Accept": "application/json"},
        timeout=15
    )
    print(f"  BCPA account: HTTP {r2.status_code}")
    if r2.status_code == 200:
        data2 = r2.json()
        results["bcpa_account"] = data2
        print(f"  Account data: {json.dumps(data2)[:800]}")
except Exception as e:
    print(f"  BCPA error: {e}")

# ── Save all results ──────────────────────────────────────────────────────────
out_path = "/home/ubuntu/scip-output/golden_hour/parcel_data.json"
with open(out_path, "w") as f:
    json.dump(results, f, indent=2, default=str)
print(f"\n✅ All data saved to {out_path}")
print(f"Keys collected: {list(results.keys())}")
