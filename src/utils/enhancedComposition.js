// Enhanced composition manager with quality of life features
export class EnhancedCompositionManager {
    constructor() {
        this.compositions = this.loadFromStorage() || [];
        this.currentComposition = {
            id: Date.now(),
            name: 'Untitled Composition',
            notes: [],
            currentOctave: 4,
            tempo: 120,
            timeSignature: { beats: 4, noteValue: 4 },
            createdAt: new Date(),
            lastModified: new Date()
        };
        this.undoHistory = [];
        this.redoHistory = [];
        this.maxHistorySize = 50;
        this.autoSaveInterval = null;
        this.setupAutoSave();
    }

    // Auto-save to browser storage
    setupAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.saveToStorage();
        }, 10000); // Auto-save every 10 seconds
    }

    saveToStorage() {
        try {
            const data = {
                compositions: this.compositions,
                currentComposition: this.currentComposition
            };
            localStorage.setItem('sol-fa-compositions', JSON.stringify(data));
            console.log('💾 Auto-saved composition');
        } catch (error) {
            console.warn('Failed to save to storage:', error);
        }
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('sol-fa-compositions');
            if (data) {
                const parsed = JSON.parse(data);
                console.log('📂 Loaded compositions from storage');
                return parsed.compositions || [];
            }
        } catch (error) {
            console.warn('Failed to load from storage:', error);
        }
        return [];
    }

    // Add note with undo support
    addNote(note, octave, accidental = null) {
        this.saveToUndoHistory();
        
        const noteObject = {
            id: Date.now() + Math.random(),
            note: note,
            octave: octave,
            accidental: accidental, // 'sharp', 'flat', or null
            timestamp: Date.now(),
            duration: 'quarter' // Default duration
        };

        this.currentComposition.notes.push(noteObject);
        this.currentComposition.lastModified = new Date();
        this.redoHistory = []; // Clear redo history when new action is made
        this.saveToStorage();
        
        return noteObject;
    }

    // Undo with history
    undo() {
        if (this.undoHistory.length === 0) return false;
        
        const previousState = this.undoHistory.pop();
        this.redoHistory.push(JSON.parse(JSON.stringify(this.currentComposition.notes)));
        this.currentComposition.notes = previousState;
        this.currentComposition.lastModified = new Date();
        this.saveToStorage();
        
        return true;
    }

    // Redo functionality
    redo() {
        if (this.redoHistory.length === 0) return false;
        
        this.saveToUndoHistory();
        const nextState = this.redoHistory.pop();
        this.currentComposition.notes = nextState;
        this.currentComposition.lastModified = new Date();
        this.saveToStorage();
        
        return true;
    }

    saveToUndoHistory() {
        this.undoHistory.push(JSON.parse(JSON.stringify(this.currentComposition.notes)));
        if (this.undoHistory.length > this.maxHistorySize) {
            this.undoHistory.shift();
        }
    }

    // Octave controls
    setOctave(octave) {
        this.currentComposition.currentOctave = Math.max(1, Math.min(8, octave));
        this.saveToStorage();
        return this.currentComposition.currentOctave;
    }

    octaveUp() {
        return this.setOctave(this.currentComposition.currentOctave + 1);
    }

    octaveDown() {
        return this.setOctave(this.currentComposition.currentOctave - 1);
    }

    // Tempo controls
    setTempo(bpm) {
        this.currentComposition.tempo = Math.max(60, Math.min(200, bpm));
        this.saveToStorage();
        return this.currentComposition.tempo;
    }

    tempoUp() {
        return this.setTempo(this.currentComposition.tempo + 10);
    }

    tempoDown() {
        return this.setTempo(this.currentComposition.tempo - 10);
    }

    // Clear composition
    clear() {
        this.saveToUndoHistory();
        this.currentComposition.notes = [];
        this.currentComposition.lastModified = new Date();
        this.redoHistory = [];
        this.saveToStorage();
    }

    // Get composition info
    getCompositionInfo() {
        return {
            ...this.currentComposition,
            noteCount: this.currentComposition.notes.length,
            canUndo: this.undoHistory.length > 0,
            canRedo: this.redoHistory.length > 0,
            lastNote: this.currentComposition.notes[this.currentComposition.notes.length - 1] || null
        };
    }

    // Export as simple format
    exportComposition() {
        const exportData = {
            name: this.currentComposition.name,
            notes: this.currentComposition.notes.map(note => ({
                note: note.note,
                octave: note.octave,
                accidental: note.accidental
            })),
            tempo: this.currentComposition.tempo,
            timeSignature: this.currentComposition.timeSignature,
            exportedAt: new Date().toISOString()
        };

        return JSON.stringify(exportData, null, 2);
    }

    // Get playback sequence with timing
    getPlaybackSequence() {
        const beatDuration = (60 / this.currentComposition.tempo) * 1000; // ms per beat
        
        return this.currentComposition.notes.map((note, index) => ({
            note: note.note,
            octave: note.octave,
            accidental: note.accidental,
            startTime: index * beatDuration,
            duration: beatDuration * 0.8 // 80% of beat duration
        }));
    }

    // Cleanup
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.saveToStorage();
    }
}
