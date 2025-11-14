import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as hands from '@mediapipe/hands';
import * as camera from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { recognizeKodalySign } from '../utils/kodalySignsDB';
import { EnhancedCompositionManager } from '../utils/enhancedComposition';
import { audioPlayer } from '../utils/audioUtils';
import SimpleSheetMusic from './SimpleSheetMusic';
import './HeadHandComposer.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 10;
const GESTURE_COOLDOWN = 1500;

function GestureComposer() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const compositionManagerRef = useRef(new EnhancedCompositionManager());
    
    // Track hand position for gesture detection
    const handPositionHistoryRef = useRef([]);
    const lastGestureTimeRef = useRef(0);
    
    const [handState, setHandState] = useState({
        sign: null,
        confidence: 0,
        debug: null,
        handPresent: false
    });
    
    const [gestureState, setGestureState] = useState({
        detectedGesture: null,
        gestureConfidence: 0,
        currentAccidental: null // 'sharp', 'flat', or null
    });
    
    const [compositionState, setCompositionState] = useState(
        compositionManagerRef.current.getCompositionInfo()
    );

    const [recentActions, setRecentActions] = useState([]);
    const [showInstructions, setShowInstructions] = useState(true);

    const lastSignRef = useRef(null);
    const frameCountRef = useRef(0);

    // Detect gestures based on hand movement patterns
    const detectHandGesture = useCallback((landmarks) => {
        if (!landmarks) return null;

        const wrist = landmarks[0];
        const middleTip = landmarks[12];
        const now = Date.now();

        // Add current position to history
        handPositionHistoryRef.current.push({
            wrist: { x: wrist.x, y: wrist.y },
            middle: { x: middleTip.x, y: middleTip.y },
            timestamp: now
        });

        // Keep only last 2 seconds of data
        handPositionHistoryRef.current = handPositionHistoryRef.current.filter(
            pos => now - pos.timestamp < 2000
        );

        if (handPositionHistoryRef.current.length < 15) return null;

        const positions = handPositionHistoryRef.current.slice(-15);
        
        // Detect vertical movement (simulates nod)
        const wristYValues = positions.map(p => p.wrist.y);
        const verticalRange = Math.max(...wristYValues) - Math.min(...wristYValues);
        
        if (verticalRange > 0.12) { // Significant vertical movement
            return { gesture: 'VERTICAL_MOVEMENT', action: 'ADD_NOTE', confidence: 0.9 };
        }

        // Detect horizontal movement (simulates shake)
        const wristXValues = positions.map(p => p.wrist.x);
        const horizontalRange = Math.max(...wristXValues) - Math.min(...wristXValues);
        
        if (horizontalRange > 0.15) { // Significant horizontal movement
            return { gesture: 'HORIZONTAL_MOVEMENT', action: 'UNDO', confidence: 0.9 };
        }

        // Detect sustained left position (octave down)
        const avgX = wristXValues.reduce((sum, x) => sum + x, 0) / wristXValues.length;
        if (avgX < 0.25) {
            return { gesture: 'LEFT_POSITION', action: 'OCTAVE_DOWN', confidence: 0.8 };
        }

        // Detect sustained right position (octave up)
        if (avgX > 0.75) {
            return { gesture: 'RIGHT_POSITION', action: 'OCTAVE_UP', confidence: 0.8 };
        }

        return null;
    }, []);

    const executeGestureAction = useCallback((action, gesture) => {
        const now = Date.now();
        if (now - lastGestureTimeRef.current < GESTURE_COOLDOWN) return;
        
        lastGestureTimeRef.current = now;
        const manager = compositionManagerRef.current;
        let actionTaken = '';

        switch (action) {
            case 'ADD_NOTE':
                if (handState.sign) {
                    manager.addNote(handState.sign, compositionState.currentOctave, gestureState.currentAccidental);
                    const accidentalText = gestureState.currentAccidental === 'sharp' ? '♯' : 
                                         gestureState.currentAccidental === 'flat' ? '♭' : '';
                    actionTaken = `Added ${handState.sign.toUpperCase()}${compositionState.currentOctave}${accidentalText}`;
                    audioPlayer.playUIFeedback(1200, 200);
                    // Reset accidental after use
                    setGestureState(prev => ({ ...prev, currentAccidental: null }));
                } else {
                    actionTaken = 'No note to add';
                    audioPlayer.playUIFeedback(400, 200);
                }
                break;
                
            case 'UNDO':
                if (manager.undo()) {
                    actionTaken = 'Undid last note';
                    audioPlayer.playUIFeedback(800, 200);
                } else {
                    actionTaken = 'Nothing to undo';
                    audioPlayer.playUIFeedback(400, 200);
                }
                break;
                
            case 'OCTAVE_DOWN':
                const newOctaveDown = manager.octaveDown();
                actionTaken = `Octave down to ${newOctaveDown}`;
                audioPlayer.playUIFeedback(600);
                break;
                
            case 'OCTAVE_UP':
                const newOctaveUp = manager.octaveUp();
                actionTaken = `Octave up to ${newOctaveUp}`;
                audioPlayer.playUIFeedback(1000);
                break;
        }

        if (actionTaken) {
            setRecentActions(prev => [...prev.slice(-4), {
                action: actionTaken,
                time: new Date().toLocaleTimeString(),
                gesture: gesture
            }]);
            
            setCompositionState(manager.getCompositionInfo());
        }

        setGestureState(prev => ({ 
            ...prev, 
            detectedGesture: gesture,
            gestureConfidence: 0.9
        }));
        
        setTimeout(() => {
            setGestureState(prev => ({ ...prev, detectedGesture: null }));
        }, 800);
    }, [handState.sign, gestureState.currentAccidental, compositionState.currentOctave]);

    // Keyboard controls for testing
    useEffect(() => {
        const handleKeyPress = (event) => {
            switch(event.key.toLowerCase()) {
                case 'n': // Simulate nod
                    executeGestureAction('ADD_NOTE', 'NOD_GESTURE');
                    break;
                case 's': // Simulate shake
                    executeGestureAction('UNDO', 'SHAKE_GESTURE');
                    break;
                case 'arrowleft':
                    executeGestureAction('OCTAVE_DOWN', 'LOOK_LEFT');
                    break;
                case 'arrowright':
                    executeGestureAction('OCTAVE_UP', 'LOOK_RIGHT');
                    break;
                case '=': // Sharp
                    setGestureState(prev => ({ ...prev, currentAccidental: 'sharp' }));
                    audioPlayer.playUIFeedback(1100, 100);
                    break;
                case '-': // Flat
                    setGestureState(prev => ({ ...prev, currentAccidental: 'flat' }));
                    audioPlayer.playUIFeedback(900, 100);
                    break;
                case 'escape': // Clear accidental
                    setGestureState(prev => ({ ...prev, currentAccidental: null }));
                    audioPlayer.playUIFeedback(500, 100);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [executeGestureAction]);

    const handleSignDetection = useCallback((recognition) => {
        const currentSign = recognition?.sign;
        const confidence = recognition?.confidence || 0;

        if (currentSign && confidence >= CONFIDENCE_THRESHOLD) {
            if (currentSign === lastSignRef.current) {
                frameCountRef.current++;
                if (frameCountRef.current >= HOLD_FRAMES) {
                    audioPlayer.playNote(currentSign, compositionState.currentOctave, gestureState.currentAccidental);
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
    }, [compositionState.currentOctave, gestureState.currentAccidental]);

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

                // Detect movement gestures
                const gestureDetection = detectHandGesture(mirroredLandmarks);
                if (gestureDetection && gestureDetection.confidence > 0.8) {
                    executeGestureAction(gestureDetection.action, gestureDetection.gesture);
                }
            }
        } else {
            handleSignDetection(null);
            setHandState({
                sign: null,
                confidence: 0,
                debug: null,
                handPresent: false
            });
        }

        ctx.restore();
    }, [handleSignDetection, detectHandGesture, executeGestureAction]);

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
            compositionManagerRef.current.destroy();
            audioPlayer.stopNote();
        };
    }, [onResults]);

    const playComposition = () => {
        const sequence = compositionManagerRef.current.getPlaybackSequence();
        if (sequence.length === 0) {
            audioPlayer.playUIFeedback(400, 300);
            return;
        }

        sequence.forEach(({ note, octave, accidental, startTime, duration }) => {
            setTimeout(() => {
                audioPlayer.playNote(note, octave, accidental);
                setTimeout(() => audioPlayer.stopNote(), duration);
            }, startTime);
        });
    };

    return (
        <div className="head-hand-composer">
            <div className="composer-header">
                <h2>🎵 Enhanced Gesture Music Composer</h2>
                <p>Hand signs for notes • Hand movements & keyboard for controls</p>
            </div>
            
            {showInstructions && (
                <div className="instructions-panel">
                    <div className="instructions-content">
                        <h3>🎯 How to Use</h3>
                        <div className="instruction-grid">
                            <div className="instruction-section">
                                <h4>🤟 Hand Signs (Right Hand)</h4>
                                <ul>
                                    <li>Make Kodály signs: Do, Re, Mi, Fa, Sol, La, Ti</li>
                                    <li>Hold steady to hear the note</li>
                                </ul>
                            </div>
                            
                            <div className="instruction-section">
                                <h4>⌨️ Controls (Keyboard)</h4>
                                <ul>
                                    <li><strong>N</strong> - Add current note to composition</li>
                                    <li><strong>S</strong> - Undo last note</li>
                                    <li><strong>← →</strong> - Change octave</li>
                                    <li><strong>= -</strong> - Add sharp/flat</li>
                                    <li><strong>ESC</strong> - Clear sharp/flat</li>
                                </ul>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setShowInstructions(false)}
                            className="close-instructions"
                        >
                            Got it! Start composing 🎵
                        </button>
                    </div>
                </div>
            )}
            
            <div className="main-container">
                <div className="camera-container">
                    <canvas
                        ref={canvasRef}
                        width={640}
                        height={480}
                    />
                    <Webcam
                        ref={webcamRef}
                        style={{ display: 'none' }}
                        width={640}
                        height={480}
                        mirrored={false}
                    />
                    
                    {handState.sign && (
                        <div className="sign-indicator">
                            <h3>{handState.sign.toUpperCase()}{compositionState.currentOctave}
                                {gestureState.currentAccidental === 'sharp' ? '♯' : 
                                 gestureState.currentAccidental === 'flat' ? '♭' : ''}
                            </h3>
                        </div>
                    )}
                    
                    {gestureState.detectedGesture && (
                        <div className="gesture-feedback">
                            {gestureState.detectedGesture === 'NOD_GESTURE' ? '✅ Note Added!' :
                             gestureState.detectedGesture === 'SHAKE_GESTURE' ? '↩️ Undone!' :
                             gestureState.detectedGesture === 'LOOK_LEFT' ? '⬅️ Octave Down!' :
                             gestureState.detectedGesture === 'LOOK_RIGHT' ? '➡️ Octave Up!' : 
                             gestureState.detectedGesture}
                        </div>
                    )}
                    
                    {gestureState.currentAccidental && (
                        <div className="accidental-indicator">
                            {gestureState.currentAccidental === 'sharp' ? '♯ Sharp Active' : '♭ Flat Active'}
                        </div>
                    )}
                </div>
                
                <div className="control-panel">
                    <div className="status-panel">
                        <h3>📊 Status</h3>
                        <div className="status-grid">
                            <div>Hand: {handState.handPresent ? '✅ Detected' : '❌ None'}</div>
                            <div>Current Note: {handState.sign ? handState.sign.toUpperCase() : 'None'}</div>
                            <div>Octave: {compositionState.currentOctave}</div>
                            <div>Accidental: {gestureState.currentAccidental || 'None'}</div>
                            <div>Notes: {compositionState.noteCount}</div>
                            <div>Can Undo: {compositionState.canUndo ? '✅' : '❌'}</div>
                        </div>
                    </div>
                    
                    <div className="recent-actions">
                        <h3>📝 Recent Actions</h3>
                        {recentActions.length > 0 ? (
                            <div className="actions-list">
                                {recentActions.slice(-5).map((action, index) => (
                                    <div key={index} className="action-item">
                                        <span className="action-time">{action.time}</span>
                                        <span className="action-text">{action.action}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No actions yet - make a hand sign and press N to add a note!</p>
                        )}
                    </div>
                    
                    <div className="manual-controls">
                        <h3>🎮 Manual Controls</h3>
                        <button onClick={playComposition}>▶️ Play Composition</button>
                        <button onClick={() => {
                            compositionManagerRef.current.clear();
                            setCompositionState(compositionManagerRef.current.getCompositionInfo());
                        }}>🗑️ Clear All</button>
                        <button onClick={() => setShowInstructions(true)}>❓ Show Instructions</button>
                        <button onClick={() => {
                            const exportData = compositionManagerRef.current.exportComposition();
                            const blob = new Blob([exportData], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `sol-fa-composition-${Date.now()}.json`;
                            a.click();
                        }}>
                            💾 Export
                        </button>
                    </div>
                </div>
            </div>
            
            <SimpleSheetMusic 
                notes={compositionState.notes} 
                currentOctave={compositionState.currentOctave}
                tempo={compositionState.tempo}
            />
        </div>
    );
}

export default GestureComposer;
