// Left hand gesture recognition for UI controls
// These gestures are designed to NOT conflict with Kodály hand signs

const distance = (p1, p2) => Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
);

const getFingerExtension = (landmarks, fingerIndices) => {
    const base = landmarks[fingerIndices[0]];
    const tip = landmarks[fingerIndices[3]];
    const directDistance = distance(base, tip);
    
    let segmentLength = 0;
    for (let i = 0; i < 3; i++) {
        segmentLength += distance(
            landmarks[fingerIndices[i]], 
            landmarks[fingerIndices[i + 1]]
        );
    }
    
    return segmentLength > 0 ? directDistance / segmentLength : 0;
};

const analyzeLeftHandShape = (landmarks) => {
    const FINGERS = {
        THUMB: [1, 2, 3, 4],
        INDEX: [5, 6, 7, 8],
        MIDDLE: [9, 10, 11, 12],
        RING: [13, 14, 15, 16],
        PINKY: [17, 18, 19, 20]
    };

    const extensions = {
        thumb: getFingerExtension(landmarks, FINGERS.THUMB),
        index: getFingerExtension(landmarks, FINGERS.INDEX),
        middle: getFingerExtension(landmarks, FINGERS.MIDDLE),
        ring: getFingerExtension(landmarks, FINGERS.RING),
        pinky: getFingerExtension(landmarks, FINGERS.PINKY)
    };

    // Get thumb direction for thumbs up/down
    const thumbTip = landmarks[4];
    const thumbBase = landmarks[1];
    const wrist = landmarks[0];
    
    const thumbDirection = {
        y: thumbTip.y - wrist.y
    };

    return {
        extensions,
        thumbDirection,
        fingersExtended: Object.values(extensions).filter(ext => ext > 0.7).length,
        allFingersClosed: Object.values(extensions).every(ext => ext < 0.4),
        isThumbUp: extensions.thumb > 0.7 && thumbDirection.y < -0.1,
        isThumbDown: extensions.thumb > 0.7 && thumbDirection.y > 0.1
    };
};

export const recognizeLeftHandGesture = (landmarks) => {
    if (!landmarks || landmarks.length < 21) return null;

    const handShape = analyzeLeftHandShape(landmarks);
    
    // PEACE SIGN - Index and middle extended, others closed
    if (handShape.extensions.index > 0.8 && 
        handShape.extensions.middle > 0.8 && 
        handShape.extensions.ring < 0.4 && 
        handShape.extensions.pinky < 0.4 && 
        handShape.extensions.thumb < 0.5) {
        return {
            gesture: 'PEACE_SIGN',
            action: 'ADD_NOTE',
            confidence: 0.9
        };
    }
    
    // THUMBS UP - Only thumb extended, pointing up
    else if (handShape.isThumbUp && 
             handShape.extensions.index < 0.4 && 
             handShape.extensions.middle < 0.4 && 
             handShape.extensions.ring < 0.4 && 
             handShape.extensions.pinky < 0.4) {
        return {
            gesture: 'THUMBS_UP',
            action: 'OCTAVE_UP',
            confidence: 0.9
        };
    }
    
    // THUMBS DOWN - Only thumb extended, pointing down
    else if (handShape.isThumbDown && 
             handShape.extensions.index < 0.4 && 
             handShape.extensions.middle < 0.4 && 
             handShape.extensions.ring < 0.4 && 
             handShape.extensions.pinky < 0.4) {
        return {
            gesture: 'THUMBS_DOWN',
            action: 'OCTAVE_DOWN',
            confidence: 0.9
        };
    }
    
    // OPEN PALM - All fingers extended
    else if (handShape.fingersExtended >= 4 && 
             handShape.extensions.thumb > 0.7) {
        return {
            gesture: 'OPEN_PALM',
            action: 'PLAY_COMPOSITION',
            confidence: 0.9
        };
    }
    
    // POINTING - Only index finger extended
    else if (handShape.extensions.index > 0.8 && 
             handShape.extensions.middle < 0.4 && 
             handShape.extensions.ring < 0.4 && 
             handShape.extensions.pinky < 0.4 && 
             handShape.extensions.thumb < 0.5) {
        return {
            gesture: 'POINTING',
            action: 'UNDO',
            confidence: 0.9
        };
    }
    
    // CLOSED FIST - All fingers closed
    else if (handShape.allFingersClosed) {
        return {
            gesture: 'CLOSED_FIST',
            action: 'CLEAR_COMPOSITION',
            confidence: 0.9
        };
    }

    return null;
};
