// Two-hand detection and gesture management
import { recognizeKodalySign } from './kodalySignsDB';

// Left hand UI navigation gestures
export const LEFT_HAND_GESTURES = {
    OCTAVE_UP: 'octave_up',
    OCTAVE_DOWN: 'octave_down',
    RECORD_TOGGLE: 'record_toggle',
    PLAY_TOGGLE: 'play_toggle',
    CLEAR: 'clear',
    TEMPO_UP: 'tempo_up',
    TEMPO_DOWN: 'tempo_down'
};

// Simple left hand gestures based on basic hand shapes
const recognizeLeftHandGesture = (landmarks) => {
    if (!landmarks || landmarks.length < 21) return null;

    // Analyze basic hand shape for UI controls
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];

    // Calculate finger extensions (simplified)
    const thumbExtended = distance(landmarks[1], thumbTip) > 0.08;
    const indexExtended = distance(landmarks[5], indexTip) > 0.1;
    const middleExtended = distance(landmarks[9], middleTip) > 0.1;
    const ringExtended = distance(landmarks[13], ringTip) > 0.1;
    const pinkyExtended = distance(landmarks[17], pinkyTip) > 0.1;

    // Hand direction for up/down gestures
    const handDirection = {
        y: middleTip.y - wrist.y
    };

    // Simple gesture recognition
    
    // Thumbs up - Octave Up
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        return LEFT_HAND_GESTURES.OCTAVE_UP;
    }
    
    // Thumbs down - Octave Down  
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended &&
        handDirection.y > 0.1) {
        return LEFT_HAND_GESTURES.OCTAVE_DOWN;
    }
    
    // Index finger up - Record Toggle
    if (!thumbExtended && indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        return LEFT_HAND_GESTURES.RECORD_TOGGLE;
    }
    
    // Peace sign (index + middle) - Play Toggle
    if (!thumbExtended && indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
        return LEFT_HAND_GESTURES.PLAY_TOGGLE;
    }
    
    // Open hand - Clear
    if (thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
        return LEFT_HAND_GESTURES.CLEAR;
    }

    return null;
};

const distance = (p1, p2) => Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
);

export const analyzeBothHands = (results) => {
    let leftHand = null;
    let rightHand = null;
    let leftHandGesture = null;
    let rightHandNote = null;

    if (results.multiHandLandmarks && results.multiHandedness) {
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i];
            
            // Mirror landmarks for processing
            const mirroredLandmarks = landmarks.map(landmark => ({
                ...landmark,
                x: 1 - landmark.x
            }));

            // MediaPipe labels are from the perspective of the person, so:
            // "Left" means the person's left hand (appears on right side of camera)
            // "Right" means the person's right hand (appears on left side of camera)
            const isLeftHand = handedness.label === 'Left';
            
            if (isLeftHand) {
                // Left hand - UI navigation
                leftHand = mirroredLandmarks;
                leftHandGesture = recognizeLeftHandGesture(mirroredLandmarks);
            } else {
                // Right hand - musical notes
                rightHand = mirroredLandmarks;
                rightHandNote = recognizeKodalySign(mirroredLandmarks);
            }
        }
    }

    return {
        leftHand,
        rightHand,
        leftHandGesture,
        rightHandNote
    };
};
