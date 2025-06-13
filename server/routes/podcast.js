// server/routes/podcast.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
// --- FIX: Corrected the path to go UP one directory with '..' ---
const { tempAuth } = require('../middleware/authMiddleware');
const File = require('../models/File');

// @route   POST /api/podcast/generate
// @desc    Generate a podcast from a file
// @access  Private
router.post('/generate', tempAuth, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Authentication failed." });
    }

    const { fileId } = req.body;
    const userId = req.user.id;

    if (!fileId) {
        return res.status(400).json({ message: 'File ID is required.' });
    }

    try {
        const file = await File.findOne({ _id: fileId, user: userId });
        if (!file) {
            return res.status(404).json({ message: 'File not found or you do not have permission.' });
        }

        const pythonRagUrl = process.env.PYTHON_RAG_SERVICE_URL;
        if (!pythonRagUrl) {
            console.error('FATAL: PYTHON_RAG_SERVICE_URL is not set in the environment.');
            return res.status(500).json({ message: 'Server configuration error: RAG service URL is missing.' });
        }

        console.log(`[Podcast] Requesting generation from Python service for file: ${file.path}`);

        const pythonResponse = await axios.post(`${pythonRagUrl}/generate_podcast`, {
            user_id: userId.toString(),
            file_path: file.path,
            original_name: file.originalname
        });

        if (pythonResponse.data && pythonResponse.data.audioUrl) {
            return res.json({ audioUrl: pythonResponse.data.audioUrl });
        } else {
            throw new Error(pythonResponse.data?.error || 'Python service returned an invalid response.');
        }

    } catch (error) {
        console.error('Error in podcast generation route:', error.response ? error.response.data : error.message);
        const message = error.response?.data?.error || 'An internal server error occurred while generating the podcast.';
        const status = error.response?.status || 500;
        res.status(status).json({ message });
    }
});

module.exports = router;