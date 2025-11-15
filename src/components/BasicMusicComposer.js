import React, { useState, useRef, useEffect } from 'react';
import { audioPlayer } from '../utils/audioUtils';
import './BasicMusicComposer.css';

function BasicMusicComposer() {
    const [composition, setComposition] = useState({
        notes: [],
        currentOctave: 4,
        currentAccidental: null
    });
    
    const [currentNote, setCurrentNote] = useState(null);
    const [voiceState, setVoiceState] = useState({
        isActive: false,
        currentSpeech: '',
        lastCommand: null,
        isSupported: 'webkitSpeechRecognition' in window
    });

    const voiceRef = useRef(null);

    const handleVoiceCommand = useCallback((command) => {
        console.log('Voice command:', command);
        setVoiceState(prev => ({ ...prev, lastCommand: command }));

        if (command.includes('add') && currentNote) {
            const newNote = {
                note: currentNote,
                octave: composition.currentOctave,
                accidental: composition.currentAccidental,
                timestamp: Date.now()
            };
            setComposition(prev => ({
                ...prev,
                notes: [...prev.notes, newNote],
                currentAccidental: null
            }));
            audioPlayer.playUIFeedback(1200, 200);
        }
        else if (command.includes('sharp')) {
            setComposition(prev => ({ ...prev, currentAccidental: 'sharp' }));
            audioPlayer.playUIFeedback(1100, 100);
        }
        else if (command.includes('flat')) {
            setComposition(prev => ({ ...prev, currentAccidental: 'flat' }));
            audioPlayer.playUIFeedback(900, 100);
        }
        else if (command.includes('octave up') || command.includes('higher')) {
            setComposition(prev => ({
                ...prev,
                currentOctave: Math.min(prev.currentOctave + 1, 7)
            }));
            audioPlayer.playUIFeedback(1000);
        }
        else if (command.includes('octave down') || command.includes('lower')) {
            setComposition(prev => ({
                ...prev,
                currentOctave: Math.max(prev.currentOctave - 1, 2)
            }));
            audioPlayer.playUIFeedback(600);
        }
        else if (command.includes('undo')) {
            setComposition(prev => ({
                ...prev,
                notes: prev.notes.slice(0, -1)
            }));
            audioPlayer.playUIFeedback(500);
        }
        else if (command.includes('clear')) {
            setComposition(prev => ({ ...prev, notes: [] }));
            audioPlayer.playUIFeedback(400, 300);
        }
        else if (command.includes('play')) {
            playComposition();
        }

        setTimeout(() => {
            setVoiceState(prev => ({ ...prev, currentSpeech: '', lastCommand: null }));
        }, 2000);
    }, [currentNote, composition.currentOctave, composition.currentAccidental]);

    const activateVoice = () => {
        if (!voiceState.isSupported) return;

        const recognition = new window.webkitSpeechRecognition();
        voiceRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setVoiceState(prev => ({ ...prev, isActive: true }));
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

        recognition.onerror = (event) => {
            console.log('Voice error:', event.error);
        };

        recognition.onend = () => {
            setTimeout(() => {
                try { recognition.start(); } catch (e) {}
            }, 1000);
        };

        recognition.start();
    };

    const playComposition = () => {
        if (composition.notes.length === 0) {
            audioPlayer.playUIFeedback(400, 300);
            return;
        }

        composition.notes.forEach((noteItem, index) => {
            setTimeout(() => {
                audioPlayer.playNote(noteItem.note, noteItem.octave, noteItem.accidental);
                setTimeout(() => audioPlayer.stopNote(), 450);
            }, index * 500);
        });
    };

    const selectNote = (note) => {
        setCurrentNote(note);
        audioPlayer.playNote(note, composition.currentOctave, composition.currentAccidental);
        setTimeout(() => audioPlayer.stopNote(), 500);
    };

    return (
        <div className="basic-music-composer">
            <div className="composer-header">
                <h1>🎵 Sol-fa Music Composer</h1>
                <p>Click notes below, use voice commands to compose</p>
            </div>

            <div className="main-interface">
                <div className="note-selector">
                    <h3>🎵 Select Note</h3>
                    <div className="note-buttons">
                        {['do', 're', 'mi', 'fa', 'sol', 'la', 'ti'].map(note => (
                            <button 
                                key={note}
                                className={`note-button ${currentNote === note ? 'selected' : ''}`}
                                onClick={() => selectNote(note)}
                            >
                                {note.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    
                    <div className="current-selection">
                        <h3>Current: {currentNote ? 
                            `${currentNote.toUpperCase()}${composition.currentOctave}${composition.currentAccidental === 'sharp' ? '♯' : composition.currentAccidental === 'flat' ? '♭' : ''}` : 
                            'None selected'
                        }</h3>
                    </div>
                </div>

                <div className="voice-control">
                    <h3>🎤 Voice Control</h3>
                    {!voiceState.isActive ? (
                        <button onClick={activateVoice} className="activate-voice">
                            🎤 Activate Voice Commands
                        </button>
                    ) : (
                        <div className="voice-feedback">
                            <div className="voice-status active">🎤 Voice Active</div>
                            {voiceState.currentSpeech && (
                                <div className="speech-display">
                                    Speaking: "{voiceState.currentSpeech}"
                                </div>
                            )}
                            {voiceState.lastCommand && (
                                <div className="last-command">
                                    Command: "{voiceState.lastCommand}"
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="voice-commands">
                        <h4>Available Commands:</h4>
                        <ul>
                            <li>"Add" - Add selected note</li>
                            <li>"Sharp" - Make next note sharp ♯</li>
                            <li>"Flat" - Make next note flat ♭</li>
                            <li>"Octave up/down" - Change octave</li>
                            <li>"Undo" - Remove last note</li>
                            <li>"Clear" - Clear all</li>
                            <li>"Play" - Play composition</li>
                        </ul>
                    </div>
                </div>

                <div className="composition-status">
                    <h3>📊 Status</h3>
                    <div className="status-info">
                        <p>Octave: {composition.currentOctave}</p>
                        <p>Accidental: {composition.currentAccidental || 'Natural'}</p>
                        <p>Notes: {composition.notes.length}</p>
                        <p>Voice: {voiceState.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                </div>
            </div>

            <div className="composition-display">
                <h3>🎼 Your Composition</h3>
                {composition.notes.length > 0 ? (
                    <div className="notes-list">
                        {composition.notes.map((note, index) => (
                            <span key={index} className="note-item">
                                {note.note.toUpperCase()}{note.octave}
                                {note.accidental === 'sharp' ? '♯' : note.accidental === 'flat' ? '♭' : ''}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p>No notes yet. Select a note and say "Add"!</p>
                )}
                
                <div className="manual-controls">
                    <button onClick={playComposition}>▶️ Play</button>
                    <button onClick={() => setComposition(prev => ({ ...prev, notes: [] }))}>🗑️ Clear</button>
                </div>
            </div>
        </div>
    );
}

export default BasicMusicComposer;
