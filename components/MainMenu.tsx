
import React from 'react';
import { Swords, Map, Shield, Cpu, ChevronRight, Globe } from 'lucide-react';

interface MainMenuProps {
  onStartAdventure: () => void;
  onStartPvp: () => void;
  onStartOnline: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartAdventure, onStartPvp, onStartOnline }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0" />
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="z-10 flex flex-col items-center gap-8 p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        
        {/* Title Section */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/30 shadow-[0_0_40px_rgba(249,115,22,0.2)] relative overflow-hidden">
                <div className="absolute inset-0 bg-orange-500/20 blur-xl"></div>
                <Shield size={48} className="text-orange-500 relative z-10" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">
            PLANET<br/>DEFENSE
          </h1>
          <p className="text-slate-500 text-xs tracking-[0.3em] font-mono uppercase">Tactical AI Warfare</p>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-4 mt-8">
            <button 
                onClick={onStartAdventure}
                className="group w-full relative overflow-hidden bg-gradient-to-r from-orange-600 to-red-600 p-[1px] rounded-xl shadow-lg transition-transform active:scale-95"
            >
                <div className="bg-slate-950 rounded-[11px] p-4 relative overflow-hidden group-hover:bg-slate-900 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg p-3 text-white shadow-lg">
                                <Map size={24} />
                            </div>
                            <div className="text-left">
                                <div className="font-bold font-display text-lg text-white">ADVENTURE</div>
                                <div className="text-[10px] text-orange-200/70 font-mono tracking-wider">CAMPAIGN MODE</div>
                            </div>
                        </div>
                        <ChevronRight className="text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </div>
            </button>

            <button 
                onClick={onStartPvp}
                className="group w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 p-[1px] rounded-xl shadow-lg transition-transform active:scale-95"
            >
                <div className="bg-slate-950 rounded-[11px] p-4 relative overflow-hidden group-hover:bg-slate-900 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-3 text-white shadow-lg">
                                <Swords size={24} />
                            </div>
                            <div className="text-left">
                                <div className="font-bold font-display text-lg text-white">LOCAL PVP</div>
                                <div className="text-[10px] text-blue-200/70 font-mono tracking-wider">HOTSEAT (PASS & PLAY)</div>
                            </div>
                        </div>
                        <ChevronRight className="text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </div>
            </button>

             <button 
                onClick={onStartOnline}
                className="group w-full relative overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-600 p-[1px] rounded-xl shadow-lg transition-transform active:scale-95"
            >
                <div className="bg-slate-950 rounded-[11px] p-4 relative overflow-hidden group-hover:bg-slate-900 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg p-3 text-white shadow-lg">
                                <Globe size={24} />
                            </div>
                            <div className="text-left">
                                <div className="font-bold font-display text-lg text-white">ONLINE MATCH</div>
                                <div className="text-[10px] text-indigo-200/70 font-mono tracking-wider">REAL-TIME MULTIPLAYER</div>
                            </div>
                        </div>
                        <ChevronRight className="text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                </div>
            </button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-slate-700 text-[10px] font-mono flex items-center gap-2 border px-3 py-1 rounded-full border-slate-800/50 bg-slate-900/30">
            <Cpu size={10} />
            <span>AI SYSTEM ONLINE • BETA v0.1</span>
        </div>

      </div>
    </div>
  );
};
