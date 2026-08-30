import os
import urllib.parse
import feedparser
import requests
from dotenv import load_dotenv

load_dotenv()

try:
    from googlenewsdecoder import new_decoderv1
except ImportError:
    new_decoderv1 = None


def decode_url(raw_url):
    """
    Decodes Google News RSS link to actual direct article URL.
    """
    if not raw_url:
        return ""
    if "news.google.com" not in raw_url:
        return raw_url
    if new_decoderv1:
        try:
            res = new_decoderv1(raw_url, interval=0.2)
            if isinstance(res, dict) and res.get("status") and res.get("decoded_url"):
                return res["decoded_url"]
            elif isinstance(res, str) and res.startswith("http"):
                return res
        except Exception:
            pass
    return raw_url


def search_news(query="Puravankara", max_results=30):
    queries = [
        query,
        f"{query} complaint OR delay OR RERA OR dispute OR issue"
    ]

    results = []
    seen_urls = set()

    for q in queries:
        encoded_query = urllib.parse.quote(q)
        url = (
            f"https://news.google.com/rss/search?"
            f"q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"
        )

        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                raw_link = entry.get("link", "")
                direct_url = decode_url(raw_link)

                if direct_url and direct_url not in seen_urls:
                    seen_urls.add(direct_url)
                    results.append({
                        "platform": "google_news",
                        "title": entry.get("title", ""),
                        "description": entry.get("summary", ""),
                        "published_at": entry.get("published", ""),
                        "url": direct_url,
                        "source": entry.get("source", {}).get("title", "Google News")
                    })

                if len(results) >= max_results:
                    break
        except Exception as e:
            print(f"Web collector warning: {e}")

        if len(results) >= max_results:
            break

    return results


if __name__ == "__main__":
    results = search_news("Puravankara", 5)
    print(f"\nFound {len(results)} news results:\n")
    for item in results:
        print("=" * 80)
        print("TITLE:", item["title"])
        print("SOURCE:", item["source"])
        print("DATE:", item["published_at"])
        print("URL:", item["url"])
