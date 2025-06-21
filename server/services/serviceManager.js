// server/services/serviceManager.js

const VectorStore = require('./vectorStore');
const DocumentProcessor = require('./documentProcessor');
const GeminiService = require('./geminiService');
const GeminiServiceDS = require('./geminiServiceDS');
const GeminiAI = require('./geminiAI');

// Create a single instance of the VectorStore
const vectorStore = new VectorStore();

// Create a single instance of the GeminiService
const geminiService = new GeminiService();
const geminiServiceDS = new GeminiServiceDS();

// Create a single instance of the DocumentProcessor and pass the vectorStore to it
const documentProcessor = new DocumentProcessor(vectorStore);

// Create GeminiAI instance and inject the geminiService
const geminiAI = new GeminiAI(geminiService);

// Initialize the services
const initializeServices = async () => {
    // It's crucial to initialize the vector store so it can load its data
    await vectorStore.initialize(); 
};

module.exports = {
    vectorStore,
    documentProcessor,
    geminiService,
    geminiServiceDS,
    geminiAI,
    initializeServices,
}; 