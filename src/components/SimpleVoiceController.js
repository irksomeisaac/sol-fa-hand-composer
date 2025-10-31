import React, { useRef, useState, useEffect } from 'react';
import { audioPlayer } from '../utils/audioUtils';
import SimpleSheetMusic from './SimpleSheetMusic';

function SimpleVoiceController({ currentNote }) {
    const [composition, setComposition] = useState({
        notes: [],
        currentOctave: 4
    });
    
    const [voiceState, setVoiceState] = useState({
        isReady: false,
        lastCommand: null,
        isSupported: 'webkitSpeechRecognition' in window
    });
    
    const recognitionRef = useRef(null);

    const handleVoiceCommand = (transcript) => {
        console.log('Voice command received:', transcript);
        
        if (transcript.includes('add') && currentNote) {
            const newNote = {
                note: currentNote,
                octave: composition.currentOctave,
                timestamp: Date.now()
            };
            setComposition(prev => ({
                ...prev,
                notes: [...prev.notes, newNote]
            }));
            audioPlayer.playUIFeedback(1200, 200);
            setVoiceState(prev => ({ 
                ...prev, 
                lastCommand: `Added ${currentNote.toUpperCase()}${composition.currentOctave}` 
            }));
        }
        else if (transcript.includes('octave up') || transcript.includes('higher')) {
            setComposition(prev => ({
                ...prev,
                currentOctave: Math.min(prev.currentOctave + 1, 7)
            }));
            audioPlayer.playUIFeedback(1000);
            setVoiceState(prev => ({ ...prev, lastCommand: `Octave up to ${Math.min(composition.currentOctave + 1, 7)}` }));
        }
        else if (transcript.includes('octave down') || transcript.includes('lower')) {
            setComposition(prev => ({
                ...prev,
                currentOctave: Math.max(prev.currentOctave - 1, 2)
            }));
            audioPlayer.playUIFeedback(600);
            setVoiceState(prev => ({ ...prev, lastCommand: `Octave down to ${Math.max(composition.currentOctave - 1, 2)}` }));
        }
        else if (transcript.includes('play')) {
            playComposition();
            setVoiceState(prev => ({ ...prev, lastCommand: 'Playing composition' }));
        }
        else if (transcript.includes('clear')) {
            setComposition(prev => ({ ...prev, notes: [] }));
            audioPlayer.playUIFeedback(400, 300);
            setVoiceState(prev => ({ ...prev, lastCommand: 'Composition cleared' }));
        }
        else if (transcript.includes('undo')) {
            setComposition(prev => ({
                ...prev,
                notes: prev.notes.slice(0, -1)
            }));
            audioPlayer.playUIFeedback(500);
            setVoiceState(prev => ({ ...prev, lastCommand: 'Last note removed' }));
        }
    };

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

    const setupVoiceRecognition = () => {
        if (!voiceState.isSupported) return;
        
        const recognition = new window.webkitSpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
            handleVoiceCommand(transcript);
        };
        
        recognition.onerror = (event) => {
            console.log('Voice error (will continue):', event.error);
            // Don't restart automatically - just log the error
        };
        
        recognition.onend = () => {
            // Only restart if we haven't manually stopped
            if (voiceState.isReady) {
                setTimeout(() => {
                    try { recognition.start(); } catch (e) {}
                }, 1000);
            }
        };

        return recognition;
    };

    useEffect(() => {
        if (voiceState.isSupported) {
            const recognition = setupVoiceRecognition();
            
            // Start after delay
            setTimeout(() => {
                try {
                    recognition.start();
                    setVoiceState(prev => ({ ...prev, isReady: true }));
                    console.log('Voice recognition started');
                } catch (error) {
                    console.error('Voice start failed:', error);
                }
            }, 3000);
        }

        return () => {
            if (recognitionRef.current) {
                setVoiceState(prev => ({ ...prev, isReady: false }));
                try {
                    recognitionRef.current.stop();
                } catch (e) {}
            }
        };
    }, []);

    return (
        <div className="simple-voice-controller">
            <div className="voice-section">
                <h3>🎤 Voice Commands</h3>
                
                <div className="voice-status">
                    <div className="voice-indicator">
                        {voiceState.isSupported ? 
                            '🎤 Voice Ready - Speak Commands' : 
                            '❌ Voice Not Supported'
                        }
                    </div>
                </div>
                
                {voiceState.lastCommand && (
                    <div className="last-command">
                        ✓ {voiceState.lastCommand}
                    </div>
                )}
                
                <div className="current-state">
                    <p><strong>Current Note:</strong> {currentNote ? `${currentNote.toUpperCase()}${composition.currentOctave}` : 'None detected'}</p>
                    <p><strong>Current Octave:</strong> {composition.currentOctave}</p>
                    <p><strong>Notes Added:</strong> {composition.notes.length}</p>
                </div>
                
                <div className="commands-list">
                    <h4>Say These Commands:</h4>
                    <ul>
                        <li>"Add" - Add current note to staff</li>
                        <li>"Octave up" - Increase octave</li>
                        <li>"Octave down" - Decrease octave</li>
                        <li>"Play" - Play composition</li>
                        <li>"Undo" - Remove last note</li>
                        <li>"Clear" - Clear all notes</li>
                    </ul>
                </div>
            </div>

            {/* Sheet Music Display */}
            <SimpleSheetMusic notes={composition.notes} />
        </div>
    );
}

export default SimpleVoiceController;
