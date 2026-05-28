import { Router } from 'express';
import { eq, sql, desc, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users,
  meetings,
  messages,
  transcripts,
  participants,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { isAdmin } from '../middleware/isAdmin.js';

const router = Router();

router.use(authMiddleware, isAdmin);

router.get('/users', async (req, res) => {
  try {
    const list = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        banned: users.banned,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    res.json({ users: list });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/users/:id/ban', async (req, res) => {
  try {
    const { banned } = req.body;
    const [user] = await db
      .update(users)
      .set({ banned: banned !== false })
      .where(eq(users.id, parseInt(req.params.id, 10)))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        banned: users.banned,
      });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/meetings', async (req, res) => {
  try {
    const list = await db
      .select()
      .from(meetings)
      .orderBy(desc(meetings.createdAt));

    res.json({ meetings: list });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/meetings/:id/end', async (req, res) => {
  try {
    const [meeting] = await db
      .update(meetings)
      .set({ status: 'ended', endedAt: new Date() })
      .where(eq(meetings.id, parseInt(req.params.id, 10)))
      .returning();

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    res.json({ meeting });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [meetingCount] = await db.select({ count: count() }).from(meetings);
    const [messageCount] = await db.select({ count: count() }).from(messages);
    const [transcriptCount] = await db.select({ count: count() }).from(transcripts);
    const [activeMeetings] = await db
      .select({ count: count() })
      .from(meetings)
      .where(eq(meetings.status, 'active'));

    res.json({
      analytics: {
        totalUsers: userCount.count,
        totalMeetings: meetingCount.count,
        activeMeetings: activeMeetings.count,
        totalMessages: messageCount.count,
        totalTranscripts: transcriptCount.count,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/transcripts', async (req, res) => {
  try {
    const list = await db
      .select({
        id: transcripts.id,
        text: transcripts.text,
        isFinal: transcripts.isFinal,
        createdAt: transcripts.createdAt,
        meetingId: transcripts.meetingId,
        userId: transcripts.userId,
        userName: users.name,
      })
      .from(transcripts)
      .leftJoin(users, eq(transcripts.userId, users.id))
      .orderBy(desc(transcripts.createdAt))
      .limit(200);

    res.json({ transcripts: list });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
