
import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '../types';

// NOTE: In production, replace this with your actual deployed server URL (e.g. Render, Heroku)
// Connected to Cloudflare Secure Tunnel
const SERVER_URL = 'https://doll-tar-nats-loading.trycloudflare.com'; 

class SocketService {
  public socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  public isConnected: boolean = false;

  connect() {
    // If socket exists but disconnected, try to reconnect
    if (this.socket) {
        if (!this.socket.connected) {
            this.socket.connect();
        }
        return;
    }

    this.socket = io(SERVER_URL, {
      // Allow default transports (polling first, then upgrade) for better compatibility with Cloudflare/Telegram
      transports: ['polling', 'websocket'], 
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to Game Server:', this.socket?.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from Game Server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (err) => {
        console.warn("Socket connection failed:", err.message);
        this.isConnected = false;
    });
  }

  joinGame(roomId: string) {
    if (!this.socket) this.connect();
    console.log('Emitting join_game for room:', roomId);
    this.socket?.emit('join_game', roomId);
  }

  sendAction(gameId: string, type: 'SPAWN' | 'LAYOUT' | 'READY' | 'GAME_OVER', payload: any) {
    this.socket?.emit('send_action', { gameId, type, payload });
  }

  onMatchFound(callback: (data: { role: 'DEFENDER' | 'ATTACKER', gameId: string }) => void) {
    // Remove existing listeners to prevent duplicates
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
