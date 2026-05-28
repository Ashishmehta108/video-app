'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { transcriptApi } from '@/lib/api';

/** @typedef {'idle' | 'connecting' | 'ready' | 'error' | 'browser'} SttStatus */

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function encodePcm16Base64(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32Array.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function resampleTo16k(input, fromSampleRate) {
  if (fromSampleRate === 16000) return input;

  const ratio = fromSampleRate / 16000;
  const newLength = Math.round(input.length / ratio);
  const output = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < output.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i += 1) {
      accum += input[i];
      count += 1;
    }
    output[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return output;
}

const AUDIO_CHUNK_MS = 100;

export function useTranscript(socket, roomId, enabled = true) {
  const [entries, setEntries] = useState([]);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [supported, setSupported] = useState(true);
  /** @type {[SttStatus, Function]} */
  const [sttStatus, setSttStatus] = useState('idle');
  const [sttError, setSttError] = useState('');
  const [sttMode, setSttMode] = useState('transcribe');
  const [sttBackend, setSttBackend] = useState(null);

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const recognitionRef = useRef(null);
  const sttReadyRef = useRef(false);
  const listeningRef = useRef(false);
  const pendingChunksRef = useRef([]);
  const flushTimerRef = useRef(null);
  const lastSendRef = useRef(0);
  const useBrowserRef = useRef(false);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  useEffect(() => {
    if (!roomId) return;
    transcriptApi.get(roomId).then(({ data }) => {
      setEntries(data.transcripts || []);
    }).catch(() => {});
  }, [roomId]);

  const flushPendingAudio = useCallback(() => {
    if (!socket?.connected || !sttReadyRef.current || pendingChunksRef.current.length === 0) {
      return;
    }

    const totalLength = pendingChunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of pendingChunksRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    pendingChunksRef.current = [];

    const encoded = encodePcm16Base64(merged);
    socket.emit('stt-audio', {
      audio: encoded,
      encoding: 'pcm_s16le',
      sampleRate: 16000,
    });
    lastSendRef.current = Date.now();
  }, [socket]);

  const stopBrowserRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
  }, []);

  const startBrowserRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setSupported(false);
      setSttError('Browser speech recognition is not supported. Set SARVAM_API_KEY for server STT.');
      setSttStatus('error');
      return false;
    }

    stopBrowserRecognition();

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-IN';

    rec.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript?.trim();
        if (!text) continue;

        if (result.isFinal) {
          socket?.emit('transcript-chunk', { text, isFinal: true });
          setInterim('');
        } else {
          interimText = text;
        }
      }
      if (interimText) setInterim(interimText);
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech') return;
      setSttStatus('error');
      setSttError(event.error || 'Speech recognition error');
    };

    rec.onend = () => {
      if (listeningRef.current && useBrowserRef.current) {
        try {
          rec.start();
        } catch {
          // ignore restart race
        }
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      useBrowserRef.current = true;
      setSttBackend('browser');
      setSttStatus('browser');
      setSttError('');
      return true;
    } catch (err) {
      setSttStatus('error');
      setSttError(err?.message || 'Failed to start browser speech recognition');
      return false;
    }
  }, [socket, stopBrowserRecognition]);

  useEffect(() => {
    if (!socket) return;

    const onUpdate = (entry) => {
      if (!entry?.id) return;
      setEntries((prev) => {
        if (prev.some((e) => e.id === entry.id)) return prev;
        return [...prev, entry];
      });
      setInterim('');
    };
    const onConnecting = () => {
      setSttStatus('connecting');
      setSttError('');
      setSttBackend('sarvam');
    };
    const onReady = () => {
      sttReadyRef.current = true;
      setSttStatus('ready');
      setSttError('');
      setSttBackend('sarvam');
      flushPendingAudio();
    };
    const onClosed = () => {
      sttReadyRef.current = false;
      if (!useBrowserRef.current) {
        setSttStatus((prev) => (prev === 'error' ? 'error' : 'idle'));
        setSttBackend(null);
      }
    };
    const formatSttErrorMessage = (payload) => {
      const parts = [payload?.message].filter(Boolean);
      if (payload?.detail && !parts[0]?.includes(payload.detail)) {
        parts.push(String(payload.detail).slice(0, 200));
      }
      return parts.join(' — ') || 'STT error';
    };

    const tryBrowserFallback = (payload) => {
      const canFallback =
        payload?.fallback === 'transcript-chunk' ||
        payload?.useBrowserFallback ||
        !!getSpeechRecognition();

      if (!canFallback || !listeningRef.current) return false;

      socket.emit('stt-stop');
      sttReadyRef.current = false;

      const started = startBrowserRecognition();
      if (started) {
        setSttError(`${formatSttErrorMessage(payload)} Using browser speech recognition.`);
        return true;
      }
      return false;
    };

    const onError = (payload) => {
      sttReadyRef.current = false;
      if (tryBrowserFallback(payload)) return;

      setSttStatus('error');
      setSttError(formatSttErrorMessage(payload));
      setSttBackend(null);
    };
    const onFallback = (payload) => {
      if (listeningRef.current && !useBrowserRef.current) {
        tryBrowserFallback({ ...payload, fallback: 'transcript-chunk' });
      }
    };
    const onInterim = (payload) => {
      if (payload?.text) {
        setInterim(payload.text);
        if (payload.isFinal) setInterim('');
      }
    };
    const onVad = (payload) => {
      if (payload?.type === 'speech_end' && sttReadyRef.current) {
        socket.emit('stt-flush');
      }
    };

    socket.on('transcript-update', onUpdate);
    socket.on('stt-connecting', onConnecting);
    socket.on('stt-ready', onReady);
    socket.on('stt-closed', onClosed);
    socket.on('stt-error', onError);
    // socket.on('stt-fallback', onFallback);
    socket.on('stt-interim', onInterim);
    socket.on('stt-event', onVad);

    return () => {
      socket.off('transcript-update', onUpdate);
      socket.off('stt-connecting', onConnecting);
      socket.off('stt-ready', onReady);
      socket.off('stt-closed', onClosed);
      socket.off('stt-error', onError);
      socket.off('stt-fallback', onFallback);
      socket.off('stt-interim', onInterim);
      socket.off('stt-event', onVad);
    };
  }, [socket, flushPendingAudio, startBrowserRecognition]);

  const stopCapture = useCallback(async () => {
    const wasListening = listeningRef.current;
    const wasBrowser = useBrowserRef.current;

    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    stopBrowserRecognition();
    useBrowserRef.current = false;

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    pendingChunksRef.current = [];
    sttReadyRef.current = false;

    if (socket?.connected && wasListening && !wasBrowser) {
      socket.emit('stt-flush');
      socket.emit('stt-stop');
    }

    listeningRef.current = false;
    setListening(false);
    setInterim('');
    setSttStatus('idle');
    setSttBackend(null);
  }, [socket, stopBrowserRecognition]);

  const startListening = useCallback(async () => {
    if (!socket?.connected) {
      setSttError('Socket not connected');
      setSttStatus('error');
      return;
    }

    useBrowserRef.current = false;
    setSttBackend(null);

    const SpeechRecognition = getSpeechRecognition();
    const canUseBrowser = !!SpeechRecognition;

    if (!navigator.mediaDevices?.getUserMedia && !canUseBrowser) {
      setSupported(false);
      setSttError('Microphone capture is not available in this browser.');
      return;
    }

    try {
      setSttStatus('connecting');
      setSttError('');
      sttReadyRef.current = false;
      pendingChunksRef.current = [];

      if (!navigator.mediaDevices?.getUserMedia && canUseBrowser) {
        listeningRef.current = true;
        setListening(true);
        if (startBrowserRecognition()) return;
      }

      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext({ sampleRate: 16000 });
        await audioContext.resume();

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;

        streamRef.current = stream;
        audioContextRef.current = audioContext;
        sourceRef.current = source;
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (!sttReadyRef.current || useBrowserRef.current) return;

          const input = event.inputBuffer.getChannelData(0);
          const resampled = resampleTo16k(input, audioContext.sampleRate);
          pendingChunksRef.current.push(resampled);

          const now = Date.now();
          if (now - lastSendRef.current >= AUDIO_CHUNK_MS) {
            flushPendingAudio();
          }
        };

        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(audioContext.destination);

        flushTimerRef.current = setInterval(() => {
          if (sttReadyRef.current && !useBrowserRef.current) flushPendingAudio();
        }, AUDIO_CHUNK_MS);
      }

      socket.emit('stt-start', {
        languageCode: 'en-IN',
        sampleRate: 16000,
        mode: sttMode,
        useBrowserFallback: canUseBrowser,
      });

      listeningRef.current = true;
      setListening(true);
    } catch (err) {
      setSttError(err?.message || 'Failed to start transcription');
      setSttStatus('error');
      await stopCapture();
    }
  }, [socket, sttMode, flushPendingAudio, stopCapture, startBrowserRecognition]);

  const stopListening = useCallback(async () => {
    await stopCapture();
  }, [stopCapture]);

  useEffect(() => {
    if (!enabled || !roomId) return;
    return () => {
      stopCapture();
    };
  }, [enabled, roomId, stopCapture]);

  return {
    entries,
    interim,
    listening,
    supported,
    sttConnected: sttStatus === 'ready' || sttStatus === 'browser',
    sttStatus,
    sttError,
    sttMode,
    sttBackend,
    setSttMode,
    startListening,
    stopListening,
  };
}
