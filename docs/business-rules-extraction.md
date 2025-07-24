# Business Rules Extraction

This document provides a comprehensive extraction of all business logic and validation rules from the health and exercise management system, derived from schema definitions, validation files, service layer logic, and test cases.

## Executive Summary

The system implements sophisticated business rules across two main domains: Health Management and Exercise Management. These rules are enforced at multiple layers including database schema constraints, application-level validation (Zod schemas), and service layer business logic. The rules ensure data integrity, user safety, system performance, and regulatory compliance for health data management.

## Health Management Business Rules

### Health Type Classification (`HealthTypeEnum`)

#### Supported Health Metrics
Based on `src/validations/HealthRecordValidation.ts`, the system supports the following health metrics:

- **Physical Measurements**: `weight`
- **Cardiovascular**: `blood_pressure_systolic`, `blood_pressure_diastolic`, `heart_rate`, `oxygen_saturation`
- **Activity Tracking**: `steps`, `exercise_minutes`
- **Metabolic**: `calories`, `blood_sugar`, `water_intake`, `sleep_hours`
- **Vital Signs**: `temperature`

#### Business Validation Ranges
Each health type has specific acceptable ranges to ensure medical safety:

```typescript
// Value ranges from HealthRecordValidation.ts
weight: { min: 20, max: 500 } // kg or lbs
blood_pressure_systolic: { min: 70, max: 250 } // mmHg
blood_pressure_diastolic: { min: 40, max: 150 } // mmHg
heart_rate: { min: 30, max: 220 } // bpm
steps: { min: 0, max: 100000 } // steps per day
sleep_hours: { min: 0, max: 24 } // hours
water_intake: { min: 0, max: 10000 } // ml or oz
calories: { min: 0, max: 10000 } // kcal
exercise_minutes: { min: 0, max: 1440 } // minutes per day
blood_sugar: { min: 20, max: 600 } // mg/dL or mmol/L
temperature: { min: 90, max: 110 } // °F or 32-43°C
oxygen_saturation: { min: 70, max: 100 } // %
```

### Health Record Business Rules

#### Temporal Constraints (`HealthRecordValidation`)
- **No Future Dating**: Health records cannot be recorded for future dates
- **Historical Limit**: Records cannot be older than one year from current date
- **Recorded At Validation**: `recorded_at <= current_date AND recorded_at >= (current_date - 1 year)`

#### Unit Consistency Rules
Valid units are strictly enforced based on medical standards:
- **Weight**: kg, lbs
- **Blood Pressure**: mmHg
- **Heart Rate**: bpm
- **Activity**: steps, minutes, hours
- **Volume**: ml, oz
- **Energy**: kcal
- **Blood Glucose**: mg/dL, mmol/L
- **Temperature**: °C, °F
- **Percentage**: %

#### Data Quality Rules
- **Positive Values**: All health measurements must be positive numbers
- **Precision**: Numeric values limited to precision(10,2) for consistency
- **Unit-Specific Validation**:
  - Percentage values cannot exceed 100%
  - Hours cannot exceed 24 per day
  - Minutes cannot exceed 1440 per day

#### Bulk Operation Constraints
- **Batch Limit**: Maximum 50 health records per bulk operation
- **Performance Protection**: Prevents system overload and ensures responsive UI
- **Error Isolation**: Failed records in batch don't affect successful ones

### Health Goal Business Rules

#### Goal Status Lifecycle (`goalStatusEnum`)
From `src/models/Schema.ts` and validation rules:

- **`active`**: Goal is currently being pursued (default status)
- **`completed`**: Goal has been achieved successfully
- **`paused`**: Goal is temporarily suspended but not abandoned

#### Goal Target Validation (`HealthGoalValidation`)
- **Future Dating Required**: `target_date` must be in the future
- **Reasonable Target Ranges**: Type-specific validation ensures achievable goals
  - Weight goals: 30-300 kg (reasonable human weight range)
  - Systolic BP goals: 50-200 mmHg (safe blood pressure range)
  - Daily steps: 1,000-50,000 steps (realistic activity levels)
  - BMI goals: 10-50 (extreme but possible BMI range)
  - Heart rate: 30-300 bpm (covers resting to maximum rates)

#### Goal Progress Tracking
- **Current Value Validation**: Progress measurements must be positive
- **No Future Progress**: Progress dates cannot be in the future
- **Default Progress Date**: Defaults to current timestamp when not specified

### Health Reminder Business Rules

#### Scheduling Rules (`HealthReminderValidation`)
- **Cron Expression Validation**: Complex regex supporting multiple formats:
  - Standard 5-field cron: `minute hour day month dayofweek`
  - Named schedules: `@yearly`, `@annually`, `@monthly`, `@weekly`, `@daily`, `@hourly`
  - @every syntax with time units: `@every 2h30m`
  - Special characters: `*`, `/`, `,`, `-`, `?`, `L`, `#`

#### Message Constraints
- **Required Content**: Reminder message cannot be empty
- **Character Limit**: Maximum 500 characters for message text
- **Trimming**: Whitespace automatically trimmed from messages

#### Activation Rules
- **Default Active**: New reminders are active by default
- **Required Status**: Active/inactive status must be explicitly set
- **Next Run Calculation**: System automatically calculates `next_run_at` based on cron expression

### Health Analytics Business Rules

#### Query Performance Protection (`HealthAnalyticsValidation`)
- **Date Range Limit**: Maximum 365 days per query to prevent performance issues
- **Type Limit**: Maximum 10 health types per analytics query
- **Default Range**: 30-day lookback when dates not specified

#### Aggregation Rules
- **Supported Periods**: `daily`, `weekly`, `monthly`
- **Data Integrity**: Ensures proper grouping and averaging across time periods
- **Empty Data Handling**: Graceful handling of periods with no data

## Exercise Management Business Rules

### Exercise Classification Rules

#### Exercise Type Categories (`exerciseTypeEnum`)
From `src/models/Schema.ts`:

- **`strength`**: Resistance/weight training exercises
- **`cardio`**: Cardiovascular endurance activities
- **`flexibility`**: Stretching and mobility exercises
- **`balance`**: Balance and stability training
- **`sports`**: Sport-specific activities and movements

#### Difficulty Progression (`difficultyLevelEnum`)
- **`beginner`**: Entry-level, minimal experience required (default)
- **`intermediate`**: Moderate difficulty, some experience needed
- **`advanced`**: High difficulty, significant experience required

### Muscle Group Classification

#### Anatomical Organization
From `scripts/seed-exercise-data.ts`:

**Upper Body**:
- Chest (Pectorals and surrounding chest muscles)
- Back (Latissimus dorsi, rhomboids, traps)
- Shoulders (Deltoids and rotator cuff muscles)
- Biceps (Front arm muscles)
- Triceps (Back arm muscles)
- Forearms (Lower arm muscles)

**Core**:
- Abs (Abdominal muscles)
- Obliques (Side abdominal muscles)
- Lower Back (Lower back and spinal erectors)

**Lower Body**:
- Quadriceps (Front thigh muscles)
- Hamstrings (Back thigh muscles)
- Glutes (Buttock muscles)
- Calves (Lower leg muscles)
- Hip Flexors (Hip and groin muscles)

#### Muscle Group Relationships
- **Primary Muscle**: Each exercise must have exactly one primary muscle group
- **Secondary Muscles**: Stored as JSON array, allows multiple secondary targets
- **Unique Names**: Muscle group names must be unique across the system

### Training Plan Business Rules

#### Plan Structure Rules
- **User Isolation**: Each training plan belongs to exactly one user
- **Duration Constraints**: Plan duration specified in whole weeks
- **Session Frequency**: Sessions per week must be positive integer
- **Active Plan Management**: Only one plan can be active per user at a time
- **Date Consistency**: If both start_date and end_date provided, start_date < end_date

#### Plan Lifecycle Management
- **Default State**: New plans default to inactive status
- **Activation Rules**: Users must explicitly activate training plans
- **Flexibility**: Plans can exist without specific start/end dates for ongoing programs

### Training Session Business Rules

#### Session Status Management (`trainingStatusEnum`)
- **`scheduled`**: Session is planned but not started (default)
- **`completed`**: Session has been finished successfully
- **`skipped`**: Session was intentionally missed
- **`in_progress`**: Session is currently active

#### Session Scheduling Rules
- **Required Scheduling**: `scheduled_date` is mandatory for all sessions
- **Flexible Completion**: `actual_date` optional, allows rescheduling
- **Plan Association**: Sessions can exist independently or as part of training plan
- **Duration Tracking**: Optional `duration_minutes` for session length recording

### Workout Exercise Prescription Rules

#### Exercise Ordering
- **Sequence Management**: `order` field maintains exercise sequence within session
- **Required Ordering**: All exercises within session must have order value
- **Flexible Prescriptions**: Mix of different prescription types allowed

#### Prescription Flexibility
- **Set-Based**: Number of sets required, reps/weight optional
- **Time-Based**: Target duration in seconds for cardio/endurance
- **Hybrid Prescriptions**: Can combine sets, reps, weight, and duration
- **Rest Periods**: Optional rest time specification in seconds

### Exercise Logging Business Rules

#### Performance Tracking Granularity
- **Set-Level Logging**: Each set can be logged individually
- **Multi-Modal Data**: Supports reps, weight, duration, distance
- **RPE Scale**: Rate of Perceived Exertion on 1-10 scale
- **Flexible Logging**: Not all fields required, adapts to exercise type

#### Data Integrity Rules
- **User Isolation**: Users can only log their own exercise data
- **Exercise Validation**: Must reference valid exercise from library
- **Session Association**: Can be linked to training session or standalone
- **Automatic Timestamps**: `logged_at` defaults to current time

## Cross-Domain Business Rules

### User Data Isolation
- **Strict Partitioning**: All user data isolated by `user_id`
- **No Cross-User Access**: Schema design prevents accidental data leakage
- **Consistent Field Naming**: `user_id` field consistent across all user tables

### Temporal Consistency
- **Audit Trail**: All tables include `created_at` and `updated_at` timestamps
- **Automatic Updates**: `updated_at` refreshes automatically on record modification
- **Historical Integrity**: Created dates immutable after initial insert

### Data Quality Assurance
- **Required Fields**: Critical business fields marked as NOT NULL
- **Default Values**: Sensible defaults provided for optional fields
- **Enumeration Constraints**: Invalid status values prevented by enum types
- **Referential Integrity**: Foreign key constraints maintain data consistency

## Performance and Scalability Rules

### Query Optimization Rules
- **Index Strategy**: Strategic indexing on user_id and frequently queried fields
- **Pagination Support**: Limit/offset parameters for large result sets
- **Composite Indexes**: Optimized for common query patterns

### Bulk Operation Limits
- **Health Records**: Maximum 50 records per batch operation
- **Analytics Queries**: Maximum 365-day date ranges
- **Type Filtering**: Maximum 10 health types per analytics query

### System Resource Protection
- **Connection Timeouts**: Database connection timeout handling
- **Error Isolation**: Failed operations don't cascade to successful ones
- **Graceful Degradation**: System handles partial failures appropriately

## Validation Error Handling

### Error Message Standards
- **User-Friendly Messages**: Clear, actionable error descriptions
- **Field-Specific Errors**: Errors mapped to specific input fields
- **Validation Context**: Error messages include acceptable value ranges

### Multi-Layer Validation
1. **Database Layer**: Schema constraints and data types
2. **ORM Layer**: Drizzle schema definitions and relationships
3. **Application Layer**: Zod validation schemas with business rules
4. **Service Layer**: Complex business logic and cross-field validation

## Security and Privacy Rules

### Data Access Control
- **User Authentication**: All operations require valid user identification
- **Authorization Checks**: Users can only access their own data
- **Health Data Sensitivity**: Special handling for medical information

### Data Retention and Compliance
- **Historical Limits**: Health records limited to one year historical data
- **Data Integrity**: Immutable audit trail for all changes
- **Privacy Protection**: No cross-user data references or exposure

## Business Logic Service Layer Rules

### Health Record Service Rules (from `HealthRecordService.test.ts`)

#### Value Range Validation
- **Typical Range Checking**: Values must fall within health type's typical ranges
- **Business Logic Override**: Service layer can apply more restrictive rules than schema
- **Medical Safety**: Extreme values rejected even if technically valid

#### User Data Security
- **Ownership Verification**: Users can only access/modify their own records
- **Cross-User Prevention**: Attempts to access other user data return not found
- **Data Isolation**: Service layer enforces user data partitioning

#### Error Handling Patterns
- **Graceful Degradation**: System handles database errors without crashing
- **Concurrent Update Protection**: Optimistic locking prevents data corruption
- **Invalid Input Handling**: Null/undefined values properly rejected
- **Connection Resilience**: Timeout and connection error handling

#### Statistics and Analytics
- **Real-Time Calculations**: Statistics calculated from actual data
- **Null Handling**: Proper handling of empty datasets
- **Trend Analysis**: Support for time-series trend calculations
- **Aggregation Logic**: Proper averaging and grouping across time periods

This comprehensive business rules extraction provides the foundation for understanding the complete business logic that governs the health and exercise management system, ensuring data integrity, user safety, and regulatory compliance.