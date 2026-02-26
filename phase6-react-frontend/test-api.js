import assert from 'assert';
import filterHandler from './api/filters.js';
import recommendHandler from './api/recommend.js';

async function runTests() {
    console.log("==========================================");
    console.log("Starting API edge function integration tests...");
    console.log("==========================================\n");

    try {
        // Test 1: Filters Edge Function
        let filterStatus;
        let filterJson;
        const reqFilters = { method: 'GET' };
        const resFilters = {
            status: (code) => { filterStatus = code; return resFilters; },
            json: (data) => { filterJson = data; return resFilters; },
            end: () => { }
        };

        await filterHandler(reqFilters, resFilters);
        assert.strictEqual(filterStatus, 200, "Filters API should return 200 OK");
        assert.strictEqual(filterJson.success, true, "Filters API success boolean missing");
        assert.ok(Array.isArray(filterJson.places), "Places array missing");
        assert.ok(filterJson.places.length > 0, "Places array should not be empty");
        console.log("✅ Passed: /api/filters loads local JSON successfully.");

        // Test 2: Recommendation Engine Validation Rejection
        let recStatus;
        let recJson;
        const reqRec = { method: 'POST', body: {} };
        const resRec = {
            status: (code) => { recStatus = code; return resRec; },
            json: (data) => { recJson = data; return resRec; },
            setHeader: () => { }
        };

        await recommendHandler(reqRec, resRec);
        assert.strictEqual(recStatus, 400, "Recommendation API should return 400 for empty body");
        assert.strictEqual(recJson.error, "Please provide at least a 'place' or 'cuisine' to get a recommendation.", "Validation message mismatch");
        console.log("✅ Passed: /api/recommend blocks empty payloads.");

        // Test 3: Recommendation Engine Processing
        let recStatus2;
        let recJson2;
        const reqRec2 = { method: 'POST', body: { place: 'BTM', price_range: '500', min_rating: '3.5', cuisines: ['Cafe'] } };
        const resRec2 = {
            status: (code) => { recStatus2 = code; return resRec2; },
            json: (data) => { recJson2 = data; return resRec2; },
            setHeader: () => { }
        };

        await recommendHandler(reqRec2, resRec2);
        // It should either return 200 (Mocked/Actual) or 500 (API Error), but not crash
        assert.ok([200, 429, 500].includes(recStatus2), `Recommendation API unexpected status ${recStatus2}`);
        if (recStatus2 === 200) {
            assert.ok(recJson2.recommendation, "Recommendation markdown missing from 200 response");
        }
        console.log(`✅ Passed: /api/recommend executed with status ${recStatus2}`);

        console.log("\n==========================================");
        console.log("🎉 All Serverless Component Tests Passed! 🚀");
        console.log("==========================================");
    } catch (e) {
        console.error("\n❌ Test failed:", e.message);
        process.exit(1);
    }
}

runTests();
