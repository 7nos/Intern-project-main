// Test script for Deep Search functionality
const { getDeepSearchServices, getDeepSearchService } = require('./utils/deepSearchUtils');

async function testDeepSearch() {
    console.log('🧪 Testing Deep Search functionality...\n');

    try {
        // Initialize services
        const { duckDuckGoService, geminiService } = getDeepSearchServices();
        const deepSearchService = getDeepSearchService('test-user');

        // Test query
        const query = 'hello';
        console.log(`🔍 Testing query: "${query}"`);

        // Step 1: Decompose query
        console.log('\n📝 Step 1: Query Decomposition');
        const decomposition = await geminiService.decomposeQuery(query);
        console.log('✅ Decomposition result:', decomposition);

        // Step 2: Search
        console.log('\n🔎 Step 2: Search Execution');
        const searchResults = await duckDuckGoService.performSearch(query);
        console.log('✅ Search results:', searchResults);

        // Step 3: Synthesis
        console.log('\n🧠 Step 3: Result Synthesis');
        const synthesis = await geminiService.synthesizeResults(searchResults.results, query, decomposition);
        console.log('✅ Synthesis result:', synthesis);

        // Step 4: Save to cache
        console.log('\n💾 Step 4: Caching Results');
        const searchResultData = {
            decomposition,
            searchResults: [searchResults],
            allResults: searchResults.results,
            synthesis
        };
        await deepSearchService.saveSearchResult(query, searchResultData);
        console.log('✅ Results cached successfully');

        // Step 5: Retrieve from cache
        console.log('\n📖 Step 5: Cache Retrieval');
        const cachedResult = await deepSearchService.getSearchResult(query);
        console.log('✅ Cached result retrieved:', cachedResult ? 'Yes' : 'No');

        console.log('\n🎉 Deep Search test completed successfully!');
        console.log('\n📊 Final Response:');
        console.log(synthesis.summary);

    } catch (error) {
        console.error('❌ Deep Search test failed:', error);
    }
}

// Run the test
testDeepSearch(); 