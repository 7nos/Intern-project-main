// server/utils/duckduckgo.js
const { search } = require('duck-duck-scrape');

class DuckDuckGoService {
  async performSearch(query, type = 'text', options = {}) {
    try {
      console.log(`Performing live DuckDuckGo search for: "${query}"`);
      
      const searchOptions = {
        safeSearch: 'STRICT', // Or 'MODERATE', 'OFF'
        ...options, // Allow overriding default options
      };

      const searchResults = await search(query, searchOptions);

      if (searchResults.noResults) {
        return {
          results: [],
          error: null,
          rateLimited: false,
        };
      }

      console.log('Raw search results:', JSON.stringify(searchResults, null, 2));

      // Map the results to the format expected by the application
      const formattedResults = searchResults.results.map(r => ({
        title: r.title,
        snippet: r.description,
        url: r.url,
        raw: r, // Keep the original result for potential future use
      }));

      return {
        results: formattedResults,
        error: null,
        rateLimited: false,
      };
    } catch (error) {
      console.error('DuckDuckGo search error:', error);
      // Check for specific error types if the library provides them
      const isRateLimited = error.message.includes('rate limit');
      
      return {
        results: [],
        error: error.message,
        rateLimited: isRateLimited,
      };
    }
  }
}

module.exports = DuckDuckGoService;
