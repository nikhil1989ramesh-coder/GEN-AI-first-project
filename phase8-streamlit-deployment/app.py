import streamlit as st
import pandas as pd
import json
import os
import google.generativeai as genai
import numpy as np

# Apply page config for Swiggy aesthetic
st.set_page_config(page_title="Zomato AI Guide", page_icon="🍽️", layout="wide")

# Inject matching Swiggy-like Card CSS for Streamlit Markdown rendering
st.markdown("""
    <style>
    .stApp {
        background-color: #000000;
        color: #e5e5e5;
    }
    .swiggy-card {
        background-color: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        position: relative;
        border: 1px solid #262626;
        transition: transform 0.2s, box-shadow 0.2s;
        margin-bottom: 24px;
    }
    .swiggy-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 32px rgba(0,0,0,0.8);
    }
    .hero-img {
        position: relative;
        height: 192px;
        width: 100%;
        background-image: url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop');
        background-size: cover;
        background-position: center;
        padding: 16px;
        display: flex;
        align-items: flex-end;
    }
    .hero-img::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%);
    }
    .hero-title {
        color: white;
        font-size: 24px;
        font-weight: 800;
        z-index: 10;
        margin: 0;
        line-height: 1.1;
        letter-spacing: -0.5px;
        text-shadow: 0px 2px 4px rgba(0,0,0,0.5);
    }
    .card-body {
        padding: 16px;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }
    .meta-data {
        color: #737373;
        font-size: 15px;
        font-weight: 500;
        margin-bottom: 8px;
    }
    .rating-pill {
        display: inline-flex;
        align-items: center;
        font-size: 14px;
        font-weight: 700;
        color: #047857;
        margin-top: 4px;
    }
    .rating-pill::before {
        content: '★';
        color: white;
        background-color: #059669;
        border-radius: 9999px;
        padding: 2px 6px;
        font-size: 10px;
        margin-right: 6px;
    }
    .cost-data {
        color: #171717;
        font-weight: 800;
        font-size: 16px;
        margin-top: auto;
        padding-top: 12px;
        padding-bottom: 32px;
    }
    .cost-data span {
        color: #737373;
        font-weight: 500;
        font-size: 14px;
    }
    .offer-banner {
        position: absolute;
        bottom: 16px;
        left: 16px;
        right: 16px;
        background: linear-gradient(to right, #118c4f, #0e703f);
        color: white;
        font-weight: 700;
        font-size: 14px;
        text-align: center;
        padding: 12px;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    </style>
""", unsafe_allow_html=True)

# 1. Initialization and Data Loading
@st.cache_data
def load_data():
    try:
        with open("../zomato_data.json", 'r', encoding='utf-8') as f:
            data = json.load(f)
            return pd.DataFrame(data)
    except FileNotFoundError:
        import urllib.request
        url = "https://raw.githubusercontent.com/ManikaSaini/zomato-restaurant-recommendation/master/zomato.csv"
        df = pd.read_csv(url)
        df['rate'] = df['rate'].astype(str).str.extract(r'([\d.]+)').astype(float)
        df['approx_cost(for two people)'] = df['approx_cost(for two people)'].astype(str).str.replace(',', '').astype(float)
        df = df.dropna(subset=['rate', 'location', 'cuisines'])
        return df

df = load_data()

# Initialize Gemini
API_KEY = st.secrets["GEMINI_API_KEY"] if "GEMINI_API_KEY" in st.secrets else os.environ.get("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)
else:
    st.error("Please configure GEMINI_API_KEY in Streamlit Secrets or environment variables.")
    st.stop()

# 2. Vector DB Mock Logic (Translated from db.js)
def mock_embedding(text):
    np.random.seed(hash(text) % (2**32))
    return np.random.uniform(-1, 1, 1536)

def cosine_similarity(v1, v2):
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

def search_restaurants(place, cuisines, min_price, max_price, min_rating):
    # This replaces the Pinecone query
    filtered = df.copy()
    
    # Strict Metadata Filtering
    if place:
        filtered = filtered[filtered['location'].str.contains(place, case=False, na=False)]
    if min_rating:
        filtered = filtered[filtered['rate'] >= min_rating]
    if max_price:
         filtered = filtered[filtered['approx_cost(for two people)'] <= max_price]
    if min_price:
         filtered = filtered[filtered['approx_cost(for two people)'] > min_price]
         
    if cuisines:
        mask = filtered['cuisines'].apply(lambda c: any(cuisine.lower() in str(c).lower() for cuisine in cuisines))
        filtered = filtered[mask]
        
    if filtered.empty:
        return []
        
    # Mocking Semantic Search similarity sorting
    query = f"{' and '.join(cuisines)} food in {place}"
    q_vec = mock_embedding(query)
    
    # We grab top 20 to deduct dupes
    top_candidates = filtered.head(20).to_dict('records')
    
    # Clean and dedupe by Name
    seen = set()
    cleaned = []
    for row in top_candidates:
        name = str(row['name']).strip()
        if name not in seen:
            seen.add(name)
            # Create the rich_text_description expected by the RAG LLM
            row['rich_text_description'] = f"The restaurant {name} is located in {row['location']}. It specializes in {row['cuisines']} cuisines. It has a rating of {row['rate']}/5.0 based on {row['votes']} votes. The approximate cost for two people is Rs. {row['approx_cost(for two people)']}. Known for its great vibe, it offers {row.get('rest_type', 'various dining options')}."
            cleaned.append(row)
            if len(cleaned) == 5:
                break
                
    return cleaned

def generate_recommendation_html(restaurants, preferences):
    if not restaurants:
        return "<p>No restaurants found matching your criteria. Please relax your filters.</p>"
        
    system_prompt = f"""
    You are an elite, highly persuasive food critic and AI recommendation assistant for Zomato.
    User Preferences:
    Location: {preferences['place']}
    Cuisines: {', '.join(preferences['cuisines'])}
    Budget: {preferences.get('pricePreference', 'Any')}
    Minimum Rating: {preferences['min_rating']} / 5.0
    
    Available Restaurant Context:
    """
    for i, r in enumerate(restaurants):
        system_prompt += f"{i+1}. {r['rich_text_description']}\n"
        
    system_prompt += """
    Critically analyze the provided contextual restaurants against the user's preferences.
    Instead of outputting Markdown tables, you MUST output raw HTML divs using the EXACT Swiggy classes provided below.
    For each recommended restaurant, generate a valid HTML block looking exactly like this format:
    
    <div class="swiggy-card">
        <div class="hero-img">
            <h4 class="hero-title">[Insert Restaurant Name]</h4>
        </div>
        <div class="card-body">
            <div class="meta-data">[Insert Cuisines], [Insert Location]</div>
            <div class="rating-pill">[Insert Rate]/5.0 ([Insert Votes])</div>
            <div class="cost-data">₹[Insert Cost for Two] <span>for two</span></div>
            <div class="offer-banner">FLAT 20% OFF ON ALL ORDERS</div>
        </div>
    </div>
    
    Output ONLY the consecutive HTML divs. Wrap them all in a parent `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">` container. Do not include markdown wrappers (```html).
    """
    
    model = genai.GenerativeModel('gemini-1.5-pro')
    response = model.generate_content(system_prompt)
    return response.text

# 3. Streamlit UI
st.title("🍽️ Your Curated Itinerary")
st.markdown("Discover your next dining experience.")

with st.sidebar:
    st.header("Dining Preferences")
    places = ['Banashankari', 'Basavanagudi', 'Mysore Road', 'Jayanagar', 'Kumaraswamy Layout', 'Rajarajeshwari Nagar', 'Vijay Nagar', 'Uttarahalli', 'JP Nagar', 'South Bangalore', 'City Market', 'Koramangala 5th Block', 'Shanti Nagar', 'Richmond Road', 'Jalahalli', 'Koramangala 4th Block', 'Bellandur', 'Sarjapur Road', 'Marathahalli', 'HSR', 'Koramangala 7th Block', 'Koramangala 1st Block', 'Koramangala 6th Block', 'Koramangala', 'Koramangala 8th Block', 'BTM', 'Koramangala 2nd Block', 'Koramangala 3rd Block', 'Bommanahalli', 'Electronic City', 'Wilson Garden', 'Indiranagar', 'CV Raman Nagar']
    place = st.selectbox("Where are you heading?", places)
    
    cuisines_opts = ["North Indian", "South Indian", "Chinese", "Desserts", "Beverages", "Cafe", "Continental", "Italian", "Fast Food", "Biryani"]
    cuisines = st.multiselect("What are you craving?", cuisines_opts)
    
    budget = st.selectbox("Budget", ["Budget: < ₹500", "Standard: ₹500 - ₹1500", "Luxury: > ₹1500"])
    
    min_rating = st.slider("Min Rating", 1.0, 5.0, 4.0, 0.1)
    
    search_btn = st.button("Discover Best Dining Spots")

if search_btn:
    with st.spinner("Curating your custom Swiggy itinerary..."):
        # Map Budget
        max_p = None
        min_p = None
        price_pref = "Any"
        if "< ₹500" in budget:
            max_p = 500
            price_pref = "Budget (Under ₹500)"
        elif "₹1500" in budget and "Standard" in budget:
            max_p = 1500
            min_p = 500
            price_pref = "Standard (₹500 - ₹1500)"
        elif "> ₹1500" in budget:
            min_p = 1500
            price_pref = "Luxury (Above ₹1500)"
            
        prefs = {"place": place, "cuisines": cuisines, "min_rating": min_rating, "pricePreference": price_pref}
        
        # 1. Retrieve Vector DB Mock
        results = search_restaurants(place, cuisines, min_p, max_p, min_rating)
        
        # 2. Ask Gemini to render Swiggy HTML
        html_cards = generate_recommendation_html(results, prefs)
        
        # 3. Render raw HTML safely
        st.markdown(html_cards, unsafe_allow_html=True)
