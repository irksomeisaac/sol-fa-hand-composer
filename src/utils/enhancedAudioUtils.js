/**
 * Enhanced Audio Utils - Backward Compatible Wrapper
 * Maintains compatibility with existing audioUtils.js while adding enhanced features
 */

import { enhancedAudioEngine, TIMBRES, EFFECT_TYPES } from './enhancedAudioEngine.js';

// Legacy BASE_NOTES for backward compatibility
const BASE_NOTES = {
    'do': 261.63, // C4
    're': 293.66, // D4
    'mi': 329.63, // E4
    'fa': 349.23, // F4
    'sol': 392.00, // G4
    'la': 440.00, // A4
    'ti': 493.88  // B4
};

// Legacy function for backward compatibility
const getNoteFrequency = (note, octave = 4) => {
    return enhancedAudioEngine.getNoteFrequency(note, octave);
};

class EnhancedAudioPlayer {
    constructor() {
        this.engine = enhancedAudioEngine;
        
        // Legacy properties for backward compatibility
        this.audioContext = null;
        this.oscillator = null;
        this.gainNode = null;
        this.isPlaying = false;
        this.currentNote = null;
        this.currentOctave = 4;
        
        // Enhanced properties
        this.currentNoteId = null;
        this.effects = new Map();
    }

    // Legacy initialize method
    initialize() {
        return this.engine.initialize().then(() => {
            // Update legacy properties
            this.audioContext = this.engine.audioContext;
            this.gainNode = this.engine.masterGain;
        });
    }

    // Legacy playNote method - maintains exact same signature
    playNote(note, octave = 4) {
        // Don't restart the same note at same octave (legacy behavior)
        if (this.currentNote === note && this.currentOctave === octave && this.isPlaying) {
            return;
        }

        this.stopNote();
        
        const noteId = this.engine.playNote(note, octave, {
            id: `legacy-${note}-${octave}`,
            duration: 0, // Infinite duration for legacy compatibility
            volume: 0.2,
            attack: 0.1,
            release: 0.1
        });
        
        if (noteId) {
            this.currentNoteId = noteId;
            this.isPlaying = true;
            this.currentNote = note;
            this.currentOctave = octave;
            
            // Update legacy oscillator reference (for compatibility)
            const noteData = this.engine.currentNotes.get(noteId);
            if (noteData) {
                this.oscillator = noteData.oscillator;
            }
        }
    }

    // Legacy playNoteInOctave method
    playNoteInOctave(note, octave) {
        this.playNote(note, octave);
    }

    // Legacy stopNote method
    stopNote() {
        if (this.currentNoteId && this.isPlaying) {
            this.engine.stopNote(this.currentNoteId, 0.1);
            this.currentNoteId = null;
            this.isPlaying = false;
            this.currentNote = null;
            this.oscillator = null;
        }
    }

    // Legacy playUIFeedback method
    playUIFeedback(frequency = 800, duration = 100) {
        this.engine.playUIFeedback(frequency, duration);
    }

    // === ENHANCED METHODS ===

    // Enhanced note playing with full feature set
    playNoteEnhanced(note, octave = 4, options = {}) {
        return this.engine.playNote(note, octave, options);
    }

    // Play note with sharp/flat support
    playNoteWithAccidental(note, octave = 4, options = {}) {
        // Examples: playNoteWithAccidental('C#', 4) or playNoteWithAccidental('di', 4)
        return this.engine.playNote(note, octave, options);
    }

    // Play a chord
    playChord(rootNote, chordType = 'major', octave = 4, options = {}) {
        return this.engine.playChord(rootNote, chordType, octave, options);
    }

    // Play a sequence of notes
    playSequence(sequence, options = {}) {
        return this.engine.playSequence(sequence, options);
    }

    // Stop a specific note by ID
    stopNoteById(noteId, releaseTime = null) {
        this.engine.stopNote(noteId, releaseTime);
    }

    // Stop all notes
    stopAllNotes(releaseTime = null) {
        this.engine.stopAllNotes(releaseTime);
    }

    // === TIMBRE CONTROL ===

    setTimbre(timbre) {
        this.engine.setTimbre(timbre);
    }

    getTimbre() {
        return this.engine.settings.timbre;
    }

    getAvailableTimbres() {
        return this.engine.getAvailableTimbres();
    }

    // === VOLUME CONTROL ===

    setMasterVolume(volume) {
        this.engine.setMasterVolume(volume);
    }

    getMasterVolume() {
        return this.engine.settings.masterVolume;
    }

    // === TEMPO CONTROL ===

    setTempo(bpm) {
        this.engine.setTempo(bpm);
    }

    getTempo() {
        return this.engine.settings.tempo;
    }

    // === AUDIO EFFECTS ===

    addEffect(type, params = {}) {
        const effect = this.engine.addEffect(type, params);
        if (effect) {
            const effectId = `effect-${type}-${Date.now()}`;
            this.effects.set(effectId, effect);
            return effectId;
        }
        return null;
    }

    removeEffect(effectId) {
        const effect = this.effects.get(effectId);
        if (effect) {
            this.engine.removeEffect(effect);
            this.effects.delete(effectId);
            return true;
        }
        return false;
    }

    clearEffects() {
        this.engine.clearEffects();
        this.effects.clear();
    }

    getAvailableEffects() {
        return this.engine.getAvailableEffects();
    }

    // === TRANSITION CONTROL ===

    setTransitionTime(time) {
        this.engine.setTransitionTime(time);
    }

    getTransitionTime() {
        return this.engine.settings.transitionTime;
    }

    // === UTILITY METHODS ===

    // Get all current settings
    getSettings() {
        return this.engine.getSettings();
    }

    // Check if a note is currently playing
    isNotePlaying(noteId = null) {
        if (noteId) {
            return this.engine.currentNotes.has(noteId);
        }
        return this.isPlaying; // Legacy behavior
    }

    // Get currently playing notes
    getCurrentlyPlayingNotes() {
        return Array.from(this.engine.currentNotes.values()).map(noteData => ({
            id: noteData.id,
            note: noteData.note,
            octave: noteData.octave,
            frequency: noteData.frequency,
            startTime: noteData.startTime
        }));
    }

    // Advanced sequence player with timing control
    async playAdvancedSequence(sequence, options = {}) {
        const {
            tempo = 120,
            swing = 0,
            volume = 1.0,
            timbre = this.engine.settings.timbre,
            effects = []
        } = options;

        // Add temporary effects for this sequence
        const tempEffects = [];
        for (const effectConfig of effects) {
            const effectId = this.addEffect(effectConfig.type, effectConfig.params);
            if (effectId) tempEffects.push(effectId);
        }

        try {
            await this.engine.playSequence(sequence, {
                tempo,
                swing,
                volume,
                timbre,
                ...options
            });
        } finally {
            // Clean up temporary effects
            tempEffects.forEach(effectId => this.removeEffect(effectId));
        }
    }

    // Play arpeggiated chord
    async playArpeggio(rootNote, chordType = 'major', octave = 4, options = {}) {
        const { direction = 'up', speed = 200, volume = 0.7 } = options;
        
        const chord = new (await import('./enhancedAudioEngine.js')).Chord(rootNote, chordType, octave);
        const notes = direction === 'down' ? chord.notes.reverse() : chord.notes;
        
        for (let i = 0; i < notes.length; i++) {
            setTimeout(() => {
                this.playNoteEnhanced(notes[i].note, octave, {
                    duration: speed / 1000 * 1.5,
                    volume: volume / notes.length,
                    attack: 0.01,
                    release: 0.1
                });
            }, i * speed);
        }
    }

    // Play glissando (slide between notes)
    async playGlissando(startNote, endNote, startOctave = 4, endOctave = 4, duration = 1000) {
        const startFreq = this.engine.getNoteFrequency(startNote, startOctave);
        const endFreq = this.engine.getNoteFrequency(endNote, endOctave);
        
        if (!startFreq || !endFreq) return;

        await this.engine.initialize();
        
        const steps = 50;
        const stepDuration = duration / steps;
        const freqStep = (endFreq - startFreq) / steps;
        
        for (let i = 0; i <= steps; i++) {
            const freq = startFreq + (freqStep * i);
            setTimeout(() => {
                this.engine.playFrequency(freq, {
                    duration: stepDuration / 1000 * 1.5,
                    volume: 0.3,
                    attack: 0.001,
                    release: 0.001
                });
            }, i * stepDuration);
        }
    }

    // Enhanced UI feedback with more options
    playEnhancedUIFeedback(type = 'success', options = {}) {
        const feedbackTypes = {
            success: { frequency: 1200, duration: 200, timbre: TIMBRES.sine },
            error: { frequency: 400, duration: 300, timbre: TIMBRES.square },
            warning: { frequency: 800, duration: 150, timbre: TIMBRES.triangle },
            info: { frequency: 600, duration: 100, timbre: TIMBRES.sine },
            click: { frequency: 1000, duration: 50, timbre: TIMBRES.sine }
        };
        
        const config = feedbackTypes[type] || feedbackTypes.info;
        return this.engine.playUIFeedback(config.frequency, config.duration, {
            timbre: config.timbre,
            ...options
        });
    }

    // Cleanup method
    destroy() {
        this.stopNote();
        this.clearEffects();
        this.engine.destroy();
    }
}

// Create enhanced player instance
export const audioPlayer = new EnhancedAudioPlayer();

// Export legacy compatibility
export { BASE_NOTES, getNoteFrequency };

// Export enhanced features
export { TIMBRES, EFFECT_TYPES };

// Export enhanced player class for direct instantiation
export { EnhancedAudioPlayer };

// Default export for easy importing
export default audioPlayer;
