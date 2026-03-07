#!/usr/bin/env python3
"""
scrape_municode_search.py
Uses Apify to search Municode for telecom/tower content in Cocoa FL
and scrape the C-G district regulations directly.
"""

import requests
import json
import time

def _load_secret(key):
    """Load a secret from the .secrets file."""
    import os
    secrets_path = os.path.join(os.path.dirname(__file__), "../../skills/scip-florida-v2/references/.secrets")
    if os.path.exists(secrets_path):
        with open(secrets_path) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    if k.strip() == key:
                        return v.strip()
    return None



import os
APIFY_KEY = os.environ.get("APIFY_API_TOKEN") or _load_secret("APIFY_API_TOKEN")
ACTOR_ID = "apify~puppeteer-scraper"

# Use the Municode search to find telecom sections
TARGET_URLS = [
    # Search for telecommunications in Cocoa FL code
    "https://library.municode.com/fl/cocoa/codes/code_of_ordinances?nodeId=14686&term=telecommunications%20tower",
    # Direct search URL
    "https://library.municode.com/fl/cocoa/codes/code_of_ordinances?nodeId=14686&term=antenna%20tower",
]

PAGE_FUNCTION = """
async function pageFunction(context) {
    const { page, request, log } = context;
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const title = await page.title();
    
    // Try to click search and search for telecom
    try {
        // Look for search box
        const searchBox = await page.$('input[type="search"], input[placeholder*="search" i], .search-input, #search-input');
        if (searchBox) {
            await searchBox.click();
            await searchBox.type('telecommunications tower antenna');
            await page.keyboard.press('Enter');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    } catch(e) {
        log.info('Search box interaction failed: ' + e.message);
    }
    
    const bodyText = await page.evaluate(() => {
        return document.body ? document.body.innerText.substring(0, 20000) : '';
    });
    
    const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors.map(a => ({ text: (a.innerText || '').trim(), href: a.href || '' }))
            .filter(l => l.text.length > 2 && l.href.length > 5)
            .slice(0, 200);
    });
    
    // Find telecom-related links
    const telecomLinks = links.filter(l => {
        const t = l.text.toLowerCase();
        return t.includes('tower') || t.includes('antenna') || 
               t.includes('telecommunication') || t.includes('wireless') ||
               t.includes('communication facility') || t.includes('broadcast');
    });
    
    return {
        url: request.url,
        title,
        telecomLinks,
        allLinks: links.slice(0, 100),
        bodyText
    };
}
"""

def run_apify(urls, page_function, max_pages=5, label="run"):
    run_input = {
        "startUrls": [{"url": u} for u in urls],
        "pageFunction": page_function,
        "maxCrawlingDepth": 0,
        "maxPagesPerCrawl": max_pages,
        "navigationTimeoutSecs": 90,
        "pageLoadTimeoutSecs": 90,
    }
    
    headers = {"Content-Type": "application/json"}
    run_url = f"https://api.apify.com/v2/acts/{ACTOR_ID}/runs?token={APIFY_KEY}"
    
    print(f"[Apify] Starting {label}...")
    resp = requests.post(run_url, headers=headers, json=run_input, timeout=30)
    if resp.status_code not in (200, 201):
        print(f"  Error: {resp.status_code} - {resp.text[:300]}")
        return []
    
    run_data = resp.json()
    run_id = run_data["data"]["id"]
    dataset_id = run_data["data"]["defaultDatasetId"]
    print(f"[Apify] Run ID: {run_id}")
    
    status_url = f"https://api.apify.com/v2/actor-runs/{run_id}?token={APIFY_KEY}"
    for attempt in range(40):
        time.sleep(10)
        status_resp = requests.get(status_url, timeout=15)
        status = status_resp.json()["data"]["status"]
        print(f"[Apify] Status ({attempt+1}): {status}")
        if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
            break
    
    if status != "SUCCEEDED":
        return []
    
    dataset_url = f"https://api.apify.com/v2/datasets/{dataset_id}/items?token={APIFY_KEY}"
    return requests.get(dataset_url, timeout=15).json()


print("=" * 60)
print("MUNICODE SEARCH — Telecom/Tower Content")
print("=" * 60)

results = run_apify(TARGET_URLS, PAGE_FUNCTION, max_pages=5, label="Municode Search")

for item in results:
    if item.get('#error'):
        errs = item.get('#debug', {}).get('errorMessages', [])
        print(f"ERROR: {errs[0][:200] if errs else 'unknown'}")
        continue
    
    url = item.get('url', 'N/A')
    body = item.get('bodyText', '')
    
    print(f"\nURL: {url}")
    print(f"Title: {item.get('title')}")
    
    # Check for telecom content
    lower_body = body.lower()
    if any(x in lower_body for x in ['tower', 'antenna', 'telecommunication', 'wireless']):
        print("*** FOUND TELECOM CONTENT ***")
        for keyword in ['tower', 'antenna', 'telecommunication', 'wireless']:
            idx = lower_body.find(keyword)
            if idx >= 0:
                print(f"\n  [{keyword}] context:")
                print(f"  {body[max(0,idx-200):idx+600]}")
                print("  ---")
    else:
        print("No telecom content found")
        print(f"Body preview: {body[:1000]}")
    
    telecom_links = item.get('telecomLinks', [])
    print(f"\nTelecom links: {len(telecom_links)}")
    for lnk in telecom_links:
        print(f"  - {lnk['text']}: {lnk['href']}")

with open("/home/ubuntu/scip-output/golden_hour/municode_search.json", "w") as f:
    json.dump(results, f, indent=2)
print("\n✅ Saved")
