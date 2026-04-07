# mcp-municode

**MCP Server for scraping U.S. telecommunications zoning ordinances from the Municode Library.**

This is the bread-and-butter data pipeline for MapDog's site acquisition workflow. It scrapes municipal codes from [library.municode.com](https://library.municode.com/), uses AI to extract structured telecom ordinance fields, and stores everything in Supabase — filed by state, jurisdiction, and section number.

## What It Extracts

Every jurisdiction gets these fields pulled from the raw ordinance text:

| Field | Description |
|---|---|
| `height_limit_ft` | Maximum tower height in feet |
| `setback_ft` | Primary setback distance in feet |
| `setback_details` | Structured setbacks by zone/type (JSON) |
| `height_details` | Height limits by zone with exceptions (JSON) |
| `fall_zone_ft` | Fall zone / collapse radius in feet |
| `fall_zone_details` | Full fall zone requirements |
| `permit_type` | CUP, SUP, Special Exception, Administrative, By-Right |
| `permit_details` | Review body, fees, process, timeline (JSON) |
| `public_hearing_required` | Whether a public hearing is needed (boolean) |
| `zoning_classifications` | Zones where towers are allowed (e.g., M-1 Industrial) |
| `collocation_required` | Whether collocation is required before new towers |
| `stealth_required` | Whether stealth/concealment design is required |
| `contact_name` | Planning/zoning contact name |
| `contact_phone` | Department phone number |
| `contact_email` | Department email |
| `contact_department` | Department name |
| `section_ref` | Ordinance section number(s) |
| `summary` | AI-generated actionable summary |
| `keywords` | Searchable keyword tags |

## MCP Tools

| Tool | Description |
|---|---|
| `list_states` | List all U.S. states with scrape progress |
| `list_jurisdictions` | List jurisdictions for a state (filter by status) |
| `scrape_jurisdiction` | Scrape one jurisdiction's telecom ordinance |
| `scrape_state_batch` | Batch-scrape pending jurisdictions in a state |
| `extract_fields` | AI-extract structured fields from ordinance text |
| `search_ordinances` | Search existing scraped ordinances |
| `get_scrape_stats` | Dashboard of scraping progress |
| `get_ordinance` | Get full ordinance record for a jurisdiction |

## Setup

### 1. Run the database migration

Open the Supabase SQL Editor and run `config/migration.sql` to add the new columns.

### 2. Set environment variables

```bash
export SUPABASE_URL=https://skpxeouvikzgsaurkohf.supabase.co
export SUPABASE_SERVICE_KEY=your_service_key
export OPENAI_API_KEY=your_openai_key
```

### 3. Install dependencies

```bash
cd mcp-municode
pip install -e .
playwright install chromium --with-deps
```

### 4. Connect to your MCP client

Add to your MCP config (e.g., Claude Desktop, Manus, or MapDog):

```json
{
  "mcpServers": {
    "municode": {
      "command": "python",
      "args": ["-m", "src.server"],
      "cwd": "/path/to/mcp-municode",
      "env": {
        "SUPABASE_URL": "https://skpxeouvikzgsaurkohf.supabase.co",
        "SUPABASE_SERVICE_KEY": "your_key",
        "OPENAI_API_KEY": "your_key"
      }
    }
  }
}
```

## Architecture

```
Municode Library (HTTP/Playwright)
        │
        ▼
  municode_scraper.py  ──→  Raw ordinance text
        │
        ▼
    extractor.py  ──→  Structured fields via GPT-4.1-mini
        │
        ▼
  supabase_client.py  ──→  telecom_ordinances table
        │
        ▼
    server.py  ──→  MCP tools for MapDog / Manus / Claude
```

## Cost Estimate

Using `gpt-4.1-mini` for extraction: approximately **$0.003-0.005 per jurisdiction**, or roughly **$6-16 for all 3,221 national jurisdictions**.
