import test from 'node:test';
import assert from 'node:assert';
import { fetchAndPreprocessData } from '../src/ingest.js';

test('Fetch and preprocess dataset successfully', async (t) => {
    // We mock fetch or just call the real API tightly limited.
    // Testing with length = 2 to be fast and not depend heavily on network
    const data = await fetchAndPreprocessData(2, 0);

    assert.strictEqual(Array.isArray(data), true, 'Data should be an array');
    assert.ok(data.length >= 2, 'Should fetch at least 2 rows');

    const firstRow = data[0];
    assert.ok(firstRow.name, 'Name should exist');
    assert.ok(typeof firstRow.rate === 'number', 'Rate should be parsed as a number');
    assert.ok(typeof firstRow.price_for_two === 'number', 'Price for two should be parsed as a number');
    assert.ok(firstRow.rich_text_description.includes(firstRow.name), 'Rich text should include the restaurant name');

    // Specifically test Jalsa (the first row in actual dataset)
    if (firstRow.name === 'Jalsa') {
        assert.ok(firstRow.rate > 0, 'Rate should be > 0');
        assert.ok(firstRow.price_for_two === 800, 'Price should be 800');
    }
});
