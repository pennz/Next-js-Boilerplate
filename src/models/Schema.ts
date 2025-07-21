import { boolean, index, integer, numeric, pgEnum, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

// This file defines the structure of your database tables using the Drizzle ORM.

// To modify the database schema:
// 1. Update this file with your desired changes.
// 2. Generate a new migration by running: `npm run db:generate`

// The generated migration file will reflect your schema changes.
// The migration is automatically applied during the next database interaction,
// so there's no need to run it manually or restart the Next.js server.

// Need a database for production? Check out https://www.prisma.io/?via=nextjsboilerplate
// Tested and compatible with Next.js Boilerplate

// Health Management Enums
export const goalStatusEnum = pgEnum('goal_status', ['active', 'completed', 'paused']);

// Health Management Tables
export const healthTypeSchema = pgTable('health_type', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 50 }).unique().notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  typicalRangeLow: numeric('typical_range_low', { precision: 10, scale: 2 }),
  typicalRangeHigh: numeric('typical_range_high', { precision: 10, scale: 2 }),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const healthRecordSchema = pgTable('health_record', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  typeId: integer('type_id').references(() => healthTypeSchema.id).notNull(),
  value: numeric('value', { precision: 10, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  recordedAt: timestamp('recorded_at', { mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userRecordedAtIdx: index('health_record_user_recorded_at_idx').on(table.userId, table.recordedAt),
  userTypeIdx: index('health_record_user_type_idx').on(table.userId, table.typeId),
}));

export const healthGoalSchema = pgTable('health_goal', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  typeId: integer('type_id').references(() => healthTypeSchema.id).notNull(),
  targetValue: numeric('target_value', { precision: 10, scale: 2 }).notNull(),
  targetDate: timestamp('target_date', { mode: 'date' }).notNull(),
  status: goalStatusEnum('status').default('active').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userTypeIdx: index('health_goal_user_type_idx').on(table.userId, table.typeId),
}));

export const healthReminderSchema = pgTable('health_reminder', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  typeId: integer('type_id').references(() => healthTypeSchema.id).notNull(),
  cronExpr: varchar('cron_expr', { length: 100 }).notNull(),
  message: varchar('message', { length: 500 }).notNull(),
  active: boolean('active').default(true).notNull(),
  nextRunAt: timestamp('next_run_at', { mode: 'date' }),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userTypeIdx: index('health_reminder_user_type_idx').on(table.userId, table.typeId),
}));

export const counterSchema = pgTable('counter', {
  id: serial('id').primaryKey(),
  count: integer('count').default(0),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
