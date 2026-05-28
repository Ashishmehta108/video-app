import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  meetings,
  messages,
  subgroups,
  subgroupMembers,
  transcripts,
  users,
} from '../db/schema.js';
import {
  closeSttSession,
  createSarvamSttSession,
  flushSarvamSession,
  getSttSession,
  getSttSessionKey,
  isSarvamSessionReady,
  sendSarvamAudio,
} from './sarvam-stt.js';

const roomPeers = new Map();

function getRoomPeers(roomId) {
  if (!roomPeers.has(roomId)) roomPeers.set(roomId, new Map());
  return roomPeers.get(roomId);
}

async function persistTranscript({ meetingId, userId, roomId, text, isFinal }) {
  const [entry] = await db
    .insert(transcripts)
    .values({
      meetingId,
      userId,
      text: text.trim(),
      isFinal: !!isFinal,
    })
    .returning();

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId));

  return {
    ...entry,
    userName: user?.name || 'Unknown',
    roomId,
  };
}

function emitSttError(socket, { message, code, detail, triggerFallback = true }) {
  const payload = {
    message,
    code,
    detail,
    fallback: socket.sttUseBrowserFallback && triggerFallback ? 'transcript-chunk' : undefined,
  };
  socket.emit('stt-error', payload);
  if (socket.sttUseBrowserFallback && triggerFallback) {
    socket.emit('stt-fallback', { mode: 'transcript-chunk', reason: message });
  }
}

export function setupSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);

    socket.on('join-room', async ({ roomId }) => {
      try {
        const [meeting] = await db
          .select()
          .from(meetings)
          .where(eq(meetings.roomId, roomId));

        if (!meeting || meeting.status === 'ended') {
          socket.emit('error', { message: 'Meeting unavailable' });
          return;
        }

        socket.join(roomId);
        socket.roomId = roomId;
        socket.meetingId = meeting.id;

        const peers = getRoomPeers(roomId);
        const existingPeers = [...peers.keys()].filter((id) => id !== socket.id);

        socket.emit('room-peers', { peers: existingPeers });
        peers.set(socket.id, socket.user.id);

        socket.to(roomId).emit('user-joined', {
          socketId: socket.id,
          userId: socket.user.id,
        });
      } catch (err) {
        console.error('join-room error:', err);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('signal', ({ to, signal }) => {
      io.to(to).emit('signal', { from: socket.id, signal });
    });

    socket.on('chat-message', async ({ content, subgroupId }) => {
      try {
        if (!socket.meetingId || !content?.trim()) return;

        const [msg] = await db
          .insert(messages)
          .values({
            meetingId: socket.meetingId,
            userId: socket.user.id,
            content: content.trim(),
            subgroupId: subgroupId || null,
          })
          .returning();

        const [user] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, socket.user.id));

        const payload = {
          ...msg,
          userName: user?.name || 'Unknown',
        };

        if (subgroupId) {
          io.to(`subgroup-${subgroupId}`).emit('chat-message', payload);
        } else {
          io.to(socket.roomId).emit('chat-message', payload);
        }
      } catch (err) {
        console.error('chat-message error:', err);
      }
    });

    socket.on('join-subgroup', async ({ subgroupId }) => {
      try {
        const [subgroup] = await db
          .select()
          .from(subgroups)
          .where(eq(subgroups.id, subgroupId));

        if (!subgroup) return;

        const roomName = `subgroup-${subgroupId}`;
        socket.join(roomName);

        const existing = await db
          .select()
          .from(subgroupMembers)
          .where(
            and(
              eq(subgroupMembers.subgroupId, subgroupId),
              eq(subgroupMembers.userId, socket.user.id)
            )
          );

        if (existing.length === 0) {
          await db.insert(subgroupMembers).values({
            subgroupId,
            userId: socket.user.id,
          });
        }

        socket.emit('subgroup-joined', { subgroupId });
        socket.to(roomName).emit('subgroup-member-joined', {
          userId: socket.user.id,
          subgroupId,
        });
      } catch (err) {
        console.error('join-subgroup error:', err);
      }
    });

    socket.on('leave-subgroup', ({ subgroupId }) => {
      socket.leave(`subgroup-${subgroupId}`);
    });

    socket.on('transcript-chunk', async ({ text, isFinal }) => {
      try {
        if (!socket.meetingId || !text?.trim()) return;
        const entry = await persistTranscript({
          meetingId: socket.meetingId,
          userId: socket.user.id,
          roomId: socket.roomId,
          text,
          isFinal: isFinal ?? false,
        });

        io.to(socket.roomId).emit('transcript-update', entry);
      } catch (err) {
        console.error('transcript-chunk error:', err);
      }
    });

    socket.on('stt-start', async ({ languageCode, sampleRate, mode, useBrowserFallback } = {}) => {
      try {
        socket.sttUseBrowserFallback = !!useBrowserFallback;

        if (!socket.meetingId || !socket.roomId) {
          socket.emit('stt-error', { message: 'Join a meeting before starting STT' });
          return;
        }

        if (!process.env.SARVAM_API_KEY) {
          emitSttError(socket, {
            message: 'SARVAM_API_KEY is not configured on the server',
            triggerFallback: !!useBrowserFallback,
          });
          return;
        }

        closeSttSession(socket.id);
        socket.emit('stt-connecting');
        await createSarvamSttSession({
          io,
          socket,
          languageCode: languageCode || 'en-IN',
          sampleRate: sampleRate || 16000,
          mode: mode || 'transcribe',
          persistTranscript,
          emitSttError,
        });
      } catch (err) {
        console.error('stt-start error:', err);
        emitSttError(socket, { message: err.message || 'Failed to start STT' });
      }
    });

    socket.on('stt-audio', ({ audio, sampleRate } = {}) => {
      const session = getSttSession(socket.id);
      if (!session || !isSarvamSessionReady(session)) return;

      try {
        sendSarvamAudio(session, { audio, sampleRate });
      } catch (err) {
        console.error('stt-audio error:', err);
      }
    });

    socket.on('stt-flush', () => {
      const session = getSttSession(socket.id);
      if (!session || !isSarvamSessionReady(session)) return;
      flushSarvamSession(session);
    });

    socket.on('stt-stop', () => {
      closeSttSession(socket.id);
    });

    socket.on('media-state', ({ audio, video, screen }) => {
      if (socket.roomId) {
        socket.to(socket.roomId).emit('peer-media-state', {
          socketId: socket.id,
          userId: socket.user.id,
          audio,
          video,
          screen,
        });
      }
    });

    socket.on('disconnect', () => {
      closeSttSession(socket.id);
      if (socket.roomId) {
        const peers = getRoomPeers(socket.roomId);
        peers.delete(socket.id);
        if (peers.size === 0) roomPeers.delete(socket.roomId);

        socket.to(socket.roomId).emit('user-left', {
          socketId: socket.id,
          userId: socket.user.id,
        });
      }
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });
}
