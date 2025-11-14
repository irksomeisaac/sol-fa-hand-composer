import React from 'react';
import HandDetection from './components/HandDetection';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🎵 Sol-fa Head & Hand Composer</h1>
        <p>Complete hands-free music creation: Hand signs for notes, head gestures for controls</p>
      </header>
      <main>
        <HandDetection />
      </main>
      <footer>
        <p>🤟 Kodály signs for notes | ✋ Flat hand in zones for controls | Hold 3 seconds to activate</p>
      </footer>
    </div>
  );
}

export default App;
