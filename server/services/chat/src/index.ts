// chat/src/index.ts
import Fastify from "fastify";
import { Server } from "socket.io";

import { authenticateSocket } from "./auth.js";
import { initDb } from "./db.js";
import {
  registerSocket,
  unregisterSocket,
  getAllUsers,
} from "./socketRegistry.js";
import { registerAllHandlers } from "./handlers/index.js";
import { syncUsersFromAuth } from "./services/authSync.js";

initDb();

const fastify = Fastify({ logger: true });

// ✅ Socket.IO
const io = new Server(fastify.server, {
  path: "/chat/socket.io",
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

io.use(authenticateSocket);

io.on("connection", (socket: any) => {
  const user = {
    id: socket.user.id,
    login: socket.user.login,
  };

  console.log("✅ connected", {
    id: user.id,
    login: user.login,
    socketId: socket.id,
  });

  registerSocket(user, socket.id);
  registerAllHandlers(io, socket);

  io.emit("users:online", getAllUsers());

  socket.on("disconnect", () => {
    console.log("❌ disconnected", {
      id: user.id,
      socketId: socket.id,
    });

    const wentOffline = unregisterSocket(user.id, socket.id);
    if (wentOffline) {
      io.emit("users:online", getAllUsers());
    }
  });
});

// ✅ START SERVER FIRST
await fastify.listen({ port: 3002, host: "0.0.0.0" });
console.log("Chat service running on 3002");

// 🔁 POLLING ПОСЛЕ START
setInterval(async () => {
  const hasNew = await syncUsersFromAuth();
  if (hasNew) {
    io.emit("user:new");
  }
}, 5000);
