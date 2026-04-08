"""Quick test of the AI college search module."""
import sys
sys.path.insert(0, '.')
from ai_college_search import search_colleges_with_gemini

print("Testing AI college search...")
result = search_colleges_with_gemini(
    name="Ravi Kumar",
    marks=88,
    stream="MPC",
    location="Hyderabad",
    budget=150000,
    course="btech-cs",
    interests=["computers", "artificial intelligence", "technology"],
    top_n=5,
)

print(f"\nAI Powered: {result.get('ai_powered')}")
print(f"Message: {result.get('message')}")
print(f"Error: {result.get('error')}")
print(f"Colleges found: {result.get('total_eligible', 0)}")

for i, c in enumerate(result.get('results', [])[:3]):
    print(f"\n  [{i+1}] {c['name']} — {c['location']}")
    print(f"      Fee: ₹{c['fee_per_year']:,}/yr | Cutoff: {c['cutoff_marks']}% | Category: {c['category']}")
    print(f"      AI Tip: {c.get('ai_tip', 'None')}")
