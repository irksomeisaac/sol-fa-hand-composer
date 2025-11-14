import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as hands from '@mediapipe/hands';
import * as faceMesh from '@mediapipe/face_mesh';
import * as camera from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { recognizeKodalySign } from '../utils/kodalySignsDB';
import { HeadTracker } from '../utils/headTracking';
import { EnhancedCompositionManager } from '../utils/enhancedComposition';
import { audioPlayer } from '../utils/audioUtils';
import SimpleSheetMusic from './SimpleSheetMusic';
import './HeadHandComposer.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 10;
const GESTURE_COOLDOWN = 1500;

function HeadHandComposer() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const faceRef = useRef(null);
    const cameraRef = useRef(null);
    const headTrackerRef = useRef(new HeadTracker());
    const compositionManagerRef = useRef(new EnhancedCompositionManager());
    
    const [handState, setHandState] = useState({
        sign: null,
        confidence: 0,
        debug: null,
        handPresent: false
    });
    
    const [headState, setHeadState] = useState({
        gesture: null,
        expression: 'neutral',
        gazeDirection: 'center',
        facePresent: false
    });
    
    const [compositionState, setCompositionState] = useState(
        compositionManagerRef.current.getCompositionInfo()
    );

    const [recentActions, setRecentActions] = useState([]);
    const lastGestureTimeRef = useRef(0);
    const lastSignRef = useRef(null);
    const frameCountRef = useRef(0);

    const executeHeadGesture = useCallback((gesture) => {
        const now = Date.now();
        if (now - lastGestureTimeRef.current < GESTURE_COOLDOWN) return;
        
        lastGestureTimeRef.current = now;
        const manager = compositionManagerRef.current;
        let actionTaken = '';

        switch (gesture) {
            case 'NOD':
                if (handState.sign) {
                    const accidental = headState.expression === 'SMILE' ? 'sharp' : 
                                     headState.expression === 'FROWN' ? 'flat' : null;
                    manager.addNote(handState.sign, compositionState.currentOctave, accidental);
                    actionTaken = `Added ${handState.sign.toUpperCase()}${compositionState.currentOctave}${accidental ? (accidental === 'sharp' ? '♯' : '♭') : ''}`;
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

        setHeadState(prev => ({ ...prev, gesture }));
        setTimeout(() => setHeadState(prev => ({ ...prev, gesture: null })), 800);
    }, [handState.sign, headState.expression, compositionState.currentOctave]);

    const handleSignDetection = useCallback((recognition) => {
        const currentSign = recognition?.sign;
        const confidence = recognition?.confidence || 0;

        if (currentSign && confidence >= CONFIDENCE_THRESHOLD) {
            if (currentSign === lastSignRef.current) {
                frameCountRef.current++;
                if (frameCountRef.current >= HOLD_FRAMES) {
                    const accidental = headState.expression === 'SMILE' ? 'sharp' : 
                                     headState.expression === 'FROWN' ? 'flat' : null;
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
    }, [compositionState.currentOctave, headState.expression]);

    const onHandResults = useCallback((results) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // Draw hand landmarks
            const ctx = canvas.getContext('2d');
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
        } else {
            handleSignDetection(null);
            setHandState({
                sign: null,
                confidence: 0,
                debug: null,
                handPresent: false
            });
        }
    }, [handleSignDetection]);

    const onFaceResults = useCallback((results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const faceLandmarks = results.multiFaceLandmarks[0];
            
            // Analyze head gestures
            const headGesture = headTrackerRef.current.analyzeGestures(faceLandmarks);
            
            if (headGesture && headGesture.confidence > 0.7) {
                executeHeadGesture(headGesture.gesture);
            }

            // Update head state with all detected features
            const gazeGesture = headTrackerRef.current.detectGazeDirection(faceLandmarks);
            const expressionGesture = headTrackerRef.current.detectExpression(faceLandmarks);
            
            setHeadState(prev => ({
                ...prev,
                facePresent: true,
                gazeDirection: gazeGesture?.gesture || 'center',
                expression: expressionGesture?.gesture || 'neutral'
            }));
        } else {
            setHeadState(prev => ({
                ...prev,
                facePresent: false,
                gazeDirection: 'center',
                expression: 'neutral'
            }));
        }
    }, [executeHeadGesture]);

    const onCameraFrame = useCallback(async () => {
        if (webcamRef.current && handsRef.current && faceRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            // Clear and prepare canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);

            // Draw camera feed
            if (webcamRef.current.video) {
                ctx.drawImage(webcamRef.current.video, 0, 0, canvas.width, canvas.height);
            }
            
            ctx.restore();

            // Send to both MediaPipe models
            await Promise.all([
                handsRef.current.send({ image: webcamRef.current.video }),
                faceRef.current.send({ image: webcamRef.current.video })
            ]);
        }
    }, []);

    useEffect(() => {
        if (!webcamRef.current) return;

        // Setup Hands
        handsRef.current = new hands.Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        handsRef.current.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });
        handsRef.current.onResults(onHandResults);

        // Setup Face Mesh
        faceRef.current = new faceMesh.FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        faceRef.current.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        faceRef.current.onResults(onFaceResults);

        // Setup camera
        if (webcamRef.current) {
            cameraRef.current = new camera.Camera(webcamRef.current.video, {
                onFrame: onCameraFrame,
                width: 640,
                height: 480
            });
            cameraRef.current.start();
        }

        return () => {
            if (cameraRef.current) cameraRef.current.stop();
            if (handsRef.current) handsRef.current.close();
            if (faceRef.current) faceRef.current.close();
            compositionManagerRef.current.destroy();
            audioPlayer.stopNote();
        };
    }, [onHandResults, onFaceResults, onCameraFrame]);

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

    const clearComposition = () => {
        compositionManagerRef.current.clear();
        setCompositionState(compositionManagerRef.current.getCompositionInfo());
        setRecentActions(prev => [...prev.slice(-4), {
            action: 'Cleared composition',
            time: new Date().toLocaleTimeString(),
            gesture: 'CLEAR'
        }]);
        audioPlayer.playUIFeedback(400, 300);
    };

    return (
        <div className="head-hand-composer">
            <div className="composer-header">
                <h2>🎵 Head & Hand Music Composer</h2>
                <p>Hand signs for notes • Head gestures for controls • Facial expressions for accidentals</p>
            </div>
            
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
                                {headState.expression === 'SMILE' ? '♯' : 
                                 headState.expression === 'FROWN' ? '♭' : ''}
                            </h3>
                        </div>
                    )}
                    
                    {headState.gesture && (
                        <div className="head-gesture-indicator">
                            {headState.gesture === 'NOD' ? '👇 Adding Note' :
                             headState.gesture === 'SHAKE' ? '↔️ Undoing' :
                             headState.gesture === 'LOOK_LEFT' ? '⬅️ Octave Down' :
                             headState.gesture === 'LOOK_RIGHT' ? '➡️ Octave Up' : headState.gesture}
                        </div>
                    )}
                    
                    {headState.expression !== 'neutral' && (
                        <div className="expression-indicator">
                            {headState.expression === 'SMILE' ? '😊 Sharp (♯)' : 
                             headState.expression === 'FROWN' ? '😔 Flat (♭)' : ''}
                        </div>
                    )}
                </div>
                
                <div className="control-panel">
                    <div className="status-panel">
                        <h3>Detection Status</h3>
                        <div className="status-grid">
                            <div>Hand: {handState.handPresent ? '✅ Detected' : '❌ None'}</div>
                            <div>Face: {headState.facePresent ? '✅ Detected' : '❌ None'}</div>
                            <div>Current Octave: {compositionState.currentOctave}</div>
                            <div>Notes Added: {compositionState.noteCount}</div>
                            <div>Tempo: {compositionState.tempo} BPM</div>
                            <div>Can Undo: {compositionState.canUndo ? '✅ Yes' : '❌ No'}</div>
                        </div>
                    </div>
                    
                    <div className="gesture-guide">
                        <h3>🤟 Head Gesture Controls</h3>
                        <ul>
                            <li>👇 <strong>Nod head down</strong> → Add current note</li>
                            <li>↔️ <strong>Shake head side-to-side</strong> → Undo last note</li>
                            <li>⬅️ <strong>Look left</strong> → Octave down</li>
                            <li>➡️ <strong>Look right</strong> → Octave up</li>
                            <li>😊 <strong>Smile</strong> → Add sharp (♯)</li>
                            <li>😔 <strong>Frown</strong> → Add flat (♭)</li>
                        </ul>
                        <div className="current-expression">
                            Current expression: <strong>{headState.expression}</strong>
                        </div>
                    </div>
                    
                    <div className="recent-actions">
                        <h3>Recent Actions</h3>
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
                            <p>No actions yet - try head gestures!</p>
                        )}
                    </div>
                    
                    <div className="manual-controls">
                        <h3>Manual Controls</h3>
                        <button onClick={playComposition}>▶️ Play Composition</button>
                        <button onClick={clearComposition}>🗑️ Clear All</button>
                        <button onClick={() => {
                            const exportData = compositionManagerRef.current.exportComposition();
                            const blob = new Blob([exportData], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `sol-fa-composition-${Date.now()}.json`;
                            a.click();
                        }}>
                            💾 Export Composition
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
                    <h3>📊 Composition Summary</h3>
                    <p>You've created a {compositionState.noteCount}-note composition in various octaves!</p>
                    <p>Last note: {compositionState.lastNote ? 
                        `${compositionState.lastNote.note.toUpperCase()}${compositionState.lastNote.octave}${compositionState.lastNote.accidental ? (compositionState.lastNote.accidental === 'sharp' ? '♯' : '♭') : ''}` : 
                        'None'}</p>
                </div>
            )}
        </div>
    );
}

export default HeadHandComposer;
