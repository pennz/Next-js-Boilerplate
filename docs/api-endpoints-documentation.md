# API Endpoints Documentation

This document provides comprehensive documentation for all API endpoints in the Next.js Boilerplate health management system. The API follows RESTful principles with robust authentication, authorization, rate limiting, and validation patterns.

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Rate Limiting & Security](#rate-limiting--security)
4. [Feature Flags](#feature-flags)
5. [API Endpoints](#api-endpoints)
6. [Request/Response Schemas](#requestresponse-schemas)
7. [Error Handling](#error-handling)
8. [Validation Patterns](#validation-patterns)
9. [Internationalization](#internationalization)

## Overview

The API provides endpoints for managing personal health data including:
- **Health Records**: Track various health metrics (weight, blood pressure, steps, etc.)
- **Health Goals**: Set and monitor progress toward health targets
- **Health Reminders**: Schedule automated reminders for health tracking
- **Health Analytics**: Generate insights and trends from health data
- **Counter**: Simple counter functionality for demonstrations

### Base URL Structure
```
/{locale}/(auth)/api/health/*     - Protected health management endpoints
/{locale}/(marketing)/api/*       - Public marketing endpoints
```

### OpenAPI Specification
Complete OpenAPI 3.0.3 specification available at: `openapi/health.yaml`

## Authentication & Authorization

### Authentication Method
- **Primary**: Clerk JWT tokens via `@clerk/nextjs/server`
- **Secondary**: Bearer token authentication for cron services

### Authentication Flow
1. Client obtains JWT token from Clerk authentication service
2. Token included in `Authorization: Bearer <token>` header
3. Server validates token using `currentUser()` from Clerk
4. User context extracted for authorization checks

### Authorization Patterns
- **User Data Isolation**: All health data filtered by authenticated user ID
- **Resource Ownership**: Users can only access/modify their own data
- **Route Protection**: All `/api/health/*` endpoints require authentication
- **Cron Authentication**: Special bearer token for automated reminder triggers

## Rate Limiting & Security

### Arcjet Integration
All protected endpoints implement Arcjet security with:

```typescript
const aj = arcjet({
  key: Env.ARCJET_KEY!,
  rules: [
    tokenBucket({
      mode: 'LIVE',
      characteristics: ['userId'],
      refillRate: 10,        // 10 tokens per interval
      interval: 60,          // 60 seconds
      capacity: 20,          // Maximum 20 tokens
    }),
  ],
});
```

### Security Features
- **Shield Protection**: Automatic protection against common attacks
- **Bot Detection**: Arcjet bot protection enabled
- **Rate Limiting**: Token bucket algorithm per user
- **Request Throttling**: 10 requests per minute with burst capacity of 20

## Feature Flags

### Health Management Feature Flag
- **Environment Variable**: `ENABLE_HEALTH_MGMT`
- **Default**: `false`
- **Impact**: When disabled, all health endpoints return 503 Service Unavailable
- **Check Pattern**:
```typescript
if (!Env.ENABLE_HEALTH_MGMT) {
  return NextResponse.json(
    { error: 'Health management feature is not enabled' },
    { status: 503 }
  );
}
```

## API Endpoints

### Health Records

#### `GET /{locale}/(auth)/api/health/records`
**Purpose**: Retrieve user's health records with filtering and pagination

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_HEALTH_MGMT`

**Query Parameters**:
- `type_id` (integer, optional): Filter by health type ID
- `start_date` (ISO date, optional): Filter from date
- `end_date` (ISO date, optional): Filter to date  
- `limit` (integer, optional): Records per page (1-100, default: 20)
- `offset` (integer, optional): Records to skip (default: 0)

**Response Schema**:
```typescript
{
  records: HealthRecord[],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
}
```

**Business Logic**:
- Filters by authenticated user ID
- Supports date range filtering
- Orders by `recordedAt` descending
- Includes pagination metadata

---

#### `POST /{locale}/(auth)/api/health/records`
**Purpose**: Create new health record

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_HEALTH_MGMT`

**Request Schema**:
```typescript
{
  type_id: number,        // Positive integer
  value: number,          // Positive number, max 10000
  unit: string,           // Valid unit (kg, lbs, mmHg, etc.)
  recorded_at: string     // ISO datetime, not future, max 1 year ago
}
```

**Response Schema**:
```typescript
{
  record: HealthRecord,
  message: string
}
```

**Validation Rules**:
- Value must be positive and reasonable for unit type
- Date cannot be in future or more than 1 year ago
- Unit must be from predefined list
- Type ID must reference valid health type

---

#### `PUT /{locale}/(auth)/api/health/records`
**Purpose**: Update existing health record

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_HEALTH_MGMT`

**Request Schema**:
```typescript
{
  id: number,             // Required: Record ID
  type_id?: number,       // Optional: New type ID
  value?: number,         // Optional: New value
  unit?: string,          // Optional: New unit
  recorded_at?: string    // Optional: New recorded date
}
```

**Authorization**: Record must belong to authenticated user

**Response Schema**:
```typescript
{
  record: HealthRecord,
  message: string
}
```

---

#### `DELETE /{locale}/(auth)/api/health/records`
**Purpose**: Delete health record

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_HEALTH_MGMT`

**Query Parameters**:
- `id` (integer, required): Record ID to delete

**Authorization**: Record must belong to authenticated user

**Response Schema**:
```typescript
{
  message: string
}
```

**Implementation**: Hard delete (can be changed to soft delete)

---

### Health Goals

#### `GET /{locale}/(auth)/api/health/goals`
**Purpose**: Retrieve user's health goals with progress calculation

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: None specified
**Feature Flag**: None

**Query Parameters**:
- `status` (enum, optional): Filter by status (active, completed, paused)
- `type_id` (integer, optional): Filter by health type ID

**Response Schema**:
```typescript
{
  goals: HealthGoalWithProgress[],
  total: number
}

interface HealthGoalWithProgress extends HealthGoal {
  currentValue: number,
  progressPercentage: number,
  daysRemaining: number,
  isOverdue: boolean,
  lastRecordedAt: string | null
}
```

**Business Logic**:
- Calculates progress based on latest health records
- Includes days remaining until target date
- Joins with health type information
- Orders by creation date descending

---

#### `POST /{locale}/(auth)/api/health/goals`
**Purpose**: Create new health goal

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: None specified
**Feature Flag**: None

**Request Schema**:
```typescript
{
  type_id: number,        // Must reference valid health type
  target_value: number,   // Positive number within reasonable range
  target_date: string,    // ISO date, must be in future
  status?: string         // Default: 'active'
}
```

**Business Logic**:
- Validates health type exists
- Prevents duplicate active goals for same health type
- Validates target value is reasonable for health type

**Response Schema**:
```typescript
{
  goal: HealthGoal,
  message: string
}
```

---

#### `PATCH /{locale}/(auth)/api/health/goals`
**Purpose**: Update existing health goal

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: None specified
**Feature Flag**: None

**Request Schema**:
```typescript
{
  id: number,             // Required: Goal ID
  target_value?: number,  // Optional: New target
  target_date?: string,   // Optional: New target date
  status?: string         // Optional: New status
}
```

**Business Logic**:
- Validates goal ownership
- Checks target achievement when marking as completed
- Logs warnings if completed without reaching target

**Authorization**: Goal must belong to authenticated user

---

#### `DELETE /{locale}/(auth)/api/health/goals`
**Purpose**: Remove health goal (soft delete)

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: None specified
**Feature Flag**: None

**Query Parameters**:
- `id` (integer, required): Goal ID

**Implementation**: Soft delete by setting status to 'paused'
**Rationale**: Preserves historical data for analytics

---

### Health Reminders

#### `GET /{locale}/(auth)/api/health/reminders`
**Purpose**: Retrieve user's health reminders

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: None specified
**Feature Flag**: None

**Query Parameters**:
- `active` (boolean, optional): Filter by active status
- `type_id` (integer, optional): Filter by health type ID

**Response Schema**:
```typescript
{
  reminders: HealthReminder[]
}
```

---

#### `POST /{locale}/(auth)/api/health/reminders`
**Purpose**: Create new health reminder

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: None specified
**Feature Flag**: None

**Request Schema**:
```typescript
{
  type_id: number,        // Health type ID
  cron_expr: string,      // Valid cron expression
  message: string,        // 1-500 characters
  active: boolean         // Reminder active status
}
```

**Business Logic**:
- Validates cron expression using `cron-parser`
- Calculates next execution time
- Supports standard cron syntax and named schedules

**Cron Expression Support**:
- Standard 5-field format: `"0 9 * * *"` (9 AM daily)
- Named schedules: `"@daily"`, `"@weekly"`, `"@monthly"`
- Complex patterns: `"0 9,18 * * 1-5"` (9 AM and 6 PM, weekdays)

---

#### `PATCH /{locale}/(auth)/api/health/reminders`
**Purpose**: Update existing health reminder

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: None specified
**Feature Flag**: None

**Request Schema**:
```typescript
{
  id: number,             // Required: Reminder ID
  cron_expr?: string,     // Optional: New cron expression
  message?: string,       // Optional: New message
  active?: boolean        // Optional: New active status
}
```

**Business Logic**:
- Recalculates next execution time if cron expression changes
- Validates cron expression format

---

#### `DELETE /{locale}/(auth)/api/health/reminders`
**Purpose**: Deactivate health reminder (soft delete)

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: None specified
**Feature Flag**: None

**Query Parameters**:
- `id` (integer, required): Reminder ID

**Implementation**: Soft delete by setting `active = false`

---

### Health Analytics

#### `GET /{locale}/(auth)/api/health/analytics/[type]`
**Purpose**: Generate analytics for specific health metric type

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: None specified
**Feature Flag**: `ENABLE_HEALTH_MGMT`

**Path Parameters**:
- `type` (string, required): Health type slug (e.g., "weight", "blood-pressure")

**Query Parameters**:
- `start_date` (ISO datetime, optional): Analytics start date
- `end_date` (ISO datetime, optional): Analytics end date
- `aggregation` (enum, optional): Data aggregation level (daily, weekly, monthly)

**Default Behavior**:
- Date range: Last 30 days if not specified
- Aggregation: Daily if not specified

**Response Schema**:
```typescript
{
  type: string,
  displayName: string,
  unit: string,
  aggregation: string,
  dateRange: {
    start: string,
    end: string
  },
  summary: {
    currentValue: number | null,
    trend: 'increasing' | 'decreasing' | 'stable',
    trendValue: number,
    totalRecords: number
  },
  data: Array<{
    date: string,
    value: number,
    min: number,
    max: number,
    count: number
  }>,
  typicalRange: {
    low: number | null,
    high: number | null
  }
}
```

**Business Logic**:
- Validates health type exists by slug
- Aggregates data using PostgreSQL date functions
- Calculates trend using linear regression
- Implements 5-minute in-memory cache
- Optimized for chart visualization (Recharts)

**Caching Strategy**:
- Cache key: `${userId}-${type}-${start_date}-${end_date}-${aggregation}`
- TTL: 5 minutes
- Simple in-memory Map-based cache

---

### Health Reminder Triggers

#### `POST /{locale}/(auth)/api/health/reminders/trigger`
**Purpose**: Process due health reminders (cron endpoint)

**Authentication**: Bearer token (`HEALTH_REMINDER_CRON_SECRET`)
**Rate Limiting**: None
**Feature Flag**: `ENABLE_HEALTH_MGMT`

**Authentication Pattern**:
```typescript
const authHeader = headers().get('authorization');
const expectedAuth = `Bearer ${Env.HEALTH_REMINDER_CRON_SECRET}`;
if (authHeader !== expectedAuth) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Business Logic**:
1. Queries active reminders with `nextRunAt <= now`
2. Processes each reminder:
   - Calculates next execution time
   - Updates reminder record
   - Logs notification (placeholder for email/SMS)
3. Returns processing summary

**Response Schema**:
```typescript
{
  message: string,
  processed: number,
  failed: number,
  timestamp: string,
  details: {
    successful: Array<{
      id: number,
      userId: string,
      healthType: string,
      nextRunAt: string
    }>,
    failed: Array<{
      id: number,
      userId: string,
      error: string
    }>
  }
}
```

**Integration**: Designed for external cron services (e.g., GitHub Actions, Vercel Cron)

---

### Counter (Demo Endpoint)

#### `PUT /{locale}/(marketing)/api/counter`
**Purpose**: Increment counter value (demonstration endpoint)

**Authentication**: None (public endpoint)
**Rate Limiting**: None specified
**Feature Flag**: None

**Request Schema**:
```typescript
{
  increment: number       // 1-3 range
}
```

**Special Headers**:
- `x-e2e-random-id`: Used for E2E testing isolation

**Business Logic**:
- Uses PostgreSQL `ON CONFLICT DO UPDATE` for atomic increment
- Supports isolated testing via header-based ID

**Response Schema**:
```typescript
{
  count: number
}
```

## Request/Response Schemas

### Common Data Types

#### HealthRecord
```typescript
interface HealthRecord {
  id: number;
  userId: string;           // Clerk user ID
  typeId: number;
  value: string;            // Stored as string, validated as number
  unit: string;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### HealthGoal
```typescript
interface HealthGoal {
  id: number;
  userId: string;
  typeId: number;
  targetValue: string;      // Stored as string
  targetDate: Date;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}
```

#### HealthReminder
```typescript
interface HealthReminder {
  id: number;
  userId: string;
  typeId: number;
  cronExpr: string;
  message: string;
  active: boolean;
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Validation Constraints

#### Health Record Values
- **Weight**: 20-500 kg/lbs
- **Blood Pressure**: Systolic 70-250, Diastolic 40-150 mmHg
- **Heart Rate**: 30-220 bpm
- **Steps**: 0-100,000 per day
- **Sleep**: 0-24 hours
- **Water Intake**: 0-10,000 ml/oz
- **Calories**: 0-10,000 kcal
- **Exercise**: 0-1,440 minutes per day
- **Blood Sugar**: 20-600 mg/dL or mmol/L
- **Temperature**: 90-110°F or 32-43°C
- **Oxygen Saturation**: 70-100%

#### Valid Units
```typescript
const validUnits = [
  'kg', 'lbs',              // Weight
  'mmHg',                   // Blood pressure
  'bpm',                    // Heart rate
  'steps',                  // Step count
  'hours',                  // Sleep duration
  'ml', 'oz',              // Liquid volume
  'kcal',                   // Calories
  'minutes',                // Exercise duration
  'mg/dL', 'mmol/L',       // Blood sugar
  '°C', '°F',              // Temperature
  '%'                       // Percentage (oxygen saturation)
];
```

#### Cron Expression Patterns
- **Standard**: `"0 9 * * *"` (9 AM daily)
- **Named**: `"@daily"`, `"@weekly"`, `"@monthly"`, `"@yearly"`
- **Complex**: `"0 9,18 * * 1-5"` (9 AM and 6 PM, weekdays)
- **Every**: `"@every 2h"` (every 2 hours)

## Error Handling

### Standard Error Response Format
```typescript
{
  error: string,            // Human-readable error message
  code?: string,           // Machine-readable error code
  details?: object         // Additional error context
}
```

### HTTP Status Codes

#### Success Responses
- `200 OK`: Successful GET, PUT, PATCH operations
- `201 Created`: Successful POST operations
- `204 No Content`: Successful DELETE operations

#### Client Error Responses
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or invalid
- `404 Not Found`: Resource not found or access denied
- `409 Conflict`: Resource conflict (e.g., duplicate active goal)
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded

#### Server Error Responses
- `500 Internal Server Error`: Unexpected server errors
- `503 Service Unavailable`: Feature disabled by flag

### Validation Error Format
```typescript
{
  error: "Validation failed",
  code: "VALIDATION_ERROR",
  details: {
    fieldName: ["Error message 1", "Error message 2"],
    anotherField: ["Error message"]
  }
}
```

### Rate Limiting Error
```typescript
{
  error: "Too many requests",
  code: "RATE_LIMIT_EXCEEDED"
}
```

## Validation Patterns

### Zod Integration
All endpoints use Zod schemas for request validation:

```typescript
const parse = ValidationSchema.safeParse(requestData);
if (!parse.success) {
  return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
}
```

### Validation Schema Hierarchy
1. **Base Validation**: Core field validation (type, format, range)
2. **Business Logic Validation**: Cross-field validation and business rules
3. **Authorization Validation**: Resource ownership and access control
4. **External Validation**: Database constraints and foreign key checks

### Custom Validation Rules

#### Date Validation
- Cannot be in the future (for recorded_at)
- Cannot be more than 1 year ago (for recorded_at)
- Must be in the future (for target_date in goals)

#### Value Range Validation
- Health type specific ranges
- Unit compatibility checks
- Reasonable value constraints

#### Cron Expression Validation
- Standard 5-field cron syntax
- Named schedule support (@daily, @weekly, etc.)
- @every syntax with time units

## Internationalization

### Route Structure
All API endpoints support internationalization through the `[locale]` parameter:

```
/{locale}/(auth)/api/health/records
/{locale}/(marketing)/api/counter
```

### Supported Locales
- Configurable through Next.js i18n configuration
- Locale parameter passed to all route handlers
- No locale-specific business logic in current implementation

### Locale Handling
- Locale extracted from URL path
- Available in route handler context
- Can be used for localized error messages and responses

### Future Considerations
- Localized validation error messages
- Date/time formatting based on locale
- Unit system preferences (metric vs imperial)
- Localized health type names and descriptions

---

## Integration Examples

### Creating a Health Record
```typescript
const response = await fetch('/en/(auth)/api/health/records', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${clerkToken}`
  },
  body: JSON.stringify({
    type_id: 1,
    value: 75.5,
    unit: 'kg',
    recorded_at: new Date().toISOString()
  })
});
```

### Querying Analytics Data
```typescript
const params = new URLSearchParams({
  start_date: '2024-01-01T00:00:00Z',
  end_date: '2024-01-31T23:59:59Z',
  aggregation: 'weekly'
});

const response = await fetch(`/en/(auth)/api/health/analytics/weight?${params}`, {
  headers: {
    'Authorization': `Bearer ${clerkToken}`
  }
});
```

### Setting Up Cron Reminder Trigger
```bash
curl -X POST https://your-app.com/en/(auth)/api/health/reminders/trigger \
  -H "Authorization: Bearer ${HEALTH_REMINDER_CRON_SECRET}" \
  -H "Content-Type: application/json"
```

This documentation provides complete coverage of all API endpoints, their authentication requirements, validation patterns, and integration examples for building robust health management applications.