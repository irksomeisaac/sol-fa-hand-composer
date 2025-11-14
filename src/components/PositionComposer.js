import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as hands from '@mediapipe/hands';
import * as camera from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { recognizeKodalySign } from '../utils/kodalySignsDB';
import { PositionGestureManager } from '../utils/positionGestures';
import { audioPlayer } from '../utils/audioUtils';
import SimpleSheetMusic from './SimpleSheetMusic';
import './PositionComposer.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 10;

function PositionComposer() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const gestureManagerRef = useRef(new PositionGestureManager());
    
    const [handState, setHandState] = useState({
        sign: null,
        confidence: 0,
        debug: null,
        handPresent: false,
        isFlatHand: false
    });
    
    const [positionState, setPositionState] = useState({
        currentZone: null,
        progress: 0,
        action: null,
        triggered: false
    });
    
    const [composition, setComposition] = useState({
        notes: [],
        currentOctave: 4
    });

    const [recentActions, setRecentActions] = useState([]);

    const lastSignRef = useRef(null);
    const frameCountRef = useRef(0);

    const executeAction = useCallback((actionType, position) => {
        let actionTaken = '';
        
        switch (actionType) {
            case 'ADD_NOTE':
                if (handState.sign) {
                    const newNote = {
                        note: handState.sign,
                        octave: composition.currentOctave,
                        timestamp: Date.now()
                    };
                    setComposition(prev => ({
                        ...prev,
                        notes: [...prev.notes, newNote]
                    }));
                    actionTaken = `Added ${handState.sign.toUpperCase()}${composition.currentOctave}`;
                    audioPlayer.playUIFeedback(1200, 200);
                }
                break;
                
            case 'ADD_SHARP':
                if (handState.sign) {
                    const newNote = {
                        note: handState.sign,
                        octave: composition.currentOctave,
                        accidental: 'sharp',
                        timestamp: Date.now()
                    };
                    setComposition(prev => ({
                        ...prev,
                        notes: [...prev.notes, newNote]
                    }));
                    actionTaken = `Added ${handState.sign.toUpperCase()}${composition.currentOctave}♯`;
                    audioPlayer.playUIFeedback(1400, 200);
                }
                break;
                
            case 'ADD_FLAT':
                if (handState.sign) {
                    const newNote = {
                        note: handState.sign,
                        octave: composition.currentOctave,
                        accidental: 'flat',
                        timestamp: Date.now()
                    };
                    setComposition(prev => ({
                        ...prev,
                        notes: [...prev.notes, newNote]
                    }));
                    actionTaken = `Added ${handState.sign.toUpperCase()}${composition.currentOctave}♭`;
                    audioPlayer.playUIFeedback(1000, 200);
                }
                break;
                
            case 'OCTAVE_UP':
                setComposition(prev => ({
                    ...prev,
                    currentOctave: Math.min(prev.currentOctave + 1, 7)
                }));
                actionTaken = `Octave up to ${Math.min(composition.currentOctave + 1, 7)}`;
                audioPlayer.playUIFeedback(1300);
                break;
                
            case 'OCTAVE_DOWN':
                setComposition(prev => ({
                    ...prev,
                    currentOctave: Math.max(prev.currentOctave - 1, 2)
                }));
                actionTaken = `Octave down to ${Math.max(composition.currentOctave - 1, 2)}`;
                audioPlayer.playUIFeedback(700);
                break;
                
            case 'UNDO':
                setComposition(prev => ({
                    ...prev,
                    notes: prev.notes.slice(0, -1)
                }));
                actionTaken = 'Undid last note';
                audioPlayer.playUIFeedback(800, 200);
                break;
                
            case 'PLAY':
                playComposition();
                actionTaken = 'Playing composition';
                break;
                
            case 'CLEAR':
                setComposition(prev => ({ ...prev, notes: [] }));
                actionTaken = 'Cleared composition';
                audioPlayer.playUIFeedback(400, 300);
                break;
                
            case 'EXPORT':
                exportComposition();
                actionTaken = 'Exported composition';
                break;
        }

        if (actionTaken) {
            setRecentActions(prev => [...prev.slice(-4), {
                action: actionTaken,
                time: new Date().toLocaleTimeString(),
                zone: position
            }]);
        }
    }, [handState.sign, composition.currentOctave]);

    const playComposition = () => {
        if (composition.notes.length === 0) {
            audioPlayer.playUIFeedback(400, 300);
            return;
        }

        composition.notes.forEach((noteItem, index) => {
            setTimeout(() => {
                const accidental = noteItem.accidental;
                audioPlayer.playNote(noteItem.note, noteItem.octave, accidental);
                setTimeout(() => audioPlayer.stopNote(), 450);
            }, index * 500);
        });
    };

    const exportComposition = () => {
        const exportData = {
            notes: composition.notes,
            currentOctave: composition.currentOctave,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sol-fa-composition-${Date.now()}.json`;
        a.click();
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

                // Check for Kodály signs
                const recognition = recognizeKodalySign(mirroredLandmarks);
                handleSignDetection(recognition);

                // Check for flat hand position gestures
                const gestureResult = gestureManagerRef.current.processPositionGesture(
                    mirroredLandmarks, 
                    recognition?.sign
                );

                if (gestureResult) {
                    setPositionState({
                        currentZone: gestureResult.position,
                        progress: gestureResult.progress,
                        action: gestureResult.action,
                        triggered: gestureResult.triggered
                    });

                    if (gestureResult.triggered) {
                        executeAction(gestureResult.action.type, gestureResult.position);
                    }
                } else {
                    setPositionState({
                        currentZone: null,
                        progress: 0,
                        action: null,
                        triggered: false
                    });
                }

                // Update hand state
                const isFlatHand = gestureManagerRef.current.detectFlatHand(mirroredLandmarks);
                setHandState({
                    ...recognition,
                    handPresent: true,
                    isFlatHand
                });
            }
        } else {
            handleSignDetection(null);
            setHandState({
                sign: null,
                confidence: 0,
                debug: null,
                handPresent: false,
                isFlatHand: false
            });
            setPositionState({
                currentZone: null,
                progress: 0,
                action: null,
                triggered: false
            });
        }

        ctx.restore();
    }, [handleSignDetection, executeAction]);

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

    const renderZoneOverlay = () => {
        const zones = [
            { name: 'UNDO', position: 'topLeft', description: 'Undo last note' },
            { name: 'SHARP', position: 'top', description: 'Add sharp ♯' },
            { name: 'PLAY', position: 'topRight', description: 'Play composition' },
            { name: 'OCTAVE↓', position: 'left', description: 'Octave down' },
            { name: 'ADD', position: 'center', description: 'Add note' },
            { name: 'OCTAVE↑', position: 'right', description: 'Octave up' },
            { name: 'CLEAR', position: 'bottomLeft', description: 'Clear all' },
            { name: 'FLAT', position: 'bottom', description: 'Add flat ♭' },
            { name: 'EXPORT', position: 'bottomRight', description: 'Export' }
        ];

        return (
            <div className="zone-overlay">
                {zones.map(zone => (
                    <div 
                        key={zone.position}
                        className={`zone zone-${zone.position} ${positionState.currentZone === zone.position ? 'active' : ''}`}
                    >
                        <div className="zone-label">{zone.name}</div>
                        <div className="zone-description">{zone.description}</div>
                        {positionState.currentZone === zone.position && (
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill"
                                    style={{ width: `${positionState.progress * 100}%` }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="position-composer">
            <div className="composer-header">
                <h2>🎵 Position-Based Music Composer</h2>
                <p>Kodály signs for notes • Flat hand in zones for controls • Hold 3 seconds to activate</p>
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
                        
                        {/* Zone overlay */}
                        {renderZoneOverlay()}
                        
                        {/* Current note indicator */}
                        {handState.sign && !handState.isFlatHand && (
                            <div className="current-note-indicator">
                                <h3>{handState.sign.toUpperCase()}{composition.currentOctave}</h3>
                                <p>Make flat hand in zone to control</p>
                            </div>
                        )}
                        
                        {/* Flat hand indicator */}
                        {handState.isFlatHand && (
                            <div className="flat-hand-indicator">
                                <h3>✋ Flat Hand Detected</h3>
                                {positionState.action && (
                                    <p>{positionState.action.description}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="control-panel">
                    <div className="status-panel">
                        <h3>📊 Status</h3>
                        <div className="status-grid">
                            <div>Hand: {handState.handPresent ? '✅' : '❌'}</div>
                            <div>Mode: {handState.isFlatHand ? '✋ Control' : '🎵 Note'}</div>
                            <div>Zone: {positionState.currentZone || 'None'}</div>
                            <div>Octave: {composition.currentOctave}</div>
                            <div>Notes: {composition.notes.length}</div>
                            <div>Progress: {Math.round(positionState.progress * 100)}%</div>
                        </div>
                    </div>
                    
                    <div className="zone-guide">
                        <h3>🗺️ Control Zones</h3>
                        <div className="zone-grid">
                            <div className="zone-item">📍 <strong>Center:</strong> Add natural note</div>
                            <div className="zone-item">⬆️ <strong>Top:</strong> Add sharp (♯)</div>
                            <div className="zone-item">⬇️ <strong>Bottom:</strong> Add flat (♭)</div>
                            <div className="zone-item">⬅️ <strong>Left:</strong> Octave down</div>
                            <div className="zone-item">➡️ <strong>Right:</strong> Octave up</div>
                            <div className="zone-item">📍 <strong>Top-Left:</strong> Undo</div>
                            <div className="zone-item">▶️ <strong>Top-Right:</strong> Play</div>
                            <div className="zone-item">🗑️ <strong>Bottom-Left:</strong> Clear</div>
                            <div className="zone-item">💾 <strong>Bottom-Right:</strong> Export</div>
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
                                        <span className="action-zone">({action.zone})</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No actions yet. Make a hand sign, then flat hand in a zone!</p>
                        )}
                    </div>
                </div>
            </div>
            
            <SimpleSheetMusic notes={composition.notes} />
            
            {composition.notes.length > 0 && (
                <div className="composition-summary">
                    <h3>🎼 Your Composition ({composition.notes.length} notes)</h3>
                    <div className="note-sequence">
                        {composition.notes.map((note, index) => (
                            <span key={index} className="note-chip">
                                {note.note.toUpperCase()}{note.octave}
                                {note.accidental === 'sharp' ? '♯' : note.accidental === 'flat' ? '♭' : ''}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default PositionComposer;
