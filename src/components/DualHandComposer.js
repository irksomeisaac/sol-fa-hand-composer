import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as hands from '@mediapipe/hands';
import * as camera from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { recognizeKodalySign } from '../utils/kodalySignsDB';
import { recognizeLeftHandGesture } from '../utils/leftHandGestures';
import { audioPlayer } from '../utils/audioUtils';
import SimpleSheetMusic from './SimpleSheetMusic';
import './DualHandComposer.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 15; // Increased for more stable detection

function DualHandComposer() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    
    const [handStates, setHandStates] = useState({
        rightHand: null,
        leftHand: null,
        rightHandNote: null,
        leftHandGesture: null
    });
    
    const [composition, setComposition] = useState({
        notes: [],
        currentOctave: 4
    });

    const lastNoteRef = useRef(null);
    const lastGestureRef = useRef(null);
    const noteFrameCountRef = useRef(0);
    const gestureFrameCountRef = useRef(0);

    const executeLeftHandAction = useCallback((action, gesture) => {
        switch (action) {
            case 'ADD_NOTE':
                if (handStates.rightHandNote?.sign) {
                    const newNote = {
                        note: handStates.rightHandNote.sign,
                        octave: composition.currentOctave,
                        timestamp: Date.now()
                    };
                    setComposition(prev => ({
                        ...prev,
                        notes: [...prev.notes, newNote]
                    }));
                    audioPlayer.playUIFeedback(1200, 200);
                }
                break;
                
            case 'OCTAVE_UP':
                setComposition(prev => ({
                    ...prev,
                    currentOctave: Math.min(prev.currentOctave + 1, 7)
                }));
                audioPlayer.playUIFeedback(1000);
                break;
                
            case 'OCTAVE_DOWN':
                setComposition(prev => ({
                    ...prev,
                    currentOctave: Math.max(prev.currentOctave - 1, 2)
                }));
                audioPlayer.playUIFeedback(600);
                break;
                
            case 'PLAY_COMPOSITION':
                playComposition();
                break;
                
            case 'UNDO':
                setComposition(prev => ({
                    ...prev,
                    notes: prev.notes.slice(0, -1)
                }));
                audioPlayer.playUIFeedback(500);
                break;
                
            case 'CLEAR_COMPOSITION':
                setComposition(prev => ({ ...prev, notes: [] }));
                audioPlayer.playUIFeedback(400, 300);
                break;
        }
    }, [handStates.rightHandNote, composition.currentOctave]);

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

    const handleNoteDetection = useCallback((noteRecognition) => {
        const currentNote = noteRecognition?.sign;
        const confidence = noteRecognition?.confidence || 0;

        if (currentNote && confidence >= CONFIDENCE_THRESHOLD) {
            if (currentNote === lastNoteRef.current) {
                noteFrameCountRef.current++;
                if (noteFrameCountRef.current >= HOLD_FRAMES) {
                    audioPlayer.playNote(currentNote, composition.currentOctave);
                }
            } else {
                noteFrameCountRef.current = 0;
                lastNoteRef.current = currentNote;
                audioPlayer.stopNote();
            }
        } else {
            noteFrameCountRef.current = 0;
            lastNoteRef.current = null;
            audioPlayer.stopNote();
        }
    }, [composition.currentOctave]);

    const handleGestureDetection = useCallback((gestureRecognition) => {
        const gesture = gestureRecognition?.gesture;
        const action = gestureRecognition?.action;

        if (gesture && action) {
            if (gesture === lastGestureRef.current) {
                gestureFrameCountRef.current++;
                if (gestureFrameCountRef.current >= HOLD_FRAMES) {
                    executeLeftHandAction(action, gesture);
                    // Reset to prevent repeated execution
                    gestureFrameCountRef.current = 0;
                    lastGestureRef.current = null;
                }
            } else {
                gestureFrameCountRef.current = 0;
                lastGestureRef.current = gesture;
            }
        } else {
            gestureFrameCountRef.current = 0;
            lastGestureRef.current = null;
        }
    }, [executeLeftHandAction]);

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

        let rightHandNote = null;
        let leftHandGesture = null;

        if (results.multiHandLandmarks && results.multiHandedness) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i];
                
                // MediaPipe labels: "Left" = person's left hand (appears right on camera)
                const isPersonsRightHand = handedness.label === 'Left';
                const isPersonsLeftHand = handedness.label === 'Right';
                
                // Color code hands
                const handColor = isPersonsRightHand ? '#00FF00' : '#0080FF'; // Green for right, blue for left
                const landmarkColor = isPersonsRightHand ? '#FF0000' : '#FF8000';
                
                drawConnectors(ctx, landmarks, hands.HAND_CONNECTIONS, {
                    color: handColor,
                    lineWidth: 5
                });
                drawLandmarks(ctx, landmarks, {
                    color: landmarkColor,
                    lineWidth: 2
                });

                const mirroredLandmarks = landmarks.map(landmark => ({
                    ...landmark,
                    x: 1 - landmark.x
                }));

                if (isPersonsRightHand) {
                    // Right hand - musical notes
                    rightHandNote = recognizeKodalySign(mirroredLandmarks);
                } else if (isPersonsLeftHand) {
                    // Left hand - UI controls
                    leftHandGesture = recognizeLeftHandGesture(mirroredLandmarks);
                }
            }
        }

        setHandStates({
            rightHandNote,
            leftHandGesture
        });

        handleNoteDetection(rightHandNote);
        handleGestureDetection(leftHandGesture);

        ctx.restore();
    }, [handleNoteDetection, handleGestureDetection]);

    useEffect(() => {
        if (!webcamRef.current) return;

        handsRef.current = new hands.Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        // Enable two-hand detection
        handsRef.current.setOptions({
            maxNumHands: 2,  // Track both hands
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

    return (
        <div className="dual-hand-composer">
            <div className="composer-header">
                <h2>🎵 Dual-Hand Music Composer</h2>
                <p>Right hand (Green): Musical notes | Left hand (Blue): App controls</p>
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
                        
                        {/* Right hand note indicator */}
                        {handStates.rightHandNote?.sign && (
                            <div className="note-indicator">
                                <h3>{handStates.rightHandNote.sign.toUpperCase()}{composition.currentOctave}</h3>
                            </div>
                        )}
                        
                        {/* Left hand gesture indicator */}
                        {handStates.leftHandGesture && (
                            <div className="gesture-indicator">
                                <p>{handStates.leftHandGesture.gesture.replace('_', ' ')}</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="control-panel">
                    <div className="composition-status">
                        <h3>Composition Status</h3>
                        <div className="status-grid">
                            <div className="status-item">
                                <span>Current Octave:</span>
                                <span className="value">{composition.currentOctave}</span>
                            </div>
                            <div className="status-item">
                                <span>Notes:</span>
                                <span className="value">{composition.notes.length}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="hand-guides">
                        <div className="hand-guide right-hand">
                            <h4>Right Hand (Green) - Musical Notes</h4>
                            <p>Use Kodály hand signs:</p>
                            <ul>
                                <li>Do, Re, Mi, Fa, Sol, La, Ti</li>
                            </ul>
                            <div className="current-detection">
                                {handStates.rightHandNote?.sign 
                                    ? `${handStates.rightHandNote.sign.toUpperCase()}${composition.currentOctave}`
                                    : 'No note detected'}
                            </div>
                        </div>
                        
                        <div className="hand-guide left-hand">
                            <h4>Left Hand (Blue) - Controls</h4>
                            <ul>
                                <li>✌️ Peace sign: Add note</li>
                                <li>👍 Thumbs up: Octave up</li>
                                <li>👎 Thumbs down: Octave down</li>
                                <li>✋ Open palm: Play composition</li>
                                <li>☝️ Point finger: Undo</li>
                                <li>✊ Closed fist: Clear all</li>
                            </ul>
                            <div className="current-detection">
                                {handStates.leftHandGesture 
                                    ? handStates.leftHandGesture.gesture.replace('_', ' ')
                                    : 'No gesture detected'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sheet Music Display */}
            <SimpleSheetMusic notes={composition.notes} />
        </div>
    );
}

export default DualHandComposer;
