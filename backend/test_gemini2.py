import google.generativeai as genai
import sys
import traceback

API_KEY = "AIzaSyAXmt6MiXjBr_aUCq0ckdWcUhPfmpohS2I"

try:
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content("Say hello in one sentence.")
    
    with open("test_out.txt", "w") as f:
        f.write("SUCCESS: " + response.text[:200])
except Exception as e:
    with open("test_out.txt", "w") as f:
        f.write("ERROR TYPE: " + type(e).__name__ + "\n")
        f.write("TRACEBACK:\n")
        f.write(traceback.format_exc())
