import React, { useState } from 'react';
import HandDetection from './HandDetection';
import SimpleVoiceController from './SimpleVoiceController';
import './ComposerApp.css';

function ComposerApp() {
    return (
        <div className="composer-app">
            <div className="app-container">
                <div className="detection-section">
                    <HandDetection />
                </div>
                
                <div className="voice-section">
                    <SimpleVoiceController 
                        currentNote={null} // We'll connect this later
                    />
                </div>
            </div>
        </div>
    );
}

export default ComposerApp;
