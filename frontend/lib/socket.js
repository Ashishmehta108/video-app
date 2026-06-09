import { io } from 'socket.io-client';
import { getToken } from './auth';
import { SOCKET_URL } from './env';

let socket = null;

export function getSocket() {
  if (typeof window === 'undefined') return null;
  return socket;
}

export function connectSocket() {
  if (typeof window === 'undefined') return null;

  // If there's an existing socket that's disconnected or stale, destroy it
  if (socket && !socket.connected) {
    socket.removeAllListeners();
    socket = null;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token: getToken() },
    });
  }

  // Always refresh the auth token
  socket.auth = { token: getToken() };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
