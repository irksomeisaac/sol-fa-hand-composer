// Stable voice recognition system
export class StableVoiceRecognition {
    constructor(onCommand) {
        this.onCommand = onCommand;
        this.recognition = null;
        this.isActive = false;
        this.isSupported = 'webkitSpeechRecognition' in window;
        this.restartTimeout = null;
    }

    initialize() {
        if (!this.isSupported) return false;

        this.recognition = new window.webkitSpeechRecognition();
        this.recognition.continuous = false; // Single command at a time
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isActive = true;
            console.log('Voice: Ready for command');
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            console.log('Voice command:', transcript);
            this.onCommand(transcript);
            
            // Schedule next listening session
            this.scheduleRestart();
        };

        this.recognition.onerror = (event) => {
            console.log('Voice error:', event.error);
            this.isActive = false;
            
            // Only restart if not permission denied
            if (event.error !== 'not-allowed') {
                this.scheduleRestart();
            }
        };

        this.recognition.onend = () => {
            this.isActive = false;
            this.scheduleRestart();
        };

        return true;
    }

    scheduleRestart() {
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
        }
        
        this.restartTimeout = setTimeout(() => {
            this.start();
        }, 1000); // 1 second delay between commands
    }

    start() {
        if (!this.isSupported || this.isActive) return;

        try {
            this.recognition.start();
        } catch (error) {
            console.log('Voice start error:', error);
            this.scheduleRestart();
        }
    }

    stop() {
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
        }
        
        if (this.recognition && this.isActive) {
            this.recognition.stop();
        }
        this.isActive = false;
    }

    getStatus() {
        return {
            isSupported: this.isSupported,
            isActive: this.isActive
        };
    }
}
