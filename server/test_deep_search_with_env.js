// Test deep search with proper environment loading
require('dotenv').config();

console.log('🧪 Testing Deep Search with Environment Variables...\n');

console.log('Environment Status:');
console.log('- GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('- GEMINI_API_KEY length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);

// Simulate the lazy initialization from chat route
let duckDuckGoService = null;
let geminiService = null;

function getDeepSearchServices() {
    if (!duckDuckGoService || !geminiService) {
        const DuckDuckGoService = require('./deep_search/utils/duckduckgo');
        const GeminiService = require('./deep_search/services/geminiService');
        
        duckDuckGoService = new DuckDuckGoService();
        geminiService = new GeminiService();
        
        console.log('🔧 Deep search services initialized');
        console.log('   - DuckDuckGo service: Ready');
        console.log('   - Gemini service:', geminiService.isEnabled() ? 'Enabled' : 'Disabled (fallback mode)');
    }
    
    return { duckDuckGoService, geminiService };
}

async function testDeepSearchWithEnv() {
    try {
        const query = 'what is basic agent structure?';
        console.log(`\n🤖 Testing deep search: "${query}"`);

        // Initialize services
        const { duckDuckGoService, geminiService } = getDeepSearchServices();

        // Test query decomposition
        console.log('\n1️⃣ Testing Query Decomposition...');
        const decomposition = await geminiService.decomposeQuery(query);
        console.log('✅ Query decomposed successfully');
        console.log('   Core question:', decomposition.coreQuestion);
        console.log('   Search queries:', decomposition.searchQueries);
        console.log('   AI generated:', decomposition.aiGenerated);

        // Test search
        console.log('\n2️⃣ Testing Search...');
        const searchResults = [];
        const limitedQueries = decomposition.searchQueries.slice(0, 2);

        for (let i = 0; i < limitedQueries.length; i++) {
            const searchQuery = limitedQueries[i];
            console.log(`   Searching for: "${searchQuery}"`);
            
            const results = await duckDuckGoService.performSearch(searchQuery, 'text', {});
            searchResults.push({
                query: searchQuery,
                results: results.results || [],
                success: !results.error && !results.rateLimited
            });

            if (i < limitedQueries.length - 1) {
                console.log('   ⏳ Waiting 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        const allResults = searchResults.flatMap(sr => sr.results);
        console.log(`✅ Search completed: ${allResults.length} total results`);

        // Test synthesis
        console.log('\n3️⃣ Testing Result Synthesis...');
        const synthesis = await geminiService.synthesizeResults(query, allResults, decomposition);
        console.log('✅ Synthesis completed');
        console.log('   Answer length:', synthesis.answer.length);
        console.log('   Sources:', synthesis.sources.length);
        console.log('   Confidence:', synthesis.confidence);
        console.log('   AI generated:', synthesis.aiGenerated);

        // Show final result
        console.log('\n📄 Final Answer Preview:');
        console.log(synthesis.answer.substring(0, 300) + '...');

        console.log('\n🎉 Deep Search Test Completed Successfully!');
        
        return {
            decomposition,
            searchResults: allResults,
            synthesis
        };

    } catch (error) {
        console.error('\n❌ Deep Search Test Failed:', error.message);
        throw error;
    }
}

// Run the test
testDeepSearchWithEnv()
    .then(() => {
        console.log('\n✅ All tests passed! Deep search is working with environment variables.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    });
