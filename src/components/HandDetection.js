import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as hands from '@mediapipe/hands';
import * as camera from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { recognizeKodalySign } from '../utils/kodalySignsDB';
import { audioPlayer } from '../utils/audioUtils';
import './HandDetection.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 10;

function HandDetection() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const [detectionState, setDetectionState] = useState({
        sign: null,
        confidence: 0,
        debug: null,
        handPresent: false
    });
    
    const lastSignRef = useRef(null);
    const frameCountRef = useRef(0);

    const handleSignDetection = useCallback((recognition) => {
        const currentSign = recognition?.sign;
        const confidence = recognition?.confidence || 0;

        if (currentSign && confidence >= CONFIDENCE_THRESHOLD) {
            if (currentSign === lastSignRef.current) {
                frameCountRef.current++;
                if (frameCountRef.current >= HOLD_FRAMES) {
                    audioPlayer.playNote(currentSign);
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

    const renderDebugInfo = useCallback(() => {
        if (!detectionState.handPresent) {
            return (
                <div className="debug-panel">
                    <div className="status-message">No Hand Detected</div>
                    <div className="debug-data">
                        <p>Waiting for hand to appear in frame...</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="debug-panel">
                <div className="status-message">
                    {detectionState.sign 
                        ? `Detected: ${detectionState.sign.toUpperCase()} (${Math.round(detectionState.confidence * 100)}% confident)`
                        : "Hand Detected - No Sign Recognized"}
                </div>
                <div className="debug-data">
                    <h3>Hand Analysis:</h3>
                    {detectionState.debug && (
                        <>
                            <div className="debug-section">
                                <h4>Finger Extensions:</h4>
                                {Object.entries(detectionState.debug.extensions).map(([finger, value]) => (
                                    <div key={finger} className="debug-item">
                                        <span>{finger}:</span>
                                        <div className="debug-bar" style={{width: `${value * 100}%`}}></div>
                                        <span>{Math.round(value * 100)}%</span>
                                    </div>
                                ))}
                            </div>
                            <div className="debug-section">
                                <h4>Hand Direction:</h4>
                                <p>Vertical Angle: {Math.round(detectionState.debug.handDirection.verticalAngle)}°</p>
                                <p>Direction: {
                                    detectionState.debug.handDirection.isPointingUp ? "Up" :
                                    detectionState.debug.handDirection.isPointingDown ? "Down" :
                                    detectionState.debug.handDirection.isPointingForward ? "Forward" :
                                    detectionState.debug.handDirection.isHorizontal ? "Horizontal" : "Other"
                                }</p>
                            </div>
                            <div className="debug-section">
                                <h4>Palm Orientation:</h4>
                                <p>
                                    {detectionState.debug.palmOrientation.isDown ? "Down" : 
                                     detectionState.debug.palmOrientation.isUp ? "Up" : 
                                     detectionState.debug.palmOrientation.isSide ? "Side" : "Neutral"}
                                </p>
                            </div>
                            {detectionState.sign && frameCountRef.current >= HOLD_FRAMES && (
                                <div className="debug-section playing">
                                    <h4>Playing Note:</h4>
                                    <p>{detectionState.sign.toUpperCase()}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }, [detectionState]);

    return (
        <div className="hand-detection">
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
                            <h2>{detectionState.sign.toUpperCase()}</h2>
                        </div>
                    )}
                </div>
                {renderDebugInfo()}
            </div>
        </div>
    );
}

export default HandDetection;
