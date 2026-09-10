import os
import re
import urllib.parse
import urllib.request
import feedparser
from datetime import datetime, timezone
from dotenv import load_dotenv

from backend.models.mention import Mention
from backend.utils.relevance import is_puravankara_related

load_dotenv()

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

try:
    from googlenewsdecoder import new_decoderv1
except ImportError:
    new_decoderv1 = None


def decode_url_fast(raw_url):
    """
    Decodes Google News RSS link to actual direct article URL with strict 1.0s timeout.
    """
    if not raw_url:
        return ""
    if "news.google.com" not in raw_url:
        return raw_url
    if new_decoderv1:
        try:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(new_decoderv1, raw_url, interval=0.1)
                res = future.result(timeout=1.0)
                if isinstance(res, dict) and res.get("status") and res.get("decoded_url"):
                    return res["decoded_url"]
                elif isinstance(res, str) and res.startswith("http"):
                    return res
        except Exception:
            pass
    return raw_url


def scrape_mouthshut_hub(hub_url, limit=10):
    """
    Directly scrapes review texts and titles from a MouthShut developer/project page.
    """
    mentions = []
    try:
        req = urllib.request.Request(hub_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode('utf-8', errors='ignore')

        # Find review paragraphs
        paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', html, re.I | re.S)
        for p in paragraphs:
            clean = re.sub(r'<[^>]+>', ' ', p).strip()
            clean = re.sub(r'\s+', ' ', clean)
            
            # Skip boilerplate listings, star rating aggregates and compare notices
            if any(bp in clean for bp in ["Projects and Builders cannot be compared", "Votes Purva", "Price On Request", "Developer Compare"]):
                continue
            if re.match(r'^\d\.\d\d\s+\d+%', clean):
                continue

            if len(clean) > 80 and any(w in clean.lower() for w in ['puravankara', 'purva', 'provident', 'flat', 'apartment', 'builder', 'possession', 'delay', 'quality', 'refund', 'oc', 'amenit', 'crm', 'money', 'bought', 'booked']):
                title = clean[:75] + ("..." if len(clean) > 75 else "")
                mentions.append(Mention(
                    source="mouthshut",
                    title=f"MouthShut Review: {title}",
                    text=clean,
                    url=hub_url,
                    author="MouthShut Resident",
                    published_at=datetime.now(timezone.utc).isoformat()
                ))
                if len(mentions) >= limit:
                    break
    except Exception as err:
        print(f"Direct MouthShut scrape warning: {err}")
    return mentions


def search_mouthshut(query="Puravankara", limit=15):
    """
    Collects consumer reviews and ratings from MouthShut.com about Puravankara
    and subsidiary projects. Combines RSS feed discovery with direct review hub parsing.
    """
    mentions = []
    seen_urls = set()

    # 1. Direct review hub extraction for Puravankara Builders
    hub_reviews = scrape_mouthshut_hub("https://www.mouthshut.com/builders-and-developers/puravankara-bangalore-reviews-925655396", limit=min(limit, 8))
    for r in hub_reviews:
        mentions.append(r)

    # 2. Google News RSS search indexing for MouthShut reviews
    search_queries = [
        f"site:mouthshut.com {query}",
        f"site:mouthshut.com {query} reviews",
    ]

    for sq in search_queries:
        if len(mentions) >= limit:
            break

        encoded = urllib.parse.quote(sq)
        feed_url = f"https://news.google.com/rss/search?q={encoded}&hl=en-IN&gl=IN&ceid=IN:en"
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:10]:
                raw_link = entry.get("link", "")
                title = entry.get("title", "")
                if "mouthshut" not in title.lower() and "mouthshut" not in raw_link.lower():
                    continue

                direct_url = decode_url_fast(raw_link)
                if not direct_url or direct_url in seen_urls:
                    continue
                # Skip home / download app root pages
                if direct_url.rstrip("/") in ["https://www.mouthshut.com", "http://www.mouthshut.com"]:
                    continue

                seen_urls.add(direct_url)
                summary = re.sub(r'<[^>]+>', ' ', entry.get("summary", "")).strip()
                clean_title = re.sub(r'\s*-\s*MouthShut\.com\s*$', '', title, flags=re.I).strip()

                raw_item = {
                    "source": "mouthshut",
                    "title": clean_title,
                    "text": summary or clean_title,
                    "url": direct_url,
                    "published_at": entry.get("published", ""),
                    "author": "MouthShut Reviewer"
                }

                # Ensure relevance strictly for Puravankara / Purva / Provident
                if not is_puravankara_related(raw_item):
                    continue

                mentions.append(Mention(
                    source="mouthshut",
                    title=clean_title,
                    text=summary or clean_title,
                    url=direct_url,
                    author="MouthShut Reviewer",
                    published_at=entry.get("published")
                ))

                if len(mentions) >= limit:
                    break
        except Exception as e:
            print(f"MouthShut collector warning: {e}")

    return mentions[:limit]


if __name__ == "__main__":
    items = search_mouthshut("Puravankara", 5)
    print(f"Found {len(items)} MouthShut reviews:")
    for m in items:
        print("TITLE:", m.title)
        print("URL:", m.url)
        print("SOURCE:", m.source)
        print("-" * 50)
