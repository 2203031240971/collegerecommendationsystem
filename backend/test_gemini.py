import google.generativeai as genai
import sys

API_KEY = "AIzaSyAXmt6MiXjBr_aUCq0ckdWcUhPfmpohS2I"

try:
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content("Say hello in one sentence.")
    print("SUCCESS:", response.text[:200])
except Exception as e:
    print("ERROR TYPE:", type(e).__name__)
    print("ERROR:", str(e)[:500])
    sys.exit(1)
