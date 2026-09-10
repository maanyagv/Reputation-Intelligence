import re

# Comprehensive list of brand, subsidiary, project, and executive identifiers for Puravankara Limited
PURAVANKARA_BRAND_KEYWORDS = [
    # Core Corporate
    "puravankara",
    "puravankara limited",
    "puravankara ltd",
    "puravankara projects",
    "puravankara group",
    "purva real estate",
    "purva projects",
    "purva group",
    "purva developers",
    "purva constructions",
    "purva homes",
    "purva apartments",
    "humans of purva",
    # Subsidiaries & Strategic Divisions
    "provident housing",
    "provident group",
    "provident housing limited",
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
    "purva heritage",
    "purva blubelle",
    "purva symphony",
    "purva northern lights",
    "purva 270",
    "purva sapphire",
    "purva parkridge",
    "purva coronation square",
    "purva gainz",
    "purva vantage",
    "purva primus",
    "purva summit",
    "purva eternity",
    "purva grand",
    "purva sound of water",
    "purva skywood",
    "purva high crest",
    "purva emerald bay",
    "purva midtown",
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
    "provident rays of dawn",
    "provident cosmo city",
    "provident park square",
    "provident central park",
    "provident woodfield",
    "provident manhattan",
    "provident palm vista"
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

# Strict negative exclusion list: unrelated persons, dance/arts, astrology, entertainment, and non-real-estate homonyms
IRRELEVANT_PATTERNS = [
    # Classical Dance & Arts (e.g. dancer Purva Dhanashree, Vilasini Natyam)
    r"\bdhanashree\b",
    r"\bvilasini natyam\b",
    r"\bnatyam\b",
    r"\bbharatanatyam\b",
    r"\bkathak\b",
    r"\bodissi\b",
    r"\bclassical dance\b",
    
    # Astrology / Horoscope / Nakshatra (Purva Phalguni, Purva Bhadrapada, Purva Ashadha)
    r"\bnakshatra\b",
    r"\bbhadrapada\b",
    r"\bphalguni\b",
    r"\bashadha\b",
    r"\bpanchang\b",
    r"\bhoroscope\b",
    r"\bastrology\b",
    r"\brashi\b",
    r"\bkundali\b",
    r"\bvenus transit\b",
    r"\bleo moon\b",
    
    # Entertainment & Media
    r"\bbhoot purva\b",
    r"\bweb series\b",
    r"\bomkar kapoor\b",
    r"\bbaba sehgal\b",
    r"\bpurva mantri\b",
    
    # Unrelated Individual Names (first name 'Purva' or similar)
    r"\bpurva garg\b",
    r"\bpurva patel\b",
    r"\bpurva desai\b",
    r"\bpurva gujarathi\b",
    r"\bpurva chawla\b",
    r"\bpurva date\b",
    r"\bpurva trivedi\b",
    r"\bpurva anand\b",
    r"\bpurva naigaonkar\b",
    r"\bpurva bhasin\b",
    r"\bpurva naik\b",
    r"\bpurva ragit\b",
    r"\bpurva kharbikar\b",
    r"\bpurva thakur\b",
    r"\bpurva badhe\b",
    r"\bpurva zarapkar\b",
    r"\bpurva asrani\b",
    r"\bpurva danke\b",
    r"\bpurva khandeparker\b",
    r"\bpurva borkar\b",
    r"\bpurva mathiya\b",
    r"\bpurva marfatia\b",
    r"\bpurva bhise\b",
    r"\bpurva jadhav\b",
    r"\bpurva bandwadkar\b",
    r"\bpurva goswami\b",
    r"\bpurva palliwal\b",
    r"\bpurva takkar\b",
    r"\bpurva parekh\b",
    r"\bpurva sane\b",
    r"\bpurva bankar\b",
    r"\bpurva ambekar\b",
    r"\bpurva reddy\b",
    r"\bpurvanshi\b",
    r"\bathira purva\b",
    
    # Unrelated Companies & Localities
    r"\bpurva sharegistry\b",
    r"\bpurva cansarvornem\b",
    r"\bpurvanchal\b",
    r"\bpurvx\b",
    r"\bdigital vidya\b",
]

REAL_ESTATE_CONTEXT_KEYWORDS = [
    "real estate", "builder", "developer", "realty", "housing", "apartment",
    "apartments", "flat", "flats", "villa", "villas", "property", "properties",
    "rera", "construction", "bengaluru", "bangalore", "chennai", "hyderabad",
    "mumbai", "pune", "coimbatore", "kochi", "bhk", "possession", "amenities",
    "buyer", "buyers", "homebuyer", "homebuyers", "residential", "commercial",
    "sq ft", "sqft", "crore", "resale", "booking", "sales office", "handover"
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

    # 1. Reject anything matching strict irrelevant patterns (dance, astrology, unrelated names)
    for ipat in IRRELEVANT_PATTERNS:
        if re.search(ipat, combined_all):
            return False

    # 2. Reject generic stock index roundups if the title doesn't explicitly name Puravankara
    for pat in GENERIC_ROUNDUP_PATTERNS:
        if re.search(pat, title_lower):
            if not ("puravankara" in title_lower or "provident housing" in title_lower):
                return False

    # 3. Explicit Puravankara / Provident Housing / Starworth mentions
    if "puravankara" in combined_all:
        return True

    if "provident housing" in combined_all or "provident group" in combined_all:
        return True

    if "starworth" in combined_all and ("puravankara" in combined_all or "infrastructure" in combined_all or "construction" in combined_all):
        return True

    # 4. Check explicit brand projects list
    if any(kw in combined_all for kw in PURAVANKARA_BRAND_KEYWORDS):
        return True

    # 5. Check if word 'purva' or 'provident' appears alongside real estate context
    has_purva_word = bool(re.search(r"\bpurva\b", combined_all))
    has_provident_word = bool(re.search(r"\bprovident\b", combined_all))
    has_re_context = any(re_kw in combined_all for re_kw in REAL_ESTATE_CONTEXT_KEYWORDS)

    if (has_purva_word or has_provident_word) and has_re_context:
        # Extra guard: Ensure it's not a personal LinkedIn profile of someone named Purva
        if "linkedin" in combined_all and not ("puravankara" in combined_all or "provident" in combined_all):
            return False
        return True

    return False
