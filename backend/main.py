import asyncio
import re
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


@app.middleware("http")
async def add_no_cache_header(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


def load_json(path: Path):
    if not path.exists():
        return []

    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except Exception as e:
        print(f"[Warning] Failed to read JSON from {path}: {e}")
        return []


import re

def classify_sentiment(item):
    if not isinstance(item, dict):
        return "neutral"

    text = f"{item.get('title', '')} {item.get('text', '')} {item.get('description', '')} {item.get('url', '')}".lower()

    # 1. Critical Business Threat / Legal Emergency / Financial Irregularities / Complaint Phrases
    # Checked FIRST to prevent misclassifying real grievances as neutral
    strong_neg_phrases = [
        "rera complaint", "rera notice", "rera penalty", "court case", "lawsuit",
        "legal notice", "legal dispute", "fir filed", "investigation", "fraud",
        "scam", "cheated", "embezzlement", "stalled project", "construction halt",
        "building collapse", "structural defect", "buyer protest", "water leakage issue",
        "severe delay", "penalty imposed", "breach of contract", "nclt", "insolvency",
        "paid and forgotten", "done waiting", "legally isn't", "water seepage",
        "basement leakage", "fee hike", "refund delay", "unresponsive crm", "handover delay",
        "occupancy certificate delay", "gst evasion", "tax evasion", "financial irregularities",
        "financial irregularity", "corruption", "negative review", "negative reviews",
        "frustrated buyer", "frustrated", "dont ignore negative", "don't ignore negative",
        "buyer beware", "rant", "dispute and maintenance", "poor construction", "substandard quality",
        "possession delay", "broken promise", "maintenance issue", "waterlogging",
        "construction snags", "delayed possession", "poor quality"
    ]
    if any(sn in text for sn in strong_neg_phrases):
        return "negative"

    # 2. Explicit sentiment string if present
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

    # 3. Explicit AI sentiment score if present
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

    # 4. Financial Turnaround, Leadership Appointments & Customer Satisfaction Positive Phrases
    strong_pos_phrases = [
        "profit at", "profit of", "posts profit", "profit turns positive",
        "turns positive", "profit swings", "revenue up", "revenue surges",
        "revenue surged", "ebitda margin expands", "net profit", "after last year's loss",
        "after loss", "from loss", "record sales", "strong demand", "expansion",
        "allotment of", "channel partner", "new launch", "unveiled", "show residence",
        "appreciation", "refined design", "prime location", "leadership spotlight",
        "has taken charge as", "has been appointed as", "elevated to", "promoted to",
        "executive appointment", "excellence leadership", "highly recommended",
        "seamless handover", "great construction", "quality finishing", "happy homeowner",
        "delighted with", "excellent amenities", "on time delivery", "smooth possession",
        "timely possession", "top notch quality", "best builder"
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

    # MouthShut is tracked as an informative consumer review label but excluded from executive reputation score calculation per specification
    scoring_parsed = [
        p for p in parsed
        if "mouthshut" not in str(p.get("source") or "").lower()
    ]
    scoring_total = len(scoring_parsed)
    pos_scoring = sum(1 for p in scoring_parsed if p["sentiment"] == "positive")
    neg_scoring = sum(1 for p in scoring_parsed if p["sentiment"] == "negative")

    net_sentiment = round(((pos_scoring - neg_scoring) / max(scoring_total, 1)) * 100, 1)
    reputation_score = max(0, min(100, round(50 + ((pos_scoring - neg_scoring) / max(scoring_total, 1)) * 50)))

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
        
        # Trigger real-time alert evaluation
        recs = [map_source_url(r) for r in load_json(REPUTATION_FILE) if is_puravankara_related(r)]
        process_emergency_alerts(recs)
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
        "sources": ["youtube", "news", "reddit", "linkedin", "bluesky", "hackernews", "mouthshut"],
        "records_collected": len(mentions),
        "per_source_limit": limit,
    }


# ==========================================
# Real-Time Background Autofetch Engine
# ==========================================
autofetch_state = {
    "is_running": False,
    "last_sync_time": datetime.now(timezone.utc).isoformat(),
    "last_records_collected": 0,
    "total_cycles": 0,
    "interval_seconds": 30,
    "error": None
}

_autofetch_lock = asyncio.Lock()


async def run_autofetch_cycle():
    """Runs a single live collection pass across all configured sources."""
    if _autofetch_lock.locked():
        return

    async with _autofetch_lock:
        autofetch_state["is_running"] = True
        try:
            from backend.collectors.pipeline import collect_all
            from backend.exporter import export_mentions

            new_mentions = await asyncio.to_thread(collect_all, None, 20)
            if new_mentions:
                await asyncio.to_thread(export_mentions, new_mentions)
                recs = [map_source_url(r) for r in load_json(REPUTATION_FILE) if is_puravankara_related(r)]
                process_emergency_alerts(recs)

            autofetch_state["last_sync_time"] = datetime.now(timezone.utc).isoformat()
            autofetch_state["last_records_collected"] = len(new_mentions) if new_mentions else 0
            autofetch_state["total_cycles"] += 1
            autofetch_state["error"] = None
        except Exception as e:
            autofetch_state["error"] = str(e)
            print(f"[Autofetch Worker Error]: {e}")
        finally:
            autofetch_state["is_running"] = False


async def autofetch_background_loop():
    """Continuous real-time background worker loop running every 60 seconds."""
    # Grace period on startup before the first run
    await asyncio.sleep(5)
    while True:
        try:
            await run_autofetch_cycle()
        except Exception as err:
            print(f"[Autofetch Loop Exception]: {err}")
        await asyncio.sleep(autofetch_state["interval_seconds"])


@app.on_event("startup")
async def startup_autofetch_worker():
    asyncio.create_task(autofetch_background_loop())


@app.get("/api/autofetch/status")
def get_autofetch_status():
    return {
        "status": "fetching" if autofetch_state["is_running"] else "active",
        "last_sync": autofetch_state["last_sync_time"],
        "records_last_cycle": autofetch_state["last_records_collected"],
        "total_cycles": autofetch_state["total_cycles"],
        "interval_seconds": autofetch_state["interval_seconds"],
        "error": autofetch_state["error"]
    }


CUSTOMER_TOUCHPOINT_KEYWORDS = [
    r'\bcustomer\b', r'\bbuyer\b', r'\bbuyers\b', r'\bresident\b', r'\bresidents\b',
    r'\bhomeowner\b', r'\bhomebuyer\b', r'\bhomebuyers\b', r'\bflat\b', r'\bflats\b',
    r'\bapartment\b', r'\bapartments\b', r'\bpossession\b', r'\bhandover\b',
    r'\bbooking\b', r'\brefund\b', r'\bcrm\b', r'\bservice\b', r'\bsupport\b',
    r'\bleakage\b', r'\bseepage\b', r'\bmaintenance\b', r'\bamenities\b',
    r'\bcomplaint\b', r'\bcomplaints\b', r'\bgrievance\b', r'\bgrievances\b',
    r'\bdelay\b', r'\bdelays\b', r'\bsnag\b', r'\bsnagging\b', r'\bwater supply\b',
    r'\blift\b', r'\bparking\b', r'\bclubhouse\b', r'\bworkmanship\b',
    r'\bcarpet area\b', r'\bpossession date\b', r'\ballotment\b'
]
CUSTOMER_TOUCHPOINT_PATTERN = re.compile('|'.join(CUSTOMER_TOUCHPOINT_KEYWORDS), re.IGNORECASE)

EXCLUDE_CORP_TERMS = [
    'appointed as', 'elevation to', 'elevated to', 'takes charge as',
    'financial results', 'investor presentation', 'ebitda', 'ncd',
    'bse filing', 'nse filing', 'board meeting', 'share price',
    'debenture', 'credit rating by care', 'credit rating by icra'
]

def is_customer_touchpoint(item):
    if not isinstance(item, dict):
        return False
    src = str(item.get("source") or "").lower()
    if "mouthshut" in src:
        return False
    if "comment" in src or "reddit" in src:
        return True

    title = str(item.get("title") or "")
    text = str(item.get("text") or item.get("description") or item.get("snippet") or "")
    combined = f"{title} {text}".lower()

    for ex in EXCLUDE_CORP_TERMS:
        if ex in combined and not any(k in combined for k in ['complaint', 'possession', 'handover', 'delay', 'buyer', 'resident']):
            return False

    return bool(CUSTOMER_TOUCHPOINT_PATTERN.search(combined))


@app.get("/api/analytics/metrics")
def get_executive_metrics():
    """
    Computes real-time executive reputation scores, net sentiment,
    risk index, and distinct customer satisfaction (CSAT) score.
    """
    reputation = [r for r in load_json(REPUTATION_FILE) if is_puravankara_related(r)]
    comments = [c for c in load_json(COMMENTS_FILE) if is_puravankara_related(c)]
    all_records = reputation + comments

    # MouthShut is tracked as an informative consumer review label but excluded from executive reputation score calculation per specification
    scoring_records = [
        r for r in all_records
        if "mouthshut" not in str(r.get("source") or "").lower()
    ]

    total = len(scoring_records)
    positive = sum(1 for r in scoring_records if classify_sentiment(r) == "positive")
    negative = sum(1 for r in scoring_records if classify_sentiment(r) == "negative")
    neutral = max(0, total - positive - negative)

    # Net Sentiment (-100% to +100%) computed on core reputation pool
    net_sentiment = round(((positive - negative) / max(total, 1)) * 100, 1)

    # Reputation Score (0 - 100) computed on core corporate brand & media reputation pool
    reputation_score = round(((positive + neutral * 0.5) / max(total, 1)) * 100)

    # Customer Satisfaction Score (CSAT: 0 - 100) evaluated strictly on verified resident & buyer touchpoints
    customer_records = [r for r in scoring_records if is_customer_touchpoint(r)]
    cust_total = len(customer_records)
    cust_positive = sum(1 for r in customer_records if classify_sentiment(r) == "positive")
    cust_negative = sum(1 for r in customer_records if classify_sentiment(r) == "negative")
    cust_neutral = max(0, cust_total - cust_positive - cust_negative)
    customer_satisfaction_score = round(((cust_positive + cust_neutral * 0.5) / max(cust_total, 1)) * 100)

    # Risk Score & Level
    alerts = process_emergency_alerts([map_source_url(r) for r in reputation])
    active_critical = [a for a in alerts if a.get("is_active") and a.get("severity") in ["critical", "high"]]
    active_critical_count = len(active_critical)

    neg_pct = (negative / max(total, 1)) * 100
    risk_score = min(100, round((neg_pct * 1.5) + (active_critical_count * 15) + (100 - reputation_score) * 0.2))

    if active_critical_count > 0 or neg_pct > 15 or reputation_score < 50:
        risk_level = "CRITICAL"
        risk_tone = "critical"
        risk_advice = "Immediate executive attention required"
    elif negative >= 3 or neg_pct > 7 or reputation_score < 70:
        risk_level = "MEDIUM"
        risk_tone = "watch"
        risk_advice = "Monitor negative feedback & construction grievances"
    else:
        risk_level = "LOW"
        risk_tone = "good"
        risk_advice = "Corporate brand equity stable"

    return {
        "reputation_score": reputation_score,
        "net_sentiment": net_sentiment,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_tone": risk_tone,
        "risk_advice": risk_advice,
        "customer_satisfaction_score": customer_satisfaction_score,
        "customer_metrics": {
            "total_touchpoints": cust_total,
            "positive": cust_positive,
            "neutral": cust_neutral,
            "negative": cust_negative
        },
        "counts": {
            "total": total,
            "positive": positive,
            "neutral": neutral,
            "negative": negative,
            "active_alerts": active_critical_count
        },
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

