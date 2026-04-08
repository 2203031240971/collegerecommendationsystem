"""
Diagnostic: Call AI college search and write full output to file.
Run from backend directory: python diagnose_ai.py
"""
import sys
import traceback
import json

sys.path.insert(0, '.')

output_lines = []

def log(msg):
    print(msg)
    output_lines.append(str(msg))

try:
    log("Step 1: Importing ai_college_search...")
    from ai_college_search import search_colleges_with_gemini
    log("Step 1: OK")

    log("Step 2: Calling Gemini API...")
    result = search_colleges_with_gemini(
        name="Test Student",
        marks=88,
        stream="MPC",
        location="Hyderabad",
        budget=150000,
        course="btech-cs",
        interests=["computers", "technology"],
        top_n=5,
    )
    log("Step 2: Done")
    log(f"ai_powered = {result.get('ai_powered')}")
    log(f"error flag = {result.get('error')}")
    log(f"message = {result.get('message')}")
    log(f"total_eligible = {result.get('total_eligible', 0)}")

    for c in result.get("results", [])[:3]:
        log(f"\n  College: {c['name']}")
        log(f"  Location: {c['location']}")
        log(f"  Fee: Rs{c['fee_per_year']}")
        log(f"  Category: {c['category']}")
        log(f"  AI Tip: {c.get('ai_tip', 'N/A')}")

except Exception as e:
    log(f"\nEXCEPTION: {type(e).__name__}: {e}")
    log(traceback.format_exc())

with open("ai_diagnose_out.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(output_lines))

print("\nOutput saved to ai_diagnose_out.txt")
