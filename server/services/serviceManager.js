// server/services/serviceManager.js

const VectorStore = require('./vectorStore');
const DocumentProcessor = require('./documentProcessor');
const GeminiService = require('./geminiService');
const { GeminiAI } = require('./geminiAI');

class ServiceManager {
  constructor() {
    this.vectorStore = null;
    this.documentProcessor = null;
    this.geminiService = null;
    this.geminiAI = null;
  }

  async initialize() {
    // Instantiate services in the correct order
    this.vectorStore = new VectorStore();
    await this.vectorStore.initialize();

    // Pass dependencies via constructor (Dependency Injection)
    this.documentProcessor = new DocumentProcessor(this.vectorStore);
    
    this.geminiService = new GeminiService();
    await this.geminiService.initialize();

    // Pass dependencies via constructor
    this.geminiAI = new GeminiAI(this.geminiService);

    console.log('✅ All services initialized successfully');
  }

  getServices() {
    return {
      vectorStore: this.vectorStore,
      documentProcessor: this.documentProcessor,
      geminiService: this.geminiService,
      geminiAI: this.geminiAI,
    };
  }
}

// Create a single, shared instance of the ServiceManager
const serviceManager = new ServiceManager();

// Export the manager instance, not the class
module.exports = serviceManager;
