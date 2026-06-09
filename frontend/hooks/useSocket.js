'use client';

import { useEffect, useState, useRef } from 'react';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export function useSocket(roomId) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const joinedRoomRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const s = connectSocket();
    if (!s) return;

    setSocket(s);

    const onConnect = () => {
      setConnected(true);
      setError(null);
    };

    const onDisconnect = () => setConnected(false);
    const onConnectError = (err) => setError(err?.message || 'Socket error');
    const onSocketError = (payload) => setError(payload?.message || 'Room error');

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);
    s.on('error', onSocketError);

    // If already connected, fire immediately
    if (s.connected) {
      onConnect();
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      s.off('error', onSocketError);
      disconnectSocket();
      setSocket(null);
      setConnected(false);
    };
  }, [roomId]);

  return { socket, connected, error };
}
