import { promises as fs } from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

async function generateEmbeddings(text) {
    let seed = 0;
    for (let i = 0; i < text.length; i++) seed += text.charCodeAt(i);
    return Array(1536).fill(0).map((_, i) => Math.sin(seed + i));
}

function cosineSimilarityMock(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function assembleContext(restaurants) {
    if (!restaurants || restaurants.length === 0) {
        return "No matching restaurants found in the database. Please inform the user that their criteria did not match any of our currently listed options.";
    }

    let contextString = "### Retrieved Zomato Dataset Results:\n\n";
    restaurants.forEach((rest, index) => {
        const cost = rest['approx_cost(for two people)'] ? rest['approx_cost(for two people)'].toString().replace(/,/g, '') : "N/A";
        contextString += `**Option ${index + 1}: ${rest.name}**\n`;
        contextString += `- Location: ${rest.location}\n`;
        contextString += `- Full Address: ${rest.address || "N/A"}\n`;
        contextString += `- Cuisines: ${rest.cuisines}\n`;
        contextString += `- Rating: ${rest.rate} / 5 (based on ${rest.votes || 0} reviews)\n`;
        contextString += `- Type: ${rest.rest_type || "N/A"}\n`;
        contextString += `- Cost for Two: ₹${cost}\n`;
        contextString += `- Overview: The restaurant ${rest.name} is located in ${rest.location}. It specializes in ${rest.cuisines} cuisines. It has a rating of ${rest.rate}/5.0 based on ${rest.votes || 0} votes. The approximate cost for two people is Rs. ${cost}. Known for its great vibe, it offers ${rest.rest_type || 'various dining options'}.\n\n`;
    });
    return contextString;
}

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { place, cuisines, price_range, min_rating } = req.body;

        if (!place && (!cuisines || cuisines.length === 0)) {
            return res.status(400).json({ error: "Please provide at least a 'place' or 'cuisine' to get a recommendation." });
        }

        const dataPath = path.join(__dirname, 'data.json');
        const fileContent = await fs.readFile(dataPath, 'utf-8');
        const data = JSON.parse(fileContent);

        let maxP, minP;
        if (price_range === '500') {
            maxP = 500;
        } else if (price_range === '1500') {
            maxP = 1500;
            minP = 500;
        } else if (price_range === '99999') {
            minP = 1500;
        }

        let filtered = data.filter(record => {
            let match = true;
            if (min_rating && record.rate && record.rate < parseFloat(min_rating)) match = false;

            if (record['approx_cost(for two people)']) {
                const cost = parseInt(record['approx_cost(for two people)'].toString().replace(/,/g, ''));
                if (maxP && cost > maxP) match = false;
                if (minP && cost <= minP) match = false;
            }
            if (place && !record.location?.toLowerCase().includes(place.toLowerCase())) match = false;

            if (cuisines && cuisines.length > 0) {
                const cArray = typeof record.cuisines === 'string' ? record.cuisines.split(',') : (record.cuisines || []);
                const matches = cuisines.some(sc => cArray.some(c => c && c.toLowerCase().includes(sc.toLowerCase())));
                if (!matches) match = false;
            }
            return match;
        });

        if (filtered.length === 0) {
            return res.status(200).json({ success: true, recommendation: "No recommendations returned. Try relaxing filters.", context_used: [] });
        }

        const queryText = `${cuisines ? cuisines.join(' and ') : ''} food in ${place || ''}`;
        const queryVector = await generateEmbeddings(queryText);

        const candidatesPromises = filtered.slice(0, 50).map(async (record) => {
            const desc = `The restaurant ${record.name} is located in ${record.location}. It specializes in ${record.cuisines} cuisines.`;
            const v = await generateEmbeddings(desc);
            return { ...record, score: cosineSimilarityMock(queryVector, v) };
        });

        const scored = await Promise.all(candidatesPromises);
        scored.sort((a, b) => b.score - a.score);

        const seenNames = new Set();
        const retrievedRestaurants = [];
        for (const item of scored) {
            if (!seenNames.has(item.name)) {
                seenNames.add(item.name);
                retrievedRestaurants.push(item);
                if (retrievedRestaurants.length >= 5) break;
            }
        }

        const userPreferences = {
            place,
            cuisine: cuisines ? cuisines.join(', ') : '',
            pricePreference: price_range === '99999' ? 'Luxury (Above ₹1500)' : (price_range === '1500' ? 'Standard (₹500 - ₹1500)' : 'Budget (Under ₹500)'),
            minRating: min_rating
        };

        const context = assembleContext(retrievedRestaurants);

        const systemInstruction = `
You are a highly helpful and expert AI Restaurant Recommendation Assistant. 
Your primary job is to recommend the best dining options based STRICTLY on the retrieved context below, which is sourced from the Zomato database. 

### Rules:
1. ONLY recommend restaurants that are present in the 'Retrieved Zomato Dataset Results' context section. Do NOT hallucinate, invent, or bring in outside knowledge about other restaurants.
2. If the context says 'No matching restaurants found', politely apologize to the user and explain that no options matched their specific criteria.
3. Your tone should be friendly, enthusiastic, and highly professional.
4. When recommending, state clearly WHY you are recommending them based on the user's preferences, leading into a detailed data table.
5. **CRITICAL REQUIREMENT:** For every recommended restaurant, you MUST provide full insights including its exact Name, Full Address, specific Rating (X/5) and Number of Reviews, and Cost for Two. Do NOT include Establishment Type.
6. Format your response cleanly using a **Markdown Table**. The table MUST have the following columns EXACTLY: \`| Restaurant Name | Address | Rating (Reviews) | Cost for Two |\`

### User Preferences:
- Place: ${userPreferences.place || 'Any'}
- Cuisine: ${userPreferences.cuisine || 'Any'}
- Budget: ${userPreferences.pricePreference || 'Any'}
- Minimum Rating: ${userPreferences.minRating || 'Any'}

${context}
        `;

        const prompt = `Based on my preferences (Place: ${userPreferences.place || 'Any'}, Cuisine: ${userPreferences.cuisine || 'Any'}, Budget: ${userPreferences.pricePreference || 'Any'}), please recommend me a place to eat using the provided Zomato dataset.`;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is not configured.");
            res.status(500).json({ error: "Server Configuration Error: LLM Provider Key Missing" });
            return;
        }

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.3,
            }
        });

        res.status(200).json({
            success: true,
            recommendation: response.text,
            context_used: retrievedRestaurants.map(r => r.name)
        });

    } catch (err) {
        console.error("API Error in /recommend:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
}
