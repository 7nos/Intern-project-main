// server/services/deepSearch.js
const { search } = require('duck-duck-scrape');
const { geminiServiceDS } = require('../services/serviceManager'); // Ensure you have a DS instance in your service manager

class DeepSearchService {
    constructor(userId) {
        if (!userId) {
            // A userId might be used for logging, context, or caching in the future
            console.warn("[DeepSearchService] Instantiated without a userId.");
        }
        this.userId = userId;
    }

    /**
     * Performs a web search for a given query.
     * @param {string} query - The search query.
     * @returns {Promise<Array>} A promise that resolves to an array of search results.
     */
    async performWebSearch(query) {
        try {
            console.log(`[DeepSearchService] Performing web search for: "${query}"`);
            const searchResults = await search(query, {
                retries: 2,
                params: {
                    l: 'us-en', // US English
                },
            });
            console.log(`[DeepSearchService] Found ${searchResults.results.length} results for "${query}".`);
            // We only need the title, snippet, and url for synthesis
            return searchResults.results.map(({ title, description, url }) => ({
                title,
                snippet: description,
                url
            }));
        } catch (error) {
            console.error(`[DeepSearchService] Error during web search for "${query}":`, error);
            return []; // Return empty array on error to not fail the whole process
        }
    }

    /**
     * The main method to perform a deep search.
     * @param {string} query - The user's original query.
     * @returns {Promise<Object>} A promise that resolves to the synthesized result.
     */
    async performSearch(query) {
        try {
            // For simplicity, we will search for the main query directly.
            // A more advanced implementation would use the AI to decompose the query first.
            const searchResults = await this.performWebSearch(query);
            
            if (searchResults.length === 0) {
                return {
                    summary: "I was unable to find relevant information online for your query. You could try rephrasing it.",
                    sources: [],
                    aiGenerated: true,
                };
            }

            // Step 2: Synthesize the search results into a coherent answer.
            // The synthesis function in geminiServiceDS should be adapted for this.
            // Let's assume geminiServiceDS has a method `synthesizeFromWeb(query, results)`
            const synthesis = await geminiServiceDS.synthesizeResults(query, searchResults);
            
            console.log(`[DeepSearchService] Synthesis complete.`);
            
            return {
                summary: synthesis.summary,
                sources: synthesis.sources || searchResults.map(r => ({ title: r.title, url: r.url })),
                aiGenerated: true,
                rawResults: searchResults,
            };

        } catch (error) {
            console.error(`[DeepSearchService] Deep search process failed for user ${this.userId}:`, error);
            // Don't expose internal error messages to the client
            throw new Error("The deep search process failed due to an internal error.");
        }
    }
}

module.exports = DeepSearchService;