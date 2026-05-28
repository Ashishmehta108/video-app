import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import meetRoutes from './routes/meet.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';
import transcriptRoutes from './routes/transcript.js';
import sarvamRoutes from './routes/sarvam.js';
import { setupSocketHandlers } from './socket/handlers.js';


const app = express();
const httpServer = createServer(app);

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const io = new Server(httpServer, {
  cors: {
    origin:"https://video-app-rosy-five.vercel.app",
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(
 cors({
    origin:"https://video-app-rosy-five.vercel.app",
    methods: ['GET', 'POST'],
    credentials: true,
  }),
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/meet', meetRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transcript', transcriptRoutes);
app.use('/api/sarvam', sarvamRoutes);

setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
