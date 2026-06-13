import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
  isFavorite: boolean('is_favorite').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  order: integer('order').notNull().default(0),
  isFavorite: boolean('is_favorite').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const notes = pgTable('notes', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  chapterId: integer('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  subjects: many(subjects),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  user: one(users, {
    fields: [subjects.userId],
    references: [users.uid],
  }),
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [chapters.subjectId],
    references: [subjects.id],
  }),
  user: one(users, {
    fields: [chapters.userId],
    references: [users.uid],
  }),
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  chapter: one(chapters, {
    fields: [notes.chapterId],
    references: [chapters.id],
  }),
  user: one(users, {
    fields: [notes.userId],
    references: [users.uid],
  }),
}));

export const studySessions = pgTable('study_sessions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  durationMinutes: integer('duration_minutes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const revisions = pgTable('revisions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  chapterId: integer('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }).notNull(),
  dueDate: timestamp('due_date').notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'done'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const studySessionsRelations = relations(studySessions, ({ one }) => ({
  user: one(users, {
    fields: [studySessions.userId],
    references: [users.uid],
  }),
  subject: one(subjects, {
    fields: [studySessions.subjectId],
    references: [subjects.id],
  }),
}));

export const revisionsRelations = relations(revisions, ({ one }) => ({
  user: one(users, {
    fields: [revisions.userId],
    references: [users.uid],
  }),
  chapter: one(chapters, {
    fields: [revisions.chapterId],
    references: [chapters.id],
  }),
}));

