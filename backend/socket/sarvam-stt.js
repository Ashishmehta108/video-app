import WebSocket from 'ws';

const sttSessions = new Map();

let sarvamClientPromise = null;

async function getSarvamClient() {
  if (!process.env.SARVAM_API_KEY) return null;
  if (!sarvamClientPromise) {
    sarvamClientPromise = import('sarvamai')
      .then(({ SarvamAIClient }) =>
        new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY })
      )
      .catch((err) => {
        console.warn('sarvam SDK unavailable, using raw WebSocket:', err.message);
        sarvamClientPromise = null;
        return null;
      });
  }
  return sarvamClientPromise;
}

export function getSttSessionKey(socketId) {
  return socketId;
}

export function getSttSession(socketId) {
  return sttSessions.get(getSttSessionKey(socketId));
}

export function closeSttSession(socketId) {
  const session = sttSessions.get(getSttSessionKey(socketId));
  if (!session) return;

  try {
    if (session.sdkSocket?.close) {
      session.sdkSocket.close();
    } else {
      session.ws?.close();
    }
  } catch {
    // ignore close errors
  }

  sttSessions.delete(getSttSessionKey(socketId));
}

function readUnexpectedResponseBody(res) {
  return new Promise((resolve) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      try {
        resolve(Buffer.concat(chunks).toString('utf8').slice(0, 500));
      } catch {
        resolve('');
      }
    });
    res.on('error', () => resolve(''));
  });
}

function parseSarvamErrorBody(body) {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message || parsed?.message || null;
  } catch {
    return body.length <= 200 ? body : null;
  }
}

export function formatSarvamHandshakeError(statusCode, body) {
  const detail = parseSarvamErrorBody(body);
  if (statusCode === 401 || statusCode === 403) {
    return detail
      ? `Invalid Sarvam API key (${statusCode}): ${detail}`
      : `Invalid Sarvam API key (${statusCode})`;
  }
  if (detail) return `Sarvam handshake rejected (${statusCode}): ${detail}`;
  return `Sarvam handshake rejected (${statusCode || 'unknown'})`;
}

function formatSarvamWsError(err) {
  const msg = err?.message || 'Speech transcription failed';
  if (/unable to verify the first certificate/i.test(msg)) {
    return 'TLS certificate verification failed connecting to Sarvam (check system/Node CA certificates)';
  }
  return msg;
}

export function parseSarvamSttMessage(payload) {
  if (!payload || typeof payload !== 'object') return null;

  if (payload.type === 'transcript' && payload.text) {
    return {
      kind: 'transcript',
      text: payload.text,
      isFinal: payload.is_final !== false,
      requestId: payload.request_id,
    };
  }

  if (payload.type === 'speech_start') {
    return { kind: 'vad', signal: 'speech_start' };
  }
  if (payload.type === 'speech_end') {
    return { kind: 'vad', signal: 'speech_end' };
  }

  if (payload.type === 'error') {
    const errMsg =
      payload.data?.message ||
      payload.data?.error ||
      payload.message ||
      payload.error ||
      'Sarvam STT error';
    return { kind: 'error', message: errMsg, code: payload.data?.code };
  }

  if (payload.type === 'events' && payload.data?.signal_type) {
    const signal =
      payload.data.signal_type === 'START_SPEECH'
        ? 'speech_start'
        : payload.data.signal_type === 'END_SPEECH'
          ? 'speech_end'
          : null;
    if (signal) return { kind: 'vad', signal };
  }

  if (payload.type === 'data' && payload.data?.transcript) {
    // AsyncAPI has no is_final; treat absent as finalized segment (not partial-only)
    const isFinal =
      payload.data.is_final === undefined ? true : !!payload.data.is_final;
    return {
      kind: 'transcript',
      text: payload.data.transcript,
      isFinal,
      requestId: payload.data.request_id,
    };
  }

  if (payload.transcript && typeof payload.transcript === 'string') {
    return {
      kind: 'transcript',
      text: payload.transcript,
      isFinal: payload.is_final !== false,
      requestId: payload.request_id,
    };
  }

  if (payload.text && (payload.type === 'translation' || payload.type === 'transcript')) {
    return {
      kind: 'transcript',
      text: payload.text,
      isFinal: payload.is_final !== false,
      requestId: payload.request_id,
    };
  }

  return null;
}

function buildSarvamWsUrl({ languageCode, sampleRate, mode }) {
  const wsUrl = new URL('wss://api.sarvam.ai/speech-to-text/ws');
  wsUrl.searchParams.set('language-code', languageCode);
  wsUrl.searchParams.set('model', 'saaras:v3');
  wsUrl.searchParams.set('mode', mode);
  wsUrl.searchParams.set('sample_rate', String(sampleRate));
  wsUrl.searchParams.set('input_audio_codec', 'pcm_s16le');
  wsUrl.searchParams.set('high_vad_sensitivity', 'true');
  wsUrl.searchParams.set('vad_signals', 'true');
  wsUrl.searchParams.set('flush_signal', 'true');
  return wsUrl;
}

function attachSttHandlers({ io, socket, session, wsLike, transport }) {
  const handleParsed = async (parsed) => {
    if (!parsed) return;

    if (parsed.kind === 'error') {
      session.onError({ message: parsed.message, code: parsed.code });
      return;
    }

    if (parsed.kind === 'vad') {
      socket.emit('stt-event', { type: parsed.signal });
      if (parsed.signal === 'speech_end') {
        await session.flushPending();
      }
      return;
    }

    if (parsed.kind === 'transcript') {
      await session.handleTranscript(parsed);
    }
  };

  const onRawMessage = async (raw) => {
    try {
      const text = typeof raw === 'string' ? raw : raw.toString();
      const payload = JSON.parse(text);
      const parsed = parseSarvamSttMessage(payload);
      if (!parsed) {
        if (payload?.type && !['data', 'events'].includes(payload.type)) {
          console.warn(`sarvam stt unhandled message type (${transport}):`, payload.type);
        }
        return;
      }
      await handleParsed(parsed);
    } catch (err) {
      console.error(`sarvam stt message error (${transport}):`, err);
    }
  };

  wsLike.on('message', onRawMessage);
  if (typeof wsLike.addEventListener === 'function') {
    wsLike.addEventListener('message', (event) => onRawMessage(event.data));
  }
}

function createSessionState({ io, socket, languageCode, sampleRate, mode, persistTranscript, emitSttError }) {
  const session = {
    ws: null,
    sdkSocket: null,
    ready: false,
    transport: 'raw',
    meetingId: socket.meetingId,
    roomId: socket.roomId,
    userId: socket.user.id,
    sampleRate,
    languageCode,
    mode,
    pendingUtterance: '',
    lastPersistedText: '',
    lastPersistedRequestId: null,
    onError: (payload) => emitSttError(socket, payload),
    async handleTranscript(parsed) {
      const text = parsed.text.trim();
      if (!text) return;

      this.pendingUtterance = text;
      socket.emit('stt-interim', { text, isFinal: parsed.isFinal });

      if (!parsed.isFinal) return;

      const duplicate =
        text === this.lastPersistedText &&
        parsed.requestId &&
        parsed.requestId === this.lastPersistedRequestId;
      if (duplicate) return;

      const entry = await persistTranscript({
        meetingId: this.meetingId,
        userId: this.userId,
        roomId: this.roomId,
        text,
        isFinal: true,
      });

      this.lastPersistedText = text;
      this.lastPersistedRequestId = parsed.requestId ?? null;
      this.pendingUtterance = '';

      io.to(this.roomId).emit('transcript-update', entry);
      socket.emit('transcript-update', entry);
    },
    async flushPending() {
      const text = this.pendingUtterance.trim();
      if (!text || text === this.lastPersistedText) {
        this.pendingUtterance = '';
        return;
      }

      const entry = await persistTranscript({
        meetingId: this.meetingId,
        userId: this.userId,
        roomId: this.roomId,
        text,
        isFinal: true,
      });

      this.lastPersistedText = text;
      this.pendingUtterance = '';
      io.to(this.roomId).emit('transcript-update', entry);
      socket.emit('transcript-update', entry);
    },
  };

  return session;
}

async function createSarvamSttSessionRaw({ io, socket, languageCode, sampleRate, mode, persistTranscript, emitSttError }) {
  const apiKey = process.env.SARVAM_API_KEY;
  const wsUrl = buildSarvamWsUrl({ languageCode, sampleRate, mode });

  const sarvamWs = new WebSocket(wsUrl, {
    headers: { 'Api-Subscription-Key': apiKey },
    handshakeTimeout: 15000,
  });

  const session = createSessionState({
    io,
    socket,
    languageCode,
    sampleRate,
    mode,
    persistTranscript,
    emitSttError,
  });
  session.ws = sarvamWs;
  session.transport = 'raw';

  sarvamWs.on('open', () => {
    session.ready = true;
    socket.emit('stt-ready', { languageCode, sampleRate, mode, transport: 'raw' });
  });

  attachSttHandlers({
    io,
    socket,
    session,
    wsLike: sarvamWs,
    transport: 'raw',
  });

  sarvamWs.on('error', (err) => {
    console.error('sarvam stt websocket error:', err.message);
    emitSttError(socket, { message: formatSarvamWsError(err) });
  });

  sarvamWs.on('unexpected-response', async (_req, res) => {
    const body = await readUnexpectedResponseBody(res);
    console.error('sarvam stt handshake rejected:', res.statusCode, res.statusMessage, body || '(no body)');
    emitSttError(socket, {
      message: formatSarvamHandshakeError(res.statusCode, body),
      detail: body || undefined,
    });
  });

  sarvamWs.on('close', (code, reasonBuffer) => {
    session.ready = false;
    const reason = reasonBuffer?.toString() || '';
    if (code !== 1000) {
      console.error('sarvam stt websocket closed early:', code, reason);
      emitSttError(socket, {
        message: `Sarvam connection closed (${code}${reason ? `: ${reason}` : ''})`,
        triggerFallback: false,
      });
    }
    if (sttSessions.get(getSttSessionKey(socket.id)) === session) {
      sttSessions.delete(getSttSessionKey(socket.id));
    }
    socket.emit('stt-closed');
  });

  return session;
}

async function createSarvamSttSessionSdk({ io, socket, languageCode, sampleRate, mode, persistTranscript, emitSttError }) {
  const client = await getSarvamClient();
  if (!client) return null;

  const sdkSocket = await client.speechToTextStreaming.connect({
    model: 'saaras:v3',
    mode,
    languageCode,
    sampleRate,
    inputAudioCodec: 'pcm_s16le',
    highVadSensitivity: true,
    vadSignals: true,
    flushSignal: true,
  });

  const session = createSessionState({
    io,
    socket,
    languageCode,
    sampleRate,
    mode,
    persistTranscript,
    emitSttError,
  });
  session.sdkSocket = sdkSocket;
  session.transport = 'sdk';

  const markReady = () => {
    session.ready = true;
    socket.emit('stt-ready', { languageCode, sampleRate, mode, transport: 'sdk' });
  };

  if (sdkSocket.readyState === WebSocket.OPEN || sdkSocket.readyState === 1) {
    markReady();
  } else {
    sdkSocket.on?.('open', markReady);
    sdkSocket.addEventListener?.('open', markReady);
  }

  const onSdkMessage = async (message) => {
    const payload = typeof message === 'string' ? JSON.parse(message) : message;
    const parsed = parseSarvamSttMessage(payload);
    if (!parsed && payload?.type) {
      console.warn('sarvam stt unhandled SDK message type:', payload.type);
      return;
    }
    if (parsed?.kind === 'error') {
      emitSttError(socket, { message: parsed.message, code: parsed.code });
      return;
    }
    if (parsed?.kind === 'vad') {
      socket.emit('stt-event', { type: parsed.signal });
      if (parsed.signal === 'speech_end') await session.flushPending();
      return;
    }
    if (parsed?.kind === 'transcript') {
      await session.handleTranscript(parsed);
    }
  };

  if (typeof sdkSocket.on === 'function') {
    sdkSocket.on('message', onSdkMessage);
  } else if (typeof sdkSocket.addEventListener === 'function') {
    sdkSocket.addEventListener('message', (event) => onSdkMessage(event.data));
  }

  const onClose = () => {
    session.ready = false;
    if (sttSessions.get(getSttSessionKey(socket.id)) === session) {
      sttSessions.delete(getSttSessionKey(socket.id));
    }
    socket.emit('stt-closed');
  };

  sdkSocket.on?.('close', onClose);
  sdkSocket.on?.('error', (err) => {
    emitSttError(socket, { message: formatSarvamWsError(err) });
  });
  sdkSocket.addEventListener?.('close', onClose);
  sdkSocket.addEventListener?.('error', (err) => {
    emitSttError(socket, { message: formatSarvamWsError(err) });
  });

  return session;
}

export async function createSarvamSttSession({
  io,
  socket,
  languageCode = 'en-IN',
  sampleRate = 16000,
  mode = 'transcribe',
  persistTranscript,
  emitSttError,
}) {
  if (!process.env.SARVAM_API_KEY) {
    throw new Error('SARVAM_API_KEY is not configured');
  }

  let session = null;
  try {
    session = await createSarvamSttSessionSdk({
      io,
      socket,
      languageCode,
      sampleRate,
      mode,
      persistTranscript,
      emitSttError,
    });
  } catch (err) {
    console.warn('sarvam SDK connect failed, falling back to raw WebSocket:', err.message);
  }

  if (!session) {
    session = await createSarvamSttSessionRaw({
      io,
      socket,
      languageCode,
      sampleRate,
      mode,
      persistTranscript,
      emitSttError,
    });
  }

  sttSessions.set(getSttSessionKey(socket.id), session);
  return session;
}

export function sendSarvamAudio(session, { audio, sampleRate }) {
  const data = typeof audio === 'string' ? audio : Buffer.from(audio).toString('base64');
  const rate = String(sampleRate || session.sampleRate || 16000);

  if (session.sdkSocket?.transcribe) {
    session.sdkSocket.transcribe({
      audio: data,
      encoding: 'audio/wav',
      sampleRate: Number(rate),
    });
    return;
  }

  if (!session.ws || session.ws.readyState !== WebSocket.OPEN) return;

  session.ws.send(
    JSON.stringify({
      audio: {
        data,
        sample_rate: rate,
        encoding: 'audio/wav',
      },
    })
  );
}

export function flushSarvamSession(session) {
  if (session.sdkSocket?.flush) {
    session.sdkSocket.flush();
    return;
  }
  if (session.ws?.readyState === WebSocket.OPEN) {
    session.ws.send(JSON.stringify({ type: 'flush' }));
  }
}

export function isSarvamSessionReady(session) {
  if (!session?.ready) return false;
  if (session.sdkSocket) {
    const state = session.sdkSocket.readyState;
    return state === undefined || state === WebSocket.OPEN || state === 1;
  }
  return session.ws?.readyState === WebSocket.OPEN;
}
