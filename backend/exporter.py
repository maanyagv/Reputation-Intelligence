import json
from pathlib import Path
from backend.collectors.news import decode_url

OUTPUT_FILE = Path(__file__).resolve().parent / "data" / "reputation.json"


def export_mentions(mentions):
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    existing_data = []
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as file:
                existing_data = json.load(file)
        except Exception:
            existing_data = []

    # Identify existing negative risk mentions to preserve
    negative_benchmark_items = [
        item for item in existing_data
        if isinstance(item, dict) and item.get("sentiment") == "negative"
    ]

    new_data = [m.to_dict() if hasattr(m, "to_dict") else m for m in mentions]

    # Clean up and decode URLs in new data
    for item in new_data:
        raw_url = str(item.get("url") or item.get("sourceUrl") or "").strip()
        decoded = decode_url(raw_url)
        item["url"] = decoded
        item["sourceUrl"] = decoded

    seen_keys = set()
    combined = []

    # Priority 1: Newly collected mentions
    for item in new_data:
        key = item.get("url") or item.get("title")
        if key and key not in seen_keys:
            seen_keys.add(key)
            combined.append(item)

    # Priority 2: Preserved negative risk mentions
    for item in negative_benchmark_items:
        key = item.get("url") or item.get("title")
        if key and key not in seen_keys:
            seen_keys.add(key)
            combined.append(item)

    # Priority 3: Remaining historical items to maintain history
    for item in existing_data:
        key = item.get("url") or item.get("title")
        if key and key not in seen_keys:
            seen_keys.add(key)
            combined.append(item)

    temporary_file = OUTPUT_FILE.with_suffix(".tmp")

    with open(temporary_file, "w", encoding="utf-8") as file:
        json.dump(
            combined,
            file,
            indent=2,
            ensure_ascii=False
        )

    temporary_file.replace(OUTPUT_FILE)

    print(f"\nSaved {len(combined)} mentions (preserving {len(negative_benchmark_items)} negative signals) to:")
    print(OUTPUT_FILE)


if __name__ == "__main__":
    print("Exporter module loaded.")
