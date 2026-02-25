import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import our mocked services from previous phases
import { fetchAndPreprocessData } from '../../phase1-data-ingestion/src/ingest.js';
import { VectorStore } from '../../phase2-vector-db/src/db.js';
import { RAGService } from '../../phase3-llm-integration/src/llm.js';

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

// Initialize services (These would connect to real Pinecone & Gemini APIs)
const db = new VectorStore(process.env.PINECONE_API_KEY, "zomato-recommendations");
const llm = new RAGService(process.env.GEMINI_API_KEY);

// Data Ingestion on Startup Phase 1 -> Phase 2 DB linking
async function initializeData() {
    console.log("Starting Phase 1: Data Ingestion from Hugging Face Zomato Dataset...");
    try {
        const data = await fetchAndPreprocessData(1000); // Fetch top 1000 items for memory storage
        for (const restaurant of data) {
            await db.indexRestaurant(restaurant); // Phase 2: Indexing vectors
        }
        console.log(`Phase 2 completed: indexed ${data.length} restaurants into the Vector DB successfully!`);
    } catch (err) {
        console.error("Failed to ingest data on startup:", err);
    }
}
// Run ingestion asynchronously 
initializeData();

// Basic health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Zomato AI Recommendation API' });
});

// Get all unique filters for the dropdowns
app.get('/api/v1/filters', (req, res) => {
    try {
        const placesSet = new Set();
        const cuisinesSet = new Set();
        const pricesSet = new Set();

        db.index.forEach(item => {
            if (item.metadata) {
                if (item.metadata.location) {
                    const mainLocation = item.metadata.location.split(',')[0].trim();
                    placesSet.add(mainLocation);
                }
                if (item.metadata.cuisines) {
                    // Cuisines is now an array in our schema, but vector DB metadata stringifies it if we used array.
                    // If it is an array, we handle it. If String, we split it.
                    if (Array.isArray(item.metadata.cuisines)) {
                        item.metadata.cuisines.forEach(c => cuisinesSet.add(c.trim()));
                    } else if (typeof item.metadata.cuisines === 'string') {
                        item.metadata.cuisines.split(',').forEach(c => cuisinesSet.add(c.trim()));
                    }
                }
                if (item.metadata.price_for_two) {
                    pricesSet.add(item.metadata.price_for_two);
                }
            }
        });

        res.json({
            success: true,
            places: Array.from(placesSet).sort(),
            cuisines: Array.from(cuisinesSet).sort(),
            prices: Array.from(pricesSet).sort((a, b) => a - b)
        });
    } catch (err) {
        console.error("Error fetching filters:", err);
        res.status(500).json({ error: "Failed to fetch filters" });
    }
});

// The core recommendation endpoint (Phase 4 frontend bridging)
app.post('/api/v1/recommend', async (req, res) => {
    try {
        const { place, cuisines, price_range, min_rating } = req.body;

        // 1. Basic Validation
        if (!place && (!cuisines || cuisines.length === 0)) {
            return res.status(400).json({
                error: "Please provide at least a 'place' or 'cuisine' to get a recommendation."
            });
        }

        // 2. Query the Vector DB (Phase 2 integration)
        console.log(`Searching DB for: Place=${place}, Cuisines=${cuisines ? cuisines.join(', ') : 'None'}`);
        let maxP, minP;
        if (price_range === '500') {
            maxP = 500;
        } else if (price_range === '1500') {
            maxP = 1500;
            minP = 500;
        } else if (price_range === '99999') {
            minP = 1500;
        }

        const searchFilters = {
            location: place,
            cuisines: cuisines || [],
            maxPrice: maxP,
            minPrice: minP,
            minRate: min_rating ? parseFloat(min_rating) : undefined
        };

        // Execute real DB Vector search against our in-memory indexed vectors from Phase 1
        const rawRetrieved = await db.queryRecommendations(`${cuisines ? cuisines.join(' and ') : ''} food in ${place || ''}`, searchFilters, 20); // Oversample to ensure we get 5 unique

        // Deduplicate Restaurants by Name
        const seenNames = new Set();
        const retrievedRestaurants = [];
        for (const item of rawRetrieved) {
            const name = item.metadata.name;
            if (!seenNames.has(name)) {
                seenNames.add(name);
                retrievedRestaurants.push(item);
                if (retrievedRestaurants.length >= 5) break; // Limit strictly to top 5 unique recommendations
            }
        }

        if (retrievedRestaurants.length === 0) {
            return res.json({
                success: true,
                recommendation: "No recommendations returned. Try relaxing filters.",
                context_used: []
            });
        }

        // 3. Generate Recommendation (Phase 3 integration)
        const userPreferences = {
            place,
            cuisine: cuisines ? cuisines.join(', ') : '',
            pricePreference: price_range === '99999' ? 'Luxury (Above ₹1500)' : (price_range === '1500' ? 'Standard (₹500 - ₹1500)' : 'Budget (Under ₹500)'),
            minRating: min_rating
        };

        let recommendation;
        try {
            recommendation = await llm.generateRecommendation(userPreferences, retrievedRestaurants);
        } catch (llmError) {
            console.error("Gemini API generation failed (quota/network). Using graceful fallback.", llmError.message);
            let fallbackMd = `### 🌟 Handpicked Dining Selections\n\n`;
            fallbackMd += `| Restaurant Name | Address | Rating (Reviews) | Cost for Two |\n`;
            fallbackMd += `| :--- | :--- | :--- | :--- |\n`;
            retrievedRestaurants.forEach((r, idx) => {
                const m = r.metadata;
                fallbackMd += `| **${m.name}** | ${m.address || m.location || 'N/A'} | ${m.rate}/5.0 (${m.votes || 0}) | ₹${m.price_for_two} |\n`;
            });
            recommendation = fallbackMd;
        }

        // 4. Return result
        res.json({
            success: true,
            recommendation: recommendation,
            context_used: retrievedRestaurants.map(r => r.metadata.name)
        });

    } catch (error) {
        console.error("API Error in /recommend:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

// For testing purposes, we export the app without listening automatically
export default app;

// If run directly, start server
if (process.argv[1].endsWith('server.js')) {
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
        console.log(`Backend Server running on http://localhost:${PORT}`);
    });
}
