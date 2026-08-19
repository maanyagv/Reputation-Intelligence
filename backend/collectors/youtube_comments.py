import os
import requests
from dotenv import load_dotenv

load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")


def get_video_comments(video_id, limit=20):
    """
    Collect public comments from a YouTube video.
    """

    if not YOUTUBE_API_KEY:
        raise ValueError("YOUTUBE_API_KEY is missing from .env")

    url = "https://www.googleapis.com/youtube/v3/commentThreads"

    params = {
        "part": "snippet",
        "videoId": video_id,
        "maxResults": limit,
        "order": "relevance",
        "textFormat": "plainText",
        "key": YOUTUBE_API_KEY,
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    data = response.json()

    comments = []

    for item in data.get("items", []):
        snippet = item["snippet"]["topLevelComment"]["snippet"]

        comments.append({
            "author": snippet.get("authorDisplayName"),
            "text": snippet.get("textDisplay"),
            "published_at": snippet.get("publishedAt"),
            "like_count": snippet.get("likeCount", 0),
        })

    return comments


if __name__ == "__main__":
    # Test with one of the videos already collected
    video_id = "a3Q6B9kVyWw"

    results = get_video_comments(video_id, 10)

    print("=" * 70)
    print("YOUTUBE COMMENTS")
    print("=" * 70)

    print(f"Comments collected: {len(results)}")

    for i, comment in enumerate(results, 1):
        print()
        print(f"[{i}]")
        print("AUTHOR :", comment["author"])
        print("TEXT   :", comment["text"])
        print("LIKES  :", comment["like_count"])
        print("DATE   :", comment["published_at"])