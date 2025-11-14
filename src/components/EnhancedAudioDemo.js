import React, { useState, useEffect, useRef } from 'react';
import { audioPlayer, TIMBRES, EFFECT_TYPES } from '../utils/enhancedAudioUtils';
import './EnhancedAudioDemo.css';

const EnhancedAudioDemo = () => {
    const [settings, setSettings] = useState({
        masterVolume: 0.7,
        tempo: 120,
        timbre: TIMBRES.sine,
        transitionTime: 0.05
    });
    
    const [activeEffects, setActiveEffects] = useState([]);
    const [currentlyPlaying, setCurrentlyPlaying] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize audio engine
    useEffect(() => {
        const init = async () => {
            try {
                await audioPlayer.initialize();
                setIsInitialized(true);
                setSettings(audioPlayer.getSettings());
            } catch (error) {
                console.error('Failed to initialize audio:', error);
            }
        };
        init();
    }, []);

    // Update playing notes display
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentlyPlaying(audioPlayer.getCurrentlyPlayingNotes());
        }, 100);
        
        return () => clearInterval(interval);
    }, []);

    const handleVolumeChange = (e) => {
        const volume = parseFloat(e.target.value);
        audioPlayer.setMasterVolume(volume);
        setSettings(prev => ({ ...prev, masterVolume: volume }));
    };

    const handleTempoChange = (e) => {
        const tempo = parseInt(e.target.value);
        audioPlayer.setTempo(tempo);
        setSettings(prev => ({ ...prev, tempo }));
    };

    const handleTimbreChange = (e) => {
        const timbre = e.target.value;
        audioPlayer.setTimbre(timbre);
        setSettings(prev => ({ ...prev, timbre }));
    };

    const handleTransitionTimeChange = (e) => {
        const time = parseFloat(e.target.value);
        audioPlayer.setTransitionTime(time);
        setSettings(prev => ({ ...prev, transitionTime: time }));
    };

    const playNote = (note, octave = 4, options = {}) => {
        if (!isInitialized) return;
        audioPlayer.playNoteEnhanced(note, octave, {
            duration: 2, // 2 second duration
            ...options
        });
    };

    const playChord = (root, type = 'major', octave = 4) => {
        if (!isInitialized) return;
        audioPlayer.playChord(root, type, octave, {
            duration: 3,
            volume: 0.5
        });
    };

    const playSequence = () => {
        if (!isInitialized) return;
        
        const sequence = [
            'do', 're', 'mi', 'fa', 'sol', 'la', 'ti', 'do'
        ];
        
        audioPlayer.playSequence(sequence, {
            tempo: settings.tempo,
            octave: 4,
            noteLength: 0.5,
            gap: 0.1
        });
    };

    const playArpeggio = () => {
        if (!isInitialized) return;
        audioPlayer.playArpeggio('C', 'major', 4, {
            direction: 'up',
            speed: 200
        });
    };

    const playGlissando = () => {
        if (!isInitialized) return;
        audioPlayer.playGlissando('do', 'sol', 4, 5, 1500);
    };

    const addEffect = (type) => {
        if (!isInitialized) return;
        
        const defaultParams = {
            reverb: { wetness: 0.3, duration: 2 },
            delay: { delayTime: 0.3, feedback: 0.4, wetness: 0.5 },
            chorus: { rate: 0.5, depth: 0.01, wetness: 0.5 },
            distortion: { amount: 50 },
            lowpass: { frequency: 1000, Q: 1 },
            highpass: { frequency: 200, Q: 1 }
        };
        
        const effectId = audioPlayer.addEffect(type, defaultParams[type]);
        if (effectId) {
            setActiveEffects(prev => [...prev, { id: effectId, type }]);
        }
    };

    const removeEffect = (effectId) => {
        audioPlayer.removeEffect(effectId);
        setActiveEffects(prev => prev.filter(effect => effect.id !== effectId));
    };

    const clearAllEffects = () => {
        audioPlayer.clearEffects();
        setActiveEffects([]);
    };

    const stopAllNotes = () => {
        audioPlayer.stopAllNotes();
    };

    const playUIFeedback = (type) => {
        audioPlayer.playEnhancedUIFeedback(type);
    };

    if (!isInitialized) {
        return (
            <div className="enhanced-audio-demo">
                <div className="loading">
                    <h2>Initializing Enhanced Audio Engine...</h2>
                    <p>Please wait while we set up the audio system.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="enhanced-audio-demo">
            <h1>Enhanced Audio System Demo</h1>
            
            {/* Audio Settings */}
            <section className="settings-section">
                <h2>Audio Settings</h2>
                <div className="settings-grid">
                    <div className="setting-item">
                        <label htmlFor="volume">Master Volume:</label>
                        <input
                            id="volume"
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={settings.masterVolume}
                            onChange={handleVolumeChange}
                        />
                        <span>{Math.round(settings.masterVolume * 100)}%</span>
                    </div>
                    
                    <div className="setting-item">
                        <label htmlFor="tempo">Tempo (BPM):</label>
                        <input
                            id="tempo"
                            type="range"
                            min="60"
                            max="200"
                            value={settings.tempo}
                            onChange={handleTempoChange}
                        />
                        <span>{settings.tempo}</span>
                    </div>
                    
                    <div className="setting-item">
                        <label htmlFor="timbre">Timbre:</label>
                        <select id="timbre" value={settings.timbre} onChange={handleTimbreChange}>
                            {Object.values(TIMBRES).map(timbre => (
                                <option key={timbre} value={timbre}>
                                    {timbre.charAt(0).toUpperCase() + timbre.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="setting-item">
                        <label htmlFor="transition">Transition Time:</label>
                        <input
                            id="transition"
                            type="range"
                            min="0.001"
                            max="0.5"
                            step="0.001"
                            value={settings.transitionTime}
                            onChange={handleTransitionTimeChange}
                        />
                        <span>{(settings.transitionTime * 1000).toFixed(0)}ms</span>
                    </div>
                </div>
            </section>

            {/* Note Playing */}
            <section className="notes-section">
                <h2>Notes & Chords</h2>
                
                <div className="notes-grid">
                    <h3>Solfege Notes</h3>
                    <div className="button-grid">
                        {['do', 're', 'mi', 'fa', 'sol', 'la', 'ti'].map(note => (
                            <button key={note} onClick={() => playNote(note)} className="note-button">
                                {note}
                            </button>
                        ))}
                    </div>
                    
                    <h3>Chromatic Notes (with sharps/flats)</h3>
                    <div className="button-grid">
                        {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(note => (
                            <button key={note} onClick={() => playNote(note)} className="note-button">
                                {note}
                            </button>
                        ))}
                    </div>
                    
                    <h3>Solfege with Accidentals</h3>
                    <div className="button-grid">
                        {['di', 'ri', 'fi', 'si', 'li', 'ra', 'me', 'se', 'le', 'te'].map(note => (
                            <button key={note} onClick={() => playNote(note)} className="note-button accidental">
                                {note}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="chords-grid">
                    <h3>Chords</h3>
                    <div className="button-grid">
                        <button onClick={() => playChord('C', 'major')}>C Major</button>
                        <button onClick={() => playChord('C', 'minor')}>C Minor</button>
                        <button onClick={() => playChord('C', 'major7')}>C Major 7</button>
                        <button onClick={() => playChord('C', 'minor7')}>C Minor 7</button>
                        <button onClick={() => playChord('G', 'dom7')}>G7</button>
                        <button onClick={() => playChord('F', 'major')}>F Major</button>
                    </div>
                </div>
            </section>

            {/* Sequences and Special Effects */}
            <section className="sequences-section">
                <h2>Sequences & Special Effects</h2>
                <div className="button-grid">
                    <button onClick={playSequence} className="sequence-button">
                        Play Scale Sequence
                    </button>
                    <button onClick={playArpeggio} className="sequence-button">
                        Play C Major Arpeggio
                    </button>
                    <button onClick={playGlissando} className="sequence-button">
                        Play Glissando
                    </button>
                </div>
            </section>

            {/* Audio Effects */}
            <section className="effects-section">
                <h2>Audio Effects</h2>
                <div className="effects-controls">
                    <div className="add-effects">
                        <h3>Add Effects:</h3>
                        <div className="button-grid">
                            {Object.values(EFFECT_TYPES).map(effect => (
                                <button 
                                    key={effect} 
                                    onClick={() => addEffect(effect)}
                                    className="effect-button"
                                >
                                    Add {effect.charAt(0).toUpperCase() + effect.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="active-effects">
                        <h3>Active Effects:</h3>
                        {activeEffects.length === 0 ? (
                            <p>No effects active</p>
                        ) : (
                            <div className="effect-list">
                                {activeEffects.map(effect => (
                                    <div key={effect.id} className="active-effect">
                                        <span>{effect.type}</span>
                                        <button 
                                            onClick={() => removeEffect(effect.id)}
                                            className="remove-button"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                                <button onClick={clearAllEffects} className="clear-all-button">
                                    Clear All Effects
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* UI Feedback */}
            <section className="feedback-section">
                <h2>UI Feedback Sounds</h2>
                <div className="button-grid">
                    <button onClick={() => playUIFeedback('success')} className="feedback-button success">
                        Success Sound
                    </button>
                    <button onClick={() => playUIFeedback('error')} className="feedback-button error">
                        Error Sound
                    </button>
                    <button onClick={() => playUIFeedback('warning')} className="feedback-button warning">
                        Warning Sound
                    </button>
                    <button onClick={() => playUIFeedback('info')} className="feedback-button info">
                        Info Sound
                    </button>
                    <button onClick={() => playUIFeedback('click')} className="feedback-button click">
                        Click Sound
                    </button>
                </div>
            </section>

            {/* Control Panel */}
            <section className="control-panel">
                <h2>Control Panel</h2>
                <div className="button-grid">
                    <button onClick={stopAllNotes} className="control-button stop">
                        Stop All Notes
                    </button>
                </div>
            </section>

            {/* Currently Playing Display */}
            <section className="status-section">
                <h2>Currently Playing</h2>
                {currentlyPlaying.length === 0 ? (
                    <p>No notes currently playing</p>
                ) : (
                    <div className="playing-notes">
                        {currentlyPlaying.map(note => (
                            <div key={note.id} className="playing-note">
                                <strong>{note.note.toUpperCase()}{note.octave}</strong>
                                <span>{Math.round(note.frequency)}Hz</span>
                                <span>{((Date.now() - note.startTime * 1000) / 1000).toFixed(1)}s</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default EnhancedAudioDemo;
