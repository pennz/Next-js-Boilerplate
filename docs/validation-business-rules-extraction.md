# Validation Business Rules Extraction

This document provides a comprehensive analysis of all business rules extracted from validation schemas in the health management system. The rules are derived from Zod validation schemas located in `src/validations/`.

## Table of Contents

1. [Health Record Validation Rules](#health-record-validation-rules)
2. [Health Goal Validation Rules](#health-goal-validation-rules)
3. [Health Reminder Validation Rules](#health-reminder-validation-rules)
4. [Health Analytics Validation Rules](#health-analytics-validation-rules)
5. [Cross-Validation Business Rules](#cross-validation-business-rules)
6. [Enum Business Meanings](#enum-business-meanings)
7. [Value Range Business Logic](#value-range-business-logic)
8. [Temporal Business Constraints](#temporal-business-constraints)

## Health Record Validation Rules

### Data Sources
- **Primary Schema**: `src/validations/HealthRecordValidation.ts`
- **Business Context**: Individual health metric tracking with comprehensive validation

### Core Business Rules

#### 1. Health Type Classification (`HealthTypeEnum`)
```typescript
// From HealthRecordValidation.ts:4-17
export const HealthTypeEnum = z.enum([
  'weight',
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
  'heart_rate',
  'steps',
  'sleep_hours',
  'water_intake',
  'calories',
  'exercise_minutes',
  'blood_sugar',
  'temperature',
  'oxygen_saturation'
]);
```

**Business Meaning**: The system supports 12 standardized health metric types, covering cardiovascular, metabolic, activity, and physiological measurements. Each type has specific validation rules and expected units.

#### 2. Unit Validation Business Logic (`unitValidation`)
```typescript
// From HealthRecordValidation.ts:20-41
const validUnits = ['kg', 'lbs', 'mmHg', 'bpm', 'steps', 'hours', 'ml', 'oz', 'kcal', 'minutes', 'mg/dL', 'mmol/L', '°C', '°F', '%'];
```

**Business Rules**:
- **Unit Standardization**: Only predefined units are accepted to ensure data consistency
- **Length Constraint**: Units must be 1-20 characters to prevent abuse
- **Medical Standards**: Units follow international medical and fitness standards
- **Multi-System Support**: Supports both metric and imperial systems for global use

#### 3. Value Range Validation (`createValueValidation`)
```typescript
// From HealthRecordValidation.ts:44-63
const ranges: Record<string, { min: number; max: number }> = {
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

**Business Rules**:
- **Safety Boundaries**: Ranges prevent entry of medically impossible or dangerous values
- **Data Quality**: Ensures recorded data falls within human physiological ranges
- **Error Prevention**: Catches typos and measurement errors at input validation
- **Clinical Relevance**: Ranges account for extreme but possible medical conditions

#### 4. Core Record Validation (`HealthRecordValidation`)
```typescript
// From HealthRecordValidation.ts:66-108
export const HealthRecordValidation = z.object({
  type_id: z.coerce.number().int().positive(),
  value: z.coerce.number().positive().refine(value => value <= 10000),
  unit: unitValidation,
  recorded_at: z.coerce.date().refine(/* temporal constraints */)
});
```

**Business Rules**:
- **Type ID Integrity**: Must reference valid health type with positive integer constraint
- **Value Positivity**: All health values must be positive (no negative measurements)
- **Maximum Value Protection**: 10,000 upper limit prevents system abuse and data corruption
- **Unit Consistency**: Units must match predefined valid units for the metric type

#### 5. Cross-Field Validation Logic
```typescript
// From HealthRecordValidation.ts:88-108
.refine((data) => {
  if (data.unit === '%' && data.value > 100) return false;
  if (data.unit === 'hours' && data.value > 24) return false;
  if (data.unit === 'minutes' && data.value > 1440) return false;
  return true;
}, { message: 'Value is not reasonable for the specified unit' });
```

**Business Rules**:
- **Percentage Logic**: Percentage values cannot exceed 100% (oxygen saturation, etc.)
- **Time Constraints**: Hours cannot exceed 24 per day, minutes cannot exceed 1440 per day
- **Unit-Value Consistency**: Values must be reasonable for their specified units
- **Data Integrity**: Prevents logically impossible combinations of values and units

#### 6. Query and Pagination Rules (`HealthRecordQueryValidation`)
```typescript
// From HealthRecordValidation.ts:118-131
export const HealthRecordQueryValidation = z.object({
  type_id: z.coerce.number().int().positive().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return data.start_date <= data.end_date;
  }
  return true;
});
```

**Business Rules**:
- **Performance Protection**: Maximum 100 records per query to prevent system overload
- **Default Pagination**: 20 records default balances performance and usability
- **Date Range Logic**: Start date must be before or equal to end date
- **Query Flexibility**: All filters are optional for maximum API flexibility

#### 7. Bulk Operation Constraints (`HealthRecordBulkValidation`)
```typescript
// From HealthRecordValidation.ts:134-138
export const HealthRecordBulkValidation = z.object({
  records: z.array(HealthRecordValidation).min(1).max(50, {
    message: 'Cannot process more than 50 records at once'
  })
});
```

**Business Rules**:
- **Batch Processing Limit**: Maximum 50 records per bulk operation
- **Minimum Requirement**: At least 1 record required for bulk operations
- **System Performance**: Prevents overloading database with massive bulk inserts
- **Transaction Safety**: Keeps bulk operations within manageable transaction sizes

## Health Goal Validation Rules

### Data Sources
- **Primary Schema**: `src/validations/HealthGoalValidation.ts`
- **Business Context**: Goal setting and progress tracking with lifecycle management

### Core Business Rules

#### 1. Goal Status Lifecycle (`GoalStatus`)
```typescript
// From HealthGoalValidation.ts:4
export const GoalStatus = z.enum(['active', 'completed', 'paused']);
```

**Business Rules**:
- **Active Goals**: Currently being pursued and tracked
- **Completed Goals**: Successfully achieved targets
- **Paused Goals**: Temporarily suspended but preserved for future resumption
- **Status Transitions**: Support for goal lifecycle management

#### 2. Goal Target Validation (`HealthGoalValidation`)
```typescript
// From HealthGoalValidation.ts:7-39
export const HealthGoalValidation = z.object({
  type_id: z.coerce.number().int().positive(),
  target_value: z.coerce.number().positive(),
  target_date: z.coerce.date().refine(date => date > new Date()),
  status: GoalStatus.default('active')
}).refine(/* reasonable target validation */);
```

**Business Rules**:
- **Future-Oriented Goals**: Target dates must be in the future
- **Positive Targets**: All target values must be positive numbers
- **Default Active Status**: New goals are active by default
- **Type Association**: Goals must be linked to valid health types

#### 3. Reasonable Target Ranges (`refine` validation)
```typescript
// From HealthGoalValidation.ts:16-38
const reasonableRanges: Record<number, { min: number; max: number }> = {
  1: { min: 30, max: 300 }, // Weight (kg)
  2: { min: 50, max: 200 }, // Systolic BP (mmHg)
  3: { min: 1000, max: 50000 }, // Daily steps
  4: { min: 10, max: 50 }, // BMI
  5: { min: 30, max: 300 } // Heart rate (bpm)
};
```

**Business Rules**:
- **Achievable Targets**: Ranges ensure goals are within human physiological possibilities
- **Type-Specific Validation**: Different health types have different reasonable ranges
- **Safety Constraints**: Prevents setting dangerous or impossible health goals
- **Motivational Design**: Ranges encourage realistic and achievable goal setting

#### 4. Goal Update Rules (`HealthGoalUpdateValidation`)
```typescript
// From HealthGoalValidation.ts:42-57
export const HealthGoalUpdateValidation = z.object({
  target_value: z.coerce.number().positive().optional(),
  target_date: z.coerce.date().refine(date => date > new Date()).optional(),
  status: GoalStatus.optional()
}).refine((data) => {
  return data.target_value !== undefined
    || data.target_date !== undefined
    || data.status !== undefined;
});
```

**Business Rules**:
- **Partial Updates**: Allow updating individual goal fields
- **Future Date Requirement**: Updated target dates must still be in the future
- **Minimum Change Requirement**: At least one field must be updated
- **Status Flexibility**: Support for changing goal status during lifecycle

#### 5. Progress Tracking Rules (`HealthGoalProgressValidation`)
```typescript
// From HealthGoalValidation.ts:60-66
export const HealthGoalProgressValidation = z.object({
  current_value: z.coerce.number().positive(),
  progress_date: z.coerce.date().refine(date => date <= new Date()).default(() => new Date())
});
```

**Business Rules**:
- **Historical Progress**: Progress dates cannot be in the future
- **Current Value Tracking**: Progress values must be positive
- **Default Timestamp**: Automatically timestamps progress entries
- **Progress Monitoring**: Enables systematic tracking of goal advancement

## Health Reminder Validation Rules

### Data Sources
- **Primary Schema**: `src/validations/HealthReminderValidation.ts`
- **Business Context**: Scheduled reminder system with cron-based scheduling

### Core Business Rules

#### 1. Cron Expression Validation (`cronRegex`)
```typescript
// From HealthReminderValidation.ts:3-8
const cronRegex = /^((((\d+,)+\d+|(\d+([/\-#])\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5})|(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|[smh]))+)$/;
```

**Business Rules**:
- **Standard Cron Support**: Full 5-field cron expression support
- **Named Schedules**: Support for @yearly, @annually, @monthly, @weekly, @daily, @hourly
- **@every Syntax**: Support for @every with time units (ns, us, µs, ms, s, m, h)
- **Flexible Scheduling**: Accommodates various scheduling patterns and frequencies

#### 2. Reminder Content Rules (`HealthReminderValidation`)
```typescript
// From HealthReminderValidation.ts:10-28
export const HealthReminderValidation = z.object({
  type_id: z.coerce.number().int().positive(),
  cron_expr: z.string().min(1).refine(value => cronRegex.test(value)),
  message: z.string().min(1).max(500).trim(),
  active: z.boolean()
});
```

**Business Rules**:
- **Type Association**: Reminders must be linked to valid health types
- **Message Requirements**: Messages must be 1-500 characters, trimmed of whitespace
- **Cron Validation**: Cron expressions must match the defined regex pattern
- **Active Status Control**: Reminders can be enabled/disabled via boolean flag

#### 3. Query Filtering Rules (`HealthReminderQueryValidation`)
```typescript
// From HealthReminderValidation.ts:32-35
export const HealthReminderQueryValidation = z.object({
  active: z.coerce.boolean().optional(),
  type_id: z.coerce.number().int().positive().optional()
});
```

**Business Rules**:
- **Status Filtering**: Filter reminders by active/inactive status
- **Type Filtering**: Filter reminders by health type
- **Optional Filters**: All query parameters are optional for maximum flexibility
- **Boolean Coercion**: Active status is coerced to boolean for URL parameter handling

## Health Analytics Validation Rules

### Data Sources
- **Primary Schema**: `src/validations/HealthAnalyticsValidation.ts`
- **Business Context**: Analytics queries with performance and date range constraints

### Core Business Rules

#### 1. Aggregation Options (`AggregationOption`)
```typescript
// From HealthAnalyticsValidation.ts:4
const AggregationOption = z.enum(['daily', 'weekly', 'monthly']);
```

**Business Rules**:
- **Time-Series Aggregation**: Support for daily, weekly, and monthly data aggregation
- **Performance Optimization**: Reduces data volume for large date ranges
- **Reporting Flexibility**: Enables different granularity levels for analytics
- **Chart Compatibility**: Matches common charting library aggregation patterns

#### 2. Date Range Performance Constraints
```typescript
// From HealthAnalyticsValidation.ts:6-7
const MAX_DATE_RANGE_DAYS = 365;
```

**Business Rules**:
- **Performance Protection**: Maximum 365-day range prevents excessive database load
- **System Stability**: Protects against queries that could impact system performance
- **Reasonable Analytics**: One-year range covers most analytics use cases
- **Resource Management**: Balances analytical capability with system resources

#### 3. Analytics Query Validation (`HealthAnalyticsValidation`)
```typescript
// From HealthAnalyticsValidation.ts:9-44
export const HealthAnalyticsValidation = z.object({
  start_date: z.string().datetime().transform(val => new Date(val)),
  end_date: z.string().datetime().transform(val => new Date(val)),
  type_ids: z.array(z.number().int().positive()).min(1).max(10).optional(),
  aggregation: AggregationOption.default('daily')
}).refine(/* multiple validation rules */);
```

**Business Rules**:
- **ISO DateTime Format**: Strict datetime string format for API consistency
- **Date Transformation**: Automatic conversion from string to Date objects
- **Type ID Limits**: Maximum 10 type IDs per query to prevent overload
- **Default Aggregation**: Daily aggregation as sensible default
- **Multiple Validation Layers**: End date validation, range validation, future date validation

#### 4. Cross-Field Date Validation
```typescript
// From HealthAnalyticsValidation.ts:24-44
.refine((data) => data.end_date > data.start_date)
.refine((data) => {
  const diffInDays = (data.end_date.getTime() - data.start_date.getTime()) / (1000 * 60 * 60 * 24);
  return diffInDays <= MAX_DATE_RANGE_DAYS;
})
.refine((data) => data.start_date <= new Date());
```

**Business Rules**:
- **Logical Date Ranges**: End date must be after start date
- **Range Size Limits**: Date range cannot exceed maximum allowed days
- **Historical Data Only**: Start date cannot be in the future
- **Data Integrity**: Ensures sensible date range queries

#### 5. Query Parameter Processing (`HealthAnalyticsQueryValidation`)
```typescript
// From HealthAnalyticsValidation.ts:47-98
export const HealthAnalyticsQueryValidation = z.object({
  // ... similar structure with optional fields
}).transform((data) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  return {
    start_date: data.start_date || thirtyDaysAgo,
    end_date: data.end_date || now,
    type_ids: data.type_ids,
    aggregation: data.aggregation
  };
});
```

**Business Rules**:
- **Default Date Range**: Last 30 days when no dates specified
- **Intelligent Defaults**: Sensible defaults that don't require API parameter knowledge
- **URL Parameter Handling**: Special handling for comma-separated type_ids in URLs
- **Transform Pipeline**: Converts optional parameters to concrete values

## Cross-Validation Business Rules

### Multi-Field Dependencies

#### 1. Date Range Consistency
- **Rule**: `start_date <= end_date` across all schemas
- **Application**: Health records, analytics queries, goal date validation
- **Business Impact**: Prevents logical impossibilities in date-based queries and data entry

#### 2. Unit-Value Relationships
- **Rule**: Values must be reasonable for their specified units
- **Examples**: Percentages ≤ 100%, hours ≤ 24, minutes ≤ 1440
- **Business Impact**: Ensures data quality and prevents measurement errors

#### 3. Type ID Referential Integrity
- **Rule**: All type_id references must point to valid health types
- **Application**: Records, goals, reminders, analytics
- **Business Impact**: Maintains database consistency and prevents orphaned records

### Performance-Based Rules

#### 1. Pagination Limits
- **Health Records**: Max 100 records per query, default 20
- **Bulk Operations**: Max 50 records per batch
- **Business Rationale**: Balances usability with system performance

#### 2. Analytics Constraints
- **Date Range**: Maximum 365 days
- **Type IDs**: Maximum 10 per query
- **Caching**: 5-minute TTL for analytics results
- **Business Rationale**: Prevents resource exhaustion while supporting real analytical needs

## Enum Business Meanings

### Health Type Classifications

#### Cardiovascular Metrics
- `blood_pressure_systolic`: Upper blood pressure reading (mmHg)
- `blood_pressure_diastolic`: Lower blood pressure reading (mmHg)
- `heart_rate`: Heart beats per minute (bpm)
- `oxygen_saturation`: Blood oxygen percentage (%)

#### Physical Activity Metrics
- `steps`: Daily step count (steps)
- `exercise_minutes`: Daily exercise duration (minutes)

#### Body Composition Metrics
- `weight`: Body weight (kg/lbs)
- `temperature`: Body temperature (°C/°F)

#### Metabolic Metrics
- `blood_sugar`: Blood glucose level (mg/dL/mmol/L)
- `calories`: Caloric intake (kcal)
- `water_intake`: Daily water consumption (ml/oz)

#### Lifestyle Metrics
- `sleep_hours`: Daily sleep duration (hours)

### Goal Status Meanings

#### Active Goals (`active`)
- **Business State**: Currently being pursued
- **User Interaction**: Visible in progress tracking
- **System Behavior**: Included in progress calculations and notifications

#### Completed Goals (`completed`)
- **Business State**: Target achieved successfully
- **User Interaction**: Shown in achievement history
- **System Behavior**: Excluded from active progress tracking

#### Paused Goals (`paused`)
- **Business State**: Temporarily suspended
- **User Interaction**: Can be reactivated
- **System Behavior**: Preserved but not actively tracked

## Value Range Business Logic

### Safety-First Design Philosophy

All value ranges are designed with patient safety and data quality as primary concerns:

#### 1. Wide but Safe Ranges
- **Weight**: 20-500 kg/lbs accommodates extreme cases without allowing impossible values
- **Blood Pressure**: 70-250 systolic, 40-150 diastolic covers medical emergencies to hypertensive crises
- **Heart Rate**: 30-220 bpm includes bradycardia to maximum exercise heart rates

#### 2. Activity-Based Realistic Limits
- **Steps**: 0-100,000 daily allows for extreme athletes while preventing data entry errors
- **Exercise**: 0-1440 minutes daily (up to 24 hours) accommodates extreme endurance events
- **Sleep**: 0-24 hours allows for various sleep disorders and patterns

#### 3. Physiological Boundaries
- **Temperature**: 90-110°F (32-43°C) covers hypothermia to dangerous fever levels
- **Oxygen Saturation**: 70-100% includes severe hypoxemia to normal levels
- **Blood Sugar**: 20-600 mg/dL covers severe hypoglycemia to diabetic emergencies

### Goal Target Reasonableness

Goal ranges are more restrictive than record ranges to encourage achievable targets:

#### 1. Motivational Psychology
- **Weight Goals**: 30-300 kg encourages realistic weight management
- **Activity Goals**: 1,000-50,000 steps promotes achievable fitness improvements
- **Health Goals**: Ranges designed to be challenging but attainable

#### 2. Clinical Guidelines Integration
- **Blood Pressure Goals**: 50-200 mmHg aligns with clinical target ranges
- **Heart Rate Goals**: 30-300 bpm covers resting to exercise targets
- **BMI Goals**: 10-50 includes full healthy to intervention ranges

## Temporal Business Constraints

### Historical Data Rules

#### 1. No Future Health Records
```typescript
recorded_at: z.coerce.date().refine(date => date <= new Date());
```
- **Business Rule**: Health data can only be recorded for past or present
- **Rationale**: Prevents speculative or incorrect future data entry
- **Exception Handling**: Current timestamp allowed for real-time entry

#### 2. Historical Data Limits
```typescript
.refine((date) => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return date >= oneYearAgo;
})
```
- **Business Rule**: Health records limited to past year
- **Rationale**: Maintains data relevance and system performance
- **Clinical Justification**: Recent data more relevant for health tracking

### Goal-Oriented Future Dates

#### 1. Future Goal Requirements
```typescript
target_date: z.coerce.date().refine(date => date > new Date());
```
- **Business Rule**: Goal dates must be in the future
- **Rationale**: Goals are aspirational and forward-looking
- **Behavioral Design**: Encourages planning and commitment

#### 2. Progress Tracking Temporal Logic
```typescript
progress_date: z.coerce.date().refine(date => date <= new Date());
```
- **Business Rule**: Progress can only be recorded for past/present
- **Rationale**: Progress tracking must be based on actual achievements
- **Data Integrity**: Prevents speculative progress entries

### Analytics Time Boundaries

#### 1. Performance-Based Date Limits
- **Maximum Range**: 365 days prevents performance degradation
- **Default Range**: 30 days provides meaningful insights without overload
- **Historical Focus**: Start dates cannot be in future

#### 2. Caching Strategy Temporal Rules
- **Cache TTL**: 5 minutes balances freshness with performance
- **Cache Keys**: Include temporal parameters for accurate cache hits
- **Invalidation**: Time-based cache expiration ensures data currency

---

*This document represents a comprehensive extraction of business rules from validation schemas as of the current codebase state. Rules should be reviewed and updated as the health management system evolves.*
