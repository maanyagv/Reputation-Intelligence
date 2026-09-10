import sys
sys.stdout.reconfigure(encoding='utf-8')

from backend.collectors.youtube import search_youtube
from backend.collectors.news import search_news
from backend.collectors.social.reddit import search_reddit
from backend.collectors.social.linkedin import search_linkedin
from backend.collectors.bluesky import search_bluesky
from backend.collectors.hackernews import search_hackernews
from backend.collectors.mouthshut import search_mouthshut
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
        title=item.get("title", ""),
        text=item.get("text", item.get("description", "")),
        url=item.get("url", ""),
        author=item.get("author", item.get("channel", "")),
        published_at=item.get("published_at"),
    )


def analyze_if_needed(mention):
    """
    Send a mention through analysis.
    """
    try:
        return analyze_mention(mention)
    except Exception as e:
        print(f"Analyzer ERROR: {e}")
        return mention


# Comprehensive targeted search keywords for Puravankara and subsidiaries
TARGET_SEARCH_QUERIES = [
    "Puravankara",
    "Puravankara Limited",
    "Purva",
    "Provident Housing",
    "Purva Land",
    "Ashish Puravankara",
    "Puravankara review",
    "Puravankara complaints",
    "Purva complaints",
    "Puravankara RERA",
    "Purva Palm Beach",
    "Purva Atmosphere"
]

MAX_RESULTS_PER_SOURCE = 30
_query_cycle_idx = 0


def collect_all(queries=None, limit=MAX_RESULTS_PER_SOURCE):
    """
    Collect fresh mentions from live sources using comprehensive
    brand, subsidiary, project, and sentiment queries in a continuous round-robin cycle.
    """
    global _query_cycle_idx

    if queries is None:
        primary = TARGET_SEARCH_QUERIES[0]
        rotator = TARGET_SEARCH_QUERIES[1 + (_query_cycle_idx % (len(TARGET_SEARCH_QUERIES) - 1))]
        _query_cycle_idx += 1
        active_queries = [primary, rotator]
    elif isinstance(queries, str):
        active_queries = [queries]
    else:
        active_queries = list(queries)

    mentions = []
    seen_identifiers = set()

    # Load existing identifiers to avoid redundant Gemini calls on already analyzed items
    import json
    from pathlib import Path
    rep_file = Path(__file__).resolve().parent.parent / "data" / "reputation.json"
    existing_keys = set()
    if rep_file.exists():
        try:
            with open(rep_file, "r", encoding="utf-8") as f:
                for item in json.load(f):
                    if isinstance(item, dict):
                        k = item.get("url") or item.get("title")
                        if k:
                            existing_keys.add(k)
        except Exception:
            pass

    def add_mention(mention):
        if not mention:
            return
        identifier = mention.url or mention.title
        if identifier and identifier not in seen_identifiers:
            seen_identifiers.add(identifier)
            # Only run sentiment analysis if mention is brand new or lacks sentiment
            if identifier not in existing_keys or not getattr(mention, "sentiment", None):
                mention = analyze_if_needed(mention)
            mentions.append(mention)

    sub_queries = active_queries

    # 1. YouTube
    try:
        for q in sub_queries:
            youtube_results = search_youtube(q, max_results=max(5, limit // len(sub_queries)))
            for item in youtube_results:
                add_mention(to_mention(item, "youtube"))
        print(f"YouTube collected ({len(mentions)} total so far)")
    except Exception as e:
        print(f"YouTube ERROR: {e}")

    # 2. News / Web (Decoded direct URLs)
    try:
        for q in sub_queries:
            news_results = search_news(q, max_results=max(5, limit // len(sub_queries)))
            for item in news_results:
                add_mention(to_mention(item, "news"))
        print(f"News collected ({len(mentions)} total so far)")
    except Exception as e:
        print(f"News ERROR: {e}")

    # 3. LinkedIn (Decoded direct URLs)
    try:
        for q in sub_queries[:2]:
            linkedin_results = search_linkedin(q, limit=max(5, limit // 2))
            for item in linkedin_results:
                add_mention(to_mention(item, "linkedin"))
        print(f"LinkedIn collected ({len(mentions)} total so far)")
    except Exception as e:
        print(f"LinkedIn ERROR: {e}")

    # 4. Reddit (Discussions & Complaints)
    try:
        for q in sub_queries:
            reddit_results = search_reddit(q, limit=max(5, limit // len(sub_queries)))
            for item in reddit_results:
                add_mention(to_mention(item, "reddit"))
        print(f"Reddit collected ({len(mentions)} total so far)")
    except Exception as e:
        print(f"Reddit ERROR: {e}")

    # 5. Bluesky
    try:
        for q in sub_queries[:2]:
            bluesky_results = search_bluesky(q, max_results=max(5, limit // 2))
            for item in bluesky_results:
                add_mention(to_mention(item, "bluesky"))
        print(f"Bluesky collected ({len(mentions)} total so far)")
    except Exception as e:
        print(f"Bluesky ERROR: {e}")

    # 6. HackerNews
    try:
        for q in sub_queries[:2]:
            hn_results = search_hackernews(q, limit=max(5, limit // 2))
            for item in hn_results:
                add_mention(to_mention(item, "hackernews"))
        print(f"HackerNews collected ({len(mentions)} total so far)")
    except Exception as e:
        print(f"HackerNews ERROR: {e}")

    # 7. MouthShut (Consumer Grievances & Reviews)
    try:
        for q in sub_queries[:2]:
            ms_results = search_mouthshut(q, limit=max(5, limit // 2))
            for item in ms_results:
                add_mention(to_mention(item, "mouthshut"))
        print(f"MouthShut collected ({len(mentions)} total so far)")
    except Exception as e:
        print(f"MouthShut ERROR: {e}")

    return mentions


if __name__ == "__main__":
    print("=" * 70)
    print("PURAVANKARA REPUTATION INTELLIGENCE")
    print("LIVE COLLECTION + ANALYSIS + EXPORT")
    print("=" * 70)

    results = collect_all("Puravankara")

    print()
    print("=" * 70)
    print(f"TOTAL MENTIONS PROCESSED: {len(results)}")
    print("=" * 70)

    export_mentions(results)
