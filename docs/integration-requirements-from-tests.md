# Integration Requirements from Tests

This document extracts comprehensive API and service integration specifications from integration and unit tests, providing detailed requirements for system integration patterns, API contracts, and service layer interactions.

## 1. Health Management API Integration Requirements

### 1.1 Health Records API Requirements

#### POST /api/health/records - Create Health Record

**Request Specifications:**
- **Method**: POST
- **Content-Type**: application/json
- **Authentication**: Required (x-e2e-random-id header for test isolation)
- **Request Body Schema**:
  ```json
  {
    "type_id": number (required, must be valid health type ID),
    "value": number (required, positive number within typical range),
    "unit": string (required, must match health type unit),
    "recorded_at": string (required, ISO 8601 datetime, cannot be future)
  }
  ```

**Response Specifications:**
- **Success (201 Created)**:
  ```json
  {
    "id": number,
    "type_id": number,
    "value": number,
    "unit": string,
    "recorded_at": string,
    "user_id": string,
    "created_at": string,
    "updated_at": string
  }
  ```
- **Validation Error (422 Unprocessable Entity)**: Invalid type_id, negative value, or future date
- **Authentication Error (401 Unauthorized)**: Missing or invalid authentication

**Validation Rules:**
- `type_id` must be a valid integer referencing existing health type
- `value` must be positive number within health type's typical range
- `recorded_at` cannot be in the future
- `unit` must match the health type's expected unit

#### GET /api/health/records - Retrieve Health Records

**Request Specifications:**
- **Method**: GET
- **Authentication**: Required
- **Query Parameters** (optional):
  - `type_id`: Filter by health type
  - `start_date`: ISO 8601 datetime for range filtering
  - `end_date`: ISO 8601 datetime for range filtering
  - `limit`: Pagination limit
  - `offset`: Pagination offset

**Response Specifications:**
- **Success (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": number,
        "type_id": number,
        "value": number,
        "unit": string,
        "recorded_at": string,
        "healthType": {
          "id": number,
          "slug": string,
          "display_name": string,
          "unit": string
        }
      }
    ],
    "pagination": {
      "total": number,
      "limit": number,
      "offset": number
    }
  }
  ```
- **Authentication Error (401 Unauthorized)**: Missing authentication

**Data Isolation Requirements:**
- Records filtered by authenticated user ID
- No cross-user data access permitted
- Test isolation via x-e2e-random-id header

#### PUT /api/health/records/{id} - Update Health Record

**Request Specifications:**
- **Method**: PUT
- **Path Parameters**: `id` (health record ID)
- **Authentication**: Required
- **Request Body Schema**:
  ```json
  {
    "value": number (optional, positive within range),
    "unit": string (optional, must match type),
    "recorded_at": string (optional, ISO 8601, not future)
  }
  ```

**Response Specifications:**
- **Success (200 OK)**: Updated record object
- **Not Found (404)**: Record doesn't exist or user doesn't own it
- **Validation Error (422)**: Invalid data provided

**Authorization Requirements:**
- User can only update their own records
- Record ownership verified before update

#### DELETE /api/health/records/{id} - Delete Health Record

**Request Specifications:**
- **Method**: DELETE
- **Path Parameters**: `id` (health record ID)
- **Authentication**: Required

**Response Specifications:**
- **Success (204 No Content)**: Record deleted successfully
- **Not Found (404)**: Record doesn't exist or user doesn't own it
- **Authentication Error (401)**: Missing authentication

### 1.2 Health Goals API Requirements

#### POST /api/health/goals - Create Health Goal

**Request Specifications:**
- **Method**: POST
- **Authentication**: Required
- **Request Body Schema**:
  ```json
  {
    "type_id": number (required, valid health type),
    "target_value": number (required, positive),
    "target_date": string (required, ISO 8601, future date),
    "status": string (required, enum: "active", "completed", "paused")
  }
  ```

**Response Specifications:**
- **Success (201 Created)**: Goal object with generated ID
- **Validation Error (422)**: Past target date or invalid status

**Validation Rules:**
- `target_date` must be in the future
- `status` must be one of: "active", "completed", "paused"
- `target_value` must be positive number

#### GET /api/health/goals - Retrieve Health Goals

**Request Specifications:**
- **Method**: GET
- **Authentication**: Required

**Response Specifications:**
- **Success (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": number,
        "type_id": number,
        "target_value": number,
        "target_date": string,
        "status": string,
        "progress": number,
        "created_at": string
      }
    ]
  }
  ```

#### PATCH /api/health/goals/{id} - Update Goal Status

**Request Specifications:**
- **Method**: PATCH
- **Path Parameters**: `id` (goal ID)
- **Request Body Schema**:
  ```json
  {
    "status": string (required, enum: "active", "completed", "paused")
  }
  ```

**Response Specifications:**
- **Success (200 OK)**: Updated goal object
- **Validation Error (422)**: Invalid status value

### 1.3 Health Reminders API Requirements

#### POST /api/health/reminders - Create Health Reminder

**Request Specifications:**
- **Method**: POST
- **Authentication**: Required
- **Request Body Schema**:
  ```json
  {
    "type_id": number (required, valid health type),
    "cron_expr": string (required, valid cron expression),
    "message": string (required, non-empty),
    "active": boolean (required)
  }
  ```

**Response Specifications:**
- **Success (201 Created)**: Reminder object with ID and next execution time
- **Validation Error (422)**: Invalid cron expression or empty message

**Validation Rules:**
- `cron_expr` must be valid cron expression format
- `message` cannot be empty string
- Cron expression validated for syntax correctness

#### GET /api/health/reminders - Retrieve Health Reminders

**Request Specifications:**
- **Method**: GET
- **Authentication**: Required

**Response Specifications:**
- **Success (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": number,
        "type_id": number,
        "cron_expr": string,
        "message": string,
        "active": boolean,
        "next_execution": string
      }
    ]
  }
  ```

#### PATCH /api/health/reminders/{id} - Update Reminder Status

**Request Specifications:**
- **Method**: PATCH
- **Path Parameters**: `id` (reminder ID)
- **Request Body Schema**:
  ```json
  {
    "active": boolean (required)
  }
  ```

**Response Specifications:**
- **Success (200 OK)**: Updated reminder object

### 1.4 Health Analytics API Requirements

#### GET /api/health/analytics/{type_id} - Retrieve Analytics Data

**Request Specifications:**
- **Method**: GET
- **Path Parameters**: `type_id` (health type ID)
- **Authentication**: Required
- **Query Parameters** (optional):
  - `start_date`: ISO 8601 datetime
  - `end_date`: ISO 8601 datetime

**Response Specifications:**
- **Success (200 OK)**:
  ```json
  {
    "data": [
      {
        "date": string,
        "value": number,
        "count": number
      }
    ],
    "start_date": string,
    "end_date": string,
    "statistics": {
      "average": number,
      "min": number,
      "max": number,
      "trend": string
    }
  }
  ```
- **Not Found (404)**: Invalid health type ID
- **Validation Error (422)**: Invalid date range (end before start)

**Data Aggregation Requirements:**
- Data grouped by date periods
- Statistical calculations (min, max, average)
- Trend analysis over time periods
- Date range filtering support

### 1.5 Health Reminder Trigger API Requirements

#### POST /api/health/reminders/trigger - Trigger Scheduled Reminders

**Request Specifications:**
- **Method**: POST
- **Authentication**: Bearer token with cron secret
- **Headers**:
  ```
  Authorization: Bearer {cron-secret}
  ```

**Response Specifications:**
- **Success (200 OK)**:
  ```json
  {
    "triggered_count": number,
    "execution_time": string
  }
  ```
- **Authentication Error (401)**: Missing or invalid cron secret

**Security Requirements:**
- Dedicated authentication for cron service
- Separate from user authentication
- Bearer token validation required

## 2. Counter API Integration Requirements

### 2.1 Counter Increment API

#### PUT /api/counter - Increment Counter

**Request Specifications:**
- **Method**: PUT
- **Content-Type**: application/json
- **Request Body Schema**:
  ```json
  {
    "increment": number (required, 1-3, positive integer)
  }
  ```
- **Headers**: `x-e2e-random-id` for test isolation

**Response Specifications:**
- **Success (200 OK)**:
  ```json
  {
    "count": number,
    "increment": number,
    "timestamp": string
  }
  ```
- **Validation Error (422)**: Invalid increment value

**Validation Rules:**
- `increment` must be integer between 1 and 3
- Negative values rejected
- Non-numeric values rejected
- Values greater than 3 rejected

**State Management:**
- Counter state persisted between requests
- Isolated by x-e2e-random-id for testing
- Atomic increment operations

## 3. Authentication and Authorization Integration Requirements

### 3.1 Authentication Requirements

**JWT Token Validation:**
- Bearer token format required for protected endpoints
- Token validation middleware on all protected routes
- User context extraction from valid tokens
- Session management and token expiration handling

**User Context Extraction:**
- User ID extracted from authenticated requests
- User information available to service layer
- Request context maintained throughout request lifecycle

### 3.2 Authorization Requirements

**User Data Isolation:**
- All health data filtered by authenticated user ID
- Cross-user data access prevented at API level
- Database queries include user ID constraints
- Resource ownership verification before operations

**Access Control Validation:**
- User can only access their own resources
- CRUD operations restricted to resource owners
- Authorization checks before database operations

### 3.3 Security Headers Requirements

**Authentication Header Patterns:**
- `Authorization: Bearer {token}` for user authentication
- `Authorization: Bearer {cron-secret}` for cron triggers
- `x-e2e-random-id` for test data isolation

**API Key Validation:**
- Separate authentication for automated services
- Cron service authentication via bearer token
- Service-specific authentication patterns

## 4. Data Validation Integration Requirements

### 4.1 Input Validation

**Request Body Validation:**
- JSON schema validation for all POST/PUT requests
- Required field validation
- Data type validation (string, number, boolean)
- Format validation (ISO 8601 dates, cron expressions)

**Query Parameter Validation:**
- Optional parameter type checking
- Date format validation for filtering
- Numeric validation for pagination parameters

### 4.2 Business Rule Validation

**Health Metric Ranges:**
- Value validation against health type typical ranges
- Range boundaries enforced (40-200 kg for weight)
- Custom validation per health metric type

**Date Constraints:**
- Future date validation for health records
- Past date validation for goal target dates
- Date range validation (start before end)

**Cron Expression Validation:**
- Syntax validation for cron expressions
- Format verification (5-field cron format)
- Execution time calculation validation

### 4.3 Error Response Specifications

**Validation Error Format (422):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "value",
      "message": "Value outside typical range",
      "code": "RANGE_ERROR"
    }
  ]
}
```

**HTTP Status Code Patterns:**
- 200: Successful operation
- 201: Resource created successfully
- 204: Resource deleted successfully
- 400: Bad request format
- 401: Authentication required
- 403: Access forbidden
- 404: Resource not found
- 422: Validation error
- 500: Internal server error

## 5. Database Integration Requirements

### 5.1 CRUD Operation Requirements

**Create Operations:**
- Insert with returning clause for created record
- Transaction management for data consistency
- Constraint validation at database level
- Auto-generated timestamps (created_at, updated_at)

**Read Operations:**
- User-filtered queries with WHERE clauses
- JOIN operations for related data (health types)
- Ordering by timestamp (DESC for recent first)
- Pagination support with LIMIT/OFFSET

**Update Operations:**
- Conditional updates with WHERE clauses
- Optimistic locking for concurrent updates
- Partial updates with selective field updates
- Updated timestamp automatic management

**Delete Operations:**
- Soft delete or hard delete based on requirements
- Cascade delete for related records
- Transaction rollback on failure

### 5.2 Data Filtering Requirements

**Type-based Filtering:**
- Filter by health_type_id in WHERE clauses
- Support for multiple type filtering
- Type validation against health_type table

**Date Range Filtering:**
- BETWEEN clauses for date ranges
- GTE/LTE operators for flexible date filtering
- Timezone handling for date comparisons

**Pagination Support:**
- LIMIT clause for result limiting
- OFFSET clause for result skipping
- Total count queries for pagination metadata

### 5.3 Data Aggregation Requirements

**Statistics Calculation:**
- AVG, MIN, MAX, COUNT aggregations
- GROUP BY operations for time-based grouping
- Statistical calculations in service layer

**Trend Analysis:**
- Time-series data aggregation
- Daily, weekly, monthly grouping
- Moving averages and trend calculations

**Data Summarization:**
- Summary statistics per health type
- User-level data summaries
- Performance-optimized aggregation queries

### 5.4 Data Isolation Requirements

**User Data Separation:**
- All queries include user_id WHERE clause
- Row-level security enforcement
- No cross-user data leakage

**Test Data Isolation:**
- x-e2e-random-id based isolation for tests
- Separate test data namespaces
- Automated test data cleanup

## 6. Service Layer Integration Requirements

### 6.1 Business Logic Requirements

**Value Validation:**
- Health metric range validation
- Unit consistency checking
- Business rule enforcement

**Range Checking:**
- Typical range validation per health type
- Boundary value validation
- Custom range rules per metric

**Temporal Constraints:**
- Future date prevention for records
- Past date requirements for goals
- Date sequence validation

### 6.2 Error Handling Requirements

**Database Error Handling:**
- Connection timeout handling
- Transaction rollback on errors
- Graceful degradation for database issues

**Validation Error Propagation:**
- Service layer validation errors
- Consistent error message formats
- Error code standardization

**Graceful Degradation:**
- Fallback mechanisms for service failures
- Partial functionality during outages
- Error recovery strategies

### 6.3 Performance Requirements

**Query Optimization:**
- Indexed queries for performance
- Efficient JOIN operations
- Query plan optimization

**Connection Management:**
- Connection pooling
- Connection timeout handling
- Resource cleanup

**Caching Strategies:**
- Result caching for frequently accessed data
- Cache invalidation on updates
- Performance monitoring

## 7. External Service Integration Requirements

### 7.1 Cron Service Integration

**Scheduled Task Execution:**
- Cron expression parsing and execution
- Task scheduling and management
- Execution time tracking

**Authentication:**
- Bearer token authentication for cron endpoints
- Service-to-service authentication
- Secure communication channels

**Trigger Management:**
- Manual trigger capabilities
- Automated scheduling
- Execution logging and monitoring

### 7.2 Monitoring Integration

**Health Checks:**
- API endpoint health monitoring
- Database connectivity checks
- Service availability monitoring

**Performance Monitoring:**
- Response time tracking
- Throughput monitoring
- Resource utilization tracking

**Error Tracking:**
- Error rate monitoring
- Exception logging and alerting
- Performance degradation detection

## 8. API Testing Requirements

### 8.1 Test Data Management

**Test Data Isolation:**
- x-e2e-random-id header for request isolation
- Separate test data namespaces
- User-specific test data generation

**Cleanup Procedures:**
- Automated test data cleanup
- Transaction rollback for test isolation
- Resource cleanup after test execution

**Mock Data Strategies:**
- Faker.js for realistic test data generation
- Consistent test data patterns
- Edge case data generation

### 8.2 Concurrent Access Testing

**Multi-user Scenarios:**
- Simultaneous user request testing
- Data isolation verification
- Race condition detection

**Data Consistency:**
- Concurrent update testing
- Transaction isolation verification
- Optimistic locking validation

**Race Condition Handling:**
- Concurrent modification detection
- Atomic operation verification
- Consistency under load

### 8.3 Performance Testing

**Response Time Requirements:**
- API response time benchmarks
- Performance regression detection
- Load testing scenarios

**Load Testing:**
- Concurrent user simulation
- Throughput testing
- Stress testing under high load

**Scalability Testing:**
- Performance under increasing load
- Resource utilization monitoring
- Bottleneck identification

## Integration Patterns Summary

### API Contract Specifications
- RESTful API design patterns
- Consistent request/response formats
- Standard HTTP status code usage
- JSON-based data exchange

### Data Flow Requirements
- Request validation → Business logic → Database operations
- Error handling at each layer
- Response formatting and status codes
- Audit logging for operations

### Security Integration
- Authentication middleware integration
- Authorization checks at service layer
- Data isolation enforcement
- Secure communication protocols

### Testing Integration
- Comprehensive test coverage for all endpoints
- Integration test automation
- Performance and load testing
- Security testing integration

This document provides the complete integration requirements extracted from the test specifications, ensuring all API contracts, service interactions, and integration patterns are clearly defined and testable.