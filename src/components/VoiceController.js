import React, { useRef, useEffect, useState } from 'react';
import { audioPlayer } from '../utils/audioUtils';
import SimpleSheetMusic from './SimpleSheetMusic';

function VoiceController({ currentNote, onCompositionUpdate }) {
    const [voiceState, setVoiceState] = useState({
        isActive: false,
        lastCommand: null,
        isSupported: false
    });
    
    const [composition, setComposition] = useState({
        notes: [],
        currentOctave: 4
    });
    
    const voiceRecognitionRef = useRef(null);

    const handleVoiceCommand = (transcript) => {
        console.log('Voice command:', transcript);
        
        if (transcript.includes('add') && currentNote) {
            const newNote = {
                note: currentNote,
                octave: composition.currentOctave,
                timestamp: Date.now()
            };
            const updatedComposition = {
                ...composition,
                notes: [...composition.notes, newNote]
            };
            setComposition(updatedComposition);
            audioPlayer.playUIFeedback(1200, 200);
            setVoiceState(prev => ({ 
                ...prev, 
                lastCommand: `Added ${currentNote.toUpperCase()}${composition.currentOctave}` 
            }));
            onCompositionUpdate?.(updatedComposition);
        }
        else if (transcript.includes('octave up') || transcript.includes('higher')) {
            const newOctave = Math.min(composition.currentOctave + 1, 7);
            const updatedComposition = { ...composition, currentOctave: newOctave };
            setComposition(updatedComposition);
            audioPlayer.playUIFeedback(1000);
            setVoiceState(prev => ({ ...prev, lastCommand: `Octave ${newOctave}` }));
            onCompositionUpdate?.(updatedComposition);
        }
        else if (transcript.includes('octave down') || transcript.includes('lower')) {
            const newOctave = Math.max(composition.currentOctave - 1, 2);
            const updatedComposition = { ...composition, currentOctave: newOctave };
            setComposition(updatedComposition);
            audioPlayer.playUIFeedback(600);
            setVoiceState(prev => ({ ...prev, lastCommand: `Octave ${newOctave}` }));
            onCompositionUpdate?.(updatedComposition);
        }
        else if (transcript.includes('play') || transcript.includes('playback')) {
            playComposition();
            setVoiceState(prev => ({ ...prev, lastCommand: 'Playing composition' }));
        }
        else if (transcript.includes('clear') || transcript.includes('reset')) {
            const updatedComposition = { ...composition, notes: [] };
            setComposition(updatedComposition);
            audioPlayer.playUIFeedback(400, 300);
            setVoiceState(prev => ({ ...prev, lastCommand: 'Composition cleared' }));
            onCompositionUpdate?.(updatedComposition);
        }
        else if (transcript.includes('undo')) {
            const updatedComposition = {
                ...composition,
                notes: composition.notes.slice(0, -1)
            };
            setComposition(updatedComposition);
            audioPlayer.playUIFeedback(500);
            setVoiceState(prev => ({ ...prev, lastCommand: 'Last note removed' }));
            onCompositionUpdate?.(updatedComposition);
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
                setTimeout(() => audioPlayer.stopNote(), 400);
            }, index * 500);
        });
    };

    useEffect(() => {
        // Setup voice recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            voiceRecognitionRef.current = new SpeechRecognition();
            
            voiceRecognitionRef.current.continuous = true;
            voiceRecognitionRef.current.interimResults = false;
            voiceRecognitionRef.current.lang = 'en-US';
            
            voiceRecognitionRef.current.onstart = () => {
                setVoiceState(prev => ({ 
                    ...prev, 
                    isActive: true
                }));
                console.log('Voice recognition is now active');
            };
            
            voiceRecognitionRef.current.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
                handleVoiceCommand(transcript);
            };
            
            voiceRecognitionRef.current.onerror = (event) => {
                console.log('Voice error:', event.error);
                setVoiceState(prev => ({ 
                    ...prev, 
                    isActive: false
                }));
                
                // Restart after error
                setTimeout(() => {
                    try { 
                        voiceRecognitionRef.current.start(); 
                    } catch (e) {
                        console.log('Restart failed:', e);
                    }
                }, 2000);
            };
            
            voiceRecognitionRef.current.onend = () => {
                setVoiceState(prev => ({ 
                    ...prev, 
                    isActive: false
                }));
                
                // Auto-restart
                setTimeout(() => {
                    try { 
                        voiceRecognitionRef.current.start(); 
                    } catch (e) {
                        console.log('Auto-restart failed:', e);
                    }
                }, 500);
            };

            setVoiceState(prev => ({ ...prev, isSupported: true }));

            // Start voice recognition after a delay
            const startVoice = () => {
                try {
                    voiceRecognitionRef.current.start();
                    console.log('Voice recognition start attempted');
                } catch (error) {
                    console.log('Voice start failed:', error);
                    setTimeout(startVoice, 3000);
                }
            };
            
            setTimeout(startVoice, 3000); // 3 second delay
        } else {
            setVoiceState(prev => ({ ...prev, isSupported: false }));
        }

        return () => {
            if (voiceRecognitionRef.current) {
                try {
                    voiceRecognitionRef.current.stop();
                } catch (e) {}
            }
        };
    }, []);

    return (
        <div className="voice-controller">
            <div className="voice-status">
                <div className={`voice-indicator ${voiceState.isActive ? 'active' : 'inactive'}`}>
                    {voiceState.isSupported ? 
                        (voiceState.isActive ? '🎤 Voice Active - Say Commands' : '🎤 Voice Loading...') : 
                        '❌ Voice Not Supported'
                    }
                </div>
                {voiceState.lastCommand && (
                    <div className="last-command">
                        {voiceState.lastCommand}
                    </div>
                )}
            </div>
            
            <div className="composition-info">
                <h4>Composition ({composition.notes.length} notes)</h4>
                <p>Current Octave: {composition.currentOctave}</p>
                <p>Current Note: {currentNote ? currentNote.toUpperCase() : 'None detected'}</p>
                {composition.notes.length > 0 && (
                    <div className="recent-notes">
                        Recent: {composition.notes.slice(-3).map(n => 
                            `${n.note.toUpperCase()}${n.octave}`
                        ).join(', ')}
                    </div>
                )}
            </div>
            
            <div className="voice-commands">
                <h4>Voice Commands:</h4>
                <ul>
                    <li>"Add" - Add current note</li>
                    <li>"Octave up/down" - Change octave</li>
                    <li>"Play" - Play composition</li>
                    <li>"Clear" - Clear all notes</li>
                    <li>"Undo" - Remove last note</li>
                </ul>
            </div>

            {/* Sheet Music Display */}
            <SimpleSheetMusic notes={composition.notes} />
        </div>
    );
}

export default VoiceController;
