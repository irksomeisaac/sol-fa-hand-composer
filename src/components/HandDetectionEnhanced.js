import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as hands from '@mediapipe/hands';
import * as camera from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { recognizeKodalySign } from '../utils/kodalySignsDB';
import { audioPlayer, TIMBRES, EFFECT_TYPES } from '../utils/audioUtils'; // Same import!
import SimpleSheetMusic from './SimpleSheetMusic';
import './HandDetection.css';

const CONFIDENCE_THRESHOLD = 0.85;
const HOLD_FRAMES = 10;

/**
 * Enhanced version of HandDetection that demonstrates how to add 
 * enhanced audio features to existing components with minimal changes
 */
function HandDetectionEnhanced() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const recognitionRef = useRef(null);
    
    const [detectionState, setDetectionState] = useState({
        sign: null,
        confidence: 0,
        debug: null,
        handPresent: false
    });
    
    const [composition, setComposition] = useState({
        notes: [],
        currentOctave: 4
    });

    const [voiceState, setVoiceState] = useState({
        isListening: false,
        isSupported: 'webkitSpeechRecognition' in window,
        currentSpeech: '',
        lastCommand: null,
        commandHistory: []
    });

    // Enhanced Audio Settings
    const [audioSettings, setAudioSettings] = useState({
        timbre: TIMBRES.flute,
        volume: 0.8,
        effectsEnabled: false,
        reverbId: null
    });

    const lastSignRef = useRef(null);
    const frameCountRef = useRef(0);

    // Initialize enhanced audio features
    useEffect(() => {
        const initAudio = async () => {
            try {
                await audioPlayer.initialize();
                
                // Set up enhanced audio settings
                audioPlayer.setTimbre(audioSettings.timbre);
                audioPlayer.setMasterVolume(audioSettings.volume);
                
                console.log('Enhanced audio system initialized');
            } catch (error) {
                console.error('Failed to initialize enhanced audio:', error);
            }
        };
        
        initAudio();
    }, []);

    // Voice command handler with enhanced audio feedback
    const handleVoiceCommand = useCallback((transcript) => {
        console.log('Voice command:', transcript);
        
        setVoiceState(prev => ({
            ...prev,
            lastCommand: transcript,
            commandHistory: [...prev.commandHistory.slice(-4), transcript]
        }));

        if (transcript.includes('add') && detectionState.sign) {
            const newNote = {
                note: detectionState.sign,
                octave: composition.currentOctave,
                timestamp: Date.now()
            };
            setComposition(prev => ({
                ...prev,
                notes: [...prev.notes, newNote]
            }));
            // Enhanced UI feedback
            audioPlayer.playEnhancedUIFeedback('success');
        }
        else if (transcript.includes('octave up') || transcript.includes('higher') || transcript.includes('up')) {
            setComposition(prev => ({
                ...prev,
                currentOctave: Math.min(prev.currentOctave + 1, 7)
            }));
            audioPlayer.playEnhancedUIFeedback('info');
        }
        else if (transcript.includes('octave down') || transcript.includes('lower') || transcript.includes('down')) {
            setComposition(prev => ({
                ...prev,
                currentOctave: Math.max(prev.currentOctave - 1, 2)
            }));
            audioPlayer.playEnhancedUIFeedback('warning');
        }
        else if (transcript.includes('play')) {
            playComposition();
        }
        else if (transcript.includes('clear') || transcript.includes('reset')) {
            setComposition(prev => ({ ...prev, notes: [] }));
            audioPlayer.playEnhancedUIFeedback('error');
        }
        else if (transcript.includes('undo') || transcript.includes('remove')) {
            setComposition(prev => ({
                ...prev,
                notes: prev.notes.slice(0, -1)
            }));
            audioPlayer.playEnhancedUIFeedback('click');
        }
        // Enhanced audio control commands
        else if (transcript.includes('timbre') || transcript.includes('sound')) {
            cycleTimbres();
        }
        else if (transcript.includes('reverb') || transcript.includes('echo')) {
            toggleReverb();
        }
        else if (transcript.includes('volume up')) {
            adjustVolume(0.1);
        }
        else if (transcript.includes('volume down')) {
            adjustVolume(-0.1);
        }
        else if (transcript.includes('play chord')) {
            playChordExample();
        }
    }, [detectionState.sign, composition.currentOctave, audioSettings]);

    // Enhanced playback with better sound
    const playComposition = () => {
        if (composition.notes.length === 0) {
            audioPlayer.playEnhancedUIFeedback('error');
            return;
        }

        // Use enhanced sequence playing
        const sequence = composition.notes.map(note => ({
            note: note.note,
            octave: note.octave,
            duration: 0.6
        }));

        audioPlayer.playSequence(sequence, {
            tempo: 100,
            noteLength: 0.5,
            gap: 0.1,
            timbre: audioSettings.timbre
        });
    };

    // Enhanced audio controls
    const cycleTimbres = () => {
        const timbres = Object.values(TIMBRES);
        const currentIndex = timbres.indexOf(audioSettings.timbre);
        const nextTimbre = timbres[(currentIndex + 1) % timbres.length];
        
        setAudioSettings(prev => ({ ...prev, timbre: nextTimbre }));
        audioPlayer.setTimbre(nextTimbre);
        
        // Play a sample note with the new timbre
        audioPlayer.playNoteEnhanced('do', 4, { 
            duration: 1, 
            timbre: nextTimbre,
            volume: 0.5 
        });
        
        console.log('Timbre changed to:', nextTimbre);
    };

    const toggleReverb = () => {
        if (audioSettings.effectsEnabled) {
            audioPlayer.removeEffect(audioSettings.reverbId);
            setAudioSettings(prev => ({ 
                ...prev, 
                effectsEnabled: false, 
                reverbId: null 
            }));
            console.log('Reverb disabled');
        } else {
            const reverbId = audioPlayer.addEffect('reverb', { 
                wetness: 0.3, 
                duration: 1.5 
            });
            setAudioSettings(prev => ({ 
                ...prev, 
                effectsEnabled: true, 
                reverbId: reverbId 
            }));
            console.log('Reverb enabled');
        }
        
        audioPlayer.playEnhancedUIFeedback('info');
    };

    const adjustVolume = (delta) => {
        const newVolume = Math.max(0, Math.min(1, audioSettings.volume + delta));
        setAudioSettings(prev => ({ ...prev, volume: newVolume }));
        audioPlayer.setMasterVolume(newVolume);
        audioPlayer.playEnhancedUIFeedback('click');
        console.log('Volume:', Math.round(newVolume * 100) + '%');
    };

    const playChordExample = () => {
        audioPlayer.playChord('C', 'major', 4, {
            duration: 2,
            volume: 0.4,
            timbre: audioSettings.timbre
        });
    };

    // Enhanced sign detection with better audio feedback
    const handleSignDetection = useCallback((recognition) => {
        const currentSign = recognition?.sign;
        const confidence = recognition?.confidence || 0;

        if (currentSign && confidence >= CONFIDENCE_THRESHOLD) {
            if (currentSign === lastSignRef.current) {
                frameCountRef.current++;
                if (frameCountRef.current >= HOLD_FRAMES) {
                    // Use enhanced note playing for better sound
                    audioPlayer.playNoteEnhanced(currentSign, composition.currentOctave, {
                        duration: 0, // Infinite until stopped
                        timbre: audioSettings.timbre,
                        volume: 0.6,
                        attack: 0.05,
                        release: 0.1
                    });
                }
            } else {
                frameCountRef.current = 0;
                lastSignRef.current = currentSign;
                audioPlayer.stopNote(); // Legacy method still works
            }
        } else {
            frameCountRef.current = 0;
            lastSignRef.current = null;
            audioPlayer.stopNote();
        }
    }, [composition.currentOctave, audioSettings.timbre]);

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

    // Setup voice recognition (unchanged from original)
    useEffect(() => {
        if (!voiceState.isSupported) return;

        const recognition = new window.webkitSpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setVoiceState(prev => ({ ...prev, isListening: true }));
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

        recognition.onerror = () => {
            setVoiceState(prev => ({ ...prev, isListening: false }));
            setTimeout(() => {
                try { recognition.start(); } catch (e) {}
            }, 2000);
        };

        recognition.onend = () => {
            setVoiceState(prev => ({ ...prev, isListening: false }));
            setTimeout(() => {
                try { recognition.start(); } catch (e) {}
            }, 1000);
        };

        setTimeout(() => {
            try {
                recognition.start();
            } catch (error) {
                console.error('Voice start failed:', error);
            }
        }, 3000);

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {}
            }
        };
    }, [handleVoiceCommand]);

    // Setup MediaPipe (unchanged from original)
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
                        ? `Detected: ${detectionState.sign.toUpperCase()}${composition.currentOctave} (${Math.round(detectionState.confidence * 100)}% confident)`
                        : "Hand Detected - No Sign Recognized"}
                </div>
                <div className="debug-data">
                    {/* Enhanced Audio Settings Display */}
                    <div className="debug-section audio-settings">
                        <h4>🎵 Enhanced Audio Settings:</h4>
                        <div className="audio-info">
                            <p><strong>Timbre:</strong> {audioSettings.timbre}</p>
                            <p><strong>Volume:</strong> {Math.round(audioSettings.volume * 100)}%</p>
                            <p><strong>Reverb:</strong> {audioSettings.effectsEnabled ? 'ON' : 'OFF'}</p>
                        </div>
                    </div>

                    {/* Voice Recognition Display */}
                    <div className="debug-section voice-section">
                        <h4>🎤 Voice Recognition:</h4>
                        <div className={`voice-status ${voiceState.isListening ? 'listening' : 'inactive'}`}>
                            {voiceState.isSupported ? 
                                (voiceState.isListening ? 'Listening...' : 'Not active') : 
                                'Not supported'
                            }
                        </div>
                        
                        {voiceState.currentSpeech && (
                            <div className="current-speech">
                                Hearing: "{voiceState.currentSpeech}"
                            </div>
                        )}
                        
                        {voiceState.lastCommand && (
                            <div className="last-command">
                                Last: "{voiceState.lastCommand}"
                            </div>
                        )}
                    </div>
                    
                    <div className="debug-section">
                        <h4>Composition:</h4>
                        <p>Current Octave: {composition.currentOctave}</p>
                        <p>Notes Added: {composition.notes.length}</p>
                        {composition.notes.length > 0 && (
                            <div>
                                Last notes: {composition.notes.slice(-3).map(n => 
                                    `${n.note.toUpperCase()}${n.octave}`
                                ).join(', ')}
                            </div>
                        )}
                    </div>
                    
                    <div className="debug-section">
                        <h4>Voice Commands:</h4>
                        <ul>
                            <li>"Add" - Add current note</li>
                            <li>"Octave up/down" - Change octave</li>
                            <li>"Play" - Play composition</li>
                            <li>"Undo/Clear" - Edit composition</li>
                            <li><strong>"Timbre"</strong> - <em>Change sound</em></li>
                            <li><strong>"Reverb"</strong> - <em>Toggle reverb</em></li>
                            <li><strong>"Volume up/down"</strong> - <em>Adjust volume</em></li>
                            <li><strong>"Play chord"</strong> - <em>Demo chord</em></li>
                        </ul>
                    </div>

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
                            {detectionState.sign && frameCountRef.current >= HOLD_FRAMES && (
                                <div className="debug-section playing">
                                    <h4>Playing Note (Enhanced):</h4>
                                    <p>{detectionState.sign.toUpperCase()}{composition.currentOctave}</p>
                                    <p>Timbre: {audioSettings.timbre}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }, [detectionState, composition, voiceState, audioSettings]);

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
                            <h2>{detectionState.sign.toUpperCase()}{composition.currentOctave}</h2>
                            <div className="timbre-indicator">{audioSettings.timbre}</div>
                        </div>
                    )}
                    
                    {/* Voice speech overlay */}
                    {voiceState.currentSpeech && (
                        <div className="speech-bubble">
                            "{voiceState.currentSpeech}"
                        </div>
                    )}
                    
                    <div className="voice-indicator">
                        <div className={`mic-status ${voiceState.isListening ? 'active' : 'inactive'}`}>
                            🎤
                        </div>
                        {audioSettings.effectsEnabled && (
                            <div className="reverb-indicator">
                                🔊 Reverb
                            </div>
                        )}
                    </div>
                </div>
                {renderDebugInfo()}
            </div>
            
            {/* Sheet Music Display */}
            <SimpleSheetMusic notes={composition.notes} />
            
            {/* Enhanced Audio Controls */}
            <div className="enhanced-controls">
                <h3>🎵 Enhanced Audio Controls</h3>
                <div className="control-buttons">
                    <button onClick={cycleTimbres}>
                        Change Timbre ({audioSettings.timbre})
                    </button>
                    <button onClick={toggleReverb}>
                        {audioSettings.effectsEnabled ? 'Disable' : 'Enable'} Reverb
                    </button>
                    <button onClick={() => adjustVolume(0.1)}>
                        Volume Up ({Math.round(audioSettings.volume * 100)}%)
                    </button>
                    <button onClick={() => adjustVolume(-0.1)}>
                        Volume Down ({Math.round(audioSettings.volume * 100)}%)
                    </button>
                    <button onClick={playChordExample}>
                        Play C Major Chord
                    </button>
                </div>
            </div>
        </div>
    );
}

export default HandDetectionEnhanced;
