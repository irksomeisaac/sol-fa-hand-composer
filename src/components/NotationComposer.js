import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as hands from '@mediapipe/hands';
import * as camera from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { recognizeKodalySign } from '../utils/kodalySignsDB';
import { audioPlayer } from '../utils/audioUtils';
import { MusicComposition, NOTE_DURATIONS, REST_DURATIONS } from '../utils/musicNotation';
import { VoiceCommandManager } from '../utils/voiceCommands';
import SheetMusic from './SheetMusic';
import KodalyReference from './KodalyReference';
import './NotationComposer.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 10;

function NotationComposer() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const compositionRef = useRef(new MusicComposition());
    const voiceManagerRef = useRef(null);
    
    const [detectionState, setDetectionState] = useState({
        sign: null,
        confidence: 0,
        debug: null,
        handPresent: false
    });
    
    const [compositionState, setCompositionState] = useState(
        compositionRef.current.getCompositionInfo()
    );

    const [voiceState, setVoiceState] = useState({
        isListening: false,
        isSupported: false,
        lastCommand: null,
        lastTranscript: null
    });

    const [showReference, setShowReference] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const lastNoteRef = useRef(null);
    const frameCountRef = useRef(0);
    const playbackTimeoutRef = useRef(null);

    // Voice command handler
    const handleVoiceCommand = useCallback((command, transcript) => {
        const composition = compositionRef.current;
        
        switch (command) {
            case 'ADD_NOTE':
                if (detectionState.sign) {
                    composition.addNote(detectionState.sign);
                    audioPlayer.playUIFeedback(1200, 200);
                    setCompositionState(composition.getCompositionInfo());
                } else {
                    audioPlayer.playUIFeedback(400, 300); // Error sound
                }
                break;
                
            case 'ADD_REST':
                composition.addRest();
                audioPlayer.playUIFeedback(800, 200);
                setCompositionState(composition.getCompositionInfo());
                break;
                
            case 'SET_WHOLE_NOTE':
                composition.setNoteDuration(NOTE_DURATIONS.WHOLE);
                audioPlayer.playUIFeedback(1000);
                setCompositionState(composition.getCompositionInfo());
                break;
            case 'SET_HALF_NOTE':
                composition.setNoteDuration(NOTE_DURATIONS.HALF);
                audioPlayer.playUIFeedback(900);
                setCompositionState(composition.getCompositionInfo());
                break;
            case 'SET_QUARTER_NOTE':
                composition.setNoteDuration(NOTE_DURATIONS.QUARTER);
                audioPlayer.playUIFeedback(800);
                setCompositionState(composition.getCompositionInfo());
                break;
            case 'SET_EIGHTH_NOTE':
                composition.setNoteDuration(NOTE_DURATIONS.EIGHTH);
                audioPlayer.playUIFeedback(700);
                setCompositionState(composition.getCompositionInfo());
                break;
                
            case 'OCTAVE_UP':
                composition.octaveUp();
                audioPlayer.playUIFeedback(1200);
                setCompositionState(composition.getCompositionInfo());
                break;
            case 'OCTAVE_DOWN':
                composition.octaveDown();
                audioPlayer.playUIFeedback(600);
                setCompositionState(composition.getCompositionInfo());
                break;
                
            case 'PLAY_COMPOSITION':
                playComposition();
                break;
            case 'STOP_PLAYBACK':
                stopPlayback();
                break;
                
            case 'UNDO':
                composition.undo();
                audioPlayer.playUIFeedback(500);
                setCompositionState(composition.getCompositionInfo());
                break;
            case 'CLEAR_ALL':
                composition.clear();
                audioPlayer.playUIFeedback(400, 300);
                setCompositionState(composition.getCompositionInfo());
                break;
        }
        
        setVoiceState(prev => ({ 
            ...prev, 
            lastCommand: command,
            lastTranscript: transcript 
        }));
    }, [detectionState.sign]);

    const playComposition = useCallback(() => {
        const sequence = compositionRef.current.getPlaybackSequence();
        if (sequence.length === 0) {
            audioPlayer.playUIFeedback(400, 300);
            return;
        }

        setIsPlaying(true);
        audioPlayer.playUIFeedback(1400);

        sequence.forEach(({ note, octave, startTime, duration }) => {
            setTimeout(() => {
                audioPlayer.playNote(note, octave);
                setTimeout(() => {
                    audioPlayer.stopNote();
                }, duration * 0.8);
            }, startTime);
        });

        const totalDuration = Math.max(...sequence.map(item => item.startTime + item.duration));
        playbackTimeoutRef.current = setTimeout(() => {
            setIsPlaying(false);
        }, totalDuration);
    }, []);

    const stopPlayback = useCallback(() => {
        if (playbackTimeoutRef.current) {
            clearTimeout(playbackTimeoutRef.current);
        }
        audioPlayer.stopNote();
        setIsPlaying(false);
    }, []);

    const handleSignDetection = useCallback((recognition) => {
        const currentSign = recognition?.sign;
        const confidence = recognition?.confidence || 0;

        if (currentSign && confidence >= CONFIDENCE_THRESHOLD) {
            if (currentSign === lastNoteRef.current) {
                frameCountRef.current++;
                if (frameCountRef.current >= HOLD_FRAMES) {
                    // Play note for feedback only
                    audioPlayer.playNote(currentSign, compositionRef.current.currentOctave);
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

        // Initialize and automatically start voice commands
        voiceManagerRef.current = new VoiceCommandManager(handleVoiceCommand);
        const voiceStatus = voiceManagerRef.current.getStatus();
        setVoiceState(prev => ({ ...prev, isSupported: voiceStatus.isSupported }));
        
        // Auto-start voice recognition if supported
        if (voiceStatus.isSupported) {
            setTimeout(() => {
                const isListening = voiceManagerRef.current.startListening();
                setVoiceState(prev => ({ ...prev, isListening }));
                console.log('Voice recognition auto-started');
            }, 2000); // 2 second delay to ensure everything is ready
        }

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
            if (playbackTimeoutRef.current) {
                clearTimeout(playbackTimeoutRef.current);
            }
            audioPlayer.stopNote();
        };
    }, [onResults, handleVoiceCommand]);

    return (
        <div className="notation-composer">
            <div className="composer-header">
                <div className="current-note-display">
                    <h2>Current Note: 
                        {detectionState.sign 
                            ? ` ${detectionState.sign.toUpperCase()}${compositionState.currentOctave}`
                            : ' (Hold up hand sign)'
                        }
                    </h2>
                    <p>Say "Add" to place note on staff</p>
                </div>
                
                <div className="voice-status">
                    <div className={`voice-indicator ${voiceState.isListening ? 'listening' : 'inactive'}`}>
                        {voiceState.isSupported ? (
                            voiceState.isListening ? '🎤 Voice Active' : '🎤 Voice Starting...'
                        ) : (
                            '❌ Voice Not Supported'
                        )}
                    </div>
                    {voiceState.lastCommand && (
                        <div className="last-command">
                            "{voiceState.lastTranscript}"
                        </div>
                    )}
                </div>
            </div>

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
                            <h3>{detectionState.sign.toUpperCase()}{compositionState.currentOctave}</h3>
                        </div>
                    )}
                    
                    {isPlaying && (
                        <div className="playback-indicator">
                            ▶️ Playing
                        </div>
                    )}
                </div>
            </div>

            <SheetMusic 
                composition={compositionRef.current} 
                currentNoteDuration={compositionState.currentNoteDuration}
            />

            <div className="controls-footer">
                <button onClick={() => setShowReference(!showReference)}>
                    {showReference ? 'Hide' : 'Show'} Reference Guide
                </button>
                
                <div className="quick-actions">
                    <span>Voice commands: "Add" | "Add rest" | "Octave up" | "Play" | "Undo" | "Clear"</span>
                </div>
            </div>

            {showReference && <KodalyReference />}
        </div>
    );
}

export default NotationComposer;
