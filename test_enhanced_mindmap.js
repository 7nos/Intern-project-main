// test_enhanced_mindmap.js
const MindMapGenerator = require('./server/services/mindMapGenerator');

console.log('Testing Enhanced MindMapGenerator with sub-nodes...\n');

// Test 1: Test hierarchical mind map generation
console.log('1. Testing hierarchical mind map generation:');
const testContent = `Artificial Intelligence Overview

1. Introduction to AI
   - Definition of AI
   - History of AI
   - Types of AI

2. Machine Learning
   - Supervised Learning
   - Unsupervised Learning
   - Reinforcement Learning

3. Deep Learning
   - Neural Networks
   - Convolutional Neural Networks
   - Recurrent Neural Networks

4. Applications
   - Computer Vision
   - Natural Language Processing
   - Robotics

5. Future of AI
   - AI Ethics
   - AI in Society
   - Future Developments`;

try {
    const hierarchicalResult = MindMapGenerator.createHierarchicalMindMap(testContent);
    console.log('✅ Hierarchical generation works!');
    console.log('   Nodes:', hierarchicalResult.nodes.length);
    console.log('   Edges:', hierarchicalResult.edges.length);
    
    // Check for sub-nodes
    const hasSubNodes = hierarchicalResult.edges.some(edge => 
        edge.source !== 'central' && !edge.source.startsWith('main-')
    );
    console.log('   Has sub-nodes:', hasSubNodes);
    
    // Show node structure
    console.log('   Node structure:');
    hierarchicalResult.nodes.forEach(node => {
        const isCentral = node.id === 'central';
        const isMain = node.id.startsWith('main-');
        const isSub = node.id.startsWith('sub-');
        const prefix = isCentral ? '  🌟' : isMain ? '  📌' : '    📄';
        console.log(`${prefix} ${node.data.label}`);
    });
} catch (error) {
    console.log('❌ Hierarchical generation failed:', error.message);
}

// Test 2: Test basic mind map with indentation
console.log('\n2. Testing basic mind map with indentation:');
const indentedContent = `Main Topic
  First subtopic
    Sub-subtopic A
    Sub-subtopic B
  Second subtopic
    Sub-subtopic C
  Third subtopic`;

try {
    const basicResult = MindMapGenerator.createBasicMindMap(indentedContent);
    console.log('✅ Basic generation with indentation works!');
    console.log('   Nodes:', basicResult.nodes.length);
    console.log('   Edges:', basicResult.edges.length);
    
    // Check for sub-nodes
    const hasSubNodes = basicResult.edges.some(edge => 
        edge.source !== 'central' && !edge.source.startsWith('main-')
    );
    console.log('   Has sub-nodes:', hasSubNodes);
} catch (error) {
    console.log('❌ Basic generation failed:', error.message);
}

// Test 3: Test enhanced fallback generation
console.log('\n3. Testing enhanced fallback generation:');
const fallbackContent = `This is a test document about artificial intelligence. 
Machine learning is a subset of AI that focuses on algorithms. 
Deep learning uses neural networks to process data. 
Computer vision helps machines understand images. 
Natural language processing enables text understanding. 
Robotics combines AI with physical systems.`;

try {
    const fallbackResult = MindMapGenerator.createFallbackMindMap(fallbackContent);
    console.log('✅ Enhanced fallback generation works!');
    console.log('   Nodes:', fallbackResult.nodes.length);
    console.log('   Edges:', fallbackResult.edges.length);
    
    // Check for sub-nodes
    const hasSubNodes = fallbackResult.edges.some(edge => 
        edge.source !== 'central' && !edge.source.startsWith('main-')
    );
    console.log('   Has sub-nodes:', hasSubNodes);
} catch (error) {
    console.log('❌ Enhanced fallback generation failed:', error.message);
}

console.log('\n✅ All enhanced mind map tests completed!'); 