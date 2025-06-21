const request = require('supertest');
const app = require('./server');

describe('Vector Store Endpoints', () => {
  const testDoc = { content: 'Test doc for vector store', metadata: { test: true, documentId: 'vector-doc-1' } };

  it('should add a document to the vector store', async () => {
    const res = await request(app)
      .post('/api/services/vector-store/add')
      .send({ documents: [testDoc] });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should find the document in vector store search', async () => {
    const res = await request(app)
      .post('/api/services/vector-store')
      .send({ query: 'Test doc for vector store' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.result)).toBe(true);
    const found = res.body.result.some(r => r.content.includes('Test doc for vector store'));
    expect(found).toBe(true);
  });
}); 