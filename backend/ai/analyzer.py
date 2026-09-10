import os
import json
import re
from dotenv import load_dotenv
from google import genai

from backend.models.mention import Mention

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None


def is_person_profile(text: str) -> bool:
    t = text.lower()
    role_phrases = [
        "senior legal manager", "legal manager", "general manager", "deputy manager",
        "assistant general manager", "chief financial officer", "chief executive officer",
        "managing director", "vice president", "avp -", "sr. manager", "senior manager",
        "deputy sales manager", "crm deputy manager", "contracts manager", "quality manager",
        "senior engineer", "project manager", "marketing manager", "brand marketing",
        "human capital", "head of", "lead -", "counsel", "advocate", "gold medalist",
        "rank 1", "college of law", "kslu", "pmp", "ll.b", "llm", "alumni", "alumnus",
        "alumna", "expertise in consumer", "litigation & dispute resolution",
        "real estate litigation"
    ]
    if any(rp in t for rp in role_phrases):
        return True
    if (" | " in text or " - " in text) and any(r in t for r in [
        "manager", "director", "counsel", "lead", "officer", "vp", "engineer", "advocate", "specialist", "analyst"
    ]):
        return True
    return False


def fallback_analysis(mention: Mention) -> Mention:
    """
    Fast rule-based reputation intelligence analyzer fallback if Gemini API is unavailable or rate-limited.
    """
    raw_text = f"{mention.title or ''} {mention.text or ''}"
    text = raw_text.lower()

    # 0. Individual Employee Profiles, Resumes & Legal Credentials are NEVER Negative
    if is_person_profile(raw_text):
        pos_accolades = [
            "gold medalist", "rank 1", "excellence", "merit", "promoted", "elevated",
            "appointed", "taken charge", "leadership", "senior legal manager", "general manager"
        ]
        if any(pa in text for pa in pos_accolades):
            mention.sentiment = "positive"
            mention.sentiment_score = 0.70
        else:
            mention.sentiment = "neutral"
            mention.sentiment_score = 0.0
        mention.relevance_score = 1.0
        return mention

    # 1. Critical Legal/Regulatory/Threat & Customer Grievance Negative
    strong_neg = [
        "rera complaint", "rera notice", "rera penalty", "court case", "lawsuit",
        "legal notice", "legal dispute", "fir filed", "investigation", "fraud",
        "scam", "cheated", "embezzlement", "stalled project", "construction halt",
        "building collapse", "structural defect", "buyer protest", "water leakage",
        "severe delay", "penalty imposed", "breach of contract", "unresponsive crm",
        "negative review", "negative reviews", "frustrated buyer", "frustrated",
        "dont ignore negative", "don't ignore negative", "not interested in answering",
        "buyer beware", "rant", "gst evasion", "tax evasion", "financial irregularities",
        "financial irregularity", "corruption", "water seepage", "basement leakage",
        "structural audit", "handover delay", "refund delay", "lowest level of integrity",
        "dispute and maintenance", "poor construction", "substandard quality",
        "possession delay", "broken promise", "maintenance issue", "waterlogging",
        "construction snags", "delayed possession", "poor quality"
    ]
    if any(sn in text for sn in strong_neg):
        mention.sentiment = "negative"
        mention.sentiment_score = -0.85
        mention.relevance_score = 1.0
        return mention

    # 2. Financial Turnaround / Expansion / Customer Delight / Leadership Milestones / Regulatory Approvals Positive
    strong_pos = [
        "profit at", "profit of", "posts profit", "profit turns positive",
        "turns positive", "revenue up", "revenue surges", "surged",
        "ebitda margin expands", "net profit", "record sales", "strong demand",
        "expansion", "allotment of", "new launch", "unveiled", "contract win", "bags order",
        "leadership spotlight", "has taken charge as", "has been appointed as",
        "elevated to", "promoted to", "executive appointment", "excellence leadership",
        "highly recommended", "seamless handover", "great construction", "quality finishing",
        "happy homeowner", "delighted with", "excellent amenities", "on time delivery",
        "smooth possession", "timely possession", "top notch quality", "best builder",
        "secures rera", "secured rera", "securing rera", "rera approval",
        "rera approved", "rera registration", "rera registered", "rera clearance",
        "record sales", "annual sales", "record annual sales", "record booking",
        "record bookings", "highest-ever sales", "highest ever sales", "55% yoy",
        "q4 profits", "q4 profit", "q4 pat", "surge in profit", "profit surge",
        "bullish", "record revenue", "all-time high"
    ]
    if any(sp in text for sp in strong_pos):
        mention.sentiment = "positive"
        mention.sentiment_score = 0.85
        mention.relevance_score = 1.0
        return mention

    neg_words = [
        'delay', 'complaint', 'defect', 'leakage',
        'seepage', 'penalty', 'penalties', 'stuck', 'bad', 'poor', 'disappointed', 'frustrated',
        'suffered', 'suffer', 'terrible', 'horrible', 'cheat', 'cheated', 'warning',
        'rant', 'unresponsive', 'pain', 'worst', 'harassment', 'refusal', 'fails',
        'evasion', 'irregularities', 'irregularity', 'corrupt', 'corruption', 'dispute',
        'disputes', 'flooding', 'dues', 'lawsuit', 'litigation',
        'rera notice', 'rera penalty', 'rera order', 'rera complaint', 'rera fine',
        'rera violation', 'court case', 'legal notice', 'legal dispute', 'legal battle'
    ]
    pos_words = [
        'profit', 'surged', 'growth', 'gains', 'best', 'premium', 'great', 'luxury',
        'excellent', 'launch', 'successful', 'award', 'record', 'secures', 'secured',
        'approval', 'approved', 'registration', 'registered', 'sales', 'bullish',
        'milestone', 'revenue', 'bookings'
    ]

    neg_count = sum(1 for w in neg_words if (w in text if ' ' in w else re.search(r'\b' + re.escape(w) + r'\b', text)))
    pos_count = sum(1 for w in pos_words if re.search(r'\b' + re.escape(w) + r'\b', text))

    if neg_count > pos_count:
        mention.sentiment = "negative"
        mention.sentiment_score = max(-0.9, -0.4 - 0.15 * neg_count)
    elif pos_count > neg_count:
        mention.sentiment = "positive"
        mention.sentiment_score = min(0.9, 0.4 + 0.15 * pos_count)
    else:
        mention.sentiment = "neutral"
        mention.sentiment_score = 0.0

    is_relevant = "puravankara" in text or "purva" in text or "provident" in text
    mention.relevance_score = 1.0 if is_relevant else 0.5
    return mention


def analyze_mention(mention: Mention) -> Mention:
    if not client:
        return fallback_analysis(mention)

    prompt = f"""
You are a reputation intelligence analyst.

Analyze this public mention about Puravankara.

TITLE:
{mention.title}

TEXT:
{mention.text}

Return ONLY valid JSON in exactly this format:

{{
  "sentiment": "positive",
  "sentiment_score": 0.0,
  "relevance_score": 0.0
}}

Rules:
sentiment must be exactly one of: positive, neutral, negative
sentiment_score: -1.0 to +1.0
relevance_score: 0.0 to 1.0
CRITICAL RULE: Never classify a person's professional profile, employee resume, job title, or legal counsel credentials as negative. In-house counsel or employees mentioning 'Litigation', 'Dispute Resolution', or 'RERA' in their job title or practice area represent corporate legal capability, NOT a negative corporate event. Classify professional profiles as positive (if honors/leadership) or neutral, NEVER negative.
Do not include markdown or any explanation.
"""

    try:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(
                client.models.generate_content,
                model="gemini-3.6-flash",
                contents=prompt
            )
            response = future.result(timeout=5.0)

        text = response.text.strip()
        if text.startswith("```"):
            text = text.replace("```json", "").replace("```", "").strip()

        data = json.loads(text)
        mention.sentiment = data.get("sentiment", "neutral")
        mention.sentiment_score = float(data.get("sentiment_score", 0.0))
        mention.relevance_score = float(data.get("relevance_score", 1.0))

        # Guardrail: Ensure critical regulatory, legal, fraud, and financial irregularities are never softened to neutral
        combined_text = f"{mention.title or ''} {mention.text or ''}".lower()
        critical_threats = [
            "rera complaint", "rera notice", "rera penalty", "court case", "lawsuit",
            "legal notice", "legal dispute", "fir filed", "investigation", "fraud",
            "scam", "cheated", "embezzlement", "stalled project", "construction halt",
            "building collapse", "structural defect", "buyer protest", "water leakage",
            "severe delay", "penalty imposed", "breach of contract", "unresponsive crm",
            "negative review", "negative reviews", "frustrated buyer", "frustrated",
            "buyer beware", "rant", "gst evasion", "tax evasion", "financial irregularities",
            "corruption", "water seepage", "basement leakage", "structural audit",
            "handover delay", "refund delay", "lowest level of integrity"
        ]
        if any(sn in combined_text for sn in critical_threats):
            mention.sentiment = "negative"
            mention.sentiment_score = min(mention.sentiment_score, -0.85)

        return mention
    except Exception as e:
        # Fallback gracefully without breaking pipeline
        return fallback_analysis(mention)


if __name__ == "__main__":
    test_mention = Mention(
        source="youtube",
        title="Puravankara project review",
        text="The project has a great location and good amenities.",
        url="https://youtube.com"
    )
    result = analyze_mention(test_mention)
    print(result.to_dict())