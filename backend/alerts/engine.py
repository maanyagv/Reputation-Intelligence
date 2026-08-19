import json
import uuid
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
    with open(ALERTS_FILE, "w", encoding="utf-8") as f:
        json.dump(alerts, f, indent=2, ensure_ascii=False)

def process_emergency_alerts(records):
    """
    Scans records STRICTLY for negative reputation signals (sentiment == 'negative'),
    creates alerts that stay active for AT LEAST 1 HOUR (3600 seconds), and saves alert messages.
    Positive and neutral records are NEVER saved as alerts.
    """
    existing_alerts = load_alerts()

    # STRICT PURGE: Only keep alerts that belong to genuine negative records
    cleaned_existing = []
    for a in existing_alerts:
        rec = a.get("record") or {}
        raw = str(rec.get("sentiment") or "").strip().lower()
        if raw == "negative" or raw == "neg":
            cleaned_existing.append(a)

    existing_alerts = cleaned_existing

    existing_urls = {a.get("url") for a in existing_alerts if a.get("url")}
    existing_titles = {a.get("title") for a in existing_alerts if a.get("title")}

    now_dt = datetime.now(timezone.utc)

    for record in records:
        title = record.get("title") or "Puravankara Risk Signal"
        text = record.get("text") or record.get("description") or ""
        raw = str(record.get("sentiment") or "").strip().lower()
        score = record.get("sentiment_score")

        is_negative = (raw == "negative" or raw == "neg")
        if not is_negative and score is not None:
            try:
                if float(score) < -0.05:
                    is_negative = True
            except Exception:
                pass

        # STRICT NEGATIVE FILTER: Record MUST be negative
        if not is_negative:
            continue

        if url not in existing_urls if url else title not in existing_titles:
            detected_at = now_dt.isoformat()
            expires_at = (now_dt + timedelta(hours=1)).isoformat()

            alert_id = f"alert-{uuid.uuid4().hex[:8]}"
            alert_msg = (
                f"🚨 REPUTATION ALERT [{source.upper()}]: '{title}'. "
                f"Negative signal flagged for immediate CRM & Executive PR review. "
                f"Alert active for 1 hour (Expires: {expires_at[:19].replace('T', ' ')} UTC)."
            )

            alert_obj = {
                "id": alert_id,
                "title": f"NEGATIVE ALERT: {title}",
                "issue": title,
                "source": source,
                "severity": "CRITICAL_EMERGENCY",
                "detected_at": detected_at,
                "expires_at": expires_at,
                "duration_seconds": 3600,
                "is_active": True,
                "message": alert_msg,
                "url": url,
                "record": record
            }

            existing_alerts.insert(0, alert_obj)
            existing_urls.add(url)
            existing_titles.add(title)

    # Update active status based on 1-hour expiration window
    for alert in existing_alerts:
        try:
            exp_str = alert.get("expires_at", "")
            if exp_str:
                exp_dt = datetime.fromisoformat(exp_str.replace("Z", "+00:00"))
                alert["is_active"] = now_dt < exp_dt
        except Exception:
            alert["is_active"] = True

    save_alerts(existing_alerts)
    return existing_alerts

def delete_alert(alert_id):
    alerts = load_alerts()
    alerts = [a for a in alerts if a.get("id") != alert_id]
    save_alerts(alerts)
    return alerts
