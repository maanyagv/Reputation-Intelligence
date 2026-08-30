import os
import json
import re
from dotenv import load_dotenv
from google import genai

from backend.models.mention import Mention

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None


def fallback_analysis(mention: Mention) -> Mention:
    """
    Fast rule-based reputation intelligence analyzer fallback if Gemini API is unavailable or rate-limited.
    """
    text = f"{mention.title or ''} {mention.text or ''}".lower()

    # 1. Critical Legal/Regulatory/Threat Negative
    strong_neg = [
        "rera complaint", "rera notice", "rera penalty", "court case", "lawsuit",
        "legal notice", "legal dispute", "fir filed", "investigation", "fraud",
        "scam", "cheated", "embezzlement", "stalled project", "construction halt",
        "building collapse", "structural defect", "buyer protest", "water leakage",
        "severe delay", "penalty imposed", "breach of contract", "unresponsive crm"
    ]
    if any(sn in text for sn in strong_neg):
        mention.sentiment = "negative"
        mention.sentiment_score = -0.85
        mention.relevance_score = 1.0
        return mention

    # 2. Financial Turnaround / Expansion Positive
    strong_pos = [
        "profit at", "profit of", "posts profit", "profit turns positive",
        "turns positive", "revenue up", "revenue surges", "surged",
        "ebitda margin expands", "net profit", "record sales", "strong demand",
        "expansion", "allotment of", "new launch", "unveiled", "contract win", "bags order"
    ]
    if any(sp in text for sp in strong_pos):
        mention.sentiment = "positive"
        mention.sentiment_score = 0.85
        mention.relevance_score = 1.0
        return mention

    neg_words = ['delay', 'complaint', 'court', 'rera', 'legal', 'defect', 'leakage', 'seepage', 'penalty', 'stuck', 'bad', 'poor', 'disappointed']
    pos_words = ['profit', 'surged', 'growth', 'gains', 'best', 'premium', 'great', 'luxury', 'excellent', 'launch', 'successful', 'award']

    neg_count = sum(1 for w in neg_words if re.search(r'\b' + re.escape(w) + r'\b', text))
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
Do not include markdown or any explanation.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        text = response.text.strip()
        if text.startswith("```"):
            text = text.replace("```json", "").replace("```", "").strip()

        data = json.loads(text)
        mention.sentiment = data.get("sentiment", "neutral")
        mention.sentiment_score = float(data.get("sentiment_score", 0.0))
        mention.relevance_score = float(data.get("relevance_score", 1.0))
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