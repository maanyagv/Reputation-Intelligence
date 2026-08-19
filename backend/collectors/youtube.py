import os
from datetime import datetime

from dotenv import load_dotenv
from googleapiclient.discovery import build

from backend.models.mention import Mention


load_dotenv()


def search_youtube(query="Puravankara", max_results=50):
    api_key = os.getenv("YOUTUBE_API_KEY")

    if not api_key:
        raise RuntimeError("YOUTUBE_API_KEY is missing from .env")

    youtube = build(
        "youtube",
        "v3",
        developerKey=api_key
    )

    response = (
        youtube.search()
        .list(
            q=query,
            part="snippet",
            type="video",
            maxResults=max_results,
            order="date",
        )
        .execute()
    )

    mentions = []

    for item in response.get("items", []):
        snippet = item["snippet"]

        video_id = item["id"]["videoId"]

        published_at = None

        if snippet.get("publishedAt"):
            published_at = datetime.fromisoformat(
                snippet["publishedAt"].replace("Z", "+00:00")
            )

        mention = Mention(
            source="youtube",
            title=snippet.get("title", ""),
            text=snippet.get("description", ""),
            url=f"https://www.youtube.com/watch?v={video_id}",
            author=snippet.get("channelTitle"),
            published_at=published_at,
        )

        mentions.append(mention)

    return mentions


if __name__ == "__main__":
    results = search_youtube("Puravankara", 5)

    for mention in results:
        print("=" * 70)
        print(mention.to_dict())
