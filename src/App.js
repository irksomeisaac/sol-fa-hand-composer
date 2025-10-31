import React from 'react';
import HandDetection from './components/HandDetection';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Sol-fa Music Notation Composer</h1>
        <p>Compose sheet music hands-free: Use hand signs for notes, voice commands to add them to staff</p>
      </header>
      <main>
        <HandDetection />
      </main>
      <footer>
        <p>🎵 Right hand: Kodály signs for notes | 🖐️ Left hand: Gestures for controls (Peace sign to add notes)</p>
      </footer>
    </div>
  );
}

export default App;
