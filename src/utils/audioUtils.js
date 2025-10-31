// Enhanced audio player with octave support
const BASE_NOTES = {
    'do': 261.63, // C4
    're': 293.66, // D4
    'mi': 329.63, // E4
    'fa': 349.23, // F4
    'sol': 392.00, // G4
    'la': 440.00, // A4
    'ti': 493.88  // B4
};

// Get frequency for a note in a specific octave
const getNoteFrequency = (note, octave = 4) => {
    const baseFreq = BASE_NOTES[note];
    if (!baseFreq) return null;
    
    // Each octave doubles or halves the frequency
    const octaveMultiplier = Math.pow(2, octave - 4);
    return baseFreq * octaveMultiplier;
};

class AudioPlayer {
    constructor() {
        this.audioContext = null;
        this.oscillator = null;
        this.gainNode = null;
        this.isPlaying = false;
        this.currentNote = null;
        this.currentOctave = 4;
    }

    initialize() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.gainNode.gain.value = 0;
        }
    }

    playNote(note, octave = 4) {
        this.initialize();

        // Don't restart the same note at same octave
        if (this.currentNote === note && this.currentOctave === octave && this.isPlaying) {
            return;
        }

        this.stopNote();
        
        const frequency = getNoteFrequency(note, octave);
        if (frequency) {
            this.oscillator = this.audioContext.createOscillator();
            this.oscillator.type = 'sine';
            this.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            
            this.oscillator.connect(this.gainNode);
            this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.1);
            
            this.oscillator.start();
            this.isPlaying = true;
            this.currentNote = note;
            this.currentOctave = octave;
        }
    }

    playNoteInOctave(note, octave) {
        this.playNote(note, octave);
    }

    stopNote() {
        if (this.oscillator && this.isPlaying) {
            const releaseTime = this.audioContext.currentTime + 0.1;
            this.gainNode.gain.linearRampToValueAtTime(0, releaseTime);
            this.oscillator.stop(releaseTime);
            this.isPlaying = false;
            this.currentNote = null;
        }
    }

    // Play a short beep for UI feedback
    playUIFeedback(frequency = 800, duration = 100) {
        this.initialize();
        
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        oscillator.connect(gain);
        gain.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration / 1000);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration / 1000);
    }
}

export const audioPlayer = new AudioPlayer();
