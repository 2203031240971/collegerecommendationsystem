"""
ai_college_search.py — Gemini-Powered Live College Search
==========================================================
Uses Google Gemini AI to search for real matching colleges based on student profile.
The AI searches its comprehensive knowledge of Indian colleges and returns
structured, scored results tailored to the student's marks, stream and budget.
"""

import json
import re
import google.generativeai as genai

# ── Config ─────────────────────────────────────────────────────────────────────
GEMINI_API_KEY = "AIzaSyAXmt6MiXjBr_aUCq0ckdWcUhPfmpohS2I"
GEMINI_MODEL   = "gemini-2.5-flash"

# Budget range labels for human-readable prompts
BUDGET_LABELS = {
    "0-50000":       "below ₹50,000/year",
    "50000-150000":  "₹50,000–₹1.5 Lakh/year",
    "150000-400000": "₹1.5–₹4 Lakh/year",
    "400000+":       "above ₹4 Lakh/year",
}

STREAM_LABELS = {
    "MPC":  "PCM (Maths, Physics, Chemistry) — Engineering stream",
    "BiPC": "PCB (Biology, Physics, Chemistry) — Medical stream",
    "MPCS": "Computer Science with Maths — CS/IT stream",
    "MEC":  "Maths, Economics, Commerce — Commerce/Management stream",
    "CEC":  "Commerce, Economics, Civics — Commerce stream",
    "Arts": "Humanities / Arts stream",
    "MBiPC":"Biology and Chemistry — Advanced Medical stream",
}


def search_colleges_with_gemini(
    name: str,
    marks: float,
    stream: str,
    location: str,
    budget: int,
    course: str,
    interests: list[str],
    top_n: int = 8,
) -> dict:
    """
    Ask Gemini AI to find and score colleges matching the student profile.

    Returns the same dict format as engine.py's recommend() so the frontend
    doesn't need any changes.
    """
    genai.configure(api_key=GEMINI_API_KEY)

    # Build a human-readable budget string
    if budget <= 50_000:
        budget_str = "below ₹50,000/year (very low budget)"
    elif budget <= 1_50_000:
        budget_str = f"around ₹{budget//1000}K/year"
    elif budget <= 4_00_000:
        budget_str = f"up to ₹{budget/100000:.1f} Lakh/year"
    else:
        budget_str = f"up to ₹{budget/100000:.1f} Lakh/year (high budget)"

    stream_label = STREAM_LABELS.get(stream, stream)
    interests_str = ", ".join(interests[:6]) if interests else "general"
    location_str = location or "anywhere in India"

    prompt = f"""You are an expert Indian college counselor with deep knowledge of all colleges across India.

A student named {name} is looking for college admissions. Here are their details:
- Marks / Percentage: {marks}%
- Stream / Group: {stream_label}
- Preferred Course: {course}
- Preferred Location: {location_str}
- Annual Budget: {budget_str}
- Interests / Career Goals: {interests_str}

Your task: Find the TOP {top_n} best-matching colleges in India for this student.

Rules:
1. Only recommend colleges where the student's {marks}% marks meets or exceeds the college's typical cutoff
2. Include a mix of Safe (well within cutoff), Match (close to cutoff), and Reach (slightly above cutoff) colleges
3. Prioritize colleges in {location_str} first, then nearby cities/states
4. Consider both government and private colleges
5. The budget is {budget_str} — include those within budget AND slightly over (tag them over_budget: true)
6. Be ACCURATE about real college names, cutoffs, fees and placements

Return ONLY a valid JSON array (no markdown, no explanation) with exactly this structure:
[
  {{
    "id": 1,
    "name": "Exact College Name",
    "location": "City",
    "courses": ["Course 1", "Course 2", "Course 3"],
    "fee_per_year": 85000,
    "placement_avg": 6.5,
    "rating": 4.2,
    "college_type": "government",
    "accreditation": "NAAC A+",
    "cutoff_marks": 75,
    "match_score": 84.5,
    "admission_chance": "89%",
    "marks_buffer": 12,
    "category": "Safe",
    "over_budget": false,
    "ai_tip": "One specific reason why this is a great fit for this student"
  }}
]

college_type must be exactly one of: "government", "private", "central"
category must be exactly one of: "Safe", "Match", "Reach"
match_score is 0-100 (how well it fits the student's overall profile)
admission_chance is 10%-95% (likelihood of getting admitted based on marks vs cutoff)
marks_buffer = student marks - college cutoff (can be negative for Reach)
ai_tip = short, personalised insight for THIS student about THIS college (max 20 words)

Return ONLY the JSON array. No text before or after."""

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,      # lower = more factual
                response_mime_type="application/json",
            ),
        )

        raw = response.text.strip()

        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        raw = raw.strip()

        colleges = json.loads(raw)

        # Validate and normalise each result
        validated = []
        for i, c in enumerate(colleges[:top_n]):
            # Ensure required fields
            college_type = str(c.get("college_type", "private")).lower()
            if college_type not in ("government", "private", "central"):
                college_type = "private"

            category = str(c.get("category", "Match"))
            if category not in ("Safe", "Match", "Reach"):
                category = "Match"

            fee = int(c.get("fee_per_year", 100000))
            is_over_budget = fee > budget

            validated.append({
                "id":               i + 1,
                "name":             str(c.get("name", f"College {i+1}")),
                "location":         str(c.get("location", location)),
                "courses":          list(c.get("courses", [course])),
                "fee_per_year":     fee,
                "placement_avg":    float(c.get("placement_avg", 5.0)),
                "rating":           float(c.get("rating", 4.0)),
                "college_type":     college_type,
                "accreditation":    str(c.get("accreditation", "Approved")),
                "cutoff_marks":     float(c.get("cutoff_marks", marks - 5)),
                "match_score":      float(c.get("match_score", 70.0)),
                "admission_chance": str(c.get("admission_chance", "70%")),
                "marks_buffer":     int(c.get("marks_buffer", 0)),
                "category":         category,
                "over_budget":      is_over_budget,
                "ai_tip":           str(c.get("ai_tip", "")),
            })

        return {
            "results":        validated,
            "total_eligible": len(validated),
            "filters_applied": {
                "stream":   stream,
                "marks":    marks,
                "budget":   budget,
                "location": location,
            },
            "message":        f"🤖 AI found {len(validated)} colleges matching your profile using live search.",
            "ai_powered":     True,
        }

    except json.JSONDecodeError as e:
        print(f"[AI Search] JSON parse error: {e}")
        print(f"[AI Search] Raw response (first 500 chars): {raw[:500]}")
        return _error_fallback(stream, marks, budget, location, "AI returned invalid data. Using local database.")

    except Exception as e:
        print(f"[AI Search] Error: {e}")
        return _error_fallback(stream, marks, budget, location, str(e))


def _error_fallback(stream, marks, budget, location, reason):
    return {
        "results":        [],
        "total_eligible": 0,
        "filters_applied": {"stream": stream, "marks": marks, "budget": budget, "location": location},
        "message":        f"AI search failed: {reason}",
        "ai_powered":     False,
        "error":          True,
    }
