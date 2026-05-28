# VideoMeet — Video Calling App

Full-stack video meeting application with WebRTC, real-time chat, live transcripts, AI assistant, and admin dashboard.

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** running locally (or remote)
- npm

## Project structure

```
video-app/
├── backend/     Express + Socket.io + Drizzle ORM
└── frontend/    Next.js App Router + Tailwind + shadcn-style UI
```

## Environment setup

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and set:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/videoapp
JWT_SECRET=your_secret_here
PORT=5000
FRONTEND_URL=http://localhost:3000
SARVAM_API_KEY=your_key_here
```

### Frontend (`frontend/.env.local`)

Copy `frontend/.env.local.example` to `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Both frontend variables are required. The app now reads them directly from env instead of falling back to a hardcoded URL.

## Database setup

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed   # optional: creates admin user
```

Default seed admin (if using seed script): check `backend/db/seed.js` for credentials.

## Run the app

**Terminal 1 — Backend:**

```bash
cd backend
npm install
npm run dev
```

Server: http://localhost:5000

**Terminal 2 — Frontend:**

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Default test flow

1. Open http://localhost:3000 → redirects to **Register**
2. Create an account (name, email, password)
3. On **Dashboard**, create a meeting or join with a room ID
4. In the **meet room**: allow camera/microphone, use controls (mute, video, screen share, leave)
5. Use side panel tabs: **Chat**, **Transcript** (Sarvam streaming STT or browser fallback), **AI Assistant**
6. Open a second browser/incognito window, register another user, join the same room ID to test WebRTC + chat
7. **Admin**: promote a user to `admin` in DB or use seed; visit `/admin` for user/meeting management

## API overview

| Area | Base path |
|------|-----------|
| Auth | `/api/auth` — register, login, me |
| Meetings | `/api/meet` — create, list, join, settings |
| Chat | `/api/chat/:roomId` — messages, subgroups |
| Transcript | `/api/transcript/:roomId` |
| AI | `/api/sarvam/ask` |
| Admin | `/api/admin/*` (admin role required) |

## Socket events

Connect with `auth: { token: JWT }`.

| Emit | Listen |
|------|--------|
| `join-room` | `room-peers`, `user-joined`, `user-left`, `error` |
| `signal` | `signal` |
| `chat-message` | `chat-message` |
| `join-subgroup` / `leave-subgroup` | `subgroup-joined`, `subgroup-member-joined` |
| `transcript-chunk` | `transcript-update` |
| `stt-start` / `stt-audio` / `stt-flush` / `stt-stop` | `stt-connecting`, `stt-ready`, `stt-interim`, `stt-event`, `stt-error`, `stt-fallback`, `stt-closed`, `transcript-update` |
| `media-state` | `peer-media-state` |

## Live transcript (Sarvam STT)

1. Set `SARVAM_API_KEY` in `backend/.env` (from [Sarvam](https://docs.sarvam.ai)).
2. Restart the backend.
3. In a meeting, open **Transcript** → **Start**. Status: **Connecting…** → **Sarvam ready**.
4. Speak; interim text shows as *Live:*; finalized lines save to the DB and sync to all participants.

Without a valid key, the app can fall back to **browser speech recognition** (Chrome/Edge) via `transcript-chunk` when `useBrowserFallback` is enabled (default when the browser supports it).

### STT test commands

```bash
# Backend: verify handlers module
cd backend
node -e "import('./socket/handlers.js').then(() => console.log('handlers ok'))"

# Frontend: production build
cd frontend
npm run build
```

## Build for production

```bash
cd frontend && npm run build && npm start
cd backend && npm start
```

## Deployment pipeline

The repo now includes a Docker-based deployment pipeline:

- `.github/workflows/deploy.yml` validates both apps on every pull request and, on pushes to `main`, builds and pushes production images to GitHub Container Registry.
- `docker-compose.prod.yml` runs those images on any Docker host.

GitHub repository variables required for the frontend image build:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`

Server-side environment variables required by `docker-compose.prod.yml`:

- `GHCR_OWNER`
- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `SARVAM_API_KEY` if you use live Sarvam STT
- `IMAGE_TAG` if you want to pin anything other than `latest`

Typical release flow:

1. Set the repo variables in GitHub.
2. Push to `main`.
3. On the deployment host, run `docker compose -f docker-compose.prod.yml pull` and `docker compose -f docker-compose.prod.yml up -d`.
4. The `migrate` service applies Drizzle migrations before the backend starts.

## Troubleshooting

- **DB connection errors**: ensure PostgreSQL is running and `DATABASE_URL` is correct
- **401 on API**: log in again; token stored in `localStorage`
- **Socket connect_error**: check `JWT_SECRET` matches backend and `NEXT_PUBLIC_SOCKET_URL`
- **WebRTC**: requires HTTPS or localhost; allow browser media permissions
- **Transcript**: Requires `SARVAM_API_KEY` for Sarvam streaming STT; browser fallback works best in Chrome/Edge. See `backend/README.md` for STT troubleshooting.