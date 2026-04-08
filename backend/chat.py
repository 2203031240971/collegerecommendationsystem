"""
chat.py — EduMatch AI Chat Endpoint
=====================================
Powered by Google Gemini (gemini-1.5-flash) via Google AI Studio.
Streams responses token-by-token using Server-Sent Events (SSE).
"""

import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Try to import Gemini, but continue if not available
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️  WARNING: google-generativeai not installed. Chat feature disabled.")
    print("   Install it with: pip install google-generativeai")

# ── Gemini config ─────────────────────────────────────────────────────────────
GEMINI_API_KEY = "AIzaSyAXmt6MiXjBr_aUCq0ckdWcUhPfmpohS2I"
GEMINI_MODEL   = "gemini-2.5-flash"

router = APIRouter(tags=["AI Chat"])


# ── Request models ────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str      # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message:         str
    history:         list[ChatMessage] = []
    student_profile: dict              = {}
    top_colleges:    list[dict]        = []


# ── System prompt builder ─────────────────────────────────────────────────────
def build_system_prompt(profile: dict, colleges: list[dict]) -> str:
    lines = []
    for i, c in enumerate(colleges[:6], 1):
        courses = ", ".join(c.get("courses", [])[:3]) or "—"
        lines.append(
            f"{i}. {c.get('name','?')}  |  "
            f"Cutoff {c.get('cutoff_marks','?')}%  |  "
            f"Fee ₹{c.get('fee_per_year','?')}/yr  |  "
            f"Avg Package {c.get('placement_avg','?')} LPA  |  "
            f"Category: {c.get('category','?')}  |  "
            f"Courses: {courses}"
        )
    college_block = "\n".join(lines) if lines else "No colleges matched yet."

    interests = ", ".join(profile.get("interests", [])) or "not specified"
    budget    = profile.get("budget", 0)
    budget_str = f"₹{int(budget):,}" if budget else "not specified"

    return f"""You are EduMatch AI — a warm, expert college counselor for students in Telangana & Andhra Pradesh, India.
You help Inter / 10th students choose the right college and course.
Talk like a knowledgeable elder sibling — friendly, specific, and honest.

═══ STUDENT PROFILE ═══
Name     : {profile.get("name", "Student")}
Marks    : {profile.get("marks", "?")}%
Stream   : {profile.get("stream", "?")}
Location : {profile.get("location", "Hyderabad")}
Budget   : {budget_str} / year
Interests: {interests}

═══ TOP MATCHED COLLEGES ═══
{college_block}

═══ YOUR RULES ═══
1. Recommend ONLY from the colleges listed above — use their exact names and data numbers.
2. Mention specific cutoffs, fees, and average packages when relevant.
3. Always suggest a SAFE option AND a REACH option when giving general advice.
4. Use simple, clear language — the student may be 16-17 years old.
5. Keep answers ≤ 150 words unless the student explicitly asks for more detail.
6. For entrance exams mention EAMCET (engineering/medical) or ECET (diploma holders).
7. NEVER invent college data — only use what is listed above.
8. End every answer with ONE concrete next step the student can take TODAY.
9. Use friendly emojis occasionally 😊🎓 — keep it warm but professional.
10. If asked about anything unrelated to education / colleges, gently redirect:
    "That's a bit outside my expertise — I'm best at helping with college choices! 😊"

You are helping a real student make one of the biggest decisions of their life.
Be accurate, be kind, be specific."""


@router.get("/models")
async def list_available_models():
    if not GEMINI_AVAILABLE:
        return {"error": "Gemini AI not available. Install: pip install google-generativeai", "models": []}
    
    genai.configure(api_key=GEMINI_API_KEY)
    models = []
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                models.append(m.name)
        return {"models": models}
    except Exception as e:
        return {"error": str(e)}

# ── Chat endpoint ─────────────────────────────────────────────────────────────
@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    if not GEMINI_AVAILABLE:
        # Return error response via streaming
        def generate_error():
            msg = "⚠️ AI Chat is currently unavailable. Please install google-generativeai: pip install google-generativeai"
            yield f"data: {json.dumps({'token': msg})}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            generate_error(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )
    
    system_prompt = build_system_prompt(req.student_profile, req.top_colleges)

    # Configure Gemini with student-specific system instruction
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=system_prompt,
    )

    # Convert frontend history (role: user/assistant) → Gemini format (role: user/model)
    # Gemini requires: alternating turns, must START with "user"
    raw_history = []
    for msg in req.history:
        gemini_role = "model" if msg.role == "assistant" else "user"
        raw_history.append({"role": gemini_role, "parts": [{"text": msg.content}]})

    # Strip leading "model" turns so history always starts with "user"
    started_with_user = False
    clean_history = []
    for turn in raw_history:
        if turn["role"] == "user":
            started_with_user = True
        if started_with_user:
            clean_history.append(turn)

    # Merge consecutive same-role turns (safety net)
    merged = []
    for turn in clean_history:
        if merged and merged[-1]["role"] == turn["role"]:
            merged[-1]["parts"][0]["text"] += "\n" + turn["parts"][0]["text"]
        else:
            merged.append(turn)

    chat_session = model.start_chat(history=merged)

    def generate():
        try:
            response = chat_session.send_message(req.message, stream=True)
            for chunk in response:
                try:
                    text = chunk.text
                except (ValueError, AttributeError):
                    text = None
                
                if text:
                    yield f"data: {json.dumps({'token': text})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            import traceback
            tb = traceback.format_exc()
            print("GEMINI ERROR:", tb)
            with open("gemini_error.txt", "w") as f:
                f.write(tb)
                
            fallback = (
                "Sorry, I'm having a moment! 😅 "
                "Please try again — I'm here to help with your college choices."
            )
            yield f"data: {json.dumps({'token': fallback})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection":    "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
