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

// User Profile Enums
export const fitnessGoalTypeEnum = pgEnum('fitness_goal_type', ['weight_loss', 'muscle_gain', 'endurance', 'strength', 'flexibility', 'general_fitness']);
export const workoutTypeEnum = pgEnum('workout_type', ['strength', 'cardio', 'yoga', 'pilates', 'crossfit', 'running', 'cycling', 'swimming']);
export const equipmentEnum = pgEnum('equipment', ['none', 'dumbbells', 'barbell', 'resistance_bands', 'kettlebell', 'treadmill', 'bike']);
export const constraintTypeEnum = pgEnum('constraint_type', ['injury', 'schedule', 'equipment', 'location', 'medical']);
export const severityEnum = pgEnum('severity', ['low', 'medium', 'high']);
export const timeOfDayEnum = pgEnum('time_of_day', ['morning', 'afternoon', 'evening', 'night']);
export const dayOfWeekEnum = pgEnum('day_of_week', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

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

// User Profile Tables
export const userProfileSchema = pgTable('user_profile', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).unique().notNull(),
  fitnessLevel: difficultyLevelEnum('fitness_level').default('beginner').notNull(),
  experienceYears: integer('experience_years').default(0).notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  dateOfBirth: timestamp('date_of_birth', { mode: 'date' }),
  height: numeric('height', { precision: 5, scale: 2 }), // in cm
  weight: numeric('weight', { precision: 5, scale: 2 }), // in kg
  activityLevel: varchar('activity_level', { length: 20 }).default('moderate').notNull(), // sedentary, light, moderate, active, very_active
  profileCompleteness: integer('profile_completeness').default(0).notNull(), // percentage 0-100
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userIdIdx: index('user_profile_user_id_idx').on(table.userId),
  fitnessLevelIdx: index('user_profile_fitness_level_idx').on(table.fitnessLevel),
}));

export const userFitnessGoalSchema = pgTable('user_fitness_goal', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  goalType: fitnessGoalTypeEnum('goal_type').notNull(),
  targetValue: numeric('target_value', { precision: 10, scale: 2 }),
  currentValue: numeric('current_value', { precision: 10, scale: 2 }),
  unit: varchar('unit', { length: 20 }),
  targetDate: timestamp('target_date', { mode: 'date' }),
  priority: integer('priority').default(1).notNull(), // 1-5 scale
  status: goalStatusEnum('status').default('active').notNull(),
  description: varchar('description', { length: 500 }),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userGoalTypeIdx: index('user_fitness_goal_user_goal_type_idx').on(table.userId, table.goalType),
  userStatusIdx: index('user_fitness_goal_user_status_idx').on(table.userId, table.status),
}));

export const userPreferenceSchema = pgTable('user_preference', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).unique().notNull(),
  preferredWorkoutTypes: varchar('preferred_workout_types', { length: 200 }), // JSON array of workout types
  preferredEquipment: varchar('preferred_equipment', { length: 200 }), // JSON array of equipment
  preferredTimeOfDay: timeOfDayEnum('preferred_time_of_day'),
  preferredDaysOfWeek: varchar('preferred_days_of_week', { length: 100 }), // JSON array of days
  sessionDurationMin: integer('session_duration_min').default(30).notNull(),
  sessionDurationMax: integer('session_duration_max').default(60).notNull(),
  workoutFrequencyPerWeek: integer('workout_frequency_per_week').default(3).notNull(),
  restDayPreference: varchar('rest_day_preference', { length: 100 }), // JSON array of preferred rest days
  intensityPreference: difficultyLevelEnum('intensity_preference').default('intermediate').notNull(),
  musicPreference: boolean('music_preference').default(true).notNull(),
  reminderEnabled: boolean('reminder_enabled').default(true).notNull(),
  autoProgressionEnabled: boolean('auto_progression_enabled').default(true).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userIdIdx: index('user_preference_user_id_idx').on(table.userId),
  timeOfDayIdx: index('user_preference_time_of_day_idx').on(table.preferredTimeOfDay),
}));

export const userConstraintSchema = pgTable('user_constraint', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  constraintType: constraintTypeEnum('constraint_type').notNull(),
  severity: severityEnum('severity').default('medium').notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  affectedBodyParts: varchar('affected_body_parts', { length: 200 }), // JSON array for injuries
  restrictedExercises: varchar('restricted_exercises', { length: 500 }), // JSON array of exercise IDs
  restrictedEquipment: varchar('restricted_equipment', { length: 200 }), // JSON array of equipment
  timeRestrictions: jsonb('time_restrictions'), // Schedule constraints
  startDate: timestamp('start_date', { mode: 'date' }).defaultNow().notNull(),
  endDate: timestamp('end_date', { mode: 'date' }),
  isActive: boolean('is_active').default(true).notNull(),
  notes: varchar('notes', { length: 1000 }),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userConstraintTypeIdx: index('user_constraint_user_constraint_type_idx').on(table.userId, table.constraintType),
  userActiveIdx: index('user_constraint_user_active_idx').on(table.userId, table.isActive),
  severityIdx: index('user_constraint_severity_idx').on(table.severity),
}));

// Micro-Behavior Tables
export const microBehaviorPatternSchema = pgTable('micro_behavior_pattern', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  patternName: varchar('pattern_name', { length: 100 }).notNull(),
  behaviorType: varchar('behavior_type', { length: 50 }).notNull(), // habit, trigger, outcome, etc.
  frequency: integer('frequency').notNull(), // occurrences per time period
  frequencyPeriod: varchar('frequency_period', { length: 20 }).default('week').notNull(), // day, week, month
  consistency: numeric('consistency', { precision: 5, scale: 2 }), // percentage 0-100
  strength: numeric('strength', { precision: 5, scale: 2 }), // pattern strength 0-100
  triggers: jsonb('triggers'), // environmental, emotional, temporal triggers
  outcomes: jsonb('outcomes'), // positive/negative outcomes
  context: jsonb('context'), // situational context data
  correlations: jsonb('correlations'), // correlations with other patterns
  confidence: numeric('confidence', { precision: 5, 2 }), // statistical confidence 0-100
  sampleSize: integer('sample_size').default(0).notNull(),
  firstObserved: timestamp('first_observed', { mode: 'date' }).defaultNow().notNull(),
  lastObserved: timestamp('last_observed', { mode: 'date' }).defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userBehaviorTypeIdx: index('micro_behavior_pattern_user_behavior_type_idx').on(table.userId, table.behaviorType),
  userActiveIdx: index('micro_behavior_pattern_user_active_idx').on(table.userId, table.isActive),
  strengthIdx: index('micro_behavior_pattern_strength_idx').on(table.strength),
  lastObservedIdx: index('micro_behavior_pattern_last_observed_idx').on(table.lastObserved),
}));

export const contextPatternSchema = pgTable('context_pattern', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  contextType: varchar('context_type', { length: 50 }).notNull(), // environmental, temporal, social, emotional
  contextName: varchar('context_name', { length: 100 }).notNull(),
  contextData: jsonb('context_data').notNull(), // structured context information
  frequency: integer('frequency').notNull(),
  timeOfDay: timeOfDayEnum('time_of_day'),
  dayOfWeek: dayOfWeekEnum('day_of_week'),
  location: varchar('location', { length: 100 }),
  weather: varchar('weather', { length: 50 }),
  mood: varchar('mood', { length: 50 }),
  energyLevel: integer('energy_level'), // 1-10 scale
  stressLevel: integer('stress_level'), // 1-10 scale
  socialContext: varchar('social_context', { length: 100 }), // alone, with_friends, family, etc.
  behaviorCorrelations: jsonb('behavior_correlations'), // correlated behaviors
  outcomeImpact: jsonb('outcome_impact'), // impact on behavior outcomes
  predictivePower: numeric('predictive_power', { precision: 5, scale: 2 }), // 0-100
  firstObserved: timestamp('first_observed', { mode: 'date' }).defaultNow().notNull(),
  lastObserved: timestamp('last_observed', { mode: 'date' }).defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, table => ({
  userContextTypeIdx: index('context_pattern_user_context_type_idx').on(table.userId, table.contextType),
  userActiveIdx: index('context_pattern_user_active_idx').on(table.userId, table.isActive),
  timeOfDayIdx: index('context_pattern_time_of_day_idx').on(table.timeOfDay),
  dayOfWeekIdx: index('context_pattern_day_of_week_idx').on(table.dayOfWeek),
  predictivePowerIdx: index('context_pattern_predictive_power_idx').on(table.predictivePower),
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
