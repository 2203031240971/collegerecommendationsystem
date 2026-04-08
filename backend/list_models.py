import google.generativeai as genai

API_KEY = "AIzaSyAXmt6MiXjBr_aUCq0ckdWcUhPfmpohS2I"
genai.configure(api_key=API_KEY)

try:
    with open("models.txt", "w") as f:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                f.write(m.name + "\n")
except Exception as e:
    with open("models.txt", "w") as f:
        f.write("ERROR: " + str(e))
