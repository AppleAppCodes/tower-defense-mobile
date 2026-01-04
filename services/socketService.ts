import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents, OpponentState, WaveData } from '../types';

// Updated to the provided backend IP address via nip.io
const SERVER_URL = 'https://157.180.29.14.nip.io';

class SocketService {
  public socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  public isConnected: boolean = false;
  public lastError: string = '';

  connect() {
    if (this.socket) {
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    // FORCE WEBSOCKET ONLY - No Polling
    this.socket = io(SERVER_URL, {
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('Connected to Game Server:', this.socket?.id);
      this.isConnected = true;
      this.lastError = '';
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from Game Server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (err) => {
      console.warn("Socket connection failed:", err.message);
      this.isConnected = false;
      this.lastError = err.message;
    });
  }

  // Join game room and get assigned as PLAYER
  joinGame(roomId: string): Promise<{ status: string; role?: string; playerNumber?: number; message?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) this.connect();

      // 5 second timeout safety
      const timeout = setTimeout(() => {
        resolve({ status: 'error', message: 'Connection timed out' });
      }, 5000);

      console.log('Emitting join_game for room:', roomId);

      this.socket?.emit('join_game', roomId, (response: any) => {
        clearTimeout(timeout);
        console.log('Server acknowledged join:', response);
        resolve(response);
      });
    });
  }

  // Server-side matchmaking - find or wait for opponent
  findMatch(): Promise<{ status: string; roomId?: string; playerNumber?: number; message?: string }> {
    return new Promise((resolve) => {
      if (!this.socket) this.connect();

      // 30 second timeout for matchmaking
      const timeout = setTimeout(() => {
        resolve({ status: 'error', message: 'Matchmaking timed out' });
      }, 30000);

      console.log('Emitting find_match to server');

      this.socket?.emit('find_match', (response: any) => {
        clearTimeout(timeout);
        console.log('Find match response:', response);
        resolve(response);
      });
    });
  }

  // Cancel matchmaking
  cancelMatch() {
    this.socket?.emit('cancel_match');
  }

  // Signal that player is ready to start
  playerReady(gameId: string) {
    this.socket?.emit('player_ready', gameId);
  }

  // Send current game state for opponent spectating
  sendStateUpdate(gameId: string, state: OpponentState) {
    this.socket?.emit('state_update', { gameId, state });
  }

  // Notify server that player lost
  sendPlayerLost(gameId: string, wave: number) {
    this.socket?.emit('player_lost', { gameId, wave });
  }

  // Request next wave when current is finished
  requestNextWave(gameId: string) {
    this.socket?.emit('request_next_wave', gameId);
  }

  // === Event Listeners ===

  onMatchFound(callback: (data: { role: 'PLAYER'; gameId: string; playerNumber: 1 | 2 }) => void) {
    this.socket?.off('match_found');
    this.socket?.on('match_found', (data) => {
      console.log('Match found event received:', data);
      callback(data);
    });
  }

  onOpponentJoined(callback: () => void) {
    this.socket?.off('opponent_joined');
    this.socket?.on('opponent_joined', callback);
  }

  onGameStart(callback: (data: { waveData: WaveData }) => void) {
    this.socket?.off('game_start');
    this.socket?.on('game_start', (data) => {
      console.log('Game starting with wave data:', data);
      callback(data);
    });
  }

  onWaveSync(callback: (data: WaveData) => void) {
    this.socket?.off('wave_sync');
    this.socket?.on('wave_sync', (data) => {
      console.log('Wave sync received:', data);
      callback(data);
    });
  }

  onWaveCountdown(callback: (data: { seconds: number; nextWave: number }) => void) {
    this.socket?.off('wave_countdown');
    this.socket?.on('wave_countdown', (data: any) => {
      console.log('Wave countdown:', data);
      callback(data);
    });
  }

  onOpponentState(callback: (state: OpponentState) => void) {
    this.socket?.off('opponent_state');
    this.socket?.on('opponent_state', callback);
  }

  onOpponentLost(callback: (data: { wave: number }) => void) {
    this.socket?.off('opponent_lost');
    this.socket?.on('opponent_lost', (data) => {
      console.log('Opponent lost at wave:', data.wave);
      callback(data);
    });
  }

  onOpponentDisconnected(callback: () => void) {
    this.socket?.off('opponent_disconnected');
    this.socket?.on('opponent_disconnected', callback);
  }

  onRoomError(callback: (msg: string) => void) {
    this.socket?.off('room_error');
    this.socket?.on('room_error', callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const socketService = new SocketService();
