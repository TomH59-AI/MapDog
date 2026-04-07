"""
extractor.py
------------
Uses OpenAI (or compatible) LLM to extract structured telecom ordinance data
from raw scraped text. Pulls out the fields that matter for site acquisition:

- Setbacks (by zone, by structure type)
- Height restrictions
- Permit type (CUP, SUP, administrative, by-right)
- Fall zone / collapse radius
- Zoning classifications where towers are allowed
- Public hearing required (yes/no)
- Contact information (department, name, phone, email)
- Collocation requirements
- Stealth/concealment requirements
"""

import json
import logging
import os
from typing import Optional

from openai import AsyncOpenAI

logger = logging.getLogger("mcp-municode.extractor")

# Use the pre-configured OpenAI client (supports gpt-4.1-mini, gemini-2.5-flash)
client = AsyncOpenAI()

EXTRACTION_SYSTEM_PROMPT = """You are an expert site acquisition analyst specializing in wireless telecommunications zoning ordinances. Your job is to extract structured data from municipal code text.

Extract the following fields from the ordinance text. If a field is not mentioned or cannot be determined, use null. Be precise and cite section numbers where possible.

Return a JSON object with these exact keys:

{
  "height_limit_ft": <number or null — max tower height in feet>,
  "setback_ft": <number or null — primary setback distance in feet>,
  "setback_details": {
    "from_residential": <string — setback from residential zones>,
    "from_property_line": <string — setback from property lines>,
    "from_road": <string — setback from roads/ROW>,
    "from_other_towers": <string — separation from other towers>,
    "notes": <string — any other setback details>
  },
  "height_details": {
    "max_height_ft": <number or null>,
    "max_height_by_zone": <object — zone name: max height>,
    "height_exceptions": <string — any exceptions or variances>,
    "notes": <string>
  },
  "fall_zone_ft": <number or null — fall zone / collapse radius in feet>,
  "fall_zone_details": <string — full fall zone requirements>,
  "permit_type": <string — one of: "CUP" (Conditional Use Permit), "SUP" (Special Use Permit), "Special Exception", "Administrative", "By-Right", "Variance", or the specific local term>,
  "permit_details": {
    "type": <string — permit type>,
    "application_fee": <string or null>,
    "review_body": <string — who reviews: Planning Commission, Board of Adjustment, City Council, etc.>,
    "process_notes": <string — any process details>,
    "timeline": <string or null — review timeline if mentioned>
  },
  "public_hearing_required": <boolean — true if a public hearing is required>,
  "zoning_classifications": <string — comma-separated list of zones where towers are allowed, e.g. "M-1 Industrial, C-2 Commercial, AG Agricultural">,
  "allowable_zones": <string — same as zoning_classifications for backward compatibility>,
  "collocation_required": <boolean — true if collocation on existing structures is required before new towers>,
  "stealth_required": <boolean — true if stealth/concealment design is required>,
  "contact_name": <string or null — planning/zoning contact name if mentioned>,
  "contact_phone": <string or null — department phone number>,
  "contact_email": <string or null — department email>,
  "contact_department": <string or null — department name, e.g. "Planning & Zoning Department">,
  "summary": <string — 2-3 sentence summary of the key requirements for building a new cell tower in this jurisdiction>,
  "keywords": [<list of relevant keywords for search, e.g. "cell tower", "CUP", "M-1", "monopole", etc.>]
}

IMPORTANT:
- Extract REAL data only. Do not invent or assume values.
- For setbacks, include the formula if given (e.g., "100% of tower height" or "300 ft from residential").
- For zoning, list ALL districts where towers are permitted or conditionally permitted.
- For permit type, use the jurisdiction's actual terminology.
- The summary should be actionable for a site acquisition specialist.
"""


async def extract_ordinance_fields(
    ordinance_text: str,
    jurisdiction: str,
    state: str,
    model: str = "gpt-4.1-mini",
) -> dict:
    """
    Send ordinance text to LLM and extract structured fields.
    Returns a dict matching the telecom_ordinances table schema.
    """
    if not ordinance_text or len(ordinance_text.strip()) < 100:
        logger.warning(f"Ordinance text too short for {jurisdiction}, {state}")
        return {"error": "Ordinance text too short for extraction"}

    # Truncate very long texts to fit context window
    max_chars = 60000  # ~15k tokens
    if len(ordinance_text) > max_chars:
        ordinance_text = ordinance_text[:max_chars] + "\n\n[... text truncated ...]"

    user_prompt = f"""Extract the telecommunications tower/antenna ordinance data for:
Jurisdiction: {jurisdiction}
State: {state}

Ordinance Text:
---
{ordinance_text}
---

Return ONLY the JSON object, no markdown formatting."""

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content.strip()

        # Parse the JSON response
        extracted = json.loads(content)
        logger.info(
            f"Extracted {len([v for v in extracted.values() if v is not None])} "
            f"fields for {jurisdiction}, {state}"
        )
        return extracted

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error for {jurisdiction}: {e}")
        return {"error": f"JSON parse error: {e}"}
    except Exception as e:
        logger.error(f"Extraction failed for {jurisdiction}, {state}: {e}")
        return {"error": str(e)}


async def generate_ordinance_summary(
    ordinance_text: str,
    jurisdiction: str,
    state: str,
    model: str = "gpt-4.1-mini",
) -> str:
    """
    Generate a concise, actionable summary of the telecom ordinance
    for a site acquisition specialist.
    """
    if not ordinance_text:
        return ""

    max_chars = 40000
    if len(ordinance_text) > max_chars:
        ordinance_text = ordinance_text[:max_chars] + "\n\n[... truncated ...]"

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a site acquisition specialist. Summarize the "
                        "telecommunications ordinance in 3-5 sentences. Focus on: "
                        "what permit is needed, which zones allow towers, key setbacks, "
                        "height limits, whether a public hearing is required, and any "
                        "collocation or stealth requirements. Be specific with numbers."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Summarize the telecom ordinance for {jurisdiction}, {state}:\n\n"
                        f"{ordinance_text}"
                    ),
                },
            ],
            temperature=0.2,
            max_tokens=500,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        return ""
