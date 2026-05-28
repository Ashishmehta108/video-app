# Video App Backend

## Database (PostgreSQL)

Local PostgreSQL typically does not have SSL enabled. The app and Drizzle are configured to disable SSL in development:

- `db/index.js` and `db/migrate.js` set `ssl: false` when `NODE_ENV` is not `production`
- `drizzle.config.js` sets `dbCredentials.ssl: false` for local dev
- `DATABASE_URL` should include `?sslmode=disable` for local connections

In production (`NODE_ENV=production`), connections use SSL with `rejectUnauthorized: false` (common for managed Postgres hosts).

### Drizzle commands

```bash
pnpm db:generate   # generate migrations from schema
pnpm db:migrate    # apply migrations
npx drizzle-kit push   # push schema directly to DB
```

Ensure PostgreSQL is running and `DATABASE_URL` in `.env` points at your local database before running these commands.

## Sarvam streaming STT (SDK + WebSocket bridge)

The backend proxies browser PCM audio to Sarvam streaming STT using the official `sarvamai` SDK when installed, with a raw WebSocket fallback. Transcript rows are broadcast to the meeting room on each finalized segment.

### Environment

Add to `backend/.env` (see `.env.example`):

```env
SARVAM_API_KEY=your_subscription_key
```

Restart the backend after changing `.env`. Do not commit real keys.

### Install SDK

```bash
cd backend
npm install
```

### Verify module loads

```bash
cd backend
node -e "import('./socket/handlers.js').then(() => console.log('ok'))"
```

### Sarvam WebSocket smoke test

```bash
cd backend
node -r dotenv/config scripts/test-sarvam-ws.js
```

Prints whether `SARVAM_API_KEY` is set (not the value), then attempts handshake + a short silent PCM frame.

### Manual test in a meeting

1. Start backend: `npm run dev`
2. Start frontend, join a room with two users (optional, for broadcast).
3. Open the **Transcript** tab → **Start**.
4. Watch backend logs for `sarvam stt handshake rejected` (bad key) or successful connection.
5. Client badges: **Connecting…** → **Sarvam ready** when `stt-ready` fires.
6. Speak clearly; interim text appears as **Live:**; finalized lines persist and appear for all participants.

### Socket events (STT)

| Client emits | Server emits |
|--------------|--------------|
| `stt-start` `{ languageCode, sampleRate, mode, useBrowserFallback }` | `stt-connecting`, then `stt-ready` or `stt-error` / `stt-fallback` |
| `stt-audio` `{ audio, encoding: 'pcm_s16le', sampleRate: 16000 }` | `stt-interim`, `stt-event`, `transcript-update` |
| `stt-flush` | (forces Sarvam buffer flush) |
| `stt-stop` | `stt-closed` |
| `transcript-chunk` | `transcript-update` (browser fallback) |

Audio is only forwarded after the Sarvam WebSocket is **open** (`stt-ready`).

### Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `SARVAM_API_KEY is not configured` | Missing or empty key in `.env` |
| `Invalid Sarvam API key (401/403)` | Invalid or expired API key |
| `Sarvam handshake rejected (4xx)` | Wrong query params; check server log body snippet |
| `TLS certificate verification failed` | Node cannot verify Sarvam TLS (common on Windows); update CA certs |
| Generic `Sarvam STT error` | Usually invalid audio payload; server now sends Sarvam `data.message` |
| **Sarvam connected** but no transcript | Usually `is_final` was missing on API `data` messages (fixed: treat as final); or mic audio sent before `stt-ready` |
| No interim text | Mic blocked, audio sent before `stt-ready`, or sample rate ≠ 16000 |
| Falls back to browser STT | Sarvam failure in Chrome/Edge when browser STT is available |

Sarvam connection uses: `wss://api.sarvam.ai/speech-to-text/ws` with `Api-Subscription-Key` header and query params `model=saaras:v3`, `mode`, `language-code`, `sample_rate=16000`, `input_audio_codec=pcm_s16le`, `high_vad_sensitivity=true`, `vad_signals=true`, `flush_signal=true`.

Connection uses SDK-aligned params: `model=saaras:v3`, `mode=transcribe`, `language-code=en-IN`, `sample_rate=16000`, `input_audio_codec=pcm_s16le`, `high_vad_sensitivity=true`, `vad_signals=true`, `flush_signal=true`.

Audio frames use AsyncAPI shape: `{ audio: { data: "<base64 pcm_s16le>", sample_rate: "16000", encoding: "audio/wav" } }` with `input_audio_codec=pcm_s16le` on the connection. Client emits `stt-audio` with `encoding: pcm_s16le` after `stt-ready`.
