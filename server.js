import { createServer } from "http";
import { Server } from "socket.io";

// Minimal HTTP Server (Health Check Only)
const httpServer = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Game Server OK');
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Socket.io Setup with permissive CORS
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['polling', 'websocket']
});

// Enemy types matching client constants
const EnemyType = {
  NORMAL: 'NORMAL',
  FAST: 'FAST',
  TANK: 'TANK',
  BOSS: 'BOSS'
};

// Generate wave enemies (same logic as client, but on server for sync)
// HARDER DIFFICULTY: More enemies, faster scaling
function generateWaveEnemies(wave) {
  const baseCount = 8 + Math.floor(wave * 3); // Was: 5 + wave*2, now: 8 + wave*3
  const queue = [];

  if (wave % 5 === 0) {
    // Boss wave - now with more support enemies
    queue.push({ type: EnemyType.BOSS, delay: 0 });
    for (let i = 0; i < 3; i++) queue.push({ type: EnemyType.TANK, delay: 60 });
    for (let i = 0; i < 8; i++) queue.push({ type: EnemyType.NORMAL, delay: 30 });
  } else if (wave % 3 === 0) {
    // Tank wave - more tanks
    for (let i = 0; i < 4 + Math.floor(wave / 3); i++) queue.push({ type: EnemyType.TANK, delay: i === 0 ? 0 : 60 });
    for (let i = 0; i < baseCount; i++) queue.push({ type: EnemyType.NORMAL, delay: 25 });
  } else if (wave % 2 === 0) {
    // Fast wave - bigger swarm
    for (let i = 0; i < baseCount + 8; i++) queue.push({ type: EnemyType.FAST, delay: i === 0 ? 0 : 12 });
  } else {
    // Normal wave - more enemies, faster spawn
    for (let i = 0; i < baseCount; i++) queue.push({ type: EnemyType.NORMAL, delay: i === 0 ? 0 : 25 });
    // Add some fast enemies mixed in
    if (wave >= 2) {
      for (let i = 0; i < Math.floor(wave / 2); i++) queue.push({ type: EnemyType.FAST, delay: 15 });
    }
  }
  return queue;
}

// Room structure: { player1: socketId, player2: socketId, wave: number, gameStarted: boolean }
const rooms = {};

// Matchmaking queue - players waiting for a match
const waitingQueue = [];

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // Server-side matchmaking - find or wait for opponent
  socket.on("find_match", (callback) => {
    console.log(`Player ${socket.id} looking for match. Queue size: ${waitingQueue.length}`);

    // Remove this player from queue if already there (reconnect case)
    const existingIndex = waitingQueue.findIndex(p => p.id === socket.id);
    if (existingIndex !== -1) {
      waitingQueue.splice(existingIndex, 1);
    }

    if (waitingQueue.length > 0) {
      // Found someone waiting! Create a match
      const opponent = waitingQueue.shift();
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

      console.log(`Matching ${socket.id} with ${opponent.id} in room ${roomId}`);

      // Create room
      rooms[roomId] = {
        player1: opponent.id,
        player2: socket.id,
        wave: 1,
        gameStarted: false,
        readyPlayers: new Set()
      };

      // Join both to socket room
      opponent.socket.join(roomId);
      socket.join(roomId);

      // Notify player 1 (the one who was waiting)
      opponent.socket.emit("match_found", { role: "PLAYER", gameId: roomId, playerNumber: 1 });
      opponent.socket.emit("opponent_joined");

      // Notify player 2 (current player)
      socket.emit("match_found", { role: "PLAYER", gameId: roomId, playerNumber: 2 });

      if (typeof callback === 'function') {
        callback({ status: 'matched', roomId, playerNumber: 2 });
      }
      if (typeof opponent.callback === 'function') {
        opponent.callback({ status: 'matched', roomId, playerNumber: 1 });
      }

    } else {
      // No one waiting, add to queue
      waitingQueue.push({ id: socket.id, socket, callback });
      console.log(`Player ${socket.id} added to queue. Queue size: ${waitingQueue.length}`);

      if (typeof callback === 'function') {
        callback({ status: 'waiting' });
      }
    }
  });

  // Cancel matchmaking
  socket.on("cancel_match", () => {
    const index = waitingQueue.findIndex(p => p.id === socket.id);
    if (index !== -1) {
      waitingQueue.splice(index, 1);
      console.log(`Player ${socket.id} left queue. Queue size: ${waitingQueue.length}`);
    }
  });

  socket.on("join_game", async (roomId, callback) => {
    console.log(`Socket ${socket.id} requesting join room ${roomId}`);

    await socket.join(roomId);

    let room = rooms[roomId];

    if (!room) {
      // Create new room, first player
      rooms[roomId] = {
        player1: socket.id,
        player2: null,
        wave: 1,
        gameStarted: false,
        readyPlayers: new Set()
      };
      console.log(`Room ${roomId} created by ${socket.id} (Player 1)`);

      socket.emit("match_found", { role: "PLAYER", gameId: roomId, playerNumber: 1 });

      if (typeof callback === 'function') {
        callback({ status: 'ok', role: 'PLAYER', playerNumber: 1, gameId: roomId });
      }

    } else if (!room.player2) {
      // Second player joins
      rooms[roomId].player2 = socket.id;
      console.log(`Room ${roomId} joined by ${socket.id} (Player 2)`);

      socket.emit("match_found", { role: "PLAYER", gameId: roomId, playerNumber: 2 });

      // Notify first player that opponent arrived
      io.to(room.player1).emit("opponent_joined");

      if (typeof callback === 'function') {
        callback({ status: 'ok', role: 'PLAYER', playerNumber: 2, gameId: roomId });
      }

    } else {
      // Room full
      console.log(`Room ${roomId} is full. Rejecting ${socket.id}.`);
      socket.emit("room_error", "Room is full");

      if (typeof callback === 'function') {
        callback({ status: 'error', message: 'Room is full' });
      }
      return;
    }
  });

  // Player signals they are ready to start
  socket.on("player_ready", (gameId) => {
    const room = rooms[gameId];
    if (!room) return;

    room.readyPlayers.add(socket.id);
    console.log(`Player ${socket.id} ready in room ${gameId}. Ready: ${room.readyPlayers.size}/2`);

    // Notify opponent that this player is ready
    socket.to(gameId).emit("opponent_ready");

    // When both players are ready, start the game with synchronized wave
    if (room.readyPlayers.size === 2 && !room.gameStarted) {
      room.gameStarted = true;
      room.wave = 1;

      const waveData = {
        wave: 1,
        enemies: generateWaveEnemies(1),
        seed: Date.now()
      };

      console.log(`Starting game in room ${gameId} with wave 1`);
      io.to(gameId).emit("game_start", { waveData });
    }
  });

  // Also handle the status broadcast (for UI sync before game starts)
  socket.on("player_ready_status", ({ gameId }) => {
    const room = rooms[gameId];
    if (!room) return;

    // Notify opponent that this player is ready (for UI display)
    socket.to(gameId).emit("opponent_ready");
  });

  // Player requests next wave (when current wave is cleared)
  socket.on("request_next_wave", (gameId) => {
    const room = rooms[gameId];
    if (!room || !room.gameStarted) return;

    // Track which players finished current wave
    if (!room.waveFinished) room.waveFinished = new Set();
    room.waveFinished.add(socket.id);

    console.log(`Player ${socket.id} finished wave ${room.wave}. Waiting: ${room.waveFinished.size}/2`);

    // When both finished, wait 10 seconds then sync next wave
    if (room.waveFinished.size === 2 && !room.waveTimerActive) {
      room.waveTimerActive = true;
      const nextWave = room.wave + 1;

      // Notify players that next wave is coming in 10 seconds
      io.to(gameId).emit("wave_countdown", { seconds: 10, nextWave });

      console.log(`Starting 10 second countdown for wave ${nextWave} in room ${gameId}`);

      setTimeout(() => {
        // Check if room still exists (players might have left)
        if (!rooms[gameId]) return;

        room.wave = nextWave;
        room.waveFinished.clear();
        room.waveTimerActive = false;

        const waveData = {
          wave: room.wave,
          enemies: generateWaveEnemies(room.wave),
          seed: Date.now()
        };

        console.log(`Syncing wave ${room.wave} to room ${gameId}`);
        io.to(gameId).emit("wave_sync", waveData);
      }, 10000); // 10 seconds delay
    }
  });

  // Player sends their state for spectator mode
  socket.on("state_update", ({ gameId, state }) => {
    const room = rooms[gameId];
    if (!room) return;

    // Broadcast to the other player (for spectator view)
    socket.to(gameId).emit("opponent_state", state);
  });

  // Player lost (lives <= 0)
  socket.on("player_lost", ({ gameId, wave }) => {
    const room = rooms[gameId];
    if (!room) return;

    console.log(`Player ${socket.id} lost at wave ${wave} in room ${gameId}`);

    // Notify opponent that they won
    socket.to(gameId).emit("opponent_lost", { wave });

    // Clean up room
    delete rooms[gameId];
  });

  socket.on("disconnect", (reason) => {
    console.log(`Player disconnected: ${socket.id} Reason: ${reason}`);

    // Remove from matchmaking queue if waiting
    const queueIndex = waitingQueue.findIndex(p => p.id === socket.id);
    if (queueIndex !== -1) {
      waitingQueue.splice(queueIndex, 1);
      console.log(`Removed ${socket.id} from queue on disconnect. Queue size: ${waitingQueue.length}`);
    }

    // Find and clean up any rooms this player was in
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.player1 === socket.id || room.player2 === socket.id) {
        // Notify opponent
        io.to(roomId).emit("opponent_disconnected");
        delete rooms[roomId];
        console.log(`Room ${roomId} closed due to player disconnect`);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Game Server running on port ${PORT}`);
});
