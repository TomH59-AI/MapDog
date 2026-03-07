#!/usr/bin/env python3
"""
push_supabase_v2.py
Pushes Golden Hour SCIP data to Supabase using the correct table schemas:
  - sites (main site record)
  - parcels (parcel data)
  - scip_documents (document record)
  - existing_towers (cell tower data)
  - zoning_ordinances (Municode data)
"""

import requests, json, sys
from datetime import datetime

# Load secrets
SECRETS_PATH = "/home/ubuntu/skills/scip-florida/references/.secrets"
secrets = {}
with open(SECRETS_PATH) as f:
    for line in f:
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            secrets[k.strip()] = v.strip()

SUPABASE_URL = secrets["SUPABASE_URL"]
SUPABASE_KEY = secrets["SUPABASE_SECRET_KEY"]

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=representation"
}

def upsert(table, record, conflict_col=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    r = requests.post(url, headers=HEADERS, json=record, timeout=15)
    if r.status_code in (200, 201):
        result = r.json()
        if result:
            print(f"  ✅ {table}: upserted (id={result[0].get('id', 'N/A')})")
            return result[0]
        print(f"  ✅ {table}: upserted (no return body)")
        return {}
    else:
        print(f"  ❌ {table}: {r.status_code} — {r.text[:300]}")
        return None

# Load data
with open('/home/ubuntu/scip-output/golden_hour/parcel_data.json') as f:
    parcel_data = json.load(f)
with open('/home/ubuntu/scip-output/golden_hour/tower_data.json') as f:
    tower_data = json.load(f)

features = parcel_data.get('regrid_point', {}).get('parcels', {}).get('features', [])
fields = features[0]['properties']['fields'] if features else {}

zoning_text = ""
try:
    with open('/home/ubuntu/scip-output/golden_hour/sec27_content.txt') as f:
        zoning_text = f.read()[:8000]
except:
    zoning_text = "Cocoa Code of Ordinances, Appendix A, Art. XIII, Sec. 27"

# ── 1. Upsert SITE record ─────────────────────────────────────────────────────
print("\n1. Upserting site record...")
site_record = {
    "site_name": "Golden Hour",
    "site_id": "GOLDEN-HOUR-FL-001",
    "state": "FL",
    "county": "Brevard",
    "municipality": "City of Cocoa",
    "latitude": 28.384348,
    "longitude": -80.792657,
    "geom": json.dumps({"type": "Point", "coordinates": [-80.792657, 28.384348]}),
    "search_ring_lat": 28.384348,
    "search_ring_lng": -80.792657,
    "search_ring_radius_ft": 2640,
}
site_result = upsert("sites", site_record)
site_uuid = site_result.get("id") if site_result else None
print(f"  Site UUID: {site_uuid}")

# ── 2. Upsert PARCEL record ───────────────────────────────────────────────────
print("\n2. Upserting parcel record...")
parcel_record = {
    "site_id": site_uuid,
    "parcel_id": "24 3523-00-11",
    "owner_name": "Allegra At Cocoa LLC",
    "site_address": "1627 GOLDEN HOUR LN",
    "city": "COCOA",
    "state": "FL",
    "county": "Brevard",
    "zip": "32926",
    "acreage": 42.05,
    "zoning_code": "C-G",
    "land_use": "DOR Code 010 — Vacant Commercial",
    "just_value": 1669200.0,
    "assessed_value": 1669200.0,
    "data_source": "Regrid-API-2026",
    "raw_data": json.dumps({
        "owner": "Allegra At Cocoa LLC",
        "mailadd": "750 BERING DR STE 400",
        "mail_city": "HOUSTON",
        "mail_state2": "TX",
        "mail_zip": "77057",
        "parcelnumb": "24 3523-00-11",
        "state_parcelnumb": "C15-000-028-4403-3",
        "ll_gisacre": 42.05491,
        "ll_gissqft": 1831950,
        "saledate": "2024-06-11",
        "saleprice": 4200000.0,
        "legaldesc": "S 1/2 OF NE 1/4 LYING N OF ST",
        "plss_section": "Section 23",
        "plss_township": "024S",
        "plss_range": "035E",
        "zoning": "C-G",
        "zoning_description": "General Commercial",
        "usecode": "010",
        "lat": 28.384348,
        "lon": -80.792657,
        "fema_risk_factor": "Relatively Moderate",
        "alt_parcelnumb1": "2407074",
        "book": "10084",
        "page": "1715",
        "taxyear": 2025,
        "qoz": "No",
        "census_tract": "12009062115",
    })
}
parcel_result = upsert("parcels", parcel_record)

# ── 3. Upsert SCIP_DOCUMENTS record ──────────────────────────────────────────
print("\n3. Upserting SCIP document record...")
doc_record = {
    "site_id": site_uuid,
    "version": 1,
    "file_url": "/home/ubuntu/scip-output/golden_hour/GoldenHour_SCIP_Package.xlsx",
    "file_name": "GoldenHour_SCIP_Package.xlsx",
    "maps_included": True,
    "compliance_complete": True,
    "zoning_complete": True,
    "property_data_complete": True,
    "generated_by": "skywave_ai",
    "notes": (
        "Complete SCIP package for Golden Hour (28.384348, -80.792657). "
        "11 maps embedded. Both tabs populated. "
        "Parcel: 24 3523-00-11 | Owner: Allegra At Cocoa LLC | "
        "42.05 acres C-G zoning | Special Exception required. "
        "Data sources: Regrid, Apify/Municode, OpenCellID, Mapbox, FEMA, USFWS, NREL."
    ),
    "generated_at": datetime.now().isoformat()
}
doc_result = upsert("scip_documents", doc_record)

# ── 4. Upsert ZONING_ORDINANCES record ───────────────────────────────────────
print("\n4. Upserting zoning ordinance record...")
# Check zoning_ordinances table structure first
r_check = requests.get(f"{SUPABASE_URL}/rest/v1/zoning_ordinances?limit=1", 
                        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}, 
                        timeout=10)
print(f"  zoning_ordinances sample: {r_check.text[:400]}")

zoning_record = {
    "site_id": site_uuid,
    "jurisdiction": "City of Cocoa, FL",
    "zoning_code": "C-G",
    "zoning_description": "General Commercial District",
    "ldc_reference": "Appendix A, Art. XIII, Sec. 27",
    "municode_url": "https://library.municode.com/fl/cocoa/codes/code_of_ordinances?nodeId=PTIICO_APXAZO_ARTXIIISUDIRE_S27TETOAN",
    "permitted_use": "Special Exception Required",
    "height_limit_ft": 199,
    "cup_required": True,
    "stealth_required": False,
    "collocation_required": True,
    "residential_separation": "200 ft or 300% tower height (whichever greater)",
    "tower_separation": "1,500 ft (monopole ≥75 ft); 5,000 ft (lattice/guyed)",
    "scraped_text": zoning_text,
    "notes": "Towers in C-G require Special Exception from Board of Adjustment. Must demonstrate M-1 site unavailability first. 5-ft landscape buffer required. 6-ft security fence required."
}

# Try to upsert — may fail if column names don't match
r_zon = requests.post(f"{SUPABASE_URL}/rest/v1/zoning_ordinances", 
                       headers=HEADERS, json=zoning_record, timeout=15)
if r_zon.status_code in (200, 201):
    print(f"  ✅ zoning_ordinances: upserted")
else:
    print(f"  ⚠️  zoning_ordinances: {r_zon.status_code} — {r_zon.text[:300]}")
    # Try minimal record
    minimal_zon = {
        "site_id": site_uuid,
        "jurisdiction": "City of Cocoa, FL",
        "zoning_code": "C-G",
        "zoning_description": "General Commercial District",
        "ldc_reference": "Appendix A, Art. XIII, Sec. 27",
        "municode_url": "https://library.municode.com/fl/cocoa/codes/code_of_ordinances?nodeId=PTIICO_APXAZO_ARTXIIISUDIRE_S27TETOAN",
    }
    r_zon2 = requests.post(f"{SUPABASE_URL}/rest/v1/zoning_ordinances", 
                            headers=HEADERS, json=minimal_zon, timeout=15)
    print(f"  Minimal attempt: {r_zon2.status_code} — {r_zon2.text[:300]}")

# ── 5. Upsert EXISTING_TOWERS records ────────────────────────────────────────
print("\n5. Upserting cell tower records...")
r_check2 = requests.get(f"{SUPABASE_URL}/rest/v1/existing_towers?limit=1",
                         headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
                         timeout=10)
print(f"  existing_towers sample: {r_check2.text[:400]}")

tower_list = tower_data.get('tower_list', [])
towers_inserted = 0
for tower in tower_list[:10]:  # Insert top 10 nearest towers
    tower_rec = {
        "site_id": site_uuid,
        "carrier": tower.get("carrier"),
        "radio_type": tower.get("radio"),
        "latitude": tower.get("lat"),
        "longitude": tower.get("lon"),
        "distance_miles": tower.get("distance_miles"),
        "data_source": "OpenCellID",
        "mcc": tower.get("mcc"),
        "mnc": tower.get("mnc"),
    }
    r_t = requests.post(f"{SUPABASE_URL}/rest/v1/existing_towers",
                         headers=HEADERS, json=tower_rec, timeout=10)
    if r_t.status_code in (200, 201):
        towers_inserted += 1
    else:
        # Try minimal
        min_tower = {
            "site_id": site_uuid,
            "carrier": tower.get("carrier"),
            "latitude": tower.get("lat"),
            "longitude": tower.get("lon"),
        }
        r_t2 = requests.post(f"{SUPABASE_URL}/rest/v1/existing_towers",
                              headers=HEADERS, json=min_tower, timeout=10)
        if r_t2.status_code in (200, 201):
            towers_inserted += 1
        else:
            print(f"  Tower error: {r_t2.status_code} — {r_t2.text[:200]}")
            break

print(f"  ✅ Inserted {towers_inserted} tower records")

print("\n✅ Supabase push complete!")
print(f"   Site UUID: {site_uuid}")
print(f"   Site: Golden Hour | Cocoa, FL | 28.384348, -80.792657")
