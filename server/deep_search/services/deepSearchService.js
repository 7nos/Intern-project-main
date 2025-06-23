const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const DuckDuckGoService = require('../../utils/duckduckgo');
const axios = require('axios');

// Constants
const SEARCH_RESULTS_DIR = path.join(__dirname, '..', '..', '..', 'data', 'search-results');
const USER_ASSETS_DIR = path.join(__dirname, '..', '..', '..', 'server', 'assets');

// Create search results directory if it doesn't exist
const createSearchResultsDir = async () => {
    try {
        await fsPromises.mkdir(SEARCH_RESULTS_DIR, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
};

// Initialize search results directory
createSearchResultsDir();

/**
 * Service for managing deep search operations and caching results
 */
class DeepSearchService {
    constructor(userId, geminiAI) {
        if (!userId) throw new Error('userId is required');
        if (!geminiAI) throw new Error('geminiAI is required');
        
        this.userId = userId;
        this.userDir = path.join(SEARCH_RESULTS_DIR, userId);
        this.geminiAI = geminiAI;
        this.duckDuckGo = new DuckDuckGoService();
        this.initializeUserDir();
    }

    initializeUserDir() {
        if (!fs.existsSync(this.userDir)) {
            fs.mkdirSync(this.userDir, { recursive: true });
        }
    }

    getQueryHash(query) {
        return crypto.createHash('sha256').update(query).digest('hex');
    }

    async getCachedResult(query) {
        try {
            const hash = this.getQueryHash(query);
            const filePath = path.join(this.userDir, `${hash}.json`);
            
            if (fs.existsSync(filePath)) {
                const stats = await fsPromises.stat(filePath);
                const ageInHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
                
                // Return cached result if less than 1 hour old (shorter cache for web results)
                if (ageInHours < 1) {
                    const result = JSON.parse(await fsPromises.readFile(filePath, 'utf-8'));
                    return result;
                }
                
                // Delete old cache
                await fsPromises.unlink(filePath);
            }
            return null;
        } catch (error) {
            console.error('Error getting cached result:', error);
            return null;
        }
    }

    async cacheResult(query, result) {
        try {
            const hash = this.getQueryHash(query);
            const filePath = path.join(this.userDir, `${hash}.json`);
            await fsPromises.writeFile(filePath, JSON.stringify(result, null, 2));
        } catch (error) {
            console.error('Error caching result:', error);
        }
    }

    async fallbackWebSearch(query) {
        try {
            const response = await axios.get('https://api.duckduckgo.com/', {
                params: {
                    q: query,
                    format: 'json',
                    no_html: 1,
                    no_redirect: 1,
                    skip_disambig: 1
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!response.data) {
                return { results: [] };
            }

            const results = [];
            
            // Add instant answer if available
            if (response.data.AbstractText) {
                results.push({
                    title: response.data.Heading || 'Instant Answer',
                    snippet: response.data.AbstractText,
                    url: response.data.AbstractURL,
                    source: 'DuckDuckGo Instant Answer'
                });
            }

            // Add related topics
            if (response.data.RelatedTopics) {
                response.data.RelatedTopics.forEach(topic => {
                    if (topic.Text && topic.FirstURL) {
                        results.push({
                            title: topic.Text.split(' - ')[0] || 'Related Topic',
                            snippet: topic.Text,
                            url: topic.FirstURL,
                            source: 'DuckDuckGo Related'
                        });
                    }
                });
            }

            return { results: results.slice(0, 5) };
        } catch (error) {
            console.error('Fallback web search error:', error);
            return { results: [] };
        }
    }

    /**
     * Perform a deep search using DuckDuckGo and Gemini for synthesis
     */
    async performSearch(query, history = []) {
        // 1. Check cache first
        const cachedResult = await this.getCachedResult(query);
        if (cachedResult) {
            return cachedResult;
        }

        // 2. Decompose the query using Gemini
        let subQueries = [query];
        let context = '';
        
        try {
            const decompositionPrompt = `Analyze this search query and break it down into specific searchable parts.
Query: "${query}"

Respond in this exact JSON format:
{
    "searchQueries": ["query1", "query2", "query3"],
    "context": "brief explanation"
}

Keep each query focused and specific. Maximum 3 queries.`;

            const decomposition = await this.geminiAI.generateChatResponse(
                decompositionPrompt,
                [], history, 
                "You are a search query decomposition expert. Break down complex queries into specific searchable parts."
            );
            
            try {
                // Clean the response to ensure it's valid JSON
                const cleanJson = decomposition.trim().replace(/```json\s*|\s*```/g, '');
                const parsed = JSON.parse(cleanJson);
                if (parsed.searchQueries && Array.isArray(parsed.searchQueries)) {
                    subQueries = parsed.searchQueries.slice(0, 3);
                }
                context = parsed.context || '';
            } catch (e) {
                console.warn('Failed to parse query decomposition:', e);
            }
        } catch (e) {
            console.error('Error in query decomposition:', e);
        }

        // 3. Perform web search for each sub-query
        const searchResults = [];
        for (const subQuery of subQueries) {
            try {
                // Try primary search method first
                let result = await this.duckDuckGo.performSearch(subQuery, 'text', { maxResults: 5 });
                
                // If primary method fails or returns no results, try fallback
                if (!result.results || result.results.length === 0) {
                    result = await this.fallbackWebSearch(subQuery);
                }

                if (result.results && result.results.length > 0) {
                    searchResults.push({
                        query: subQuery,
                        results: result.results
                    });
                }
            } catch (error) {
                console.error(`Error searching for "${subQuery}":`, error);
                // Try fallback on error
                try {
                    const fallbackResult = await this.fallbackWebSearch(subQuery);
                    if (fallbackResult.results && fallbackResult.results.length > 0) {
                        searchResults.push({
                            query: subQuery,
                            results: fallbackResult.results
                        });
                    }
                } catch (fallbackError) {
                    console.error('Fallback search also failed:', fallbackError);
                }
            }
        }

        if (searchResults.length === 0) {
            const noResults = { 
                summary: 'No relevant results found.',
                aiGenerated: false,
                sources: [],
                rawResults: []
            };
            await this.cacheResult(query, noResults);
            return noResults;
        }

        // 4. Synthesize results using Gemini
        try {
            const resultsText = JSON.stringify(searchResults, null, 2);
            const synthesis = await this.geminiAI.generateChatResponse(
                `Based on these web search results for the query "${query}", please provide a comprehensive summary:
                ${resultsText}
                
                Context: ${context}
                
                Format your response as a clear summary of the findings. Include relevant sources and URLs when appropriate.`,
                [], history,
                "You are a search results synthesis expert. Summarize findings clearly and concisely, focusing on the most relevant and reliable information."
            );

            const finalResult = {
                summary: synthesis,
                aiGenerated: true,
                sources: searchResults.flatMap(r => r.results.map(res => res.url)),
                rawResults: searchResults
            };

            // Cache the result
            await this.cacheResult(query, finalResult);
            return finalResult;
        } catch (error) {
            console.error('Error synthesizing results:', error);
            return {
                summary: 'Found relevant information but failed to synthesize results.',
                aiGenerated: false,
                sources: searchResults.flatMap(r => r.results.map(res => res.url)),
                rawResults: searchResults
            };
        }
    }
}

module.exports = DeepSearchService;
