import React, { useState } from 'react';

function SimpleVoiceTest() {
    const [result, setResult] = useState('');
    const [status, setStatus] = useState('Ready');

    const testVoice = () => {
        setStatus('Testing...');
        setResult('');

        // Check if supported
        if (!('webkitSpeechRecognition' in window)) {
            setResult('❌ Speech recognition not supported');
            setStatus('Failed');
            return;
        }

        // Simple direct approach
        const recognition = new window.webkitSpeechRecognition();
        
        // Minimal configuration
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        // Event handlers
        recognition.onstart = () => {
            setStatus('🎤 Listening - say something!');
            setResult('Voice recognition started successfully');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setResult(`✅ SUCCESS! You said: "${transcript}"`);
            setStatus('Success');
        };

        recognition.onerror = (event) => {
            setResult(`❌ Error: ${event.error}`);
            setStatus('Error');
            
            // Log more details
            console.error('Speech recognition error details:', {
                error: event.error,
                message: event.message,
                timeStamp: event.timeStamp
            });
        };

        recognition.onend = () => {
            if (status === '🎤 Listening - say something!') {
                setStatus('Ended without result');
            }
        };

        // Start with minimal error handling
        try {
            recognition.start();
        } catch (error) {
            setResult(`❌ Failed to start: ${error.message}`);
            setStatus('Start failed');
        }
    };

    return (
        <div style={{ 
            padding: '20px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '8px', 
            margin: '20px',
            border: '2px solid #2196f3'
        }}>
            <h3>🎤 Simple Voice Test</h3>
            
            <div style={{ marginBottom: '15px' }}>
                <strong>Status:</strong> {status}
            </div>
            
            <button 
                onClick={testVoice}
                style={{
                    padding: '15px 30px',
                    fontSize: '16px',
                    backgroundColor: '#2196f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '15px'
                }}
            >
                🎤 Test Voice Now
            </button>
            
            {result && (
                <div style={{
                    backgroundColor: result.includes('SUCCESS') ? '#d4edda' : '#f8d7da',
                    color: result.includes('SUCCESS') ? '#155724' : '#721c24',
                    padding: '15px',
                    borderRadius: '4px',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }}>
                    {result}
                </div>
            )}
            
            <div style={{ 
                marginTop: '15px', 
                padding: '10px', 
                backgroundColor: 'white', 
                borderRadius: '4px',
                fontSize: '14px'
            }}>
                <strong>Instructions:</strong>
                <ol>
                    <li>Click the blue "Test Voice Now" button</li>
                    <li>Allow microphone if prompted</li>
                    <li>Say "Hello" or "Test" clearly</li>
                    <li>Look for success message</li>
                </ol>
                
                <p><strong>Troubleshooting:</strong></p>
                <ul>
                    <li>Make sure no other apps are using your microphone</li>
                    <li>Check that Chrome has microphone permission</li>
                    <li>Try speaking louder or closer to the microphone</li>
                </ul>
            </div>
        </div>
    );
}

export default SimpleVoiceTest;
