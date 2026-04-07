#!/usr/bin/env python3
"""
batch_scrape.py — Scrape telecom ordinances from Municode.

Uses the proven approach: directly navigate to municipality code pages,
search for telecom sections, scrape content, extract structured fields via AI,
and save to Supabase.

Usage: cd mcp-municode && python3 -m scripts.batch_scrape --count 50
"""

import asyncio
import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src import municode_scraper as scraper
from src import extractor
from src import supabase_client as db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("batch_scrape")

# Major US municipalities known to be on Municode, organized by state.
# These are cities/towns (not counties) that Municode actually hosts.
MUNICODE_CITIES = [
    # Alabama
    {"state": "AL", "name": "Birmingham"},
    {"state": "AL", "name": "Huntsville"},
    {"state": "AL", "name": "Mobile"},
    {"state": "AL", "name": "Montgomery"},
    {"state": "AL", "name": "Tuscaloosa"},
    {"state": "AL", "name": "Hoover"},
    {"state": "AL", "name": "Dothan"},
    {"state": "AL", "name": "Auburn"},
    {"state": "AL", "name": "Decatur"},
    {"state": "AL", "name": "Florence"},
    # Alaska
    {"state": "AK", "name": "Anchorage"},
    {"state": "AK", "name": "Fairbanks"},
    {"state": "AK", "name": "Juneau"},
    # Arizona
    {"state": "AZ", "name": "Phoenix"},
    {"state": "AZ", "name": "Tucson"},
    {"state": "AZ", "name": "Mesa"},
    {"state": "AZ", "name": "Chandler"},
    {"state": "AZ", "name": "Scottsdale"},
    {"state": "AZ", "name": "Glendale"},
    {"state": "AZ", "name": "Tempe"},
    {"state": "AZ", "name": "Gilbert"},
    {"state": "AZ", "name": "Peoria"},
    {"state": "AZ", "name": "Surprise"},
    # Arkansas
    {"state": "AR", "name": "Little Rock"},
    {"state": "AR", "name": "Fort Smith"},
    {"state": "AR", "name": "Fayetteville"},
    {"state": "AR", "name": "Springdale"},
    {"state": "AR", "name": "Jonesboro"},
    # California
    {"state": "CA", "name": "Los Angeles"},
    {"state": "CA", "name": "San Diego"},
    {"state": "CA", "name": "San Jose"},
    {"state": "CA", "name": "San Francisco"},
    {"state": "CA", "name": "Fresno"},
    {"state": "CA", "name": "Sacramento"},
    {"state": "CA", "name": "Long Beach"},
    {"state": "CA", "name": "Oakland"},
    {"state": "CA", "name": "Bakersfield"},
    {"state": "CA", "name": "Anaheim"},
    # Colorado
    {"state": "CO", "name": "Denver"},
    {"state": "CO", "name": "Colorado Springs"},
    {"state": "CO", "name": "Aurora"},
    {"state": "CO", "name": "Fort Collins"},
    {"state": "CO", "name": "Lakewood"},
    {"state": "CO", "name": "Boulder"},
    # Connecticut
    {"state": "CT", "name": "Bridgeport"},
    {"state": "CT", "name": "New Haven"},
    {"state": "CT", "name": "Hartford"},
    {"state": "CT", "name": "Stamford"},
    # Delaware
    {"state": "DE", "name": "Wilmington"},
    {"state": "DE", "name": "Dover"},
    {"state": "DE", "name": "Newark"},
    # Florida
    {"state": "FL", "name": "Jacksonville"},
    {"state": "FL", "name": "Miami"},
    {"state": "FL", "name": "Tampa"},
    {"state": "FL", "name": "Orlando"},
    {"state": "FL", "name": "St. Petersburg"},
    {"state": "FL", "name": "Hialeah"},
    {"state": "FL", "name": "Tallahassee"},
    {"state": "FL", "name": "Fort Lauderdale"},
    {"state": "FL", "name": "Port St. Lucie"},
    {"state": "FL", "name": "Cape Coral"},
    {"state": "FL", "name": "Pembroke Pines"},
    {"state": "FL", "name": "Hollywood"},
    {"state": "FL", "name": "Miramar"},
    {"state": "FL", "name": "Coral Springs"},
    {"state": "FL", "name": "Palm Bay"},
    {"state": "FL", "name": "Clearwater"},
    {"state": "FL", "name": "Lakeland"},
    {"state": "FL", "name": "Pompano Beach"},
    {"state": "FL", "name": "Davie"},
    {"state": "FL", "name": "Boca Raton"},
    # Georgia
    {"state": "GA", "name": "Atlanta"},
    {"state": "GA", "name": "Augusta"},
    {"state": "GA", "name": "Columbus"},
    {"state": "GA", "name": "Savannah"},
    {"state": "GA", "name": "Athens"},
    {"state": "GA", "name": "Macon"},
    {"state": "GA", "name": "Roswell"},
    {"state": "GA", "name": "Albany"},
    # Hawaii
    {"state": "HI", "name": "Honolulu"},
    # Idaho
    {"state": "ID", "name": "Boise"},
    {"state": "ID", "name": "Meridian"},
    {"state": "ID", "name": "Nampa"},
    # Illinois
    {"state": "IL", "name": "Chicago"},
    {"state": "IL", "name": "Aurora"},
    {"state": "IL", "name": "Rockford"},
    {"state": "IL", "name": "Joliet"},
    {"state": "IL", "name": "Naperville"},
    {"state": "IL", "name": "Springfield"},
    {"state": "IL", "name": "Peoria"},
    {"state": "IL", "name": "Elgin"},
    # Indiana
    {"state": "IN", "name": "Indianapolis"},
    {"state": "IN", "name": "Fort Wayne"},
    {"state": "IN", "name": "Evansville"},
    {"state": "IN", "name": "South Bend"},
    {"state": "IN", "name": "Carmel"},
    # Iowa
    {"state": "IA", "name": "Des Moines"},
    {"state": "IA", "name": "Cedar Rapids"},
    {"state": "IA", "name": "Davenport"},
    # Kansas
    {"state": "KS", "name": "Wichita"},
    {"state": "KS", "name": "Overland Park"},
    {"state": "KS", "name": "Kansas City"},
    {"state": "KS", "name": "Olathe"},
    {"state": "KS", "name": "Topeka"},
    # Kentucky
    {"state": "KY", "name": "Louisville"},
    {"state": "KY", "name": "Lexington"},
    {"state": "KY", "name": "Bowling Green"},
    # Louisiana
    {"state": "LA", "name": "New Orleans"},
    {"state": "LA", "name": "Baton Rouge"},
    {"state": "LA", "name": "Shreveport"},
    {"state": "LA", "name": "Lafayette"},
    # Maine
    {"state": "ME", "name": "Portland"},
    # Maryland
    {"state": "MD", "name": "Baltimore"},
    {"state": "MD", "name": "Frederick"},
    {"state": "MD", "name": "Rockville"},
    {"state": "MD", "name": "Gaithersburg"},
    # Massachusetts
    {"state": "MA", "name": "Boston"},
    {"state": "MA", "name": "Worcester"},
    {"state": "MA", "name": "Springfield"},
    {"state": "MA", "name": "Cambridge"},
    # Michigan
    {"state": "MI", "name": "Detroit"},
    {"state": "MI", "name": "Grand Rapids"},
    {"state": "MI", "name": "Warren"},
    {"state": "MI", "name": "Sterling Heights"},
    {"state": "MI", "name": "Ann Arbor"},
    {"state": "MI", "name": "Lansing"},
    # Minnesota
    {"state": "MN", "name": "Minneapolis"},
    {"state": "MN", "name": "St. Paul"},
    {"state": "MN", "name": "Rochester"},
    {"state": "MN", "name": "Duluth"},
    # Mississippi
    {"state": "MS", "name": "Jackson"},
    {"state": "MS", "name": "Gulfport"},
    {"state": "MS", "name": "Hattiesburg"},
    # Missouri
    {"state": "MO", "name": "Kansas City"},
    {"state": "MO", "name": "St. Louis"},
    {"state": "MO", "name": "Springfield"},
    {"state": "MO", "name": "Columbia"},
    # Montana
    {"state": "MT", "name": "Billings"},
    {"state": "MT", "name": "Missoula"},
    # Nebraska
    {"state": "NE", "name": "Omaha"},
    {"state": "NE", "name": "Lincoln"},
    # Nevada
    {"state": "NV", "name": "Las Vegas"},
    {"state": "NV", "name": "Henderson"},
    {"state": "NV", "name": "Reno"},
    {"state": "NV", "name": "North Las Vegas"},
    # New Hampshire
    {"state": "NH", "name": "Manchester"},
    {"state": "NH", "name": "Nashua"},
    # New Jersey
    {"state": "NJ", "name": "Newark"},
    {"state": "NJ", "name": "Jersey City"},
    {"state": "NJ", "name": "Paterson"},
    {"state": "NJ", "name": "Elizabeth"},
    # New Mexico
    {"state": "NM", "name": "Albuquerque"},
    {"state": "NM", "name": "Las Cruces"},
    {"state": "NM", "name": "Santa Fe"},
    # New York
    {"state": "NY", "name": "New York"},
    {"state": "NY", "name": "Buffalo"},
    {"state": "NY", "name": "Rochester"},
    {"state": "NY", "name": "Yonkers"},
    {"state": "NY", "name": "Syracuse"},
    # North Carolina
    {"state": "NC", "name": "Charlotte"},
    {"state": "NC", "name": "Raleigh"},
    {"state": "NC", "name": "Greensboro"},
    {"state": "NC", "name": "Durham"},
    {"state": "NC", "name": "Winston-Salem"},
    {"state": "NC", "name": "Fayetteville"},
    {"state": "NC", "name": "Cary"},
    {"state": "NC", "name": "Wilmington"},
    # North Dakota
    {"state": "ND", "name": "Fargo"},
    {"state": "ND", "name": "Bismarck"},
    # Ohio
    {"state": "OH", "name": "Columbus"},
    {"state": "OH", "name": "Cleveland"},
    {"state": "OH", "name": "Cincinnati"},
    {"state": "OH", "name": "Toledo"},
    {"state": "OH", "name": "Akron"},
    {"state": "OH", "name": "Dayton"},
    # Oklahoma
    {"state": "OK", "name": "Oklahoma City"},
    {"state": "OK", "name": "Tulsa"},
    {"state": "OK", "name": "Norman"},
    {"state": "OK", "name": "Broken Arrow"},
    # Oregon
    {"state": "OR", "name": "Portland"},
    {"state": "OR", "name": "Salem"},
    {"state": "OR", "name": "Eugene"},
    {"state": "OR", "name": "Gresham"},
    # Pennsylvania
    {"state": "PA", "name": "Philadelphia"},
    {"state": "PA", "name": "Pittsburgh"},
    {"state": "PA", "name": "Allentown"},
    {"state": "PA", "name": "Erie"},
    # Rhode Island
    {"state": "RI", "name": "Providence"},
    # South Carolina
    {"state": "SC", "name": "Columbia"},
    {"state": "SC", "name": "Charleston"},
    {"state": "SC", "name": "North Charleston"},
    {"state": "SC", "name": "Mount Pleasant"},
    {"state": "SC", "name": "Greenville"},
    # South Dakota
    {"state": "SD", "name": "Sioux Falls"},
    {"state": "SD", "name": "Rapid City"},
    # Tennessee
    {"state": "TN", "name": "Nashville"},
    {"state": "TN", "name": "Memphis"},
    {"state": "TN", "name": "Knoxville"},
    {"state": "TN", "name": "Chattanooga"},
    {"state": "TN", "name": "Clarksville"},
    # Texas
    {"state": "TX", "name": "Houston"},
    {"state": "TX", "name": "San Antonio"},
    {"state": "TX", "name": "Dallas"},
    {"state": "TX", "name": "Austin"},
    {"state": "TX", "name": "Fort Worth"},
    {"state": "TX", "name": "El Paso"},
    {"state": "TX", "name": "Arlington"},
    {"state": "TX", "name": "Corpus Christi"},
    {"state": "TX", "name": "Plano"},
    {"state": "TX", "name": "Lubbock"},
    {"state": "TX", "name": "Irving"},
    {"state": "TX", "name": "Laredo"},
    {"state": "TX", "name": "Garland"},
    {"state": "TX", "name": "Frisco"},
    {"state": "TX", "name": "McKinney"},
    # Utah
    {"state": "UT", "name": "Salt Lake City"},
    {"state": "UT", "name": "West Valley City"},
    {"state": "UT", "name": "Provo"},
    # Vermont
    {"state": "VT", "name": "Burlington"},
    # Virginia
    {"state": "VA", "name": "Virginia Beach"},
    {"state": "VA", "name": "Norfolk"},
    {"state": "VA", "name": "Chesapeake"},
    {"state": "VA", "name": "Richmond"},
    {"state": "VA", "name": "Newport News"},
    {"state": "VA", "name": "Alexandria"},
    {"state": "VA", "name": "Hampton"},
    # Washington
    {"state": "WA", "name": "Seattle"},
    {"state": "WA", "name": "Spokane"},
    {"state": "WA", "name": "Tacoma"},
    {"state": "WA", "name": "Vancouver"},
    {"state": "WA", "name": "Bellevue"},
    # West Virginia
    {"state": "WV", "name": "Charleston"},
    {"state": "WV", "name": "Huntington"},
    # Wisconsin
    {"state": "WI", "name": "Milwaukee"},
    {"state": "WI", "name": "Madison"},
    {"state": "WI", "name": "Green Bay"},
    # Wyoming
    {"state": "WY", "name": "Cheyenne"},
    {"state": "WY", "name": "Casper"},
]


async def process_one(jur: dict, index: int, total: int) -> dict:
    """Scrape + extract + save one jurisdiction."""
    state = jur["state"]
    name = jur["name"]

    logger.info(f"\n[{index+1}/{total}] {name}, {state}")

    result = {
        "jurisdiction": name, "state": state, "status": "pending",
        "municode_url": None, "sections_found": 0, "text_length": 0,
        "extracted": {}, "error": None,
    }

    try:
        # Scrape
        scrape_data = await scraper.scrape_jurisdiction_telecom(state, name)
        result["municode_url"] = scrape_data.get("municode_url")
        result["sections_found"] = len(scrape_data.get("telecom_sections", []))
        result["text_length"] = len(scrape_data.get("full_text", ""))

        if scrape_data.get("error") and not scrape_data.get("full_text"):
            result["status"] = "not_found"
            result["error"] = scrape_data["error"]
            return result

        if result["text_length"] < 200:
            result["status"] = "not_found"
            result["error"] = "Text too short"
            return result

        # Extract
        logger.info(f"  Extracting fields from {result['text_length']} chars...")
        extracted = await extractor.extract_ordinance_fields(
            scrape_data["full_text"], name, state
        )
        result["extracted"] = extracted

        if extracted.get("error"):
            result["status"] = "extraction_error"
            result["error"] = extracted["error"]
            return result

        # Build section info
        section_names = [
            s.get("name", "") for s in scrape_data.get("telecom_sections", [])
        ]
        section_refs = scrape_data.get("section_refs", [])

        # Save to Supabase
        record = {
            "state": state,
            "jurisdiction": name,
            "record_name": f"IN-{name}-Telecom Ord",
            "source_url": scrape_data.get("municode_url", ""),
            "section_ref": " | ".join(list(set(section_refs))[:5]) if section_refs else "",
            "section_title": " | ".join(section_names),
            "ordinance_text": scrape_data["full_text"][:100000],
            "height_limit_ft": extracted.get("height_limit_ft"),
            "setback_ft": extracted.get("setback_ft"),
            "fall_zone_ft": extracted.get("fall_zone_ft"),
            "permit_type": extracted.get("permit_type"),
            "allowable_zones": (
                extracted.get("allowable_zones")
                or extracted.get("zoning_classifications")
            ),
            "collocation_required": extracted.get("collocation_required"),
            "stealth_required": extracted.get("stealth_required"),
        }

        saved = await db.upsert_telecom_ordinance(record)
        result["status"] = "success"
        logger.info(f"  ✓ Saved to Supabase")

    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)
        logger.error(f"  ✗ Failed: {e}")

    return result


async def run_batch(count: int = 50, state_filter: str = None):
    """Run a batch scrape of municipalities."""
    logger.info(f"BATCH SCRAPE — Target: {count} jurisdictions")

    # Filter by state if specified
    if state_filter:
        cities = [c for c in MUNICODE_CITIES if c["state"] == state_filter.upper()]
    else:
        cities = MUNICODE_CITIES

    # Check which ones we already have in Supabase
    existing = set()
    for state in set(c["state"] for c in cities):
        records = await db.get_telecom_ordinances(state=state, limit=500)
        for r in records:
            existing.add((r.get("state", ""), r.get("jurisdiction", "").lower()))

    # Filter out already-scraped
    to_scrape = [
        c for c in cities
        if (c["state"], c["name"].lower()) not in existing
    ]

    logger.info(f"Total available: {len(cities)} | Already scraped: {len(existing)} | New: {len(to_scrape)}")
    to_scrape = to_scrape[:count]
    logger.info(f"Scraping {len(to_scrape)} jurisdictions")

    results = []
    for i, jur in enumerate(to_scrape):
        r = await process_one(jur, i, len(to_scrape))
        results.append(r)

        icon = "✓" if "success" in r["status"] else "✗"
        permit = r.get("extracted", {}).get("permit_type", "N/A")
        height = r.get("extracted", {}).get("height_limit_ft", "N/A")
        logger.info(
            f"  {icon} {r['jurisdiction']}, {r['state']} — "
            f"Permit: {permit} | Height: {height}ft | Status: {r['status']}"
        )

        if i < len(to_scrape) - 1:
            await asyncio.sleep(5)

    # Summary
    success = sum(1 for r in results if "success" in r["status"])
    not_found = sum(1 for r in results if r["status"] == "not_found")
    errors = sum(1 for r in results if r["status"] in ("error", "extraction_error"))
    logger.info(f"\n{'='*60}")
    logger.info(f"BATCH COMPLETE: Success={success} | Not Found={not_found} | Errors={errors}")
    logger.info(f"{'='*60}")

    for r in results:
        if "success" in r["status"]:
            permit = r.get("extracted", {}).get("permit_type", "N/A")
            logger.info(f"  ✓ {r['jurisdiction']}, {r['state']} — {permit}")

    # Save results
    out_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "tests", f"batch_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    )
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    logger.info(f"Results saved to: {out_path}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=50)
    parser.add_argument("--state", type=str, default=None)
    args = parser.parse_args()
    asyncio.run(run_batch(args.count, args.state))
