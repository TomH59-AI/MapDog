#!/usr/bin/env python3
"""
query_towers_v3.py
OpenCellID with correct bbox size (max 4,000,000 sq meters = ~2km x 2km).
Also queries AntennaSearch via Apify for real tower data.
"""

import requests
import json
import math

LAT = 28.384348
LON = -80.792657
OPENCELLID_TOKEN = "pk.6d4e560229de9121955a48aa246647b2"

def haversine(lat1, lon1, lat2, lon2):
    R = 3959
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

results = {}

# ── 1. OpenCellID with correct bbox (1km x 1km = 1,000,000 sq m) ─────────────
print("[1] OpenCellID (1km bbox)...")
# 1 degree lat ≈ 111km, 1 degree lon ≈ 111km * cos(lat)
# For 1km: delta_lat ≈ 0.009, delta_lon ≈ 0.009/cos(28.38°) ≈ 0.0102
delta_lat = 0.009   # ~1km
delta_lon = 0.0102  # ~1km at this latitude

for radius_factor in [1, 2, 3]:
    dl = delta_lat * radius_factor
    dlo = delta_lon * radius_factor
    bbox = f"{LAT-dl},{LON-dlo},{LAT+dl},{LON+dlo}"
    
    try:
        r = requests.get(
            "https://opencellid.org/cell/getInArea",
            params={
                "key": OPENCELLID_TOKEN,
                "BBOX": bbox,
                "format": "json",
                "limit": 500
            },
            timeout=20
        )
        print(f"  Radius {radius_factor}km: HTTP {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            cells = data.get("cells", [])
            print(f"    Cells: {len(cells)}")
            if cells:
                results["opencellid"] = data
                tower_list = []
                for c in cells:
                    clat = c.get('lat', 0)
                    clon = c.get('lon', 0)
                    dist = haversine(LAT, LON, clat, clon)
                    mcc = c.get('mcc', 0)
                    mnc = c.get('mnc', 0)
                    carrier_map = {
                        (310, 260): "T-Mobile", (310, 410): "AT&T",
                        (310, 120): "Sprint/T-Mobile", (310, 160): "T-Mobile",
                        (311, 480): "Verizon", (311, 580): "US Cellular",
                        (310, 30): "AT&T", (310, 380): "FirstNet/AT&T",
                        (310, 20): "T-Mobile", (310, 490): "Sprint",
                    }
                    carrier = carrier_map.get((mcc, mnc), f"MCC:{mcc}/MNC:{mnc}")
                    tower_list.append({
                        "carrier": carrier, "radio": c.get('radio', 'N/A'),
                        "lat": clat, "lon": clon, "distance_miles": round(dist, 2),
                        "range_m": c.get('range', 0), "samples": c.get('samples', 0),
                        "mcc": mcc, "mnc": mnc
                    })
                tower_list.sort(key=lambda x: x['distance_miles'])
                results["tower_list"] = tower_list
                print(f"\n    Nearest towers:")
                for t in tower_list[:10]:
                    print(f"      {t['carrier']} | {t['radio']} | {t['distance_miles']} mi | "
                          f"Lat:{t['lat']:.4f} Lon:{t['lon']:.4f}")
                break
            else:
                err = data.get('error', '')
                print(f"    Error: {err}")
        else:
            print(f"    Response: {r.text[:200]}")
    except Exception as e:
        print(f"    Error: {e}")

# ── 2. Try OpenCellID cell lookup by known cell IDs in area ───────────────────
print("\n[2] OpenCellID - lookup known carriers in Brevard County...")
# Try looking up known cell towers by MCC/MNC/LAC/CID ranges
test_cells = [
    (310, 410, 12345, 67890),  # AT&T
    (311, 480, 12345, 67890),  # Verizon
    (310, 260, 12345, 67890),  # T-Mobile
]
for mcc, mnc, lac, cid in test_cells[:1]:
    try:
        r = requests.get(
            "https://opencellid.org/cell/get",
            params={"key": OPENCELLID_TOKEN, "mcc": mcc, "mnc": mnc, "lac": lac, "cellid": cid, "format": "json"},
            timeout=10
        )
        print(f"  MCC:{mcc} MNC:{mnc}: HTTP {r.status_code} - {r.text[:100]}")
    except Exception as e:
        print(f"  Error: {e}")

# ── 3. Scrape AntennaSearch.com via direct HTTP ───────────────────────────────
print("\n[3] AntennaSearch.com direct query...")
try:
    # AntennaSearch has a search endpoint
    r = requests.get(
        "https://www.antennasearch.com/sitestart.asp",
        params={
            "lat": LAT,
            "lng": LON,
            "radius": "0.50",
            "unit": "mile",
            "Submit": "Search"
        },
        headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0",
            "Accept": "text/html,application/xhtml+xml",
            "Referer": "https://www.antennasearch.com/"
        },
        timeout=20
    )
    print(f"  HTTP {r.status_code}")
    if r.status_code == 200:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(r.text, 'html.parser')
        text = soup.get_text()
        # Look for tower counts
        lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 5]
        for line in lines[:50]:
            if any(x in line.lower() for x in ['tower', 'antenna', 'found', 'result', 'within', 'mile', 'registration']):
                print(f"    {line}")
except Exception as e:
    print(f"  Error: {e}")

# ── 4. Use FCC CDBS public data ───────────────────────────────────────────────
print("\n[4] FCC CDBS public data...")
try:
    # FCC has downloadable tower data
    r = requests.get(
        "https://www.fcc.gov/media/radio/cdbs-database-downloads",
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=10
    )
    print(f"  FCC CDBS page: HTTP {r.status_code}")
except Exception as e:
    print(f"  Error: {e}")

# ── 5. Summary ────────────────────────────────────────────────────────────────
tower_list = results.get("tower_list", [])
print(f"\n[Summary]")
print(f"  OpenCellID towers found: {len(tower_list)}")
if tower_list:
    nearest = tower_list[0]
    print(f"  Nearest tower: {nearest['carrier']} at {nearest['distance_miles']} miles")
    print(f"  Radio type: {nearest['radio']}")
else:
    print("  OpenCellID returned no data (free tier limitation or sparse coverage data)")
    print("  For SCIP: Use AntennaSearch.com for manual tower lookup")
    print("  AntennaSearch URL: https://www.antennasearch.com/sitestart.asp?lat=28.384348&lng=-80.792657&radius=1&unit=mile")

# Save
with open("/home/ubuntu/scip-output/golden_hour/tower_data.json", "w") as f:
    json.dump(results, f, indent=2, default=str)
print(f"\n✅ Saved")
