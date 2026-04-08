# ═══════════════════════════════════════════════════════════════
# EduMatch — Setup Guide
# ═══════════════════════════════════════════════════════════════

## Quick Start (Two Options)

### Option 1: Local Database (Fast, No Setup Required) ⚡
The system comes with **50 colleges** from major Indian cities in `colleges.json`.
Works immediately without any API configuration.

**Pros:**
- ✅ No setup required
- ✅ Fast responses
- ✅ Works offline
- ✅ Great for testing

**Cons:**
- ❌ Limited to 50 hardcoded colleges
- ❌ Data isn't real-time

**To use:** Just run the server, everything works by default

---

### Option 2: Real Internet Search (Recommended) 🌐
Search for actual colleges from the internet using Google Custom Search API.

**Pros:**
- ✅ Real-time college data
- ✅ Covers all colleges in India
- ✅ Up-to-date fees & placements
- ✅ More accurate results

**Cons:**
- ⚠️ Requires API key setup
- ⚠️ Slower than local database
- ⚠️ Depends on Google API availability

---

## Setup Guide for Real Internet Search

### Step 1: Get Google Custom Search API Key

1. Go to **Google Cloud Console**:
   https://console.cloud.google.com/

2. **Create a new project**:
   - Click on project dropdown
   - Select "New Project"
   - Name it "EduMatch"
   - Click Create

3. **Enable Custom Search API**:
   - In search bar, type "Custom Search API"
   - Select it
   - Click "Enable"

4. **Create API Credentials**:
   - Click "Go to Credentials" or go to: https://console.cloud.google.com/apis/credentials
   - Click "Create Credentials" → "API Key"
   - Copy your API Key (save it!)

### Step 2: Set Up Custom Search Engine

1. Go to **Google Custom Search**:
   https://cse.google.com/cse/

2. **Create new search engine**:
   - Click "Create" (+)
   - In "Sites to search", type: `*`
   - Search engine name: `EduMatch College Search`
   - Click "Create"

3. **Get your Search Engine ID (cx)**:
   - Copy the "Search engine ID" shown on the setup page
   - It looks like: `a1b2c3d4e5f6g7h8j`

### Step 3: Configure Your Application

1. **Create `.env` file** in backend directory:
   ```
   cp .env.example .env
   ```

2. **Edit `.env`** and fill in your credentials:
   ```
   USE_REAL_COLLEGE_SEARCH=true
   GOOGLE_SEARCH_API_KEY=your_api_key_here
   CUSTOM_SEARCH_ENGINE_ID=your_cx_here
   GEMINI_API_KEY=your_gemini_key_if_using_chat
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Restart the server**:
   ```bash
   uvicorn main:app --reload
   ```

### Step 4: Verify It's Working

Check the status endpoint:
```
GET http://localhost:8000/status
```

Response should show:
```json
{
  "status": "online ✓",
  "mode": "REAL INTERNET SEARCH",
  "colleges_loaded": 0,
  "api_docs": "http://localhost:8000/docs"
}
```

---

## Troubleshooting

### "USE_REAL_COLLEGE_SEARCH=true but no colleges found"
- Check if API key is valid
- Check if Custom Search Engine ID is correct
- Go to API quota: https://console.cloud.google.com/apis/api/customsearch

### "Error: Invalid API Key"
- API keys take 2-3 minutes to activate
- Wait a few minutes and try again
- Check that you copied the full key

### "No results for search"
- Free Google Custom Search gives 100 queries/day
- Verify search engine is searching the entire web
- Try simpler search queries

---

## API Quotas & Costs

**Google Custom Search:**
- Free: 100 queries/day
- Paid: $5 per 1000 queries (after free tier)

For full college database, consider upgrading to paid tier.

---

## Alternative: Use Local Database

If API setup is too complicated, just use Option 1 (Local Database).
It has 50 colleges from:
- Hyderabad (Telangana)
- Bangalore (Karnataka)
- Delhi
- Mumbai (Maharashtra)
- Pune
- Chennai (Tamil Nadu)
- Trichy
- Mangalore
- Kolkata (West Bengal)
- Kochi (Kerala)

---

## Support

For issues:
1. Check `.env` file has correct credentials
2. Verify API key is active (wait 3 min if just created)
3. Check request format in API docs: `/docs`
4. Look at server logs for detailed errors

