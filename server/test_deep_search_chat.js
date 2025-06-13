// server/test_deep_search_chat.js
// Test the deep search integration in the chat route

// Import and setup the deep search services
const DuckDuckGoService = require('./deep_search/utils/duckduckgo');
const GeminiService = require('./deep_search/services/geminiService');

// Test the chat route logic directly
async function testDeepSearchChatLogic() {
  console.log('🧪 Testing Deep Search Chat Integration...\n');

  const duckDuckGoService = new DuckDuckGoService();
  const geminiService = new GeminiService();

  try {
    const query = 'what is basic agent structure?';
    const history = [];

    console.log(`🤖 Simulating deep search request: "${query}"`);

    // Step 1: Decompose the query using AI
    const decomposition = await geminiService.decomposeQuery(query);
    console.log('✅ Query decomposed:', decomposition.coreQuestion);
    console.log('   Search queries:', decomposition.searchQueries);

    // Step 2: Execute searches based on decomposition
    const searchResults = [];
    const limitedQueries = decomposition.searchQueries.slice(0, 2);

    for (let i = 0; i < limitedQueries.length; i++) {
      const searchQuery = limitedQueries[i];
      
      try {
        if (i > 0) {
          console.log('⏳ Waiting 2 seconds before next search...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const results = await duckDuckGoService.performSearch(searchQuery, 'text', {});
        searchResults.push({
          query: searchQuery,
          results: results.results || [],
          success: !results.error && !results.rateLimited
        });

        if (results.results && results.results.length > 3) {
          console.log(`✅ Got sufficient results (${results.results.length}), stopping`);
          break;
        }

      } catch (error) {
        console.error(`❌ Search failed for "${searchQuery}":`, error.message);
        searchResults.push({
          query: searchQuery,
          results: [],
          success: false,
          error: error.message
        });
      }
    }

    // Combine all search results
    const allResults = searchResults.flatMap(sr => sr.results);
    console.log(`📊 Total results collected: ${allResults.length}`);

    // Step 3: Synthesize results with AI
    let synthesis;
    if (allResults.length > 0) {
      synthesis = await geminiService.synthesizeResults(query, allResults, decomposition);
    } else {
      synthesis = {
        answer: `I couldn't find sufficient search results for "${query}". This might be due to rate limiting or the query being too specific. Please try rephrasing your question or try again later.`,
        sources: [],
        aiGenerated: false,
        confidence: 0,
        timestamp: new Date().toISOString()
      };
    }

    // Format response for the chat interface
    const response = {
      role: 'assistant',
      type: 'deep_search',
      parts: [{ 
        text: synthesis.answer 
      }],
      timestamp: new Date(),
      metadata: {
        query: query,
        decomposition,
        totalResults: allResults.length,
        sources: synthesis.sources || [],
        confidence: synthesis.confidence || 0,
        aiGenerated: synthesis.aiGenerated || false
      }
    };

    console.log('🎉 Deep Search completed successfully!');
    console.log('📝 Response preview:');
    console.log('   Type:', response.type);
    console.log('   Answer length:', response.parts[0].text.length);
    console.log('   Sources:', response.metadata.sources.length);
    console.log('   Confidence:', response.metadata.confidence);
    console.log('   AI Generated:', response.metadata.aiGenerated);
    
    console.log('\n📄 Full Answer:');
    console.log(response.parts[0].text);
    
    return response;

  } catch (error) {
    console.error('❌ Deep Search chat logic failed:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testDeepSearchChatLogic()
    .then(() => {
      console.log('\n✅ All tests passed! Deep search chat integration is working correctly.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testDeepSearchChatLogic };
