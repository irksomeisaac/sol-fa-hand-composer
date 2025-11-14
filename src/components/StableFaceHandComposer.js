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
const GESTURE_COOLDOWN = 2000;

function StableFaceHandComposer() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const compositionManagerRef = useRef(new EnhancedCompositionManager());
    
    // Face tracking using simple computer vision
    const facePositionRef = useRef({ x: 0.5, y: 0.5, history: [] });
    const lastGestureTimeRef = useRef(0);
    
    const [handState, setHandState] = useState({
        sign: null,
        confidence: 0,
        debug: null,
        handPresent: false
    });
    
    const [faceState, setFaceState] = useState({
        gesture: null,
        expression: 'neutral',
        gazeDirection: 'center',
        facePresent: false
    });
    
    const [compositionState, setCompositionState] = useState(
        compositionManagerRef.current.getCompositionInfo()
    );

    const [recentActions, setRecentActions] = useState([]);
    const lastSignRef = useRef(null);
    const frameCountRef = useRef(0);

    // Simple face tracking using hand position as face proxy
    const detectFaceGesture = useCallback((handLandmarks) => {
        if (!handLandmarks) return null;

        const now = Date.now();
        const wrist = handLandmarks[0]; // Use wrist as face position proxy

        // Add to face position history
        facePositionRef.current.history.push({
            x: wrist.x,
            y: wrist.y,
            timestamp: now
        });

        // Keep last 2 seconds of data
        facePositionRef.current.history = facePositionRef.current.history.filter(
            pos => now - pos.timestamp < 2000
        );

        if (facePositionRef.current.history.length < 20) return null;

        const positions = facePositionRef.current.history.slice(-20);
        
        // Detect nod (vertical movement)
        const yValues = positions.map(p => p.y);
        const yRange = Math.max(...yValues) - Math.min(...yValues);
        
        if (yRange > 0.15) {
            return { gesture: 'NOD', confidence: 0.9 };
        }

        // Detect shake (horizontal movement)
        const xValues = positions.map(p => p.x);
        const xRange = Math.max(...xValues) - Math.min(...xValues);
        
        if (xRange > 0.2) {
            return { gesture: 'SHAKE', confidence: 0.9 };
        }

        // Detect sustained gaze direction
        const avgX = xValues.reduce((sum, x) => sum + x, 0) / xValues.length;
        
        if (avgX < 0.25) {
            return { gesture: 'LOOK_LEFT', confidence: 0.8 };
        } else if (avgX > 0.75) {
            return { gesture: 'LOOK_RIGHT', confidence: 0.8 };
        }

        return null;
    }, []);

    const executeHeadGesture = useCallback((gesture) => {
        const now = Date.now();
        if (now - lastGestureTimeRef.current < GESTURE_COOLDOWN) return;
        
        lastGestureTimeRef.current = now;
        const manager = compositionManagerRef.current;
        let actionTaken = '';

        switch (gesture) {
            case 'NOD':
                if (handState.sign) {
                    const accidental = faceState.expression === 'SMILE' ? 'sharp' : 
                                     faceState.expression === 'FROWN' ? 'flat' : null;
                    manager.addNote(handState.sign, compositionState.currentOctave, accidental);
                    const accidentalText = accidental === 'sharp' ? '♯' : 
                                         accidental === 'flat' ? '♭' : '';
                    actionTaken = `Added ${handState.sign.toUpperCase()}${compositionState.currentOctave}${accidentalText}`;
                    audioPlayer.playUIFeedback(1200, 200);
                } else {
                    actionTaken = 'No note to add';
                    audioPlayer.playUIFeedback(400, 200);
                }
                break;
                
            case 'SHAKE':
                if (manager.undo()) {
                    actionTaken = 'Undid last note';
                    audioPlayer.playUIFeedback(800, 200);
                } else {
                    actionTaken = 'Nothing to undo';
                    audioPlayer.playUIFeedback(400, 200);
                }
                break;
                
            case 'LOOK_LEFT':
                const newOctaveDown = manager.octaveDown();
                actionTaken = `Octave down to ${newOctaveDown}`;
                audioPlayer.playUIFeedback(600);
                break;
                
            case 'LOOK_RIGHT':
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

        setFaceState(prev => ({ ...prev, gesture }));
        setTimeout(() => {
            setFaceState(prev => ({ ...prev, gesture: null }));
        }, 1000);
    }, [handState.sign, faceState.expression, compositionState.currentOctave]);

    // Keyboard shortcuts for face gestures (reliable fallback)
    useEffect(() => {
        const handleKeyPress = (event) => {
            switch(event.key.toLowerCase()) {
                case 'n': // Nod
                    executeHeadGesture('NOD');
                    break;
                case 's': // Shake
                    executeHeadGesture('SHAKE');
                    break;
                case 'arrowleft': // Look left
                    executeHeadGesture('LOOK_LEFT');
                    break;
                case 'arrowright': // Look right
                    executeHeadGesture('LOOK_RIGHT');
                    break;
                case '=': // Smile (sharp)
                    setFaceState(prev => ({ ...prev, expression: 'SMILE' }));
                    audioPlayer.playUIFeedback(1100, 100);
                    setTimeout(() => setFaceState(prev => ({ ...prev, expression: 'neutral' })), 2000);
                    break;
                case '-': // Frown (flat)
                    setFaceState(prev => ({ ...prev, expression: 'FROWN' }));
                    audioPlayer.playUIFeedback(900, 100);
                    setTimeout(() => setFaceState(prev => ({ ...prev, expression: 'neutral' })), 2000);
                    break;
                case 'escape': // Clear expression
                    setFaceState(prev => ({ ...prev, expression: 'neutral' }));
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [executeHeadGesture]);

    const handleSignDetection = useCallback((recognition) => {
        const currentSign = recognition?.sign;
        const confidence = recognition?.confidence || 0;

        if (currentSign && confidence >= CONFIDENCE_THRESHOLD) {
            if (currentSign === lastSignRef.current) {
                frameCountRef.current++;
                if (frameCountRef.current >= HOLD_FRAMES) {
                    const accidental = faceState.expression === 'SMILE' ? 'sharp' : 
                                     faceState.expression === 'FROWN' ? 'flat' : null;
                    audioPlayer.playNote(currentSign, compositionState.currentOctave, accidental);
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
    }, [compositionState.currentOctave, faceState.expression]);

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

                // Use hand movement as face gesture proxy
                const faceGesture = detectFaceGesture(mirroredLandmarks);
                if (faceGesture && faceGesture.confidence > 0.8) {
                    executeHeadGesture(faceGesture.gesture);
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
    }, [handleSignDetection, detectFaceGesture, executeHeadGesture]);

    useEffect(() => {
        if (!webcamRef.current) return;

        // Use only hands MediaPipe to avoid conflicts
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
                <h2>🎵 Enhanced Music Composer</h2>
                <p>Hand signs for notes • Keyboard for head gesture simulation</p>
            </div>
            
            <div className="instructions-banner">
                <h3>🎯 Controls (Keyboard simulates head gestures)</h3>
                <div className="controls-grid">
                    <span><strong>N</strong> = Nod (Add note)</span>
                    <span><strong>S</strong> = Shake (Undo)</span>
                    <span><strong>←</strong> = Look left (Octave down)</span>
                    <span><strong>→</strong> = Look right (Octave up)</span>
                    <span><strong>=</strong> = Smile (Sharp ♯)</span>
                    <span><strong>-</strong> = Frown (Flat ♭)</span>
                </div>
            </div>
            
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
                        
                        {handState.sign && (
                            <div className="sign-indicator">
                                <h3>{handState.sign.toUpperCase()}{compositionState.currentOctave}
                                    {faceState.expression === 'SMILE' ? '♯' : 
                                     faceState.expression === 'FROWN' ? '♭' : ''}
                                </h3>
                            </div>
                        )}
                        
                        {faceState.gesture && (
                            <div className="head-gesture-indicator">
                                {faceState.gesture === 'NOD' ? '👇 Adding Note' :
                                 faceState.gesture === 'SHAKE' ? '↔️ Undoing' :
                                 faceState.gesture === 'LOOK_LEFT' ? '⬅️ Octave Down' :
                                 faceState.gesture === 'LOOK_RIGHT' ? '➡️ Octave Up' : faceState.gesture}
                            </div>
                        )}
                        
                        {faceState.expression !== 'neutral' && (
                            <div className="expression-indicator">
                                {faceState.expression === 'SMILE' ? '😊 Sharp (♯)' : 
                                 faceState.expression === 'FROWN' ? '😔 Flat (♭)' : ''}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="control-panel">
                    <div className="status-panel">
                        <h3>📊 Status</h3>
                        <div className="status-grid">
                            <div>Hand: {handState.handPresent ? '✅ Detected' : '❌ None'}</div>
                            <div>Current Note: {handState.sign ? handState.sign.toUpperCase() : 'None'}</div>
                            <div>Octave: {compositionState.currentOctave}</div>
                            <div>Expression: {faceState.expression}</div>
                            <div>Notes: {compositionState.noteCount}</div>
                            <div>Can Undo: {compositionState.canUndo ? '✅' : '❌'}</div>
                        </div>
                    </div>
                    
                    <div className="recent-actions">
                        <h3>📝 Recent Actions</h3>
                        {recentActions.length > 0 ? (
                            <div className="actions-list">
                                {recentActions.slice(-6).map((action, index) => (
                                    <div key={index} className="action-item">
                                        <span className="action-time">{action.time}</span>
                                        <span className="action-text">{action.action}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No actions yet - make a hand sign and press N!</p>
                        )}
                    </div>
                    
                    <div className="manual-controls">
                        <h3>🎮 Quick Actions</h3>
                        <button onClick={playComposition} className="play-btn">
                            ▶️ Play Composition
                        </button>
                        <button onClick={() => {
                            compositionManagerRef.current.clear();
                            setCompositionState(compositionManagerRef.current.getCompositionInfo());
                            setRecentActions(prev => [...prev.slice(-4), {
                                action: 'Cleared composition',
                                time: new Date().toLocaleTimeString(),
                                gesture: 'MANUAL'
                            }]);
                        }} className="clear-btn">
                            🗑️ Clear All
                        </button>
                        <button onClick={() => {
                            const exportData = compositionManagerRef.current.exportComposition();
                            const blob = new Blob([exportData], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `sol-fa-composition-${Date.now()}.json`;
                            a.click();
                        }} className="export-btn">
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
            
            {compositionState.noteCount > 0 && (
                <div className="composition-summary">
                    <h3>🎼 Your Musical Creation</h3>
                    <div className="summary-stats">
                        <span>📊 {compositionState.noteCount} notes</span>
                        <span>🎵 Octave {compositionState.currentOctave}</span>
                        <span>⏱️ {compositionState.tempo} BPM</span>
                        <span>💾 Auto-saved</span>
                        {compositionState.lastNote && (
                            <span>🎶 Last: {compositionState.lastNote.note.toUpperCase()}{compositionState.lastNote.octave}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default StableFaceHandComposer;
