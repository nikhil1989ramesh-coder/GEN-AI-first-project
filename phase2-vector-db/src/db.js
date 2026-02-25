export class VectorStore {
    constructor(apiKey, indexName) {
        this.apiKey = apiKey || "MOCK_PINECONE_API_KEY";
        this.indexName = indexName || "zomato-recommendations";
        this.index = []; // Mocking an in-memory vector store for testing without real credentials
    }

    // Mock embedding generation using a generic interface
    async generateEmbeddings(text) {
        if (!text) throw new Error("Text is required for embedding.");
        // In a real scenario, this would call @google/genai embedding API
        // e.g. return await googleGenAI.embedContent("models/text-embedding-004", text)

        // Mock embedding vector of dimension 1536 (typical for modern embeddings)
        return Array(1536).fill(0).map(() => Math.random() * 2 - 1);
    }

    // Upsert vectors and metadata into DB
    async indexRestaurant(restaurant) {
        const { name, location, cuisines, rate, price_for_two, rich_text_description, raw_metadata } = restaurant;

        // Generate embedding based on rich text
        const vector = await this.generateEmbeddings(rich_text_description);

        // Structure data for Vector DB (e.g. Pinecone)
        const record = {
            id: name.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now(),
            values: vector,
            metadata: {
                name,
                location,
                cuisines,
                rate: Number(rate),
                price_for_two: Number(price_for_two),
                address: raw_metadata?.address || "Address not provided",
                votes: Number(raw_metadata?.votes) || 0,
                rest_type: raw_metadata?.rest_type || "Restaurant"
            }
        };

        // Mock DB insertion
        this.index.push(record);
        return record.id;
    }

    // Search logic (Mocked vector similarity + exact metadata filters)
    async queryRecommendations(queryText, filters = {}, topK = 5) {
        const queryVector = await this.generateEmbeddings(queryText);

        // 1. Strict Metadata Filtering
        let results = this.index.filter(record => {
            let match = true;
            if (filters.minRate && record.metadata.rate < filters.minRate) match = false;
            if (filters.maxPrice && record.metadata.price_for_two > filters.maxPrice) match = false;
            if (filters.minPrice && record.metadata.price_for_two <= filters.minPrice) match = false;
            if (filters.location && !record.metadata.location.toLowerCase().includes(filters.location.toLowerCase())) match = false;
            // Substring match for cuisines (supporting multi-select Arrays)
            if (filters.cuisines && filters.cuisines.length > 0) {
                const cArray = Array.isArray(record.metadata.cuisines) ? record.metadata.cuisines : [record.metadata.cuisines];
                // Record matches if it contains AT LEAST ONE of the user's selected cuisines
                const matches = filters.cuisines.some(selectedCuisine =>
                    cArray.some(c => c && c.toLowerCase().includes(selectedCuisine.toLowerCase()))
                );
                if (!matches) match = false;
            }
            return match;
        });

        // 2. Semantic Search (Mocking Cosine Similarity sorting)
        // In Pinecone, this happens automatically server-side.
        results = results.map(record => {
            const score = this.cosineSimilarityMock(queryVector, record.values);
            return { ...record, score };
        });

        // Sort by highest score first and slice
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, topK);
    }

    // Simple mock cosine similarity
    cosineSimilarityMock(vecA, vecB) {
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
}
