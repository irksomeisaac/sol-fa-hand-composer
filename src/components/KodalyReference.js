import React, { useState } from 'react';
import './KodalyReference.css';

const KODALY_SIGNS = [
    {
        note: 'DO',
        description: 'Closed fist with thumb extended, held horizontally',
        tips: 'Make a fist and keep your thumb visible. Hold your hand steady and horizontal.'
    },
    {
        note: 'RE', 
        description: 'Flat hand with fingers together, angled upward at 45 degrees',
        tips: 'Keep all fingers straight and together. Angle your hand upward like a gentle slope.'
    },
    {
        note: 'MI',
        description: 'Completely flat hand, held perfectly horizontal',
        tips: 'Make your hand as flat as possible. Keep it level - not tilted up or down.'
    },
    {
        note: 'FA',
        description: 'Fist with thumb pointing downward',
        tips: 'Make a tight fist and point your thumb down clearly.'
    },
    {
        note: 'SOL',
        description: 'Curved fingers pointing to the side, back of hand visible',
        tips: 'Curve your fingers naturally and point them sideways so the camera sees the back of your hand.'
    },
    {
        note: 'LA',
        description: 'Relaxed curved hand, fingers pointing downward',
        tips: 'Let your fingers curve naturally and point them down in a relaxed position.'
    },
    {
        note: 'TI',
        description: 'Index finger pointing up, other fingers partially extended',
        tips: 'Point your index finger up clearly while keeping other fingers relaxed and partially bent.'
    }
];

const VOICE_COMMANDS = [
    { command: 'Octave Up', phrase: '"Octave up" or "Higher"' },
    { command: 'Octave Down', phrase: '"Octave down" or "Lower"' },
    { command: 'Start Recording', phrase: '"Record" or "Start recording"' },
    { command: 'Stop Recording', phrase: '"Stop" or "Stop recording"' },
    { command: 'Play Composition', phrase: '"Play" or "Playback"' },
    { command: 'Clear Composition', phrase: '"Clear" or "Reset"' },
    { command: 'Faster Tempo', phrase: '"Faster" or "Speed up"' },
    { command: 'Slower Tempo', phrase: '"Slower" or "Slow down"' }
];

function KodalyReference() {
    const [activeTab, setActiveTab] = useState('signs');

    return (
        <div className="kodaly-reference">
            <div className="reference-tabs">
                <button 
                    className={activeTab === 'signs' ? 'active' : ''}
                    onClick={() => setActiveTab('signs')}
                >
                    Hand Signs
                </button>
                <button 
                    className={activeTab === 'voice' ? 'active' : ''}
                    onClick={() => setActiveTab('voice')}
                >
                    Voice Commands
                </button>
            </div>

            {activeTab === 'signs' && (
                <div className="signs-reference">
                    <h3>Kodály Hand Signs Reference</h3>
                    <div className="signs-grid">
                        {KODALY_SIGNS.map((sign) => (
                            <div key={sign.note} className="sign-card">
                                <div className="sign-header">
                                    <h4>{sign.note}</h4>
                                </div>
                                <div className="sign-image-placeholder">
                                    {/* Placeholder for hand sign image */}
                                    <div className="image-placeholder">
                                        <span>{sign.note}</span>
                                        <small>Hand Sign</small>
                                    </div>
                                </div>
                                <div className="sign-description">
                                    <p><strong>Position:</strong> {sign.description}</p>
                                    <p><strong>Tips:</strong> {sign.tips}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'voice' && (
                <div className="voice-reference">
                    <h3>Voice Commands</h3>
                    <p>Speak these commands clearly to control the app:</p>
                    <div className="commands-grid">
                        {VOICE_COMMANDS.map((cmd, index) => (
                            <div key={index} className="command-card">
                                <h4>{cmd.command}</h4>
                                <p>Say: {cmd.phrase}</p>
                            </div>
                        ))}
                    </div>
                    <div className="voice-tips">
                        <h4>Voice Recognition Tips:</h4>
                        <ul>
                            <li>Speak clearly and at normal volume</li>
                            <li>Wait for the command to execute before speaking again</li>
                            <li>Use the exact phrases shown above</li>
                            <li>Make sure your microphone is enabled</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

export default KodalyReference;
