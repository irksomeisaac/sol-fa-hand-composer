/**
 * Integration example for Flat Hand Detection in Sol-Fa App
 * Shows how to integrate flat hand detection with existing musical education features
 */

import React, { useState, useEffect, useRef } from 'react';
import { detectFlatHandMultiple } from '../utils/flatHandDetection';

const HandGestureIntegration = ({ onGestureDetected, currentNote }) => {
  const [gestureState, setGestureState] = useState({
    isActive: false,
    detectedGesture: null,
    confidence: 0
  });
  
  const [settings, setSettings] = useState({
    enableFlatHandDetection: true,
    confidenceThreshold: 0.7,
    gestureTimeout: 1000, // ms to hold gesture
  });
  
  const gestureTimeoutRef = useRef(null);
  const lastDetectionTime = useRef(0);
  
  // Handle MediaPipe results from parent component
  const handleMediaPipeResults = (results) => {
    if (!settings.enableFlatHandDetection || !results.multiHandLandmarks) {
      return;
    }
    
    const detections = detectFlatHandMultiple(results);
    const flatHands = detections.filter(d => 
      d.isFlatHand && d.confidence >= settings.confidenceThreshold
    );
    
    if (flatHands.length > 0) {
      handleFlatHandDetected(flatHands[0]);
    } else {
      handleNoFlatHand();
    }
  };
  
  // Handle flat hand detection
  const handleFlatHandDetected = (detection) => {
    const now = Date.now();
    lastDetectionTime.current = now;
    
    setGestureState({
      isActive: true,
      detectedGesture: 'flat_hand',
      confidence: detection.confidence
    });
    
    // Clear any existing timeout
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
    }
    
    // Set timeout to trigger action
    gestureTimeoutRef.current = setTimeout(() => {
      if (Date.now() - lastDetectionTime.current >= settings.gestureTimeout) {
        triggerFlatHandAction(detection);
      }
    }, settings.gestureTimeout);
  };
  
  // Handle no flat hand detected
  const handleNoFlatHand = () => {
    setGestureState(prev => ({
      ...prev,
      isActive: false
    }));
    
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = null;
    }
  };
  
  // Trigger action when flat hand is held
  const triggerFlatHandAction = (detection) => {
    // Example actions for musical education:
    
    if (currentNote) {
      // 1. Confirm note selection
      onGestureDetected?.({
        type: 'confirm_note',
        note: currentNote,
        confidence: detection.confidence,
        timestamp: Date.now()
      });
    } else {
      // 2. Start/stop playback
      onGestureDetected?.({
        type: 'toggle_playback',
        confidence: detection.confidence,
        timestamp: Date.now()
      });
    }
    
    // Reset gesture state
    setGestureState(prev => ({
      ...prev,
      isActive: false
    }));
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }
    };
  }, []);
  
  // Expose handler for parent component
  useEffect(() => {
    // This would be called from parent component with MediaPipe results
    window.handleHandGesture = handleMediaPipeResults;
    
    return () => {
      delete window.handleHandGesture;
    };
  }, [settings]);
  
  return (
    <div className="hand-gesture-integration">
      {/* Gesture Status Indicator */}
      <div className="gesture-status mb-4">
        <div className={`status-indicator ${gestureState.isActive ? 'active' : 'inactive'}`}>
          <div className={`status-light ${gestureState.isActive ? 'green' : 'gray'}`}></div>
          <span className="status-text">
            {gestureState.isActive 
              ? `Flat Hand Detected (${(gestureState.confidence * 100).toFixed(1)}%)`
              : 'Show flat hand to interact'
            }
          </span>
        </div>
        
        {gestureState.isActive && (
          <div className="gesture-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{
                  animation: `fillProgress ${settings.gestureTimeout}ms linear`
                }}
              ></div>
            </div>
            <span className="progress-text">Hold to confirm...</span>
          </div>
        )}
      </div>
      
      {/* Settings Panel */}
      <div className="gesture-settings">
        <h4>Hand Gesture Settings</h4>
        
        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.enableFlatHandDetection}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              enableFlatHandDetection: e.target.checked
            }))}
          />
          Enable Flat Hand Detection
        </label>
        
        <label className="setting-item">
          <span>Confidence Threshold: {settings.confidenceThreshold}</span>
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={settings.confidenceThreshold}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              confidenceThreshold: parseFloat(e.target.value)
            }))}
          />
        </label>
        
        <label className="setting-item">
          <span>Hold Duration: {settings.gestureTimeout}ms</span>
          <input
            type="range"
            min="500"
            max="3000"
            step="100"
            value={settings.gestureTimeout}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              gestureTimeout: parseInt(e.target.value)
            }))}
          />
        </label>
      </div>
      
      {/* Usage Instructions */}
      <div className="usage-instructions">
        <h4>How to Use</h4>
        <ul>
          <li>📋 <strong>Select a note:</strong> Point to a note, then show flat hand to confirm</li>
          <li>▶️ <strong>Play/Pause:</strong> Show flat hand when no note is selected</li>
          <li>✋ <strong>Flat hand:</strong> All five fingers extended, palm facing camera</li>
          <li>⏱️ <strong>Hold gesture:</strong> Keep hand steady for {settings.gestureTimeout}ms</li>
        </ul>
      </div>
    </div>
  );
};

// CSS styles (would typically be in a separate CSS file)
const styles = `
.hand-gesture-integration {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
}

.gesture-status {
  background: white;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.status-light {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ccc;
}

.status-light.green {
  background: #4ade80;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.5);
}

.status-text {
  font-weight: 500;
  color: #374151;
}

.gesture-progress {
  margin-top: 8px;
}

.progress-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4ade80;
  width: 0;
}

@keyframes fillProgress {
  from { width: 0; }
  to { width: 100%; }
}

.progress-text {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  display: block;
}

.gesture-settings {
  background: white;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 16px;
}

.gesture-settings h4 {
  margin: 0 0 12px 0;
  color: #374151;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.setting-item input[type="range"] {
  width: 100px;
}

.usage-instructions {
  background: white;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.usage-instructions h4 {
  margin: 0 0 8px 0;
  color: #374151;
}

.usage-instructions ul {
  margin: 0;
  padding-left: 16px;
}

.usage-instructions li {
  margin-bottom: 4px;
  font-size: 14px;
  color: #4b5563;
}
`;

// Example usage in main App component
export const ExampleUsage = () => {
  const [currentNote, setCurrentNote] = useState(null);
  const [playbackState, setPlaybackState] = useState(false);
  
  const handleGestureDetected = (gesture) => {
    console.log('Gesture detected:', gesture);
    
    switch (gesture.type) {
      case 'confirm_note':
        console.log(`Confirmed note: ${gesture.note}`);
        // Play the note or trigger associated action
        break;
        
      case 'toggle_playback':
        setPlaybackState(prev => !prev);
        console.log(`Playback ${!playbackState ? 'started' : 'stopped'}`);
        break;
        
      default:
        console.log('Unknown gesture type:', gesture.type);
    }
  };
  
  return (
    <div>
      {/* Main app content */}
      <div className="musical-interface">
        <h2>Musical Notes</h2>
        {/* Note selection interface would go here */}
        <p>Current note: {currentNote || 'None selected'}</p>
        <p>Playback: {playbackState ? 'Playing' : 'Stopped'}</p>
      </div>
      
      {/* Hand gesture integration */}
      <HandGestureIntegration
        onGestureDetected={handleGestureDetected}
        currentNote={currentNote}
      />
      
      {/* Inject styles */}
      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </div>
  );
};

export default HandGestureIntegration;
