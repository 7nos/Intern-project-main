// server/routes/chat.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { tempAuth } = require('../middleware/authMiddleware');
const ChatSession = require('../models/ChatSession');

// Deep Search Services - lazy initialization
let duckDuckGoService = null;
let geminiService = null;

function getDeepSearchServices() {
    if (!duckDuckGoService || !geminiService) {
        const DuckDuckGoService = require('../deep_search/utils/duckduckgo');
        const GeminiService = require('../deep_search/services/geminiService');

        duckDuckGoService = new DuckDuckGoService();
        geminiService = new GeminiService();

        console.log('🔧 Deep search services initialized');
        console.log('   - DuckDuckGo service: Ready');
        console.log('   - Gemini service:', geminiService.isEnabled() ? 'Enabled' : 'Disabled (fallback mode)');
    }

    return { duckDuckGoService, geminiService };
}

const getPythonUrl = () => {
    const url = process.env.PYTHON_RAG_SERVICE_URL;
    if (!url) {
        console.error('FATAL: PYTHON_RAG_SERVICE_URL is not set.');
        throw new Error('Server configuration error: RAG service URL is missing.');
    }
    return url;
};

// @route   POST /api/chat/message
// @desc    Send a message to the chatbot (now with history)
// @access  Private
router.post('/message', tempAuth, async (req, res, next) => {
    const { history, systemPrompt } = req.body;
    if (!history || history.length === 0) {
        return res.status(400).json({ message: 'Message history is required.' });
    }
    try {
        const pythonRagUrl = getPythonUrl();
        const pythonResponse = await axios.post(`${pythonRagUrl}/chat`, {
            history,
            system_prompt: systemPrompt
        });
        res.json(pythonResponse.data);
    } catch (error) {
        console.error("Error proxying to Python /chat:", error.response ? error.response.data : error.message);
        next(error);
    }
});

// @route   POST /api/chat/rag
// @desc    Query with RAG (now with history)
// @access  Private
router.post('/rag', tempAuth, async (req, res, next) => {
    const { history, systemPrompt } = req.body;
    const userId = req.user.id;
    if (!history || history.length === 0) {
        return res.status(400).json({ message: 'Message history is required.' });
    }
    try {
        const pythonRagUrl = getPythonUrl();
        const pythonResponse = await axios.post(`${pythonRagUrl}/query`, {
            user_id: userId,
            history: history,
            system_prompt: systemPrompt
        });
        res.json(pythonResponse.data);
    } catch (error) {
        console.error("Error proxying to Python /query:", error.response ? error.response.data : error.message);
        next(error);
    }
});

// @route   POST /api/chat/history
// @desc    Save or update a chat session
// @access  Private
router.post('/history', tempAuth, async (req, res) => {
    const { sessionId, messages, systemPrompt, title } = req.body;
    const userId = req.user.id;
    if (!sessionId || !messages || messages.length === 0) {
        return res.status(400).json({ message: 'Session ID and messages are required.' });
    }
    try {
        const finalTitle = title || (messages.find(m => m.role === 'user')?.parts[0].text.substring(0, 50) || 'New Conversation');
        const sessionData = { sessionId, user: userId, messages, systemPrompt, title: finalTitle, updatedAt: Date.now() };
        await ChatSession.findOneAndUpdate(
            { sessionId: sessionId, user: userId },
            { $set: sessionData },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.status(200).json({ message: 'Chat history saved.' });
    } catch (error) {
        console.error('Error saving chat history:', error);
        res.status(500).json({ message: 'Server error while saving chat history.' });
    }
});

// @route   GET /api/chat/sessions
// @desc    Get all chat session summaries for the logged-in user
// @access  Private
router.get('/sessions', tempAuth, async (req, res) => {
    try {
        const sessions = await ChatSession.find({ user: req.user.id })
            .sort({ updatedAt: -1 })
            .select('sessionId title updatedAt');
        res.json(sessions);
    } catch (error) {
        console.error('Error fetching chat sessions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/chat/session/:sessionId
// @desc    Get the full details of a specific chat session
// @access  Private
router.get('/session/:sessionId', tempAuth, async (req, res) => {
    try {
        const session = await ChatSession.findOne({ sessionId: req.params.sessionId, user: req.user.id });
        if (!session) return res.status(404).json({ message: 'Chat session not found.' });
        res.json(session);
    } catch (error) {
        console.error('Error fetching session details:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/chat/deep-search
// @desc    Perform deep search with AI-powered query decomposition and synthesis
// @access  Private
router.post('/deep-search', tempAuth, async (req, res) => {
    try {
        const { query, history = [] } = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                message: 'Query is required and must be a string'
            });
        }

        const trimmedQuery = query.trim();
        console.log(`🤖 Deep Search request from user ${req.user.id}: "${trimmedQuery}"`);

        // Initialize services if needed
        const { duckDuckGoService, geminiService } = getDeepSearchServices();

        // Step 1: Decompose the query using AI
        const decomposition = await geminiService.decomposeQuery(trimmedQuery);
        console.log('✅ Query decomposed:', decomposition.coreQuestion);

        // Step 2: Execute searches in parallel for faster results
        const limitedQueries = decomposition.searchQueries.slice(0, 2); // Limit to 2 searches
        console.log(`🔄 Executing ${limitedQueries.length} searches in parallel...`);

        const searchPromises = limitedQueries.map(async (searchQuery) => {
            try {
                const results = await duckDuckGoService.performSearch(searchQuery, 'text', {});
                return {
                    query: searchQuery,
                    results: results.results || [],
                    success: !results.error && !results.rateLimited
                };
            } catch (error) {
                console.error(`Search failed for "${searchQuery}":`, error.message);
                return {
                    query: searchQuery,
                    results: [],
                    success: false,
                    error: error.message
                };
            }
        });

        const searchResults = await Promise.all(searchPromises);
        console.log(`✅ Parallel searches completed`);

        // Combine all search results
        const allResults = searchResults.flatMap(sr => sr.results);
        console.log(`📊 Total results collected: ${allResults.length}`);

        // Step 3: Synthesize results with AI
        let synthesis;
        if (allResults.length > 0) {
            synthesis = await geminiService.synthesizeResults(trimmedQuery, allResults, decomposition);
        } else {
            synthesis = {
                answer: `I couldn't find sufficient search results for "${trimmedQuery}". This might be due to rate limiting or the query being too specific. Please try rephrasing your question or try again later.`,
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
                query: trimmedQuery,
                decomposition,
                totalResults: allResults.length,
                sources: synthesis.sources || [],
                confidence: synthesis.confidence || 0,
                aiGenerated: synthesis.aiGenerated || false
            }
        };

        console.log(`🎉 Deep Search completed for user ${req.user.id}`);
        res.json(response);

    } catch (error) {
        console.error('Deep Search error:', error);
        res.status(500).json({
            message: 'Deep search failed',
            error: error.message
        });
    }
});

module.exports = router;