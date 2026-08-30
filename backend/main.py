from pathlib import Path
import json
import email.utils
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware


BASE_DIR = Path(__file__).resolve().parent
REPUTATION_FILE = BASE_DIR / "data" / "reputation.json"
COMMENTS_FILE = BASE_DIR / "data" / "comments" / "comments.json"


app = FastAPI(
    title="Puravankara Reputation Intelligence API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_json(path: Path):
    if not path.exists():
        return []

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


import re

def classify_sentiment(item):
    if not isinstance(item, dict):
        return "neutral"

    # 1. Explicit sentiment string if present
    raw = str(
        item.get("sentiment") or
        item.get("sentiment_label") or
        item.get("sentiment_class") or
        ""
    ).strip().lower()

    if raw in ["positive", "pos"]:
        return "positive"
    if raw in ["negative", "neg"]:
        return "negative"
    if raw in ["neutral", "neu"]:
        return "neutral"

    # 2. Explicit AI sentiment score if present
    score = item.get("sentiment_score")
    if score is None:
        score = item.get("sentimentScore")
    if score is None:
        score = item.get("score")

    if score is not None and str(score) != "None":
        try:
            val = float(score)
            if val > 0.05:
                return "positive"
            elif val < -0.05:
                return "negative"
            else:
                return "neutral"
        except (ValueError, TypeError):
            pass

    text = f"{item.get('title', '')} {item.get('text', '')} {item.get('description', '')}".lower()

    # 3. Critical Business Threat / Legal Emergency / Complaint Phrases
    strong_neg_phrases = [
        "rera complaint", "rera notice", "rera penalty", "court case", "lawsuit",
        "legal notice", "legal dispute", "fir filed", "investigation", "fraud",
        "scam", "cheated", "embezzlement", "stalled project", "construction halt",
        "building collapse", "structural defect", "buyer protest", "water leakage issue",
        "severe delay", "penalty imposed", "breach of contract", "nclt", "insolvency",
        "paid and forgotten", "done waiting", "legally isn't", "water seepage",
        "basement leakage", "fee hike", "refund delay", "unresponsive crm", "handover delay",
        "occupancy certificate delay"
    ]
    if any(sn in text for sn in strong_neg_phrases):
        return "negative"

    # 4. Financial Turnaround & Strong Positive Context Phrases
    strong_pos_phrases = [
        "profit at", "profit of", "posts profit", "profit turns positive",
        "turns positive", "profit swings", "revenue up", "revenue surges",
        "revenue surged", "ebitda margin expands", "net profit", "after last year's loss",
        "after loss", "from loss", "record sales", "strong demand", "expansion",
        "allotment of", "channel partner", "new launch", "unveiled", "show residence",
        "appreciation", "refined design", "prime location"
    ]
    if any(sp in text for sp in strong_pos_phrases):
        return "positive"

    # 5. Keyword balance analysis with exact word boundaries
    neg_kw = [
        'delay', 'complaint', 'court', 'rera', 'legal', 'expensive', 'defect', 'leakage',
        'seepage', 'fraud', 'scam', 'penalty', 'violation', 'lawsuit', 'stuck', 'protest',
        'cheated', 'halt', 'stalled', 'bad', 'worst', 'poor', 'disappointed', 'cancelling',
        'refund', 'dispute', 'hike'
    ]
    pos_kw = [
        'profit', 'surged', 'surges', 'growth', 'gains', 'best', 'premium', 'great',
        'luxury', 'excellent', 'top', 'launch', 'successful', 'reward', 'award', 'leader'
    ]

    neg_hits = sum(1 for k in neg_kw if re.search(r'\b' + re.escape(k) + r'\b', text))
    pos_hits = sum(1 for k in pos_kw if re.search(r'\b' + re.escape(k) + r'\b', text))

    if pos_hits > neg_hits:
        return "positive"
    if neg_hits > pos_hits:
        return "negative"
    if pos_hits > 0 and neg_hits == 0:
        return "positive"
    if neg_hits > 0 and pos_hits == 0:
        return "negative"

    return "neutral"


def parse_timestamp(item):
    raw = item.get("published_at") or item.get("created_at") or item.get("date") or ""
    if not raw:
        return 0.0
    try:
        if "GMT" in str(raw):
            dt = email.utils.parsedate_to_datetime(str(raw))
        else:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return dt.timestamp()
    except Exception:
        return 0.0


from backend.alerts.engine import process_emergency_alerts, load_alerts, delete_alert
from backend.utils.relevance import is_puravankara_related


def is_valid_source_url(url):
    if not url or not isinstance(url, str):
        return False
    u = url.strip()
    if not (u.lower().startswith('http://') or u.lower().startswith('https://')):
        return False

    # Reject actual search query pages, but accept direct article, video, social, and news URLs
    search_patterns = [
        'google.com/search?', 'reddit.com/search?', 'youtube.com/results?', 'linkedin.com/search?'
    ]
    u_lower = u.lower()
    if any(pat in u_lower for pat in search_patterns):
        return False

    return True


def map_source_url(item):
    if not isinstance(item, dict):
        return item
    raw_url = str(
        item.get("sourceUrl") or
        item.get("url") or
        item.get("link") or
        item.get("source_url") or
        item.get("articleUrl") or
        item.get("permalink") or
        item.get("externalUrl") or
        item.get("originalUrl") or
        ""
    ).strip()

    if is_valid_source_url(raw_url):
        item["sourceUrl"] = raw_url
        item["url"] = raw_url
    else:
        item["sourceUrl"] = None
        item["url"] = None
    return item


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "Puravankara Reputation Intelligence API",
    }


@app.get("/api/reputation")
def get_reputation():
    records = load_json(REPUTATION_FILE)
    records = [map_source_url(r) for r in records if is_puravankara_related(r)]
    process_emergency_alerts(records)
    return records


@app.get("/api/alerts")
def get_alerts():
    records = load_json(REPUTATION_FILE)
    records = [map_source_url(r) for r in records if is_puravankara_related(r)]
    alerts = process_emergency_alerts(records)
    active_alerts = [a for a in alerts if a.get("is_active") and is_puravankara_related(a.get("record") or a)]
    return {
        "active_alerts": active_alerts,
        "all_alerts": alerts,
        "active_count": len(active_alerts)
    }


@app.delete("/api/alerts/{alert_id}")
def delete_alert_endpoint(alert_id: str):
    updated = delete_alert(alert_id)
    active_alerts = [a for a in updated if a.get("is_active")]
    return {
        "status": "ok",
        "deleted": alert_id,
        "active_alerts": active_alerts,
        "all_alerts": updated,
        "active_count": len(active_alerts)
    }


@app.get("/api/comments")
def get_comments():
    comments = load_json(COMMENTS_FILE)
    return [map_source_url({**c, "sentiment": classify_sentiment(c)}) for c in comments if is_puravankara_related(c)]


@app.get("/api/mentions")
def get_mentions():
    reputation = [map_source_url(r) for r in load_json(REPUTATION_FILE) if is_puravankara_related(r)]
    comments = [map_source_url(c) for c in load_json(COMMENTS_FILE) if is_puravankara_related(c)]

    return {
        "reputation": reputation,
        "comments": comments,
    }


@app.get("/api/analytics/sentiment")
def get_sentiment_analytics(
    from_time: Optional[float] = None,
    to_time: Optional[float] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    source: Optional[str] = None,
    sentiment: Optional[str] = None,
    granularity: str = Query("day", pattern="^(hour|day|week|month)$"),
):
    reputation = [r for r in load_json(REPUTATION_FILE) if is_puravankara_related(r)]
    comments = [c for c in load_json(COMMENTS_FILE) if is_puravankara_related(c)]
    all_records = reputation + comments

    parsed = []
    for item in all_records:
        ts = parse_timestamp(item)
        item_source = str(item.get("source") or "Other").capitalize()
        s_class = classify_sentiment(item)

        if from_time and ts < from_time:
            continue
        if to_time and ts > to_time:
            continue
        if source and source.lower() != "all" and item_source.lower() != source.lower():
            continue
        if sentiment and sentiment.lower() != "all" and s_class.lower() != sentiment.lower():
            continue

        if ts > 0:
            dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            if year and dt.year != year:
                continue
            if month and dt.month != month:
                continue

        parsed.append({
            "raw": item,
            "timestamp": ts,
            "source": item_source,
            "sentiment": s_class,
        })

    total = len(parsed)
    positive = sum(1 for p in parsed if p["sentiment"] == "positive")
    negative = sum(1 for p in parsed if p["sentiment"] == "negative")
    neutral = sum(1 for p in parsed if p["sentiment"] == "neutral")

    net_sentiment = round(((positive - negative) / max(total, 1)) * 100, 1)
    reputation_score = max(0, min(100, round(50 + ((positive - negative) / max(total, 1)) * 50)))

    parsed_with_time = [p for p in parsed if p["timestamp"] > 0]
    parsed_with_time.sort(key=lambda x: x["timestamp"])

    points = []
    if parsed_with_time:
        min_t = parsed_with_time[0]["timestamp"]
        max_t = parsed_with_time[-1]["timestamp"]
        span = max(max_t - min_t, 3600)

        num_buckets = 5 if granularity in ["day", "week"] else 6
        for i in range(num_buckets):
            cutoff = min_t + ((i + 1) / num_buckets) * span
            sub = [p for p in parsed_with_time if p["timestamp"] <= cutoff]
            sub_tot = len(sub)
            sub_pos = sum(1 for p in sub if p["sentiment"] == "positive")
            sub_neg = sum(1 for p in sub if p["sentiment"] == "negative")
            sub_neu = sum(1 for p in sub if p["sentiment"] == "neutral")

            d_obj = datetime.fromtimestamp(cutoff, tz=timezone.utc)
            if granularity == "hour":
                f_date = d_obj.strftime("%H:00")
            elif granularity == "month":
                f_date = d_obj.strftime("%b %Y")
            else:
                f_date = d_obj.strftime("%b %d")

            points.append({
                "timestamp": cutoff,
                "formatted_date": f_date,
                "positive": sub_pos,
                "neutral": sub_neu,
                "negative": sub_neg,
                "total": sub_tot,
            })

    source_counts = {}
    for p in parsed:
        s = p["source"]
        source_counts[s] = source_counts.get(s, 0) + 1

    sources_list = [
        {"name": s, "count": cnt, "percentage": round((cnt / max(total, 1)) * 100, 1)}
        for s, cnt in sorted(source_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    return {
        "total": total,
        "positive": positive,
        "neutral": neutral,
        "negative": negative,
        "net_sentiment": net_sentiment,
        "reputation_score": reputation_score,
        "granularity": granularity,
        "points": points,
        "sources": sources_list,
    }


@app.post("/api/refresh")
def refresh_reputation_feed(limit: int = 50):
    """Collect the latest available results from every configured source."""
    limit = max(1, min(limit, 50))

    try:
        from backend.collectors.pipeline import collect_all
        from backend.exporter import export_mentions

        mentions = collect_all(limit=limit)
        export_mentions(mentions)
    except ModuleNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "Feed collection dependencies are missing. "
                "Install the project requirements before refreshing."
            ),
        ) from error

    return {
        "status": "ok",
        "sources": ["youtube", "news", "reddit", "linkedin", "bluesky", "hackernews"],
        "records_collected": len(mentions),
        "per_source_limit": limit,
    }
