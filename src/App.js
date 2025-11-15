import React from 'react';
import VoiceComposer from './components/VoiceComposer';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🎵 Sol-fa Head & Hand Composer</h1>
        <p>Complete hands-free music creation: Hand signs for notes, head gestures for controls</p>
      </header>
      <main>
        <VoiceComposer />
      </main>
      <footer>
        <p>🤟 Kodály hand signs for notes | 🎤 Voice commands for composition control</p>
      </footer>
    </div>
  );
}

export default App;
