import re

# Comprehensive list of brand and project identifiers for Puravankara
PURAVANKARA_BRAND_KEYWORDS = [
    "puravankara",
    "purva",
    "provident housing",
    "provident group",
    "purva streaks",
    "ashish puravankara",
    "ravi puravankara",
    "amanda puravankara",
    "mallanna sasalu"
]

# Patterns that indicate generic market roundups or indices with no specific focus on Puravankara
GENERIC_ROUNDUP_PATTERNS = [
    r"\bsensex\b",
    r"\bnifty\b",
    r"\bstock market highlights\b",
    r"\bbuzzing stocks\b",
    r"\bmarket wrap\b",
    r"\bmetal shares\b",
    r"\bgulf turmoil\b",
    r"\bwall street\b"
]

def is_puravankara_related(item) -> bool:
    """
    Validates whether a given mention/record/dictionary is strictly related to
    Puravankara Limited, Purva projects, or Provident Housing.
    """
    if not item:
        return False

    if isinstance(item, dict):
        title = str(item.get("title") or "")
        text = str(item.get("text") or item.get("description") or item.get("content") or "")
        author = str(item.get("author") or item.get("channelTitle") or "")
        url = str(item.get("url") or item.get("sourceUrl") or "")
    else:
        title = str(getattr(item, "title", "") or "")
        text = str(getattr(item, "text", "") or "")
        author = str(getattr(item, "author", "") or "")
        url = str(getattr(item, "url", "") or "")

    combined_all = f"{title} {text} {author} {url}".lower()
    title_lower = title.lower()

    # 1. Reject generic stock index roundups if the title doesn't explicitly name Puravankara/Purva
    for pat in GENERIC_ROUNDUP_PATTERNS:
        if re.search(pat, title_lower):
            # Only keep if the title itself explicitly features Puravankara or Purva
            if not ("puravankara" in title_lower or "purva" in title_lower or "provident" in title_lower):
                return False

    # 2. Check for explicit mention of brand keywords anywhere in title, text, author, or URL
    has_keyword = any(kw in combined_all for kw in PURAVANKARA_BRAND_KEYWORDS)
    return has_keyword
