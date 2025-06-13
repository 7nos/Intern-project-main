// Test environment variable loading
require('dotenv').config();

console.log('Environment check:');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);
console.log('GEMINI_API_KEY preview:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'undefined');

const GeminiService = require('./deep_search/services/geminiService');
const service = new GeminiService();
console.log('Gemini service enabled:', service.isEnabled());

if (service.isEnabled()) {
  console.log('✅ Gemini service is properly configured!');
} else {
  console.log('❌ Gemini service is not enabled - checking why...');
}
