# Data Validation Rules

This document provides a comprehensive catalog of all validation constraints and data quality requirements across the health and exercise management system, extracted from schema definitions, validation files, and service layer logic.

## Executive Summary

The system implements multi-layered validation across four distinct levels: database schema constraints, ORM-level validation, application-level Zod schemas, and custom service layer business logic. This comprehensive approach ensures data integrity, prevents invalid states, and provides excellent user experience through clear error messaging.

## Validation Architecture

### Validation Layers

1. **Database Schema Level** (`src/models/Schema.ts`)
   - Primary keys, foreign keys, NOT NULL constraints
   - Data types, precision, and length limits
   - Unique constraints and indexes
   - Default values and auto-generated fields

2. **ORM Level** (Drizzle ORM)
   - Type safety through TypeScript integration
   - Relationship validation and referential integrity
   - Enum type enforcement

3. **Application Level** (`src/validations/`)
   - Zod validation schemas with business rules
   - Complex cross-field validation
   - User input sanitization and transformation

4. **Service Layer** (Service classes and tests)
   - Complex business logic validation
   - Multi-entity consistency checks
   - Performance and security constraints

## Schema-Level Constraints

### Primary Key Constraints
All tables use auto-incrementing serial primary keys:
```sql
id serial PRIMARY KEY
```

### NOT NULL Constraints

#### Health Management Tables
- **health_type**: `id`, `slug`, `display_name`, `unit`, `created_at`, `updated_at`
- **health_record**: `id`, `user_id`, `type_id`, `value`, `unit`, `recorded_at`, `created_at`, `updated_at`
- **health_goal**: `id`, `user_id`, `type_id`, `target_value`, `target_date`, `status`, `created_at`, `updated_at`
- **health_reminder**: `id`, `user_id`, `type_id`, `cron_expr`, `message`, `active`, `created_at`, `updated_at`

#### Exercise Management Tables
- **muscle_group**: `id`, `name`, `body_part`, `created_at`, `updated_at`
- **exercise**: `id`, `name`, `exercise_type`, `primary_muscle_group_id`, `difficulty`, `created_at`, `updated_at`
- **training_plan**: `id`, `user_id`, `name`, `difficulty`, `duration_weeks`, `sessions_per_week`, `is_active`, `created_at`, `updated_at`
- **training_session**: `id`, `user_id`, `name`, `scheduled_date`, `status`, `created_at`, `updated_at`
- **workout_exercise**: `id`, `training_session_id`, `exercise_id`, `order`, `sets`, `created_at`, `updated_at`
- **exercise_log**: `id`, `user_id`, `exercise_id`, `set_number`, `logged_at`, `created_at`, `updated_at`

### UNIQUE Constraints
- **health_type.slug**: Ensures unique health metric identifiers
- **muscle_group.name**: Prevents duplicate muscle group names

### Foreign Key Constraints

#### Health Domain
```sql
health_record.type_id → health_type.id
health_goal.type_id → health_type.id
health_reminder.type_id → health_type.id
```

#### Exercise Domain
```sql
exercise.primary_muscle_group_id → muscle_group.id
training_session.training_plan_id → training_plan.id (optional)
workout_exercise.training_session_id → training_session.id
workout_exercise.exercise_id → exercise.id
exercise_log.training_session_id → training_session.id (optional)
exercise_log.exercise_id → exercise.id
```

### Default Value Constraints
- **Timestamps**: `created_at` and `updated_at` default to current timestamp
- **Booleans**: `health_reminder.active` defaults to `true`, `training_plan.is_active` defaults to `false`
- **Enums**: `health_goal.status` defaults to `'active'`, `exercise.difficulty` defaults to `'beginner'`, `training_session.status` defaults to `'scheduled'`
- **Counters**: `counter.count` defaults to `0`

## Field-Level Validation

### String Field Constraints

#### Length Limits (VARCHAR constraints)
```typescript
// Health Management
health_type.slug: max 50 characters
health_type.display_name: max 100 characters
health_type.unit: max 20 characters
health_record.user_id: max 255 characters
health_record.unit: max 20 characters
health_goal.user_id: max 255 characters
health_reminder.user_id: max 255 characters
health_reminder.cron_expr: max 100 characters
health_reminder.message: max 500 characters

// Exercise Management
muscle_group.name: max 50 characters
muscle_group.body_part: max 50 characters
muscle_group.description: max 200 characters
exercise.name: max 100 characters
exercise.description: max 500 characters
exercise.secondary_muscle_group_ids: max 100 characters
exercise.instructions: max 1000 characters
exercise.equipment_needed: max 200 characters
training_plan.user_id: max 255 characters
training_plan.name: max 100 characters
training_plan.description: max 500 characters
training_session.user_id: max 255 characters
training_session.name: max 100 characters
training_session.notes: max 1000 characters
workout_exercise.notes: max 500 characters
exercise_log.user_id: max 255 characters
exercise_log.notes: max 500 characters
```

### Numeric Field Constraints

#### Precision and Scale
```typescript
// Numeric fields use precision(10,2) for consistency
health_type.typical_range_low: numeric(10,2)
health_type.typical_range_high: numeric(10,2)
health_record.value: numeric(10,2)
health_goal.target_value: numeric(10,2)
workout_exercise.target_weight: numeric(10,2)
exercise_log.weight: numeric(10,2)
exercise_log.distance: numeric(10,2)
```

#### Integer Constraints
```typescript
// Positive integer constraints
training_plan.duration_weeks: integer (must be positive)
training_plan.sessions_per_week: integer (must be positive)
training_session.duration_minutes: integer (optional)
workout_exercise.order: integer (required for sequencing)
workout_exercise.sets: integer (required)
workout_exercise.target_reps: integer (optional)
workout_exercise.target_duration: integer (seconds, optional)
workout_exercise.rest_seconds: integer (optional)
exercise_log.set_number: integer (required)
exercise_log.reps: integer (optional)
exercise_log.duration: integer (seconds, optional)
exercise_log.rest_duration: integer (seconds, optional)
exercise_log.rpe: integer (1-10 scale, optional)
```

### Enum Field Validation

#### Health Management Enums
```typescript
// Goal Status (goalStatusEnum)
type GoalStatus = 'active' | 'completed' | 'paused';
// Default: 'active'

// Training Status (trainingStatusEnum)
type TrainingStatus = 'scheduled' | 'completed' | 'skipped' | 'in_progress';
// Default: 'scheduled'
```

#### Exercise Management Enums
```typescript
// Exercise Type (exerciseTypeEnum)
type ExerciseType = 'strength' | 'cardio' | 'flexibility' | 'balance' | 'sports';
// Required field, no default

// Difficulty Level (difficultyLevelEnum)
type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
// Default: 'beginner'
```

## Application-Level Validation (Zod Schemas)

### Health Record Validation (`HealthRecordValidation`)

#### Core Field Validation
```typescript
type_id: z.coerce.number().int().positive({
  message: 'Health type ID must be a positive integer'
});

value: z.coerce.number().positive({
  message: 'Value must be a positive number'
}).refine(value => value <= 10000, {
  message: 'Value exceeds maximum allowed range'
});

unit: z.string().min(1).max(20).refine((unit) => {
  const validUnits = [
    'kg',
    'lbs',
    'mmHg',
    'bpm',
    'steps',
    'hours',
    'ml',
    'oz',
    'kcal',
    'minutes',
    'mg/dL',
    'mmol/L',
    '°C',
    '°F',
    '%'
  ];
  return validUnits.includes(unit);
}, {
  message: 'Invalid unit. Must be one of: kg, lbs, mmHg, bpm, steps, hours, ml, oz, kcal, minutes, mg/dL, mmol/L, °C, °F, %'
});

recorded_at: z.coerce.date()
  .refine(date => date <= new Date(), {
    message: 'Recorded date cannot be in the future'
  })
  .refine((date) => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return date >= oneYearAgo;
  }, {
    message: 'Recorded date cannot be more than one year ago'
  });
```

#### Cross-Field Business Logic Validation
```typescript
.refine((data) => {
  // Unit-specific value validation
  if (data.unit === '%' && data.value > 100) return false;
  if (data.unit === 'hours' && data.value > 24) return false;
  if (data.unit === 'minutes' && data.value > 1440) return false;
  return true;
}, {
  message: 'Value is not reasonable for the specified unit'
})
```

#### Query and Bulk Operation Validation
```typescript
// Query validation with pagination
HealthRecordQueryValidation: z.object({
  type_id: z.coerce.number().int().positive().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return data.start_date <= data.end_date;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date'
});

// Bulk operation limits
HealthRecordBulkValidation: z.object({
  records: z.array(HealthRecordValidation).min(1).max(50, {
    message: 'Cannot process more than 50 records at once'
  })
});
```

### Health Analytics Validation (`HealthAnalyticsValidation`)

#### Date Range and Performance Constraints
```typescript
const MAX_DATE_RANGE_DAYS = 365;

HealthAnalyticsValidation: z.object({
  start_date: z.string()
    .datetime({ message: 'start_date must be a valid ISO datetime string' })
    .transform(val => new Date(val)),

  end_date: z.string()
    .datetime({ message: 'end_date must be a valid ISO datetime string' })
    .transform(val => new Date(val)),

  type_ids: z.array(z.number().int().positive())
    .min(1, { message: 'At least one type_id must be provided' })
    .max(10, { message: 'Maximum 10 type_ids allowed' })
    .optional(),

  aggregation: z.enum(['daily', 'weekly', 'monthly']).default('daily')
})
  .refine(data => data.end_date > data.start_date, {
    message: 'end_date must be after start_date'
  })
  .refine((data) => {
    const diffInMs = data.end_date.getTime() - data.start_date.getTime();
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    return diffInDays <= MAX_DATE_RANGE_DAYS;
  }, {
    message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`
  });
```

### Health Goal Validation (`HealthGoalValidation`)

#### Goal-Specific Business Rules
```typescript
HealthGoalValidation: z.object({
  type_id: z.coerce.number().int().positive('Health type ID must be a positive integer'),
  target_value: z.coerce.number().positive('Target value must be a positive number'),
  target_date: z.coerce.date().refine(
    date => date > new Date(),
    'Target date must be in the future'
  ),
  status: z.enum(['active', 'completed', 'paused']).default('active')
})
  .refine((data) => {
  // Type-specific reasonable ranges
    const reasonableRanges: Record<number, { min: number; max: number }> = {
      1: { min: 30, max: 300 }, // Weight (kg)
      2: { min: 50, max: 200 }, // Systolic BP (mmHg)
      3: { min: 1000, max: 50000 }, // Daily steps
      4: { min: 10, max: 50 }, // BMI
      5: { min: 30, max: 300 }, // Heart rate (bpm)
    };

    const range = reasonableRanges[data.type_id];
    if (range) {
      return data.target_value >= range.min && data.target_value <= range.max;
    }
    return data.target_value > 0;
  }, {
    message: 'Target value is outside reasonable range for this health metric type'
  });
```

### Health Reminder Validation (`HealthReminderValidation`)

#### Cron Expression Validation
```typescript
// Complex regex supporting multiple cron formats
const cronRegex = /^((((\d+,)+\d+|(\d+([/\-#])\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5})|(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|[smh]))+)$/;

HealthReminderValidation: z.object({
  type_id: z.coerce.number().int().positive({
    message: 'Health type ID must be a positive integer'
  }),
  cron_expr: z.string().min(1, {
    message: 'Cron expression is required'
  }).refine(value => cronRegex.test(value), {
    message: 'Invalid cron expression format. Use standard cron syntax (e.g., "0 9 * * *") or named schedules (e.g., "@daily")'
  }),
  message: z.string().min(1, {
    message: 'Reminder message is required'
  }).max(500, {
    message: 'Reminder message must be 500 characters or less'
  }).trim(),
  active: z.boolean({
    required_error: 'Active status is required',
    invalid_type_error: 'Active status must be a boolean'
  })
});
```

## Cross-Field Validation Rules

### Temporal Consistency Validation

#### Date Range Validation
```typescript
// Ensures logical date ordering
.refine((data) => {
  if (data.start_date && data.end_date) {
    return data.start_date <= data.end_date;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date'
})

// Prevents future-dating of health records
.refine(date => date <= new Date(), {
  message: 'Recorded date cannot be in the future'
})

// Requires future goals
.refine(date => date > new Date(), {
  message: 'Target date must be in the future'
})
```

#### Performance-Based Date Limits
```typescript
// Analytics query performance protection
.refine(data => {
  const diffInMs = data.end_date.getTime() - data.start_date.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return diffInDays <= MAX_DATE_RANGE_DAYS;
}, {
  message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`
})

// Historical data limits
.refine(date => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return date >= oneYearAgo;
}, {
  message: 'Recorded date cannot be more than one year ago'
})
```

### Business Value Ranges

#### Health Metric Ranges
```typescript
const healthMetricRanges = {
  weight: { min: 20, max: 500 }, // kg or lbs
  blood_pressure_systolic: { min: 70, max: 250 }, // mmHg
  blood_pressure_diastolic: { min: 40, max: 150 }, // mmHg
  heart_rate: { min: 30, max: 220 }, // bpm
  steps: { min: 0, max: 100000 }, // steps per day
  sleep_hours: { min: 0, max: 24 }, // hours
  water_intake: { min: 0, max: 10000 }, // ml or oz
  calories: { min: 0, max: 10000 }, // kcal
  exercise_minutes: { min: 0, max: 1440 }, // minutes per day
  blood_sugar: { min: 20, max: 600 }, // mg/dL or mmol/L
  temperature: { min: 90, max: 110 }, // °F or 32-43°C
  oxygen_saturation: { min: 70, max: 100 } // %
};
```

#### Unit-Specific Validation
```typescript
// Percentage values
if (data.unit === '%' && data.value > 100) return false;

// Time-based values
if (data.unit === 'hours' && data.value > 24) return false;
if (data.unit === 'minutes' && data.value > 1440) return false;

// Exercise RPE scale
rpe: integer between 1-10 (Rate of Perceived Exertion)
```

## Bulk Operation Constraints

### Performance Limits
```typescript
// Health record bulk operations
records: z.array(HealthRecordValidation).min(1).max(50, {
  message: 'Cannot process more than 50 records at once'
});

// Analytics query limits
type_ids: z.array(z.number().int().positive())
  .max(10, { message: 'Maximum 10 type_ids allowed' });

// Date range limits
MAX_DATE_RANGE_DAYS = 365; // Maximum analytics query range
```

### Pagination Validation
```typescript
// Query pagination controls
limit: z.coerce.number().int().min(1).max(100).default(20),
offset: z.coerce.number().int().min(0).default(0),

// Default values for user experience
thirtyDaysAgo: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
```

## Error Messages and Handling

### User-Friendly Error Messages

#### Field-Specific Messages
```typescript
// Clear, actionable error messages
'Health type ID must be a positive integer';
'Value must be a positive number';
'Recorded date cannot be in the future';
'Target date must be in the future';
'Invalid cron expression format. Use standard cron syntax (e.g., "0 9 * * *") or named schedules (e.g., "@daily")';
'Value is not reasonable for the specified unit';
'Start date must be before or equal to end date';
'Cannot process more than 50 records at once';
```

#### Context-Aware Messages
```typescript
// Messages include acceptable ranges
'Invalid unit. Must be one of: kg, lbs, mmHg, bpm, steps, hours, ml, oz, kcal, minutes, mg/dL, mmol/L, °C, °F, %';
'Target value is outside reasonable range for this health metric type';
'Date range cannot exceed 365 days';
'Maximum 10 type_ids allowed';
```

### Error Handling Patterns

#### Validation Error Structure
```typescript
// Zod validation errors include:
{
  message: string,      // User-friendly error message
  path: string[],       // Field path for UI mapping
  code: string,         // Error code for programmatic handling
}
```

#### Service Layer Error Handling
```typescript
// From HealthRecordService.test.ts
'Health type not found';
'Value outside typical range';
'Cannot record health data for future dates';
'Health record not found';
'Failed to update health record';
'Invalid user ID';
'Invalid health record data';
```

## Custom Validation Logic

### Service Layer Business Rules

#### Health Record Service Validation
```typescript
// Typical range validation (from service tests)
validateHealthValue(value: number, healthType: HealthType): boolean {
  return value >= healthType.typical_range_low &&
         value <= healthType.typical_range_high;
}

// User data isolation
ensureUserOwnership(userId: string, record: HealthRecord): boolean {
  return record.user_id === userId;
}

// Future date prevention
validateRecordedDate(date: Date): boolean {
  return date <= new Date();
}
```

#### Statistics and Analytics Validation
```typescript
// Null handling for empty datasets
calculateStats(records: HealthRecord[]): StatsResult {
  if (records.length === 0) {
    return {
      count: 0,
      average: null,
      min: null,
      max: null,
      latest: null
    };
  }
  // ... calculation logic
}

// Trend aggregation validation
validateAggregationPeriod(period: 'daily' | 'weekly' | 'monthly'): boolean {
  return ['daily', 'weekly', 'monthly'].includes(period);
}
```

## Validation Performance Considerations

### Index-Backed Validation
```typescript
// Validation queries use existing indexes for performance
userRecordedAtIdx: index on (user_id, recorded_at)
userTypeIdx: index on (user_id, type_id)
exerciseTypeIdx: index on (exercise_type)
primaryMuscleIdx: index on (primary_muscle_group_id)
```

### Batch Validation Optimization
```typescript
// Bulk operations validate entire batch before processing
// Prevents partial failures and maintains data consistency
// Uses database transactions for atomicity
```

### Caching and Memoization
```typescript
// Health type validation can be cached
// Muscle group lookups cached during exercise seeding
// Enum validation compiled once at startup
```

This comprehensive validation framework ensures data integrity, excellent user experience, and system performance while maintaining strict business rule compliance across the entire health and exercise management platform.
