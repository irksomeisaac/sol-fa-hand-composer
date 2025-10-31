import React from 'react';
import './SheetMusic.css';

const STAFF_LINES = 5;
const LINE_SPACING = 12; // pixels between staff lines

// Calculate note position on staff
const getNotePosition = (note, octave) => {
    const basePositions = {
        'do': 0,   // C
        're': 0.5, // D  
        'mi': 1,   // E
        'fa': 1.5, // F
        'sol': 2, // G
        'la': 2.5, // A
        'ti': 3   // B
    };

    const basePosition = basePositions[note] || 0;
    const octaveOffset = (octave - 4) * 3.5; // Each octave moves 3.5 line spaces
    
    return basePosition + octaveOffset;
};

// Determine if note needs ledger lines
const needsLedgerLines = (position) => {
    return position < -1 || position > 4;
};

// Get ledger lines for a note position
const getLedgerLines = (position) => {
    const lines = [];
    
    // Below staff
    if (position < -1) {
        for (let i = -1; i >= Math.floor(position); i--) {
            if (i % 1 === 0) lines.push(i);
        }
    }
    
    // Above staff  
    if (position > 4) {
        for (let i = 5; i <= Math.ceil(position); i++) {
            if (i % 1 === 0) lines.push(i);
        }
    }
    
    return lines;
};

function SheetMusic({ composition, currentNoteDuration }) {
    if (!composition) return null;

    const allItems = composition.getAllNotes();
    const measures = composition.measures;

    const renderNote = (item, index) => {
        if (item.type === 'rest') {
            return (
                <div key={item.id} className="music-rest">
                    <span className="rest-symbol">{item.duration.symbol}</span>
                    <span className="duration-label">{item.duration.name}</span>
                </div>
            );
        }

        const position = getNotePosition(item.note, item.octave);
        const needsLedger = needsLedgerLines(position);
        const ledgerLines = needsLedger ? getLedgerLines(position) : [];

        return (
            <div key={item.id} className="music-note" style={{
                '--note-position': position
            }}>
                {ledgerLines.map(linePos => (
                    <div 
                        key={linePos} 
                        className="ledger-line"
                        style={{ '--line-position': linePos }}
                    />
                ))}
                <div className="note-head">{item.duration.symbol}</div>
                <div className="note-label">
                    {item.note.toUpperCase()}{item.octave}
                </div>
            </div>
        );
    };

    const renderMeasure = (measure, measureIndex) => (
        <div key={measureIndex} className="measure">
            <div className="measure-number">{measureIndex + 1}</div>
            <div className="measure-content">
                {measure.map((item, itemIndex) => renderNote(item, itemIndex))}
                {measure.length === 0 && (
                    <div className="empty-measure">
                        <span>Empty</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="sheet-music">
            <div className="sheet-header">
                <h3>Composition</h3>
                <div className="composition-info">
                    <span>Time: {composition.timeSignature.beats}/{composition.timeSignature.noteValue}</span>
                    <span>Tempo: {composition.tempo} BPM</span>
                    <span>Notes: {composition.getTotalNotes()}</span>
                </div>
            </div>
            
            <div className="staff-container">
                <div className="staff">
                    {/* Staff lines */}
                    {Array.from({ length: STAFF_LINES }, (_, i) => (
                        <div key={i} className="staff-line" style={{
                            top: `${i * LINE_SPACING}px`
                        }} />
                    ))}
                    
                    {/* Treble clef */}
                    <div className="clef">𝄞</div>
                </div>
                
                <div className="measures-container">
                    {measures.map((measure, index) => renderMeasure(measure, index))}
                </div>
            </div>

            <div className="notation-controls">
                <div className="current-settings">
                    <div className="setting">
                        <span>Current Duration:</span>
                        <span className="value">
                            {currentNoteDuration.symbol} {currentNoteDuration.name}
                        </span>
                    </div>
                    <div className="setting">
                        <span>Current Octave:</span>
                        <span className="value">{composition.currentOctave}</span>
                    </div>
                </div>
                
                <div className="quick-reference">
                    <h4>Voice Commands:</h4>
                    <div className="command-list">
                        <span>"Add" - Add current note</span>
                        <span>"Add rest" - Add rest</span>
                        <span>"Quarter note" - Set duration</span>
                        <span>"Half note" - Set duration</span>
                        <span>"Whole note" - Set duration</span>
                        <span>"Undo" - Remove last</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SheetMusic;
