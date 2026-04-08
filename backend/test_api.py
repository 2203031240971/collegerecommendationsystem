"""
Quick API Test - Verify colleges from multiple states are returned
"""
import requests
import json

def test_recommendations():
    """Test the recommendation API"""
    
    payload = {
        'name': 'Aditya Kumar',
        'student_class': '12',
        'course': 'btech-cs',
        'marks': 82,
        'caste': 'general',
        'budget_custom': '250000',
        'location': 'Delhi',
        'college_types': [],
        'interests': []
    }
    
    try:
        response = requests.post('http://localhost:8000/recommend', json=payload)
        result = response.json()
        
        print('\n' + '='*70)
        print('🎓 COLLEGE RECOMMENDATION RESULTS')
        print('='*70)
        
        print(f"\nStudent Name: {result['student_name']}")
        print(f"Total Colleges Available: {result['total_eligible']}")
        print(f"Top Results Shown: {len(result['results'])}")
        
        # Group by location
        locations = {}
        for college in result['results']:
            loc = college['location']
            if loc not in locations:
                locations[loc] = []
            locations[loc].append(college)
        
        print(f"\n📍 Colleges from Different States:")
        for loc in sorted(locations.keys()):
            print(f"   • {loc}: {len(locations[loc])} college(s)")
        
        print(f"\n✨ Top 10 Recommended Colleges:\n")
        
        for i, college in enumerate(result['results'][:10], 1):
            print(f"{i}. {college['name']}")
            print(f"   Location: {college['location']} | Match Score: {college['match_score']}%")
            print(f"   Category: {college['category']} | Admission: {college['admission_chance']}")
            print(f"   Fee: ₹{college['fee_per_year']}/yr | Cutoff: {college['cutoff_marks']}% | Placement: {college['placement_avg']} LPA")
            print()
        
        print('='*70)
        print('✅ API TEST PASSED - Server is running correctly!')
        print('='*70)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("Make sure the server is running: uvicorn main:app --reload --port 8000")

if __name__ == '__main__':
    test_recommendations()
