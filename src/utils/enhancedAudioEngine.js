/**
 * Enhanced Audio Engine
 * Supports: Sharp/flat notes, multiple timbres, tempo/volume control, 
 * audio effects, smooth transitions, and chord support
 */

// Note frequencies with full chromatic support including sharps and flats
const NOTE_FREQUENCIES = {
    // Natural notes (C4 octave)
    'C': 261.63,
    'D': 293.66,
    'E': 329.63,
    'F': 349.23,
    'G': 392.00,
    'A': 440.00,
    'B': 493.88,
    // Sharp/flat notes
    'C#': 277.18, 'Db': 277.18,
    'D#': 311.13, 'Eb': 311.13,
    'F#': 369.99, 'Gb': 369.99,
    'G#': 415.30, 'Ab': 415.30,
    'A#': 466.16, 'Bb': 466.16
};

// Solfege to note mapping with accidentals
const SOLFEGE_TO_NOTE = {
    // Natural solfege
    'do': 'C',
    're': 'D', 
    'mi': 'E',
    'fa': 'F',
    'sol': 'G',
    'la': 'A',
    'ti': 'B',
    // Sharp solfege (raised)
    'di': 'C#',    // raised do
    'ri': 'D#',    // raised re
    'fi': 'F#',    // raised fa
    'si': 'G#',    // raised sol
    'li': 'A#',    // raised la
    // Flat solfege (lowered)
    'ra': 'Db',    // lowered re
    'me': 'Eb',    // lowered mi
    'se': 'Ab',    // lowered sol
    'le': 'Bb',    // lowered la
    'te': 'Bb'     // lowered ti (alternative)
};

// Oscillator types for different timbres
const TIMBRES = {
    sine: 'sine',
    square: 'square',
    sawtooth: 'sawtooth',
    triangle: 'triangle',
    // Custom timbres (implemented via additive synthesis)
    organ: 'organ',
    flute: 'flute',
    strings: 'strings',
    piano: 'piano'
};

// Audio effects types
const EFFECT_TYPES = {
    reverb: 'reverb',
    delay: 'delay',
    chorus: 'chorus',
    distortion: 'distortion',
    lowpass: 'lowpass',
    highpass: 'highpass',
    bandpass: 'bandpass'
};

class AudioEffect {
    constructor(context, type, params = {}) {
        this.context = context;
        this.type = type;
        this.params = params;
        this.input = null;
        this.output = null;
        this.nodes = [];
        
        this.createEffect();
    }
    
    createEffect() {
        switch (this.type) {
            case EFFECT_TYPES.reverb:
                this.createReverb();
                break;
            case EFFECT_TYPES.delay:
                this.createDelay();
                break;
            case EFFECT_TYPES.chorus:
                this.createChorus();
                break;
            case EFFECT_TYPES.distortion:
                this.createDistortion();
                break;
            case EFFECT_TYPES.lowpass:
            case EFFECT_TYPES.highpass:
            case EFFECT_TYPES.bandpass:
                this.createFilter();
                break;
        }
    }
    
    createReverb() {
        const convolver = this.context.createConvolver();
        const wetGain = this.context.createGain();
        const dryGain = this.context.createGain();
        const output = this.context.createGain();
        
        // Create impulse response for reverb
        const impulseLength = this.context.sampleRate * (this.params.duration || 2);
        const impulse = this.context.createBuffer(2, impulseLength, this.context.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < impulseLength; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
            }
        }
        
        convolver.buffer = impulse;
        
        wetGain.gain.value = this.params.wetness || 0.3;
        dryGain.gain.value = 1 - (this.params.wetness || 0.3);
        
        this.input = this.context.createGain();
        this.input.connect(dryGain);
        this.input.connect(convolver);
        convolver.connect(wetGain);
        
        dryGain.connect(output);
        wetGain.connect(output);
        this.output = output;
        
        this.nodes = [convolver, wetGain, dryGain, output, this.input];
    }
    
    createDelay() {
        const delay = this.context.createDelay(this.params.maxDelay || 1);
        const feedback = this.context.createGain();
        const wetGain = this.context.createGain();
        const dryGain = this.context.createGain();
        const output = this.context.createGain();
        
        delay.delayTime.value = this.params.delayTime || 0.3;
        feedback.gain.value = this.params.feedback || 0.4;
        wetGain.gain.value = this.params.wetness || 0.5;
        dryGain.gain.value = 1 - (this.params.wetness || 0.5);
        
        this.input = this.context.createGain();
        this.input.connect(dryGain);
        this.input.connect(delay);
        delay.connect(feedback);
        delay.connect(wetGain);
        feedback.connect(delay);
        
        dryGain.connect(output);
        wetGain.connect(output);
        this.output = output;
        
        this.nodes = [delay, feedback, wetGain, dryGain, output, this.input];
    }
    
    createChorus() {
        const delayNode = this.context.createDelay(0.02);
        const lfo = this.context.createOscillator();
        const lfoGain = this.context.createGain();
        const wetGain = this.context.createGain();
        const dryGain = this.context.createGain();
        const output = this.context.createGain();
        
        lfo.frequency.value = this.params.rate || 0.5;
        lfoGain.gain.value = this.params.depth || 0.01;
        delayNode.delayTime.value = 0.01;
        wetGain.gain.value = this.params.wetness || 0.5;
        dryGain.gain.value = 1 - (this.params.wetness || 0.5);
        
        lfo.connect(lfoGain);
        lfoGain.connect(delayNode.delayTime);
        
        this.input = this.context.createGain();
        this.input.connect(dryGain);
        this.input.connect(delayNode);
        delayNode.connect(wetGain);
        
        dryGain.connect(output);
        wetGain.connect(output);
        this.output = output;
        
        lfo.start();
        
        this.nodes = [delayNode, lfo, lfoGain, wetGain, dryGain, output, this.input];
    }
    
    createDistortion() {
        const waveshaper = this.context.createWaveShaper();
        const amount = this.params.amount || 50;
        const samples = 44100;
        const curve = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * Math.PI / 180) / (Math.PI + amount * Math.abs(x));
        }
        
        waveshaper.curve = curve;
        waveshaper.oversample = '4x';
        
        this.input = waveshaper;
        this.output = waveshaper;
        this.nodes = [waveshaper];
    }
    
    createFilter() {
        const filter = this.context.createBiquadFilter();
        filter.type = this.type;
        filter.frequency.value = this.params.frequency || 1000;
        filter.Q.value = this.params.Q || 1;
        
        this.input = filter;
        this.output = filter;
        this.nodes = [filter];
    }
    
    connect(destination) {
        if (this.output) {
            this.output.connect(destination);
        }
    }
    
    disconnect() {
        if (this.output) {
            this.output.disconnect();
        }
    }
    
    destroy() {
        this.nodes.forEach(node => {
            try {
                if (node.stop && typeof node.stop === 'function') {
                    node.stop();
                }
                node.disconnect();
            } catch (e) {
                // Ignore errors during cleanup
            }
        });
        this.nodes = [];
    }
}

class EnhancedOscillator {
    constructor(context, timbre = TIMBRES.sine) {
        this.context = context;
        this.timbre = timbre;
        this.oscillators = [];
        this.gainNodes = [];
        this.masterGain = context.createGain();
        this.output = this.masterGain;
        
        this.createOscillators();
    }
    
    createOscillators() {
        if (Object.values(TIMBRES).slice(0, 4).includes(this.timbre)) {
            // Simple oscillator
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = this.timbre;
            gain.gain.value = 1.0;
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            this.oscillators.push(osc);
            this.gainNodes.push(gain);
        } else {
            // Complex timbres using additive synthesis
            switch (this.timbre) {
                case TIMBRES.organ:
                    this.createOrganSound();
                    break;
                case TIMBRES.flute:
                    this.createFluteSound();
                    break;
                case TIMBRES.strings:
                    this.createStringsSound();
                    break;
                case TIMBRES.piano:
                    this.createPianoSound();
                    break;
            }
        }
    }
    
    createOrganSound() {
        // Organ: Strong fundamental + select harmonics
        const harmonics = [1, 2, 3, 4, 6, 8];
        const gains = [1.0, 0.7, 0.5, 0.3, 0.2, 0.1];
        
        harmonics.forEach((harmonic, index) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'sine';
            gain.gain.value = gains[index];
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            this.oscillators.push({ osc, harmonic });
            this.gainNodes.push(gain);
        });
    }
    
    createFluteSound() {
        // Flute: Fundamental + weak harmonics with some noise
        const harmonics = [1, 2, 3];
        const gains = [1.0, 0.3, 0.1];
        
        harmonics.forEach((harmonic, index) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'sine';
            gain.gain.value = gains[index];
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            this.oscillators.push({ osc, harmonic });
            this.gainNodes.push(gain);
        });
    }
    
    createStringsSound() {
        // Strings: Rich harmonics with saw-like character
        const harmonics = [1, 2, 3, 4, 5, 6, 7, 8];
        const gains = [1.0, 0.6, 0.4, 0.3, 0.2, 0.15, 0.1, 0.08];
        
        harmonics.forEach((harmonic, index) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'sawtooth';
            gain.gain.value = gains[index];
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            this.oscillators.push({ osc, harmonic });
            this.gainNodes.push(gain);
        });
    }
    
    createPianoSound() {
        // Piano: Complex harmonics with inharmonicity
        const partials = [1, 2.01, 3.02, 4.03, 5.04, 6.05];
        const gains = [1.0, 0.5, 0.3, 0.2, 0.1, 0.08];
        
        partials.forEach((partial, index) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'sine';
            gain.gain.value = gains[index];
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            this.oscillators.push({ osc, partial });
            this.gainNodes.push(gain);
        });
    }
    
    setFrequency(frequency) {
        this.oscillators.forEach(oscData => {
            if (typeof oscData === 'object' && oscData.osc) {
                const multiplier = oscData.harmonic || oscData.partial || 1;
                oscData.osc.frequency.setValueAtTime(
                    frequency * multiplier, 
                    this.context.currentTime
                );
            } else {
                oscData.frequency.setValueAtTime(frequency, this.context.currentTime);
            }
        });
    }
    
    start(when = this.context.currentTime) {
        this.oscillators.forEach(oscData => {
            const osc = typeof oscData === 'object' && oscData.osc ? oscData.osc : oscData;
            osc.start(when);
        });
    }
    
    stop(when = this.context.currentTime) {
        this.oscillators.forEach(oscData => {
            const osc = typeof oscData === 'object' && oscData.osc ? oscData.osc : oscData;
            try {
                osc.stop(when);
            } catch (e) {
                // Oscillator might already be stopped
            }
        });
    }
    
    connect(destination) {
        this.output.connect(destination);
    }
    
    disconnect() {
        this.output.disconnect();
    }
}

class Chord {
    constructor(rootNote, type = 'major', octave = 4) {
        this.rootNote = rootNote;
        this.type = type;
        this.octave = octave;
        this.notes = this.calculateChordNotes();
    }
    
    calculateChordNotes() {
        const intervals = this.getChordIntervals();
        const rootFreq = this.getNoteFrequency(this.rootNote, this.octave);
        
        return intervals.map(interval => ({
            note: this.getNoteName(interval),
            frequency: rootFreq * Math.pow(2, interval / 12),
            interval
        }));
    }
    
    getChordIntervals() {
        const chordTypes = {
            'major': [0, 4, 7],
            'minor': [0, 3, 7],
            'diminished': [0, 3, 6],
            'augmented': [0, 4, 8],
            'major7': [0, 4, 7, 11],
            'minor7': [0, 3, 7, 10],
            'dom7': [0, 4, 7, 10],
            'sus2': [0, 2, 7],
            'sus4': [0, 5, 7]
        };
        
        return chordTypes[this.type] || chordTypes['major'];
    }
    
    getNoteFrequency(note, octave) {
        const freq = NOTE_FREQUENCIES[note];
        if (!freq) return null;
        
        const octaveMultiplier = Math.pow(2, octave - 4);
        return freq * octaveMultiplier;
    }
    
    getNoteName(interval) {
        // This is a simplified version - a full implementation would 
        // properly calculate note names based on the interval
        return this.rootNote;
    }
}

export class EnhancedAudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.effectsChain = [];
        this.currentNotes = new Map(); // Map of note IDs to note data
        this.settings = {
            masterVolume: 0.7,
            timbre: TIMBRES.sine,
            tempo: 120, // BPM
            transitionTime: 0.05, // seconds
            noteLength: 0.5 // seconds (default note duration)
        };
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.settings.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
            
            this.initialized = true;
            console.log('Enhanced Audio Engine initialized');
        } catch (error) {
            console.error('Failed to initialize Enhanced Audio Engine:', error);
            throw error;
        }
    }
    
    // Convert solfege to note name, supporting sharps and flats
    solfegeToNote(solfege) {
        return SOLFEGE_TO_NOTE[solfege.toLowerCase()] || solfege.toUpperCase();
    }
    
    // Calculate frequency for any note with octave
    getNoteFrequency(note, octave = 4) {
        // Convert solfege if needed
        const noteName = this.solfegeToNote(note);
        const baseFreq = NOTE_FREQUENCIES[noteName];
        
        if (!baseFreq) {
            console.warn(`Unknown note: ${note}`);
            return null;
        }
        
        // Calculate frequency for the given octave
        const octaveMultiplier = Math.pow(2, octave - 4);
        return baseFreq * octaveMultiplier;
    }
    
    // Add an audio effect to the chain
    addEffect(type, params = {}) {
        if (!this.initialized) {
            console.warn('Audio engine not initialized');
            return null;
        }
        
        try {
            const effect = new AudioEffect(this.audioContext, type, params);
            this.effectsChain.push(effect);
            this.rewireEffectsChain();
            return effect;
        } catch (error) {
            console.error('Failed to add effect:', error);
            return null;
        }
    }
    
    // Remove an effect from the chain
    removeEffect(effect) {
        const index = this.effectsChain.indexOf(effect);
        if (index > -1) {
            this.effectsChain[index].destroy();
            this.effectsChain.splice(index, 1);
            this.rewireEffectsChain();
        }
    }
    
    // Clear all effects
    clearEffects() {
        this.effectsChain.forEach(effect => effect.destroy());
        this.effectsChain = [];
        this.rewireEffectsChain();
    }
    
    // Rewire the effects chain
    rewireEffectsChain() {
        // This will be called when notes are played to set up the signal chain
    }
    
    // Get the final destination (after effects chain)
    getDestination() {
        if (this.effectsChain.length === 0) {
            return this.masterGain;
        }
        return this.effectsChain[0].input;
    }
    
    // Set up effects chain routing for a note
    setupEffectsChain(noteGain) {
        if (this.effectsChain.length === 0) {
            noteGain.connect(this.masterGain);
            return;
        }
        
        // Connect note to first effect
        noteGain.connect(this.effectsChain[0].input);
        
        // Connect effects in series
        for (let i = 0; i < this.effectsChain.length - 1; i++) {
            this.effectsChain[i].connect(this.effectsChain[i + 1].input);
        }
        
        // Connect last effect to master gain
        this.effectsChain[this.effectsChain.length - 1].connect(this.masterGain);
    }
    
    // Play a single note with enhanced features
    async playNote(note, octave = 4, options = {}) {
        await this.initialize();
        
        const frequency = this.getNoteFrequency(note, octave);
        if (!frequency) return null;
        
        const noteId = options.id || `${note}-${octave}-${Date.now()}`;
        const duration = options.duration || this.settings.noteLength;
        const timbre = options.timbre || this.settings.timbre;
        const volume = options.volume ?? 1.0;
        
        // Stop existing note with same ID if it exists
        this.stopNote(noteId);
        
        try {
            // Create enhanced oscillator
            const oscillator = new EnhancedOscillator(this.audioContext, timbre);
            
            // Create note gain with envelope
            const noteGain = this.audioContext.createGain();
            noteGain.gain.value = 0;
            
            // Connect oscillator -> gain -> effects -> master
            oscillator.connect(noteGain);
            this.setupEffectsChain(noteGain);
            
            // Set frequency
            oscillator.setFrequency(frequency);
            
            // Start oscillator
            const now = this.audioContext.currentTime;
            oscillator.start(now);
            
            // Apply ADSR envelope
            const attackTime = options.attack || 0.01;
            const decayTime = options.decay || 0.1;
            const sustainLevel = options.sustain || 0.7;
            const releaseTime = options.release || this.settings.transitionTime;
            
            // Attack
            noteGain.gain.linearRampToValueAtTime(volume, now + attackTime);
            
            // Decay to sustain
            noteGain.gain.linearRampToValueAtTime(
                volume * sustainLevel, 
                now + attackTime + decayTime
            );
            
            // Store note data
            const noteData = {
                id: noteId,
                oscillator,
                gainNode: noteGain,
                frequency,
                note,
                octave,
                startTime: now,
                duration: duration
            };
            
            this.currentNotes.set(noteId, noteData);
            
            // Auto-stop after duration if specified
            if (duration > 0) {
                setTimeout(() => {
                    this.stopNote(noteId, releaseTime);
                }, duration * 1000);
            }
            
            return noteId;
        } catch (error) {
            console.error('Failed to play note:', error);
            return null;
        }
    }
    
    // Stop a specific note
    stopNote(noteId, releaseTime = null) {
        const noteData = this.currentNotes.get(noteId);
        if (!noteData) return;
        
        const release = releaseTime ?? this.settings.transitionTime;
        const now = this.audioContext.currentTime;
        
        // Release envelope
        noteData.gainNode.gain.cancelScheduledValues(now);
        noteData.gainNode.gain.setValueAtTime(noteData.gainNode.gain.value, now);
        noteData.gainNode.gain.linearRampToValueAtTime(0, now + release);
        
        // Stop oscillator
        noteData.oscillator.stop(now + release);
        
        // Clean up
        setTimeout(() => {
            noteData.oscillator.disconnect();
            noteData.gainNode.disconnect();
            this.currentNotes.delete(noteId);
        }, (release + 0.1) * 1000);
    }
    
    // Stop all currently playing notes
    stopAllNotes(releaseTime = null) {
        const noteIds = Array.from(this.currentNotes.keys());
        noteIds.forEach(id => this.stopNote(id, releaseTime));
    }
    
    // Play a chord
    async playChord(rootNote, chordType = 'major', octave = 4, options = {}) {
        const chord = new Chord(rootNote, chordType, octave);
        const chordId = options.id || `chord-${rootNote}-${chordType}-${octave}-${Date.now()}`;
        const noteIds = [];
        
        for (let i = 0; i < chord.notes.length; i++) {
            const noteOptions = {
                ...options,
                id: `${chordId}-note-${i}`,
                timbre: options.timbre || this.settings.timbre,
                volume: (options.volume || 1.0) / chord.notes.length // Reduce volume per note
            };
            
            const noteId = await this.playNote(
                chord.notes[i].note, 
                octave, 
                noteOptions
            );
            
            if (noteId) noteIds.push(noteId);
        }
        
        return { chordId, noteIds };
    }
    
    // Play a sequence of notes
    async playSequence(sequence, options = {}) {
        const tempo = options.tempo || this.settings.tempo;
        const noteLength = options.noteLength || (60 / tempo); // Quarter note duration
        const gap = options.gap || 0; // Gap between notes
        
        for (let i = 0; i < sequence.length; i++) {
            const item = sequence[i];
            const delay = i * (noteLength + gap) * 1000;
            
            setTimeout(async () => {
                if (typeof item === 'string') {
                    // Simple note
                    await this.playNote(item, options.octave || 4, {
                        duration: noteLength,
                        ...options
                    });
                } else if (item.type === 'chord') {
                    // Chord
                    await this.playChord(item.root, item.chordType, item.octave || 4, {
                        duration: noteLength,
                        ...options
                    });
                } else {
                    // Complex note object
                    await this.playNote(item.note, item.octave || 4, {
                        duration: item.duration || noteLength,
                        ...item,
                        ...options
                    });
                }
            }, delay);
        }
    }
    
    // Settings management
    setMasterVolume(volume) {
        this.settings.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.linearRampToValueAtTime(
                this.settings.masterVolume,
                this.audioContext.currentTime + 0.1
            );
        }
    }
    
    setTempo(bpm) {
        this.settings.tempo = Math.max(30, Math.min(300, bpm));
    }
    
    setTimbre(timbre) {
        if (Object.values(TIMBRES).includes(timbre)) {
            this.settings.timbre = timbre;
        }
    }
    
    setTransitionTime(time) {
        this.settings.transitionTime = Math.max(0.001, Math.min(1, time));
    }
    
    // Get current settings
    getSettings() {
        return { ...this.settings };
    }
    
    // Get available timbres
    getAvailableTimbres() {
        return Object.values(TIMBRES);
    }
    
    // Get available effects
    getAvailableEffects() {
        return Object.values(EFFECT_TYPES);
    }
    
    // Utility method for UI feedback
    playUIFeedback(frequency = 800, duration = 100, options = {}) {
        const noteOptions = {
            duration: duration / 1000,
            timbre: TIMBRES.sine,
            volume: 0.3,
            attack: 0.01,
            release: 0.05,
            ...options
        };
        
        // Use frequency directly if provided, otherwise treat as note
        if (typeof frequency === 'number') {
            return this.playFrequency(frequency, noteOptions);
        } else {
            return this.playNote(frequency, 4, noteOptions);
        }
    }
    
    // Play raw frequency (for compatibility and special effects)
    async playFrequency(frequency, options = {}) {
        await this.initialize();
        
        const noteId = options.id || `freq-${frequency}-${Date.now()}`;
        const duration = options.duration || 0.1;
        const volume = options.volume ?? 0.3;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const noteGain = this.audioContext.createGain();
            
            oscillator.type = options.timbre || 'sine';
            oscillator.frequency.value = frequency;
            noteGain.gain.value = 0;
            
            oscillator.connect(noteGain);
            this.setupEffectsChain(noteGain);
            
            const now = this.audioContext.currentTime;
            const attackTime = options.attack || 0.01;
            const releaseTime = options.release || 0.05;
            
            oscillator.start(now);
            
            // Envelope
            noteGain.gain.linearRampToValueAtTime(volume, now + attackTime);
            noteGain.gain.linearRampToValueAtTime(0, now + duration);
            
            oscillator.stop(now + duration);
            
            return noteId;
        } catch (error) {
            console.error('Failed to play frequency:', error);
            return null;
        }
    }
    
    // Clean up resources
    destroy() {
        this.stopAllNotes(0);
        this.clearEffects();
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        this.initialized = false;
    }
}

// Export everything needed
export {
    TIMBRES,
    EFFECT_TYPES,
    SOLFEGE_TO_NOTE,
    NOTE_FREQUENCIES,
    Chord,
    AudioEffect,
    EnhancedOscillator
};

// Create and export a default instance
export const enhancedAudioEngine = new EnhancedAudioEngine();
