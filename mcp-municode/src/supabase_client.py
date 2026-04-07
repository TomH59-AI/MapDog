"""
supabase_client.py
------------------
Supabase client for reading/writing telecom ordinance data.
Works with the existing telecom_ordinances and national_jurisdictions tables.
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger("mcp-municode.supabase")

SUPABASE_URL = os.environ.get(
    "SUPABASE_URL", "https://skpxeouvikzgsaurkohf.supabase.co"
)
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# Columns that are known to exist in the telecom_ordinances table
CORE_COLUMNS = {
    "state", "jurisdiction", "record_name", "source_url",
    "section_ref", "section_title", "ordinance_text",
    "height_limit_ft", "setback_ft", "fall_zone_ft",
    "permit_type", "allowable_zones",
    "collocation_required", "stealth_required",
    "scraped_at", "updated_at",
}

# Columns that require migration.sql to be run
EXTENDED_COLUMNS = {
    "public_hearing_required", "zoning_classifications",
    "contact_name", "contact_phone", "contact_email", "contact_department",
    "setback_details", "height_details", "fall_zone_details",
    "permit_details", "summary", "keywords",
    "section_ref",  # also in core but listed for completeness
}


def _headers() -> dict:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _clean_record(record: dict, allowed_columns: set) -> dict:
    """Remove keys not in allowed_columns and None values."""
    clean = {}
    for k, v in record.items():
        if k not in allowed_columns:
            continue
        if v is None:
            continue
        # Coerce types for Supabase
        if k in ("height_limit_ft", "setback_ft", "fall_zone_ft"):
            if isinstance(v, str):
                # Handle "None", "N/A", etc. from LLM
                if v.lower() in ("none", "n/a", "null", ""):
                    continue
                try:
                    v = float(v)
                except (ValueError, TypeError):
                    continue
            if not isinstance(v, (int, float)):
                continue
        if k in ("collocation_required", "stealth_required", "public_hearing_required"):
            if not isinstance(v, bool):
                v = bool(v)
        if k in ("setback_details", "height_details", "permit_details"):
            if isinstance(v, dict):
                v = json.dumps(v)
            elif not isinstance(v, str):
                continue
        if k == "keywords":
            if isinstance(v, list):
                pass  # Supabase array is fine
            elif isinstance(v, str):
                v = [v]
            else:
                continue
        # Truncate permit_type to reasonable length
        if k == "permit_type" and isinstance(v, str) and len(v) > 200:
            v = v[:200]
        clean[k] = v
    return clean


# ── Jurisdictions ────────────────────────────────────────────

async def list_states() -> list[dict]:
    """Return distinct states from national_jurisdictions."""
    url = (
        f"{SUPABASE_URL}/rest/v1/national_jurisdictions"
        "?select=state_abbr,state_name"
        "&order=state_name.asc"
    )
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, headers=_headers())
        r.raise_for_status()
        rows = r.json()
    seen = set()
    out = []
    for row in rows:
        abbr = row.get("state_abbr")
        if abbr and abbr not in seen:
            seen.add(abbr)
            out.append({"state_abbr": abbr, "state_name": row.get("state_name", "")})
    return out


async def list_jurisdictions(
    state_abbr: str,
    scrape_status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    """List jurisdictions for a state, optionally filtered by scrape_status."""
    url = (
        f"{SUPABASE_URL}/rest/v1/national_jurisdictions"
        f"?state_abbr=eq.{state_abbr}"
        f"&order=county_name.asc"
        f"&limit={limit}&offset={offset}"
    )
    if scrape_status:
        url += f"&scrape_status=eq.{scrape_status}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, headers=_headers())
        r.raise_for_status()
        return r.json()


async def get_jurisdiction(jurisdiction_id: int) -> Optional[dict]:
    """Get a single jurisdiction by ID."""
    url = f"{SUPABASE_URL}/rest/v1/national_jurisdictions?id=eq.{jurisdiction_id}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, headers=_headers())
        r.raise_for_status()
        rows = r.json()
        return rows[0] if rows else None


async def update_jurisdiction(jurisdiction_id: int, updates: dict) -> dict:
    """Update a national_jurisdictions row."""
    url = f"{SUPABASE_URL}/rest/v1/national_jurisdictions?id=eq.{jurisdiction_id}"
    # Only send known columns, remove empty strings and None
    known_cols = {
        "scrape_status", "scrape_platform", "municode_url", "ordinance_url",
        "telecom_section", "last_scraped", "priority_market", "active_state",
        "skywave_territory", "zoning_ordinance_id", "notes", "updated_at",
    }
    clean = {}
    for k, v in updates.items():
        if k not in known_cols:
            continue
        if v is None or v == "":
            continue
        clean[k] = v
    clean["updated_at"] = datetime.now(timezone.utc).isoformat()
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.patch(url, headers=_headers(), json=clean)
        r.raise_for_status()
        rows = r.json()
        return rows[0] if rows else updates


# ── Telecom Ordinances ───────────────────────────────────────

async def upsert_telecom_ordinance(record: dict) -> dict:
    """
    Insert or update a telecom ordinance record.
    First tries to find an existing record by (state, jurisdiction).
    If found, updates it. If not, inserts new.
    """
    now = datetime.now(timezone.utc).isoformat()
    record.setdefault("scraped_at", now)
    record["updated_at"] = now

    # Only send columns that exist in the table
    clean = _clean_record(record, CORE_COLUMNS)

    state = clean.get("state", "")
    jurisdiction = clean.get("jurisdiction", "")

    # Check if record already exists
    check_url = (
        f"{SUPABASE_URL}/rest/v1/telecom_ordinances"
        f"?state=eq.{state}&jurisdiction=eq.{jurisdiction}"
        f"&select=id&limit=1"
    )
    async with httpx.AsyncClient(timeout=30) as client:
        check_r = await client.get(check_url, headers=_headers())
        existing = check_r.json() if check_r.status_code == 200 else []

    if existing:
        # Update existing record
        record_id = existing[0]["id"]
        url = f"{SUPABASE_URL}/rest/v1/telecom_ordinances?id=eq.{record_id}"
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.patch(url, headers=_headers(), json=clean)
            r.raise_for_status()
            rows = r.json()
            return rows[0] if rows else {**clean, "id": record_id}
    else:
        # Insert new record
        url = f"{SUPABASE_URL}/rest/v1/telecom_ordinances"
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(url, headers=_headers(), json=clean)
            r.raise_for_status()
            rows = r.json()
            return rows[0] if rows else clean


async def update_telecom_ordinance(record_id: str, updates: dict) -> dict:
    """Update a telecom_ordinances row by ID with extended fields."""
    url = f"{SUPABASE_URL}/rest/v1/telecom_ordinances?id=eq.{record_id}"
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    clean = _clean_record(updates, CORE_COLUMNS | EXTENDED_COLUMNS)
    if len(clean) <= 1:  # only updated_at
        return updates
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.patch(url, headers=_headers(), json=clean)
        r.raise_for_status()
        rows = r.json()
        return rows[0] if rows else updates


async def get_telecom_ordinances(
    state: Optional[str] = None,
    jurisdiction: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Query telecom_ordinances with optional filters."""
    url = (
        f"{SUPABASE_URL}/rest/v1/telecom_ordinances"
        f"?order=state.asc,jurisdiction.asc"
        f"&limit={limit}&offset={offset}"
    )
    if state:
        url += f"&state=eq.{state}"
    if jurisdiction:
        url += f"&jurisdiction=eq.{jurisdiction}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, headers=_headers())
        r.raise_for_status()
        return r.json()


async def get_scrape_stats() -> dict:
    """Get scraping progress statistics from national_jurisdictions."""
    stats = {}
    for status in ["pending", "scraped", "not_found", "error"]:
        url = (
            f"{SUPABASE_URL}/rest/v1/national_jurisdictions"
            f"?scrape_status=eq.{status}&select=id"
        )
        headers = _headers()
        headers["Prefer"] = "count=exact"
        headers["Range"] = "0-0"
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(url, headers=headers)
            content_range = r.headers.get("content-range", "")
            if "/" in content_range:
                stats[status] = int(content_range.split("/")[1])
            else:
                stats[status] = 0
    stats["total"] = sum(stats.values())

    # Also count telecom_ordinances
    url = f"{SUPABASE_URL}/rest/v1/telecom_ordinances?select=id"
    headers = _headers()
    headers["Prefer"] = "count=exact"
    headers["Range"] = "0-0"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, headers=headers)
        content_range = r.headers.get("content-range", "")
        if "/" in content_range:
            stats["ordinances_scraped"] = int(content_range.split("/")[1])
        else:
            stats["ordinances_scraped"] = 0

    return stats
