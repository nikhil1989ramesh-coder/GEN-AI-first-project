import test from 'node:test';
import assert from 'node:assert';
import { VectorStore } from '../src/db.js';

test('VectorStore embedding and indexing test', async (t) => {
    const db = new VectorStore();

    const mockRestaurant = {
        name: "Test Ristorante",
        location: "Downtown",
        cuisines: "Italian, Pizza",
        rate: 4.8,
        price_for_two: 1200,
        rich_text_description: "Test Ristorante is a 4.8-star rated restaurant located in Downtown serving Italian, Pizza cuisine. It costs approximately ₹1200 for two people and offers online ordering."
    };

    const id = await db.indexRestaurant(mockRestaurant);
    assert.ok(id, "Should return an inserted ID");
    assert.strictEqual(db.index.length, 1, "Index should contain 1 record");

    const insertedRecord = db.index[0];
    assert.strictEqual(insertedRecord.metadata.name, "Test Ristorante", "Metadata name should match");
    assert.strictEqual(insertedRecord.values.length, 1536, "Embedding dimension should be 1536");
});

test('VectorStore query logic and metadata filtering', async (t) => {
    const db = new VectorStore();

    await db.indexRestaurant({
        name: "Cheap Pizza", location: "Uptown", cuisines: "Pizza", rate: 3.5, price_for_two: 400, rich_text_description: "Cheap Pizza place."
    });
    await db.indexRestaurant({
        name: "Fancy Italian", location: "Downtown", cuisines: "Italian", rate: 4.9, price_for_two: 2500, rich_text_description: "Fancy place."
    });
    await db.indexRestaurant({
        name: "Mid Italian", location: "Downtown", cuisines: "Italian", rate: 4.2, price_for_two: 1000, rich_text_description: "Mid place."
    });

    // Semantic query with exact filters
    const results = await db.queryRecommendations("I want good italian food", {
        cuisine: "Italian",
        minRate: 4.0,
        maxPrice: 1500
    });

    assert.strictEqual(results.length, 1, "Should filter down to exactly 1 result due to pricing and rating filters");
    assert.strictEqual(results[0].metadata.name, "Mid Italian", "Should retrieve Mid Italian");
});
