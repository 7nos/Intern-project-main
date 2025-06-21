const request = require('supertest');
const app = require('./server');

// Set environment variables for the test run
process.env.GEMINI_API_KEY = 'AIzaSyCckDNmCCHYst7mzYnQRfT7ftET9-wtvFs';
process.env.HF_API_KEY = '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';

describe('RAG API Endpoints (Local Embeddings)', () => {
  const testDoc = {
    content: 'Retrieval-Augmented Generation (RAG) is a technique that combines retrieval of documents with generative models to answer questions.',
    metadata: { test: true, documentId: 'test-doc-123', userId: 'test-user-123' }
  };

  it('should add a document to the vector store', async () => {
    const res = await request(app)
      .post('/api/services/vector-store/add')
      .send({ documents: [testDoc] });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Added 1 document/);
  });

  it('should return relevant results from the /rag endpoint', async () => {
    const res = await request(app)
      .post('/api/services/rag')
      .send({ query: 'What is RAG in AI?', limit: 3 });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
    // Check that at least one result is our test document with a positive score
    const found = res.body.results.some(r => r.content.includes('Retrieval-Augmented Generation') && r.score > 0);
    expect(found).toBe(true);
  });
}); 