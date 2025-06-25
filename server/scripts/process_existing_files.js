const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const File = require('../models/File');
const documentProcessor = require('../services/documentProcessor');
const pLimit = require('p-limit');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chatbotGeminiDB';
const limit = pLimit(3); // Limit to 3 concurrent file processes

async function processExistingFiles() {
    console.log('=== Processing Existing Files for RAG ===\n');
    
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB successfully\n');
        
        // Get all files from database
        const allFiles = await File.find({}).sort({ createdAt: -1 });
        console.log(`📊 Found ${allFiles.length} files in database\n`);
        
        // Use concurrency limit for processing files
        const tasks = allFiles.map(file => limit(async () => {
            try {
                // Check if file exists on disk
                if (!fs.existsSync(file.path)) {
                    console.log(`❌ File not found on disk: ${file.originalname} (${file.path})`);
                    return { success: false };
                }
                
                console.log(`🔄 Processing: ${file.originalname} (User: ${file.user})`);
                
                // Process the file and add to vector store
                const processingResult = await documentProcessor.processFile(file.path, {
                    userId: file.user,
                    originalName: file.originalname,
                    fileType: path.extname(file.path).substring(1)
                });
                
                console.log(`✅ Processed: ${file.originalname} - ${processingResult.chunksAdded} chunks added`);
                return { success: true };
            } catch (error) {
                console.error(`❌ Error processing ${file.originalname}:`, error.message);
                return { success: false };
            }
        }));

        const results = await Promise.all(tasks);
        const processedCount = results.filter(r => r.success).length;
        const errorCount = results.length - processedCount;
        
        console.log(`\n📈 Processing Summary:`);
        console.log(`  • Files processed successfully: ${processedCount}`);
        console.log(`  • Files with errors: ${errorCount}`);
        console.log(`  • Total files: ${allFiles.length}`);
        
        if (processedCount > 0) {
            console.log(`\n🎉 Successfully processed ${processedCount} files for RAG!`);
            console.log('💡 You can now ask questions and the RAG system will search through your documents.');
        }
        
    } catch (error) {
        console.error('❌ Error during file processing:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n=== Processing Complete ===');
    }
}

processExistingFiles(); 