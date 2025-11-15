import React from 'react';
import HandDetection from './components/HandDetection';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>🎵 Sol-fa hand sign recognition 🎵</h1>
      </header>

      <main>
        {/* Left-aligned image */}
        <img
          src="/kodaly-hand-signs.jpg"
          alt="Images of Sol-fa hand symbols"
          className="hand-image"
        />

        {/* HandDetection component on the right */}
        <HandDetection />
      </main>

      <footer>
        <p>Hold up Sol-fa hand signs to play notes</p>
      </footer>
    </div>
  );
}

export default App;
