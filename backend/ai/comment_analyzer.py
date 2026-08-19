import os
import json

from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def analyze_comment(comment):
    text = comment.get("text", "")

    prompt = f"""
You are a reputation intelligence analyst.

Analyze this public YouTube comment related to Puravankara.

COMMENT:
{text}

Return ONLY valid JSON in exactly this format:

{{
  "sentiment": "positive",
  "sentiment_score": 0.0,
  "relevance_score": 0.0
}}

Rules:

sentiment must be exactly one of:
positive, neutral, negative

sentiment_score:
-1.0 = extremely negative
 0.0 = neutral
+1.0 = extremely positive

relevance_score:
0.0 = unrelated to Puravankara
1.0 = directly related to Puravankara

Do not include markdown or explanation.
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    text = response.text.strip()

    if text.startswith("```"):
        text = text.replace("```json", "")
        text = text.replace("```", "")
        text = text.strip()

    data = json.loads(text)

    comment["sentiment"] = data["sentiment"]
    comment["sentiment_score"] = float(data["sentiment_score"])
    comment["relevance_score"] = float(data["relevance_score"])

    return comment


if __name__ == "__main__":
    test_comment = {
        "author": "test_user",
        "text": "The project looks really good and the location is excellent.",
        "like_count": 2
    }

    result = analyze_comment(test_comment)

    print("=" * 70)
    print("GEMINI COMMENT ANALYSIS")
    print("=" * 70)
    print(result)