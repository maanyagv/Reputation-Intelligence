import feedparser
from datetime import datetime
from urllib.parse import quote

from backend.models.mention import Mention


def search_news(query="Puravankara", max_results=10):
    encoded_query = quote(query)

    url = (
        "https://news.google.com/rss/search"
        f"?q={encoded_query}"
        "&hl=en-IN"
        "&gl=IN"
        "&ceid=IN:en"
    )

    feed = feedparser.parse(url)

    mentions = []

    for entry in feed.entries[:max_results]:
        published_at = None

        if getattr(entry, "published_parsed", None):
            published_at = datetime(
                *entry.published_parsed[:6]
            )

        mention = Mention(
            source="google_news",
            title=entry.get("title", ""),
            text=entry.get("summary", ""),
            url=entry.get("link", ""),
            author=entry.get("source", {}).get("title")
            if isinstance(entry.get("source"), dict)
            else None,
            published_at=published_at,
        )

        mentions.append(mention)

    return mentions


if __name__ == "__main__":
    results = search_news("Puravankara", 10)

    print("=" * 70)
    print("GOOGLE NEWS RESULTS")
    print("=" * 70)

    for mention in results:
        print()
        print("TITLE   :", mention.title)
        print("SOURCE  :", mention.author)
        print("DATE    :", mention.published_at)
        print("URL     :", mention.url)