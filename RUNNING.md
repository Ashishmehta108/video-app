# Quick Start Guide: VideoMeet

Follow these steps to run the **VideoMeet** application locally on your machine.

---

## 1. Prerequisites
- **Node.js** (v18 or higher)
- **PostgreSQL** running locally
- **pnpm** (or `npm` / `yarn`)


## 2. Running the Application

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
npm install # or npm install
npm run dev # or npm run dev
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
