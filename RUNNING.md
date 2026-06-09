# Quick Start Guide: VideoMeet

Follow these steps to run the **VideoMeet** application locally on your machine.

---

## 1. Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** running locally
- **pnpm** (or `npm` / `yarn`)

---

## 2. Environment Configuration

### Backend Setup
1. Navigate to the `backend` directory.
2. Copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in the values:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/videoapp
   JWT_SECRET=your_secret_here
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   SARVAM_API_KEY=sk_ldj9967s_... # Add your Sarvam API subscription key
   ```

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Copy `.env.local.example` to a new file named `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
3. Open `.env.local` and set the following endpoints:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
   ```

---

## 3. Database Initialization
Run these commands from the `backend` directory to install packages, apply migrations, and optionally seed the database:
```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
```

---

## 4. Running the Application

You will need to open **two terminal windows**:

### Terminal 1: Backend Server
```bash
cd backend
npm run dev
```
*The backend API and Socket.io server will start running at **`http://localhost:5000`**.*

### Terminal 2: Frontend App
```bash
cd frontend
pnpm install # or npm install
pnpm run dev # or npm run dev
```
*The web interface will start running at **`http://localhost:3000`**.*

---

## 5. Typical Test Flow
1. Open **`http://localhost:3000`** in your browser.
2. Register a new user account.
3. On the dashboard, click **Create Meeting** to generate a meeting room.
4. Grant the browser microphone and camera access.
5. Copy the room ID and open it in a separate private/incognito window to test real-time WebRTC streams, chat messages, and subgroups.
6. Open the **Transcript** tab and click **Start** to use the **Sarvam STT** live voice transcription pipeline.
