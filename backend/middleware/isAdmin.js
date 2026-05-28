import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';

export async function isAdmin(req, res, next) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (user.banned) {
      return res.status(403).json({ error: 'Account banned' });
    }
    req.dbUser = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
