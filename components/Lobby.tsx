
import React, { useState, useEffect } from 'react';
import { Play, Users, ArrowLeft, Globe, Wifi, AlertTriangle, Plus, RefreshCw, Clock } from 'lucide-react';
import { socketService } from '../services/socketService';
import { supabase, GameRoom } from '../services/supabaseClient';

interface LobbyProps {
  onBack: () => void;
  onMatchFound: (role: 'DEFENDER' | 'ATTACKER', gameId: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onBack, onMatchFound }) => {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'CREATING' | 'JOINING' | 'WAITING' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    socketService.connect();
    loadRooms();

    const checkConnection = setInterval(() => {
        const connected = socketService.socket?.connected || false;
        setIsConnected(connected);
        if (!connected && socketService.lastError) {
            setSocketError(socketService.lastError);
        } else {
            setSocketError('');
        }
    }, 500);

    const subscription = supabase
      .channel('game_rooms_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, () => {
        loadRooms();
      })
      .subscribe();

    const refreshInterval = setInterval(loadRooms, 5000);

    return () => {
        clearInterval(checkConnection);
        clearInterval(refreshInterval);
        subscription.unsubscribe();
    };
  }, []);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('status', 'WAITING')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createRoom = async () => {
    if (!isConnected) {
        setErrorMessage("Not connected to server.");
        setStatus('ERROR');
        return;
    }

    setStatus('CREATING');
    setErrorMessage('');

    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const userName = `Player${Math.floor(Math.random() * 9999)}`;

    try {
      const { error: insertError } = await supabase
        .from('game_rooms')
        .insert({
          id: roomId,
          host_name: userName,
          status: 'WAITING',
          player_count: 1,
          max_players: 2
        });

      if (insertError) throw insertError;

      socketService.onMatchFound((data) => {
        onMatchFound(data.role, data.gameId);
      });

      const response = await socketService.joinGame(roomId);

      if (response.status === 'ok') {
        setSelectedRoomId(roomId);
        setStatus('WAITING');
      } else {
        await supabase.from('game_rooms').delete().eq('id', roomId);
        setErrorMessage(response.message || "Failed to create room.");
        setStatus('ERROR');
      }
    } catch (e) {
      setErrorMessage("Failed to create room.");
      setStatus('ERROR');
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!isConnected) {
        setErrorMessage("Not connected to server.");
        setStatus('ERROR');
        return;
    }

    setStatus('JOINING');
    setErrorMessage('');
    setSelectedRoomId(roomId);

    socketService.onMatchFound((data) => {
        onMatchFound(data.role, data.gameId);
    });

    try {
        const response = await socketService.joinGame(roomId);

        if (response.status === 'ok') {
            await supabase
              .from('game_rooms')
              .update({
                player_count: 2,
                status: 'IN_PROGRESS',
                updated_at: new Date().toISOString()
              })
              .eq('id', roomId);
        } else {
            setErrorMessage(response.message || "Failed to join room.");
            setStatus('ERROR');
            setSelectedRoomId('');
        }
    } catch (e) {
        setErrorMessage("Network error.");
        setStatus('ERROR');
        setSelectedRoomId('');
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-950 via-slate-950 to-black z-0" />

        <div className="z-10 w-full h-full flex flex-col p-4 gap-4">
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                    <span className="font-display text-sm">BACK</span>
                </button>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    <Wifi size={12} className={isConnected ? "" : "animate-pulse"} />
                    {isConnected ? 'ONLINE' : 'CONNECTING'}
                </div>
            </div>

            <div className="text-center">
                <Globe size={40} className="mx-auto text-blue-500 mb-3" />
                <h2 className="text-2xl font-display font-bold">GAME ROOMS</h2>
                <p className="text-slate-400 text-xs mt-1">Join an open room or create your own</p>
            </div>

            {status === 'ERROR' && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-xs text-center font-bold flex items-center justify-center gap-2">
                    <AlertTriangle size={14} /> {errorMessage}
                </div>
            )}

            <button
                onClick={createRoom}
                disabled={!isConnected || status === 'CREATING' || status === 'JOINING' || status === 'WAITING'}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
                <Plus size={20} /> CREATE NEW ROOM
            </button>

            {(status === 'CREATING' || status === 'JOINING' || status === 'WAITING') && (
                <div className="p-6 bg-slate-900/80 rounded-xl border border-blue-500/30 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <h3 className="text-lg font-bold text-blue-400">
                            {status === 'CREATING' && 'CREATING ROOM...'}
                            {status === 'JOINING' && 'JOINING ROOM...'}
                            {status === 'WAITING' && 'WAITING FOR OPPONENT...'}
                        </h3>
                        {selectedRoomId && <p className="text-slate-400 text-sm font-mono">ROOM: {selectedRoomId}</p>}
                        <button onClick={() => { setStatus('IDLE'); setSelectedRoomId(''); }} className="mt-2 text-xs text-red-400 hover:underline">Cancel</button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Available Rooms</h3>
                    <button onClick={loadRooms} className="text-slate-500 hover:text-white transition-colors">
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                            <Users size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">No rooms available</p>
                            <p className="text-xs mt-1">Create one to start playing</p>
                        </div>
                    ) : (
                        rooms.map((room) => (
                            <button
                                key={room.id}
                                onClick={() => joinRoom(room.id)}
                                disabled={status !== 'IDLE'}
                                className="w-full bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700 hover:border-blue-500/50 rounded-lg p-4 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30 group-hover:border-blue-500/60 transition-colors">
                                            <Users size={20} className="text-blue-400" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-white text-sm">{room.host_name}</div>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span className="font-mono">{room.id}</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {getTimeAgo(room.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                            OPEN
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {room.player_count}/{room.max_players}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
