const request = require('supertest');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const app = require('./server');
const User = require('./models/User');
const File = require('./models/File');

describe('Files Endpoints', () => {
  let testUser;
  let uploadedFileId;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    }
    testUser = new User({ username: 'filetestuser', password: 'testpass123' });
    await testUser.save();
  });

  afterAll(async () => {
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

  it('should upload a file and list it', async () => {
    const testFilePath = path.join(__dirname, 'test_file_list.txt');
    fs.writeFileSync(testFilePath, 'File list test.');

    const uploadRes = await request(app)
      .post('/api/upload')
      .set('X-User-ID', testUser._id.toString())
      .attach('file', testFilePath);
    fs.unlinkSync(testFilePath);
    expect(uploadRes.statusCode).toBe(201);
    uploadedFileId = uploadRes.body._id;

    const listRes = await request(app)
      .get('/api/files')
      .set('X-User-ID', testUser._id.toString());
    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    const found = listRes.body.some(f => f._id === uploadedFileId);
    expect(found).toBe(true);
  });
}); 