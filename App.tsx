import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';

const App: React.FC = () => {
  const [highScore, setHighScore] = useState(0);

  const handleGameOver = (wave: number) => {
    if (wave > highScore) {
      setHighScore(wave);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <GameCanvas onGameOver={handleGameOver} />
    </div>
  );
};

export default App;