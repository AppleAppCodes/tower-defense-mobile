
import React, { useState } from 'react';
import { Play, Copy, Users, ArrowLeft, Globe } from 'lucide-react';
import { socketService } from '../services/socketService';

interface LobbyProps {
  onBack: () => void;
  onMatchFound: (role: 'DEFENDER' | 'ATTACKER', gameId: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onBack, onMatchFound }) => {
  const [roomId, setRoomId] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'WAITING'>('IDLE');

  const handleJoin = () => {
    if (!roomId) return;
    setStatus('CONNECTING');
    
    // Initialize socket connection
    socketService.connect();
    
    // Listen for match start
    socketService.onMatchFound((data) => {
        onMatchFound(data.role, data.gameId);
    });

    // Join the specific room
    socketService.joinGame(roomId);
    setStatus('WAITING');
  };

  const handleCreateRandom = () => {
      const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomId(randomId);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-black z-0" />
        
        <div className="z-10 w-full max-w-sm p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2 text-slate-400 mb-4">
                <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full"><ArrowLeft /></button>
                <span className="font-display tracking-widest">ONLINE LOBBY</span>
            </div>

            <div className="text-center">
                <Globe size={48} className="mx-auto text-indigo-500 mb-4 animate-pulse" />
                <h2 className="text-3xl font-display font-bold">MULTIPLAYER</h2>
                <p className="text-slate-400 text-sm mt-2">Enter a Room Code to play with a friend.</p>
            </div>

            {status === 'IDLE' && (
                <div className="flex flex-col gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Room Code</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                placeholder="ENTER CODE"
                                className="flex-1 bg-black/50 border border-slate-700 rounded-lg px-4 py-3 text-center font-mono text-xl tracking-widest focus:border-indigo-500 outline-none transition-colors"
                            />
                            <button onClick={handleCreateRandom} className="bg-slate-800 p-3 rounded-lg hover:bg-slate-700 border border-slate-700">
                                <RefreshCwIcon /> 
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={handleJoin}
                        disabled={!roomId || roomId.length < 3}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Users size={20} /> JOIN ROOM
                    </button>
                    
                    <div className="text-[10px] text-center text-green-400 mt-2 font-mono flex items-center justify-center gap-1">
                         <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                         Server: Hetzner Server (Live)
                    </div>
                </div>
            )}

            {status === 'WAITING' && (
                <div className="text-center p-8 bg-slate-900/50 rounded-2xl border border-indigo-500/30">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h3 className="text-xl font-bold text-indigo-400">WAITING FOR OPPONENT...</h3>
                    <p className="text-slate-400 text-sm mt-2 font-mono">ROOM: {roomId}</p>
                    <p className="text-xs text-slate-500 mt-4">Share this code with your friend.</p>
                </div>
            )}
        </div>
    </div>
  );
};

const RefreshCwIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);
