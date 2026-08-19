from backend.collectors.youtube import search_youtube
from backend.ai.analyzer import analyze_mention


def run_pipeline():
    print("\n" + "=" * 70)
    print("PURAVANKARA REPUTATION INTELLIGENCE")
    print("=" * 70)

    print("\nSearching YouTube...")
    mentions = search_youtube("Puravankara", 5)

    print(f"Found {len(mentions)} YouTube mentions.\n")

    analyzed = []

    for i, mention in enumerate(mentions, start=1):
        print(f"Analyzing {i}/{len(mentions)}: {mention.title}")

        try:
            result = analyze_mention(mention)
            analyzed.append(result)

            print(f"  Sentiment : {result.sentiment}")
            print(f"  Score     : {result.sentiment_score}")
            print(f"  Relevance : {result.relevance_score}")
            print(f"  Channel   : {result.author}")
            print(f"  URL       : {result.url}")
            print()

        except Exception as e:
            print(f"  ERROR: {e}")
            print()

    print("=" * 70)
    print(f"Completed: {len(analyzed)}/{len(mentions)} analyzed")
    print("=" * 70)

    return analyzed


if __name__ == "__main__":
    run_pipeline()