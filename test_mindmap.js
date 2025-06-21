// test_mindmap.js
const MindMapGenerator = require('./server/services/mindMapGenerator');

console.log('Testing MindMapGenerator...');

// Test 1: Test the static method
console.log('\n1. Testing formatForReactFlow method:');
console.log('Method type:', typeof MindMapGenerator.formatForReactFlow);

// Test 2: Test with sample data
const sampleData = {
    nodes: [
        { id: '1', data: { label: 'AI', content: 'Artificial Intelligence' }, position: { x: 0, y: 0 } },
        { id: '2', data: { label: 'ML', content: 'Machine Learning' }, position: { x: 200, y: 100 } },
        { id: '3', data: { label: 'DL', content: 'Deep Learning' }, position: { x: 400, y: 100 } }
    ],
    edges: [
        { id: 'e1', source: '1', target: '2' },
        { id: 'e2', source: '1', target: '3' }
    ]
};

try {
    const result = MindMapGenerator.formatForReactFlow(sampleData);
    console.log('✅ formatForReactFlow works!');
    console.log('Result nodes:', result.nodes.length);
    console.log('Result edges:', result.edges.length);
} catch (error) {
    console.log('❌ formatForReactFlow failed:', error.message);
}

// Test 3: Test fallback generation
console.log('\n2. Testing fallback mind map generation:');
const testContent = `Artificial Intelligence Overview

1. Introduction to AI
   - Definition of AI
   - History of AI
   - Types of AI

2. Machine Learning
   - Supervised Learning
   - Unsupervised Learning
   - Reinforcement Learning`;

try {
    const fallbackResult = MindMapGenerator.createFallbackMindMap(testContent);
    console.log('✅ Fallback generation works!');
    console.log('Fallback nodes:', fallbackResult.nodes.length);
    console.log('Fallback edges:', fallbackResult.edges.length);
} catch (error) {
    console.log('❌ Fallback generation failed:', error.message);
}

console.log('\n✅ All tests completed!'); 