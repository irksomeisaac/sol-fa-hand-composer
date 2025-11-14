// Head tracking and gesture recognition system
export class HeadTracker {
    constructor() {
        this.previousPositions = [];
        this.gestureBuffer = [];
        this.lastGesture = null;
        this.gestureStartTime = null;
        this.BUFFER_SIZE = 10;
        this.GESTURE_THRESHOLD = 0.03;
        this.MIN_GESTURE_DURATION = 500; // ms
    }

    // Detect head nod (up/down movement)
    detectNod(faceLandmarks) {
        if (!faceLandmarks || faceLandmarks.length === 0) return null;

        const noseTip = faceLandmarks[1]; // Nose tip landmark
        
        if (this.previousPositions.length >= this.BUFFER_SIZE) {
            this.previousPositions.shift();
        }
        this.previousPositions.push(noseTip.y);

        if (this.previousPositions.length < this.BUFFER_SIZE) return null;

        // Calculate vertical movement pattern
        const movements = [];
        for (let i = 1; i < this.previousPositions.length; i++) {
            movements.push(this.previousPositions[i] - this.previousPositions[i - 1]);
        }

        // Look for nod pattern: down then up movement
        const hasDownward = movements.some(m => m > this.GESTURE_THRESHOLD);
        const hasUpward = movements.some(m => m < -this.GESTURE_THRESHOLD);
        const range = Math.max(...this.previousPositions) - Math.min(...this.previousPositions);

        if (hasDownward && hasUpward && range > this.GESTURE_THRESHOLD * 2) {
            return { gesture: 'NOD', confidence: 0.9 };
        }

        return null;
    }

    // Detect head shake (left/right movement)
    detectShake(faceLandmarks) {
        if (!faceLandmarks || faceLandmarks.length === 0) return null;

        const noseTip = faceLandmarks[1];
        
        if (this.gestureBuffer.length >= this.BUFFER_SIZE) {
            this.gestureBuffer.shift();
        }
        this.gestureBuffer.push(noseTip.x);

        if (this.gestureBuffer.length < this.BUFFER_SIZE) return null;

        // Calculate horizontal movement pattern
        const movements = [];
        for (let i = 1; i < this.gestureBuffer.length; i++) {
            movements.push(this.gestureBuffer[i] - this.gestureBuffer[i - 1]);
        }

        // Look for shake pattern: left then right movement
        const hasLeftward = movements.some(m => m < -this.GESTURE_THRESHOLD);
        const hasRightward = movements.some(m => m > this.GESTURE_THRESHOLD);
        const range = Math.max(...this.gestureBuffer) - Math.min(...this.gestureBuffer);

        if (hasLeftward && hasRightward && range > this.GESTURE_THRESHOLD * 2) {
            return { gesture: 'SHAKE', confidence: 0.9 };
        }

        return null;
    }

    // Detect gaze direction (octave control)
    detectGazeDirection(faceLandmarks) {
        if (!faceLandmarks || faceLandmarks.length === 0) return null;

        // Use eye landmarks to determine gaze direction
        const leftEye = faceLandmarks[33]; // Left eye center
        const rightEye = faceLandmarks[263]; // Right eye center
        const noseTip = faceLandmarks[1];

        // Calculate eye center position relative to nose
        const eyeCenter = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2
        };

        const gazeOffset = eyeCenter.x - noseTip.x;
        const threshold = 0.02;

        if (gazeOffset < -threshold) {
            return { gesture: 'LOOK_LEFT', confidence: Math.abs(gazeOffset) * 10 };
        } else if (gazeOffset > threshold) {
            return { gesture: 'LOOK_RIGHT', confidence: Math.abs(gazeOffset) * 10 };
        }

        return null;
    }

    // Detect facial expressions (sharp/flat)
    detectExpression(faceLandmarks) {
        if (!faceLandmarks || faceLandmarks.length === 0) return null;

        // Use mouth landmarks to detect smile/frown
        const mouthLeft = faceLandmarks[61];
        const mouthRight = faceLandmarks[291];
        const mouthTop = faceLandmarks[13];
        const mouthBottom = faceLandmarks[14];

        // Calculate mouth curvature
        const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
        const mouthHeight = Math.abs(mouthBottom.y - mouthTop.y);
        const aspectRatio = mouthWidth / mouthHeight;

        // Smile detection (wider mouth)
        if (aspectRatio > 3.5) {
            return { gesture: 'SMILE', confidence: Math.min((aspectRatio - 3.5) * 2, 1) };
        }
        
        // Frown detection (taller mouth, corners down)
        if (aspectRatio < 2.5) {
            return { gesture: 'FROWN', confidence: Math.min((2.5 - aspectRatio) * 2, 1) };
        }

        return null;
    }

    // Main gesture analysis function
    analyzeGestures(faceLandmarks) {
        const gestures = {
            nod: this.detectNod(faceLandmarks),
            shake: this.detectShake(faceLandmarks),
            gaze: this.detectGazeDirection(faceLandmarks),
            expression: this.detectExpression(faceLandmarks)
        };

        // Return the most confident gesture
        const allGestures = Object.values(gestures).filter(g => g !== null);
        if (allGestures.length === 0) return null;

        return allGestures.reduce((prev, current) => 
            (current.confidence > prev.confidence) ? current : prev
        );
    }

    // Reset tracking data
    reset() {
        this.previousPositions = [];
        this.gestureBuffer = [];
        this.lastGesture = null;
        this.gestureStartTime = null;
    }
}
