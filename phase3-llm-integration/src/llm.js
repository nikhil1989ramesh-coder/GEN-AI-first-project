// src/llm.js
// Note: We use the @google/genai SDK to interface with Gemini.
import { GoogleGenAI } from '@google/genai';

export class RAGService {
    constructor(apiKey) {
        // Initialize the new Google Gen AI SDK
        this.ai = new GoogleGenAI(apiKey ? { apiKey } : {});
        // Using Gemini 2.0 Flash as substitution for the requested model version to get a working API endpoint
        this.modelName = "gemini-2.0-flash";
    }

    /**
     * Assemblies the retrieved restaurant documents into a clean context block.
     */
    assembleContext(retrievedRestaurants) {
        if (!retrievedRestaurants || retrievedRestaurants.length === 0) {
            return "No matching restaurants found in the database. Please inform the user that their criteria did not match any of our currently listed options.";
        }

        let contextString = "### Retrieved Zomato Dataset Results:\n\n";

        retrievedRestaurants.forEach((rest, index) => {
            const m = rest.metadata || {};
            contextString += `**Option ${index + 1}: ${m.name || rest.name}**\n`;
            contextString += `- Location: ${m.location || rest.location}\n`;
            contextString += `- Full Address: ${m.address || "N/A"}\n`;
            contextString += `- Cuisines: ${m.cuisines || rest.cuisines}\n`;
            contextString += `- Rating: ${m.rate || rest.rate} / 5 (based on ${m.votes || 0} reviews)\n`;
            contextString += `- Type: ${m.rest_type || "N/A"}\n`;
            contextString += `- Cost for Two: ₹${m.price_for_two || rest.price_for_two}\n`;
            contextString += `- Overview: ${rest.rich_text_description || rest.description || "N/A"}\n\n`;
        });

        return contextString;
    }

    /**
     * Uses Gemini 3.1 Pro to generate a friendly recommendation based ONLY on the retrieved data.
     */
    async generateRecommendation(userPreferences, retrievedRestaurants) {
        const context = this.assembleContext(retrievedRestaurants);

        // Prompt Engineering enforcing strict RAG boundaries
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
- Max Price for Two: ${userPreferences.maxPrice ? '₹' + userPreferences.maxPrice : 'Any'}
- Minimum Rating: ${userPreferences.minRating || 'Any'}

${context}
        `;

        const prompt = `Based on my preferences (Place: ${userPreferences.place || 'Any'}, Cuisine: ${userPreferences.cuisine || 'Any'}, Max Price: ${userPreferences.maxPrice || 'Any'}), please recommend me a place to eat using the provided Zomato dataset.`;

        try {
            const response = await this.ai.models.generateContent({
                model: this.modelName,
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.3, // Lower temperature to minimize hallucination
                }
            });

            return response.text;
        } catch (error) {
            console.error("Error generating recommendation with Gemini:", error);
            throw new Error("Failed to generate AI recommendation. Please check your API key and connection.");
        }
    }
}
