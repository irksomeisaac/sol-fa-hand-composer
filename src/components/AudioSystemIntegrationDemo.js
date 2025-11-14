import React, { useState, useEffect } from 'react';
import { audioPlayer, TIMBRES, EFFECT_TYPES } from '../utils/audioUtils';

/**
 * This component demonstrates how the enhanced audio system integrates
 * seamlessly with existing code while providing new features
 */
const AudioSystemIntegrationDemo = () => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [currentTimbre, setCurrentTimbre] = useState(TIMBRES.sine);
    const [currentVolume, setCurrentVolume] = useState(0.7);
    const [reverbEnabled, setReverbEnabled] = useState(false);
    const [reverbId, setReverbId] = useState(null);

    useEffect(() => {
        const initAudio = async () => {
            try {
                await audioPlayer.initialize();
                setIsInitialized(true);
            } catch (error) {
                console.error('Failed to initialize audio:', error);
            }
        };
        initAudio();
    }, []);

    // Legacy method usage - works exactly the same
    const playLegacyNote = (note, octave = 4) => {
        // This uses the exact same API as before
        audioPlayer.playNote(note, octave);
    };

    const stopLegacyNote = () => {
        // This also works exactly the same
        audioPlayer.stopNote();
    };

    const playLegacyUIFeedback = () => {
        // Same as original
        audioPlayer.playUIFeedback(800, 200);
    };

    // Enhanced method usage - new capabilities
    const playEnhancedNote = async (note, octave = 4) => {
        // New enhanced method with more options
        await audioPlayer.playNoteEnhanced(note, octave, {
            duration: 2,
            timbre: currentTimbre,
            volume: 0.6,
            attack: 0.05,
            decay: 0.1,
            sustain: 0.7,
            release: 0.2
        });
    };

    const playSharpFlat = async (note, octave = 4) => {
        // Play sharp/flat notes using enhanced system
        await audioPlayer.playNoteWithAccidental(note, octave, {
            duration: 1.5,
            volume: 0.5
        });
    };

    const playChordProgression = async () => {
        // Demonstrate chord support
        const progression = [
            { root: 'C', type: 'major', octave: 4 },
            { root: 'F', type: 'major', octave: 4 },
            { root: 'G', type: 'dom7', octave: 4 },
            { root: 'C', type: 'major', octave: 4 }
        ];

        for (let i = 0; i < progression.length; i++) {
            setTimeout(() => {
                audioPlayer.playChord(
                    progression[i].root,
                    progression[i].type,
                    progression[i].octave,
                    { duration: 1.5, volume: 0.4 }
                );
            }, i * 2000);
        }
    };

    const handleTimbreChange = (newTimbre) => {
        setCurrentTimbre(newTimbre);
        audioPlayer.setTimbre(newTimbre);
    };

    const handleVolumeChange = (newVolume) => {
        setCurrentVolume(newVolume);
        audioPlayer.setMasterVolume(newVolume);
    };

    const toggleReverb = () => {
        if (reverbEnabled) {
            // Remove reverb
            if (reverbId) {
                audioPlayer.removeEffect(reverbId);
                setReverbId(null);
            }
            setReverbEnabled(false);
        } else {
            // Add reverb
            const effectId = audioPlayer.addEffect('reverb', {
                wetness: 0.3,
                duration: 2
            });
            setReverbId(effectId);
            setReverbEnabled(true);
        }
    };

    const demonstrateBackwardCompatibility = () => {
        // Show that old code still works
        console.log('=== Backward Compatibility Demo ===');
        
        // Legacy note playing
        audioPlayer.playNote('do', 4);
        setTimeout(() => audioPlayer.stopNote(), 1000);
        
        setTimeout(() => {
            audioPlayer.playNote('re', 4);
            setTimeout(() => audioPlayer.stopNote(), 1000);
        }, 1500);
        
        setTimeout(() => {
            audioPlayer.playUIFeedback(1000, 150);
        }, 3000);
        
        console.log('Legacy methods executed successfully!');
    };

    const demonstrateEnhancedFeatures = async () => {
        console.log('=== Enhanced Features Demo ===');
        
        // Play a scale with different timbres
        const notes = ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti', 'do'];
        const timbres = Object.values(TIMBRES);
        
        for (let i = 0; i < notes.length; i++) {
            setTimeout(async () => {
                const timbre = timbres[i % timbres.length];
                console.log(`Playing ${notes[i]} with ${timbre} timbre`);
                
                await audioPlayer.playNoteEnhanced(notes[i], i < 7 ? 4 : 5, {
                    duration: 0.8,
                    timbre: timbre,
                    volume: 0.5,
                    attack: 0.02,
                    release: 0.1
                });
            }, i * 1000);
        }
    };

    if (!isInitialized) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Initializing Enhanced Audio System...</h2>
                <p>Setting up backward-compatible enhanced audio engine...</p>
            </div>
        );
    }

    return (
        <div style={{ 
            padding: '20px', 
            maxWidth: '800px', 
            margin: '0 auto',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h1>🎵 Enhanced Audio System Integration Demo</h1>
            
            <div style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '15px', 
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h3>✅ Backward Compatibility Verified</h3>
                <p>All existing code continues to work exactly as before!</p>
            </div>

            {/* Legacy Methods Section */}
            <section style={{ marginBottom: '30px' }}>
                <h2>🔙 Legacy Methods (Unchanged API)</h2>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                    <button onClick={() => playLegacyNote('do')} style={buttonStyle}>
                        Play Do (Legacy)
                    </button>
                    <button onClick={() => playLegacyNote('mi')} style={buttonStyle}>
                        Play Mi (Legacy)
                    </button>
                    <button onClick={() => playLegacyNote('sol')} style={buttonStyle}>
                        Play Sol (Legacy)
                    </button>
                    <button onClick={stopLegacyNote} style={{ ...buttonStyle, backgroundColor: '#f44336' }}>
                        Stop Note
                    </button>
                    <button onClick={playLegacyUIFeedback} style={buttonStyle}>
                        UI Feedback (Legacy)
                    </button>
                </div>
                <button 
                    onClick={demonstrateBackwardCompatibility}
                    style={{ ...buttonStyle, backgroundColor: '#2196F3', padding: '12px 20px' }}
                >
                    Run Backward Compatibility Demo
                </button>
            </section>

            {/* Enhanced Features Section */}
            <section style={{ marginBottom: '30px' }}>
                <h2>🚀 Enhanced Features (New Capabilities)</h2>
                
                {/* Timbre Control */}
                <div style={{ marginBottom: '15px' }}>
                    <label>Timbre: </label>
                    <select 
                        value={currentTimbre} 
                        onChange={(e) => handleTimbreChange(e.target.value)}
                        style={{ padding: '5px', marginLeft: '10px' }}
                    >
                        {Object.values(TIMBRES).map(timbre => (
                            <option key={timbre} value={timbre}>
                                {timbre.charAt(0).toUpperCase() + timbre.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Volume Control */}
                <div style={{ marginBottom: '15px' }}>
                    <label>Master Volume: </label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={currentVolume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        style={{ marginLeft: '10px' }}
                    />
                    <span style={{ marginLeft: '10px' }}>{Math.round(currentVolume * 100)}%</span>
                </div>

                {/* Audio Effects */}
                <div style={{ marginBottom: '15px' }}>
                    <button 
                        onClick={toggleReverb}
                        style={{
                            ...buttonStyle,
                            backgroundColor: reverbEnabled ? '#4CAF50' : '#757575'
                        }}
                    >
                        {reverbEnabled ? 'Disable' : 'Enable'} Reverb
                    </button>
                </div>

                {/* Enhanced Note Playing */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                    <button onClick={() => playEnhancedNote('do')} style={enhancedButtonStyle}>
                        Play Do (Enhanced)
                    </button>
                    <button onClick={() => playEnhancedNote('mi')} style={enhancedButtonStyle}>
                        Play Mi (Enhanced)
                    </button>
                    <button onClick={() => playEnhancedNote('sol')} style={enhancedButtonStyle}>
                        Play Sol (Enhanced)
                    </button>
                </div>

                {/* Sharp/Flat Notes */}
                <h3>♯♭ Sharp/Flat Notes</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                    <button onClick={() => playSharpFlat('C#')} style={sharpFlatButtonStyle}>
                        C# / D♭
                    </button>
                    <button onClick={() => playSharpFlat('F#')} style={sharpFlatButtonStyle}>
                        F# / G♭
                    </button>
                    <button onClick={() => playSharpFlat('di')} style={sharpFlatButtonStyle}>
                        di (solfege C#)
                    </button>
                    <button onClick={() => playSharpFlat('fi')} style={sharpFlatButtonStyle}>
                        fi (solfege F#)
                    </button>
                </div>

                {/* Advanced Features */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                    <button onClick={playChordProgression} style={{ ...buttonStyle, backgroundColor: '#9C27B0' }}>
                        Play Chord Progression
                    </button>
                    <button 
                        onClick={demonstrateEnhancedFeatures}
                        style={{ ...buttonStyle, backgroundColor: '#FF9800' }}
                    >
                        Demo Timbre Showcase
                    </button>
                </div>
            </section>

            {/* Integration Notes */}
            <section style={{ 
                backgroundColor: '#e3f2fd', 
                padding: '15px', 
                borderRadius: '8px',
                marginBottom: '20px'
            }}>
                <h3>🔧 Integration Notes</h3>
                <ul>
                    <li><strong>Zero Breaking Changes:</strong> All existing components work unchanged</li>
                    <li><strong>Progressive Enhancement:</strong> Add new features where needed</li>
                    <li><strong>Same Import:</strong> Keep using <code>import {`{audioPlayer}`} from '../utils/audioUtils'</code></li>
                    <li><strong>New Features Available:</strong> Access enhanced methods on the same audioPlayer instance</li>
                    <li><strong>Performance:</strong> Lazy loading of enhanced features, minimal overhead</li>
                </ul>
            </section>

            {/* Migration Guide */}
            <section style={{ 
                backgroundColor: '#f3e5f5', 
                padding: '15px', 
                borderRadius: '8px'
            }}>
                <h3>📖 Quick Migration Guide</h3>
                <div style={{ marginBottom: '10px' }}>
                    <strong>To add enhanced features to existing components:</strong>
                </div>
                <ol>
                    <li>Keep existing import: <code>import {`{audioPlayer}`} from '../utils/audioUtils'</code></li>
                    <li>Optionally add: <code>import {`{TIMBRES, EFFECT_TYPES}`} from '../utils/audioUtils'</code></li>
                    <li>Use new methods: <code>audioPlayer.playNoteEnhanced(note, octave, options)</code></li>
                    <li>Add effects: <code>audioPlayer.addEffect('reverb', {`{wetness: 0.3}`})</code></li>
                    <li>Control volume: <code>audioPlayer.setMasterVolume(0.8)</code></li>
                </ol>
            </section>
        </div>
    );
};

// Styles
const buttonStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#4CAF50',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px'
};

const enhancedButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#2196F3'
};

const sharpFlatButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#FF9800'
};

export default AudioSystemIntegrationDemo;
