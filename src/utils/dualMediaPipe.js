// Dual MediaPipe manager to avoid conflicts between Hands and Face Mesh
export class DualMediaPipeManager {
    constructor(onHandResults, onFaceResults) {
        this.onHandResults = onHandResults;
        this.onFaceResults = onFaceResults;
        this.hands = null;
        this.faceMesh = null;
        this.camera = null;
        this.isInitialized = false;
        this.currentFrame = null;
        this.processingHands = false;
        this.processingFace = false;
    }

    async initialize(videoElement) {
        try {
            // Import MediaPipe modules
            const handsModule = await import('@mediapipe/hands');
            const faceMeshModule = await import('@mediapipe/face_mesh');
            const cameraModule = await import('@mediapipe/camera_utils');

            // Initialize Hands
            this.hands = new handsModule.Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7
            });

            this.hands.onResults((results) => {
                this.processingHands = false;
                this.onHandResults(results);
            });

            // Initialize Face Mesh
            this.faceMesh = new faceMeshModule.FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });

            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: false, // Reduce complexity
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.faceMesh.onResults((results) => {
                this.processingFace = false;
                this.onFaceResults(results);
            });

            // Setup camera with alternating processing
            this.camera = new cameraModule.Camera(videoElement, {
                onFrame: async () => {
                    await this.processFrame(videoElement);
                },
                width: 640,
                height: 480
            });

            this.isInitialized = true;
            await this.camera.start();
            console.log('✅ Dual MediaPipe initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize dual MediaPipe:', error);
            throw error;
        }
    }

    async processFrame(videoElement) {
        if (!this.isInitialized || !videoElement) return;

        try {
            // Alternate between processing hands and face to avoid conflicts
            const now = Date.now();
            const shouldProcessHands = now % 100 < 50; // Process hands 50% of the time

            if (shouldProcessHands && !this.processingHands) {
                this.processingHands = true;
                await this.hands.send({ image: videoElement });
            } else if (!shouldProcessHands && !this.processingFace) {
                this.processingFace = true;
                await this.faceMesh.send({ image: videoElement });
            }
        } catch (error) {
            console.warn('Frame processing error:', error);
            this.processingHands = false;
            this.processingFace = false;
        }
    }

    stop() {
        if (this.camera) {
            this.camera.stop();
        }
        if (this.hands) {
            this.hands.close();
        }
        if (this.faceMesh) {
            this.faceMesh.close();
        }
        this.isInitialized = false;
    }
}
