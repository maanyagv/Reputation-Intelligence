import json
from pathlib import Path


OUTPUT_FILE = Path("backend/data/reputation.json")


def export_mentions(mentions):
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    data = []

    for mention in mentions:
        data.append(mention.to_dict())

    temporary_file = OUTPUT_FILE.with_suffix(".tmp")

    with open(temporary_file, "w", encoding="utf-8") as file:
        json.dump(
            data,
            file,
            indent=2,
            ensure_ascii=False
        )

    temporary_file.replace(OUTPUT_FILE)

    print(f"\nSaved {len(data)} mentions to:")
    print(OUTPUT_FILE)


if __name__ == "__main__":
    print("Exporter module loaded.")
