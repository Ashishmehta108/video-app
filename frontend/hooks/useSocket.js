'use client';

import { useEffect, useState } from 'react';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export function useSocket(roomId) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId) return;

    const s = connectSocket();
    if (!s) return;

    setSocket(s);

    const onConnect = () => {
      setConnected(true);
      setError(null);
      s.emit('join-room', { roomId });
    };

    const onDisconnect = () => setConnected(false);
    const onConnectError = (err) => setError(err?.message || 'Socket error');
    const onSocketError = (payload) => setError(payload?.message || 'Room error');

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);
    s.on('error', onSocketError);

    if (s.connected) onConnect();
    else s.connect();

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
