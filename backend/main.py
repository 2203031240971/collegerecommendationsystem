"""
main.py — EduMatch FastAPI Backend
====================================
Run locally:
    uvicorn main:app --reload --port 8000

API docs (once running):
    http://localhost:8000/docs
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from pathlib import Path
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from engine import (
    recommend,
    normalise_stream,
    get_interests_for_course,
    parse_budget,
    COLLEGES,
    USE_REAL_SEARCH,
)
from chat import router as chat_router
from ai_college_search import search_colleges_with_gemini

# Use AI-powered search by default (set USE_AI_COLLEGE_SEARCH=true to enable, currently disabled for reliability)
USE_AI_SEARCH = os.getenv("USE_AI_COLLEGE_SEARCH", "false").lower() != "false"
print(f"{'[AI-Powered College Search ENABLED]' if USE_AI_SEARCH else '[Using Local College Database - Fast & Reliable]'}")
# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="EduMatch — College Recommendation API",
    description="AI-powered college recommendation engine for students in Telangana & Andhra Pradesh.",
    version="1.0.0",
)

# Allow the HTML frontend (served by FastAPI or any origin) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(chat_router)


# ── Status Endpoint ────────────────────────────────────────────────────────────
@app.get("/status")
async def get_status():
    """Check server status and configuration."""
    return {
        "status": "online ✓",
        "ai_search_enabled": USE_AI_SEARCH,
        "mode": "AI GEMINI SEARCH" if USE_AI_SEARCH else ("REAL INTERNET SEARCH" if USE_REAL_SEARCH else "LOCAL DATABASE"),
        "colleges_loaded": len(COLLEGES),
        "api_docs": "http://localhost:8000/docs"
    }


@app.get("/diagnose-ai")
async def diagnose_ai_search():
    """Run a mini AI search and return the full result or error — for debugging."""
    import traceback as tb
    try:
        result = search_colleges_with_gemini(
            name="Test",
            marks=88,
            stream="MPC",
            location="Hyderabad",
            budget=150000,
            course="btech-cs",
            interests=["computers", "technology"],
            top_n=3,
        )
        return {
            "status": "ok",
            "ai_powered": result.get("ai_powered"),
            "error_flag": result.get("error"),
            "message": result.get("message"),
            "total_eligible": result.get("total_eligible", 0),
            "first_college": result["results"][0]["name"] if result.get("results") else None,
        }
    except Exception as e:
        return {
            "status": "exception",
            "error": str(e),
            "traceback": tb.format_exc(),
        }


@app.get("/")
async def root():
    """Redirect to index page."""
    return RedirectResponse(url="/index.html")


# ── Request / Response models ─────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    # Personal
    name:         str                    = Field(..., min_length=2, max_length=100,  description="Student's full name")
    student_class: str                   = Field(..., description="Class (9, 10, 11, 12, diploma, other)")
    gender:       Optional[str]          = Field("Any", description="Gender (Male, Female, Other)")

    # Academic
    course:       str                    = Field(..., description="Selected course/stream code from the frontend")
    marks:        float                  = Field(..., ge=0, le=100, description="Percentage marks (0-100)")
    board:        Optional[str]          = Field(None, description="Board of examination")
    caste:        Optional[str]          = Field(None, description="Category/reservation")

    # Budget & Preferences
    budget_range:  Optional[str]         = Field(None, description="Selected budget range option")
    budget_custom: Optional[str]         = Field(None, description="Custom budget entered by student")
    location:      Optional[str]         = Field("Hyderabad", description="Preferred city")
    college_types: Optional[list[str]]   = Field(None, description="Filter: government, private, central")
    interests:     Optional[list[str]]   = Field(None, description="Explicit interest keywords (optional)")

    @field_validator("marks")
    @classmethod
    def marks_must_be_valid(cls, v):
        if not (0 <= v <= 100):
            raise ValueError("Marks must be between 0 and 100")
        return v


class CollegeSummary(BaseModel):
    id:               int
    name:             str
    location:         str
    courses:          list[str]
    fee_per_year:     int
    placement_avg:    float
    rating:           float
    college_type:     str
    accreditation:    str
    match_score:      float
    admission_chance: str
    marks_buffer:     int
    category:         str
    cutoff_marks:     float
    over_budget:      Optional[bool] = False
    ai_tip:           Optional[str]  = None


class RecommendResponse(BaseModel):
    student_name:     str
    results:          list[CollegeSummary]
    total_eligible:   int
    filters_applied:  dict
    message:          Optional[str]  = None
    ai_powered:       Optional[bool] = False


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/api", tags=["Health"])
def root():
    return {
        "status": "ok",
        "service": "EduMatch Recommendation API",
        "version": "1.0.0",
        "docs": "/docs",
        "frontend": "http://localhost:8000/",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy", "colleges_loaded": len(COLLEGES)}


@app.post("/recommend", response_model=RecommendResponse, tags=["Recommendations"])
def get_recommendations(payload: RecommendRequest):
    """
    Submit student details and receive a ranked list of matching colleges.
    """
    # 1. Normalise stream from the course code the frontend sends
    stream = normalise_stream(payload.course)

    # 2. Build interest list (explicit + derived from course)
    interests: list[str] = list(payload.interests or [])
    interests += get_interests_for_course(payload.course)

    # 3. Parse budget
    budget = parse_budget(
        payload.budget_range  or "",
        payload.budget_custom or "",
    )

    # 4. Location default
    location = (payload.location or "Hyderabad").strip()

    # 5. Run AI-powered search or local engine
    if USE_AI_SEARCH:
        result = search_colleges_with_gemini(
            name     = payload.name,
            marks    = payload.marks,
            stream   = stream,
            location = location,
            budget   = budget,
            course   = payload.course,
            interests= interests,
            top_n    = 8,
        )
        # If AI search failed, fall back to local engine
        if result.get("error"):
            print("[main] AI search failed, falling back to local engine")
            result = recommend(
                marks        = payload.marks,
                stream       = stream,
                location     = location,
                budget       = budget,
                interests    = interests,
                college_types= payload.college_types,
            )
    else:
        result = recommend(
            marks        = payload.marks,
            stream       = stream,
            location     = location,
            budget       = budget,
            interests    = interests,
            college_types= payload.college_types,
        )

    return RecommendResponse(
        student_name   = payload.name,
        results        = result["results"],
        total_eligible = result["total_eligible"],
        filters_applied= result["filters_applied"],
        message        = result.get("message"),
        ai_powered     = result.get("ai_powered", False),
    )


@app.get("/colleges", tags=["Data"])
def list_colleges(
    stream:   Optional[str] = None,
    location: Optional[str] = None,
    max_fee:  Optional[int] = None,
):
    """Browser-friendly endpoint to list/filter all colleges in the database."""
    data = COLLEGES
    if stream:
        data = [c for c in data if stream.upper() in [s.upper() for s in c["stream"]]]
    if location:
        data = [c for c in data if c["location"].lower() == location.lower()]
    if max_fee is not None:
        data = [c for c in data if c["fee_per_year"] <= max_fee]
    return {"total": len(data), "colleges": data}


@app.get("/colleges/{college_id}", tags=["Data"])
def get_college(college_id: int):
    """Return full details for a single college by ID."""
    for c in COLLEGES:
        if c["id"] == college_id:
            return c
    raise HTTPException(status_code=404, detail=f"College with id={college_id} not found.")


@app.get("/streams", tags=["Data"])
def list_streams():
    """Return all unique streams present in the database."""
    streams: set[str] = set()
    for c in COLLEGES:
        streams.update(c["stream"])
    return {"streams": sorted(streams)}


@app.get("/locations", tags=["Data"])
def list_locations():
    """Return all unique locations present in the database."""
    locations = sorted({c["location"] for c in COLLEGES})
    return {"locations": locations}


# ── Dev runner ────────────────────────────────────────────────────────────────
# Mount frontend LAST (after all API routes) so API routes take priority
_FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
if _FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(_FRONTEND_DIR), html=True), name="frontend")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
