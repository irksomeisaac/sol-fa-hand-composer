import React, { useRef, useEffect, useState } from 'react';

function VoiceTest() {
    const [voiceState, setVoiceState] = useState({
        isSupported: false,
        isListening: false,
        transcript: '',
        error: null,
        microphoneTest: 'not tested',
        detailedError: null,
        debugInfo: []
    });
    
    const recognitionRef = useRef(null);

    const addDebugInfo = (info) => {
        setVoiceState(prev => ({
            ...prev,
            debugInfo: [...prev.debugInfo.slice(-9), `${new Date().toLocaleTimeString()}: ${info}`]
        }));
        console.log('🔍 Debug:', info);
    };

    // Test microphone access
    const testMicrophone = async () => {
        addDebugInfo('Testing microphone access...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            
            setVoiceState(prev => ({
                ...prev,
                microphoneTest: 'success'
            }));
            addDebugInfo('✅ Microphone access granted');
            
            // Stop the stream
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            setVoiceState(prev => ({
                ...prev,
                microphoneTest: 'failed',
                detailedError: error.message
            }));
            addDebugInfo(`❌ Microphone test failed: ${error.message}`);
            return false;
        }
    };

    const startVoiceTest = async () => {
        addDebugInfo('Starting voice recognition test...');
        
        // Test microphone first
        const micWorking = await testMicrophone();
        if (!micWorking) {
            addDebugInfo('❌ Stopping - microphone not accessible');
            return;
        }

        // Check if speech recognition is supported
        if (!('webkitSpeechRecognition' in window)) {
            setVoiceState(prev => ({
                ...prev,
                isSupported: false,
                error: 'Speech recognition not supported'
            }));
            addDebugInfo('❌ Speech recognition not supported in this browser');
            return;
        }

        setVoiceState(prev => ({ ...prev, isSupported: true }));
        addDebugInfo('✅ Speech recognition is supported');

        // Create new recognition instance
        const recognition = new window.webkitSpeechRecognition();
        recognitionRef.current = recognition;
        
        addDebugInfo('Configuring speech recognition...');
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setVoiceState(prev => ({
                ...prev,
                isListening: true,
                error: null
            }));
            addDebugInfo('✅ Speech recognition started - speak now!');
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            setVoiceState(prev => ({
                ...prev,
                transcript: transcript
            }));
            addDebugInfo(`🎤 Heard: "${transcript}"`);
        };

        recognition.onerror = (event) => {
            const errorInfo = {
                type: event.error,
                message: event.message || 'No message',
                timestamp: new Date().toISOString()
            };
            
            setVoiceState(prev => ({
                ...prev,
                isListening: false,
                error: event.error,
                detailedError: JSON.stringify(errorInfo, null, 2)
            }));
            addDebugInfo(`❌ Speech error: ${event.error}`);
            console.error('Speech recognition error:', errorInfo);
        };

        recognition.onend = () => {
            setVoiceState(prev => ({
                ...prev,
                isListening: false
            }));
            addDebugInfo('🛑 Speech recognition ended');
        };

        // Start recognition with detailed error catching
        try {
            addDebugInfo('Attempting to start speech recognition...');
            recognition.start();
        } catch (error) {
            addDebugInfo(`❌ Failed to start: ${error.message}`);
            setVoiceState(prev => ({
                ...prev,
                error: 'start_exception',
                detailedError: error.message
            }));
        }
    };

    const stopVoiceTest = () => {
        addDebugInfo('Stopping voice test...');
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                addDebugInfo(`Stop error: ${e.message}`);
            }
        }
    };

    const clearTest = () => {
        setVoiceState(prev => ({
            ...prev,
            transcript: '',
            error: null,
            detailedError: null,
            debugInfo: [],
            microphoneTest: 'not tested'
        }));
    };

    return (
        <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px', margin: '20px' }}>
            <h3>🔍 Voice Recognition Advanced Diagnostic</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div><strong>Browser Support:</strong> {voiceState.isSupported ? '✅ Yes' : '❌ No'}</div>
                <div><strong>Microphone:</strong> 
                    {voiceState.microphoneTest === 'success' ? '✅ Working' : 
                     voiceState.microphoneTest === 'failed' ? '❌ Failed' : '⏳ Not tested'}
                </div>
                <div><strong>Voice Status:</strong> {voiceState.isListening ? '🎤 Listening' : '⏸️ Stopped'}</div>
                <div><strong>Current Error:</strong> {voiceState.error || '✅ None'}</div>
            </div>
            
            {voiceState.error && (
                <div style={{ 
                    backgroundColor: '#f8d7da', 
                    color: '#721c24', 
                    padding: '15px', 
                    borderRadius: '4px',
                    marginBottom: '15px',
                    fontSize: '14px'
                }}>
                    <strong>❌ Error Details:</strong>
                    <div>Type: {voiceState.error}</div>
                    {voiceState.detailedError && (
                        <details style={{ marginTop: '10px' }}>
                            <summary>Technical Details</summary>
                            <pre style={{ fontSize: '11px', marginTop: '5px' }}>{voiceState.detailedError}</pre>
                        </details>
                    )}
                </div>
            )}
            
            <div style={{ marginBottom: '15px' }}>
                <button onClick={startVoiceTest} disabled={voiceState.isListening} style={{
                    padding: '12px 24px', marginRight: '10px', backgroundColor: '#007bff',
                    color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}>
                    {voiceState.isListening ? '🎤 Listening...' : '🎤 Start Full Test'}
                </button>
                
                <button onClick={stopVoiceTest} style={{
                    padding: '12px 24px', marginRight: '10px', backgroundColor: '#dc3545',
                    color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}>
                    Stop Test
                </button>
                
                <button onClick={clearTest} style={{
                    padding: '12px 24px', backgroundColor: '#6c757d',
                    color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
                }}>
                    Clear Results
                </button>
            </div>
            
            {voiceState.transcript && (
                <div style={{
                    backgroundColor: '#d4edda',
                    color: '#155724',
                    padding: '15px',
                    borderRadius: '4px',
                    marginBottom: '15px',
                    fontSize: '16px'
                }}>
                    <strong>🎉 SUCCESS! Voice Recognition is Working!</strong><br/>
                    You said: "<strong>{voiceState.transcript}</strong>"
                </div>
            )}
            
            {voiceState.debugInfo.length > 0 && (
                <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
                    <strong>🔍 Debug Log:</strong>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                        {voiceState.debugInfo.map((info, index) => (
                            <div key={index}>{info}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default VoiceTest;
