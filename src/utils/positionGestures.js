// Position-based gesture system for hands-free control
export class PositionGestureManager {
    constructor() {
        this.holdStartTime = null;
        this.currentPosition = null;
        this.lastAction = null;
        this.actionCooldown = 2000; // 2 seconds between actions
        this.holdDuration = 3000; // 3 seconds to trigger action
    }

    // Detect flat hand (high five position)
    detectFlatHand(landmarks) {
        if (!landmarks || landmarks.length < 21) return false;

        const FINGERS = {
            THUMB: [1, 2, 3, 4],
            INDEX: [5, 6, 7, 8],
            MIDDLE: [9, 10, 11, 12],
            RING: [13, 14, 15, 16],
            PINKY: [17, 18, 19, 20]
        };

        // Calculate finger extensions
        const getFingerExtension = (fingerIndices) => {
            const base = landmarks[fingerIndices[0]];
            const tip = landmarks[fingerIndices[3]];
            const directDistance = this.distance(base, tip);
            
            let segmentLength = 0;
            for (let i = 0; i < 3; i++) {
                segmentLength += this.distance(
                    landmarks[fingerIndices[i]], 
                    landmarks[fingerIndices[i + 1]]
                );
            }
            
            return segmentLength > 0 ? directDistance / segmentLength : 0;
        };

        const extensions = {
            thumb: getFingerExtension(FINGERS.THUMB),
            index: getFingerExtension(FINGERS.INDEX),
            middle: getFingerExtension(FINGERS.MIDDLE),
            ring: getFingerExtension(FINGERS.RING),
            pinky: getFingerExtension(FINGERS.PINKY)
        };

        // Check if all fingers are extended (flat hand)
        const allExtended = Object.values(extensions).every(ext => ext > 0.7);
        
        // Check palm orientation (should be facing camera)
        const palmNormal = this.calculatePalmNormal(landmarks);
        const palmFacingCamera = Math.abs(palmNormal.z) > 0.5;

        return allExtended && palmFacingCamera;
    }

    // Get screen position based on hand location
    getScreenPosition(landmarks) {
        if (!landmarks || landmarks.length < 21) return null;

        // Use wrist position as reference
        const wrist = landmarks[0];
        const x = wrist.x;
        const y = wrist.y;

        // Define screen zones
        const zones = {
            // Corners (priority zones for special actions)
            topLeft: x < 0.33 && y < 0.33,
            topRight: x > 0.67 && y < 0.33,
            bottomLeft: x < 0.33 && y > 0.67,
            bottomRight: x > 0.67 && y > 0.67,
            
            // Edges (main control zones)
            top: y < 0.25 && x >= 0.33 && x <= 0.67,
            bottom: y > 0.75 && x >= 0.33 && x <= 0.67,
            left: x < 0.25 && y >= 0.33 && y <= 0.67,
            right: x > 0.75 && y >= 0.33 && y <= 0.67,
            
            // Center (default zone)
            center: x >= 0.25 && x <= 0.75 && y >= 0.25 && y <= 0.75
        };

        // Return the first matching zone (corners have priority)
        for (const [zoneName, inZone] of Object.entries(zones)) {
            if (inZone) return zoneName;
        }

        return 'unknown';
    }

    // Process gesture based on position and hold time
    processPositionGesture(landmarks, currentNote) {
        if (!landmarks) {
            this.resetHold();
            return null;
        }

        const isFlatHand = this.detectFlatHand(landmarks);
        const position = this.getScreenPosition(landmarks);
        const now = Date.now();

        if (isFlatHand && position && position !== 'unknown') {
            // Start or continue hold
            if (this.currentPosition === position) {
                if (!this.holdStartTime) {
                    this.holdStartTime = now;
                }
                
                const holdTime = now - this.holdStartTime;
                const progress = Math.min(holdTime / this.holdDuration, 1);
                
                if (holdTime >= this.holdDuration) {
                    // Trigger action
                    const action = this.getActionForPosition(position, currentNote);
                    if (action && (!this.lastAction || now - this.lastAction > this.actionCooldown)) {
                        this.lastAction = now;
                        this.resetHold();
                        return { action, position, triggered: true };
                    }
                }
                
                return { 
                    action: this.getActionForPosition(position, currentNote), 
                    position, 
                    progress, 
                    triggered: false 
                };
            } else {
                // Position changed
                this.currentPosition = position;
                this.holdStartTime = now;
                return { 
                    action: this.getActionForPosition(position, currentNote), 
                    position, 
                    progress: 0, 
                    triggered: false 
                };
            }
        } else {
            this.resetHold();
            return null;
        }
    }

    getActionForPosition(position, currentNote) {
        const actions = {
            center: { type: 'ADD_NOTE', description: `Add ${currentNote ? currentNote.toUpperCase() : 'note'}` },
            top: { type: 'ADD_SHARP', description: `Add ${currentNote ? currentNote.toUpperCase() : 'note'} ♯` },
            bottom: { type: 'ADD_FLAT', description: `Add ${currentNote ? currentNote.toUpperCase() : 'note'} ♭` },
            left: { type: 'OCTAVE_DOWN', description: 'Octave down' },
            right: { type: 'OCTAVE_UP', description: 'Octave up' },
            topLeft: { type: 'UNDO', description: 'Undo last note' },
            topRight: { type: 'PLAY', description: 'Play composition' },
            bottomLeft: { type: 'CLEAR', description: 'Clear all notes' },
            bottomRight: { type: 'EXPORT', description: 'Export composition' }
        };

        return actions[position] || null;
    }

    resetHold() {
        this.holdStartTime = null;
        this.currentPosition = null;
    }

    distance(p1, p2) {
        return Math.sqrt(
            Math.pow(p1.x - p2.x, 2) +
            Math.pow(p1.y - p2.y, 2) +
            Math.pow(p1.z - p2.z, 2)
        );
    }

    calculatePalmNormal(landmarks) {
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

        // Cross product for normal vector
        const normal = {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };

        // Normalize
        const magnitude = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
        return {
            x: normal.x / magnitude,
            y: normal.y / magnitude,
            z: normal.z / magnitude
        };
    }
}
