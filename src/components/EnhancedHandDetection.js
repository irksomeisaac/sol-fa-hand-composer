import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as hands from '@mediapipe/hands';
import * as camera from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { recognizeKodalySign } from '../utils/kodalySignsDB';
import { audioPlayer } from '../utils/audioUtils';
import './HandDetection.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 10;

function EnhancedHandDetection() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const voiceRecognitionRef = useRef(null);
    
    const [detectionState, setDetectionState] = useState({
        sign: null,
        confidence: 0,
        debug: null,
        handPresent: false
    });
    
    const [voiceState, setVoiceState] = useState({
        isActive: false,
        lastCommand: null,
        isSupported: false
    });
    
    const [compositionState, setCompositionState] = useState({
        notes: [],
        currentOctave: 4,
        isRecording: false
    });

    const lastSignRef = useRef(null);
    const frameCountRef = useRef(0);

    // Voice command handler
    const handleVoiceCommand = useCallback((transcript) => {
        console.log('Voice command:', transcript);
        
        if (transcript.includes('add') && detectionState.sign) {
            // Add current note to composition
            setCompositionState(prev => ({
                ...prev,
                notes: [...prev.notes, {
                    note: detectionState.sign,
                    octave: prev.currentOctave,
                    timestamp: Date.now()
                }]
            }));
            audioPlayer.playUIFeedback(1200, 200);
            setVoiceState(prev => ({ ...prev, lastCommand: 'Added note: ' + detectionState.sign.toUpperCase() }));
        }
        else if (transcript.includes('octave up') || transcript.includes('higher')) {
            setCompositionState(prev => ({
                ...prev,
                currentOctave: Math.min(prev.currentOctave + 1, 7)
            }));
            audioPlayer.playUIFeedback(1000);
            setVoiceState(prev => ({ ...prev, lastCommand: 'Octave up' }));
        }
        else if (transcript.includes('octave down') || transcript.includes('lower')) {
            setCompositionState(prev => ({
                ...prev,
                currentOctave: Math.max(prev.currentOctave - 1, 2)
            }));
            audioPlayer.playUIFeedback(600);
            setVoiceState(prev => ({ ...prev, lastCommand: 'Octave down' }));
        }
        else if (transcript.includes('play') || transcript.includes('playback')) {
            playComposition();
            setVoiceState(prev => ({ ...prev, lastCommand: 'Playing composition' }));
        }
        else if (transcript.includes('clear') || transcript.includes('reset')) {
            setCompositionState(prev => ({
                ...prev,
                notes: []
            }));
            audioPlayer.playUIFeedback(400, 300);
            setVoiceState(prev => ({ ...prev, lastCommand: 'Composition cleared' }));
        }
        else if (transcript.includes('undo') || transcript.includes('remove last')) {
            setCompositionState(prev => ({
                ...prev,
                notes: prev.notes.slice(0, -1)
            }));
            audioPlayer.playUIFeedback(500);
            setVoiceState(prev => ({ ...prev, lastCommand: 'Last note removed' }));
        }
    }, [detectionState.sign]);

    const playComposition = useCallback(() => {
        if (compositionState.notes.length === 0) {
            audioPlayer.playUIFeedback(400, 300);
            return;
        }

        compositionState.notes.forEach((noteItem, index) => {
            setTimeout(() => {
                audioPlayer.playNote(noteItem.note, noteItem.octave);
                setTimeout(() => audioPlayer.stopNote(), 400);
            }, index * 500);
        });
    }, [compositionState.notes]);

    const handleSignDetection = useCallback((recognition) => {
        const currentSign = recognition?.sign;
        const confidence = recognition?.confidence || 0;

        if (currentSign && confidence >= CONFIDENCE_THRESHOLD) {
            if (currentSign === lastSignRef.current) {
                frameCountRef.current++;
                if (frameCountRef.current >= HOLD_FRAMES) {
                    audioPlayer.playNote(currentSign, compositionState.currentOctave);
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
    }, [compositionState.currentOctave]);

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

    useEffect(() => {
        if (!webcamRef.current) return;

        // Fixed MediaPipe loading for GitHub Pages
        handsRef.current = new hands.Hands({
            locateFile: (file) => {
                // Try multiple CDN sources for reliability
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
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

        // Setup voice recognition automatically
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            voiceRecognitionRef.current = new SpeechRecognition();
            
            voiceRecognitionRef.current.continuous = true;
            voiceRecognitionRef.current.interimResults = false;
            voiceRecognitionRef.current.lang = 'en-US';
            
            voiceRecognitionRef.current.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
                handleVoiceCommand(transcript);
            };
            
            voiceRecognitionRef.current.onerror = () => {
                setTimeout(() => {
                    try { voiceRecognitionRef.current.start(); } catch (e) {}
                }, 1000);
            };
            
            voiceRecognitionRef.current.onend = () => {
                setTimeout(() => {
                    try { voiceRecognitionRef.current.start(); } catch (e) {}
                }, 100);
            };

            // Auto-start voice recognition
            setTimeout(() => {
                try {
                    voiceRecognitionRef.current.start();
                    setVoiceState(prev => ({ ...prev, isActive: true, isSupported: true }));
                    console.log('Voice recognition auto-started');
                } catch (error) {
                    console.error('Voice recognition failed to start:', error);
                }
            }, 2000);
        }

        return () => {
            if (cameraRef.current) {
                cameraRef.current.stop();
            }
            if (handsRef.current) {
                handsRef.current.close();
            }
            if (voiceRecognitionRef.current) {
                voiceRecognitionRef.current.stop();
            }
            audioPlayer.stopNote();
        };
    }, [onResults, handleVoiceCommand]);

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
                        ? `Detected: ${detectionState.sign.toUpperCase()}${compositionState.currentOctave} (${Math.round(detectionState.confidence * 100)}% confident)`
                        : "Hand Detected - No Sign Recognized"}
                </div>
                <div className="debug-data">
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
                            <div className="debug-section">
                                <h4>Voice Commands:</h4>
                                <div className={`voice-status ${voiceState.isActive ? 'active' : 'inactive'}`}>
                                    {voiceState.isSupported ? 
                                        (voiceState.isActive ? '🎤 Voice Active' : '🎤 Starting...') : 
                                        '❌ Not Supported'
                                    }
                                </div>
                                {voiceState.lastCommand && (
                                    <div className="last-command">
                                        {voiceState.lastCommand}
                                    </div>
                                )}
                                <div className="voice-commands-list">
                                    <small>
                                        Say: "Add" | "Octave up" | "Octave down" | "Play" | "Clear" | "Undo"
                                    </small>
                                </div>
                            </div>
                            <div className="debug-section">
                                <h4>Composition:</h4>
                                <p>Octave: {compositionState.currentOctave}</p>
                                <p>Notes: {compositionState.notes.length}</p>
                                {compositionState.notes.length > 0 && (
                                    <div className="composition-preview">
                                        {compositionState.notes.slice(-5).map((note, index) => (
                                            <span key={index} className="note-item">
                                                {note.note.toUpperCase()}{note.octave}
                                            </span>
                                        ))}
                                        {compositionState.notes.length > 5 && <span>...</span>}
                                    </div>
                                )}
                            </div>
                            {detectionState.sign && frameCountRef.current >= HOLD_FRAMES && (
                                <div className="debug-section playing">
                                    <h4>Playing Note:</h4>
                                    <p>{detectionState.sign.toUpperCase()}{compositionState.currentOctave}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }, [detectionState, voiceState, compositionState]);

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
                            <h2>{detectionState.sign.toUpperCase()}{compositionState.currentOctave}</h2>
                        </div>
                    )}
                    
                    {voiceState.isActive && (
                        <div className="voice-indicator">
                            🎤 Voice Active
                        </div>
                    )}
                </div>
                {renderDebugInfo()}
            </div>
        </div>
    );
}

export default EnhancedHandDetection;
