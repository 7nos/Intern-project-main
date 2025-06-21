// server/routes/chat.js
const express = require('express');
const router = express.Router();
const { tempAuth } = require('../middleware/authMiddleware');
const { ChatSession, SESSION_STATES, SESSION_CONTEXTS, MESSAGE_TYPES } = require('../models/ChatSession');
const { geminiAI, documentProcessor } = require('../services/serviceManager');
const DeepSearchService = require('../services/deepSearch');


// --- Session Management Endpoints ---

// Create a new session
router.post('/session', tempAuth, async (req, res) => {
    try {
        const { title, description, systemPrompt, context = SESSION_CONTEXTS.GENERAL } = req.body;
        const session = new ChatSession({ user: req.user.id, title, description, systemPrompt, context });
        await session.save();
        res.status(201).json({ sessionId: session.sessionId, title: session.title, context: session.context, state: session.state });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ message: 'Error creating session' });
    }
});

// Get all sessions for user
router.get('/sessions', tempAuth, async (req, res) => {
    try {
        const sessions = await ChatSession.findByUser(req.user.id);
        res.json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ message: 'Error fetching sessions' });
    }
});

// Get the full details of a specific chat session
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


// --- Core Chat Endpoints ---

// Handles standard chat messages without RAG
router.post('/message', tempAuth, async (req, res) => {
    try {
        const { query, sessionId, history = [], systemPrompt } = req.body;
        const userId = req.user.id;

        if (!query || !sessionId) {
            return res.status(400).json({ message: 'Query and Session ID are required.' });
        }

        let session = await ChatSession.findOne({ sessionId, user: userId });
        if (!session) {
            session = new ChatSession({ sessionId, user: userId, title: query.substring(0, 50), systemPrompt: systemPrompt || "You are a helpful general-purpose AI assistant." });
        }
        
        session.addMessage(MESSAGE_TYPES.TEXT, 'user', query);

        const aiHistory = session.messages.map(m => ({ role: m.role, parts: m.parts.map(p => ({ text: p.text })) }));
        const responseText = await geminiAI.generateChatResponse(query, [], aiHistory, session.systemPrompt);
        
        session.addMessage(MESSAGE_TYPES.TEXT, 'assistant', responseText);
        await session.save();

        res.json({ message: responseText, sessionId: session.sessionId, history: session.messages });
    } catch (error) {
        console.error('Error in /api/chat/message:', error);
        res.status(500).json({ message: 'Failed to process chat message.', error: error.message });
    }
});

// Handles chat messages that require RAG
router.post('/rag', tempAuth, async (req, res) => {
    try {
        const { query, sessionId, fileId } = req.body;
        const userId = req.user.id;

        if (!query || !sessionId) {
            return res.status(400).json({ message: 'Query and Session ID are required.' });
        }

        const filters = { userId };
        if (fileId) filters.fileId = fileId;

        const relevantChunks = await documentProcessor.searchDocuments(query, filters);
        const sources = [...new Set(relevantChunks.map(chunk => chunk.metadata.source))];

        let session = await ChatSession.findOne({ sessionId, user: userId });
        if (!session) return res.status(404).json({ message: `Session ${sessionId} not found.`});
        
        const aiHistory = session.messages.map(m => ({ role: m.role, parts: m.parts.map(p => ({ text: p.text })) }));
        const responseText = await geminiAI.generateChatResponse(query, relevantChunks, aiHistory, session.systemPrompt);
        
        res.json({ message: responseText, metadata: { sources, documentsFound: relevantChunks.length }});
    } catch (error) {
        console.error('Error in /api/chat/rag:', error);
        res.status(500).json({ message: 'RAG query failed.', error: error.message });
    }
});

// Perform deep search with AI-powered query decomposition and synthesis
router.post('/deep-search', tempAuth, async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ message: 'Query is required for deep search.' });

        const deepSearchService = new DeepSearchService(req.user.id);
        const results = await deepSearchService.performSearch(query);

        res.json({ message: results.summary, metadata: { sources: results.sources, aiGenerated: results.aiGenerated, rawResults: results.rawResults }});
    } catch (error) {
        console.error('Deep Search error:', error);
        res.status(500).json({ message: 'Deep search failed.', error: error.message });
    }
});

module.exports = router;