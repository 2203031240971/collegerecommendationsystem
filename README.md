# 🎓 EduMatch — AI-Powered College Recommendation Platform

An intelligent college recommendation system that helps students find their perfect college match based on marks, budget, preferences, and interests.

---

## 🚀 What's New (Latest Update)

### Multi-State College Support ✨
The platform now shows colleges from **multiple Indian states**, not just your local state!

**Colleges Available:**
- 🔴 **Hyderabad** (Telangana) - 10+ colleges
- 🔵 **Bangalore** (Karnataka) - IIT, NIT, BITS
- 🟢 **Delhi** - IIT Delhi, DTU, DU
- 🟡 **Mumbai** (Maharashtra) - IIT Bombay, VJTI
- 🟣 **Pune** - Symbiosis, FLAME University
- 🔶 **Chennai** (Tamil Nadu) - IIT Madras, NIT Trichy
- 🟠 And many more...

**Total: 50+ colleges across major Indian cities**

---

## 📋 Two Operating Modes

### Mode 1: Local Database 🏠 (Default)
- ✅ Works immediately with 50 pre-loaded colleges
- ✅ No API key needed
- ✅ Fast responses
- ✅ Perfect for testing
- ❌ Limited to hardcoded data

**Status:** `LOCAL DATABASE MODE`

### Mode 2: Real Internet Search 🌐 (Optional)
- ✅ Search for ANY college in India
- ✅ Real-time data
- ✅ Up-to-date fees & placements  
- ❌ Requires Google API setup
- ❌ Slower responses

**To activate:** Set `USE_REAL_COLLEGE_SEARCH=true` in `.env`

---

## ⚡ Quick Start

### 1. **Start Backend Server**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

✅ Server running at: `http://localhost:8000`
✅ API docs: `http://localhost:8000/docs`

### 2. **Open Frontend**
```bash
# In browser, open:
# Windows Chrome: file:///C:/Users/pdhar/OneDrive/...

# OR serve with Python:
python -m http.server 3000 --directory frontend
```

✅ Frontend at: `http://localhost:3000/index.html`

### 3. **Fill College Form**
- Enter your name (validated for proper format)
- Select class, category, course
- Enter marks (0-100)
- Set budget & location
- Click "Find Colleges" → Review Profile → Search

✅ Get personalized recommendations with AI-powered ranking

### 4. **Chat with AI Advisor** 💬
- Ask about colleges, fees, placements
- Get personalized advice
- Real-time streaming responses
- Powered by Google Gemini

---

## 🎯 Key Features

| Feature | Status | Details |
|---------|--------|---------|
| Multi-state college database | ✅ | 50+ colleges from 10+ states |
| Smart recommendation engine | ✅ | 4-factor scoring algorithm |
| Profile validation | ✅ | Name validation, confirmation before search |
| AI chat advisor | ✅ | Gemini-powered responses |
| Responsive design | ✅ | Works on desktop & mobile |
| Real-time college search | 🔄 | Setup required (see SETUP_GUIDE.md) |

---

## 🔍 How It Works

### Recommendation Algorithm
Colleges are scored on 4 factors:

```
Score = (30% Marks Buffer) + (30% Interest Match) + (20% Location) + (20% Budget)
```

Each college is categorized:
- 🟢 **Safe** - If marks > cutoff + 15
- 🟡 **Match** - If marks > cutoff + 5  
- 🔴 **Reach** - If marks ≈ cutoff

---

## 📁 Project Structure

```text
AI-powered college recommendation platform/

1. frontend/
   ├── css/
   │   ├── chat.css
   │   ├── components.css
   │   ├── results.css
   │   └── styles.css
   ├── js/
   │   ├── app.js
   │   ├── chat.js
   │   └── results.js
   ├── chat.html
   ├── index.html
   └── results.html

2. backend/
   ├── __pycache__/
   ├── .pytest_cache/
   ├── ai_college_search.py
   ├── ai_diagnose_out.txt
   ├── chat.py
   ├── college_search.py
   ├── colleges.json
   ├── diagnose_ai.py
   ├── engine.py
   ├── gemini_error.txt
   ├── list_models.py
   ├── main.py
   ├── requirements.txt
   ├── test_ai_search.py
   ├── test_api.py
   ├── test_gemini.py
   ├── test_gemini2.py
   └── test_out.txt

3. Root Files
   ├── .venv/                   # Python virtual environment
   ├── .env.example             # Example environment variables
   ├── PROJECT_STATUS.md        # Current project status and history
   ├── README.md                # Project documentation
   └── SETUP_GUIDE.md           # Setup and installation instructions
```

---

## 🔧 API Endpoints

### Get Recommendations
```
POST /recommend

Request:
{
  "name": "Aditya Kumar",
  "student_class": "12",
  "course": "btech-cs",
  "marks": 85,
  "caste": "general",
  "budget_custom": "250000",
  "location": "Bangalore",
  "college_types": [],
  "interests": []
}

Response:
{
  "student_name": "Aditya Kumar",
  "total_eligible": 24,
  "results": [
    {
      "id": 1,
      "name": "JNTU Hyderabad",
      "location": "Hyderabad",
      "match_score": 82.5,
      "admission_chance": "89%",
      "category": "Safe",
      ...
    }
  ]
}
```

### Check Server Status
```
GET /status

Response:
{
  "status": "online ✓",
  "mode": "LOCAL DATABASE",
  "colleges_loaded": 50,
  "api_docs": "http://localhost:8000/docs"
}
```

### AI Chat (Streaming)
```
POST /chat

EventStream with token-by-token responses
```

---

## 🔑 Environment Configuration

### Create `.env` file:
```bash
cp .env.example .env
```

### For Local Mode (Default):
```
USE_REAL_COLLEGE_SEARCH=false
```

### For Real Internet Search:
```
USE_REAL_COLLEGE_SEARCH=true
GOOGLE_SEARCH_API_KEY=your_api_key
CUSTOM_SEARCH_ENGINE_ID=your_cx_id
GEMINI_API_KEY=your_gemini_key
```

See `SETUP_GUIDE.md` for detailed instructions.

---

## ✨ Recent Improvements

### Profile Validation ✓
- Name must have 2+ parts (first + last)
- Only letters, spaces, hyphens allowed
- Real-time validation with error messages
- Prevents typos and nonsense entries

### Profile Review Modal ✓
- Show all details before searching
- Chance to go back and edit
- Clear "Back & Edit" or "Confirm" options
- Prevents accidental wrong submissions

### Multi-State College Support ✓
- Colleges from 10+ major Indian cities
- Intelligent scoring (location is only 20% weight)
- Safe/Match/Reach categorization
- Placement average shown for each college

---

## 🐛 Known Issues & Fixes

### Issue: Chat Error "Invalid operation: response.text"
**Status:** ⚠️ Needs fixing
**Workaround:** Use demo results, skip chat

### Issue: API Key in chat.py (Security)
**Status:** 🔄 To Fix
**Action:** Move to `.env` file

### Issue: Most colleges from one state
**Status:** ✅ FIXED
**Solution:** Added 20 colleges from other states

---

## 📊 Colleges Available

### Tier-1 (Premier Institutes)
- IIT Bangalore, Delhi, Bombay, Madras
- BITS Pilani Hyderabad
- NIT Trichy, Surathkal

### Government Engineering
- JNTU Hyderabad, Kakinada
- DTU Delhi
- VJTI Mumbai
- Anna University Chennai

### Private Engineering
- Manipal Institute of Technology
- Symbiosis Institute, Pune
- Vignana Bharathi, Hyderabad
- VIT Vellore

### Arts/Commerce/Science
- Delhi University
- Osmania University
- University of Kerala
- Savitribai Phule Pune University

---

## 🚀 Future Enhancements

- [ ] Fix Gemini chat streaming
- [ ] Move API keys to secure vault
- [ ] Add scholarship information
- [ ] Integrate with actual college admission portals
- [ ] Add entrance exam prep resources
- [ ] Export recommendations as PDF
- [ ] Mobile app version
- [ ] Machine learning for personalized recommendations
- [ ] Predictive admission probability

---

## 📞 Support

### Check Status
```bash
curl http://localhost:8000/status
```

### View API Documentation
Visit: `http://localhost:8000/docs`

### Run Tests
```bash
cd backend
python -m pytest test_gemini.py -v
```

---

## 📝 License

This project is open source and available for educational purposes.

---

## 👨‍💻 Credits

**Built with:**
- FastAPI (Python backend)
- Vanilla JavaScript (Frontend)
- Google Gemini AI (Chat)
- Google Custom Search (Real college search)

**Colleges Data:** Manual research + real college websites

---

## 📞 Questions?

1. **Local Mode not working?** → Check `colleges.json` is valid JSON
2. **API returns empty?** → Check `.env` file configuration
3. **Chat not responding?** → Verify Gemini API key is valid
4. **Colleges from only one state?** → That's normal in local mode (50 colleges from various states)

**For Real Internet Search:** Follow SETUP_GUIDE.md

---

**Happy College Hunting! 🎓**

#   c o l l e g e r e c o m m e n d a t i o n s y s t e m  
 