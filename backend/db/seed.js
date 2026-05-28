import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
import { db } from './index.js';
import { users } from './schema.js';

dotenv.config();

async function seed() {
  const adminEmail = 'admin@videocall.app';
  const existing = await db.select().from(users).where(eq(users.email, adminEmail));

  if (existing.length > 0) {
    console.log('Admin user already exists:', adminEmail);
    process.exit(0);
  }

  const hashed = await bcrypt.hash('admin123', 10);
  await db.insert(users).values({
    email: adminEmail,
    password: hashed,
    name: 'Admin',
    role: 'admin',
  });

  console.log('Admin user created:');
  console.log('  Email: admin@videocall.app');
  console.log('  Password: admin123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
