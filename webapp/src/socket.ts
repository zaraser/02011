// webapp/src/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io("https://localhost:8443", {
      path: "/chat/socket.io",
      withCredentials: true,
      transports: ["websocket"],
      autoConnect: false, // подключаем вручную после прохождения 2FA
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected && !(s as any).connecting) {
    s.connect();
  }
  return s;
}
