import { boolean, index, integer, jsonb, numeric, pgEnum, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

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

// Exercise Management Enums
export const exerciseTypeEnum = pgEnum('exercise_type', ['strength', 'cardio', 'flexibility', 'balance', 'sports']);
export const difficultyLevelEnum = pgEnum('difficulty_level', ['beginner', 'intermediate', 'advanced']);
export const trainingStatusEnum = pgEnum('training_status', ['scheduled', 'completed', 'skipped', 'in_progress']);

// Behavioral Event Enums
export const entityTypeEnum = pgEnum('entity_type', ['health_record', 'training_session', 'exercise_log', 'health_goal', 'ui_interaction']);

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

// Exercise Management Tables
export const muscleGroupSchema = pgTable('muscle_group', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).unique().notNull(),
  bodyPart: varchar('body_part', { length: 50 }).notNull(),
  description: varchar('description', { length: 200 }),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const exerciseSchema = pgTable('exercise', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  exerciseType: exerciseTypeEnum('exercise_type').notNull(),
  primaryMuscleGroupId: integer('primary_muscle_group_id').references(() => muscleGroupSchema.id).notNull(),
  secondaryMuscleGroupIds: varchar('secondary_muscle_group_ids', { length: 100 }), // JSON array of IDs
  instructions: varchar('instructions', { length: 1000 }),
  difficulty: difficultyLevelEnum('difficulty').default('beginner').notNull(),
  equipmentNeeded: varchar('equipment_needed', { length: 200 }),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  exerciseTypeIdx: index('exercise_type_idx').on(table.exerciseType),
  primaryMuscleIdx: index('exercise_primary_muscle_idx').on(table.primaryMuscleGroupId),
}));

export const trainingPlanSchema = pgTable('training_plan', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  difficulty: difficultyLevelEnum('difficulty').default('beginner').notNull(),
  durationWeeks: integer('duration_weeks').notNull(),
  sessionsPerWeek: integer('sessions_per_week').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  startDate: timestamp('start_date', { mode: 'date' }),
  endDate: timestamp('end_date', { mode: 'date' }),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userActiveIdx: index('training_plan_user_active_idx').on(table.userId, table.isActive),
}));

export const trainingSessionSchema = pgTable('training_session', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  trainingPlanId: integer('training_plan_id').references(() => trainingPlanSchema.id),
  name: varchar('name', { length: 100 }).notNull(),
  scheduledDate: timestamp('scheduled_date', { mode: 'date' }).notNull(),
  actualDate: timestamp('actual_date', { mode: 'date' }),
  status: trainingStatusEnum('status').default('scheduled').notNull(),
  durationMinutes: integer('duration_minutes'),
  notes: varchar('notes', { length: 1000 }),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userDateIdx: index('training_session_user_date_idx').on(table.userId, table.scheduledDate),
  planDateIdx: index('training_session_plan_date_idx').on(table.trainingPlanId, table.scheduledDate),
}));

export const workoutExerciseSchema = pgTable('workout_exercise', {
  id: serial('id').primaryKey(),
  trainingSessionId: integer('training_session_id').references(() => trainingSessionSchema.id).notNull(),
  exerciseId: integer('exercise_id').references(() => exerciseSchema.id).notNull(),
  order: integer('order').notNull(),
  sets: integer('sets').notNull(),
  targetReps: integer('target_reps'),
  targetWeight: numeric('target_weight', { precision: 10, scale: 2 }),
  targetDuration: integer('target_duration'), // in seconds
  restSeconds: integer('rest_seconds'),
  notes: varchar('notes', { length: 500 }),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  sessionOrderIdx: index('workout_exercise_session_order_idx').on(table.trainingSessionId, table.order),
}));

export const exerciseLogSchema = pgTable('exercise_log', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  trainingSessionId: integer('training_session_id').references(() => trainingSessionSchema.id),
  exerciseId: integer('exercise_id').references(() => exerciseSchema.id).notNull(),
  setNumber: integer('set_number').notNull(),
  reps: integer('reps'),
  weight: numeric('weight', { precision: 10, scale: 2 }),
  duration: integer('duration'), // in seconds
  distance: numeric('distance', { precision: 10, scale: 2 }), // for cardio exercises
  restDuration: integer('rest_duration'), // in seconds
  rpe: integer('rpe'), // Rate of Perceived Exertion (1-10)
  notes: varchar('notes', { length: 500 }),
  loggedAt: timestamp('logged_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userLoggedIdx: index('exercise_log_user_logged_idx').on(table.userId, table.loggedAt),
  sessionExerciseIdx: index('exercise_log_session_exercise_idx').on(table.trainingSessionId, table.exerciseId),
}));

// Behavioral Event Tables
export const behavioralEventSchema = pgTable('behavioral_event', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  eventName: varchar('event_name', { length: 100 }).notNull(),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityId: integer('entity_id'),
  context: jsonb('context'),
  sessionId: varchar('session_id', { length: 255 }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userCreatedAtIdx: index('behavioral_event_user_created_at_idx').on(table.userId, table.createdAt),
  userEventNameIdx: index('behavioral_event_user_event_name_idx').on(table.userId, table.eventName),
  eventNameCreatedAtIdx: index('behavioral_event_event_name_created_at_idx').on(table.eventName, table.createdAt),
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
