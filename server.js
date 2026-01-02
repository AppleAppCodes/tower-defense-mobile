import { createServer } from "http";
import { Server } from "socket.io";

// Minimal HTTP Server (Health Check Only)
// This server does NOT serve any frontend files (index.html, etc.)
const httpServer = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Game Server OK');
  } else {
    // If it's not a socket request (which io handles automatically) and not health, 404.
    res.writeHead(404);
    res.end();
  }
});

// Socket.io Setup with permissive CORS
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow connections from ANY domain (Vercel, localhost, etc.)
    methods: ["GET", "POST"]
  },
  // Allow both transports to be safe, though client forces websocket
  transports: ['polling', 'websocket']
});

// Store active rooms: { roomId: { defender: socketId, attacker: socketId } }
const rooms = {};

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // Note: We accept a 'callback' function here (Socket.io Acknowledgements)
  socket.on("join_game", async (roomId, callback) => {
    console.log(`Socket ${socket.id} requesting join room ${roomId}`);
    
    // Ensure the socket actually joins the room group in Socket.io
    await socket.join(roomId);
    
    let room = rooms[roomId];
    let role = "";

    if (!room) {
      // Create new room, player is DEFENDER
      rooms[roomId] = { defender: socket.id, attacker: null };
      role = "DEFENDER";
      console.log(`Room ${roomId} created by ${socket.id} (DEFENDER)`);
      
      // Emit event for event-based logic
      socket.emit("match_found", { role: "DEFENDER", gameId: roomId });

    } else if (!room.attacker) {
      // Join existing room, player is ATTACKER
      rooms[roomId].attacker = socket.id;
      role = "ATTACKER";
      console.log(`Room ${roomId} joined by ${socket.id} (ATTACKER)`);
      
      // Emit event for event-based logic
      socket.emit("match_found", { role: "ATTACKER", gameId: roomId });
      
      // Notify Defender that Attacker arrived
      io.to(room.defender).emit("opponent_joined");
      
    } else {
      // Room full
      console.log(`Room ${roomId} is full. Rejecting ${socket.id}.`);
      socket.emit("room_error", "Room is full");
      
      if (typeof callback === 'function') {
        callback({ status: 'error', message: 'Room is full' });
      }
      return;
    }

    // Acknowledge the client that they successfully joined
    if (typeof callback === 'function') {
        callback({ status: 'ok', role: role, gameId: roomId });
    }
  });

  // Relay Actions (Spawn, Layout, etc.) directly to the other player in the room
  socket.on("send_action", ({ gameId, type, payload }) => {
    // console.log(`Action ${type} in room ${gameId} from ${socket.id}`); 
    socket.to(gameId).emit("opponent_action", { type, payload });
  });

  socket.on("disconnect", (reason) => {
    console.log(`Player disconnected: ${socket.id} Reason: ${reason}`);
    // Optional: Clean up empty rooms here if needed
  });
});

const PORT = process.env.PORT || 3000;

// Strict binding to 0.0.0.0 is crucial for Docker/Coolify networking
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Game Server running on port ${PORT}`);
});