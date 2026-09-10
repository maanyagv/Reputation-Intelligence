import json
import uuid
import html
from pathlib import Path
from datetime import datetime, timezone, timedelta

ALERTS_FILE = Path(__file__).resolve().parent.parent / "data" / "alerts.json"

def load_alerts():
    if not ALERTS_FILE.exists():
        return []
    try:
        with open(ALERTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading alerts: {e}")
        return []

def save_alerts(alerts):
    ALERTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp_file = ALERTS_FILE.with_suffix(".tmp")
    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(alerts, f, indent=2, ensure_ascii=False)
    tmp_file.replace(ALERTS_FILE)

def is_major_critical_alert(record):
    if not isinstance(record, dict):
        return False

    raw_sentiment = str(record.get("sentiment") or "").strip().lower()
    score = record.get("sentiment_score")

    # If the record is classified as positive, it is never an alert
    if raw_sentiment == "positive" or (score is not None and float(score) > 0.05):
        return False

    title = str(record.get("title") or "")
    text = str(record.get("text") or record.get("description") or "")
    combined = f"{title} {text}".lower()

    # 1. Ignore routine promotional, marketing, and sales listing items
    ignore_promotional = [
        "bhk", "for sale", "channel partner", "walkthrough", "tour", "project launch",
        "quarterly results", "demat", "stock price", "unveiled", "allotment", "brochure",
        "inaugurated", "show residence"
    ]

    # 1b. Ignore executive leadership appointments, career milestones, and promotions
    ignore_leadership = [
        "leadership spotlight", "has taken charge as", "has been elevated to",
        "appointed as", "joins puravankara", "new leadership", "career milestone",
        "quality governance", "engineering excellence"
    ]
    if any(lp in combined for lp in ignore_leadership):
        return False

    # If it's promotional and contains no critical threat keywords, do not treat as emergency
    has_critical_keyword = any(k in combined for k in [
        "rera", "lawsuit", "court", "fraud", "scam", "fir", "penalty", "penalties", "defect",
        "stalled", "protest", "nclt", "insolvency", "collapse", "cheated", "leakage",
        "complaint", "seepage", "delay", "snags", "grievance", "dispute",
        "frustrated", "negative review", "negative reviews", "unresponsive", "buyer beware",
        "evasion", "gst evasion", "tax evasion", "irregularities", "corruption"
    ])

    if any(p in combined for p in ignore_promotional) and not has_critical_keyword:
        return False

    # 2. Explicit High-Stake Emergency Keywords (Legal, Regulatory, Fraud, Severe Defects, Major Halts)
    high_stake_keywords = [
        "rera complaint", "rera notice", "rera penalty", "court case", "lawsuit",
        "legal notice", "legal dispute", "fir filed", "investigation", "fraud",
        "scam", "cheated", "embezzlement", "stalled project", "construction halt",
        "building collapse", "structural defect", "buyer protest", "nclt", "insolvency",
        "penalty imposed", "breach of contract", "water leakage issue", "severe delay",
        "customer complaint", "poor construction quality", "substandard construction",
        "construction quality issues", "construction quality complaints", "construction snags", "water seepage",
        "unresponsive crm", "frustrated buyer", "negative reviews", "dont ignore negative", "don't ignore negative",
        "gst evasion", "tax evasion", "financial irregularities", "corruption"
    ]

    if any(kw in combined for kw in high_stake_keywords):
        return True

    # 3. High severity AI negative sentiment score threshold (score <= -0.6)
    raw_sentiment = str(record.get("sentiment") or "").strip().lower()
    score = record.get("sentiment_score")

    if raw_sentiment == "negative" and score is not None:
        try:
            if float(score) <= -0.6 and has_critical_keyword:
                return True
        except (ValueError, TypeError):
            pass

    return False

def process_emergency_alerts(records):
    """
    Scans records STRICTLY for HIGH-STAKE EMERGENCY ALERTS (RERA notices, lawsuits,
    fraud/scams, structural defects, buyer protests, NCLT/insolvency).
    Routine negative posts or promotional videos are NOT saved.
    """
    existing_alerts = load_alerts()

    # Keep existing saved alerts ONLY if they meet the strict high-stake emergency criteria
    existing_alerts = [a for a in existing_alerts if is_major_critical_alert(a.get("record") or a)]

    existing_urls = {a.get("url") for a in existing_alerts if a.get("url")}
    existing_titles = {a.get("issue") or a.get("title") for a in existing_alerts if a.get("issue") or a.get("title")}

    now_dt = datetime.now(timezone.utc)

    for record in records:
        raw_title = record.get("title") or "Puravankara Risk Signal"
        title = html.unescape(raw_title).strip()
        url = record.get("url") or ""
        source = str(record.get("source") or "web").capitalize()

        if not is_major_critical_alert(record):
            continue

        if (url and url not in existing_urls) or (not url and title not in existing_titles):
            detected_at = now_dt.isoformat()
            expires_at = (now_dt + timedelta(days=7)).isoformat()

            alert_id = f"alert-{uuid.uuid4().hex[:8]}"
            alert_msg = html.unescape(
                f"🚨 HIGH-STAKE EMERGENCY ALERT [{source.upper()}]: '{title}'. "
                f"Critical risk signal flagged for immediate CRM & Executive PR review."
            )

            clean_rec = dict(record)
            clean_rec["title"] = title

            alert_obj = {
                "id": alert_id,
                "title": f"EMERGENCY ALERT: {title}",
                "issue": title,
                "source": source,
                "severity": "CRITICAL_EMERGENCY",
                "detected_at": detected_at,
                "expires_at": expires_at,
                "duration_seconds": 604800,
                "is_active": True,
                "message": alert_msg,
                "url": url,
                "record": clean_rec
            }

            existing_alerts.insert(0, alert_obj)
            if url:
                existing_urls.add(url)
            existing_titles.add(title)

    # Update active status
    for alert in existing_alerts:
        try:
            exp_str = alert.get("expires_at", "")
            if exp_str:
                exp_dt = datetime.fromisoformat(exp_str.replace("Z", "+00:00"))
                if now_dt < exp_dt:
                    alert["is_active"] = True
                else:
                    # Automatically refresh active emergency alerts for active records
                    alert["expires_at"] = (now_dt + timedelta(days=7)).isoformat()
                    alert["is_active"] = True
            else:
                alert["is_active"] = True
        except Exception:
            alert["is_active"] = True

    save_alerts(existing_alerts)
    return existing_alerts

def delete_alert(alert_id):
    alerts = load_alerts()
    alerts = [a for a in alerts if a.get("id") != alert_id]
    save_alerts(alerts)
    return alerts
