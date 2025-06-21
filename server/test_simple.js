const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testSimple() {
    console.log('🧪 Simple TTS engine test...');
    
    try {
        // Test eSpeak
        console.log('Testing eSpeak...');
        try {
            await execAsync('espeak --version');
            console.log('✅ eSpeak is available');
        } catch (error) {
            console.log('❌ eSpeak not found');
        }
        
        // Test Windows SAPI
        console.log('Testing Windows SAPI...');
        if (process.platform === 'win32') {
            console.log('✅ Windows SAPI should be available (Windows detected)');
        } else {
            console.log('❌ Windows SAPI not available (not Windows)');
        }
        
        // Test Windows say
        console.log('Testing Windows say...');
        try {
            await execAsync('where say');
            console.log('✅ Windows say is available');
        } catch (error) {
            console.log('❌ Windows say not found');
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    }
}

testSimple(); 