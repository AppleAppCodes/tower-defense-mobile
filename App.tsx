
import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { Home } from 'lucide-react';

const App: React.FC = () => {
  const [highScore, setHighScore] = useState(0);
  const [appHeight, setAppHeight] = useState('100vh');
  const [view, setView] = useState<'MENU' | 'GAME'>('MENU');

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

  const handleStartAdventure = () => {
      // Haptic feedback if available
      if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
      setView('GAME');
  };

  const handleBackToMenu = () => {
      if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.selectionChanged();
      }
      setView('MENU');
  };

  return (
    <div 
      style={{ height: appHeight }} 
      className="w-full bg-slate-950 flex flex-col overflow-hidden touch-none select-none overscroll-none"
    >
      {view === 'MENU' ? (
          <MainMenu 
            onStartAdventure={handleStartAdventure} 
            onStartPvp={() => {}} 
          />
      ) : (
          <div className="relative w-full h-full animate-in fade-in duration-300">
            {/* Game Container */}
            <GameCanvas onGameOver={handleGameOver} />
            
            {/* Back to Menu Button - Floating Top Left */}
             <button 
                onClick={handleBackToMenu}
                className="absolute top-3 left-3 z-50 p-2 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg active:scale-90"
                style={{ marginTop: 'env(safe-area-inset-top)' }}
                aria-label="Back to Menu"
             >
                <Home size={18} />
             </button>
          </div>
      )}
    </div>
  );
};

export default App;
