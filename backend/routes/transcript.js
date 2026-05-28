import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { transcripts, meetings, users } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/:roomId', async (req, res) => {
  try {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.roomId, req.params.roomId));

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const list = await db
      .select({
        id: transcripts.id,
        text: transcripts.text,
        isFinal: transcripts.isFinal,
        createdAt: transcripts.createdAt,
        userId: transcripts.userId,
        userName: users.name,
      })
      .from(transcripts)
      .leftJoin(users, eq(transcripts.userId, users.id))
      .where(eq(transcripts.meetingId, meeting.id))
      .orderBy(transcripts.createdAt);

    res.json({ transcripts: list });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:roomId', async (req, res) => {
  try {
    const { text, isFinal } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ error: 'Text required' });
    }

    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.roomId, req.params.roomId));

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const [entry] = await db
      .insert(transcripts)
      .values({
        meetingId: meeting.id,
        userId: req.user.id,
        text: text.trim(),
        isFinal: isFinal ?? false,
      })
      .returning();

    res.status(201).json({ transcript: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

export default router;
