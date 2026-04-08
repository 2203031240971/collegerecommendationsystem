"""
engine.py — EduMatch Recommendation Engine
===========================================
Core logic: filter eligible colleges, score each one, rank and return top results.
NEW: Supports both hardcoded database and real internet search

Scoring weights:
  30%  Marks buffer (how safely above cutoff the student is)
  30%  Interest alignment (overlap between student & college interests)
  20%  Location preference
  20%  Budget headroom
"""

import json
import math
import os
from pathlib import Path

# Try to use real college search; fallback to hardcoded database
USE_REAL_SEARCH = os.getenv("USE_REAL_COLLEGE_SEARCH", "false").lower() == "true"

if USE_REAL_SEARCH:
    try:
        from college_search import search_colleges_by_criteria
        COLLEGES: list[dict] = []  # Will be populated dynamically
        print("Using REAL Internet College Search")
    except ImportError:
        print("college_search module not found, falling back to hardcoded database")
        USE_REAL_SEARCH = False

if not USE_REAL_SEARCH:
    # Fallback: Load college database ──────────────────────────────────────
    _DATA_FILE = Path(__file__).parent / "colleges.json"

    def _load_colleges() -> list[dict]:
        with open(_DATA_FILE, encoding="utf-8") as f:
            return json.load(f)

    COLLEGES: list[dict] = _load_colleges()
    print(f"[OK] Loaded {len(COLLEGES)} colleges from colleges.json (Local Mode)")


# ── Stream normalisation map ───────────────────────────────────────────────────
# Frontend sends short codes; map them to the keys used in colleges.json
STREAM_MAP: dict[str, str] = {
    "mpc":          "MPC",
    "bipc":         "BiPC",
    "mbipc":        "MBiPC",
    "mpcs":         "MPCS",
    "mec":          "MEC",
    "cec":          "CEC",
    "hec":          "CEC",          # treat HEC like CEC for matching
    "commerce-math":"MEC",
    "arts-general": "Arts",
    "arts-lang":    "Arts",
    "home-science": "Arts",
    "fine-arts":    "Arts",
    "voc-agri":     "Arts",
    "voc-it":       "MPCS",
    # degree-level fallbacks (student already has a stream in mind)
    "btech-cs":     "MPC",
    "btech-it":     "MPCS",
    "btech-mech":   "MPC",
    "btech-civil":  "MPC",
    "btech-eee":    "MPC",
    "btech-ai":     "MPCS",
    "btech-data":   "MPCS",
    "mbbs":         "BiPC",
    "bds":          "BiPC",
    "bpharm":       "BiPC",
    "bsc-nursing":  "BiPC",
    "bba":          "MEC",
    "bcom":         "CEC",
    "mba":          "MEC",
    "bsc":          "MPC",
    "ba":           "Arts",
    "bca":          "MPCS",
    "bsc-it":       "MPCS",
    "llb":          "CEC",
    "barch":        "MPC",
    "other":        "MPC",
}

# Interest keywords per course (helps match student interests even when not explicit)
COURSE_INTERESTS: dict[str, list[str]] = {
    "btech-cs":   ["computers", "technology", "engineering", "software"],
    "btech-it":   ["computers", "technology", "information technology"],
    "btech-ai":   ["artificial intelligence", "technology", "computers", "data science"],
    "btech-data": ["data science", "technology", "computers", "analytics"],
    "btech-mech": ["engineering", "mechanical", "manufacturing"],
    "btech-civil":["engineering", "civil", "construction"],
    "btech-eee":  ["electronics", "engineering", "electrical"],
    "mbbs":       ["medicine", "healthcare", "biology", "surgery"],
    "bds":        ["medicine", "healthcare", "dentistry"],
    "bpharm":     ["pharmacy", "healthcare", "biology", "chemistry"],
    "bsc-nursing":["healthcare", "nursing", "medicine"],
    "bba":        ["management", "business", "entrepreneurship"],
    "bcom":       ["commerce", "finance", "accounting"],
    "mba":        ["management", "business", "finance"],
    "bsc":        ["science", "research", "biology", "chemistry", "physics"],
    "ba":         ["arts", "humanities", "social science"],
    "bca":        ["computers", "technology", "software"],
    "bsc-it":     ["computers", "technology", "information technology"],
    "llb":        ["law", "legal"],
    "barch":      ["architecture", "design", "engineering"],
    "mpc":        ["science", "engineering", "mathematics", "physics"],
    "bipc":       ["biology", "medicine", "chemistry", "science"],
    "mpcs":       ["computers", "science", "mathematics", "technology"],
    "mec":        ["economics", "commerce", "mathematics"],
    "cec":        ["commerce", "economics", "civics"],
}


def normalise_stream(course_or_stream: str) -> str:
    """Return the canonical stream name from a course or stream code."""
    return STREAM_MAP.get(course_or_stream.lower(), "MPC")


def get_interests_for_course(course: str) -> list[str]:
    """Map a course/stream code to relevant interest keywords."""
    return COURSE_INTERESTS.get(course.lower(), [])


# ── Budget helpers ─────────────────────────────────────────────────────────────
def parse_budget(budget_range: str, budget_custom: str) -> int:
    """Convert frontend budget values to a single integer (rupees per year)."""
    if budget_custom:
        try:
            return int(budget_custom)
        except ValueError:
            pass
    midpoints = {
        "0-50000":       50_000,
        "50000-150000":  150_000,
        "150000-400000": 400_000,
        "400000+":       1_000_000,
    }
    return midpoints.get(budget_range, 200_000)


# ── Core recommendation engine ─────────────────────────────────────────────────
def recommend(
    marks: float,
    stream: str,
    location: str,
    budget: int,
    interests: list[str],
    top_n: int = 8,
    college_types: list[str] | None = None,
) -> dict:
    """
    Smart 3-tier recommendation engine — always returns results.

    Tier 1 (Exact)       : stream + marks + within budget
    Tier 2 (Budget Flex) : stream + marks + within 2× budget (tagged over-budget)
    Tier 3 (Best Effort) : stream + marks only (all fees accepted, tagged over-budget)

    Parameters
    ----------
    marks         : student's percentage marks (0–100)
    stream        : canonical stream like 'MPC', 'BiPC', 'MPCS' …
    location      : preferred city/town string
    budget        : max fee per year in rupees
    interests     : list of interest keywords (can come from course code)
    top_n         : how many top results to return
    college_types : optional filter e.g. ['government', 'private']
    """

    def _filter(colleges, max_fee=None):
        """Apply stream + marks + optional fee + optional type filter."""
        out = []
        for c in colleges:
            if stream not in c["stream"]:
                continue
            if marks < c["cutoff_marks"]:
                continue
            if max_fee is not None and c["fee_per_year"] > max_fee:
                continue
            if college_types and c.get("college_type") not in college_types:
                continue
            out.append(c)
        return out

    # Tier 1: exact budget
    eligible = _filter(COLLEGES, max_fee=budget)
    over_budget_mode = False

    # Tier 2: 2× budget (relax fee constraint)
    if not eligible:
        eligible = _filter(COLLEGES, max_fee=budget * 2)
        over_budget_mode = True

    # Tier 3: no budget filter at all — stream + marks only
    if not eligible:
        eligible = _filter(COLLEGES, max_fee=None)
        over_budget_mode = True

    if not eligible:
        return {
            "results": [],
            "total_eligible": 0,
            "filters_applied": {
                "stream": stream,
                "marks": marks,
                "budget": budget,
                "location": location,
            },
            "message": (
                f"No colleges found for {stream} stream with {marks}% marks. "
                "Please check your stream selection or try again."
            ),
        }

    # ── STEP 2: Score each eligible college ───────────────────────────────────
    scored: list[dict] = []
    for college in eligible:
        score = 0.0

        # Factor 1 — Marks buffer (30 %)
        buffer = marks - college["cutoff_marks"]
        marks_score = min(buffer / 40 * 100, 100)
        score += marks_score * 0.30

        # Factor 2 — Interest alignment (30 %)
        student_set = set(i.lower() for i in interests)
        college_set = set(i.lower() for i in college["interests"])
        matched = len(student_set & college_set)
        interest_score = (matched / max(len(student_set), 1)) * 100
        score += interest_score * 0.30

        # Factor 3 — Location fit (20 %)
        loc_score = 100 if location.lower() == college["location"].lower() else 50
        score += loc_score * 0.20

        # Factor 4 — Budget headroom (20 %)
        # If over budget: give 0 score (not negative) so they still appear sorted
        fee = college["fee_per_year"]
        is_over_budget = fee > budget
        if not is_over_budget:
            budget_ratio = (budget - fee) / max(budget, 1)
            budget_score = min(budget_ratio * 100, 100)
        else:
            budget_score = 0  # over budget but still shown
        score += budget_score * 0.20

        # Admission chance & category
        buffer_int = int(buffer)
        if buffer_int >= 15:
            category = "Safe"
        elif buffer_int >= 5:
            category = "Match"
        else:
            category = "Reach"

        admission_pct = min(95, max(10, 40 + buffer_int * 2))

        scored.append({
            "id":               college["id"],
            "name":             college["name"],
            "location":         college["location"],
            "courses":          college["courses"],
            "fee_per_year":     fee,
            "placement_avg":    college["placement_avg"],
            "rating":           college["rating"],
            "college_type":     college.get("college_type", "private"),
            "accreditation":    college.get("accreditation", ""),
            "match_score":      round(score, 1),
            "admission_chance": f"{admission_pct}%",
            "marks_buffer":     buffer_int,
            "category":         category,
            "cutoff_marks":     college["cutoff_marks"],
            "over_budget":      is_over_budget,
        })

    # ── STEP 3: Sort & return top N ───────────────────────────────────────────
    scored.sort(key=lambda x: x["match_score"], reverse=True)

    return {
        "results":         scored[:top_n],
        "total_eligible":  len(scored),
        "filters_applied": {
            "stream":   stream,
            "marks":    marks,
            "budget":   budget,
            "location": location,
        },
        "message": (
            "⚠️ Some colleges shown are slightly above your budget. "
            "They are tagged so you can consider scholarships or fee waivers."
        ) if over_budget_mode else None,
    }
