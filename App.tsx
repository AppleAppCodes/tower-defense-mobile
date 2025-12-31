import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';

const App: React.FC = () => {
  const [highScore, setHighScore] = useState(0);
  const [appHeight, setAppHeight] = useState('100vh');

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

      // Disable vertical swipes (Newer Telegram API feature) to lock the view
      // We check if the method exists or if the property is settable
      if (tg.isVersionAtLeast && tg.isVersionAtLeast('7.7')) {
          if (typeof tg.disableVerticalSwipes === 'function') {
              tg.disableVerticalSwipes();
          }
      } else {
           // Fallback attempt: some versions expose 'isVerticalSwipesEnabled' property directly
           // @ts-ignore
           if (tg.isVerticalSwipesEnabled !== undefined) {
               // @ts-ignore
               tg.isVerticalSwipesEnabled = false;
           }
      }

      // Notify Telegram that the app is initialized and ready to be shown
      tg.ready();
    }

    // Dynamic viewport height fix for mobile browsers/webviews
    const handleResize = () => {
      // Use window.innerHeight to get the actual visible area
      setAppHeight(`${window.innerHeight}px`);
    };

    // Set initial height
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleGameOver = (wave: number) => {
    if (wave > highScore) {
      setHighScore(wave);
    }
  };

  return (
    // Replaced h-[100vh] with style={{ height: appHeight }} to strictly respect the visible window size
    <div 
      style={{ height: appHeight }} 
      className="w-full bg-slate-950 flex flex-col overflow-hidden touch-none select-none overscroll-none"
    >
      <GameCanvas onGameOver={handleGameOver} />
    </div>
  );
};

export default App;