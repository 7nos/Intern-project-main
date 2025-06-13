// server/deep_search/routes/deepSearch.js
// Traditional search routes for DuckDuckGo integration

const express = require('express');
const router = express.Router();
const DuckDuckGoService = require('../utils/duckduckgo');
const GeminiService = require('../services/geminiService');

// Initialize services
const duckDuckGoService = new DuckDuckGoService();
const geminiService = new GeminiService();

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const cacheStats = await duckDuckGoService.cache.getStats();
    const geminiHealth = await geminiService.healthCheck();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      services: {
        search: 'operational',
        cache: cacheStats,
        ai: geminiHealth
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Basic search endpoint
 */
router.get('/', async (req, res) => {
  try {
    const { q: query, type = 'text' } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Query parameter "q" is required'
      });
    }

    console.log(`🔍 Search request: "${query}" (${type})`);

    const results = await duckDuckGoService.performSearch(query, type, {});

    res.json({
      query,
      type,
      results: results.results || [],
      total: results.total || 0,
      cached: results.cached || false,
      timestamp: results.timestamp,
      ...(results.error && { error: results.error }),
      ...(results.rateLimited && { rateLimited: true })
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Search suggestions endpoint
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Query parameter "q" is required'
      });
    }

    const suggestions = await duckDuckGoService.getSuggestions(query);
    res.json(suggestions);

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: error.message
    });
  }
});

/**
 * Cognitive bias search endpoint
 */
router.get('/bias', async (req, res) => {
  try {
    const { q: query } = req.query;

    if (!query) {
      return res.status(400).json({
        error: 'Query parameter "q" is required'
      });
    }

    console.log(`🧠 Bias search request: "${query}"`);

    // Perform regular search first
    const searchResults = await duckDuckGoService.performSearch(query, 'text', {});
    
    // Analyze for cognitive biases if AI is available
    let biasAnalysis = null;
    if (geminiService.isEnabled() && searchResults.results && searchResults.results.length > 0) {
      biasAnalysis = await geminiService.analyzeCognitiveBias(query, searchResults.results);
    }

    // Enhance results with bias indicators
    const enhancedResults = processCognitiveBiasResults(searchResults.results || []);

    res.json({
      query,
      type: 'bias_analysis',
      results: enhancedResults,
      total: enhancedResults.length,
      biasAnalysis,
      cached: searchResults.cached || false,
      timestamp: new Date().toISOString(),
      ...(searchResults.error && { error: searchResults.error })
    });

  } catch (error) {
    console.error('Bias search error:', error);
    res.status(500).json({
      error: 'Bias search failed',
      message: error.message
    });
  }
});

/**
 * Parallel search endpoint for multiple queries
 */
router.post('/parallel', async (req, res) => {
  try {
    const { queries, type = 'text' } = req.body;

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        error: 'Queries array is required'
      });
    }

    if (queries.length > 5) {
      return res.status(400).json({
        error: 'Maximum 5 queries allowed per request'
      });
    }

    console.log(`🔄 Parallel search request: ${queries.length} queries`);

    const searchPromises = queries.map(query =>
      duckDuckGoService.performSearch(query, type, {})
        .catch(error => ({
          query,
          error: error.message,
          results: [],
          total: 0
        }))
    );

    const results = await Promise.all(searchPromises);

    res.json({
      queries,
      type,
      results: results.map((result, index) => ({
        query: queries[index],
        results: result.results || [],
        total: result.total || 0,
        cached: result.cached || false,
        ...(result.error && { error: result.error })
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Parallel search error:', error);
    res.status(500).json({
      error: 'Parallel search failed',
      message: error.message
    });
  }
});

/**
 * Cache management endpoints
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await duckDuckGoService.cache.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache stats',
      message: error.message
    });
  }
});

router.delete('/cache', async (req, res) => {
  try {
    await duckDuckGoService.cache.clear();
    res.json({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

// Helper functions

/**
 * Check if query might be related to cognitive bias
 */
function isCognitiveBiasQuery(query) {
  const biasKeywords = [
    'bias', 'biases', 'cognitive bias', 'confirmation bias', 'anchoring',
    'availability heuristic', 'dunning-kruger', 'survivorship bias',
    'selection bias', 'hindsight bias', 'overconfidence', 'groupthink',
    'stereotype', 'prejudice', 'logical fallacy', 'fallacies'
  ];
  
  const lowerQuery = query.toLowerCase();
  return biasKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Process search results to highlight potential bias indicators
 */
function processCognitiveBiasResults(results) {
  return results.map(result => {
    const biasIndicators = [];
    
    // Check for potential bias indicators in title and description
    const text = `${result.title} ${result.description}`.toLowerCase();
    
    if (text.includes('always') || text.includes('never') || text.includes('all') || text.includes('none')) {
      biasIndicators.push('absolute_language');
    }
    
    if (text.includes('proven') || text.includes('definitely') || text.includes('certainly')) {
      biasIndicators.push('overconfidence');
    }
    
    if (text.includes('everyone knows') || text.includes('obviously') || text.includes('clearly')) {
      biasIndicators.push('appeal_to_common_knowledge');
    }
    
    return {
      ...result,
      biasIndicators,
      biasScore: biasIndicators.length
    };
  });
}

module.exports = router;
