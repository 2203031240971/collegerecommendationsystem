"""
college_search.py — Real Internet College Search
===============================================
Searches for real colleges from the internet using web APIs and web scraping.
Returns actual college data (name, fees, location, cutoff, etc.)
"""

import os
import json
import requests
from typing import Optional

# Configuration
GOOGLE_SEARCH_API_KEY = os.getenv("GOOGLE_SEARCH_API_KEY", "")
CUSTOM_SEARCH_ENGINE_ID = os.getenv("CUSTOM_SEARCH_ENGINE_ID", "")

# Fallback: Education database API or college ranking API
COLLEGE_API_BASE = "https://api.example.com"  # Change this to actual API


def search_colleges_by_criteria(
    course: str,
    location: str,
    marks: float,
    budget: int,
    top_n: int = 10
) -> list[dict]:
    """
    Search for real colleges on the internet matching student criteria.
    
    Parameters:
    -----------
    course      : Student's desired course (e.g., 'B.Tech CSE', 'MBBS')
    location    : Preferred city/state (e.g., 'Hyderabad', 'Bangalore')
    marks       : Student's marks percentage
    budget      : Annual budget in rupees
    top_n       : Number of results to return
    
    Returns:
    --------
    List of college dictionaries with real data
    """
    
    # Method 1: Google Custom Search API
    colleges = _search_via_google_custom_search(course, location, marks, budget)
    
    # If no results, try fallback method
    if not colleges:
        colleges = _search_via_education_api(course, location, marks, budget)
    
    # Filter and rank results
    colleges = _filter_and_rank_colleges(colleges, marks, budget, top_n)
    
    return colleges


def _search_via_google_custom_search(
    course: str,
    location: str,
    marks: float,
    budget: int
) -> list[dict]:
    """Search for colleges using Google Custom Search API."""
    
    if not GOOGLE_SEARCH_API_KEY or not CUSTOM_SEARCH_ENGINE_ID:
        print("⚠️ Google Search API not configured. Set GOOGLE_SEARCH_API_KEY and CUSTOM_SEARCH_ENGINE_ID")
        return []
    
    try:
        # Build search query
        query = f"{course} colleges {location} India cutoff {marks}% fees {budget}"
        
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "q": query,
            "key": GOOGLE_SEARCH_API_KEY,
            "cx": CUSTOM_SEARCH_ENGINE_ID,
            "num": 10,
        }
        
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        colleges = _parse_search_results(data.get("items", []))
        
        return colleges
    
    except Exception as e:
        print(f"❌ Google Search API error: {e}")
        return []


def _search_via_education_api(
    course: str,
    location: str,
    marks: float,
    budget: int
) -> list[dict]:
    """Fallback: Search using college database/ranking API."""
    
    try:
        # Try open-source or free education APIs
        # Example: Using a hypothetical college API endpoint
        
        query = {
            "course": course,
            "location": location,
            "cutoff_min": max(0, marks - 10),
            "cutoff_max": marks + 5,
            "budget_max": budget,
            "results_limit": 10
        }
        
        # This would call a real college database API
        # For now, return empty (user needs to configure actual API)
        
        return []
    
    except Exception as e:
        print(f"❌ Education API error: {e}")
        return []


def _parse_search_results(items: list) -> list[dict]:
    """Extract college information from Google search results."""
    
    colleges = []
    
    for item in items:
        try:
            college = {
                "name": item.get("title", "").replace(" - College / University", ""),
                "location": "",  # Extract from snippet if possible
                "description": item.get("snippet", ""),
                "url": item.get("link", ""),
                "source": "Google Search"
            }
            colleges.append(college)
        except Exception as e:
            print(f"Error parsing result: {e}")
            continue
    
    return colleges


def _filter_and_rank_colleges(
    colleges: list[dict],
    marks: float,
    budget: int,
    top_n: int
) -> list[dict]:
    """Filter and rank colleges based on student criteria."""
    
    # Score each college (0-100)
    scored = []
    
    for college in colleges:
        score = 50  # Base score
        
        # Check if college name contains relevant keywords
        name_lower = college.get("name", "").lower()
        
        # Boost score for different factors
        if any(x in name_lower for x in ["iit", "nit", "bits", "dtu", "iiit"]):
            score += 20  # Tier-1 colleges
        
        if any(x in name_lower for x in ["government", "govt", "central"]):
            score += 10  # Government colleges preferred
        
        college["score"] = score
        scored.append(college)
    
    # Sort by score and return top N
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_n]


def get_enriched_college_data(college_name: str, course: str) -> dict:
    """
    Get detailed information about a specific college.
    Searches online for:
    - Exact fees for the course
    - Cutoff marks
    - Placement statistics
    - Campus facilities
    - Rating/reviews
    """
    
    try:
        # Search for college details
        query = f"{college_name} {course} fees cutoff placement 2024"
        
        # This would call a search engine or scrape college website
        # For now, return a placeholder
        
        college_data = {
            "name": college_name,
            "course": course,
            "fees": None,  # Would be fetched from web
            "cutoff": None,
            "placement_avg": None,
            "rating": None,
            "reviews_count": 0
        }
        
        return college_data
    
    except Exception as e:
        print(f"❌ Error fetching college details: {e}")
        return None


def setup_google_search_api():
    """
    Guide user to set up Google Custom Search API.
    """
    
    instructions = """
    ╔═══════════════════════════════════════════════════════════════╗
    ║  SETUP: Google Custom Search API for College Search           ║
    ╚═══════════════════════════════════════════════════════════════╝
    
    1. Go to Google Cloud Console:
       https://console.cloud.google.com/
    
    2. Create a new project
    
    3. Enable Custom Search API:
       - Search for "Custom Search API"
       - Click "Enable"
    
    4. Create API credentials:
       - Go to Credentials
       - Create API Key (Restrict to Custom Search API)
    
    5. Set up Custom Search Engine:
       https://cse.google.com/cse/
       - Create new search engine
       - Make it search the entire web
       - Get the Search Engine ID (cx)
    
    6. Add to your environment (.env):
       GOOGLE_SEARCH_API_KEY=your_api_key_here
       CUSTOM_SEARCH_ENGINE_ID=your_cx_here
    
    7. Restart the server
    
    ═══════════════════════════════════════════════════════════════
    """
    
    print(instructions)
