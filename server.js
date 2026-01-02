
import { createServer } from "http";
import { Server } from "socket.io";

// Create HTTP Server that handles basic requests (Health Check)
const httpServer = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Game Server is RUNNING (Port 3000)');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow connections from anywhere (your Telegram app)
    methods: ["GET", "POST"]
  }
});

// Store active rooms: { roomId: { defender: socketId, attacker: socketId } }
const rooms = {};

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("join_game", (roomId) => {
    // Basic Matchmaking Logic
    let room = rooms[roomId];

    if (!room) {
      // Create new room, player is DEFENDER
      rooms[roomId] = { defender: socket.id, attacker: null };
      socket.join(roomId);
      socket.emit("match_found", { role: "DEFENDER", gameId: roomId });
      console.log(`Room ${roomId} created by Defender ${socket.id}`);
    } else if (!room.attacker) {
      // Join existing room, player is ATTACKER
      rooms[roomId].attacker = socket.id;
      socket.join(roomId);
      socket.emit("match_found", { role: "ATTACKER", gameId: roomId });
      
      // Notify Defender that Attacker arrived
      io.to(room.defender).emit("opponent_joined");
      
      console.log(`Attacker ${socket.id} joined Room ${roomId}`);
    } else {
      // Room full
      socket.emit("room_error", "Room is full");
    }
  });

  // Relay Actions (Spawn, Layout, etc.) directly to the other player in the room
  socket.on("send_action", ({ gameId, type, payload }) => {
    socket.to(gameId).emit("opponent_action", { type, payload });
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    // Cleanup logic would go here (remove room, notify opponent)
  });
});

// Use Port 3000 to match Cloudflare Tunnel default
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
