import React from 'react';
import './SimpleSheetMusic.css';

// Note positions on treble clef staff (line 0 = bottom line)
const getStaffPosition = (note, octave) => {
    const notePositions = {
        'do': 0,   // C
        're': 0.5, // D
        'mi': 1,   // E  
        'fa': 1.5, // F
        'sol': 2,  // G
        'la': 2.5, // A
        'ti': 3    // B
    };
    
    const basePosition = notePositions[note] || 0;
    const octaveOffset = (octave - 4) * 3.5; // Each octave is 7 semitones = 3.5 staff positions
    
    return basePosition + octaveOffset;
};

function SimpleSheetMusic({ notes = [] }) {
    return (
        <div className="simple-sheet-music">
            <div className="sheet-header">
                <h3>🎼 Your Composition ({notes.length} notes)</h3>
            </div>
            
            <div className="staff-container">
                {/* Treble clef */}
                <div className="clef">𝄞</div>
                
                {/* Staff lines */}
                <div className="staff">
                    {[0, 1, 2, 3, 4].map(line => (
                        <div key={line} className="staff-line" style={{
                            bottom: `${line * 15}px`
                        }}></div>
                    ))}
                </div>
                
                {/* Notes */}
                <div className="notes-container">
                    {notes.map((noteItem, index) => {
                        const position = getStaffPosition(noteItem.note, noteItem.octave);
                        const needsLedgerLine = position < 0 || position > 4;
                        
                        return (
                            <div 
                                key={index} 
                                className="note-on-staff"
                                style={{
                                    left: `${60 + (index * 40)}px`,
                                    bottom: `${position * 15}px`
                                }}
                            >
                                {/* Ledger lines if needed */}
                                {needsLedgerLine && position < 0 && (
                                    <div className="ledger-line" style={{
                                        bottom: `${Math.floor(position) * 15}px`
                                    }}></div>
                                )}
                                {needsLedgerLine && position > 4 && (
                                    <div className="ledger-line" style={{
                                        bottom: `${Math.ceil(position) * 15}px`
                                    }}></div>
                                )}
                                
                                {/* Note head */}
                                <div className="note-head">♩</div>
                                
                                {/* Note label */}
                                <div className="note-label">
                                    {noteItem.note.toUpperCase()}{noteItem.octave}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {notes.length === 0 && (
                <div className="empty-staff">
                    <p>Hold up a hand sign and say "Add" to place notes on the staff</p>
                </div>
            )}
        </div>
    );
}

export default SimpleSheetMusic;
