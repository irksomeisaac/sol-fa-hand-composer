// Music notation and composition management
export const NOTE_DURATIONS = {
    WHOLE: { name: 'whole', beats: 4, symbol: '𝅝' },
    HALF: { name: 'half', beats: 2, symbol: '𝅗𝅥' },
    QUARTER: { name: 'quarter', beats: 1, symbol: '♩' },
    EIGHTH: { name: 'eighth', beats: 0.5, symbol: '♪' }
};

export const REST_DURATIONS = {
    WHOLE_REST: { name: 'whole rest', beats: 4, symbol: '𝄻' },
    HALF_REST: { name: 'half rest', beats: 2, symbol: '𝄼' },
    QUARTER_REST: { name: 'quarter rest', beats: 1, symbol: '𝄽' },
    EIGHTH_REST: { name: 'eighth rest', beats: 0.5, symbol: '𝄾' }
};

// Note positions on the staff (C4 = middle C)
export const STAFF_POSITIONS = {
    'do': { line: 0, octave4: 0 },  // C
    're': { line: 0.5, octave4: 0.5 },  // D
    'mi': { line: 1, octave4: 1 },  // E
    'fa': { line: 1.5, octave4: 1.5 },  // F
    'sol': { line: 2, octave4: 2 },  // G
    'la': { line: 2.5, octave4: 2.5 },  // A
    'ti': { line: 3, octave4: 3 }   // B
};

export class MusicComposition {
    constructor() {
        this.measures = [[]]; // Array of measures, each measure is array of notes/rests
        this.currentMeasure = 0;
        this.timeSignature = { beats: 4, noteValue: 4 }; // 4/4 time
        this.currentOctave = 4;
        this.currentNoteDuration = NOTE_DURATIONS.QUARTER;
        this.tempo = 120; // BPM
    }

    addNote(note, octave = null, duration = null) {
        const noteOctave = octave || this.currentOctave;
        const noteDuration = duration || this.currentNoteDuration;
        
        const noteObject = {
            type: 'note',
            note: note,
            octave: noteOctave,
            duration: noteDuration,
            id: Date.now() + Math.random()
        };

        // Add to current measure
        this.measures[this.currentMeasure].push(noteObject);
        
        // Check if measure is full
        if (this.getMeasureBeats(this.currentMeasure) >= this.timeSignature.beats) {
            this.startNewMeasure();
        }

        return noteObject;
    }

    addRest(duration = null) {
        const restDuration = duration || this.currentNoteDuration;
        
        const restObject = {
            type: 'rest',
            duration: restDuration,
            id: Date.now() + Math.random()
        };

        this.measures[this.currentMeasure].push(restObject);
        
        if (this.getMeasureBeats(this.currentMeasure) >= this.timeSignature.beats) {
            this.startNewMeasure();
        }

        return restObject;
    }

    getMeasureBeats(measureIndex) {
        if (!this.measures[measureIndex]) return 0;
        return this.measures[measureIndex].reduce((total, item) => {
            return total + item.duration.beats;
        }, 0);
    }

    startNewMeasure() {
        this.measures.push([]);
        this.currentMeasure = this.measures.length - 1;
    }

    undo() {
        if (this.measures[this.currentMeasure].length > 0) {
            this.measures[this.currentMeasure].pop();
        } else if (this.currentMeasure > 0) {
            this.measures.pop();
            this.currentMeasure = this.measures.length - 1;
        }
    }

    clear() {
        this.measures = [[]];
        this.currentMeasure = 0;
    }

    setNoteDuration(duration) {
        this.currentNoteDuration = duration;
    }

    setOctave(octave) {
        this.currentOctave = Math.max(2, Math.min(7, octave));
    }

    octaveUp() {
        this.setOctave(this.currentOctave + 1);
        return this.currentOctave;
    }

    octaveDown() {
        this.setOctave(this.currentOctave - 1);
        return this.currentOctave;
    }

    getAllNotes() {
        return this.measures.flat();
    }

    getTotalNotes() {
        return this.getAllNotes().filter(item => item.type === 'note').length;
    }

    getCompositionInfo() {
        return {
            measureCount: this.measures.length,
            totalNotes: this.getTotalNotes(),
            currentOctave: this.currentOctave,
            currentNoteDuration: this.currentNoteDuration,
            timeSignature: this.timeSignature,
            tempo: this.tempo
        };
    }

    // Convert composition to playable sequence
    getPlaybackSequence() {
        const sequence = [];
        let currentTime = 0;
        const beatDuration = 60000 / this.tempo; // milliseconds per beat

        for (const measure of this.measures) {
            for (const item of measure) {
                if (item.type === 'note') {
                    sequence.push({
                        note: item.note,
                        octave: item.octave,
                        startTime: currentTime,
                        duration: item.duration.beats * beatDuration
                    });
                }
                currentTime += item.duration.beats * beatDuration;
            }
        }

        return sequence;
    }
}
