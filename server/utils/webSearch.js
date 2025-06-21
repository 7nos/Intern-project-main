// server/utils/webSearch.js
const fetch = require('node-fetch');

/**
 * Performs a web search using the DuckDuckGo Instant Answer API.
 * This is a simple, reliable API for getting quick search results.
 * @param {string} query - The search query.
 * @returns {Promise<Array>} A promise that resolves to an array of search results.
 */
async function performSimpleSearch(query) {
    // The q parameter is the query, and format=json tells the API to return JSON
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&t=chatbot-gemini`;

    try {
        console.log(`[WebSearch] Performing search for: "${query}"`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();

        // The 'RelatedTopics' array often contains the most useful search results
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            const results = data.RelatedTopics
                // Filter out topic groups, we only want individual results
                .filter(topic => topic.Result || topic.Topics)
                .flatMap(topic => {
                    if (topic.Result) { // Single result
                        const searchResult = {
                            title: topic.Text,
                            snippet: topic.Result,
                            url: topic.FirstURL
                        };
                         // Extract title from HTML
                        const titleMatch = searchResult.snippet.match(/<b>(.*?)<\/b>/);
                        if (titleMatch) {
                            searchResult.title = titleMatch[1];
                        }
                        return [searchResult];

                    } else if (topic.Topics) { // Group of results
                        return topic.Topics.map(subTopic => {
                             const searchResult = {
                                title: subTopic.Text,
                                snippet: subTopic.Result,
                                url: subTopic.FirstURL
                            };
                            const titleMatch = searchResult.snippet.match(/<b>(.*?)<\/b>/);
                            if (titleMatch) {
                                searchResult.title = titleMatch[1];
                            }
                            return searchResult;
                        });
                    }
                    return [];
                });
            
            console.log(`[WebSearch] Found ${results.length} results.`);
            return results;
        }
        return [];

    } catch (error) {
        console.error(`[WebSearch] Error fetching search results for "${query}":`, error);
        return []; // Return empty on error
    }
}

module.exports = { performSimpleSearch };
