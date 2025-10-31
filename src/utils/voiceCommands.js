// Enhanced voice command recognition system for music notation
export class VoiceCommandManager {
    constructor(onCommandCallback) {
        this.recognition = null;
        this.isListening = false;
        this.onCommand = onCommandCallback;
        this.commands = {
            // Note addition
            'add': 'ADD_NOTE',
            'add note': 'ADD_NOTE',
            'place': 'ADD_NOTE',
            'put': 'ADD_NOTE',
            
            // Rest addition
            'add rest': 'ADD_REST',
            'rest': 'ADD_REST',
            'pause': 'ADD_REST',
            'silence': 'ADD_REST',
            
            // Note durations
            'whole note': 'SET_WHOLE_NOTE',
            'half note': 'SET_HALF_NOTE',
            'quarter note': 'SET_QUARTER_NOTE',
            'eighth note': 'SET_EIGHTH_NOTE',
            
            // Rest durations
            'whole rest': 'SET_WHOLE_REST',
            'half rest': 'SET_HALF_REST',
            'quarter rest': 'SET_QUARTER_REST',
            'eighth rest': 'SET_EIGHTH_REST',
            
            // Octave controls
            'octave up': 'OCTAVE_UP',
            'higher': 'OCTAVE_UP',
            'up': 'OCTAVE_UP',
            'octave down': 'OCTAVE_DOWN',
            'lower': 'OCTAVE_DOWN',
            'down': 'OCTAVE_DOWN',
            
            // Playback controls
            'play': 'PLAY_COMPOSITION',
            'play back': 'PLAY_COMPOSITION',
            'playback': 'PLAY_COMPOSITION',
            'stop': 'STOP_PLAYBACK',
            'stop playing': 'STOP_PLAYBACK',
            
            // Editing controls
            'undo': 'UNDO',
            'remove': 'UNDO',
            'delete': 'UNDO',
            'back': 'UNDO',
            'clear': 'CLEAR_ALL',
            'reset': 'CLEAR_ALL',
            'new': 'CLEAR_ALL',
            'start over': 'CLEAR_ALL',
            
            // Tempo controls
            'faster': 'TEMPO_UP',
            'speed up': 'TEMPO_UP',
            'slower': 'TEMPO_DOWN',
            'slow down': 'TEMPO_DOWN'
        };
    }

    initialize() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser');
            return false;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event) => {
            const lastResult = event.results[event.results.length - 1];
            if (lastResult.isFinal) {
                const transcript = lastResult[0].transcript.toLowerCase().trim();
                this.processCommand(transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech' && this.isListening) {
                // Restart after brief pause
                setTimeout(() => {
                    if (this.isListening) {
                        this.startListening();
                    }
                }, 1000);
            }
        };

        this.recognition.onend = () => {
            // Automatically restart if we should be listening
            if (this.isListening) {
                setTimeout(() => {
                    this.startListening();
                }, 100);
            }
        };

        return true;
    }

    processCommand(transcript) {
        console.log('Voice input:', transcript);
        
        // Check for exact matches first
        if (this.commands[transcript]) {
            console.log('Exact match command:', this.commands[transcript]);
            this.onCommand(this.commands[transcript], transcript);
            return;
        }
        
        // Check for partial matches
        for (const [phrase, command] of Object.entries(this.commands)) {
            if (transcript.includes(phrase)) {
                console.log('Partial match command:', command, 'from phrase:', phrase);
                this.onCommand(command, transcript);
                return;
            }
        }
        
        console.log('No command recognized for:', transcript);
    }

    startListening() {
        if (!this.recognition) {
            if (!this.initialize()) {
                return false;
            }
        }

        try {
            if (this.isListening) {
                this.recognition.stop();
            }
            this.recognition.start();
            this.isListening = true;
            console.log('Voice recognition started');
            return true;
        } catch (error) {
            console.error('Error starting voice recognition:', error);
            return false;
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            console.log('Voice recognition stopped');
        }
    }

    toggle() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
        return this.isListening;
    }

    getStatus() {
        return {
            isListening: this.isListening,
            isSupported: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
        };
    }
}
