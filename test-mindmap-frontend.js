// test-mindmap-frontend.js
// Simple test to verify mind map frontend integration

const testMindMapData = {
    nodes: [
        {
            id: 'central',
            type: 'mindmap-node',
            data: {
                label: 'Main Topic',
                content: 'This is the central topic'
            },
            position: { x: 0, y: 0 }
        },
        {
            id: 'node-1',
            type: 'mindmap-node',
            data: {
                label: 'Sub Topic 1',
                content: 'This is sub topic 1'
            },
            position: { x: -200, y: 100 }
        },
        {
            id: 'node-2',
            type: 'mindmap-node',
            data: {
                label: 'Sub Topic 2',
                content: 'This is sub topic 2'
            },
            position: { x: 200, y: 100 }
        }
    ],
    edges: [
        {
            id: 'edge-1',
            source: 'central',
            target: 'node-1',
            type: 'smoothstep',
            data: { label: '' }
        },
        {
            id: 'edge-2',
            source: 'central',
            target: 'node-2',
            type: 'smoothstep',
            data: { label: '' }
        }
    ]
};

// Test the transformation function
const transformBackendData = (backendData) => {
    if (!backendData || !backendData.nodes || !backendData.edges) {
        return null;
    }

    // Transform nodes to match frontend expectations
    const transformedNodes = backendData.nodes.map((node, index) => ({
        id: node.id,
        type: index === 0 ? 'customInput' : 'customDefault', // First node is input, others are default
        data: {
            label: node.data?.label || node.label || 'Node',
            content: node.data?.content || node.content || ''
        },
        position: node.position || { x: index * 200, y: 100 }
    }));

    // Transform edges to match frontend expectations
    const transformedEdges = backendData.edges.map((edge, index) => ({
        id: edge.id || `edge-${index}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        data: {
            label: edge.data?.label || edge.label || ''
        }
    }));

    return {
        nodes: transformedNodes,
        edges: transformedEdges
    };
};

// Test the transformation
console.log('Testing mind map data transformation...');
const transformed = transformBackendData(testMindMapData);
console.log('Original data:', JSON.stringify(testMindMapData, null, 2));
console.log('Transformed data:', JSON.stringify(transformed, null, 2));

if (transformed && transformed.nodes && transformed.edges) {
    console.log('✅ Transformation successful!');
    console.log(`Nodes: ${transformed.nodes.length}, Edges: ${transformed.edges.length}`);
} else {
    console.log('❌ Transformation failed!');
}

// Test API endpoint simulation
const simulateApiCall = async () => {
    console.log('\nSimulating API call...');
    
    // Simulate successful API response
    const mockResponse = {
        data: testMindMapData
    };
    
    // Simulate the frontend handling
    if (mockResponse.data && (mockResponse.data.nodes || mockResponse.data.mindmap)) {
        const mindMapData = mockResponse.data.mindmap || mockResponse.data;
        console.log('✅ API response handled successfully');
        console.log('Mind map data structure:', Object.keys(mindMapData));
    } else {
        console.log('❌ API response handling failed');
    }
};

simulateApiCall(); 