import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';

const App: React.FC = () => {
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Expand to full height immediately
      tg.expand(); 
      
      // Match theme colors to our Slate-950 background
      tg.setHeaderColor('#0f172a'); 
      tg.setBackgroundColor('#0f172a');
      
      // Enable the closing confirmation to prevent accidental swipes closing the game
      tg.enableClosingConfirmation();

      // Notify Telegram that the app is initialized and ready to be shown
      tg.ready();
    }
  }, []);

  const handleGameOver = (wave: number) => {
    if (wave > highScore) {
      setHighScore(wave);
    }
  };

  return (
    // Use h-[100vh] to force full viewport height, crucial for Telegram Web Apps
    // added touch-none to body in index.html, but reinforcing here for the container
    <div className="h-[100vh] w-full bg-slate-950 flex flex-col overflow-hidden touch-none select-none">
      <GameCanvas onGameOver={handleGameOver} />
    </div>
  );
};

export default App;