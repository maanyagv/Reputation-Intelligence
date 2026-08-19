import os
import json

from dotenv import load_dotenv
from google import genai

from backend.models.mention import Mention


load_dotenv()


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def analyze_mention(mention: Mention) -> Mention:
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

sentiment must be exactly one of:
positive, neutral, negative

sentiment_score:
-1.0 = extremely negative
 0.0 = neutral
+1.0 = extremely positive

relevance_score:
0.0 = unrelated to Puravankara
1.0 = directly about Puravankara

Do not include markdown or any explanation.
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    text = response.text.strip()

    # Remove accidental markdown fences if Gemini adds them
    if text.startswith("```"):
        text = text.replace("```json", "")
        text = text.replace("```", "")
        text = text.strip()

    data = json.loads(text)

    mention.sentiment = data["sentiment"]
    mention.sentiment_score = float(data["sentiment_score"])
    mention.relevance_score = float(data["relevance_score"])

    return mention


if __name__ == "__main__":
    test_mention = Mention(
        source="youtube",
        title="Puravankara project review",
        text="The project has a great location and good amenities.",
        url="https://youtube.com"
    )

    result = analyze_mention(test_mention)

    print("=" * 70)
    print("GEMINI ANALYSIS")
    print("=" * 70)
    print(result.to_dict())