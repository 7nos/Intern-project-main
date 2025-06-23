const VectorStore = require('./services/vectorStore');

async function testVectorStore() {
    console.log('🧪 Testing VectorStore search functionality...\n');

    try {
        const vectorStore = new VectorStore();
        await vectorStore.initialize();

        // Add sample documents
        const documents = [
            { content: 'This is a test document about JavaScript.', metadata: { userId: 'user1', fileId: 'file1' } },
            { content: 'Another document discussing Node.js and backend development.', metadata: { userId: 'user1', fileId: 'file2' } },
            { content: 'This text is unrelated to programming.', metadata: { userId: 'user2', fileId: 'file3' } }
        ];

        console.log('Adding documents to vector store...');
        const addResult = await vectorStore.addDocuments(documents);
        console.log(`Added ${addResult.count} documents.`);

        // Search without filters
        const query1 = 'JavaScript backend';
        console.log(`\nSearching for: "${query1}" without filters`);
        const results1 = await vectorStore.searchDocuments(query1);
        console.log('Results:', results1);

        // Search with userId filter
        const query2 = 'backend development';
        console.log(`\nSearching for: "${query2}" with userId filter 'user1'`);
        const results2 = await vectorStore.searchDocuments(query2, { filters: { userId: 'user1' } });
        console.log('Results:', results2);

        // Search with userId and fileId filter
        const query3 = 'programming';
        console.log(`\nSearching for: "${query3}" with userId 'user2' and fileId 'file3'`);
        const results3 = await vectorStore.searchDocuments(query3, { filters: { userId: 'user2', fileId: 'file3' } });
        console.log('Results:', results3);

        console.log('\n✅ VectorStore search test completed successfully.');
    } catch (error) {
        console.error('❌ VectorStore search test failed:', error);
    }
}

testVectorStore();
