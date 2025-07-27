# API Request/Response Schemas Documentation

This document provides comprehensive documentation of all API request and response schemas used in the Health Management API system. It covers data structures, validation rules, type mappings, and schema patterns for complete API integration reference.

## Table of Contents

1. [Request Schema Analysis](#request-schema-analysis)
2. [Response Schema Documentation](#response-schema-documentation)
3. [Data Type Mapping](#data-type-mapping)
4. [Validation Rules Integration](#validation-rules-integration)
5. [Query Parameter Patterns](#query-parameter-patterns)
6. [Request Body Structures](#request-body-structures)
7. [Response Data Structures](#response-data-structures)
8. [Error Response Schemas](#error-response-schemas)
9. [Pagination Schema Patterns](#pagination-schema-patterns)
10. [OpenAPI Schema Alignment](#openapi-schema-alignment)

## Request Schema Analysis

### Health Records Request Schemas

#### Query Parameters Schema
```typescript
// HealthRecordQueryValidation
{
  type_id?: number;        // Optional health type filter (positive integer)
  start_date?: Date;       // Optional date range start (coerced to Date)
  end_date?: Date;         // Optional date range end (coerced to Date)
  limit: number;           // Results limit (1-100, default: 20)
  offset: number;          // Results offset (min: 0, default: 0)
}
```

**Validation Rules:**
- `type_id`: Must be positive integer if provided
- `start_date`/`end_date`: Must be valid dates, start_date ≤ end_date
- `limit`: Range 1-100, defaults to 20
- `offset`: Minimum 0, defaults to 0

#### Request Body Schema (POST/PUT)
```typescript
// HealthRecordValidation
{
  type_id: number; // Required positive integer
  value: number; // Required positive number (max: 10000)
  unit: string; // Required valid unit (1-20 chars)
  recorded_at: Date; // Required date (not future, max 1 year ago)
}
```

**Unit Validation:**
Valid units: `kg`, `lbs`, `mmHg`, `bpm`, `steps`, `hours`, `ml`, `oz`, `kcal`, `minutes`, `mg/dL`, `mmol/L`, `°C`, `°F`, `%`

**Business Logic Validation:**
- Percentage values (%) cannot exceed 100
- Hours cannot exceed 24
- Minutes cannot exceed 1440 (24 hours)

#### Update Schema (PUT)
```typescript
// HealthRecordUpdateValidation
{
  id: number;              // Required positive integer (path parameter)
  type_id?: number;        // Optional positive integer
  value?: number;          // Optional positive number
  unit?: string;           // Optional valid unit
  recorded_at?: Date;      // Optional date
}
```

### Health Goals Request Schemas

#### Request Body Schema (POST)
```typescript
// HealthGoalValidation
{
  type_id: number; // Required positive integer
  target_value: number; // Required positive number
  target_date: Date; // Required future date
  status: 'active' | 'completed' | 'paused'; // Default: 'active'
}
```

**Target Value Ranges:**
- Weight (type_id 1): 30-300 kg
- Systolic BP (type_id 2): 50-200 mmHg
- Daily Steps (type_id 3): 1000-50000 steps
- BMI (type_id 4): 10-50
- Heart Rate (type_id 5): 30-300 bpm

#### Update Schema (PATCH)
```typescript
// HealthGoalUpdateValidation
{
  target_value?: number;   // Optional positive number
  target_date?: Date;      // Optional future date
  status?: 'active' | 'completed' | 'paused';
}
```

**Validation:** At least one field must be provided for update.

### Health Reminders Request Schemas

#### Request Body Schema (POST)
```typescript
// HealthReminderValidation
{
  type_id: number; // Required positive integer
  cron_expr: string; // Required valid cron expression
  message: string; // Required (1-500 chars, trimmed)
  active: boolean; // Required boolean
}
```

**Cron Expression Validation:**
- Standard 5-field format: `minute hour day month dayofweek`
- Named schedules: `@yearly`, `@monthly`, `@weekly`, `@daily`, `@hourly`
- @every syntax: `@every 1h`, `@every 30m`
- Special characters: `*`, `/`, `,`, `-`, `?`, `L`, `#`

#### Update Schema (PATCH)
```typescript
// HealthReminderUpdateValidation
{
  type_id?: number;        // Optional positive integer
  cron_expr?: string;      // Optional valid cron expression
  message?: string;        // Optional (1-500 chars)
  active?: boolean;        // Optional boolean
}
```

#### Query Parameters Schema
```typescript
// HealthReminderQueryValidation
{
  active?: boolean;        // Optional active status filter
  type_id?: number;        // Optional health type filter
}
```

### Health Analytics Request Schemas

#### Query Parameters Schema
```typescript
// HealthAnalyticsQueryValidation
{
  start_date?: string;     // Optional ISO datetime (defaults to 30 days ago)
  end_date?: string;       // Optional ISO datetime (defaults to now)
  type_ids?: number[];     // Optional array (max 10 items)
  aggregation: 'daily' | 'weekly' | 'monthly'; // Default: 'daily'
}
```

**Validation Rules:**
- Date range cannot exceed 365 days
- start_date cannot be in the future
- end_date must be after start_date
- type_ids limited to 10 items maximum
- Dates transformed from ISO strings to Date objects

### Counter Request Schemas

#### Request Body Schema (POST)
```typescript
// CounterValidation
{
  increment: number; // Required (1-3 range)
}
```

## Response Schema Documentation

### Success Response Structures

#### Health Records Response
```typescript
{
  data: HealthRecord[];    // Array of health record objects
  pagination: {
    total: number;         // Total records count
    limit: number;         // Current page size
    offset: number;        // Current offset
    has_more: boolean;     // More records available
  }
}
```

#### Single Health Record Response
```typescript
{
  id: number; // Unique record identifier
  user_id: string; // Clerk user ID
  type_id: number; // Health type identifier
  type: HealthType; // Nested health type object
  value: number; // Measured value
  unit: string; // Measurement unit
  recorded_at: string; // ISO datetime string
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}
```

#### Health Goals Response
```typescript
{
  data: HealthGoal[];      // Array of goal objects
}
```

#### Single Health Goal Response
```typescript
{
  id: number;              // Unique goal identifier
  user_id: string;         // Clerk user ID
  type_id: number;         // Health type identifier
  type: HealthType;        // Nested health type object
  target_value: number;    // Goal target value
  target_date: string;     // ISO date string
  status: string;          // Goal status enum
  progress_percentage?: number; // Optional progress calculation
  created_at: string;      // ISO datetime string
  updated_at: string;      // ISO datetime string
}
```

#### Health Reminders Response
```typescript
{
  data: HealthReminder[];  // Array of reminder objects
}
```

#### Single Health Reminder Response
```typescript
{
  id: number;              // Unique reminder identifier
  user_id: string;         // Clerk user ID
  type_id: number;         // Health type identifier
  type: HealthType;        // Nested health type object
  cron_expr: string;       // Cron expression
  message: string;         // Reminder message
  active: boolean;         // Active status
  next_run_at?: string;    // Optional next execution time
  created_at: string;      // ISO datetime string
  updated_at: string;      // ISO datetime string
}
```

#### Health Analytics Response
```typescript
{
  type: HealthType; // Health type information
  period: {
    start_date: string; // ISO date string
    end_date: string; // ISO date string
    aggregation: string; // Aggregation level
  };
  data_points: Array<{
    date: string; // ISO date string
    value: number; // Aggregated value
    count: number; // Record count for period
  }>;
  statistics: {
    min: number; // Minimum value
    max: number; // Maximum value
    avg: number; // Average value
    trend: 'increasing' | 'decreasing' | 'stable';
    total_records: number; // Total records in period
  };
}
```

#### Health Type Response
```typescript
{
  id: number;              // Unique type identifier
  slug: string;            // URL-friendly identifier
  display_name: string;    // Human-readable name
  unit: string;            // Default measurement unit
  typical_range_low?: number;  // Optional typical low value
  typical_range_high?: number; // Optional typical high value
  created_at: string;      // ISO datetime string
  updated_at: string;      // ISO datetime string
}
```

## Data Type Mapping

### TypeScript to API Schema Mapping

| TypeScript Type | API Schema Type | Validation | Example |
|-----------------|-----------------|------------|---------|
| `number` | `number` | Positive, range checks | `75.5` |
| `string` | `string` | Length, pattern validation | `"kg"` |
| `Date` | `string` (ISO) | Date format, range checks | `"2024-01-15T10:30:00Z"` |
| `boolean` | `boolean` | Type validation | `true` |
| `enum` | `string` | Enum value validation | `"active"` |
| `Array<T>` | `array` | Item validation, length limits | `[1, 2, 3]` |
| `number \| undefined` | `number` (optional) | Optional with defaults | `20` |

### Zod Schema to OpenAPI Mapping

| Zod Schema | OpenAPI Type | Format | Constraints |
|------------|--------------|--------|-------------|
| `z.number().positive()` | `number` | `float` | `minimum: 0` |
| `z.string().min(1).max(20)` | `string` | - | `minLength: 1, maxLength: 20` |
| `z.coerce.date()` | `string` | `date-time` | Custom validation |
| `z.enum(['a', 'b'])` | `string` | - | `enum: ['a', 'b']` |
| `z.array(T).max(10)` | `array` | - | `maxItems: 10` |
| `z.boolean()` | `boolean` | - | - |

## Validation Rules Integration

### Zod Schema Integration Patterns

#### 1. Coercion and Transformation
```typescript
// Automatic type coercion
z.coerce.number(); // Converts strings to numbers
z.coerce.date(); // Converts strings to dates
z.coerce.boolean(); // Converts strings to booleans

// Custom transformations
z.string().transform(val => new Date(val));
z.string().transform(val => val.split(',').map(Number));
```

#### 2. Custom Validation Rules
```typescript
// Date range validation
.refine(data => data.start_date <= data.end_date, {
  message: 'Start date must be before end date',
  path: ['end_date']
})

// Business logic validation
.refine(data => data.value <= 10000, {
  message: 'Value exceeds maximum allowed range'
})

// Conditional validation
.refine(data => {
  if (data.unit === '%') return data.value <= 100;
  return true;
}, { message: 'Percentage cannot exceed 100' })
```

#### 3. Error Handling Integration
```typescript
// Validation error structure
{
  error: "Validation failed",
  code: "VALIDATION_ERROR",
  details: {
    field_name: ["Error message 1", "Error message 2"],
    another_field: ["Error message"]
  }
}
```

### API Endpoint Validation Flow

1. **Request Parsing**: Extract query params, path params, body
2. **Schema Validation**: Apply Zod schema validation
3. **Business Logic**: Custom validation rules
4. **Error Response**: Standardized error format
5. **Success Processing**: Validated data passed to handlers

## Query Parameter Patterns

### Common Query Parameter Types

#### 1. Filtering Parameters
```typescript
// Type-based filtering
type_id?: number         // Filter by health type
active?: boolean         // Filter by active status
status?: string          // Filter by status enum

// Date range filtering
start_date?: Date        // Range start
end_date?: Date          // Range end
```

#### 2. Pagination Parameters
```typescript
limit: number = 20; // Page size (1-100)
offset: number = 0; // Skip count (≥0)
```

#### 3. Aggregation Parameters
```typescript
aggregation: 'daily' | 'weekly' | 'monthly' = 'daily'
```

#### 4. Array Parameters
```typescript
// Multiple values support
type_ids?: number[]      // Array of type IDs
// URL: ?type_ids=1,2,3 or ?type_ids[]=1&type_ids[]=2
```

### Query Parameter Validation Patterns

```typescript
// Optional with defaults
z.coerce.number().min(1).max(100).default(20);

// Array handling
z.union([
  z.string().transform(val => val.split(',').map(Number)),
  z.array(z.string().transform(val => Number(val)))
]).pipe(z.array(z.number().positive()).max(10));

// Date range validation
z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional()
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return data.start_date <= data.end_date;
  }
  return true;
});
```

## Request Body Structures

### POST Request Bodies

#### Health Record Creation
```json
{
  "type_id": 1,
  "value": 75.5,
  "unit": "kg",
  "recorded_at": "2024-01-15T10:30:00Z"
}
```

**Required Fields:** All fields required
**Validation:** Value ranges, unit compatibility, date constraints

#### Health Goal Creation
```json
{
  "type_id": 1,
  "target_value": 70.0,
  "target_date": "2024-06-01",
  "status": "active"
}
```

**Required Fields:** `type_id`, `target_value`, `target_date`
**Optional Fields:** `status` (defaults to "active")

#### Health Reminder Creation
```json
{
  "type_id": 1,
  "cron_expr": "0 9 * * *",
  "message": "Time to log your weight!",
  "active": true
}
```

**Required Fields:** All fields required
**Validation:** Cron expression format, message length

### PUT/PATCH Request Bodies

#### Health Record Update (PUT)
```json
{
  "value": 76.0,
  "unit": "kg",
  "recorded_at": "2024-01-15T11:00:00Z"
}
```

**Partial Updates:** All fields optional, at least one required

#### Health Goal Update (PATCH)
```json
{
  "target_value": 68.0,
  "status": "completed"
}
```

**Partial Updates:** All fields optional, at least one required

#### Health Reminder Update (PATCH)
```json
{
  "cron_expr": "0 18 * * *",
  "active": false
}
```

**Partial Updates:** All fields optional

### Bulk Operations

#### Bulk Health Records
```json
{
  "records": [
    {
      "type_id": 1,
      "value": 75.5,
      "unit": "kg",
      "recorded_at": "2024-01-15T10:30:00Z"
    },
    {
      "type_id": 2,
      "value": 120,
      "unit": "mmHg",
      "recorded_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Constraints:** 1-50 records per request

## Response Data Structures

### Standard Response Patterns

#### 1. Single Resource Response
```typescript
{
  // Resource data directly at root level
  id: number;
  // ... other resource fields
}
```

#### 2. Collection Response
```typescript
{
  data: ResourceType[];    // Array of resources
  pagination?: {           // Optional pagination metadata
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  }
}
```

#### 3. Analytics Response
```typescript
{
  type: HealthType;        // Context information
  period: PeriodInfo;      // Time period details
  data_points: DataPoint[]; // Time series data
  statistics: Statistics;   // Aggregated statistics
}
```

### Nested Object Structures

#### Health Type Nesting
```typescript
{
  id: 123,
  type_id: 1,
  type: {                  // Nested health type object
    id: 1,
    slug: "weight",
    display_name: "Weight",
    unit: "kg",
    // ... other type fields
  },
  value: 75.5,
  // ... other fields
}
```

#### Metadata Inclusion
```typescript
{
  // Resource data
  id: 123,
  // ... resource fields

  // Computed fields
  progress_percentage?: number;
  next_run_at?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}
```

## Error Response Schemas

### Standard Error Response
```typescript
{
  error: string;           // Human-readable error message
  code: string;            // Machine-readable error code
  details?: object;        // Optional additional details
}
```

### Error Code Categories

#### 1. Client Errors (4xx)
```typescript
// 400 Bad Request
{
  error: "Invalid request parameters",
  code: "BAD_REQUEST"
}

// 401 Unauthorized
{
  error: "Authentication required",
  code: "UNAUTHORIZED"
}

// 404 Not Found
{
  error: "Resource not found",
  code: "NOT_FOUND"
}

// 422 Validation Error
{
  error: "Validation failed",
  code: "VALIDATION_ERROR",
  details: {
    field_name: ["Error message 1", "Error message 2"]
  }
}
```

#### 2. Server Errors (5xx)
```typescript
// 500 Internal Server Error
{
  error: "Internal server error",
  code: "INTERNAL_ERROR"
}

// 503 Service Unavailable
{
  error: "Service temporarily unavailable",
  code: "SERVICE_UNAVAILABLE"
}
```

### Validation Error Details Structure

```typescript
{
  error: "Validation failed",
  code: "VALIDATION_ERROR",
  details: {
    [fieldName: string]: string[];  // Array of error messages per field
  }
}
```

**Example:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "value": ["Value must be a positive number"],
    "recorded_at": ["Date cannot be in the future"],
    "unit": ["Invalid unit. Must be one of: kg, lbs, mmHg, bpm..."]
  }
}
```

### Rate Limiting Error Response
```typescript
{
  error: "Rate limit exceeded",
  code: "RATE_LIMIT_EXCEEDED",
  details: {
    limit: number;         // Request limit
    window: string;        // Time window
    retry_after: number;   // Seconds until retry
  }
}
```

## Pagination Schema Patterns

### Pagination Metadata Structure
```typescript
{
  total: number; // Total items across all pages
  limit: number; // Items per page (requested)
  offset: number; // Items skipped (requested)
  has_more: boolean; // More pages available
}
```

### Pagination Query Parameters
```typescript
{
  limit: number = 20; // Page size (1-100)
  offset: number = 0; // Skip count (≥0)
}
```

### Pagination Response Pattern
```typescript
{
  data: T[];               // Current page items
  pagination: {
    total: 150,            // Total items
    limit: 20,             // Current page size
    offset: 40,            // Current offset
    has_more: true         // More pages available
  }
}
```

### Pagination Calculation Logic
```typescript
// has_more calculation
has_more = (offset + limit) < total;

// Next page offset
next_offset = offset + limit;

// Previous page offset
prev_offset = Math.max(0, offset - limit);

// Total pages
total_pages = Math.ceil(total / limit);

// Current page number (1-based)
current_page = Math.floor(offset / limit) + 1;
```

## OpenAPI Schema Alignment

### Schema Definition Alignment

#### 1. Zod to OpenAPI Type Mapping
```yaml
# Zod: z.number().positive()
type: number
format: float
minimum: 0

# Zod: z.string().min(1).max(20)
type: string
minLength: 1
maxLength: 20

# Zod: z.enum(['active', 'completed', 'paused'])
type: string
enum: [active, completed, paused]

# Zod: z.array(z.number()).max(10)
type: array
items:
  type: number
maxItems: 10
```

#### 2. Validation Rule Alignment
```yaml
# Date validation
type: string
format: date-time
# Custom validation in description

# Cron expression validation
type: string
pattern: '^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$'
```

#### 3. Response Schema Alignment
```yaml
# Collection response
type: object
properties:
  data:
    type: array
    items:
      $ref: '#/components/schemas/HealthRecord'
  pagination:
    $ref: '#/components/schemas/Pagination'

# Error response
type: object
properties:
  error:
    type: string
  code:
    type: string
  details:
    type: object
    additionalProperties: true
```

### Implementation vs Specification Differences

#### 1. Coercion Handling
- **Zod Implementation**: Automatic type coercion (`z.coerce.number()`)
- **OpenAPI Spec**: Static type definitions
- **Resolution**: Document coercion behavior in descriptions

#### 2. Custom Validation
- **Zod Implementation**: Complex `.refine()` validation
- **OpenAPI Spec**: Limited validation constraints
- **Resolution**: Document business rules in descriptions

#### 3. Transformation Logic
- **Zod Implementation**: Data transformation during validation
- **OpenAPI Spec**: No transformation representation
- **Resolution**: Document expected input/output formats

### Schema Consistency Checklist

- [ ] All Zod schemas have corresponding OpenAPI definitions
- [ ] Validation constraints match between implementation and spec
- [ ] Error response formats are consistent
- [ ] Pagination patterns are standardized
- [ ] Type coercion behavior is documented
- [ ] Business validation rules are described
- [ ] Example values are realistic and valid
- [ ] Required/optional field specifications match

## Summary

This document provides comprehensive coverage of all API request and response schemas in the Health Management system. The schemas are built on Zod validation with careful attention to:

- **Type Safety**: Strong TypeScript typing with runtime validation
- **Data Integrity**: Comprehensive validation rules and business logic
- **API Consistency**: Standardized patterns across all endpoints
- **Error Handling**: Detailed error responses with field-level validation
- **Performance**: Efficient pagination and query parameter handling
- **Documentation**: Clear alignment with OpenAPI specifications

The schema system ensures robust API integration while maintaining flexibility for future enhancements and maintaining backward compatibility.
