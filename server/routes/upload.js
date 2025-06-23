// server/routes/upload.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { tempAuth } = require('../middleware/authMiddleware');
const File = require('../models/File');
const User = require('../models/User');
const VectorStore = require('../services/vectorStore');
const vectorStore = require('../services/vectorStoreInstance');
const DocumentProcessor = require('../services/documentProcessor');
const documentProcessor = new DocumentProcessor(vectorStore);

// Use memory storage to handle the file temporarily before we know its final name
const upload = multer({ storage: multer.memoryStorage() });

// @route   POST /api/upload
// @desc    Upload a file, save metadata, rename file to its DB ID, then trigger RAG
// @access  Private
router.post('/', tempAuth, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // 1. Create the database record first to get the unique _id
        const newFile = new File({
            user: req.user.id,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            // We will set the final filename and path in the next steps
        });
        
        // 2. Determine the final filename and path using the new _id
        const extension = path.extname(req.file.originalname);
        const finalFilename = `${newFile._id}${extension}`;
        const userUploadsDir = path.join(__dirname, '..', 'assets', user.username, 'docs');
        const finalPath = path.join(userUploadsDir, finalFilename);

        // Ensure the directory exists
        fs.mkdirSync(userUploadsDir, { recursive: true });

        // 3. Write the file from memory to the disk with its final name
        fs.writeFileSync(finalPath, req.file.buffer);

        // 4. Update the database record with the final filename and path
        newFile.filename = finalFilename;
        newFile.path = finalPath;
        await newFile.save();

        console.log(`✅ File upload successful for User '${user.username}'. Final filename: ${finalFilename}.`);
        
        // 5. Process the document and add it to the vector store for RAG
        try {
            console.log(`🔄 Processing document for RAG: ${req.file.originalname}`);
            const processingResult = await documentProcessor.processFile(finalPath, {
                userId: req.user.id,
                fileId: newFile._id.toString(),
                originalName: req.file.originalname,
                fileType: path.extname(req.file.originalname).substring(1)
            });
            
            console.log(`✅ RAG processing completed for '${req.file.originalname}': ${processingResult.chunksAdded} chunks added`);
        } catch (ragError) {
            console.error(`❌ RAG processing failed for '${req.file.originalname}':`, ragError.message);
            // Don't fail the upload if RAG processing fails
        }

        res.status(201).json(newFile);

    } catch (error) {
        console.error('Error during file upload process:', error);
        res.status(500).json({ message: 'Server error during file upload.' });
    }
});

module.exports = router;