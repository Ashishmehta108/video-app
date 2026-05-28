import { Router } from 'express';
import { nanoid } from 'nanoid';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { meetings, participants, meetSettings, messages, subgroups, subgroupMembers, transcripts, users } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.post('/create', async (req, res) => {
  try {
    const { title } = req.body;
    const roomId = nanoid(10);

    const [host] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!host) {
      return res.status(401).json({ error: 'Authenticated user no longer exists' });
    }

    const [meeting] = await db
      .insert(meetings)
      .values({
        roomId,
        title: title || 'Untitled Meeting',
        hostId: req.user.id,
        status: 'active',
      })
      .returning();

    await db.insert(participants).values({
      meetingId: meeting.id,
      userId: req.user.id,
    });

    await db.insert(meetSettings).values({
      meetingId: meeting.id,
      userId: req.user.id,
    });

    res.status(201).json({ meeting });
  } catch (err) {
    console.error('Create meeting error:', err);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

router.get('/:roomId', async (req, res) => {
  try {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.roomId, req.params.roomId));

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (meeting.status === 'ended') {
      return res.status(410).json({ error: 'Meeting has ended' });
    }

    res.json({ meeting });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:roomId', async (req, res) => {
  try {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.roomId, req.params.roomId));

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (meeting.hostId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this meeting' });
    }

    await db.transaction(async (tx) => {
      const subgroupRows = await tx.select().from(subgroups).where(eq(subgroups.meetingId, meeting.id));
      const subgroupIds = subgroupRows.map((row) => row.id);

      if (subgroupIds.length > 0) {
        await tx.delete(subgroupMembers).where(inArray(subgroupMembers.subgroupId, subgroupIds));
      }

      await tx.delete(transcripts).where(eq(transcripts.meetingId, meeting.id));
      await tx.delete(messages).where(eq(messages.meetingId, meeting.id));
      await tx.delete(meetSettings).where(eq(meetSettings.meetingId, meeting.id));
      await tx.delete(participants).where(eq(participants.meetingId, meeting.id));
      await tx.delete(subgroups).where(eq(subgroups.meetingId, meeting.id));
      await tx.delete(meetings).where(eq(meetings.id, meeting.id));
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete meeting error:', err);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

router.post('/:roomId/join', async (req, res) => {
  try {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.roomId, req.params.roomId));

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (meeting.status === 'ended') {
      return res.status(410).json({ error: 'Meeting has ended' });
    }

    const existing = await db
      .select()
      .from(participants)
      .where(
        and(
          eq(participants.meetingId, meeting.id),
          eq(participants.userId, req.user.id)
        )
      );

    if (existing.length === 0) {
      await db.insert(participants).values({
        meetingId: meeting.id,
        userId: req.user.id,
      });
    }

    res.json({ meeting });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join meeting' });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await db
      .select()
      .from(meetings)
      .where(eq(meetings.hostId, req.user.id))
      .orderBy(desc(meetings.createdAt));

    res.json({ meetings: list });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:roomId/settings', async (req, res) => {
  try {
    const { backgroundBlur, noiseCancel, recording } = req.body;
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.roomId, req.params.roomId));

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const [settings] = await db
      .update(meetSettings)
      .set({
        backgroundBlur: backgroundBlur ?? undefined,
        noiseCancel: noiseCancel ?? undefined,
        recording: recording ?? undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(meetSettings.meetingId, meeting.id),
          eq(meetSettings.userId, req.user.id)
        )
      )
      .returning();

    if (!settings) {
      const [created] = await db
        .insert(meetSettings)
        .values({
          meetingId: meeting.id,
          userId: req.user.id,
          backgroundBlur: backgroundBlur ?? false,
          noiseCancel: noiseCancel ?? false,
          recording: recording ?? false,
        })
        .returning();
      return res.json({ settings: created });
    }

    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.get('/:roomId/settings', async (req, res) => {
  try {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(eq(meetings.roomId, req.params.roomId));

    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const [settings] = await db
      .select()
      .from(meetSettings)
      .where(
        and(
          eq(meetSettings.meetingId, meeting.id),
          eq(meetSettings.userId, req.user.id)
        )
      );

    res.json({
      settings: settings || {
        backgroundBlur: false,
        noiseCancel: false,
        recording: false,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
