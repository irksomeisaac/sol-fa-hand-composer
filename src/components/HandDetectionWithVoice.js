import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as hands from '@mediapipe/hands';
import * as camera from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { recognizeKodalySign } from '../utils/kodalySignsDB';
import { audioPlayer } from '../utils/audioUtils';
import SimpleSheetMusic from './SimpleSheetMusic';
import './HandDetection.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 10;

function HandDetectionWithVoice() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const recognitionRef = useRef(null);
    
    const [detectionState, setDetectionState] = useState({
        sign: null,
        confidence: 0,
        debug: null,
        handPresent: false
    });
    
    const [composition, setComposition] = useState({
        notes: [],
        currentOctave: 4
    });

    const [voiceState, setVoiceState] = useState({
        isSupported: 'webkitSpeechRecognition' in window,
        currentSpeech: '',
        lastCommand: null,
        status: 'Voice Ready'
    });

    const lastSignRef = useRef(null);
    const frameCountRef = useRef(0);

    const handleVoiceCommand = useCallback((transcript) => {
        console.log('Processing voice command:', transcript);
        
        setVoiceState(prev => ({
            ...prev,
            lastCommand: transcript,
            status: 'Command processed'
        }));

        if (transcript.includes('add') && detectionState.sign) {
            const newNote = {
                note: detectionState.sign,
                octave: composition.currentOctave,
                timestamp: Date.now()
            };
            setComposition(prev => ({
                ...prev,
                notes: [...prev.notes, newNote]
            }));
            audioPlayer.playUIFeedback(1200, 200);
        }
        else if (transcript.includes('octave up') || transcript.includes('higher')) {
            setComposition(prev => ({
                ...prev,
                currentOctave: Math.min(prev.currentOctave + 1, 7)
            }));
            audioPlayer.playUIFeedback(1000);
        }
        else if (transcript.includes('octave down') || transcript.includes('lower')) {
            setComposition(prev => ({
                ...prev,
                currentOctave: Math.max(prev.currentOctave - 1, 2)
            }));
            audioPlayer.playUIFeedback(600);
        }
        else if (transcript.includes('play')) {
            playComposition();
        }
        else if (transcript.includes('clear')) {
            setComposition(prev => ({ ...prev, notes: [] }));
            audioPlayer.playUIFeedback(400, 300);
        }
        else if (transcript.includes('undo')) {
            setComposition(prev => ({
                ...prev,
                notes: prev.notes.slice(0, -1)
            }));
            audioPlayer.playUIFeedback(500);
        }

        // Reset status after processing
        setTimeout(() => {
            setVoiceState(prev => ({ ...prev, currentSpeech: '', status: 'Voice Ready' }));
        }, 2000);
    }, [detectionState.sign, composition.currentOctave]);

    const playComposition = () => {
        if (composition.notes.length === 0) {
            audioPlayer.playUIFeedback(400, 300);
            return;
        }

        composition.notes.forEach((noteItem, index) => {
            setTimeout(() => {
                audioPlayer.playNote(noteItem.note, noteItem.octave);
                setTimeout(() => audioPlayer.stopNote(), 450);
            }, index * 500);
        });
    };

    const handleSignDetection = useCallback((recognition) => {
        const currentSign = recognition?.sign;
        const confidence = recognition?.confidence || 0;

        if (currentSign && confidence >= CONFIDENCE_THRESHOLD) {
            if (currentSign === lastSignRef.current) {
                frameCountRef.current++;
                if (frameCountRef.current >= HOLD_FRAMES) {
                    audioPlayer.playNote(currentSign, composition.currentOctave);
                }
            } else {
                frameCountRef.current = 0;
                lastSignRef.current = currentSign;
                audioPlayer.stopNote();
            }
        } else {
            frameCountRef.current = 0;
            lastSignRef.current = null;
            audioPlayer.stopNote();
        }
    }, [composition.currentOctave]);

    const onResults = useCallback((results) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);

        if (results.image) {
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        }

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            for (const landmarks of results.multiHandLandmarks) {
                drawConnectors(ctx, landmarks, hands.HAND_CONNECTIONS, {
                    color: '#00FF00',
                    lineWidth: 5
                });
                drawLandmarks(ctx, landmarks, {
                    color: '#FF0000',
                    lineWidth: 2
                });

                const mirroredLandmarks = landmarks.map(landmark => ({
                    ...landmark,
                    x: 1 - landmark.x
                }));

                const recognition = recognizeKodalySign(mirroredLandmarks);
                handleSignDetection(recognition);
                setDetectionState({
                    ...recognition,
                    handPresent: true
                });
            }
        } else {
            handleSignDetection(null);
            setDetectionState({
                sign: null,
                confidence: 0,
                debug: null,
                handPresent: false
            });
        }

        ctx.restore();
    }, [handleSignDetection]);

    // Setup MediaPipe
    useEffect(() => {
        if (!webcamRef.current) return;

        handsRef.current = new hands.Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        handsRef.current.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });

        handsRef.current.onResults(onResults);

        if (webcamRef.current) {
            cameraRef.current = new camera.Camera(webcamRef.current.video, {
                onFrame: async () => {
                    if (webcamRef.current && handsRef.current) {
                        await handsRef.current.send({
                            image: webcamRef.current.video
                        });
                    }
                },
                width: 640,
                height: 480
            });
            cameraRef.current.start();
        }

        return () => {
            if (cameraRef.current) {
                cameraRef.current.stop();
            }
            if (handsRef.current) {
                handsRef.current.close();
            }
            audioPlayer.stopNote();
        };
    }, [onResults]);

    // Setup voice recognition
    useEffect(() => {
        if (!voiceState.isSupported) return;

        const recognition = new window.webkitSpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            setVoiceState(prev => ({
                ...prev,
                currentSpeech: interimTranscript || finalTranscript
            }));

            if (finalTranscript) {
                handleVoiceCommand(finalTranscript.toLowerCase().trim());
            }
        };

        recognition.onerror = (event) => {
            console.log('Voice error:', event.error);
        };

        recognition.onend = () => {
            setTimeout(() => {
                try { 
                    recognition.start(); 
                } catch (e) {
                    console.log('Voice restart failed');
                }
            }, 1000);
        };

        // Start voice recognition
        setTimeout(() => {
            try {
                recognition.start();
                console.log('Voice recognition started');
            } catch (error) {
                console.error('Voice start failed:', error);
            }
        }, 3000);

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {}
            }
        };
    }, [handleVoiceCommand]);

    const renderDebugInfo = useCallback(() => {
        if (!detectionState.handPresent) {
            return (
                <div className="debug-panel">
                    <div className="status-message">No Hand Detected</div>
                    <div className="debug-data">
                        <p>Waiting for hand to appear in frame...</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="debug-panel">
                <div className="status-message">
                    {detectionState.sign 
                        ? `Detected: ${detectionState.sign.toUpperCase()}${composition.currentOctave} (${Math.round(detectionState.confidence * 100)}% confident)`
                        : "Hand Detected - No Sign Recognized"}
                </div>
                <div className="debug-data">
                    <div className="debug-section voice-section">
                        <h4>🎤 Voice Status: {voiceState.status}</h4>
                        
                        {voiceState.currentSpeech && (
                            <div className="current-speech">
                                Hearing: "{voiceState.currentSpeech}"
                            </div>
                        )}
                        
                        {voiceState.lastCommand && (
                            <div className="last-command">
                                Last: "{voiceState.lastCommand}"
                            </div>
                        )}
                    </div>
                    
                    <div className="debug-section">
                        <h4>Composition:</h4>
                        <p>Current Octave: {composition.currentOctave}</p>
                        <p>Notes Added: {composition.notes.length}</p>
                        {composition.notes.length > 0 && (
                            <div>
                                Last notes: {composition.notes.slice(-3).map(n => 
                                    `${n.note.toUpperCase()}${n.octave}`
                                ).join(', ')}
                            </div>
                        )}
                    </div>
                    
                    <div className="debug-section">
                        <h4>Voice Commands:</h4>
                        <ul>
                            <li>"Add" - Add current note</li>
                            <li>"Octave up" - Increase octave</li>
                            <li>"Octave down" - Decrease octave</li>
                            <li>"Play" - Play composition</li>
                            <li>"Undo" - Remove last note</li>
                            <li>"Clear" - Clear all notes</li>
                        </ul>
                    </div>

                    <h3>Hand Analysis:</h3>
                    {detectionState.debug && (
                        <>
                            <div className="debug-section">
                                <h4>Finger Extensions:</h4>
                                {Object.entries(detectionState.debug.extensions).map(([finger, value]) => (
                                    <div key={finger} className="debug-item">
                                        <span>{finger}:</span>
                                        <div className="debug-bar" style={{width: `${value * 100}%`}}></div>
                                        <span>{Math.round(value * 100)}%</span>
                                    </div>
                                ))}
                            </div>
                            {detectionState.sign && frameCountRef.current >= HOLD_FRAMES && (
                                <div className="debug-section playing">
                                    <h4>Playing Note:</h4>
                                    <p>{detectionState.sign.toUpperCase()}{composition.currentOctave}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }, [detectionState, composition, voiceState]);

    return (
        <div className="hand-detection">
            <div className="main-container">
                <div className="camera-canvas-container">
                    <Webcam
                        ref={webcamRef}
                        style={{ display: 'none' }}
                        width={640}
                        height={480}
                        mirrored={false}
                    />
                    <canvas
                        ref={canvasRef}
                        width={640}
                        height={480}
                    />
                    {detectionState.sign && (
                        <div className={`sign-indicator ${frameCountRef.current >= HOLD_FRAMES ? 'playing' : ''}`}>
                            <h2>{detectionState.sign.toUpperCase()}{composition.currentOctave}</h2>
                        </div>
                    )}
                    
                    {/* Voice speech overlay */}
                    {voiceState.currentSpeech && (
                        <div className="speech-bubble">
                            "{voiceState.currentSpeech}"
                        </div>
                    )}
                    
                    <div className="voice-status-indicator">
                        🎤 {voiceState.status}
                    </div>
                </div>
                {renderDebugInfo()}
            </div>
            
            {/* Sheet Music Display */}
            <SimpleSheetMusic notes={composition.notes} />
        </div>
    );
}

export default HandDetectionWithVoice;
