import sys
sys.stdout.reconfigure(encoding='utf-8')

from backend.collectors.youtube import search_youtube
from backend.collectors.web import search_news
from backend.collectors.social.reddit import search_reddit
from backend.collectors.social.linkedin import search_linkedin
from backend.collectors.bluesky import search_bluesky
from backend.collectors.hackernews import search_hackernews
from backend.models.mention import Mention
from backend.ai.analyzer import analyze_mention
from backend.exporter import export_mentions


def to_mention(item, source):
    """
    Convert collector output into a Mention object.
    Supports both Mention objects and dictionaries.
    """

    if isinstance(item, Mention):
        return item

    return Mention(
        source=source,
        title=item.get("title"),
        text=item.get("text", item.get("description", "")),
        url=item.get("url"),
        author=item.get("author", item.get("channel")),
        published_at=item.get("published_at"),
    )


def analyze_if_needed(mention):
    """
    Send a mention through Gemini analysis.
    """

    try:
        return analyze_mention(mention)

    except Exception as e:
        print(f"Gemini ERROR: {e}")
        return mention


MAX_RESULTS_PER_SOURCE = 50


def collect_all(query="Puravankara", limit=MAX_RESULTS_PER_SOURCE):
    """
    Collect fresh mentions from live sources
    and analyze them with Gemini.
    """

    mentions = []

    # -------------------------
    # YouTube
    # -------------------------
    try:
        youtube_results = search_youtube(query, limit)

        for item in youtube_results:

            mention = to_mention(item, "youtube")

            mention = analyze_if_needed(mention)

            mentions.append(mention)

        print(f"YouTube: {len(youtube_results)} results")

    except Exception as e:
        print(f"YouTube ERROR: {e}")

    # -------------------------
    # News / Web
    # -------------------------
    try:
        news_results = search_news(query, limit)

        for item in news_results:

            mention = to_mention(item, "news")

            mention = analyze_if_needed(mention)

            mentions.append(mention)

        print(f"News: {len(news_results)} results")

    except Exception as e:
        print(f"News ERROR: {e}")

    # -------------------------
    # Reddit
    # -------------------------
    try:
        reddit_results = search_reddit(query, limit)

        for item in reddit_results:
            mention = analyze_if_needed(to_mention(item, "reddit"))
            mentions.append(mention)

        print(f"Reddit: {len(reddit_results)} results")

    except Exception as e:
        print(f"Reddit ERROR: {e}")

    # -------------------------
    # LinkedIn
    # -------------------------
    try:
        linkedin_results = search_linkedin(query, limit)

        for item in linkedin_results:
            mention = analyze_if_needed(to_mention(item, "linkedin"))
            mentions.append(mention)

        print(f"LinkedIn: {len(linkedin_results)} results")

    except Exception as e:
        print(f"LinkedIn ERROR: {e}")

    # -------------------------
    # Bluesky
    # -------------------------
    try:
        bluesky_results = search_bluesky(query, limit)

        for item in bluesky_results:
            mention = analyze_if_needed(to_mention(item, "bluesky"))
            mentions.append(mention)

        print(f"Bluesky: {len(bluesky_results)} results")

    except Exception as e:
        print(f"Bluesky ERROR: {e}")

    # -------------------------
    # HackerNews
    # -------------------------
    try:
        hn_results = search_hackernews(query, limit)

        for item in hn_results:
            mention = analyze_if_needed(to_mention(item, "hackernews"))
            mentions.append(mention)

        print(f"HackerNews: {len(hn_results)} results")

    except Exception as e:
        print(f"HackerNews ERROR: {e}")

    return mentions


if __name__ == "__main__":
    print("=" * 70)
    print("PURAVANKARA REPUTATION INTELLIGENCE")
    print("LIVE COLLECTION + GEMINI ANALYSIS")
    print("=" * 70)

    results = collect_all("Puravankara")

    print()
    print("=" * 70)
    print(f"TOTAL MENTIONS PROCESSED: {len(results)}")
    print("=" * 70)

    for i, mention in enumerate(results, 1):

        print()
        print(f"[{i}] {mention.source.upper()}")
        print("TITLE      :", mention.title)
        print("AUTHOR     :", mention.author)
        print("SENTIMENT  :", mention.sentiment)
        print("SCORE      :", mention.sentiment_score)
        print("RELEVANCE  :", mention.relevance_score)
        print("URL        :", mention.url)
