const request = require('supertest');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const app = require('./server');
const User = require('./models/User');
const File = require('./models/File');

describe('File Upload Endpoint', () => {
  let testUser;
  let uploadedFileId;

  beforeAll(async () => {
    // Connect to the test database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    }
    // Create a test user
    testUser = new User({ username: 'uploadtestuser', password: 'testpass123' });
    await testUser.save();
  });

  afterAll(async () => {
    // Clean up: remove test user and uploaded file from DB and disk
    if (uploadedFileId) {
      const fileDoc = await File.findById(uploadedFileId);
      if (fileDoc && fileDoc.path && fs.existsSync(fileDoc.path)) {
        fs.unlinkSync(fileDoc.path);
      }
      await File.deleteOne({ _id: uploadedFileId });
    }
    await User.deleteOne({ _id: testUser._id });
    await mongoose.connection.close();
  });

  it('should upload a file and return metadata', async () => {
    // Create a small test file in memory
    const testFilePath = path.join(__dirname, 'test_upload.txt');
    fs.writeFileSync(testFilePath, 'This is a test upload file.');

    const res = await request(app)
      .post('/api/upload')
      .set('X-User-ID', testUser._id.toString())
      .attach('file', testFilePath);

    // Clean up the temp file
    fs.unlinkSync(testFilePath);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('originalname', 'test_upload.txt');
    expect(res.body).toHaveProperty('user', testUser._id.toString());
    expect(res.body).toHaveProperty('filename');
    expect(res.body).toHaveProperty('path');
    expect(res.body).toHaveProperty('size');
    uploadedFileId = res.body._id;
  });
}); 