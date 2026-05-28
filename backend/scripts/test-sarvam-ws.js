/**
 * Sarvam STT WebSocket smoke test.
 * Usage: npm run test:sarvam-ws
 * Does not print API key values.
 */
import WebSocket from 'ws';
import { parseSarvamSttMessage } from '../socket/sarvam-stt.js';

const PLACEHOLDER_KEYS = new Set(['', 'your_subscription_key', 'YOUR_SARVAM_API_KEY']);

function keyStatus() {
  const key = process.env.SARVAM_API_KEY;
  if (!key || PLACEHOLDER_KEYS.has(key)) {
    return { set: false, placeholder: true };
  }
  return { set: true, placeholder: false };
}

function buildWsUrl() {
  const wsUrl = new URL('wss://api.sarvam.ai/speech-to-text/ws');
  wsUrl.searchParams.set('language-code', 'en-IN');
  wsUrl.searchParams.set('model', 'saaras:v3');
  wsUrl.searchParams.set('mode', 'transcribe');
  wsUrl.searchParams.set('sample_rate', '16000');
  wsUrl.searchParams.set('input_audio_codec', 'pcm_s16le');
  wsUrl.searchParams.set('high_vad_sensitivity', 'true');
  wsUrl.searchParams.set('vad_signals', 'true');
  wsUrl.searchParams.set('flush_signal', 'true');
  return wsUrl;
}

function parseBody(body) {
  try {
    const json = JSON.parse(body);
    return json?.error?.message || json?.message || body;
  } catch {
    return body;
  }
}

const status = keyStatus();
console.log('SARVAM_API_KEY set:', status.set);
console.log('SARVAM_API_KEY looks placeholder:', status.placeholder);

if (!status.set) {
  console.error('FAIL: configure SARVAM_API_KEY in backend/.env');
  process.exit(1);
}

const wsUrl = buildWsUrl();
const ws = new WebSocket(wsUrl, {
  headers: { 'Api-Subscription-Key': process.env.SARVAM_API_KEY },
  handshakeTimeout: 15000,
});

let exitCode = 0;
let sawTranscript = false;
let sawVad = false;

ws.on('open', () => {
  console.log('OK: WebSocket handshake succeeded');
  const silence = Buffer.alloc(3200).toString('base64');
  ws.send(
    JSON.stringify({
      audio: { data: silence, sample_rate: '16000', encoding: 'audio/wav' },
    })
  );
  setTimeout(() => {
    ws.send(JSON.stringify({ type: 'flush' }));
  }, 300);
  setTimeout(() => ws.close(), 2500);
});

ws.on('message', (raw) => {
  const text = raw.toString();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    console.log('recv (non-json):', text.slice(0, 200));
    return;
  }

  const parsed = parseSarvamSttMessage(payload);
  console.log('recv type:', payload.type, parsed ? `parsed=${parsed.kind}` : 'unparsed');

  if (parsed?.kind === 'error') {
    console.error('FAIL: Sarvam error:', parsed.message);
    exitCode = 1;
    return;
  }

  if (parsed?.kind === 'transcript') {
    sawTranscript = true;
    console.log('OK: transcript chunk (isFinal=%s):', parsed.isFinal, parsed.text?.slice(0, 80) || '(empty)');
  }

  if (parsed?.kind === 'vad') {
    sawVad = true;
    console.log('OK: VAD signal:', parsed.signal);
  }
});

ws.on('unexpected-response', async (_req, res) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    console.error('FAIL: handshake rejected', res.statusCode, parseBody(body));
    process.exit(1);
  });
});

ws.on('error', (err) => {
  console.error('FAIL: WebSocket error:', err.message);
  if (/unable to verify the first certificate/i.test(err.message)) {
    console.error(
      'hint: TLS CA issue on this machine — update Node/OS certs or set NODE_EXTRA_CA_CERTS'
    );
  }
  process.exit(1);
});

setTimeout(() => {
  if (ws.readyState === WebSocket.CONNECTING) {
    console.error('FAIL: timed out waiting for handshake');
    process.exit(1);
  }
  if (!sawVad) {
    console.warn('WARN: no VAD events (vad_signals may be off or silence only)');
  }
  if (!sawTranscript) {
    console.warn('WARN: no transcript on silence — speak in a meeting to validate full pipeline');
  } else {
    console.log('OK: parser recognized Sarvam transcript message shape');
  }
  process.exit(exitCode);
}, 20000);
