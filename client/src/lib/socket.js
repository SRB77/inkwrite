import { io } from "socket.io-client";
import { getToken } from "./api";
import { neonEnabled, refreshNeonToken } from "./neonAuth";

const URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5050";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(URL, {
      autoConnect: false,
      auth: { token: getToken() },
      transports: ["websocket"],
    });
  }
  return socket;
}

export async function connectSocket() {
  if (neonEnabled) await refreshNeonToken();
  const s = getSocket();
  s.auth = { token: getToken() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}

export function getSocketId() {
  return socket?.connected ? socket.id : null;
}
