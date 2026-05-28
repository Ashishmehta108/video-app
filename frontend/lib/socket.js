import { io } from 'socket.io-client';
import { getToken } from './auth';
import { SOCKET_URL } from './env';

let socket = null;

export function getSocket() {
  if (typeof window === 'undefined') return null;
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token: getToken() },
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s) return null;
  s.auth = { token: getToken() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
