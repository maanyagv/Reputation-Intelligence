import requests
from datetime import datetime, timezone


def search_hackernews(query="Puravankara", limit=50):
    """
    Search HackerNews using Algolia's free, public, keyless REST API.
    """
    url = "https://hn.algolia.com/api/v1/search"
    params = {
        "query": query,
        "tags": "(story,comment)",
        "hitsPerPage": min(limit, 50),
    }

    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()

        results = []
        for hit in data.get("hits", []):
            title = hit.get("title") or hit.get("story_title") or hit.get("comment_text", "")[:100]
            text = hit.get("comment_text") or hit.get("story_text") or title
            author = hit.get("author", "hn_user")
            created_at = hit.get("created_at") or datetime.now(timezone.utc).isoformat()
            story_id = hit.get("story_id") or hit.get("objectID")
            item_url = hit.get("url") or f"https://news.ycombinator.com/item?id={story_id}"

            results.append({
                "source": "hackernews",
                "title": title,
                "text": text,
                "url": item_url,
                "author": author,
                "published_at": created_at,
            })
        return results

    except Exception as e:
        print(f"HackerNews search error: {e}")
        return []


if __name__ == "__main__":
    items = search_hackernews("Puravankara", 5)
    print(f"HackerNews returned {len(items)} items")
