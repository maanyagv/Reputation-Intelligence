import os
import feedparser
import requests
from datetime import datetime
from urllib.parse import quote
from dotenv import load_dotenv

from backend.models.mention import Mention

load_dotenv()

try:
    from googlenewsdecoder import new_decoderv1
except ImportError:
    new_decoderv1 = None


def decode_url(raw_url):
    """
    Decodes Google News RSS link to actual direct article URL with strict 2.0s timeout.
    """
    if not raw_url:
        return ""
    if "news.google.com" not in raw_url:
        return raw_url
    if new_decoderv1:
        try:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(new_decoderv1, raw_url, interval=0.2)
                res = future.result(timeout=2.0)
                if isinstance(res, dict) and res.get("status") and res.get("decoded_url"):
                    return res["decoded_url"]
                elif isinstance(res, str) and res.startswith("http"):
                    return res
        except Exception:
            pass
    return raw_url


from backend.utils.relevance import is_puravankara_related

def search_news(query="Puravankara", max_results=20):
    """
    Fetches real news articles using Google News RSS (with URL decoding)
    and NewsAPI if available, filtering STRICTLY for Puravankara relevance.
    """
    mentions = []
    seen_urls = set()

    # 1. Fetch from NewsAPI if key is available
    news_api_key = os.getenv("NEWS_API_KEY")
    if news_api_key:
        try:
            api_url = (
                f"https://newsapi.org/v2/everything"
                f"?q={quote(query)}"
                f"&language=en"
                f"&sortBy=publishedAt"
                f"&pageSize={min(max_results * 2, 40)}"
                f"&apiKey={news_api_key}"
            )
            resp = requests.get(api_url, timeout=10)
            if resp.status_code == 200:
                articles = resp.json().get("articles", [])
                for art in articles:
                    url = art.get("url", "")
                    if url and url not in seen_urls:
                        pub_at = None
                        if art.get("publishedAt"):
                            try:
                                pub_at = datetime.fromisoformat(art["publishedAt"].replace("Z", "+00:00"))
                            except Exception:
                                pass

                        cand = Mention(
                            source="newsapi",
                            title=art.get("title", ""),
                            text=art.get("description", art.get("content", "")),
                            url=url,
                            author=art.get("source", {}).get("name", "News"),
                            published_at=pub_at,
                        )
                        if is_puravankara_related(cand):
                            seen_urls.add(url)
                            mentions.append(cand)
                            if len(mentions) >= max_results:
                                break
        except Exception as e:
            print(f"NewsAPI collector warning: {e}")

    # 2. Fetch from Google News RSS with live decoding
    if len(mentions) < max_results:
        encoded_query = quote(query)
        rss_url = (
            "https://news.google.com/rss/search"
            f"?q={encoded_query}"
            "&hl=en-IN"
            "&gl=IN"
            "&ceid=IN:en"
        )
        try:
            feed = feedparser.parse(rss_url)
            for entry in feed.entries:
                if len(mentions) >= max_results:
                    break

                raw_link = entry.get("link", "")
                direct_url = decode_url(raw_link)

                if direct_url and direct_url not in seen_urls:
                    published_at = None
                    if getattr(entry, "published_parsed", None):
                        try:
                            published_at = datetime(*entry.published_parsed[:6])
                        except Exception:
                            pass

                    author = (
                        entry.get("source", {}).get("title")
                        if isinstance(entry.get("source"), dict)
                        else "Google News"
                    )

                    mention = Mention(
                        source="google_news",
                        title=entry.get("title", ""),
                        text=entry.get("summary", ""),
                        url=direct_url,
                        author=author,
                        published_at=published_at,
                    )
                    if is_puravankara_related(mention):
                        seen_urls.add(direct_url)
                        mentions.append(mention)
        except Exception as e:
            print(f"Google News RSS collector warning: {e}")

    return mentions


if __name__ == "__main__":
    results = search_news("Puravankara", 5)
    print("=" * 70)
    print(f"NEWS RESULTS: {len(results)}")
    print("=" * 70)
    for mention in results:
        print()
        print("TITLE   :", mention.title)
        print("SOURCE  :", mention.author)
        print("DATE    :", mention.published_at)
        print("URL     :", mention.url)