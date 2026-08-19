import json
import os

from backend.collectors.youtube_comments import get_video_comments
from backend.ai.comment_analyzer import analyze_comment


def extract_video_id(url):
    """Extract YouTube video ID from a standard watch URL."""

    if not url:
        return None

    if "v=" in url:
        return url.split("v=")[1].split("&")[0]

    return None


def process_comments(video_url, limit=20):
    """
    Collect and analyze comments for one YouTube video.
    """

    video_id = extract_video_id(video_url)

    if not video_id:
        print(f"Could not extract video ID from: {video_url}")
        return []

    print(f"Collecting comments for video: {video_id}")

    comments = get_video_comments(video_id, limit)

    analyzed_comments = []

    for i, comment in enumerate(comments, 1):
        print(f"Analyzing comment {i}/{len(comments)}...")

        try:
            analyzed = analyze_comment(comment)
            analyzed_comments.append(analyzed)

        except Exception as e:
            print(f"Comment analysis ERROR: {e}")

    return analyzed_comments


def save_comments(comments, filename="backend/data/comments/comments.json"):
    """Save analyzed comments to JSON."""

    os.makedirs(os.path.dirname(filename), exist_ok=True)

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(comments, f, indent=2, ensure_ascii=False)

    print()
    print("=" * 70)
    print(f"Saved {len(comments)} analyzed comments to:")
    print(filename)
    print("=" * 70)


if __name__ == "__main__":

    test_video_url = (
        "https://www.youtube.com/watch?v=a3Q6B9kVyWw"
    )

    print("=" * 70)
    print("PURAVANKARA YOUTUBE COMMENT INTELLIGENCE")
    print("COLLECT + GEMINI SENTIMENT ANALYSIS")
    print("=" * 70)

    comments = process_comments(
        test_video_url,
        limit=10
    )

    save_comments(comments)

    print()

    for i, comment in enumerate(comments, 1):
        print(f"[{i}]")
        print("AUTHOR     :", comment.get("author"))
        print("TEXT       :", comment.get("text"))
        print("LIKES      :", comment.get("like_count"))
        print("SENTIMENT  :", comment.get("sentiment"))
        print("SCORE      :", comment.get("sentiment_score"))
        print("RELEVANCE  :", comment.get("relevance_score"))
        print()