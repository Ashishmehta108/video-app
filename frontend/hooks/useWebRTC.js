'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPeer, getDisplayMedia, getUserMedia, stopStream } from '@/lib/webrtc';

export function useWebRTC(socket, roomId) {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);

  const updateRemoteStreams = useCallback(() => {
    const streams = [];
    peersRef.current.forEach((peer, socketId) => {
      if (peer.remoteStream) {
        streams.push({ socketId, stream: peer.remoteStream });
      }
    });
    setRemoteStreams([...streams]);
  }, []);

  const emitMediaState = useCallback(() => {
    if (!socket?.connected) return;
    socket.emit('media-state', {
      audio: audioEnabled,
      video: videoEnabled,
      screen: screenSharing,
    });
  }, [socket, audioEnabled, videoEnabled, screenSharing]);

  const createPeerConnection = useCallback(
    async (targetSocketId, initiator) => {
      if (!socket || peersRef.current.has(targetSocketId)) return;

      const peer = await createPeer(initiator, localStreamRef.current);

      peer.on('signal', (signal) => {
        socket.emit('signal', { to: targetSocketId, signal });
      });

      peer.on('stream', (remoteStream) => {
        peersRef.current.set(targetSocketId, { peer, remoteStream });
        updateRemoteStreams();
      });

      peer.on('close', () => {
        peersRef.current.delete(targetSocketId);
        updateRemoteStreams();
      });

      peer.on('error', (err) => console.error('Peer error:', err));

      peersRef.current.set(targetSocketId, { peer, remoteStream: null });
    },
    [socket, updateRemoteStreams]
  );

  const initLocalMedia = useCallback(async () => {
    try {
      const stream = await getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Media access error:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (!socket || !roomId) return;

    let mounted = true;

    const setup = async () => {
      try {
        await initLocalMedia();
      } catch {
        return;
      }

      if (!mounted) return;

      const onRoomPeers = ({ peers }) => {
        peers.forEach((peerId) => createPeerConnection(peerId, true));
      };

      const onUserJoined = ({ socketId }) => {
        createPeerConnection(socketId, false);
      };

      const onUserLeft = ({ socketId }) => {
        const entry = peersRef.current.get(socketId);
        if (entry?.peer) {
          entry.peer.destroy();
        }
        peersRef.current.delete(socketId);
        updateRemoteStreams();
      };

      const onSignal = ({ from, signal }) => {
        const entry = peersRef.current.get(from);
        if (entry?.peer) {
          entry.peer.signal(signal);
        } else {
          createPeerConnection(from, false).then(() => {
            const e = peersRef.current.get(from);
            e?.peer?.signal(signal);
          });
        }
      };

      socket.on('room-peers', onRoomPeers);
      socket.on('user-joined', onUserJoined);
      socket.on('user-left', onUserLeft);
      socket.on('signal', onSignal);

      return () => {
        socket.off('room-peers', onRoomPeers);
        socket.off('user-joined', onUserJoined);
        socket.off('user-left', onUserLeft);
        socket.off('signal', onSignal);
      };
    };

    const cleanupPromise = setup();

    return () => {
      mounted = false;
      cleanupPromise?.then?.((cleanup) => cleanup?.());
      peersRef.current.forEach(({ peer }) => peer?.destroy?.());
      peersRef.current.clear();
      stopStream(localStreamRef.current);
      stopStream(screenStreamRef.current);
      setRemoteStreams([]);
    };
  }, [socket, roomId, createPeerConnection, initLocalMedia, updateRemoteStreams]);

  useEffect(() => {
    emitMediaState();
  }, [emitMediaState]);

  const toggleAudio = () => {
    const tracks = localStreamRef.current?.getAudioTracks() || [];
    const next = !audioEnabled;
    tracks.forEach((t) => { t.enabled = next; });
    setAudioEnabled(next);
  };

  const toggleVideo = () => {
    const tracks = localStreamRef.current?.getVideoTracks() || [];
    const next = !videoEnabled;
    tracks.forEach((t) => { t.enabled = next; });
    setVideoEnabled(next);
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      stopStream(screenStreamRef.current);
      screenStreamRef.current = null;
      setScreenSharing(false);
      const stream = await getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      peersRef.current.forEach(({ peer }) => {
        if (peer?._pc) {
          const sender = peer._pc.getSenders().find((s) => s.track?.kind === 'video');
          const track = stream.getVideoTracks()[0];
          if (sender && track) sender.replaceTrack(track);
        }
      });
      return;
    }

    try {
      const displayStream = await getDisplayMedia();
      screenStreamRef.current = displayStream;
      setScreenSharing(true);
      const screenTrack = displayStream.getVideoTracks()[0];
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
      }
      peersRef.current.forEach(({ peer }) => {
        const sender = peer?._pc?.getSenders?.().find((s) => s.track?.kind === 'video');
        if (sender && screenTrack) sender.replaceTrack(screenTrack);
      });
      screenTrack.onended = () => toggleScreenShare();
    } catch (err) {
      console.error('Screen share error:', err);
    }
  };

  const leave = () => {
    peersRef.current.forEach(({ peer }) => peer?.destroy?.());
    peersRef.current.clear();
    stopStream(localStreamRef.current);
    stopStream(screenStreamRef.current);
  };

  return {
    localVideoRef,
    localStreamRef,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    screenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    leave,
  };
}
