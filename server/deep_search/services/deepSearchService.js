const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Constants
const SEARCH_RESULTS_DIR = path.join(__dirname, '..', '..', '..', 'data', 'search-results');

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
    constructor(userId) {
        this.userId = userId;
        this.userDir = path.join(SEARCH_RESULTS_DIR, userId);
        this.initializeUserDir();
        this.ragService = require('../../services/ragService');
    }

    initializeUserDir() {
        if (!fs.existsSync(this.userDir)) {
            fs.mkdirSync(this.userDir, { recursive: true });
        }
    }

    async saveSearchResult(query, result) {
        try {
            const hash = this.getQueryHash(query);
            const filePath = path.join(this.userDir, `${hash}.json`);
            
            // Add RAG context to result
            const ragContext = await this.getRAGContext(query);
            result.ragContext = ragContext;

            await fsPromises.writeFile(filePath, JSON.stringify(result, null, 2));
            return result;
        } catch (error) {
            console.error('Error saving search result:', error);
            throw error;
        }
    }

    async getSearchResult(query) {
        try {
            const hash = this.getQueryHash(query);
            const filePath = path.join(this.userDir, `${hash}.json`);
            if (fs.existsSync(filePath)) {
                const result = JSON.parse(await fsPromises.readFile(filePath, 'utf-8'));
                
                // Update RAG context if needed
                if (result.ragContext && Date.now() - new Date(result.ragContext.timestamp) > 24 * 60 * 60 * 1000) {
                    result.ragContext = await this.getRAGContext(query);
                }
                
                return result;
            }
            return null;
        } catch (error) {
            console.error('Error getting search result:', error);
            throw error;
        }
    }

    async deleteSearchResult(query) {
        try {
            const hash = this.getQueryHash(query);
            const filePath = path.join(this.userDir, `${hash}.json`);
            if (fs.existsSync(filePath)) {
                await fsPromises.unlink(filePath);
            }
        } catch (error) {
            console.error('Error deleting search result:', error);
            throw error;
        }
    }

    getQueryHash(query) {
        return crypto.createHash('sha256').update(query).digest('hex');
    }

    async getRAGContext(query) {
        try {
            const documents = await this.ragService.getRelevantDocuments(query, this.userId);
            return {
                documents: documents.map(doc => ({
                    source: doc.metadata.source,
                    content: doc.content.substring(0, 200) + '...',
                    score: doc.score
                })),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting RAG context:', error);
            return { documents: [], timestamp: new Date().toISOString() };
        }
    }

    async parallelSearch(query, searchFunctions) {
        try {
            const results = await Promise.all(
                searchFunctions.map(async (func) => {
                    try {
                        const result = await func(query);
                        return { 
                            source: func.name, 
                            result,
                            metadata: {
                                timestamp: new Date().toISOString(),
                                source: func.name
                            }
                        };
                    } catch (error) {
                        console.error(`Error in ${func.name}:`, error);
                        return null;
                    }
                })
            );

            const validResults = results.filter(Boolean);
            
            // Get RAG context for synthesis
            const ragContext = await this.getRAGContext(query);
            
            return {
                results: validResults,
                ragContext,
                metadata: {
                    totalResults: validResults.length,
                    timestamp: new Date().toISOString(),
                    sources: validResults.map(r => r.source)
                }
            };
        } catch (error) {
            console.error('Error in parallel search:', error);
            throw error;
        }
    }

    async deleteOldResults(maxAgeMs = 7 * 24 * 60 * 60 * 1000) { // 7 days by default
        try {
            const files = await fsPromises.readdir(this.userDir);
            const now = Date.now();

            for (const file of files) {
                const filePath = path.join(this.userDir, file);
                const stats = await fsPromises.stat(filePath);
                
                if (now - stats.mtimeMs > maxAgeMs) {
                    await fsPromises.unlink(filePath);
                }
            }
        } catch (error) {
            console.error('Error deleting old results:', error);
            throw error;
        }
    }
}

module.exports = DeepSearchService;
