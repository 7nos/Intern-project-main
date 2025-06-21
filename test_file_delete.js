// test_file_delete.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testFileDelete() {
    console.log('Testing file deletion endpoint...\n');

    try {
        // Test 1: Check if server is running
        console.log('1. Testing server connectivity...');
        const healthResponse = await axios.get(`${BASE_URL.replace('/api', '')}/`);
        console.log('✅ Server is running:', healthResponse.data);

        // Test 2: Test files endpoint (GET)
        console.log('\n2. Testing files endpoint (GET)...');
        try {
            const filesResponse = await axios.get(`${BASE_URL}/files`);
            console.log('✅ Files endpoint accessible');
            console.log('   Response status:', filesResponse.status);
            console.log('   Files count:', filesResponse.data.length || 0);
        } catch (error) {
            console.log('❌ Files endpoint error:', error.response?.status, error.response?.data?.message || error.message);
        }

        // Test 3: Test file deletion endpoint (DELETE) with invalid ID
        console.log('\n3. Testing file deletion endpoint (DELETE) with invalid ID...');
        try {
            const deleteResponse = await axios.delete(`${BASE_URL}/files/invalid-id`);
            console.log('❌ Should have failed but succeeded:', deleteResponse.status);
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('✅ File deletion endpoint accessible (correctly rejected invalid ID)');
            } else if (error.response?.status === 401) {
                console.log('✅ File deletion endpoint accessible (authentication required)');
            } else {
                console.log('❌ Unexpected error:', error.response?.status, error.response?.data?.message || error.message);
            }
        }

        console.log('\n✅ File deletion endpoint tests completed!');
        console.log('\nTo test with real files:');
        console.log('1. Upload a file through the frontend');
        console.log('2. Get the file ID from the file list');
        console.log('3. Use the delete button in the UI');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure the backend server is running on port 5001');
        }
    }
}

testFileDelete(); 