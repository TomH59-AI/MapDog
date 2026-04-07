#!/usr/bin/env python3
"""
test_pipeline.py — Test 10 jurisdictions end-to-end.
Usage: cd mcp-municode && python3 -m tests.test_pipeline
"""

import asyncio
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
logger = logging.getLogger("test_pipeline")

# 10 jurisdictions across multiple states
TEST_JURISDICTIONS = [
    {"state": "FL", "name": "Cocoa"},
    {"state": "FL", "name": "Gainesville"},
    {"state": "GA", "name": "Atlanta"},
    {"state": "TX", "name": "Austin"},
    {"state": "NC", "name": "Charlotte"},
    {"state": "TN", "name": "Nashville-Davidson County"},
    {"state": "AL", "name": "Birmingham"},
    {"state": "OH", "name": "Columbus"},
    {"state": "MI", "name": "Detroit"},
    {"state": "PA", "name": "Pittsburgh"},
]


async def process_one(jur: dict, index: int, total: int) -> dict:
    """Scrape + extract + save one jurisdiction."""
    state = jur["state"]
    name = jur["name"]

    logger.info(f"\n{'='*60}")
    logger.info(f"[{index+1}/{total}] {name}, {state}")
    logger.info(f"{'='*60}")

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

        # Build section title from scraped sections
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

        # New columns (may not exist yet)
        new_fields = {
            "public_hearing_required": extracted.get("public_hearing_required"),
            "zoning_classifications": extracted.get("zoning_classifications"),
            "contact_name": extracted.get("contact_name"),
            "contact_phone": extracted.get("contact_phone"),
            "contact_email": extracted.get("contact_email"),
            "contact_department": extracted.get("contact_department"),
            "setback_details": (
                extracted.get("setback_details")
                if isinstance(extracted.get("setback_details"), dict) else None
            ),
            "height_details": (
                extracted.get("height_details")
                if isinstance(extracted.get("height_details"), dict) else None
            ),
            "fall_zone_details": extracted.get("fall_zone_details"),
            "permit_details": (
                extracted.get("permit_details")
                if isinstance(extracted.get("permit_details"), dict) else None
            ),
            "summary": extracted.get("summary"),
            "keywords": (
                extracted.get("keywords")
                if isinstance(extracted.get("keywords"), list) else None
            ),
        }

        # Store the extracted new fields in raw_data JSON for now
        # (new columns need migration.sql to be run first)
        # Save core fields that exist in the table
        try:
            saved = await db.upsert_telecom_ordinance(record)
            result["status"] = "success"
            logger.info(f"  ✓ Saved to Supabase")

            # Try to update with new fields separately
            try:
                saved_id = saved.get("id")
                if saved_id:
                    await db.update_telecom_ordinance(saved_id, new_fields)
                    result["status"] = "success"
                    logger.info(f"  ✓ Updated with extended fields")
            except Exception as e2:
                if "does not exist" in str(e2).lower():
                    logger.info(f"  ℹ New columns not yet added — run migration.sql")
                    result["status"] = "success_partial"
                else:
                    logger.warning(f"  Extended fields update failed: {e2}")
                    result["status"] = "success_partial"
        except Exception as e:
            raise

    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)
        logger.error(f"  ✗ Failed: {e}")

    return result


async def run_test():
    total = len(TEST_JURISDICTIONS)
    logger.info(f"MUNICODE MCP TEST — {total} Jurisdictions")

    results = []
    for i, jur in enumerate(TEST_JURISDICTIONS):
        r = await process_one(jur, i, total)
        results.append(r)

        # Summary line
        icon = "✓" if "success" in r["status"] else "✗"
        permit = r.get("extracted", {}).get("permit_type", "N/A")
        height = r.get("extracted", {}).get("height_limit_ft", "N/A")
        hearing = r.get("extracted", {}).get("public_hearing_required", "N/A")
        logger.info(
            f"  {icon} {r['jurisdiction']}, {r['state']} — "
            f"Permit: {permit} | Height: {height}ft | "
            f"Hearing: {hearing} | Status: {r['status']}"
        )

        if i < total - 1:
            await asyncio.sleep(5)

    # Final summary
    logger.info(f"\n{'='*60}")
    logger.info("RESULTS SUMMARY")
    logger.info(f"{'='*60}")
    success = sum(1 for r in results if "success" in r["status"])
    not_found = sum(1 for r in results if r["status"] == "not_found")
    errors = sum(1 for r in results if r["status"] in ("error", "extraction_error"))
    logger.info(f"Success: {success} | Not Found: {not_found} | Errors: {errors}")

    for r in results:
        icon = "✓" if "success" in r["status"] else "✗"
        logger.info(f"  {icon} {r['jurisdiction']}, {r['state']}: {r['status']}")

    # Save results
    out_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "test_results.json"
    )
    clean = []
    for r in results:
        c = {k: v for k, v in r.items() if k != "extracted"}
        c["extracted_summary"] = {
            "height_limit_ft": r.get("extracted", {}).get("height_limit_ft"),
            "setback_ft": r.get("extracted", {}).get("setback_ft"),
            "fall_zone_ft": r.get("extracted", {}).get("fall_zone_ft"),
            "permit_type": r.get("extracted", {}).get("permit_type"),
            "public_hearing_required": r.get("extracted", {}).get("public_hearing_required"),
            "zoning_classifications": r.get("extracted", {}).get("zoning_classifications"),
            "collocation_required": r.get("extracted", {}).get("collocation_required"),
            "stealth_required": r.get("extracted", {}).get("stealth_required"),
            "contact_department": r.get("extracted", {}).get("contact_department"),
            "summary": r.get("extracted", {}).get("summary"),
        }
        clean.append(c)
    with open(out_path, "w") as f:
        json.dump(clean, f, indent=2, default=str)
    logger.info(f"Results saved to: {out_path}")

    return results


if __name__ == "__main__":
    asyncio.run(run_test())
