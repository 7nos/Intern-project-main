const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const API_URL = 'http://localhost:5001/api/mindmap/generate';
const TEST_FILE_PATH = path.join(__dirname, '..', 'data', 'test-document.txt');
const TEST_USER_ID = 'test-user-id'; // This would normally be a real user ID from your auth system

async function testMindmapGeneration() {
    try {
        // Read test file
        const fileContent = await fs.readFile(TEST_FILE_PATH, 'utf8');
        console.log('Test file content:', fileContent);

        // Simulate file upload by creating a test file in the database
        const testFile = {
            _id: 'test-file-id',
            user: TEST_USER_ID,
            path: TEST_FILE_PATH,
            name: 'test-document.txt'
        };

        // Make request to mindmap generation endpoint
        const response = await axios.post(API_URL, {
            fileId: testFile._id
        }, {
            headers: {
                'Authorization': `Bearer test-token` // This would normally be a real JWT token
            }
        });

        console.log('Response status:', response.status);
        console.log('Response data:', response.data);

        // Verify the response structure
        if (!response.data.nodes || !response.data.edges) {
            throw new Error('Response does not contain expected nodes and edges');
        }

        console.log('Test successful! Mindmap data received with:', 
            response.data.nodes.length, 'nodes and', 
            response.data.edges.length, 'edges');

    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testMindmapGeneration();
