// Constants for finger joints
const FINGERS = {
    THUMB: [1, 2, 3, 4],
    INDEX: [5, 6, 7, 8],
    MIDDLE: [9, 10, 11, 12],
    RING: [13, 14, 15, 16],
    PINKY: [17, 18, 19, 20]
};

// Basic helper functions
function distance(p1, p2) {
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2) +
        Math.pow(p1.z - p2.z, 2)
    );
}

function normalize(vector) {
    const magnitude = Math.sqrt(
        vector.x * vector.x +
        vector.y * vector.y +
        vector.z * vector.z
    );
    if (magnitude === 0) return { x: 0, y: 0, z: 0 };
    return {
        x: vector.x / magnitude,
        y: vector.y / magnitude,
        z: vector.z / magnitude
    };
}

function getFingerExtension(landmarks, fingerIndices) {
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
}

function analyzeFingers(landmarks) {
    if (!landmarks) return { values: {} };

    return {
        values: {
            thumb: getFingerExtension(landmarks, FINGERS.THUMB),
            index: getFingerExtension(landmarks, FINGERS.INDEX),
            middle: getFingerExtension(landmarks, FINGERS.MIDDLE),
            ring: getFingerExtension(landmarks, FINGERS.RING),
            pinky: getFingerExtension(landmarks, FINGERS.PINKY)
        }
    };
}

function getHandDirection(landmarks) {
    const wrist = landmarks[0];
    const middle_tip = landmarks[12];

    const dir = {
        x: middle_tip.x - wrist.x,
        y: middle_tip.y - wrist.y,
        z: middle_tip.z - wrist.z
    };

    const normalized = normalize(dir);
    const verticalAngle = Math.atan2(-normalized.y, 
        Math.sqrt(normalized.x * normalized.x + normalized.z * normalized.z)) * (180 / Math.PI);

    return {
        direction: normalized,
        verticalAngle,
        isPointingUp: verticalAngle > 45,
        isPointingDown: verticalAngle < -45,
        isPointingForward: Math.abs(normalized.z) > Math.max(Math.abs(normalized.x), Math.abs(normalized.y)),
        isHorizontal: Math.abs(verticalAngle) < 20
    };
}

function getPalmDirection(landmarks) {
    const wrist = landmarks[0];
    const indexBase = landmarks[5];
    const pinkyBase = landmarks[17];

    const v1 = {
        x: indexBase.x - wrist.x,
        y: indexBase.y - wrist.y,
        z: indexBase.z - wrist.z
    };
    const v2 = {
        x: pinkyBase.x - wrist.x,
        y: pinkyBase.y - wrist.y,
        z: pinkyBase.z - wrist.z
    };

    const normal = {
        x: v1.y * v2.z - v1.z * v2.y,
        y: v1.z * v2.x - v1.x * v2.z,
        z: v1.x * v2.y - v1.y * v2.x
    };

    const normalized = normalize(normal);

    return {
        normal: normalized,
        isDown: normalized.y > 0.5,
        isUp: normalized.y < -0.5,
        isSide: Math.abs(normalized.x) > 0.5
    };
}

function getThumbDirection(landmarks) {
    const thumbBase = landmarks[1];
    const thumbTip = landmarks[4];

    const dir = normalize({
        x: thumbTip.x - thumbBase.x,
        y: thumbTip.y - thumbBase.y,
        z: thumbTip.z - thumbBase.z
    });

    const angle = Math.atan2(-dir.y, Math.sqrt(dir.x * dir.x + dir.z * dir.z)) * (180 / Math.PI);

    return {
        angle,
        isPointingDown: angle < -30,
        isPointingUp: angle > 30
    };
}

export function recognizeKodalySign(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;

    const fingers = analyzeFingers(landmarks);
    const handDir = getHandDirection(landmarks);
    const palmDir = getPalmDirection(landmarks);
    const thumbDir = getThumbDirection(landmarks);

    const debug = {
        extensions: fingers.values,
        handDirection: {
            verticalAngle: handDir.verticalAngle,
            isPointingUp: handDir.isPointingUp,
            isPointingDown: handDir.isPointingDown,
            isPointingForward: handDir.isPointingForward,
            isHorizontal: handDir.isHorizontal
        },
        palmOrientation: {
            isDown: palmDir.isDown,
            isUp: palmDir.isUp,
            isSide: palmDir.isSide
        },
        thumbDirection: {
            angle: thumbDir.angle,
            isPointingDown: thumbDir.isPointingDown,
            isPointingUp: thumbDir.isPointingUp
        }
    };

    let sign = null;
    let confidence = 0;

    // DO - Based on your screenshot values
    if (fingers.values.thumb > 0.9 &&        // Thumb extended (100%)
        fingers.values.index > 0.55 &&       // Index around 64%
        fingers.values.index < 0.75 &&
        fingers.values.middle > 0.55 &&      // Middle around 60%
        fingers.values.middle < 0.7 &&
        fingers.values.ring > 0.5 &&         // Ring around 57%
        fingers.values.ring < 0.65 &&
        fingers.values.pinky > 0.5 &&        // Pinky around 55%
        fingers.values.pinky < 0.65 &&
        handDir.isHorizontal) {              // Horizontal direction
        sign = 'do';
        confidence = 0.9;
    }
    
    // MI - Flat hand horizontal
    else if (fingers.values.index > 0.95 &&      
             fingers.values.middle > 0.95 &&
             fingers.values.ring > 0.95 &&
             fingers.values.pinky > 0.95 &&
             Math.abs(handDir.verticalAngle) < 10) {
        sign = 'mi';
        confidence = 0.9;
    }
    
    // TI - Index pointing up with flexible wiggle room
    else if (fingers.values.index > 0.9 &&      
             fingers.values.middle > 0.6 &&      
             fingers.values.middle < 0.9 &&
             fingers.values.ring > 0.6 &&        
             fingers.values.ring < 0.9 &&
             fingers.values.pinky > 0.6 &&       
             fingers.values.pinky < 0.9 &&
             fingers.values.thumb > 0.7 &&       
             handDir.verticalAngle > 20 &&       
             handDir.verticalAngle < 50 &&
             palmDir.isSide) {                   
        sign = 'ti';
        confidence = 0.9;
    }
    
    // RE - Angled up, fingers together
    else if (fingers.values.index > 0.8 &&     
             fingers.values.middle > 0.8 &&
             fingers.values.ring > 0.8 &&
             fingers.values.pinky > 0.8 &&
             handDir.verticalAngle > 20 &&     
             handDir.verticalAngle < 70) {
        sign = 're';
        confidence = 0.9;
    }
    
    // SOL - Curved fingers to side
    else if (fingers.values.index > 0.8 &&      
             fingers.values.middle > 0.8 &&
             fingers.values.ring > 0.8 &&
             fingers.values.pinky > 0.8 &&
             palmDir.isSide) {
        sign = 'sol';
        confidence = 0.9;
    }
    
    // FA - Thumb pointing down, other fingers in fist
    else if (fingers.values.thumb > 0.7 &&      
             fingers.values.index < 0.5 &&       
             fingers.values.middle < 0.5 &&
             fingers.values.ring < 0.5 &&
             fingers.values.pinky < 0.5 &&
             thumbDir.angle < -30) {
        sign = 'fa';
        confidence = 0.9;
    }
    
    // LA - Based on actual values
    else if (fingers.values.thumb > 0.9 &&    
             fingers.values.index > 0.9 &&     
             fingers.values.middle > 0.9 &&
             fingers.values.ring > 0.9 &&
             fingers.values.pinky > 0.9 &&
             handDir.verticalAngle < -45) {
        sign = 'la';
        confidence = 0.9;
    }

    return {
        sign,
        confidence,
        debug
    };
}

export function analyzeHand(landmarks) {
    if (!landmarks || landmarks.length < 21) return null;
    
    const fingers = analyzeFingers(landmarks);
    const handDir = getHandDirection(landmarks);
    const palmDir = getPalmDirection(landmarks);
    const thumbDir = getThumbDirection(landmarks);

    return {
        fingers: fingers.values,
        handDirection: handDir,
        palmDirection: palmDir,
        thumbDirection: thumbDir
    };
}
