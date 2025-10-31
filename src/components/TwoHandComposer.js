import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as hands from '@mediapipe/hands';
import * as camera from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { analyzeBothHands, LEFT_HAND_GESTURES } from '../utils/twoHandDetection';
import { audioPlayer } from '../utils/audioUtils';
import { CompositionManager } from '../utils/compositionManager';
import './TwoHandComposer.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 10;

function TwoHandComposer() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const compositionManagerRef = useRef(new CompositionManager());
    
    const [handStates, setHandStates] = useState({
        leftHand: null,
        rightHand: null,
        leftHandGesture: null,
        rightHandNote: null
    });
    
    const [compositionState, setCompositionState] = useState({
        isRecording: false,
        isPlaying: false,
        currentOctave: 4,
        noteCount: 0
    });

    const lastNoteRef = useRef(null);
    const lastGestureRef = useRef(null);
    const noteFrameCountRef = useRef(0);
    const gestureFrameCountRef = useRef(0);

    const handleNoteDetection = useCallback((noteRecognition) => {
        const currentNote = noteRecognition?.sign;
        const confidence = noteRecognition?.confidence || 0;

        if (currentNote && confidence >= CONFIDENCE_THRESHOLD) {
            if (currentNote === lastNoteRef.current) {
                noteFrameCountRef.current++;
                if (noteFrameCountRef.current >= HOLD_FRAMES) {
                    // Play note in current octave
                    audioPlayer.playNote(currentNote, compositionManagerRef.current.currentOctave);
                    
                    // Add to composition if recording
                    if (compositionManagerRef.current.isRecording) {
                        compositionManagerRef.current.addNote(currentNote);
                    }
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
    }, []);

    const handleGestureDetection = useCallback((gesture) => {
        if (gesture) {
            if (gesture === lastGestureRef.current) {
                gestureFrameCountRef.current++;
                if (gestureFrameCountRef.current >= HOLD_FRAMES) {
                    // Execute gesture command
                    executeGestureCommand(gesture);
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
    }, []);

    const executeGestureCommand = useCallback((gesture) => {
        const manager = compositionManagerRef.current;
        
        switch (gesture) {
            case LEFT_HAND_GESTURES.OCTAVE_UP:
                manager.octaveUp();
                audioPlayer.playUIFeedback(1000);
                break;
            case LEFT_HAND_GESTURES.OCTAVE_DOWN:
                manager.octaveDown();
                audioPlayer.playUIFeedback(600);
                break;
            case LEFT_HAND_GESTURES.RECORD_TOGGLE:
                manager.toggleRecording();
                audioPlayer.playUIFeedback(manager.isRecording ? 1200 : 800);
                break;
            case LEFT_HAND_GESTURES.PLAY_TOGGLE:
                manager.togglePlayback(audioPlayer);
                audioPlayer.playUIFeedback(1400);
                break;
            case LEFT_HAND_GESTURES.CLEAR:
                manager.clearComposition();
                audioPlayer.playUIFeedback(400);
                break;
        }
        
        // Update composition state
        setCompositionState(manager.getStatus());
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

        // Draw both hands
        if (results.multiHandLandmarks) {
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const landmarks = results.multiHandLandmarks[i];
                const handedness = results.multiHandedness[i];
                
                // Color code hands: green for right (music), blue for left (UI)
                const handColor = handedness.label === 'Right' ? '#00FF00' : '#0088FF';
                const landmarkColor = handedness.label === 'Right' ? '#FF0000' : '#FF8800';
                
                drawConnectors(ctx, landmarks, hands.HAND_CONNECTIONS, {
                    color: handColor,
                    lineWidth: 5
                });
                drawLandmarks(ctx, landmarks, {
                    color: landmarkColor,
                    lineWidth: 2
                });
            }
        }

        // Analyze both hands
        const analysis = analyzeBothHands(results);
        setHandStates(analysis);
        
        // Handle detections
        handleNoteDetection(analysis.rightHandNote);
        handleGestureDetection(analysis.leftHandGesture);

        ctx.restore();
    }, [handleNoteDetection, handleGestureDetection]);

    useEffect(() => {
        if (!webcamRef.current) return;

        handsRef.current = new hands.Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        // Configure for two hands
        handsRef.current.setOptions({
            maxNumHands: 2,  // Enable two-hand detection
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
            compositionManagerRef.current.stopPlayback();
        };
    }, [onResults]);

    return (
        <div className="two-hand-composer">
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
                    
                    {/* Right hand note indicator */}
                    {handStates.rightHandNote?.sign && (
                        <div className="note-indicator">
                            <h2>{handStates.rightHandNote.sign.toUpperCase()}{compositionState.currentOctave}</h2>
                        </div>
                    )}
                    
                    {/* Left hand gesture indicator */}
                    {handStates.leftHandGesture && (
                        <div className="gesture-indicator">
                            <p>{handStates.leftHandGesture.replace('_', ' ').toUpperCase()}</p>
                        </div>
                    )}
                </div>
                
                <div className="control-panel">
                    <div className="composition-status">
                        <h3>Composition Status</h3>
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
                    
                    <div className="hand-guides">
                        <div className="hand-guide right-hand">
                            <h4>Right Hand (Green) - Musical Notes</h4>
                            <p>Hold Kodály hand signs to play notes</p>
                            <div className="current-detection">
                                {handStates.rightHandNote?.sign 
                                    ? `${handStates.rightHandNote.sign.toUpperCase()}${compositionState.currentOctave}`
                                    : 'No note detected'}
                            </div>
                        </div>
                        
                        <div className="hand-guide left-hand">
                            <h4>Left Hand (Blue) - UI Controls</h4>
                            <ul>
                                <li>👍 Thumbs up: Octave up</li>
                                <li>👎 Thumbs down: Octave down</li>
                                <li>☝️ Index finger: Toggle recording</li>
                                <li>✌️ Peace sign: Toggle playback</li>
                                <li>✋ Open hand: Clear composition</li>
                            </ul>
                            <div className="current-detection">
                                {handStates.leftHandGesture 
                                    ? handStates.leftHandGesture.replace('_', ' ').toUpperCase()
                                    : 'No gesture detected'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TwoHandComposer;
