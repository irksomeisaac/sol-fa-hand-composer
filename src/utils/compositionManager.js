// Composition recording and playback manager
export class CompositionManager {
    constructor() {
        this.composition = [];
        this.isRecording = false;
        this.isPlaying = false;
        this.currentOctave = 4; // Default octave
        this.tempo = 120; // BPM
        this.playbackIndex = 0;
        this.playbackInterval = null;
    }

    // Recording functions
    startRecording() {
        this.isRecording = true;
        this.composition = [];
        console.log('Recording started');
    }

    stopRecording() {
        this.isRecording = false;
        console.log('Recording stopped. Composition:', this.composition);
    }

    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
        return this.isRecording;
    }

    addNote(note, timestamp = Date.now()) {
        if (this.isRecording && note) {
            const duration = this.composition.length > 0 ? 
                timestamp - this.composition[this.composition.length - 1].timestamp : 0;
            
            this.composition.push({
                note,
                octave: this.currentOctave,
                timestamp,
                duration
            });
        }
    }

    // Octave controls
    octaveUp() {
        this.currentOctave = Math.min(this.currentOctave + 1, 7);
        console.log('Octave up:', this.currentOctave);
        return this.currentOctave;
    }

    octaveDown() {
        this.currentOctave = Math.max(this.currentOctave - 1, 2);
        console.log('Octave down:', this.currentOctave);
        return this.currentOctave;
    }

    // Playback functions
    startPlayback(audioPlayer) {
        if (this.composition.length === 0) return;
        
        this.isPlaying = true;
        this.playbackIndex = 0;
        
        const playNext = () => {
            if (this.playbackIndex >= this.composition.length || !this.isPlaying) {
                this.stopPlayback();
                return;
            }

            const note = this.composition[this.playbackIndex];
            audioPlayer.playNoteInOctave(note.note, note.octave);
            
            this.playbackIndex++;
            
            // Schedule next note based on duration or default timing
            const nextDelay = note.duration > 0 ? note.duration : 500;
            this.playbackInterval = setTimeout(playNext, nextDelay);
        };

        playNext();
    }

    stopPlayback() {
        this.isPlaying = false;
        if (this.playbackInterval) {
            clearTimeout(this.playbackInterval);
            this.playbackInterval = null;
        }
        console.log('Playback stopped');
    }

    togglePlayback(audioPlayer) {
        if (this.isPlaying) {
            this.stopPlayback();
        } else {
            this.startPlayback(audioPlayer);
        }
        return this.isPlaying;
    }

    // Utility functions
    clearComposition() {
        this.composition = [];
        this.stopPlayback();
        this.stopRecording();
        console.log('Composition cleared');
    }

    getComposition() {
        return this.composition;
    }

    getStatus() {
        return {
            isRecording: this.isRecording,
            isPlaying: this.isPlaying,
            currentOctave: this.currentOctave,
            tempo: this.tempo,
            noteCount: this.composition.length
        };
    }
}
