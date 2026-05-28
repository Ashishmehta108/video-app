import { Router } from 'express';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { messages, meetings, subgroups, users } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/:roomId', async (req, res) => {
  try {
    const { subgroupId } = req.query;
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.roomId, req.params.roomId));

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    let query = db
      .select({
        id: messages.id,
        content: messages.content,
        createdAt: messages.createdAt,
        subgroupId: messages.subgroupId,
        userId: messages.userId,
        userName: users.name,
      })
      .from(messages)
      .leftJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.meetingId, meeting.id))
      .orderBy(desc(messages.createdAt))
      .limit(100);

    const allMessages = await query;

    const filtered = subgroupId
      ? allMessages.filter((m) => m.subgroupId === parseInt(subgroupId, 10))
      : allMessages.filter((m) => !m.subgroupId);

    res.json({ messages: filtered.reverse() });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:roomId', async (req, res) => {
  try {
    const { content, subgroupId } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content required' });
    }

    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.roomId, req.params.roomId));

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const [msg] = await db
      .insert(messages)
      .values({
        meetingId: meeting.id,
        userId: req.user.id,
        content: content.trim(),
        subgroupId: subgroupId || null,
      })
      .returning();

    const [user] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, req.user.id));

    res.status(201).json({
      message: { ...msg, userName: user?.name || 'Unknown' },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.get('/:roomId/subgroups', async (req, res) => {
  try {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.roomId, req.params.roomId));

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const list = await db
      .select()
      .from(subgroups)
      .where(eq(subgroups.meetingId, meeting.id));

    res.json({ subgroups: list });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:roomId/subgroups', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Subgroup name required' });
    }

    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.roomId, req.params.roomId));

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const [subgroup] = await db
      .insert(subgroups)
      .values({
        meetingId: meeting.id,
        name: name.trim(),
        createdBy: req.user.id,
      })
      .returning();

    res.status(201).json({ subgroup });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subgroup' });
  }
});

export default router;
