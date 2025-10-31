import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as hands from '@mediapipe/hands';
import * as camera from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { recognizeKodalySign } from '../utils/kodalySignsDB';
import { audioPlayer } from '../utils/audioUtils';
import { CompositionManager } from '../utils/compositionManager';
import { VoiceCommandManager } from '../utils/voiceCommands';
import KodalyReference from './KodalyReference';
import './VoiceControlledComposer.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 10;

function VoiceControlledComposer() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const compositionManagerRef = useRef(new CompositionManager());
    const voiceManagerRef = useRef(null);
    
    const [detectionState, setDetectionState] = useState({
        sign: null,
        confidence: 0,
        debug: null,
        handPresent: false
    });
    
    const [compositionState, setCompositionState] = useState({
        isRecording: false,
        isPlaying: false,
        currentOctave: 4,
        noteCount: 0
    });

    const [voiceState, setVoiceState] = useState({
        isListening: false,
        isSupported: false,
        lastCommand: null
    });

    const [showReference, setShowReference] = useState(false);

    const lastNoteRef = useRef(null);
    const frameCountRef = useRef(0);

    // Voice command handler
    const handleVoiceCommand = useCallback((command, transcript) => {
        const manager = compositionManagerRef.current;
        
        switch (command) {
            case 'OCTAVE_UP':
                manager.octaveUp();
                audioPlayer.playUIFeedback(1000);
                break;
            case 'OCTAVE_DOWN':
                manager.octaveDown();
                audioPlayer.playUIFeedback(600);
                break;
            case 'START_RECORDING':
                if (!manager.isRecording) {
                    manager.startRecording();
                    audioPlayer.playUIFeedback(1200);
                }
                break;
            case 'STOP_RECORDING':
                if (manager.isRecording) {
                    manager.stopRecording();
                    audioPlayer.playUIFeedback(800);
                }
                break;
            case 'PLAY':
                manager.togglePlayback(audioPlayer);
                audioPlayer.playUIFeedback(1400);
                break;
            case 'PAUSE':
                if (manager.isPlaying) {
                    manager.stopPlayback();
                    audioPlayer.playUIFeedback(700);
                }
                break;
            case 'CLEAR':
                manager.clearComposition();
                audioPlayer.playUIFeedback(400);
                break;
            case 'TEMPO_UP':
                // TODO: Implement tempo controls
                audioPlayer.playUIFeedback(1100);
                break;
            case 'TEMPO_DOWN':
                // TODO: Implement tempo controls
                audioPlayer.playUIFeedback(500);
                break;
        }
        
        // Update states
        setCompositionState(manager.getStatus());
        setVoiceState(prev => ({ ...prev, lastCommand: command }));
    }, []);

    const handleSignDetection = useCallback((recognition) => {
        const currentSign = recognition?.sign;
        const confidence = recognition?.confidence || 0;

        if (currentSign && confidence >= CONFIDENCE_THRESHOLD) {
            if (currentSign === lastNoteRef.current) {
                frameCountRef.current++;
                if (frameCountRef.current >= HOLD_FRAMES) {
                    // Play note in current octave
                    audioPlayer.playNote(currentSign, compositionManagerRef.current.currentOctave);
                    
                    // Add to composition if recording
                    if (compositionManagerRef.current.isRecording) {
                        compositionManagerRef.current.addNote(currentSign);
                        setCompositionState(compositionManagerRef.current.getStatus());
                    }
                }
            } else {
                frameCountRef.current = 0;
                lastNoteRef.current = currentSign;
                audioPlayer.stopNote();
            }
        } else {
            frameCountRef.current = 0;
            lastNoteRef.current = null;
            audioPlayer.stopNote();
        }
    }, []);

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

        handsRef.current = new hands.Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        // Single hand tracking for better performance
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

        // Initialize voice commands
        voiceManagerRef.current = new VoiceCommandManager(handleVoiceCommand);
        const voiceStatus = voiceManagerRef.current.getStatus();
        setVoiceState(prev => ({ ...prev, isSupported: voiceStatus.isSupported }));

        return () => {
            if (cameraRef.current) {
                cameraRef.current.stop();
            }
            if (handsRef.current) {
                handsRef.current.close();
            }
            if (voiceManagerRef.current) {
                voiceManagerRef.current.stopListening();
            }
            audioPlayer.stopNote();
            compositionManagerRef.current.stopPlayback();
        };
    }, [onResults, handleVoiceCommand]);

    const toggleVoiceRecognition = () => {
        if (voiceManagerRef.current) {
            const isListening = voiceManagerRef.current.toggle();
            setVoiceState(prev => ({ ...prev, isListening }));
        }
    };

    return (
        <div className="voice-controlled-composer">
            <div className="main-container">
                <div className="camera-container">
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
                        
                        {/* Note indicator */}
                        {detectionState.sign && (
                            <div className={`sign-indicator ${frameCountRef.current >= HOLD_FRAMES ? 'playing' : ''}`}>
                                <h2>{detectionState.sign.toUpperCase()}{compositionState.currentOctave}</h2>
                            </div>
                        )}
                        
                        {/* Recording indicator */}
                        {compositionState.isRecording && (
                            <div className="recording-indicator">
                                <span>● REC</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="control-panel">
                    <div className="voice-controls">
                        <h3>Voice Control</h3>
                        <button 
                            onClick={toggleVoiceRecognition}
                            className={`voice-button ${voiceState.isListening ? 'listening' : ''}`}
                            disabled={!voiceState.isSupported}
                        >
                            {voiceState.isListening ? '🎤 Listening...' : '🎤 Start Voice Control'}
                        </button>
                        {!voiceState.isSupported && (
                            <p className="voice-warning">Voice recognition not supported in this browser</p>
                        )}
                        {voiceState.lastCommand && (
                            <div className="last-command">
                                Last command: {voiceState.lastCommand.replace('_', ' ')}
                            </div>
                        )}
                    </div>

                    <div className="composition-status">
                        <h3>Composition</h3>
                        <div className="status-grid">
                            <div className="status-item">
                                <span>Octave:</span>
                                <span className="value">{compositionState.currentOctave}</span>
                            </div>
                            <div className="status-item">
                                <span>Recording:</span>
                                <span className={`value ${compositionState.isRecording ? 'active' : ''}`}>
                                    {compositionState.isRecording ? 'ON' : 'OFF'}
                                </span>
                            </div>
                            <div className="status-item">
                                <span>Playing:</span>
                                <span className={`value ${compositionState.isPlaying ? 'active' : ''}`}>
                                    {compositionState.isPlaying ? 'ON' : 'OFF'}
                                </span>
                            </div>
                            <div className="status-item">
                                <span>Notes:</span>
                                <span className="value">{compositionState.noteCount}</span>
                            </div>
                        </div>
                    </div>

                    <div className="reference-toggle">
                        <button onClick={() => setShowReference(!showReference)}>
                            {showReference ? 'Hide' : 'Show'} Reference Guide
                        </button>
                    </div>
                </div>
            </div>

            {showReference && <KodalyReference />}
        </div>
    );
}

export default VoiceControlledComposer;
