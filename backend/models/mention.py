from dataclasses import dataclass
from typing import Optional


@dataclass
class Mention:
    source: str
    title: str
    text: str
    url: str

    author: Optional[str] = None
    published_at: Optional[object] = None

    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    relevance_score: Optional[float] = None

    def to_dict(self):
        if self.published_at is None:
            published_at = None

        elif hasattr(self.published_at, "isoformat"):
            published_at = self.published_at.isoformat()

        else:
            published_at = str(self.published_at)

        return {
            "source": self.source,
            "title": self.title,
            "text": self.text,
            "url": self.url,
            "author": self.author,
            "published_at": published_at,
            "sentiment": self.sentiment,
            "sentiment_score": self.sentiment_score,
            "relevance_score": self.relevance_score,
        }