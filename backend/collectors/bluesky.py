import requests


def search_bluesky(query="Puravankara", max_results=50):
    url = "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts"

    params = {
        "q": query,
        "limit": max_results,
    }

    response = requests.get(url, params=params, timeout=20)
    response.raise_for_status()

    data = response.json()

    results = []

    for post in data.get("posts", []):
        record = post.get("record", {})
        author = post.get("author", {})

        results.append({
            "platform": "bluesky",
            "text": record.get("text", ""),
            "published_at": record.get("createdAt", ""),
            "author": author.get("displayName") or author.get("handle", ""),
            "url": f"https://bsky.app/profile/{author.get('handle', '')}/post/{post.get('uri', '').split('/')[-1]}",
        })

    return results


if __name__ == "__main__":
    results = search_bluesky("Puravankara", 10)

    print(f"\nFound {len(results)} Bluesky results:\n")

    for item in results:
        print("=" * 80)
        print("AUTHOR:", item["author"])
        print("DATE:", item["published_at"])
        print("TEXT:", item["text"])
        print("URL:", item["url"])
