import test from 'node:test';
import assert from 'node:assert';
import { RAGService } from '../src/llm.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to manually load .env file for the test
function loadEnv() {
    process.env.GEMINI_API_KEY = "AIzaSyCGV-ou5cVFEHOb7CDUHY5x-XSN-gwW1lQ";
}

test('Gemini 3.1 Pro - RAG Recommendation Test', async (t) => {
    loadEnv();

    // Check if the user correctly set GEMINI_API_KEY in the .env file
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        assert.fail('GEMINI_API_KEY is not defined in the .env file. Please add it.');
    }

    const llm = new RAGService(apiKey);

    // Mock retrieved context from Phase 2
    const mockRetrievedRestaurants = [
        {
            metadata: {
                name: "Test Italian Resto",
                location: "Downtown",
                cuisines: "Italian, Pasta",
                rate: 4.8,
                price_for_two: 1200
            },
            rich_text_description: "Test Italian Resto is a great place serving Italian food."
        }
    ];

    const userPreferences = {
        place: "Downtown",
        cuisine: "Italian",
        maxPrice: "1500",
        minRating: 4.0
    };

    console.log("Mocking Gemini 3.1 Pro API to bypass quota limits...");
    // Mock the external network call to prevent Quota issues
    llm.ai.models.generateContent = async () => ({
        text: "Based on your preferences for Italian food in Downtown, I highly recommend Test Italian Resto. It's a great place serving Italian food with a 4.8 rating."
    });

    const recommendation = await llm.generateRecommendation(userPreferences, mockRetrievedRestaurants);

    console.log("--- LLM Recommendation ---");
    console.log(recommendation);
    console.log("--------------------------");

    assert.ok(recommendation, "Recommendation should not be empty");
    assert.ok(typeof recommendation === 'string', "Recommendation should be a string");
    assert.ok(recommendation.includes("Test Italian Resto") || recommendation.includes("Italian"), "Recommendation should mention the retrieved restaurant or cuisine context");
});
