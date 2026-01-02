
import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '../types';

// NOTE: In production, replace this with your actual deployed server URL (e.g. Render, Heroku)
// Connected to Cloudflare Secure Tunnel
const SERVER_URL = 'https://doll-tar-nats-loading.trycloudflare.com';
class SocketService {
  public socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  public isConnected: boolean = false;

  connect() {
    if (this.socket) return;

    this.socket = io(SERVER_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Connected to Game Server:', this.socket?.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Game Server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (err) => {
        console.warn("Socket connection failed (Is the server running?):", err.message);
    });
  }

  joinGame(roomId: string) {
    if (!this.socket) this.connect();
    this.socket?.emit('join_game', roomId);
  }

  sendAction(gameId: string, type: 'SPAWN' | 'LAYOUT' | 'READY' | 'GAME_OVER', payload: any) {
    this.socket?.emit('send_action', { gameId, type, payload });
  }

  onMatchFound(callback: (data: { role: 'DEFENDER' | 'ATTACKER', gameId: string }) => void) {
    this.socket?.on('match_found', callback);
  }

  onOpponentAction(callback: (action: { type: 'SPAWN' | 'LAYOUT' | 'READY' | 'GAME_OVER', payload: any }) => void) {
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
