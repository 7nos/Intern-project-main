const request = require('supertest');
const app = require('./server');
const User = require('./models/User');

describe('Auth Endpoints', () => {
  const username = 'testuser_auth';
  const password = 'testpass123';
  let userId;

  afterAll(async () => {
    await User.deleteOne({ username });
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username, password });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('user');
    userId = res.body.user._id;
  });

  it('should login with the new user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
  });
}); 