import requests
from datetime import datetime, timezone


def search_reddit(query="Puravankara", limit=50):
    url = "https://www.reddit.com/search.json"

    params = {
        "q": query,
        "sort": "new",
        "limit": limit,
        "type": "link",
    }

    headers = {
        "User-Agent": "Puravankara-Reputation-Intelligence/1.0"
    }

    response = requests.get(
        url,
        params=params,
        headers=headers,
        timeout=15,
    )

    response.raise_for_status()

    data = response.json()
    results = []

    for item in data.get("data", {}).get("children", []):
        post = item.get("data", {})

        results.append({
            "source": "reddit",
            "title": post.get("title"),
            "text": post.get("selftext", ""),
            "url": (
                "https://www.reddit.com"
                + post.get("permalink", "")
            ),
            "author": post.get("author"),
            "published_at": (
                datetime.fromtimestamp(
                    post.get("created_utc", 0),
                    tz=timezone.utc
                ).isoformat()
                if post.get("created_utc")
                else None
            ),
        })

    return results


if __name__ == "__main__":
    results = search_reddit("Puravankara", 10)

    print("=" * 70)
    print(f"REDDIT RESULTS: {len(results)}")
    print("=" * 70)

    for item in results:
        print("TITLE :", item["title"])
        print("AUTHOR:", item["author"])
        print("URL   :", item["url"])
        print("TEXT  :", item["text"][:300])
        print("-" * 70)
