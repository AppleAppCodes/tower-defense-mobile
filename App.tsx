import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';

const App: React.FC = () => {
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand(); // Expand to full height
      
      // Match theme colors
      tg.setHeaderColor('#0f172a'); // slate-900
      tg.setBackgroundColor('#0f172a');
    }
  }, []);

  const handleGameOver = (wave: number) => {
    if (wave > highScore) {
      setHighScore(wave);
    }
  };

  return (
    // Use h-[100vh] to force full viewport height, crucial for Telegram Web Apps
    <div className="h-[100vh] w-full bg-slate-950 flex flex-col overflow-hidden">
      <GameCanvas onGameOver={handleGameOver} />
    </div>
  );
};

export default App;