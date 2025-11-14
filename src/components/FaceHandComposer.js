import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import * as hands from '@mediapipe/hands';
import { recognizeKodalySign } from '../utils/kodalySignsDB';
import { HeadTracker } from '../utils/headTracking';
import { EnhancedCompositionManager } from '../utils/enhancedComposition';
import { DualMediaPipeManager } from '../utils/dualMediaPipe';
import { audioPlayer } from '../utils/audioUtils';
import SimpleSheetMusic from './SimpleSheetMusic';
import './HeadHandComposer.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 10;
const GESTURE_COOLDOWN = 2000; // 2 seconds between gestures

function FaceHandComposer() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const dualManagerRef = useRef(null);
    const headTrackerRef = useRef(new HeadTracker());
    const compositionManagerRef = useRef(new EnhancedCompositionManager());
    
    const [handState, setHandState] = useState({
        sign: null,
        confidence: 0,
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
    const [systemStatus, setSystemStatus] = useState({
        handsLoaded: false,
        faceLoaded: false,
        error: null
    });

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

    const onHandResults = useCallback((results) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Only clear and redraw if we have new hand data
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // Don't clear the whole canvas, just update hand drawings
            setSystemStatus(prev => ({ ...prev, handsLoaded: true }));
            
            for (const landmarks of results.multiHandLandmarks) {
                ctx.save();
                ctx.scale(-1, 1);
                ctx.translate(-canvas.width, 0);
                
                drawConnectors(ctx, landmarks, hands.HAND_CONNECTIONS, {
                    color: '#00FF00',
                    lineWidth: 5
                });
                drawLandmarks(ctx, landmarks, {
                    color: '#FF0000',
                    lineWidth: 2
                });
                
                ctx.restore();

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
    }, [handleSignDetection]);

    const onFaceResults = useCallback((results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            setSystemStatus(prev => ({ ...prev, faceLoaded: true }));
            
            const faceLandmarks = results.multiFaceLandmarks[0];
            
            // Analyze head gestures
            const headGesture = headTrackerRef.current.analyzeGestures(faceLandmarks);
            
            if (headGesture && headGesture.confidence > 0.7) {
                executeHeadGesture(headGesture.gesture);
            }

            // Update face state
            const gazeGesture = headTrackerRef.current.detectGazeDirection(faceLandmarks);
            const expressionGesture = headTrackerRef.current.detectExpression(faceLandmarks);
            
            setFaceState({
                gesture: headGesture?.gesture || null,
                facePresent: true,
                gazeDirection: gazeGesture?.gesture || 'center',
                expression: expressionGesture?.gesture || 'neutral'
            });
        } else {
            setFaceState({
                gesture: null,
                facePresent: false,
                gazeDirection: 'center',
                expression: 'neutral'
            });
        }
    }, [executeHeadGesture]);

    useEffect(() => {
        const initializeSystem = async () => {
            if (!webcamRef.current) return;

            try {
                setSystemStatus(prev => ({ ...prev, error: null }));
                
                dualManagerRef.current = new DualMediaPipeManager(onHandResults, onFaceResults);
                await dualManagerRef.current.initialize(webcamRef.current.video);
                
                console.log('✅ Dual MediaPipe system initialized');
            } catch (error) {
                console.error('❌ Failed to initialize MediaPipe system:', error);
                setSystemStatus(prev => ({ 
                    ...prev, 
                    error: `Initialization failed: ${error.message}` 
                }));
            }
        };

        // Wait for webcam to be ready
        const timer = setTimeout(initializeSystem, 2000);

        return () => {
            clearTimeout(timer);
            if (dualManagerRef.current) {
                dualManagerRef.current.stop();
            }
            compositionManagerRef.current.destroy();
            audioPlayer.stopNote();
        };
    }, [onHandResults, onFaceResults]);

    // Manual drawing of camera feed
    useEffect(() => {
        if (!webcamRef.current) return;

        const drawVideoFrame = () => {
            const canvas = canvasRef.current;
            const video = webcamRef.current.video;
            
            if (canvas && video && video.readyState === 4) {
                const ctx = canvas.getContext('2d');
                ctx.save();
                ctx.scale(-1, 1);
                ctx.translate(-canvas.width, 0);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
            
            requestAnimationFrame(drawVideoFrame);
        };

        const timer = setTimeout(() => {
            requestAnimationFrame(drawVideoFrame);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    const playComposition = () => {
        const sequence = compositionManagerRef.current.getPlaybackSequence();
        if (sequence.length === 0) {
            audioPlayer.playUIFeedback(400, 300);
            return;
        }

        setRecentActions(prev => [...prev.slice(-4), {
            action: 'Playing composition',
            time: new Date().toLocaleTimeString(),
            gesture: 'MANUAL'
        }]);

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
            gesture: 'MANUAL'
        }]);
        audioPlayer.playUIFeedback(400, 300);
    };

    return (
        <div className="head-hand-composer">
            <div className="composer-header">
                <h2>🎵 Face & Hand Music Composer</h2>
                <p>Hand signs for notes • Head gestures for controls • Facial expressions for accidentals</p>
            </div>
            
            {systemStatus.error && (
                <div className="error-panel">
                    <h3>⚠️ System Error</h3>
                    <p>{systemStatus.error}</p>
                    <p>Refresh the page to try again.</p>
                </div>
            )}
            
            <div className="main-container">
                <div className="camera-container">
                    <div className="camera-canvas-container">
                        <Webcam
                            ref={webcamRef}
                            width={640}
                            height={480}
                            mirrored={false}
                            style={{ position: 'absolute', opacity: 0 }}
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
                                {faceState.expression === 'SMILE' ? '😊 Sharp Active' : 
                                 faceState.expression === 'FROWN' ? '😔 Flat Active' : ''}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="control-panel">
                    <div className="status-panel">
                        <h3>🔍 Detection Status</h3>
                        <div className="status-grid">
                            <div className={systemStatus.handsLoaded ? 'status-success' : 'status-waiting'}>
                                Hand Tracking: {systemStatus.handsLoaded ? '✅ Active' : '⏳ Loading...'}
                            </div>
                            <div className={systemStatus.faceLoaded ? 'status-success' : 'status-waiting'}>
                                Face Tracking: {systemStatus.faceLoaded ? '✅ Active' : '⏳ Loading...'}
                            </div>
                            <div>Hand Present: {handState.handPresent ? '✅' : '❌'}</div>
                            <div>Face Present: {faceState.facePresent ? '✅' : '❌'}</div>
                            <div>Current Octave: {compositionState.currentOctave}</div>
                            <div>Notes: {compositionState.noteCount}</div>
                        </div>
                    </div>
                    
                    <div className="gesture-guide">
                        <h3>🤟 Face & Head Controls</h3>
                        <ul>
                            <li>👇 <strong>Nod head</strong> → Add current note</li>
                            <li>↔️ <strong>Shake head</strong> → Undo last note</li>
                            <li>⬅️ <strong>Look left</strong> → Octave down</li>
                            <li>➡️ <strong>Look right</strong> → Octave up</li>
                            <li>😊 <strong>Smile</strong> → Sharp (♯)</li>
                            <li>😔 <strong>Frown</strong> → Flat (♭)</li>
                        </ul>
                        
                        <div className="current-status">
                            <p><strong>Current Expression:</strong> {faceState.expression}</p>
                            <p><strong>Gaze Direction:</strong> {faceState.gazeDirection}</p>
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
                                        <span className="action-gesture">({action.gesture})</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No actions yet - try head gestures!</p>
                        )}
                    </div>
                    
                    <div className="manual-controls">
                        <h3>🎮 Manual Controls</h3>
                        <button onClick={playComposition} className="play-btn">
                            ▶️ Play Composition
                        </button>
                        <button onClick={clearComposition} className="clear-btn">
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
                            
                            setRecentActions(prev => [...prev.slice(-4), {
                                action: 'Exported composition',
                                time: new Date().toLocaleTimeString(),
                                gesture: 'EXPORT'
                            }]);
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
                    <h3>🎼 Your Composition</h3>
                    <div className="summary-stats">
                        <span>📊 {compositionState.noteCount} notes</span>
                        <span>🎵 Octave {compositionState.currentOctave}</span>
                        <span>⏱️ {compositionState.tempo} BPM</span>
                        <span>💾 Auto-saved</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FaceHandComposer;
