# Database Schema Analysis

This document provides a comprehensive analysis of the database schema defined in `src/models/Schema.ts`, including all entities, relationships, constraints, and business rules that form the foundation of this health and exercise management platform.

## Executive Summary

The system implements a comprehensive health and exercise management platform using PostgreSQL with Drizzle ORM. The schema supports two primary domains:
- **Health Management**: Tracking health metrics, goals, and reminders
- **Exercise Management**: Managing exercises, training plans, sessions, and workout logs

## Database Entities Overview

### Health Management Domain

#### health_type
- **Purpose**: Defines types of health metrics that can be tracked
- **Key Fields**: 
  - `slug` (unique identifier, max 50 chars)
  - `display_name` (human-readable name, max 100 chars)
  - `unit` (measurement unit, max 20 chars)
  - `typical_range_low`/`typical_range_high` (reference ranges, precision 10,2)
- **Business Role**: Master data table defining what health metrics are trackable
- **Constraints**: Unique slug, all core fields required except typical ranges

#### health_record
- **Purpose**: Stores individual health metric measurements
- **Key Fields**:
  - `user_id` (user identifier, max 255 chars)
  - `type_id` (foreign key to health_type)
  - `value` (measured value, precision 10,2)
  - `unit` (measurement unit, max 20 chars)
  - `recorded_at` (timestamp of measurement)
- **Business Role**: Core transactional data for health tracking
- **Indexes**: Composite indexes on (user_id, recorded_at) and (user_id, type_id)

#### health_goal
- **Purpose**: Defines user health targets and tracks progress
- **Key Fields**:
  - `user_id` (user identifier)
  - `type_id` (foreign key to health_type)
  - `target_value` (goal target, precision 10,2)
  - `target_date` (goal deadline)
  - `status` (enum: active, completed, paused)
- **Business Role**: Goal-setting and progress tracking functionality
- **Constraints**: Default status 'active', composite index on (user_id, type_id)

#### health_reminder
- **Purpose**: Automated reminders for health metric tracking
- **Key Fields**:
  - `user_id` (user identifier)
  - `type_id` (foreign key to health_type)
  - `cron_expr` (scheduling expression, max 100 chars)
  - `message` (reminder text, max 500 chars)
  - `active` (boolean, default true)
  - `next_run_at` (next scheduled execution)
- **Business Role**: Automated notification and engagement system
- **Constraints**: Active defaults to true, composite index on (user_id, type_id)

### Exercise Management Domain

#### muscle_group
- **Purpose**: Defines muscle groups for exercise categorization
- **Key Fields**:
  - `name` (unique muscle group name, max 50 chars)
  - `body_part` (anatomical region, max 50 chars)
  - `description` (optional description, max 200 chars)
- **Business Role**: Master data for exercise classification
- **Constraints**: Unique name constraint

#### exercise
- **Purpose**: Exercise library with detailed exercise information
- **Key Fields**:
  - `name` (exercise name, max 100 chars)
  - `description` (optional, max 500 chars)
  - `exercise_type` (enum: strength, cardio, flexibility, balance, sports)
  - `primary_muscle_group_id` (foreign key to muscle_group)
  - `secondary_muscle_group_ids` (JSON array of IDs, max 100 chars)
  - `instructions` (exercise instructions, max 1000 chars)
  - `difficulty` (enum: beginner, intermediate, advanced, default beginner)
  - `equipment_needed` (equipment description, max 200 chars)
- **Business Role**: Comprehensive exercise database
- **Indexes**: exercise_type and primary_muscle_group_id for filtering

#### training_plan
- **Purpose**: User training programs with scheduling
- **Key Fields**:
  - `user_id` (user identifier)
  - `name` (plan name, max 100 chars)
  - `description` (optional, max 500 chars)
  - `difficulty` (enum, default beginner)
  - `duration_weeks` (plan duration)
  - `sessions_per_week` (frequency)
  - `is_active` (boolean, default false)
  - `start_date`/`end_date` (plan timeline, optional)
- **Business Role**: Structured training program management
- **Constraints**: Composite index on (user_id, is_active)

#### training_session
- **Purpose**: Individual workout sessions within training plans
- **Key Fields**:
  - `user_id` (user identifier)
  - `training_plan_id` (optional foreign key to training_plan)
  - `name` (session name, max 100 chars)
  - `scheduled_date` (planned date)
  - `actual_date` (actual completion date, optional)
  - `status` (enum: scheduled, completed, skipped, in_progress, default scheduled)
  - `duration_minutes` (session length, optional)
  - `notes` (session notes, max 1000 chars)
- **Business Role**: Workout session scheduling and tracking
- **Indexes**: (user_id, scheduled_date) and (training_plan_id, scheduled_date)

#### workout_exercise
- **Purpose**: Exercise prescriptions within training sessions
- **Key Fields**:
  - `training_session_id` (foreign key to training_session)
  - `exercise_id` (foreign key to exercise)
  - `order` (exercise sequence)
  - `sets` (number of sets)
  - `target_reps` (target repetitions, optional)
  - `target_weight` (target weight, precision 10,2, optional)
  - `target_duration` (target duration in seconds, optional)
  - `rest_seconds` (rest period, optional)
  - `notes` (exercise notes, max 500 chars)
- **Business Role**: Detailed exercise prescriptions for workouts
- **Constraints**: Composite index on (training_session_id, order)

#### exercise_log
- **Purpose**: Actual performance logging for exercises
- **Key Fields**:
  - `user_id` (user identifier)
  - `training_session_id` (optional foreign key to training_session)
  - `exercise_id` (foreign key to exercise)
  - `set_number` (set identifier)
  - `reps` (actual repetitions, optional)
  - `weight` (actual weight, precision 10,2, optional)
  - `duration` (actual duration in seconds, optional)
  - `distance` (for cardio, precision 10,2, optional)
  - `rest_duration` (actual rest in seconds, optional)
  - `rpe` (Rate of Perceived Exertion 1-10, optional)
  - `notes` (performance notes, max 500 chars)
  - `logged_at` (logging timestamp, default now)
- **Business Role**: Actual workout performance tracking
- **Indexes**: (user_id, logged_at) and (training_session_id, exercise_id)

### Utility Tables

#### counter
- **Purpose**: General-purpose counter for application metrics
- **Key Fields**: `count` (integer, default 0)
- **Business Role**: Application-level counters and statistics

## Enum Definitions and Business Rules

### Goal Status Enum (`goalStatusEnum`)
- `active`: Goal is currently being pursued
- `completed`: Goal has been achieved
- `paused`: Goal is temporarily suspended

### Exercise Type Enum (`exerciseTypeEnum`)
- `strength`: Resistance/weight training exercises
- `cardio`: Cardiovascular endurance exercises
- `flexibility`: Stretching and mobility exercises
- `balance`: Balance and stability exercises
- `sports`: Sport-specific activities

### Difficulty Level Enum (`difficultyLevelEnum`)
- `beginner`: Entry-level exercises/plans
- `intermediate`: Moderate difficulty level
- `advanced`: High difficulty, experienced users

### Training Status Enum (`trainingStatusEnum`)
- `scheduled`: Session is planned but not started
- `completed`: Session has been finished
- `skipped`: Session was intentionally missed
- `in_progress`: Session is currently active

## Entity Relationships Mapping

### Primary Relationships

1. **health_type → health_record** (1:many)
   - Each health type can have multiple records
   - health_record.type_id references health_type.id

2. **health_type → health_goal** (1:many)
   - Each health type can have multiple goals
   - health_goal.type_id references health_type.id

3. **health_type → health_reminder** (1:many)
   - Each health type can have multiple reminders
   - health_reminder.type_id references health_type.id

4. **muscle_group → exercise** (1:many)
   - Each muscle group can be primary for multiple exercises
   - exercise.primary_muscle_group_id references muscle_group.id

5. **training_plan → training_session** (1:many)
   - Each training plan can have multiple sessions
   - training_session.training_plan_id references training_plan.id (optional)

6. **training_session → workout_exercise** (1:many)
   - Each session can have multiple exercises
   - workout_exercise.training_session_id references training_session.id

7. **exercise → workout_exercise** (1:many)
   - Each exercise can be used in multiple workouts
   - workout_exercise.exercise_id references exercise.id

8. **training_session → exercise_log** (1:many)
   - Each session can have multiple logged exercises
   - exercise_log.training_session_id references training_session.id (optional)

9. **exercise → exercise_log** (1:many)
   - Each exercise can have multiple log entries
   - exercise_log.exercise_id references exercise.id

### User Data Partitioning
All user-specific tables include `user_id` for data isolation:
- health_record.user_id
- health_goal.user_id
- health_reminder.user_id
- training_plan.user_id
- training_session.user_id
- exercise_log.user_id

## Data Validation Rules

### Schema-Level Constraints
- **NOT NULL constraints**: All primary keys, foreign keys, and essential business fields
- **UNIQUE constraints**: health_type.slug, muscle_group.name
- **DEFAULT values**: 
  - Timestamps: created_at, updated_at (auto-managed)
  - Enums: goal status (active), difficulty (beginner), training status (scheduled)
  - Booleans: health_reminder.active (true), training_plan.is_active (false)

### Field-Level Validation
- **String lengths**: Enforced at schema level with varchar constraints
- **Numeric precision**: Health values and weights use precision(10,2)
- **Auto-update timestamps**: updated_at automatically refreshes on record changes

### Application-Level Validation

#### Health Records (`HealthRecordValidation`)
- **Value ranges**: 0-10,000 with unit-specific constraints
- **Unit validation**: Restricted to medical/fitness units (kg, lbs, mmHg, bpm, etc.)
- **Date constraints**: Cannot be future-dated or more than 1 year old
- **Business logic**: Percentage values ≤100%, hours ≤24, minutes ≤1440
- **Bulk operations**: Limited to 50 records per batch

#### Health Analytics (`HealthAnalyticsValidation`)
- **Date range limits**: Maximum 365 days to prevent performance issues
- **Type limits**: Maximum 10 health types per query
- **Default ranges**: 30-day lookback when dates not specified
- **Aggregation options**: daily, weekly, monthly

#### Health Goals (`HealthGoalValidation`)
- **Future dates**: target_date must be in the future
- **Reasonable ranges**: Type-specific value validation (weight 30-300kg, BP 50-200mmHg)
- **Status transitions**: Controlled through enum validation

#### Health Reminders (`HealthReminderValidation`)
- **Cron validation**: Complex regex supporting standard and named schedules (@daily, @weekly)
- **Message length**: 1-500 characters
- **Active status**: Required boolean field

## Business Logic Constraints

### Temporal Constraints
- Health records cannot be future-dated
- Goal target dates must be in the future
- Analytics queries limited to 365-day ranges
- Training sessions can have both scheduled and actual dates

### Data Quality Rules
- Health metric values must be positive and within reasonable ranges
- Unit consistency enforced through validation schemas
- Exercise secondary muscle groups stored as JSON array
- RPE (Rate of Perceived Exertion) scale 1-10 for exercise logs

### Performance Constraints
- Bulk health record operations limited to 50 records
- Analytics queries limited to 10 health types
- Strategic indexing on frequently queried fields
- Composite indexes for user-based queries

### User Data Isolation
- All user-specific data partitioned by user_id
- No cross-user data access through schema design
- Consistent user_id field naming across all tables

## Index Strategy

### Performance Indexes
- **health_record**: (user_id, recorded_at), (user_id, type_id)
- **health_goal**: (user_id, type_id)
- **health_reminder**: (user_id, type_id)
- **exercise**: (exercise_type), (primary_muscle_group_id)
- **training_plan**: (user_id, is_active)
- **training_session**: (user_id, scheduled_date), (training_plan_id, scheduled_date)
- **workout_exercise**: (training_session_id, order)
- **exercise_log**: (user_id, logged_at), (training_session_id, exercise_id)

### Index Rationale
- **User-based filtering**: Most common query pattern
- **Temporal queries**: Date-based filtering for analytics
- **Lookup optimization**: Foreign key relationships
- **Exercise ordering**: Maintaining workout sequence

## Data Integrity Rules

### Referential Integrity
- Foreign key constraints maintain relationship consistency
- Cascading behaviors not explicitly defined (default RESTRICT)
- Optional relationships allow flexible data modeling

### Consistency Rules
- Auto-updating timestamps ensure audit trail
- Enum constraints prevent invalid status values
- Unique constraints prevent duplicate master data

### Validation Layers
1. **Database level**: Schema constraints and data types
2. **ORM level**: Drizzle schema definitions
3. **Application level**: Zod validation schemas
4. **Business logic level**: Custom validation functions

## Migration History

The schema evolution shows progressive enhancement:
1. Initial health management tables
2. Exercise management domain addition
3. Performance optimization with strategic indexing
4. Business rule enforcement through validation

This comprehensive schema design supports scalable health and exercise management with strong data integrity, performance optimization, and user data isolation.