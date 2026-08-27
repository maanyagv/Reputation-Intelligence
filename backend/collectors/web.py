import urllib.parse
import feedparser


def search_news(query="Puravankara", max_results=50):
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

        feed = feedparser.parse(url)

        for entry in feed.entries:
            link = entry.get("link", "")
            if link and link not in seen_urls:
                seen_urls.add(link)
                results.append({
                    "platform": "google_news",
                    "title": entry.get("title", ""),
                    "description": entry.get("summary", ""),
                    "published_at": entry.get("published", ""),
                    "url": link,
                    "source": entry.get("source", {}).get("title", "")
                })

            if len(results) >= max_results:
                break

    return results


if __name__ == "__main__":
    results = search_news("Puravankara", 10)

    print(f"\nFound {len(results)} news results:\n")

    for item in results:
        print("=" * 80)
        print("TITLE:", item["title"])
        print("SOURCE:", item["source"])
        print("DATE:", item["published_at"])
        print("URL:", item["url"])
