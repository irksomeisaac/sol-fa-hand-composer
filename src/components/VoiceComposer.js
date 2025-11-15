import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as hands from '@mediapipe/hands';
import * as camera from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { recognizeKodalySign } from '../utils/kodalySignsDB';
import { audioPlayer } from '../utils/audioUtils';
import './VoiceComposer.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 10;

function VoiceComposer() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const voiceRef = useRef(null);
    
    const [handState, setHandState] = useState({
        sign: null,
        confidence: 0,
        handPresent: false
    });
    
    const [composition, setComposition] = useState({
        notes: [],
        currentOctave: 4,
        currentAccidental: null
    });

    const [voiceState, setVoiceState] = useState({
        isActive: false,
        currentSpeech: '',
        lastCommand: null,
        isSupported: 'webkitSpeechRecognition' in window,
        needsActivation: true
    });

    const lastSignRef = useRef(null);
    const frameCountRef = useRef(0);
    const isVoiceRunningRef = useRef(false);

    const handleVoiceCommand = useCallback((command) => {
        console.log('Processing voice command:', command);
        
        setVoiceState(prev => ({ ...prev, lastCommand: command }));

        if (command.includes('add') && handState.sign) {
            const newNote = {
                note: handState.sign,
                octave: composition.currentOctave,
                accidental: composition.currentAccidental,
                timestamp: Date.now()
            };
            setComposition(prev => ({
                ...prev,
                notes: [...prev.notes, newNote],
                currentAccidental: null
            }));
            audioPlayer.playUIFeedback(1200, 200);
        }
        else if (command.includes('sharp')) {
            setComposition(prev => ({ ...prev, currentAccidental: 'sharp' }));
            audioPlayer.playUIFeedback(1100, 100);
        }
        else if (command.includes('flat')) {
            setComposition(prev => ({ ...prev, currentAccidental: 'flat' }));
            audioPlayer.playUIFeedback(900, 100);
        }
        else if (command.includes('natural')) {
            setComposition(prev => ({ ...prev, currentAccidental: null }));
            audioPlayer.playUIFeedback(800, 100);
        }
        else if (command.includes('octave up') || command.includes('higher')) {
            setComposition(prev => ({
                ...prev,
                currentOctave: Math.min(prev.currentOctave + 1, 7)
            }));
            audioPlayer.playUIFeedback(1000);
        }
        else if (command.includes('octave down') || command.includes('lower')) {
            setComposition(prev => ({
                ...prev,
                currentOctave: Math.max(prev.currentOctave - 1, 2)
            }));
            audioPlayer.playUIFeedback(600);
        }
        else if (command.includes('undo')) {
            setComposition(prev => ({
                ...prev,
                notes: prev.notes.slice(0, -1)
            }));
            audioPlayer.playUIFeedback(500);
        }
        else if (command.includes('clear')) {
            setComposition(prev => ({ ...prev, notes: [], currentAccidental: null }));
            audioPlayer.playUIFeedback(400, 300);
        }
        else if (command.includes('play')) {
            playComposition();
        }

        // Clear speech display and command after processing
        setTimeout(() => {
            setVoiceState(prev => ({ 
                ...prev, 
                currentSpeech: '', 
                lastCommand: null 
            }));
        }, 2000);
    }, [handState.sign, composition.currentOctave, composition.currentAccidental]);

    const activateVoice = () => {
        if (!voiceState.isSupported || isVoiceRunningRef.current) return;

        const recognition = new window.webkitSpeechRecognition();
        voiceRef.current = recognition;
        isVoiceRunningRef.current = true;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setVoiceState(prev => ({ 
                ...prev, 
                isActive: true,
                needsActivation: false
            }));
            console.log('✅ Voice recognition activated - always listening now');
        };

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
            if (event.error === 'not-allowed') {
                setVoiceState(prev => ({ 
                    ...prev, 
                    isActive: false,
                    needsActivation: true
                }));
                isVoiceRunningRef.current = false;
            }
        };

        recognition.onend = () => {
            // Silently restart without UI changes to prevent flickering
            if (isVoiceRunningRef.current) {
                setTimeout(() => {
                    try { 
                        recognition.start(); 
                    } catch (e) {
                        console.log('Silent restart failed');
                    }
                }, 1000);
            }
        };

        try {
            recognition.start();
        } catch (error) {
            console.error('Voice activation failed:', error);
            isVoiceRunningRef.current = false;
        }
    };

    const playComposition = () => {
        if (composition.notes.length === 0) {
            audioPlayer.playUIFeedback(400, 300);
            return;
        }

        composition.notes.forEach((noteItem, index) => {
            setTimeout(() => {
                audioPlayer.playNote(noteItem.note, noteItem.octave, noteItem.accidental);
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
                    audioPlayer.playNote(currentSign, composition.currentOctave, composition.currentAccidental);
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
    }, [composition.currentOctave, composition.currentAccidental]);

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
                setHandState({
                    ...recognition,
                    handPresent: true
                });
            }
        } else {
            handleSignDetection(null);
            setHandState({
                sign: null,
                confidence: 0,
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

        return () => {
            isVoiceRunningRef.current = false;
            if (cameraRef.current) {
                cameraRef.current.stop();
            }
            if (handsRef.current) {
                handsRef.current.close();
            }
            if (voiceRef.current) {
                try {
                    voiceRef.current.stop();
                } catch (e) {}
            }
            audioPlayer.stopNote();
        };
    }, [onResults]);

    return (
        <div className="voice-composer">
            <div className="composer-header">
                <h1>🎵 Voice-Controlled Sol-fa Composer</h1>
                <p>Hold up Kodály hand signs, speak commands to compose music</p>
            </div>

            <div className="main-interface">
                <div className="camera-section">
                    <div className="camera-container">
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
                        
                        {/* Current note display */}
                        {handState.sign && (
                            <div className="current-note">
                                <h2>{handState.sign.toUpperCase()}{composition.currentOctave}
                                    {composition.currentAccidental === 'sharp' ? '♯' : 
                                     composition.currentAccidental === 'flat' ? '♭' : ''}
                                </h2>
                                <p>Say "Add" to place on staff</p>
                            </div>
                        )}
                        
                        {/* Voice speech bubble */}
                        {voiceState.currentSpeech && (
                            <div className="speech-bubble">
                                "{voiceState.currentSpeech}"
                            </div>
                        )}
                        
                        {/* Voice activation - one-time only */}
                        {voiceState.needsActivation ? (
                            <div className="voice-activation">
                                <button 
                                    onClick={activateVoice}
                                    className="activate-voice-btn"
                                    disabled={!voiceState.isSupported}
                                >
                                    🎤 Activate Voice Control (One Time)
                                </button>
                                {!voiceState.isSupported && (
                                    <p className="voice-warning">
                                        Voice not supported. Please use Chrome or Edge.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="voice-status">
                                <div className={`voice-indicator ${voiceState.isActive ? 'active' : 'inactive'}`}>
                                    {voiceState.isActive ? '🎤 Voice Active' : '🎤 Voice Ready'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="control-panel">
                    <div className="voice-commands">
                        <h3>🎤 Voice Commands</h3>
                        <div className="command-list">
                            <div className="command-group">
                                <h4>Note Control:</h4>
                                <ul>
                                    <li><strong>"Add"</strong> - Add current note</li>
                                    <li><strong>"Sharp"</strong> - Next note will be sharp ♯</li>
                                    <li><strong>"Flat"</strong> - Next note will be flat ♭</li>
                                    <li><strong>"Natural"</strong> - Clear sharp/flat</li>
                                </ul>
                            </div>
                            
                            <div className="command-group">
                                <h4>Composition:</h4>
                                <ul>
                                    <li><strong>"Undo"</strong> - Remove last note</li>
                                    <li><strong>"Clear"</strong> - Clear all notes</li>
                                    <li><strong>"Play"</strong> - Play composition</li>
                                </ul>
                            </div>
                            
                            <div className="command-group">
                                <h4>Octave Control:</h4>
                                <ul>
                                    <li><strong>"Octave up"</strong> or <strong>"Higher"</strong></li>
                                    <li><strong>"Octave down"</strong> or <strong>"Lower"</strong></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="composition-status">
                        <h3>📊 Status</h3>
                        <div className="status-grid">
                            <div>Voice: {voiceState.isActive ? '✅ Active' : '❌ Inactive'}</div>
                            <div>Hand: {handState.handPresent ? '✅ Detected' : '❌ None'}</div>
                            <div>Current Note: {handState.sign ? handState.sign.toUpperCase() : 'None'}</div>
                            <div>Octave: {composition.currentOctave}</div>
                            <div>Accidental: {composition.currentAccidental || 'Natural'}</div>
                            <div>Notes: {composition.notes.length}</div>
                        </div>
                    </div>

                    {voiceState.lastCommand && (
                        <div className="last-command">
                            ✓ "{voiceState.lastCommand}"
                        </div>
                    )}
                </div>
            </div>

            {/* Simple sheet music display */}
            <div className="sheet-music-section">
                <h3>🎼 Your Composition</h3>
                {composition.notes.length > 0 ? (
                    <div className="notes-display">
                        {composition.notes.map((note, index) => (
                            <span key={index} className="note-chip">
                                {note.note.toUpperCase()}{note.octave}
                                {note.accidental === 'sharp' ? '♯' : note.accidental === 'flat' ? '♭' : ''}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p>No notes yet - hold up a hand sign and say "Add"!</p>
                )}
                
                {composition.notes.length > 0 && (
                    <div className="quick-actions">
                        <button onClick={playComposition} className="play-button">
                            ▶️ Play Composition
                        </button>
                        <button onClick={() => {
                            setComposition(prev => ({ ...prev, notes: [] }));
                            audioPlayer.playUIFeedback(400, 300);
                        }} className="clear-button">
                            🗑️ Clear All
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VoiceComposer;
