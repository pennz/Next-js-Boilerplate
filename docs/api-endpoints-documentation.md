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
10. [Behavioral Tracking API](#behavioral-tracking-api)
11. [User Profile Management API](#user-profile-management-api)
12. [Marketing Endpoints](#marketing-endpoints)

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
      refillRate: 10, // 10 tokens per interval
      interval: 60, // 60 seconds
      capacity: 20, // Maximum 20 tokens
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
  message: string;
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
  increment: number; // 1-3 range
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
  count: number;
}
```

## Request/Response Schemas

### Common Data Types

#### HealthRecord
```typescript
type HealthRecord = {
  id: number;
  userId: string; // Clerk user ID
  typeId: number;
  value: string; // Stored as string, validated as number
  unit: string;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};
```

#### HealthGoal
```typescript
type HealthGoal = {
  id: number;
  userId: string;
  typeId: number;
  targetValue: string; // Stored as string
  targetDate: Date;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
};
```

#### HealthReminder
```typescript
type HealthReminder = {
  id: number;
  userId: string;
  typeId: number;
  cronExpr: string;
  message: string;
  active: boolean;
  nextRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
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
  'kg',
  'lbs', // Weight
  'mmHg', // Blood pressure
  'bpm', // Heart rate
  'steps', // Step count
  'hours', // Sleep duration
  'ml',
  'oz', // Liquid volume
  'kcal', // Calories
  'minutes', // Exercise duration
  'mg/dL',
  'mmol/L', // Blood sugar
  '°C',
  '°F', // Temperature
  '%' // Percentage (oxygen saturation)
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
    Authorization: `Bearer ${clerkToken}`
  }
});
```

### Setting Up Cron Reminder Trigger
```bash
curl -X POST https://your-app.com/en/(auth)/api/health/reminders/trigger \
  -H "Authorization: Bearer ${HEALTH_REMINDER_CRON_SECRET}" \
  -H "Content-Type: application/json"
```

## Behavioral Tracking API

### Behavioral Events

#### `GET /{locale}/(auth)/api/behavior/events`
**Purpose**: Retrieve user's behavioral events with filtering and pagination

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Query Parameters**:
- `session_id` (string, optional): Filter by session ID
- `event_type` (string, optional): Filter by event type
- `context` (JSON string, optional): Filter by context
- `start_date` (ISO date, optional): Filter from date
- `end_date` (ISO date, optional): Filter to date
- `limit` (integer, optional): Records per page (1-1000, default: 100)
- `offset` (integer, optional): Records to skip (default: 0)

**Response Schema**:
```typescript
{
  events: BehaviorEvent[],
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
- Orders by `createdAt` descending
- Includes pagination metadata
- Supports filtering by session ID, event type, and context

---

#### `POST /{locale}/(auth)/api/behavior/events`
**Purpose**: Create new behavioral events

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Request Schema**:
```typescript
{
  events: Array<{
    event_type: string,       // Event type identifier
    timestamp?: string,       // ISO datetime (default: server time)
    session_id?: string,      // Session identifier
    context?: object,         // Context information
    metadata?: object         // Additional metadata
  }>
}
```

**Response Schema**:
```typescript
{
  events: BehaviorEvent[],
  message: string
}
```

**Validation Rules**:
- Event type is required
- Context must be a valid JSON object
- Timestamp cannot be in future or more than 1 year ago
- Supports bulk creation of events

---

#### `DELETE /{locale}/(auth)/api/behavior/events`
**Purpose**: Delete behavioral events

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Query Parameters**:
- `id` (integer, optional): Specific event ID to delete
- `session_id` (string, optional): Delete all events for a session
- `older_than_days` (integer, optional): Delete events older than N days

**Request Schema** (alternative to query parameters):
```typescript
{
  id?: number,              // Specific event ID to delete
  session_id?: string,      // Delete all events for a session
  older_than_days?: number  // Delete events older than N days
}
```

**Authorization**: Events must belong to authenticated user

**Response Schema**:
```typescript
{
  message: string,
  deleted_count: number
}
```

**Implementation**: Hard delete

---

### Micro Behavior Patterns

#### `GET /{locale}/(auth)/api/behavior/micro-patterns`
**Purpose**: Retrieve user's micro behavior patterns with filtering and pagination

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Query Parameters**:
- `active_only` (boolean, optional): Filter to active patterns only
- `min_confidence` (number, optional): Minimum confidence threshold (0-100)
- `category` (string, optional): Filter by pattern category
- `limit` (integer, optional): Records per page (1-100, default: 20)
- `offset` (integer, optional): Records to skip (default: 0)
- `include_insights` (boolean, optional): Include pattern insights

**Response Schema**:
```typescript
{
  patterns: MicroBehaviorPattern[],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  },
  insights?: PatternInsights
}
```

**Business Logic**:
- Filters by authenticated user ID
- Orders by `createdAt` descending
- Includes pagination metadata
- Optional insights generation

---

#### `POST /{locale}/(auth)/api/behavior/micro-patterns`
**Purpose**: Create new micro behavior patterns

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Request Schema**:
```typescript
{
  patterns: Array<{
    name: string,             // Pattern name
    description?: string,     // Pattern description
    category?: string,        // Pattern category
    confidence: number,       // Confidence level (0-100)
    strength: number,         // Pattern strength (0-100)
    frequency: number,        // Pattern frequency (0-100)
    consistency: number,      // Pattern consistency (0-100)
    outcomes?: object,        // Pattern outcomes
    correlations?: object,    // Pattern correlations
    timeframe?: object,       // Pattern timeframe
    metadata?: object         // Additional metadata
  }>
}
```

**Response Schema**:
```typescript
{
  patterns: MicroBehaviorPattern[],
  message: string
}
```

**Validation Rules**:
- Name is required
- Confidence must be between 0-100

---

#### `PUT /{locale}/(auth)/api/behavior/micro-patterns`
**Purpose**: Update existing micro behavior patterns

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Request Schema**:
```typescript
{
  id: number,               // Required: Pattern ID
  name?: string,            // Optional: New name
  description?: string,     // Optional: New description
  category?: string,        // Optional: New category
  confidence?: number,      // Optional: New confidence
  strength?: number,        // Optional: New strength
  frequency?: number,       // Optional: New frequency
  consistency?: number,     // Optional: New consistency
  outcomes?: object,        // Optional: New outcomes
  correlations?: object,    // Optional: New correlations
  timeframe?: object,       // Optional: New timeframe
  metadata?: object         // Optional: New metadata
}
```

**Authorization**: Pattern must belong to authenticated user

**Response Schema**:
```typescript
{
  pattern: MicroBehaviorPattern,
  message: string
}
```

---

#### `PATCH /{locale}/(auth)/api/behavior/micro-patterns`
**Purpose**: Partially update existing micro behavior patterns

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Request Schema**:
```typescript
{
  id: number,               // Required: Pattern ID
  ... // Same fields as PUT endpoint
}
```

**Authorization**: Pattern must belong to authenticated user

**Response Schema**:
```typescript
{
  pattern: MicroBehaviorPattern,
  message: string
}
```

---

#### `DELETE /{locale}/(auth)/api/behavior/micro-patterns`
**Purpose**: Delete micro behavior patterns

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Query Parameters**:
- `id` (integer, required): Pattern ID to delete
- `soft_delete` (boolean, optional): Soft delete instead of hard delete

**Authorization**: Pattern must belong to authenticated user

**Response Schema**:
```typescript
{
  message: string
}
```

**Implementation**: Supports both soft delete (archive) and hard delete

---

### Behavioral Analytics

#### `GET /{locale}/(auth)/api/behavior/analytics/context-patterns`
**Purpose**: Retrieve workout context patterns with predictive power analysis

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Query Parameters**:
- `timeRange` (enum, optional): Time range ('30d', '90d', '1y', default: '90d')
- `minPredictivePower` (number, optional): Minimum predictive power threshold (0-100, default: 50)

**Response Schema**:
```typescript
{
  success: boolean,
  data: Array<{
    contextType: string,
    contextValue: string,
    frequency: number,
    successRate: number,
    predictivePower: number,
    lastSeen: string
  }>,
  meta: {
    timeRange: string,
    minPredictivePower: number,
    totalPatterns: number,
    filteredPatterns: number,
    userId: string,
    generatedAt: string
  }
}
```

**Business Logic**:
- Analyzes workout contexts to identify patterns
- Calculates predictive power of each context
- Filters by minimum predictive power threshold
- Supports multiple time ranges

---

#### `GET /{locale}/(auth)/api/behavior/analytics/frequency`
**Purpose**: Retrieve behavioral frequency analytics with consistency and strength metrics

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Query Parameters**:
- `timeRange` (enum, optional): Time range ('7d', '30d', '90d', '1y', default: '30d')
- `behaviorType` (string, optional): Filter by specific behavior type
- `aggregation` (enum, optional): Aggregation level ('daily', 'weekly', default: 'daily')

**Response Schema**:
```typescript
{
  success: boolean,
  data: Array<{
    date: string,
    frequency: number,
    consistency: number,
    strength: number
  }>,
  meta: {
    timeRange: string,
    behaviorType: string | undefined,
    aggregation: string,
    userId: string,
    generatedAt: string,
    dateRange: {
      start: string,
      end: string
    }
  }
}
```

**Business Logic**:
- Calculates behavioral frequency over time
- Computes consistency scores based on frequency variation
- Calculates strength based on frequency relative to patterns
- Supports daily and weekly aggregation
- Provides overall statistics

---

#### `GET /{locale}/(auth)/api/behavior/analytics/habit-strength`
**Purpose**: Calculate overall habit strength metrics

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Query Parameters**:
- `timeRange` (enum, optional): Time range ('7d', '30d', '90d', '1y', default: '30d')
- `behaviorType` (string, optional): Filter by specific behavior type

**Response Schema**:
```typescript
{
  success: boolean,
  data: {
    habitStrength: number,
    trend: number,
    patternsCount: number,
    activePatterns: number,
    consistencyAvg: number
  },
  meta: {
    timeRange: string,
    behaviorType: string | undefined,
    userId: string,
    generatedAt: string
  }
}
```

**Business Logic**:
- Calculates overall habit strength using the HabitStrengthAnalyticsService
- Computes trend analysis
- Provides statistics on active patterns
- Supports filtering by behavior type
- Supports multiple time ranges

---

#### `GET /{locale}/(auth)/api/behavior/analytics/patterns`
**Purpose**: Recognize and retrieve behavioral patterns

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Query Parameters**:
- `behaviorType` (string, optional): Filter by specific behavior type
- `minConfidence` (number, optional): Minimum confidence threshold (0-100, default: 70)
- `limit` (number, optional): Maximum number of patterns to return (1-50, default: 10)

**Response Schema**:
```typescript
{
  success: boolean,
  data: Array<{
    patternId: string,
    behaviorType: string,
    description: string,
    confidence: number,
    frequency: number,
    lastDetected: string,
    predictiveValue: number
  }>,
  meta: {
    behaviorType: string | undefined,
    minConfidence: number,
    limit: number,
    totalPatterns: number,
    returnedPatterns: number,
    userId: string,
    generatedAt: string
  }
}
```

**Business Logic**:
- Recognizes behavioral patterns using the HabitStrengthAnalyticsService
- Filters by minimum confidence threshold
- Limits results based on limit parameter
- Supports filtering by behavior type

---

#### `GET /{locale}/(auth)/api/behavior/analytics/summary`
**Purpose**: Retrieve behavioral analytics summary

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Query Parameters**:
- `time_range` (enum, optional): Time range ('7d', '30d', '90d', '1y', default: '30d')

**Response Schema**:
```typescript
{
  success: boolean,
  data: {
    totalEvents: number,
    activePatterns: number,
    habitStrengthAvg: number,
    consistencyScore: number,
    topContext: string,
    weeklyTrend: object,
    predictionAccuracy: number
  },
  meta: {
    timeRange: string,
    userId: string,
    generatedAt: string,
    dateRange: {
      start: string,
      end: string
    }
  }
}
```

**Business Logic**:
- Calculates behavioral analytics summary
- Supports multiple time ranges
- Includes habit strength, consistency score, and prediction accuracy
- Identifies top context patterns
- Statistical validation (confidence < 50 requires explanation)
- Supports bulk creation of patterns

---

#### `PUT /{locale}/(auth)/api/behavior/micro-patterns`
**Purpose**: Update existing micro behavior patterns

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Request Schema**:
```typescript
{
  id: number,               // Required: Pattern ID
  name?: string,            // Optional: New name
  description?: string,     // Optional: New description
  category?: string,        // Optional: New category
  confidence?: number,      // Optional: New confidence
  strength?: number,        // Optional: New strength
  frequency?: number,       // Optional: New frequency
  consistency?: number,     // Optional: New consistency
  outcomes?: object,        // Optional: New outcomes
  correlations?: object,    // Optional: New correlations
  timeframe?: object,       // Optional: New timeframe
  metadata?: object         // Optional: New metadata
}
```

**Authorization**: Pattern must belong to authenticated user

**Response Schema**:
```typescript
{
  pattern: MicroBehaviorPattern,
  message: string
}
```

---

#### `PATCH /{locale}/(auth)/api/behavior/micro-patterns`
**Purpose**: Partially update existing micro behavior patterns

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Request Schema**:
```typescript
{
  id: number,               // Required: Pattern ID
  ... // Same fields as PUT endpoint
}
```

**Authorization**: Pattern must belong to authenticated user

**Response Schema**:
```typescript
{
  pattern: MicroBehaviorPattern,
  message: string
}
```

---

#### `DELETE /{locale}/(auth)/api/behavior/micro-patterns`
**Purpose**: Delete micro behavior patterns

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Query Parameters**:
- `id` (integer, required): Pattern ID to delete
- `soft_delete` (boolean, optional): Soft delete instead of hard delete

**Authorization**: Pattern must belong to authenticated user

**Response Schema**:
```typescript
{
  message: string
}
```

**Implementation**: Supports both soft delete (archive) and hard delete

---

### Behavioral Analytics

#### `GET /{locale}/(auth)/api/behavior/analytics/summary`
**Purpose**: Retrieve behavioral analytics summary

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_BEHAVIOR_TRACKING`

**Query Parameters**:
- `time_range` (enum, optional): Time range ('7d', '30d', '90d', '1y', default: '30d')

**Response Schema**:
```typescript
{
  success: boolean,
  data: {
    totalEvents: number,
    activePatterns: number,
    habitStrengthAvg: number,
    consistencyScore: number,
    topContext: string,
    weeklyTrend: object,
    predictionAccuracy: number
  },
  meta: {
    timeRange: string,
    userId: string,
    generatedAt: string,
    dateRange: {
      start: string,
      end: string
    }
  }
}
```

**Business Logic**:
- Calculates behavioral analytics summary
- Supports multiple time ranges
- Includes habit strength, consistency score, and prediction accuracy
- Identifies top context patterns

## User Profile Management API

### User Profile

#### `GET /{locale}/(auth)/api/profile`
**Purpose**: Retrieve user's profile with related data

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_USER_PROFILES`

**Query Parameters**:
- `include_goals` (boolean, optional): Include user goals
- `include_preferences` (boolean, optional): Include user preferences
- `include_constraints` (boolean, optional): Include user constraints
- Various filtering parameters for profile data

**Response Schema**:
```typescript
{
  profile: UserProfile,
  stats: ProfileStats,
  meta: {
    completeness: number,
    completion_threshold: number,
    is_complete: boolean
  }
}
```

**Business Logic**:
- Retrieves user profile with optional related data
- Calculates profile completeness statistics
- Supports filtering of included related data

---

#### `POST /{locale}/(auth)/api/profile`
**Purpose**: Create new user profile

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_USER_PROFILES`

**Request Schema**:
```typescript
{
  first_name: string,       // User's first name
  last_name: string,        // User's last name
  date_of_birth: string,    // ISO date
  gender: string,           // Gender identity
  height: number,           // Height in cm
  weight: number,           // Weight in kg
  fitness_level: string,    // Fitness level
  experience_level: string, // Experience level
  // ... other profile fields
}
```

**Response Schema**:
```typescript
{
  profile: UserProfile,
  stats: ProfileStats,
  message: string,
  meta: {
    completeness: number,
    completion_threshold: number,
    is_complete: boolean
  }
}
```

**Validation Rules**:
- Comprehensive validation of all profile fields
- Prevents duplicate profiles for the same user
- Validates data ranges and formats

---

#### `PUT /{locale}/(auth)/api/profile`
**Purpose**: Update existing user profile

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_USER_PROFILES`

**Request Schema**:
```typescript
{
  first_name?: string,      // Optional: New first name
  last_name?: string,       // Optional: New last name
  date_of_birth?: string,   // Optional: New date of birth
  gender?: string,          // Optional: New gender
  height?: number,          // Optional: New height
  weight?: number,          // Optional: New weight
  fitness_level?: string,   // Optional: New fitness level
  experience_level?: string,// Optional: New experience level
  // ... other profile fields
  updated_at?: string       // For optimistic concurrency control
}
```

**Authorization**: Profile must belong to authenticated user

**Response Schema**:
```typescript
{
  profile: UserProfile,
  stats: ProfileStats,
  message: string,
  meta: {
    completeness: number,
    completion_threshold: number,
    is_complete: boolean,
    updated_fields: string[]
  }
}
```

**Business Logic**:
- Supports optimistic concurrency control
- Calculates updated profile completeness
- Tracks which fields were updated

---

#### `DELETE /{locale}/(auth)/api/profile`
**Purpose**: Soft delete user profile

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_USER_PROFILES`

**Query Parameters**:
- `confirm` (boolean, required): Confirmation required for deletion

**Authorization**: Profile must belong to authenticated user

**Response Schema**:
```typescript
{
  message: string,
  deleted_at: string,
  meta: {
    data_retention: string,
    recovery_period: string
  }
}
```

**Implementation**:
- Soft delete with data retention for compliance
- Requires explicit confirmation
- Provides information about data retention policy

---

### Profile Constraints

#### `GET /{locale}/(auth)/api/profile/constraints`
**Purpose**: Retrieve user's constraints with filtering

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_USER_PROFILES`

**Query Parameters**:
- `type` (string, optional): Filter by constraint type
- `severity` (string, optional): Filter by severity level
- `status` (string, optional): Filter by status
- `active_only` (boolean, optional): Filter to active constraints only
- Various date and pagination parameters

**Response Schema**:
```typescript
{
  constraints: UserConstraint[],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
}
```

**Business Logic**:
- Retrieves user constraints with filtering
- Supports pagination
- Orders by creation date

---

#### `POST /{locale}/(auth)/api/profile/constraints`
**Purpose**: Add new constraint

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_USER_PROFILES`

**Request Schema**:
```typescript
{
  type: string,             // Constraint type
  title: string,            // Constraint title
  description?: string,     // Optional description
  severity: string,         // Severity level
  status: string,           // Constraint status
  affected_areas?: string[],// Affected areas
  start_date?: string,      // Start date
  end_date?: string,        // End date
  notes?: string            // Additional notes
}
```

**Response Schema**:
```typescript
{
  constraint: UserConstraint,
  message: string
}
```

**Validation Rules**:
- Validates constraint data
- Checks for constraint conflicts
- Validates date relationships

---

#### `PUT /{locale}/(auth)/api/profile/constraints`
**Purpose**: Update existing constraint

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_USER_PROFILES`

**Request Schema**:
```typescript
{
  id: number,               // Required: Constraint ID
  type?: string,            // Optional: New type
  title?: string,           // Optional: New title
  description?: string,     // Optional: New description
  severity?: string,        // Optional: New severity
  status?: string,          // Optional: New status
  affected_areas?: string[],// Optional: New affected areas
  start_date?: string,      // Optional: New start date
  end_date?: string,        // Optional: New end date
  notes?: string            // Optional: New notes
}
```

**Authorization**: Constraint must belong to authenticated user

**Response Schema**:
```typescript
{
  constraint: UserConstraint,
  message: string
}
```

---

#### `DELETE /{locale}/(auth)/api/profile/constraints`
**Purpose**: Remove resolved constraint

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_USER_PROFILES`

**Query Parameters**:
- `id` (integer, required): Constraint ID to remove

**Authorization**: Constraint must belong to authenticated user

**Response Schema**:
```typescript
{
  constraint: UserConstraint,
  message: string
}
```

**Implementation**: Soft delete by marking as resolved

---

### Profile Preferences

#### `GET /{locale}/(auth)/api/profile/preferences`
**Purpose**: Retrieve user workout and app preferences

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_USER_PROFILES`

**Query Parameters**:
- `category` (string, optional): Filter by category (workout, notifications, privacy)
- `includeDefaults` (boolean, optional): Return defaults if no preferences exist

**Response Schema**:
```typescript
{
  preferences: UserPreferences,
  isDefault: boolean,
  lastUpdated?: string
}
```

**Business Logic**:
- Retrieves user preferences
- Supports category filtering
- Can return default preferences

---

#### `PUT /{locale}/(auth)/api/profile/preferences`
**Purpose**: Update user preferences

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_USER_PROFILES`

**Query Parameters**:
- `category` (string, optional): Update specific category only
- `merge` (boolean, optional): Merge with existing preferences (default: true)

**Request Schema**:
```typescript
{
  preferred_workout_types?: string[],
  preferred_times?: string[],
  preferred_days?: string[],
  available_equipment?: string[],
  workout_intensity_preference?: number,
  rest_day_preference?: number,
  notification_preferences?: {
    workout_reminders: boolean,
    goal_progress: boolean,
    weekly_summary: boolean,
    achievement_alerts: boolean
  },
  privacy_settings?: {
    profile_visibility: string,
    share_workout_data: boolean,
    share_progress: boolean
  }
}
```

**Response Schema**:
```typescript
{
  preferences: UserPreferences,
  message: string,
  updatedFields: string[],
  category: string
}
```

**Business Logic**:
- Supports partial updates
- Can merge with existing preferences
- Validates category-specific fields

---

#### `POST /{locale}/(auth)/api/profile/preferences`
**Purpose**: Reset preferences to defaults

**Authentication**: Required (Clerk JWT)
**Rate Limiting**: 10 req/min per user
**Feature Flag**: `ENABLE_USER_PROFILES`

**Query Parameters**:
- `category` (string, optional): Reset specific category only
- `createBackup` (boolean, optional): Create backup of current preferences (default: true)

**Response Schema**:
```typescript
{
  preferences: UserPreferences,
  message: string,
  category: string,
  backup?: UserPreferences,
  resetAt: string
}
```

**Business Logic**:
- Resets preferences to system defaults
- Can reset specific categories only
- Optionally creates backup of previous preferences

### Marketing Endpoints

#### `PUT /{locale}/(marketing)/api/counter`
**Purpose**: Increment a simple counter for marketing/demo purposes

**Authentication**: None required
**Rate Limiting**: 10 req/min per IP

**Request Schema**:
```typescript
{
  key: string              // Counter identifier
}
```

**Response Schema**:
```typescript
{
  key: string,             // Counter identifier
  value: number,           // Current counter value
  incremented: boolean     // Whether the counter was incremented
}
```

**Business Logic**:
- Simple counter implementation for marketing purposes
- Uses Drizzle ORM for database operations
- Implements upsert with conflict resolution
- Tracks counter by key
- Uses `x-e2e-random-id` header for E2E testing when present

This documentation provides complete coverage of all API endpoints, their authentication requirements, validation patterns, and integration examples for building robust health management applications.
