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
        <HandDetection />
      </main>
      <footer>
        <p>Hold up Sol-fa hand signs to play notes</p>
      </footer>
    </div>
  );
}

export default App;
