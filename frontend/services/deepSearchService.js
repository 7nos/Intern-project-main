import api from '../utils/api';

class DeepSearchService {
    constructor() {
        this.baseUrl = '/deep-search';
    }

    /**
     * Perform a deep search query
     * @param {Object} params
     * @param {string} params.query - The search query
     * @param {string[]} params.history - Optional search history
     * @param {string} params.sessionId - The session ID
     * @returns {Promise<Object>} Search results
     */
    async performSearch(params) {
        try {
            const response = await api.post(`${this.baseUrl}/search`, {
                query: params.query,
                history: params.history || [],
                sessionId: params.sessionId
            });
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Deep search failed: ${errorMessage}`);
        }
    }

    /**
     * Get search suggestions
     * @param {string} query - The search query
     * @returns {Promise<string[]>} Search suggestions
     */
    async getSuggestions(query) {
        try {
            const response = await api.get(`${this.baseUrl}/suggestions`, {
                params: { q: query }
            });
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Failed to get search suggestions: ${errorMessage}`);
        }
    }

    /**
     * Perform parallel searches for multiple queries
     * @param {Object} params
     * @param {string[]} params.queries - Array of search queries
     * @param {string} params.type - Search type (text, image, etc.)
     * @returns {Promise<Object[]>} Array of search results
     */
    async performParallelSearch(params) {
        try {
            const response = await api.post(`${this.baseUrl}/parallel`, {
                queries: params.queries,
                type: params.type || 'text'
            });
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Parallel search failed: ${errorMessage}`);
        }
    }

    /**
     * Get cognitive bias analysis for a search query
     * @param {string} query - The search query
     * @returns {Promise<Object>} Bias analysis results
     */
    async getBiasAnalysis(query) {
        try {
            const response = await api.get(`${this.baseUrl}/bias`, {
                params: { q: query }
            });
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Bias analysis failed: ${errorMessage}`);
        }
    }

    /**
     * Decompose a complex query into searchable components
     * @param {string} query - The search query
     * @returns {Promise<Object>} Query decomposition
     */
    async decomposeQuery(query) {
        try {
            const response = await api.post(`${this.baseUrl}/decompose`, {
                query
            });
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Query decomposition failed: ${errorMessage}`);
        }
    }

    /**
     * Synthesize search results using AI
     * @param {Object} params
     * @param {string} params.query - The original search query
     * @param {Object[]} params.results - Array of search results
     * @param {Object} params.decomposition - Query decomposition
     * @returns {Promise<Object>} Synthesized results
     */
    async synthesizeResults(params) {
        try {
            const response = await api.post(`${this.baseUrl}/synthesize`, {
                query: params.query,
                results: params.results,
                decomposition: params.decomposition
            });
            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Result synthesis failed: ${errorMessage}`);
        }
    }
}

export default new DeepSearchService();
