import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('user').notNull(),
  banned: boolean('banned').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const meetings = pgTable('meetings', {
  id: serial('id').primaryKey(),
  roomId: varchar('room_id', { length: 50 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  hostId: integer('host_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
});

export const participants = pgTable('participants', {
  id: serial('id').primaryKey(),
  meetingId: integer('meeting_id').references(() => meetings.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  meetingId: integer('meeting_id').references(() => meetings.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  subgroupId: integer('subgroup_id'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subgroups = pgTable('subgroups', {
  id: serial('id').primaryKey(),
  meetingId: integer('meeting_id').references(() => meetings.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subgroupMembers = pgTable('subgroup_members', {
  id: serial('id').primaryKey(),
  subgroupId: integer('subgroup_id').references(() => subgroups.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const transcripts = pgTable('transcripts', {
  id: serial('id').primaryKey(),
  meetingId: integer('meeting_id').references(() => meetings.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  text: text('text').notNull(),
  isFinal: boolean('is_final').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const meetSettings = pgTable('meet_settings', {
  id: serial('id').primaryKey(),
  meetingId: integer('meeting_id').references(() => meetings.id).notNull().unique(),
  userId: integer('user_id').references(() => users.id).notNull(),
  backgroundBlur: boolean('background_blur').default(false).notNull(),
  noiseCancel: boolean('noise_cancel').default(false).notNull(),
  recording: boolean('recording').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
