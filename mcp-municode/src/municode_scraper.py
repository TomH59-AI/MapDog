"""
municode_scraper.py
-------------------
Scrapes the Municode Library for telecommunications ordinance sections.

Strategy: Playwright for everything — Municode is fully JS-rendered.
1. Navigate to municipality code page
2. Use the built-in search to find telecom sections
3. Click into the section and scrape the full text

Rate-limited to be respectful: configurable delay between requests.
"""

import asyncio
import logging
import os
import re
from typing import Optional

from playwright.async_api import async_playwright, Browser, Page

logger = logging.getLogger("mcp-municode.scraper")

SCRAPE_DELAY = int(os.environ.get("SCRAPE_DELAY_SECONDS", "3"))
BASE_URL = "https://library.municode.com"

TELECOM_KEYWORDS = [
    "telecommunication", "telecommunications",
    "wireless", "cell tower", "communication tower",
    "antenna", "antennas", "wireless facilities",
    "wireless service", "tower", "small cell",
    "small wireless", "WCF", "WTF", "PWSF",
]

US_STATES = {
    "AL": "al", "AK": "ak", "AZ": "az", "AR": "ar", "CA": "ca",
    "CO": "co", "CT": "ct", "DE": "de", "FL": "fl", "GA": "ga",
    "HI": "hi", "ID": "id", "IL": "il", "IN": "in", "IA": "ia",
    "KS": "ks", "KY": "ky", "LA": "la", "ME": "me", "MD": "md",
    "MA": "ma", "MI": "mi", "MN": "mn", "MS": "ms", "MO": "mo",
    "MT": "mt", "NE": "ne", "NV": "nv", "NH": "nh", "NJ": "nj",
    "NM": "nm", "NY": "ny", "NC": "nc", "ND": "nd", "OH": "oh",
    "OK": "ok", "OR": "or", "PA": "pa", "RI": "ri", "SC": "sc",
    "SD": "sd", "TN": "tn", "TX": "tx", "UT": "ut", "VT": "vt",
    "VA": "va", "WA": "wa", "WV": "wv", "WI": "wi", "WY": "wy",
    "DC": "dc",
}


async def _launch_browser():
    """Launch a headless Chromium browser."""
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=True)
    return pw, browser


async def _new_page(browser: Browser) -> Page:
    """Create a new page with standard settings."""
    context = await browser.new_context(
        viewport={"width": 1920, "height": 1080},
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        ),
    )
    page = await context.new_page()
    page.set_default_timeout(60000)
    return page


async def _close_popups(page: Page):
    """Close any modals or popups on the page."""
    for selector in [
        "button[aria-label='Close']",
        "button:has-text('Close')",
        "button:has-text('Got it')",
        "button:has-text('Accept')",
        ".modal-close",
    ]:
        try:
            btns = await page.query_selector_all(selector)
            for btn in btns:
                if await btn.is_visible():
                    await btn.click()
                    await asyncio.sleep(0.3)
        except Exception:
            pass


def _build_code_url(state_abbr: str, municipality_name: str) -> list[str]:
    """Build candidate Municode URLs for a municipality."""
    slug = US_STATES.get(state_abbr.upper(), state_abbr.lower())
    # Normalize name to URL slug
    name = municipality_name.lower().strip()
    # Remove common suffixes for the slug
    name_clean = name
    for suffix in [" county", " city", " town", " village", " borough", " township"]:
        if name_clean.endswith(suffix):
            name_clean = name_clean[: -len(suffix)]
            break

    variants = set()
    for n in [name, name_clean]:
        variants.add(n.replace(" ", "_"))
        variants.add(n.replace(" ", "-"))
        variants.add(n.replace(" ", "_").replace("-", "_"))
        variants.add(n.replace(" ", "-").replace("_", "-"))
    # Also try with county suffix
    if "county" in name:
        county_name = name.replace(" county", "").strip()
        variants.add(county_name.replace(" ", "_") + "_county")
        variants.add(county_name.replace(" ", "-") + "-county")

    urls = []
    for v in variants:
        urls.append(f"{BASE_URL}/{slug}/{v}/codes/code_of_ordinances")
    return list(set(urls))


# ── Main Scrape Function ────────────────────────────────────

async def scrape_jurisdiction_telecom(
    state_abbr: str,
    municipality_name: str,
    municode_url: Optional[str] = None,
) -> dict:
    """
    Full pipeline: navigate to municipality on Municode, search for telecom
    sections, scrape content, return structured data.
    """
    state = state_abbr.upper()
    logger.info(f"Starting scrape for {municipality_name}, {state}")

    result = {
        "municipality": municipality_name,
        "state": state,
        "municode_url": None,
        "telecom_sections": [],
        "full_text": "",
        "section_refs": [],
        "error": None,
    }

    pw = None
    browser = None
    try:
        pw, browser = await _launch_browser()
        page = await _new_page(browser)

        # Step 1: Navigate to the municipality's code page
        code_url = None
        if municode_url:
            urls_to_try = [municode_url]
        else:
            urls_to_try = _build_code_url(state_abbr, municipality_name)

        for url in urls_to_try:
            try:
                logger.info(f"  Trying: {url}")
                resp = await page.goto(url, wait_until="networkidle", timeout=30000)
                await asyncio.sleep(2)
                title = await page.title()
                # Check if we got a real code page (not 404)
                if resp and resp.status == 200 and "code of ordinances" in title.lower():
                    code_url = url
                    result["municode_url"] = url
                    logger.info(f"  Found code page: {title}")
                    break
                elif resp and resp.status == 200 and "municode" in title.lower():
                    # Might be a redirect to the right page
                    current = page.url
                    if "/codes/" in current:
                        code_url = current
                        result["municode_url"] = current
                        logger.info(f"  Found code page (redirect): {title}")
                        break
            except Exception as e:
                logger.debug(f"  URL failed: {url} — {e}")
                continue

        if not code_url:
            result["error"] = f"Municipality '{municipality_name}' not found on Municode"
            await browser.close()
            await pw.stop()
            return result

        # Step 2: Close popups and search for telecom content
        await _close_popups(page)

        # Find the search box
        search_box = await page.query_selector(
            'input[type="search"], input[placeholder*="earch"], '
            '#searchInput, input[name="searchText"]'
        )

        telecom_links = []
        if search_box:
            logger.info("  Searching for telecommunications...")
            await search_box.fill("telecommunications towers antennas")
            await search_box.press("Enter")
            await asyncio.sleep(5)
            await _close_popups(page)

            # Collect telecom-related links from search results
            links = await page.query_selector_all("a")
            for link in links:
                try:
                    text = (await link.text_content() or "").strip()
                    href = await link.get_attribute("href") or ""
                    text_lower = text.lower()
                    if any(kw in text_lower for kw in TELECOM_KEYWORDS):
                        if href and "nodeId=" in href and len(text) > 5:
                            full_url = href if href.startswith("http") else f"{BASE_URL}{href}"
                            telecom_links.append({"name": text, "url": full_url})
                except Exception:
                    continue

        # Deduplicate by URL
        seen_urls = set()
        unique_links = []
        for tl in telecom_links:
            if tl["url"] not in seen_urls:
                seen_urls.add(tl["url"])
                unique_links.append(tl)
        telecom_links = unique_links

        logger.info(f"  Found {len(telecom_links)} telecom sections")

        if not telecom_links:
            result["error"] = "No telecommunications sections found in search"
            await browser.close()
            await pw.stop()
            return result

        # Step 3: Scrape each telecom section (limit to top 3)
        all_text_parts = []
        for i, section in enumerate(telecom_links[:3]):
            logger.info(f"  Scraping section [{i+1}]: {section['name'][:60]}")
            await asyncio.sleep(SCRAPE_DELAY)

            try:
                await page.goto(section["url"], wait_until="networkidle", timeout=30000)
                await asyncio.sleep(3)
                await _close_popups(page)

                # Scroll to load all lazy content
                for _ in range(8):
                    await page.evaluate("window.scrollBy(0, 1500)")
                    await asyncio.sleep(0.4)
                await page.evaluate("window.scrollTo(0, 0)")
                await asyncio.sleep(1)

                # Extract text from content chunks
                text_parts = []

                # Try .chunk elements first (Municode's content containers)
                chunks = await page.query_selector_all(".chunk")
                if chunks:
                    for chunk in chunks:
                        text = await chunk.text_content()
                        if text and len(text.strip()) > 30:
                            text_parts.append(text.strip())

                # Fallback to broader selectors
                if not text_parts:
                    for sel in ["#codebody", ".document-body", "main article", "main"]:
                        container = await page.query_selector(sel)
                        if container:
                            text = await container.text_content()
                            if text and len(text.strip()) > 100:
                                text_parts.append(text.strip())
                                break

                section_text = "\n\n".join(text_parts)

                # Extract section reference numbers
                sec_refs = re.findall(
                    r'(?:Sec\.|Section|§)\s*[\d]+[\-\.\d]*',
                    section_text[:2000]
                )

                section["text"] = section_text
                section["section_refs"] = sec_refs
                result["telecom_sections"].append(section)
                result["section_refs"].extend(sec_refs)

                if section_text:
                    all_text_parts.append(section_text)

            except Exception as e:
                logger.warning(f"  Failed to scrape section: {e}")
                section["error"] = str(e)
                result["telecom_sections"].append(section)

        result["full_text"] = "\n\n---\n\n".join(all_text_parts)

        if not result["full_text"]:
            result["error"] = "Sections found but no text content extracted"

    except Exception as e:
        logger.error(f"Scrape pipeline failed for {municipality_name}, {state}: {e}")
        result["error"] = str(e)
    finally:
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

    return result


async def scrape_ordinance_page(url: str) -> dict:
    """
    Scrape a single Municode ordinance page by URL.
    Returns {url, title, full_text, headings, section_refs}.
    """
    logger.info(f"Scraping page: {url}")
    result = {"url": url, "title": "", "full_text": "", "headings": [], "section_refs": []}

    pw = None
    browser = None
    try:
        pw, browser = await _launch_browser()
        page = await _new_page(browser)

        await page.goto(url, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(3)
        await _close_popups(page)

        result["title"] = await page.title()

        # Scroll to load content
        for _ in range(8):
            await page.evaluate("window.scrollBy(0, 1500)")
            await asyncio.sleep(0.4)
        await page.evaluate("window.scrollTo(0, 0)")
        await asyncio.sleep(1)

        # Extract text
        text_parts = []
        chunks = await page.query_selector_all(".chunk")
        if chunks:
            for chunk in chunks:
                text = await chunk.text_content()
                if text and len(text.strip()) > 30:
                    text_parts.append(text.strip())

        if not text_parts:
            for sel in ["#codebody", ".document-body", "main"]:
                container = await page.query_selector(sel)
                if container:
                    text = await container.text_content()
                    if text and len(text.strip()) > 100:
                        text_parts.append(text.strip())
                        break

        result["full_text"] = "\n\n".join(text_parts)

        # Extract headings
        for tag in ["h1", "h2", "h3", "h4"]:
            elements = await page.query_selector_all(tag)
            for el in elements:
                text = (await el.text_content() or "").strip()
                if text and len(text) > 2:
                    result["headings"].append(text)

        # Extract section refs
        result["section_refs"] = re.findall(
            r'(?:Sec\.|Section|§)\s*[\d]+[\-\.\d]*',
            result["full_text"][:5000]
        )

    except Exception as e:
        logger.error(f"Page scrape failed for {url}: {e}")
        result["error"] = str(e)
    finally:
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

    return result
