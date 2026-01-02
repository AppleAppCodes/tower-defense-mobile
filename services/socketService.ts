
import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '../types';

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

  // Updated to return a Promise for UI feedback
  joinGame(roomId: string): Promise<{status: string, role?: string, message?: string}> {
    return new Promise((resolve) => {
        if (!this.socket) this.connect();

        // 5 second timeout safety
        const timeout = setTimeout(() => {
            resolve({ status: 'error', message: 'Connection timed out' });
        }, 5000);

        console.log('Emitting join_game for room:', roomId);
        
        // Emit with Acknowledgement callback
        this.socket?.emit('join_game', roomId, (response: any) => {
            clearTimeout(timeout);
            console.log('Server acknowledged join:', response);
            resolve(response);
        });
    });
  }

  sendAction(gameId: string, type: 'SPAWN' | 'LAYOUT' | 'READY' | 'GAME_OVER', payload: any) {
    this.socket?.emit('send_action', { gameId, type, payload });
  }

  onMatchFound(callback: (data: { role: 'DEFENDER' | 'ATTACKER', gameId: string }) => void) {
    this.socket?.off('match_found');
    this.socket?.on('match_found', (data) => {
        console.log('Match found event received:', data);
        callback(data);
    });
  }

  onOpponentAction(callback: (action: { type: 'SPAWN' | 'LAYOUT' | 'READY' | 'GAME_OVER', payload: any }) => void) {
    this.socket?.off('opponent_action');
    this.socket?.on('opponent_action', callback);
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
