
import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { Lobby } from './components/Lobby';
import { Home } from 'lucide-react';
import { GameMode } from './types';

const App: React.FC = () => {
  const [highScore, setHighScore] = useState(0);
  const [appHeight, setAppHeight] = useState('100vh');
  const [view, setView] = useState<'MENU' | 'GAME' | 'LOBBY'>('MENU');
  const [gameMode, setGameMode] = useState<GameMode>('DEFENSE');
  
  // Online State
  const [onlineGameId, setOnlineGameId] = useState<string | undefined>(undefined);
  const [onlinePlayerNumber, setOnlinePlayerNumber] = useState<1 | 2 | undefined>(undefined);

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.expand(); 
      tg.setHeaderColor('#0f172a'); 
      tg.setBackgroundColor('#0f172a');
      tg.enableClosingConfirmation();
      if (tg.isVersionAtLeast && tg.isVersionAtLeast('7.7')) {
          if (typeof tg.disableVerticalSwipes === 'function') tg.disableVerticalSwipes();
      } else {
           // @ts-ignore
           if (tg.isVerticalSwipesEnabled !== undefined) tg.isVerticalSwipesEnabled = false;
      }
      tg.ready();
    }

    const handleResize = () => setAppHeight(`${window.innerHeight}px`);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleGameOver = (wave: number) => {
    if (wave > highScore) setHighScore(wave);
  };

  const handleStartAdventure = () => {
      if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      setGameMode('DEFENSE');
      setView('GAME');
  };

  const handleStartOnline = () => {
      if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      setView('LOBBY');
  };

  const handleMatchFound = (playerNumber: 1 | 2, gameId: string) => {
      setOnlinePlayerNumber(playerNumber);
      setOnlineGameId(gameId);
      setGameMode('PVP_ONLINE');
      setView('GAME');
  };

  const handleBackToMenu = () => {
      if (window.Telegram?.WebApp?.HapticFeedback) window.Telegram.WebApp.HapticFeedback.selectionChanged();
      setView('MENU');
      setOnlineGameId(undefined);
      setOnlinePlayerNumber(undefined);
  };

  return (
    <div style={{ height: appHeight }} className="w-full bg-slate-950 flex flex-col overflow-hidden touch-none select-none overscroll-none">
      {view === 'MENU' ? (
          <MainMenu onStartAdventure={handleStartAdventure} onStartOnline={handleStartOnline} />
      ) : view === 'LOBBY' ? (
          <Lobby onBack={handleBackToMenu} onMatchFound={handleMatchFound} />
      ) : (
          <div className="relative w-full h-full animate-in fade-in duration-300">
            <GameCanvas
                onGameOver={handleGameOver}
                initialMode={gameMode}
                onlineGameId={onlineGameId}
                onlinePlayerNumber={onlinePlayerNumber}
            />
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