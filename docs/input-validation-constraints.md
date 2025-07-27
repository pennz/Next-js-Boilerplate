# Input Validation Constraints & Error Messages

This document provides a comprehensive catalog of all input validation constraints and their associated error messages across the health management system. Analysis is based on Zod validation schemas in `src/validations/`.

## Table of Contents

1. [Field-Level Validation Constraints](#field-level-validation-constraints)
2. [Error Message Mapping](#error-message-mapping)
3. [Custom Validation Logic](#custom-validation-logic)
4. [Cross-Field Validation Rules](#cross-field-validation-rules)
5. [Conditional Validation Logic](#conditional-validation-logic)
6. [Performance-Related Constraints](#performance-related-constraints)
7. [Security Validation Rules](#security-validation-rules)
8. [Format Validation Patterns](#format-validation-patterns)
9. [Unit and Value Consistency Rules](#unit-and-value-consistency-rules)

## Field-Level Validation Constraints

### Health Record Validation (`HealthRecordValidation.ts`)

#### Type ID Field (`type_id`)
```typescript
// From HealthRecordValidation.ts:67-69
type_id: z.coerce.number().int().positive({
  message: 'Health type ID must be a positive integer',
});
```

**Constraints**:
- **Data Type**: Must be coercible to number
- **Integer Requirement**: Must be a whole number (no decimals)
- **Positivity**: Must be greater than 0
- **Error Message**: `"Health type ID must be a positive integer"`

**Business Purpose**: Ensures referential integrity with health type lookup table and prevents invalid type references.

#### Value Field (`value`)
```typescript
// From HealthRecordValidation.ts:70-74
value: z.coerce.number().positive({
  message: 'Value must be a positive number',
}).refine(value => value <= 10000, {
  message: 'Value exceeds maximum allowed range',
});
```

**Constraints**:
- **Data Type**: Must be coercible to number
- **Positivity**: Must be greater than 0
- **Upper Limit**: Must not exceed 10,000
- **Error Messages**:
  - `"Value must be a positive number"`
  - `"Value exceeds maximum allowed range"`

**Business Purpose**: Prevents negative health values and protects against data entry errors or system abuse.

#### Unit Field (`unit`)
```typescript
// From HealthRecordValidation.ts:20-41
const unitValidation = z.string().min(1).max(20).refine((unit) => {
  const validUnits = ['kg', 'lbs', 'mmHg', 'bpm', 'steps', 'hours', 'ml', 'oz', 'kcal', 'minutes', 'mg/dL', 'mmol/L', '°C', '°F', '%'];
  return validUnits.includes(unit);
}, {
  message: 'Invalid unit. Must be one of: kg, lbs, mmHg, bpm, steps, hours, ml, oz, kcal, minutes, mg/dL, mmol/L, °C, °F, %',
});
```

**Constraints**:
- **Data Type**: Must be string
- **Length**: 1-20 characters
- **Enumeration**: Must match one of 15 predefined units
- **Error Messages**:
  - Implicit: `"String must contain at least 1 character(s)"` (min validation)
  - Implicit: `"String must contain at most 20 character(s)"` (max validation)
  - Custom: `"Invalid unit. Must be one of: kg, lbs, mmHg, bpm, steps, hours, ml, oz, kcal, minutes, mg/dL, mmol/L, °C, °F, %"`

**Business Purpose**: Ensures unit standardization and prevents measurement inconsistencies.

#### Recorded At Field (`recorded_at`)
```typescript
// From HealthRecordValidation.ts:76-87
recorded_at: z.coerce.date().refine((date) => {
  const now = new Date();
  return date <= now;
}, {
  message: 'Recorded date cannot be in the future',
}).refine((date) => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return date >= oneYearAgo;
}, {
  message: 'Recorded date cannot be more than one year ago',
});
```

**Constraints**:
- **Data Type**: Must be coercible to Date object
- **Future Restriction**: Cannot be in the future
- **Historical Limit**: Cannot be more than one year ago
- **Error Messages**:
  - `"Recorded date cannot be in the future"`
  - `"Recorded date cannot be more than one year ago"`

**Business Purpose**: Maintains data temporal integrity and prevents speculative or overly stale data entry.

### Health Goal Validation (`HealthGoalValidation.ts`)

#### Type ID Field (`type_id`)
```typescript
// From HealthGoalValidation.ts:8
type_id: z.coerce.number().int().positive('Health type ID must be a positive integer');
```

**Constraints**:
- **Data Type**: Must be coercible to number
- **Integer Requirement**: Must be whole number
- **Positivity**: Must be greater than 0
- **Error Message**: `"Health type ID must be a positive integer"`

#### Target Value Field (`target_value`)
```typescript
// From HealthGoalValidation.ts:9
target_value: z.coerce.number().positive('Target value must be a positive number');
```

**Constraints**:
- **Data Type**: Must be coercible to number
- **Positivity**: Must be greater than 0
- **Error Message**: `"Target value must be a positive number"`

#### Target Date Field (`target_date`)
```typescript
// From HealthGoalValidation.ts:10-13
target_date: z.coerce.date().refine(
  date => date > new Date(),
  'Target date must be in the future',
);
```

**Constraints**:
- **Data Type**: Must be coercible to Date object
- **Future Requirement**: Must be in the future
- **Error Message**: `"Target date must be in the future"`

#### Status Field (`status`)
```typescript
// From HealthGoalValidation.ts:4,14
export const GoalStatus = z.enum(['active', 'completed', 'paused']);
status: GoalStatus.default('active');
```

**Constraints**:
- **Enumeration**: Must be one of 'active', 'completed', 'paused'
- **Default Value**: 'active' when not specified
- **Error Message**: Implicit enum validation error

### Health Reminder Validation (`HealthReminderValidation.ts`)

#### Type ID Field (`type_id`)
```typescript
// From HealthReminderValidation.ts:11-13
type_id: z.coerce.number().int().positive({
  message: 'Health type ID must be a positive integer',
});
```

**Constraints**:
- **Data Type**: Must be coercible to number
- **Integer Requirement**: Must be whole number
- **Positivity**: Must be greater than 0
- **Error Message**: `"Health type ID must be a positive integer"`

#### Cron Expression Field (`cron_expr`)
```typescript
// From HealthReminderValidation.ts:14-18
cron_expr: z.string().min(1, {
  message: 'Cron expression is required',
}).refine(value => cronRegex.test(value), {
  message: 'Invalid cron expression format. Use standard cron syntax (e.g., "0 9 * * *") or named schedules (e.g., "@daily")',
});
```

**Constraints**:
- **Data Type**: Must be string
- **Length**: At least 1 character
- **Format**: Must match complex cron regex pattern
- **Error Messages**:
  - `"Cron expression is required"`
  - `"Invalid cron expression format. Use standard cron syntax (e.g., "0 9 * * *") or named schedules (e.g., "@daily")"`

#### Message Field (`message`)
```typescript
// From HealthReminderValidation.ts:19-23
message: z.string().min(1, {
  message: 'Reminder message is required',
}).max(500, {
  message: 'Reminder message must be 500 characters or less',
}).trim();
```

**Constraints**:
- **Data Type**: Must be string
- **Minimum Length**: At least 1 character
- **Maximum Length**: 500 characters or less
- **Transformation**: Whitespace trimmed
- **Error Messages**:
  - `"Reminder message is required"`
  - `"Reminder message must be 500 characters or less"`

#### Active Field (`active`)
```typescript
// From HealthReminderValidation.ts:24-27
active: z.boolean({
  required_error: 'Active status is required',
  invalid_type_error: 'Active status must be a boolean',
});
```

**Constraints**:
- **Data Type**: Must be boolean
- **Required**: Cannot be undefined
- **Error Messages**:
  - `"Active status is required"` (when missing)
  - `"Active status must be a boolean"` (when wrong type)

### Health Analytics Validation (`HealthAnalyticsValidation.ts`)

#### Start Date Field (`start_date`)
```typescript
// From HealthAnalyticsValidation.ts:10-12
start_date: z.string()
  .datetime({ message: 'start_date must be a valid ISO datetime string' })
  .transform(val => new Date(val));
```

**Constraints**:
- **Data Type**: Must be string initially
- **Format**: Must be valid ISO datetime string
- **Transformation**: Converted to Date object
- **Error Message**: `"start_date must be a valid ISO datetime string"`

#### End Date Field (`end_date`)
```typescript
// From HealthAnalyticsValidation.ts:14-16
end_date: z.string()
  .datetime({ message: 'end_date must be a valid ISO datetime string' })
  .transform(val => new Date(val));
```

**Constraints**:
- **Data Type**: Must be string initially
- **Format**: Must be valid ISO datetime string
- **Transformation**: Converted to Date object
- **Error Message**: `"end_date must be a valid ISO datetime string"`

#### Type IDs Field (`type_ids`)
```typescript
// From HealthAnalyticsValidation.ts:18-21
type_ids: z.array(z.number().int().positive({ message: 'type_id must be a positive integer' }))
  .min(1, { message: 'At least one type_id must be provided' })
  .max(10, { message: 'Maximum 10 type_ids allowed' })
  .optional();
```

**Constraints**:
- **Data Type**: Must be array of numbers
- **Element Validation**: Each number must be positive integer
- **Array Size**: 1-10 elements when provided
- **Optional**: Field can be omitted
- **Error Messages**:
  - `"type_id must be a positive integer"` (element validation)
  - `"At least one type_id must be provided"` (minimum array size)
  - `"Maximum 10 type_ids allowed"` (maximum array size)

## Error Message Mapping

### Standard Zod Error Messages

#### Type Coercion Errors
- **Number Coercion**: `"Expected number, received [actual_type]"`
- **Date Coercion**: `"Invalid date"`
- **Boolean Coercion**: `"Expected boolean, received [actual_type]"`

#### String Validation Errors
- **Minimum Length**: `"String must contain at least [min] character(s)"`
- **Maximum Length**: `"String must contain at most [max] character(s)"`
- **Datetime Format**: `"Invalid datetime"`

#### Number Validation Errors
- **Integer Requirement**: `"Expected integer, received float"`
- **Positive Constraint**: `"Number must be positive"`
- **Minimum Value**: `"Number must be greater than or equal to [min]"`
- **Maximum Value**: `"Number must be less than or equal to [max]"`

#### Array Validation Errors
- **Minimum Items**: `"Array must contain at least [min] element(s)"`
- **Maximum Items**: `"Array must contain at most [max] element(s)"`

### Custom Error Messages

#### Business Logic Errors
```typescript
// Health Record Cross-Validation
'Value is not reasonable for the specified unit';

// Date Range Validation
'Start date must be before or equal to end date';
'end_date must be after start_date';

// Performance Constraints
'Cannot process more than 50 records at once';
'Date range cannot exceed 365 days';
'Maximum 10 type_ids allowed';

// Temporal Constraints
'Recorded date cannot be in the future';
'Recorded date cannot be more than one year ago';
'Target date must be in the future';
'start_date cannot be in the future';
'Progress date cannot be in the future';
```

#### Domain-Specific Errors
```typescript
// Health-Specific Validation
'Health type ID must be a positive integer';
'Target value is outside reasonable range for this health metric type';
'Invalid unit. Must be one of: kg, lbs, mmHg, bpm, steps, hours, ml, oz, kcal, minutes, mg/dL, mmol/L, °C, °F, %';

// Goal Management
'At least one field must be provided for update';

// Reminder Management
'Cron expression is required';
'Invalid cron expression format. Use standard cron syntax (e.g., "0 9 * * *") or named schedules (e.g., "@daily")';
'Reminder message must be 500 characters or less';
'Active status is required';
'Active status must be a boolean';
```

## Custom Validation Logic

### Complex Cross-Field Validation

#### 1. Unit-Value Consistency Check
```typescript
// From HealthRecordValidation.ts:88-108
.refine((data) => {
  if (data.value < 0) return false;
  if (data.unit === '%' && data.value > 100) return false;
  if (data.unit === 'hours' && data.value > 24) return false;
  if (data.unit === 'minutes' && data.value > 1440) return false;
  return true;
}, {
  message: 'Value is not reasonable for the specified unit',
});
```

**Logic Purpose**: Ensures values are logically consistent with their units
**Error Context**: Single error message for multiple logical failures
**Business Impact**: Prevents impossible measurements like 150% oxygen saturation

#### 2. Goal Target Reasonableness Check
```typescript
// From HealthGoalValidation.ts:15-39
.refine((data) => {
  const reasonableRanges: Record<number, { min: number; max: number }> = {
    1: { min: 30, max: 300 },    // Weight (kg)
    2: { min: 50, max: 200 },    // Systolic BP (mmHg)
    3: { min: 1000, max: 50000 }, // Daily steps
    4: { min: 10, max: 50 },     // BMI
    5: { min: 30, max: 300 },    // Heart rate (bpm)
  };

  const range = reasonableRanges[data.type_id];
  if (range) {
    return data.target_value >= range.min && data.target_value <= range.max;
  }
  return data.target_value > 0;
}, {
  message: 'Target value is outside reasonable range for this health metric type',
  path: ['target_value'],
});
```

**Logic Purpose**: Validates goals are achievable and safe
**Error Path**: Specifically targets `target_value` field
**Fallback Logic**: Allows any positive value for unknown health types

#### 3. Update Field Requirement Check
```typescript
// From HealthGoalValidation.ts:49-57
.refine((data) => {
  return data.target_value !== undefined ||
         data.target_date !== undefined ||
         data.status !== undefined;
}, {
  message: 'At least one field must be provided for update',
});
```

**Logic Purpose**: Ensures update operations actually change something
**Business Rule**: Prevents empty update requests
**Error Context**: Applied to entire update object

### Temporal Logic Validation

#### 1. Date Range Validation
```typescript
// Multiple schemas use this pattern
.refine((data) => {
  if (data.start_date && data.end_date) {
    return data.start_date <= data.end_date;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
});
```

**Conditional Logic**: Only validates when both dates are present
**Graceful Handling**: Returns true when dates are missing
**Business Logic**: Prevents impossible date ranges

#### 2. Performance-Based Date Range Limits
```typescript
// From HealthAnalyticsValidation.ts:30-37
.refine((data) => {
  const diffInMs = data.end_date.getTime() - data.start_date.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return diffInDays <= MAX_DATE_RANGE_DAYS;
}, {
  message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
  path: ['end_date'],
});
```

**Calculation Logic**: Computes date difference in days
**Performance Rule**: Enforces maximum range for system protection
**Dynamic Message**: Includes actual limit in error message

## Cross-Field Validation Rules

### Date Consistency Rules

#### 1. Start/End Date Logic
**Applied In**: Health records, analytics queries, goal management
**Pattern**:
```typescript
.refine((data) => {
  if (data.start_date && data.end_date) {
    return data.start_date <= data.end_date;
  }
  return true;
});
```
**Error Handling**: Conditional validation only when both fields present

#### 2. Future Date Restrictions
**Applied In**: Health records (recorded_at), analytics (start_date)
**Pattern**:
```typescript
.refine((date) => date <= new Date(), {
  message: '[field] cannot be in the future'
});
```
**Temporal Rule**: Prevents future-dated entries for historical data

#### 3. Historical Data Limits
**Applied In**: Health records
**Pattern**:
```typescript
.refine((date) => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return date >= oneYearAgo;
});
```
**Data Quality Rule**: Maintains relevance by limiting historical range

### Value-Unit Relationship Rules

#### 1. Percentage Limits
```typescript
if (data.unit === '%' && data.value > 100) {
  return false;
}
```
**Logical Rule**: Percentages cannot exceed 100%
**Health Context**: Prevents impossible oxygen saturation readings

#### 2. Time-Based Limits
```typescript
if (data.unit === 'hours' && data.value > 24) {
  return false;
}
if (data.unit === 'minutes' && data.value > 1440) {
  return false;
}
```
**Daily Limits**: Hours ≤ 24, minutes ≤ 1440 (24 hours × 60 minutes)
**Context Awareness**: Validation understands unit meanings

### Type Reference Integrity

#### 1. Positive Integer IDs
**Applied In**: All schemas with type_id fields
**Pattern**:
```typescript
type_id: z.coerce.number().int().positive({
  message: 'Health type ID must be a positive integer',
});
```
**Database Rule**: Ensures valid foreign key references

## Conditional Validation Logic

### Optional Field Handling

#### 1. Query Parameter Validation
```typescript
// From HealthAnalyticsQueryValidation.ts
export const HealthAnalyticsQueryValidation = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  type_ids: z.array(z.number().int().positive()).optional(),
  aggregation: AggregationOption.optional().default('daily'),
});
```
**Flexibility Rule**: All query parameters are optional
**Default Handling**: Sensible defaults provided where needed

#### 2. Update Operation Logic
```typescript
// From HealthGoalUpdateValidation.ts
export const HealthGoalUpdateValidation = z.object({
  target_value: z.coerce.number().positive().optional(),
  target_date: z.coerce.date().refine(date => date > new Date()).optional(),
  status: GoalStatus.optional(),
}).refine(/* at least one field required */);
```
**Partial Update Support**: Individual fields can be updated
**Business Rule**: At least one field must be provided

### Context-Dependent Validation

#### 1. Health Type-Specific Ranges
```typescript
// Goal validation varies by health type
const reasonableRanges: Record<number, { min: number; max: number }> = {
  1: { min: 30, max: 300 }, // Weight
  2: { min: 50, max: 200 }, // Blood pressure
  // ... type-specific ranges
};

const range = reasonableRanges[data.type_id];
if (range) {
  return data.target_value >= range.min && data.target_value <= range.max;
}
return data.target_value > 0; // Fallback for unknown types
```
**Adaptive Logic**: Validation changes based on health type
**Graceful Fallback**: Unknown types get basic positive validation

#### 2. Unit-Aware Validation
```typescript
// Different logic for different units
if (data.unit === '%' && data.value > 100) {
  return false;
}
if (data.unit === 'hours' && data.value > 24) {
  return false;
}
if (data.unit === 'minutes' && data.value > 1440) {
  return false;
}
```
**Unit Intelligence**: Validation understands unit semantics
**Multi-Unit Support**: Handles various measurement systems

## Performance-Related Constraints

### Query Limits

#### 1. Pagination Controls
```typescript
// From HealthRecordQueryValidation.ts:122-123
limit: z.coerce.number().int().min(1).max(100).default(20),
offset: z.coerce.number().int().min(0).default(0),
```
**Performance Rule**: Maximum 100 records per query
**Usability Balance**: Default 20 records balances performance and UX
**Error Messages**: Standard Zod min/max messages

#### 2. Bulk Operation Limits
```typescript
// From HealthRecordBulkValidation.ts:135-137
records: z.array(HealthRecordValidation).min(1).max(50, {
  message: 'Cannot process more than 50 records at once',
});
```
**Batch Size Control**: Maximum 50 records per bulk operation
**Custom Message**: Clear explanation of limit
**System Protection**: Prevents overwhelming database

#### 3. Analytics Query Constraints
```typescript
// From HealthAnalyticsValidation.ts:6-7,30-37
const MAX_DATE_RANGE_DAYS = 365;

.refine((data) => {
  const diffInDays = (data.end_date.getTime() - data.start_date.getTime()) / (1000 * 60 * 60 * 24);
  return diffInDays <= MAX_DATE_RANGE_DAYS;
}, {
  message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
});
```
**Range Limitation**: Maximum 365-day analytics queries
**Performance Protection**: Prevents expensive long-range queries
**Dynamic Messaging**: Error includes actual limit value

### Array Size Constraints

#### 1. Type ID Arrays
```typescript
// From HealthAnalyticsValidation.ts:18-21
type_ids: z.array(z.number().int().positive())
  .min(1, { message: 'At least one type_id must be provided' })
  .max(10, { message: 'Maximum 10 type_ids allowed' });
```
**Query Complexity Control**: Limits multi-type analytics queries
**Minimum Requirement**: At least one type required when array provided
**Maximum Limit**: Prevents overly complex queries

## Security Validation Rules

### Input Sanitization

#### 1. String Trimming
```typescript
// From HealthReminderValidation.ts:19-23
message: z.string().min(1).max(500).trim();
```
**Sanitization Rule**: Automatic whitespace trimming
**Security Benefit**: Prevents padding-based attacks
**Data Quality**: Ensures clean message content

#### 2. Length Restrictions
```typescript
// Various string fields have length limits
unit: z.string().min(1).max(20); // Unit names
message: z.string().min(1).max(500); // Reminder messages
```
**Buffer Overflow Prevention**: Limits prevent excessive input
**Storage Efficiency**: Reasonable limits for database columns
**UX Guidelines**: Limits guide user expectations

### Type Safety

#### 1. Strict Type Coercion
```typescript
// All numeric IDs use consistent pattern
type_id: z.coerce.number().int().positive();
```
**Type Safety**: Coercion with validation prevents type confusion
**Integer Enforcement**: Prevents decimal ID values
**Positive Constraint**: Prevents negative or zero IDs

#### 2. Enum Validation
```typescript
// From HealthGoalValidation.ts:4
export const GoalStatus = z.enum(['active', 'completed', 'paused']);
```
**Value Restriction**: Only predefined values allowed
**Injection Prevention**: Prevents arbitrary string injection
**Business Logic**: Enforces valid state transitions

### Data Integrity Rules

#### 1. Required Field Enforcement
```typescript
// From HealthReminderValidation.ts:24-27
active: z.boolean({
  required_error: 'Active status is required',
  invalid_type_error: 'Active status must be a boolean',
});
```
**Explicit Requirements**: Clear required field messaging
**Type Enforcement**: Strict boolean requirement
**Error Specificity**: Different messages for missing vs. wrong type

#### 2. Referential Integrity Hints
```typescript
// All type_id fields enforce positive integers
type_id: z.coerce.number().int().positive({
  message: 'Health type ID must be a positive integer',
});
```
**Foreign Key Hints**: Validation suggests valid key structure
**Database Protection**: Prevents invalid reference attempts
**Consistent Messaging**: Same validation across all type references

## Format Validation Patterns

### Regular Expression Patterns

#### 1. Cron Expression Validation
```typescript
// From HealthReminderValidation.ts:3-8
const cronRegex = /^((((\d+,)+\d+|(\d+([/\-#])\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5})|(@(annually|yearly|monthly|weekly|daily|hourly|reboot))|(@every (\d+(ns|us|µs|ms|[smh]))+)$/;

cron_expr: z.string().min(1).refine(value => cronRegex.test(value), {
  message: 'Invalid cron expression format. Use standard cron syntax (e.g., "0 9 * * *") or named schedules (e.g., "@daily")',
});
```

**Pattern Support**:
- **Standard Cron**: 5-field cron expressions (minute hour day month dayofweek)
- **Special Characters**: *, /, ,, -, ?, L, #
- **Named Schedules**: @yearly, @annually, @monthly, @weekly, @daily, @hourly, @reboot
- **@every Syntax**: @every with time units (ns, us, µs, ms, s, m, h)

**Error Guidance**: Provides examples of valid formats in error message

### ISO DateTime Validation

#### 1. Strict DateTime Format
```typescript
// From HealthAnalyticsValidation.ts:10-12
start_date: z.string()
  .datetime({ message: 'start_date must be a valid ISO datetime string' })
  .transform(val => new Date(val));
```

**Format Requirements**:
- **ISO 8601 Compliance**: Strict datetime string format
- **Automatic Transformation**: String converted to Date object
- **Error Specificity**: Clear format requirement in error message

**Usage Pattern**: Consistent across all date fields in analytics

### Array Format Handling

#### 1. Query Parameter Array Processing
```typescript
// From HealthAnalyticsQueryValidation.ts:58-64
type_ids: z.union([
  z.string().transform(val => val.split(',').map(id => Number.parseInt(id, 10))),
  z.array(z.string().transform(val => Number.parseInt(val, 10))),
]).pipe(
  z.array(z.number().int().positive())
    .max(10, { message: 'Maximum 10 type_ids allowed' }),
);
```

**Format Flexibility**:
- **Comma-Separated Strings**: "1,2,3" format for URL parameters
- **Array Format**: Native array format for JSON payloads
- **Transformation Pipeline**: String conversion to integer arrays
- **Validation Pipeline**: Post-transformation validation

## Unit and Value Consistency Rules

### Unit-Specific Value Validation

#### 1. Percentage Unit Logic
```typescript
// From HealthRecordValidation.ts:95-97
if (data.unit === '%' && data.value > 100) {
  return false;
}
```
**Logical Constraint**: Percentages cannot exceed 100%
**Health Context**: Applies to oxygen saturation measurements
**Error Message**: Generic "Value is not reasonable for the specified unit"

#### 2. Time Unit Validation
```typescript
// From HealthRecordValidation.ts:98-103
if (data.unit === 'hours' && data.value > 24) {
  return false;
}
if (data.unit === 'minutes' && data.value > 1440) {
  return false;
}
```
**Daily Limits**:
- Hours: Maximum 24 (one day)
- Minutes: Maximum 1440 (24 hours × 60 minutes)
**Context Understanding**: Validation understands time unit meanings

### Multi-Unit System Support

#### 1. Imperial and Metric Units
```typescript
// From HealthRecordValidation.ts:21-36
const validUnits = [
  'kg',
  'lbs', // Weight: metric/imperial
  'ml',
  'oz', // Volume: metric/imperial
  '°C',
  '°F', // Temperature: metric/imperial
  'mg/dL',
  'mmol/L', // Blood sugar: different medical standards
  // ... other units
];
```
**Global Support**: Both metric and imperial systems
**Medical Standards**: Different regional medical measurement standards
**Consistency Rule**: Units must match expected types for health metrics

#### 2. Health-Specific Units
```typescript
// Specialized health measurement units
'mmHg',     // Blood pressure (millimeters of mercury)
'bpm',      // Heart rate (beats per minute)
'steps',    // Activity tracking
'kcal',     // Nutritional energy
'%',        // Oxygen saturation, body fat percentage
```
**Domain Expertise**: Units reflect medical and fitness standards
**Precision Requirements**: Units chosen for appropriate measurement precision
**International Standards**: Units follow recognized medical conventions

### Value Range Coordination

#### 1. Type-Aware Range Validation
```typescript
// From HealthRecordValidation.ts:44-58
const ranges: Record<string, { min: number; max: number }> = {
  weight: { min: 20, max: 500 }, // Accommodates both kg and lbs
  blood_pressure_systolic: { min: 70, max: 250 }, // mmHg only
  heart_rate: { min: 30, max: 220 }, // bpm only
  // ... other ranges
};
```
**Unit-Range Correlation**: Ranges designed to work with expected units
**Multi-Unit Ranges**: Some ranges accommodate multiple unit systems
**Safety Boundaries**: Ranges prevent medically dangerous values

#### 2. Cross-Reference Validation
**Pattern**: Value ranges coordinate with unit restrictions
**Example**: Temperature range 90-110 works for both °F (90-110°F) and °C (would need conversion)
**Business Rule**: Validation ensures value-unit combinations make medical sense

---

*This document provides comprehensive validation constraint analysis based on current validation schemas. Constraints should be reviewed as validation logic evolves.*
