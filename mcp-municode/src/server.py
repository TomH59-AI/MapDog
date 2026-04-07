"""
server.py
---------
MCP Server for Municode Telecom Ordinance Scraping.

Tools exposed:
  1. list_states          — List all U.S. states with scrape progress
  2. list_jurisdictions   — List jurisdictions for a state
  3. scrape_jurisdiction  — Scrape telecom ordinance for one jurisdiction
  4. scrape_state_batch   — Batch-scrape all pending jurisdictions in a state
  5. extract_fields       — AI-extract structured fields from ordinance text
  6. search_ordinances    — Search existing scraped ordinances
  7. get_scrape_stats     — Dashboard of scraping progress
  8. get_ordinance        — Get full ordinance record for a jurisdiction
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Optional

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    TextContent,
    Tool,
)

from . import supabase_client as db
from . import municode_scraper as scraper
from . import extractor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("mcp-municode")

app = Server("mcp-municode")

# ── Tool Definitions ─────────────────────────────────────────

TOOLS = [
    Tool(
        name="list_states",
        description=(
            "List all U.S. states available in the national_jurisdictions table "
            "with their abbreviations. Use this to see which states are available "
            "for scraping."
        ),
        inputSchema={
            "type": "object",
            "properties": {},
            "required": [],
        },
    ),
    Tool(
        name="list_jurisdictions",
        description=(
            "List jurisdictions (counties/cities) for a given state. "
            "Filter by scrape_status: 'pending', 'scraped', 'not_found', 'error'. "
            "Returns jurisdiction ID, name, type, scrape status, and Municode URL."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "state_abbr": {
                    "type": "string",
                    "description": "Two-letter state abbreviation (e.g., 'FL', 'TX')",
                },
                "scrape_status": {
                    "type": "string",
                    "description": "Filter by status: 'pending', 'in_progress', 'complete', 'failed', 'queued'",
                    "enum": ["pending", "in_progress", "complete", "failed", "queued"],
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results to return (default 100)",
                    "default": 100,
                },
                "offset": {
                    "type": "integer",
                    "description": "Pagination offset (default 0)",
                    "default": 0,
                },
            },
            "required": ["state_abbr"],
        },
    ),
    Tool(
        name="scrape_jurisdiction",
        description=(
            "Scrape the Municode Library for a single jurisdiction's "
            "telecommunications ordinance. Finds the municipality on Municode, "
            "locates telecom/tower/antenna sections, scrapes the content, "
            "uses AI to extract structured fields (setbacks, height limits, "
            "permit type, fall zone, zoning classifications, public hearing "
            "requirement, contact info), and saves to Supabase. "
            "Rate-limited to be respectful of Municode servers."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "state_abbr": {
                    "type": "string",
                    "description": "Two-letter state abbreviation",
                },
                "jurisdiction_name": {
                    "type": "string",
                    "description": "Name of the municipality/county (e.g., 'Miami', 'Alachua County')",
                },
                "jurisdiction_id": {
                    "type": "integer",
                    "description": "Optional: national_jurisdictions ID for status tracking",
                },
                "municode_url": {
                    "type": "string",
                    "description": "Optional: direct Municode URL if already known",
                },
            },
            "required": ["state_abbr", "jurisdiction_name"],
        },
    ),
    Tool(
        name="scrape_state_batch",
        description=(
            "Batch-scrape all pending jurisdictions in a state. "
            "Processes them one at a time with delays between requests. "
            "Set max_count to limit how many to process in one batch. "
            "This is the 'slowly but surely' approach — safe for long runs."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "state_abbr": {
                    "type": "string",
                    "description": "Two-letter state abbreviation",
                },
                "max_count": {
                    "type": "integer",
                    "description": "Max jurisdictions to scrape in this batch (default 10)",
                    "default": 10,
                },
                "delay_seconds": {
                    "type": "integer",
                    "description": "Delay between jurisdictions in seconds (default 5)",
                    "default": 5,
                },
            },
            "required": ["state_abbr"],
        },
    ),
    Tool(
        name="extract_fields",
        description=(
            "AI-extract structured fields from raw ordinance text. "
            "Extracts: setbacks, height restrictions, permit type, fall zone, "
            "zoning classifications, public hearing required, contact info, "
            "collocation/stealth requirements, and generates a summary. "
            "Use this to re-process existing ordinance text with the AI extractor."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "ordinance_text": {
                    "type": "string",
                    "description": "Raw ordinance text to extract fields from",
                },
                "jurisdiction": {
                    "type": "string",
                    "description": "Jurisdiction name",
                },
                "state": {
                    "type": "string",
                    "description": "State abbreviation",
                },
                "model": {
                    "type": "string",
                    "description": "LLM model to use (default: gpt-4.1-mini)",
                    "default": "gpt-4.1-mini",
                },
            },
            "required": ["ordinance_text", "jurisdiction", "state"],
        },
    ),
    Tool(
        name="search_ordinances",
        description=(
            "Search existing scraped telecom ordinances in Supabase. "
            "Filter by state and/or jurisdiction name. Returns structured "
            "ordinance data including setbacks, height limits, permit type, etc."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "state": {
                    "type": "string",
                    "description": "State abbreviation to filter by",
                },
                "jurisdiction": {
                    "type": "string",
                    "description": "Jurisdiction name to filter by",
                },
                "limit": {
                    "type": "integer",
                    "description": "Max results (default 50)",
                    "default": 50,
                },
                "offset": {
                    "type": "integer",
                    "description": "Pagination offset (default 0)",
                    "default": 0,
                },
            },
            "required": [],
        },
    ),
    Tool(
        name="get_scrape_stats",
        description=(
            "Get a dashboard of scraping progress across all states. "
            "Shows total jurisdictions, how many are scraped, pending, "
            "not found, and errored."
        ),
        inputSchema={
            "type": "object",
            "properties": {},
            "required": [],
        },
    ),
    Tool(
        name="get_ordinance",
        description=(
            "Get the full telecom ordinance record for a specific jurisdiction. "
            "Returns all fields including setbacks, height limits, permit type, "
            "fall zone, zoning classifications, public hearing requirement, "
            "contact info, and the full ordinance text."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "state": {
                    "type": "string",
                    "description": "State abbreviation",
                },
                "jurisdiction": {
                    "type": "string",
                    "description": "Jurisdiction name",
                },
            },
            "required": ["state", "jurisdiction"],
        },
    ),
]


@app.list_tools()
async def list_tools() -> list[Tool]:
    return TOOLS


# ── Tool Handlers ────────────────────────────────────────────

@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:
        if name == "list_states":
            return await _handle_list_states()
        elif name == "list_jurisdictions":
            return await _handle_list_jurisdictions(arguments)
        elif name == "scrape_jurisdiction":
            return await _handle_scrape_jurisdiction(arguments)
        elif name == "scrape_state_batch":
            return await _handle_scrape_state_batch(arguments)
        elif name == "extract_fields":
            return await _handle_extract_fields(arguments)
        elif name == "search_ordinances":
            return await _handle_search_ordinances(arguments)
        elif name == "get_scrape_stats":
            return await _handle_get_scrape_stats()
        elif name == "get_ordinance":
            return await _handle_get_ordinance(arguments)
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
    except Exception as e:
        logger.error(f"Tool {name} failed: {e}", exc_info=True)
        return [TextContent(type="text", text=f"Error in {name}: {str(e)}")]


async def _handle_list_states() -> list[TextContent]:
    states = await db.list_states()
    return [TextContent(
        type="text",
        text=json.dumps(states, indent=2),
    )]


async def _handle_list_jurisdictions(args: dict) -> list[TextContent]:
    jurisdictions = await db.list_jurisdictions(
        state_abbr=args["state_abbr"],
        scrape_status=args.get("scrape_status"),
        limit=args.get("limit", 100),
        offset=args.get("offset", 0),
    )
    return [TextContent(
        type="text",
        text=json.dumps(jurisdictions, indent=2, default=str),
    )]


async def _handle_scrape_jurisdiction(args: dict) -> list[TextContent]:
    state = args["state_abbr"].upper()
    name = args["jurisdiction_name"]
    jid = args.get("jurisdiction_id")
    direct_url = args.get("municode_url")

    # Update status to in-progress
    if jid:
        await db.update_jurisdiction(jid, {"scrape_status": "in_progress"})

    # Scrape
    if direct_url:
        # Scrape the provided URL directly
        page_data = await scraper.scrape_ordinance_page(direct_url)
        scrape_result = {
            "municipality": name,
            "state": state,
            "municode_url": direct_url,
            "full_text": page_data.get("full_text", ""),
            "telecom_sections": [{"name": page_data.get("title", ""), "url": direct_url}],
            "error": page_data.get("error"),
        }
    else:
        scrape_result = await scraper.scrape_jurisdiction_telecom(state, name)

    if scrape_result.get("error") and not scrape_result.get("full_text"):
        # Update jurisdiction status
        if jid:
            await db.update_jurisdiction(jid, {
                "scrape_status": "failed",
                "notes": scrape_result["error"],
            })
        return [TextContent(
            type="text",
            text=json.dumps({
                "status": "error",
                "jurisdiction": name,
                "state": state,
                "error": scrape_result["error"],
            }, indent=2),
        )]

    # Extract structured fields using AI
    extracted = await extractor.extract_ordinance_fields(
        scrape_result["full_text"], name, state
    )

    # Build the record for Supabase
    record = {
        "state": state,
        "jurisdiction": name,
        "record_name": f"IN-{name}-Telecom Ord",
        "source_url": scrape_result.get("municode_url", ""),
        "section_ref": extracted.get("section_ref", ""),
        "section_title": ", ".join(
            s.get("name", "") for s in scrape_result.get("telecom_sections", [])
        ),
        "ordinance_text": scrape_result["full_text"][:100000],  # Limit size
        "height_limit_ft": extracted.get("height_limit_ft"),
        "setback_ft": extracted.get("setback_ft"),
        "fall_zone_ft": extracted.get("fall_zone_ft"),
        "permit_type": extracted.get("permit_type"),
        "allowable_zones": extracted.get("allowable_zones") or extracted.get("zoning_classifications"),
        "collocation_required": extracted.get("collocation_required"),
        "stealth_required": extracted.get("stealth_required"),
    }

    # Add new columns (will work after migration is run)
    new_fields = {
        "public_hearing_required": extracted.get("public_hearing_required"),
        "zoning_classifications": extracted.get("zoning_classifications"),
        "contact_name": extracted.get("contact_name"),
        "contact_phone": extracted.get("contact_phone"),
        "contact_email": extracted.get("contact_email"),
        "contact_department": extracted.get("contact_department"),
        "setback_details": extracted.get("setback_details"),
        "height_details": extracted.get("height_details"),
        "fall_zone_details": extracted.get("fall_zone_details"),
        "permit_details": extracted.get("permit_details"),
        "summary": extracted.get("summary"),
        "keywords": extracted.get("keywords"),
    }

    # Try to include new fields; if they fail (columns don't exist yet), skip them
    try:
        full_record = {**record, **new_fields}
        saved = await db.upsert_telecom_ordinance(full_record)
    except Exception as e:
        if "column" in str(e).lower() and "does not exist" in str(e).lower():
            logger.warning("New columns not yet added — saving without them. Run migration.sql first.")
            saved = await db.upsert_telecom_ordinance(record)
        else:
            raise

    # Update jurisdiction tracking
    if jid:
        await db.update_jurisdiction(jid, {
            "scrape_status": "complete",
            "scrape_platform": "municode",
            "municode_url": scrape_result.get("municode_url"),
            "telecom_section": record.get("section_title"),
            "last_scraped": datetime.now(timezone.utc).isoformat(),
        })

    # Return a clean summary
    output = {
        "status": "success",
        "jurisdiction": name,
        "state": state,
        "municode_url": scrape_result.get("municode_url"),
        "sections_found": len(scrape_result.get("telecom_sections", [])),
        "text_length": len(scrape_result.get("full_text", "")),
        "extracted_fields": {
            "height_limit_ft": extracted.get("height_limit_ft"),
            "setback_ft": extracted.get("setback_ft"),
            "fall_zone_ft": extracted.get("fall_zone_ft"),
            "permit_type": extracted.get("permit_type"),
            "public_hearing_required": extracted.get("public_hearing_required"),
            "zoning_classifications": extracted.get("zoning_classifications"),
            "collocation_required": extracted.get("collocation_required"),
            "stealth_required": extracted.get("stealth_required"),
            "contact_department": extracted.get("contact_department"),
        },
        "summary": extracted.get("summary", ""),
    }

    return [TextContent(type="text", text=json.dumps(output, indent=2, default=str))]


async def _handle_scrape_state_batch(args: dict) -> list[TextContent]:
    state = args["state_abbr"].upper()
    max_count = args.get("max_count", 10)
    delay = args.get("delay_seconds", 5)

    # Get pending jurisdictions
    pending = await db.list_jurisdictions(state, scrape_status="pending", limit=max_count)

    if not pending:
        return [TextContent(
            type="text",
            text=json.dumps({
                "status": "complete",
                "state": state,
                "message": f"No pending jurisdictions for {state}",
            }, indent=2),
        )]

    results = []
    for i, jur in enumerate(pending):
        jid = jur.get("id")
        name = jur.get("county_name") or jur.get("full_name", "")

        logger.info(f"Batch [{i+1}/{len(pending)}] Scraping {name}, {state}...")

        try:
            result = await call_tool("scrape_jurisdiction", {
                "state_abbr": state,
                "jurisdiction_name": name,
                "jurisdiction_id": jid,
                "municode_url": jur.get("municode_url"),
            })
            result_data = json.loads(result[0].text)
            results.append({
                "jurisdiction": name,
                "status": result_data.get("status", "unknown"),
                "permit_type": result_data.get("extracted_fields", {}).get("permit_type"),
            })
        except Exception as e:
            results.append({
                "jurisdiction": name,
                "status": "error",
                "error": str(e),
            })

        # Delay between jurisdictions
        if i < len(pending) - 1:
            await asyncio.sleep(delay)

    summary = {
        "state": state,
        "processed": len(results),
        "successful": sum(1 for r in results if r["status"] == "success"),
        "errors": sum(1 for r in results if r["status"] in ("error", "not_found")),
        "results": results,
    }

    return [TextContent(type="text", text=json.dumps(summary, indent=2, default=str))]


async def _handle_extract_fields(args: dict) -> list[TextContent]:
    extracted = await extractor.extract_ordinance_fields(
        ordinance_text=args["ordinance_text"],
        jurisdiction=args["jurisdiction"],
        state=args["state"],
        model=args.get("model", "gpt-4.1-mini"),
    )
    return [TextContent(type="text", text=json.dumps(extracted, indent=2, default=str))]


async def _handle_search_ordinances(args: dict) -> list[TextContent]:
    ordinances = await db.get_telecom_ordinances(
        state=args.get("state"),
        jurisdiction=args.get("jurisdiction"),
        limit=args.get("limit", 50),
        offset=args.get("offset", 0),
    )
    # Return a cleaner view (exclude full_text for readability)
    clean = []
    for o in ordinances:
        clean.append({
            k: v for k, v in o.items()
            if k not in ("ordinance_text", "search_vector", "raw_data")
        })
    return [TextContent(type="text", text=json.dumps(clean, indent=2, default=str))]


async def _handle_get_scrape_stats() -> list[TextContent]:
    stats = await db.get_scrape_stats()
    return [TextContent(type="text", text=json.dumps(stats, indent=2))]


async def _handle_get_ordinance(args: dict) -> list[TextContent]:
    ordinances = await db.get_telecom_ordinances(
        state=args.get("state"),
        jurisdiction=args.get("jurisdiction"),
        limit=1,
    )
    if not ordinances:
        return [TextContent(
            type="text",
            text=json.dumps({"error": "No ordinance found for this jurisdiction"}, indent=2),
        )]
    return [TextContent(type="text", text=json.dumps(ordinances[0], indent=2, default=str))]


# ── Entry Point ──────────────────────────────────────────────

def main():
    """Run the MCP server via stdio."""
    import asyncio

    async def _run():
        async with stdio_server() as (read_stream, write_stream):
            await app.run(read_stream, write_stream, app.create_initialization_options())

    asyncio.run(_run())


if __name__ == "__main__":
    main()
