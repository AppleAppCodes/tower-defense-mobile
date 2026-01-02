
import React, { useState, useEffect, useCallback } from 'react';
import { Users, ArrowLeft, Wifi, AlertTriangle, Zap, Crown, User, Check, Swords, Loader2 } from 'lucide-react';
import { socketService } from '../services/socketService';
import { supabase, GameRoom } from '../services/supabaseClient';

interface LobbyProps {
  onBack: () => void;
  onMatchFound: (playerNumber: 1 | 2, gameId: string) => void;
}

type LobbyStatus = 'IDLE' | 'SEARCHING' | 'IN_ROOM' | 'ERROR';

interface RoomState {
  roomId: string;
  playerNumber: 1 | 2;
  opponentJoined: boolean;
  isReady: boolean;
  opponentReady: boolean;
}

export const Lobby: React.FC<LobbyProps> = ({ onBack, onMatchFound }) => {
  const [status, setStatus] = useState<LobbyStatus>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);

  // Connect socket and setup listeners
  useEffect(() => {
    socketService.connect();

    const checkConnection = setInterval(() => {
      const connected = socketService.socket?.connected || false;
      setIsConnected(connected);
    }, 500);

    // Fetch online player count from rooms
    const fetchOnlineCount = async () => {
      try {
        const { count } = await supabase
          .from('game_rooms')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'WAITING');
        setOnlineCount((count || 0) + Math.floor(Math.random() * 3)); // Add some randomness
      } catch (e) {
        console.error(e);
      }
    };
    fetchOnlineCount();
    const countInterval = setInterval(fetchOnlineCount, 10000);

    return () => {
      clearInterval(checkConnection);
      clearInterval(countInterval);
    };
  }, []);

  // Setup socket event listeners when in room
  useEffect(() => {
    if (!roomState) return;

    // Opponent joined the room
    socketService.onOpponentJoined(() => {
      console.log('Opponent joined!');
      setRoomState(prev => prev ? { ...prev, opponentJoined: true } : null);
    });

    // Game starts (both ready)
    socketService.onGameStart(() => {
      console.log('Game starting!');
      if (roomState) {
        onMatchFound(roomState.playerNumber, roomState.roomId);
      }
    });

    // Listen for opponent ready status
    socketService.socket?.on('opponent_ready', () => {
      console.log('Opponent is ready!');
      setRoomState(prev => prev ? { ...prev, opponentReady: true } : null);
    });

    // Opponent disconnected
    socketService.onOpponentDisconnected(() => {
      setRoomState(prev => prev ? { ...prev, opponentJoined: false, opponentReady: false } : null);
    });

  }, [roomState?.roomId, onMatchFound]);

  // Quick Match - Find or create a room
  const handleQuickMatch = useCallback(async () => {
    if (!isConnected) {
      setErrorMessage("Verbindung wird hergestellt...");
      setStatus('ERROR');
      return;
    }

    setStatus('SEARCHING');
    setErrorMessage('');

    try {
      // First, try to find an open room
      const { data: openRooms } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('status', 'WAITING')
        .order('created_at', { ascending: true })
        .limit(1);

      let roomId: string;
      let isHost = false;

      if (openRooms && openRooms.length > 0) {
        // Join existing room
        roomId = openRooms[0].id;
        console.log('Joining existing room:', roomId);
      } else {
        // Create new room
        roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        isHost = true;

        const { error: insertError } = await supabase
          .from('game_rooms')
          .insert({
            id: roomId,
            host_name: `Player${Math.floor(Math.random() * 9999)}`,
            status: 'WAITING',
            player_count: 1,
            max_players: 2
          });

        if (insertError) throw insertError;
        console.log('Created new room:', roomId);
      }

      // Setup match found listener
      socketService.onMatchFound((data) => {
        console.log('Match found:', data);
        setRoomState({
          roomId: data.gameId,
          playerNumber: data.playerNumber,
          opponentJoined: data.playerNumber === 2, // If we're P2, P1 is already there
          isReady: false,
          opponentReady: false
        });
        setStatus('IN_ROOM');

        // Update room in database
        if (data.playerNumber === 2) {
          supabase
            .from('game_rooms')
            .update({ player_count: 2, status: 'IN_PROGRESS' })
            .eq('id', data.gameId);
        }
      });

      const response = await socketService.joinGame(roomId);

      if (response.status !== 'ok') {
        // If join failed, try again by creating a new room
        if (!isHost) {
          return handleQuickMatch();
        }
        throw new Error(response.message || 'Failed to join room');
      }

    } catch (e) {
      console.error('Quick match error:', e);
      setErrorMessage("Matchmaking fehlgeschlagen. Versuche es erneut.");
      setStatus('ERROR');
    }
  }, [isConnected]);

  // Handle Ready button
  const handleReady = useCallback(() => {
    if (!roomState) return;

    setRoomState(prev => prev ? { ...prev, isReady: true } : null);
    socketService.playerReady(roomState.roomId);

    // Notify opponent that we're ready
    socketService.socket?.emit('player_ready_status', { gameId: roomState.roomId });

  }, [roomState]);

  // Leave room
  const handleLeaveRoom = useCallback(async () => {
    if (roomState) {
      // Clean up room if we're the host and no one joined
      if (roomState.playerNumber === 1 && !roomState.opponentJoined) {
        await supabase.from('game_rooms').delete().eq('id', roomState.roomId);
      }
    }
    setRoomState(null);
    setStatus('IDLE');
  }, [roomState]);

  // Render based on status
  const renderContent = () => {
    switch (status) {
      case 'SEARCHING':
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-blue-500/30 flex items-center justify-center">
                <Swords size={40} className="text-blue-400" />
              </div>
              <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">Suche Gegner...</h3>
              <p className="text-slate-400 text-sm">Bitte warten</p>
            </div>
            <button
              onClick={() => setStatus('IDLE')}
              className="text-red-400 text-sm hover:underline"
            >
              Abbrechen
            </button>
          </div>
        );

      case 'IN_ROOM':
        return (
          <div className="flex-1 flex flex-col gap-6">
            {/* Room Header */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-sm font-bold mb-2">
                <Swords size={16} />
                MATCH GEFUNDEN
              </div>
              <p className="text-slate-500 text-xs">Raum: {roomState?.roomId}</p>
            </div>

            {/* Player Slots */}
            <div className="flex-1 flex flex-col gap-4 justify-center">
              {/* Player 1 Slot */}
              <div className={`relative p-6 rounded-2xl border-2 transition-all ${
                roomState?.playerNumber === 1
                  ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-blue-500'
                  : roomState?.opponentJoined
                    ? 'bg-slate-800/50 border-slate-600'
                    : 'bg-slate-900/50 border-slate-700 border-dashed'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    roomState?.playerNumber === 1 ? 'bg-blue-500' : 'bg-slate-700'
                  }`}>
                    {roomState?.playerNumber === 1 ? (
                      <Crown size={32} className="text-white" />
                    ) : roomState?.opponentJoined ? (
                      <User size={32} className="text-slate-300" />
                    ) : (
                      <Loader2 size={32} className="text-slate-500 animate-spin" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg text-white">
                      {roomState?.playerNumber === 1 ? 'DU' : roomState?.opponentJoined ? 'GEGNER' : 'Warte...'}
                    </div>
                    <div className="text-sm text-slate-400">Spieler 1</div>
                  </div>
                  {/* Ready Status */}
                  {(roomState?.playerNumber === 1 ? roomState?.isReady : roomState?.opponentReady) && (
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <Check size={24} className="text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* VS Divider */}
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center font-black text-white shadow-lg">
                  VS
                </div>
              </div>

              {/* Player 2 Slot */}
              <div className={`relative p-6 rounded-2xl border-2 transition-all ${
                roomState?.playerNumber === 2
                  ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500'
                  : roomState?.opponentJoined
                    ? 'bg-slate-800/50 border-slate-600'
                    : 'bg-slate-900/50 border-slate-700 border-dashed'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    roomState?.playerNumber === 2 ? 'bg-purple-500' : roomState?.opponentJoined ? 'bg-slate-700' : 'bg-slate-800'
                  }`}>
                    {roomState?.playerNumber === 2 ? (
                      <Crown size={32} className="text-white" />
                    ) : roomState?.opponentJoined ? (
                      <User size={32} className="text-slate-300" />
                    ) : (
                      <Loader2 size={32} className="text-slate-500 animate-spin" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg text-white">
                      {roomState?.playerNumber === 2 ? 'DU' : roomState?.opponentJoined ? 'GEGNER' : 'Warte...'}
                    </div>
                    <div className="text-sm text-slate-400">Spieler 2</div>
                  </div>
                  {/* Ready Status */}
                  {(roomState?.playerNumber === 2 ? roomState?.isReady : roomState?.opponentReady) && (
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <Check size={24} className="text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ready Button */}
            <div className="space-y-3">
              {!roomState?.opponentJoined ? (
                <div className="text-center py-4">
                  <Loader2 size={24} className="text-slate-500 animate-spin mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Warte auf Gegner...</p>
                </div>
              ) : !roomState?.isReady ? (
                <button
                  onClick={handleReady}
                  className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-black text-xl rounded-2xl shadow-lg shadow-green-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <Check size={28} />
                  BEREIT!
                </button>
              ) : (
                <div className="w-full py-5 bg-gradient-to-r from-green-600/50 to-emerald-600/50 text-green-300 font-bold text-lg rounded-2xl flex items-center justify-center gap-3 border border-green-500/30">
                  <Check size={24} />
                  {roomState?.opponentReady ? 'Spiel startet...' : 'Warte auf Gegner...'}
                </div>
              )}

              <button
                onClick={handleLeaveRoom}
                className="w-full py-3 text-slate-400 hover:text-white transition-colors text-sm"
              >
                Raum verlassen
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex-1 flex flex-col gap-6 justify-center">
            {/* Online Players */}
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>{onlineCount + 1} Spieler online</span>
            </div>

            {/* Main Logo/Title */}
            <div className="text-center py-8">
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <Swords size={48} className="text-white" />
              </div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                PVP MATCH
              </h1>
              <p className="text-slate-400 text-sm">
                Tritt gegen andere Spieler an!
              </p>
            </div>

            {/* Quick Match Button */}
            <button
              onClick={handleQuickMatch}
              disabled={!isConnected}
              className="w-full py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xl rounded-2xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <Zap size={28} />
              SPIEL STARTEN
            </button>

            {/* Info */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <h3 className="font-bold text-white text-sm mb-2">So funktioniert's:</h3>
              <ul className="text-slate-400 text-xs space-y-1">
                <li>• Beide Spieler verteidigen gegen gleiche Wellen</li>
                <li>• Swipe nach rechts um den Gegner zu beobachten</li>
                <li>• Wer zuerst verliert, verliert das Match!</li>
              </ul>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-950/50 via-slate-950 to-black z-0" />

      {/* Content */}
      <div className="z-10 w-full h-full flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={status === 'IN_ROOM' ? handleLeaveRoom : onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-bold">ZURÜCK</span>
          </button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
            isConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            <Wifi size={12} className={isConnected ? "" : "animate-pulse"} />
            {isConnected ? 'ONLINE' : 'VERBINDE...'}
          </div>
        </div>

        {/* Error Message */}
        {status === 'ERROR' && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-xs text-center font-bold flex items-center justify-center gap-2 mb-4">
            <AlertTriangle size={14} /> {errorMessage}
          </div>
        )}

        {/* Main Content */}
        {renderContent()}
      </div>
    </div>
  );
};
