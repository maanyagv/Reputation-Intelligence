import re

# Comprehensive list of brand, subsidiary, project, and executive identifiers for Puravankara Limited
PURAVANKARA_BRAND_KEYWORDS = [
    # Core Corporate
    "puravankara",
    "puravankara limited",
    "purva",
    # Subsidiaries & Strategic Divisions
    "provident housing",
    "provident group",
    "provident",
    "purva land",
    "purva streaks",
    "starworth infrastructure",
    "starworth",
    # Key Leadership Executives
    "ashish puravankara",
    "ravi puravankara",
    "amanda puravankara",
    "mallanna sasalu",
    "shine saha",
    # Flagship Residential & Commercial Projects
    "purva palm beach",
    "purva atmosphere",
    "purva celestial",
    "purva sparkling springs",
    "purva meraki",
    "purva zenium",
    "purva silversky",
    "purva orient grand",
    "purva somerset house",
    "purva clermont",
    "purva blumont",
    "purva promenade",
    "purva park hill",
    "purva tivoli",
    "purva weaves",
    "purva aerocity",
    "purva tranquility",
    "purva windermere",
    "purva raagam",
    "purva grandbay",
    "purva season",
    "purva highlands",
    "purva venezia",
    "purva whitehall",
    "purva skydale",
    "purva westend",
    "purva panorama",
    "purva sunflower",
    "purva swanlake",
    "purva fountain square",
    "purva riviera",
    "purva fairmont",
    "miami by purva",
    "purva miami",
    "purva estrella",
    # Flagship Provident Communities
    "provident capella",
    "provident sunworth",
    "provident botanico",
    "provident deansgate",
    "provident equinox",
    "provident tree",
    "provident harmony",
    "provident welworth",
    "provident kenworth",
    "provident rays of dawn"
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

    # 2. Reject unrelated personal names and entertainment series
    irrelevant_patterns = [
        r"\bbhoot purva\b",
        r"\bpurva sane\b",
        r"\bpurva bankar\b",
        r"\bpurva ambekar\b",
        r"\bpurva reddy\b"
    ]
    for ipat in irrelevant_patterns:
        if re.search(ipat, title_lower):
            return False

    # 3. Check for explicit mention of brand keywords anywhere in title, text, author, or URL
    has_keyword = any(kw in combined_all for kw in PURAVANKARA_BRAND_KEYWORDS)
    return has_keyword
