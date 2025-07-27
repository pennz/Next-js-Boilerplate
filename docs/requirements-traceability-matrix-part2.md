# Requirements Traceability Matrix - Part 2: Database and API Implementation Mapping

## Table of Contents
1. [Overview and Navigation](#overview-and-navigation)
2. [Functional Requirements to Database Schema Mapping](#functional-requirements-to-database-schema-mapping)
3. [Database Entities to Requirements Mapping](#database-entities-to-requirements-mapping)
4. [Functional Requirements to API Endpoints Mapping](#functional-requirements-to-api-endpoints-mapping)
5. [API Endpoints to Requirements Mapping](#api-endpoints-to-requirements-mapping)
6. [Data Validation Rules Mapping](#data-validation-rules-mapping)
7. [Business Logic to Implementation Mapping](#business-logic-to-implementation-mapping)

## Overview and Navigation

### Part 2 Scope
This section establishes traceability between functional requirements and their technical implementation through database schema and API endpoints. It bridges business logic with data persistence and service layer implementations.

### Cross-References
- **Part 1**: Business Requirements and Functional Specifications → [requirements-traceability-matrix-part1.md](requirements-traceability-matrix-part1.md)
- **Part 3**: UI Components and User Experience → [requirements-traceability-matrix-part3.md](requirements-traceability-matrix-part3.md)
- **Part 4**: Non-Functional Requirements → [requirements-traceability-matrix-part4.md](requirements-traceability-matrix-part4.md)
- **Part 5**: Test Coverage and Validation → [requirements-traceability-matrix-part5.md](requirements-traceability-matrix-part5.md)
- **Part 6**: Change Impact and Compliance → [requirements-traceability-matrix-part6.md](requirements-traceability-matrix-part6.md)

## Functional Requirements to Database Schema Mapping

### Health Management Schema Mapping

#### Health Records and Types
| Functional Requirement | Database Entity | Schema Implementation | Business Rules |
|----------------------|-----------------|----------------------|----------------|
| FR-HLT-001: Configurable health metric types | `health_type` | `id`, `name`, `unit`, `data_type`, `validation_rules` | Extensible type system |
| FR-HLT-002: Validate health data inputs | `health_record` | Type constraints, check constraints | Data type validation at DB level |
| FR-HLT-004: Store health records with user association | `health_record` | `user_id` FK, `health_type_id` FK, `value`, `recorded_at` | User data isolation |
| FR-HLT-005: Prevent duplicate records | `health_record` | Unique constraint on (`user_id`, `health_type_id`, `recorded_at`) | Temporal uniqueness |

#### Health Goals and Progress
| Functional Requirement | Database Entity | Schema Implementation | Business Rules |
|----------------------|-----------------|----------------------|----------------|
| FR-HLT-010: Health goal creation | `health_goal` | `id`, `user_id`, `health_type_id`, `target_value`, `target_date` | Goal definition structure |
| FR-HLT-011: Track goal progress | `health_goal` + `health_record` | Query joins for progress calculation | Progress derivation from records |
| FR-HLT-012: Goal achievement metrics | Calculated field | Derived from `health_record` aggregations | Real-time calculation |

#### Health Reminders System
| Functional Requirement | Database Entity | Schema Implementation | Business Rules |
|----------------------|-----------------|----------------------|----------------|
| FR-HLT-014: Reminder scheduling | `health_reminder` | `id`, `user_id`, `health_type_id`, `frequency`, `time`, `is_active` | Scheduling parameters |
| FR-HLT-015: Timely notifications | `health_reminder` | `next_reminder_at` calculated field | Automated scheduling |
| FR-HLT-016: Reminder customization | `health_reminder` | `message`, `snooze_duration`, `reminder_type` | User preferences |

### Exercise Management Schema Mapping

#### Exercise Library and Categorization
| Functional Requirement | Database Entity | Schema Implementation | Business Rules |
|----------------------|-----------------|----------------------|----------------|
| FR-EXE-001: Exercise database | `exercise` | `id`, `name`, `description`, `instructions`, `difficulty_level` | Master exercise data |
| FR-EXE-002: Exercise categorization | `exercise_category`, `exercise_muscle_group` | Many-to-many relationships | Hierarchical organization |
| FR-EXE-003: Exercise search | `exercise` | Indexed fields: `name`, `description`, `category` | Search optimization |
| FR-EXE-004: Exercise details | `exercise` | Full text fields with rich content | Comprehensive information |

#### Training Plans and Structure
| Functional Requirement | Database Entity | Schema Implementation | Business Rules |
|----------------------|-----------------|----------------------|----------------|
| FR-EXE-005: Training plan creation | `training_plan` | `id`, `user_id`, `name`, `description`, `duration_weeks` | Plan metadata |
| FR-EXE-006: Plan templates | `training_plan` | `is_template` boolean, template sharing logic | Template system |
| FR-EXE-007: Plan customization | `training_plan_exercise` | Plan-exercise relationships with parameters | Flexible structure |
| FR-EXE-008: Plan validation | Database constraints | Foreign key constraints, check constraints | Data integrity |

#### Workout Sessions and Performance
| Functional Requirement | Database Entity | Schema Implementation | Business Rules |
|----------------------|-----------------|----------------------|----------------|
| FR-EXE-009: Workout session logging | `workout_session` | `id`, `user_id`, `training_plan_id`, `started_at`, `completed_at` | Session tracking |
| FR-EXE-010: Performance metrics | `workout_exercise` | `session_id`, `exercise_id`, `sets`, `reps`, `weight`, `duration` | Performance data |
| FR-EXE-011: Workout statistics | Calculated aggregations | Derived from `workout_exercise` data | Statistical analysis |

### Authentication and Security Schema Mapping

#### User Management
| Functional Requirement | Database Entity | Schema Implementation | Business Rules |
|----------------------|-----------------|----------------------|----------------|
| FR-AUT-001: Multiple auth methods | Clerk integration | External auth provider, `user_id` references | OAuth and passwordless |
| FR-AUT-003: Session management | Clerk sessions | Token-based session handling | Secure session lifecycle |
| FR-SEC-002: Access controls | Role-based constraints | User-specific data filtering | Data isolation |

## Database Entities to Requirements Mapping

### Core Health Entities

#### health_type Table
| Field | Purpose | Supporting Requirements | Constraints |
|-------|---------|------------------------|-------------|
| `id` | Primary key | FR-HLT-001 | UUID, NOT NULL |
| `name` | Type identifier | FR-HLT-001, FR-I18N-002 | VARCHAR(100), UNIQUE |
| `unit` | Measurement unit | FR-HLT-001, FR-I18N-003 | VARCHAR(20) |
| `data_type` | Value type | FR-HLT-002 | ENUM('integer', 'decimal', 'boolean') |
| `validation_rules` | Validation constraints | FR-HLT-002 | JSONB |
| `created_at` | Audit trail | FR-SEC-003 | TIMESTAMP |

**Requirements Supported**: FR-HLT-001, FR-HLT-002, FR-I18N-002, FR-I18N-003, FR-SEC-003

#### health_record Table
| Field | Purpose | Supporting Requirements | Constraints |
|-------|---------|------------------------|-------------|
| `id` | Primary key | FR-HLT-004 | UUID, NOT NULL |
| `user_id` | User association | FR-HLT-004, FR-SEC-002 | VARCHAR(50), FK to Clerk users |
| `health_type_id` | Metric type | FR-HLT-001, FR-HLT-004 | UUID, FK to health_type |
| `value` | Recorded value | FR-HLT-002, FR-HLT-004 | DECIMAL |
| `recorded_at` | Timestamp | FR-HLT-005 | TIMESTAMP |
| `notes` | Additional context | FR-HLT-004 | TEXT |
| `created_at` | Audit trail | FR-SEC-003 | TIMESTAMP |

**Unique Constraint**: (`user_id`, `health_type_id`, `recorded_at`) - supports FR-HLT-005
**Requirements Supported**: FR-HLT-001, FR-HLT-002, FR-HLT-004, FR-HLT-005, FR-SEC-002, FR-SEC-003

#### health_goal Table
| Field | Purpose | Supporting Requirements | Constraints |
|-------|---------|------------------------|-------------|
| `id` | Primary key | FR-HLT-010 | UUID, NOT NULL |
| `user_id` | User association | FR-HLT-010, FR-SEC-002 | VARCHAR(50), FK to Clerk users |
| `health_type_id` | Goal metric | FR-HLT-010 | UUID, FK to health_type |
| `target_value` | Goal target | FR-HLT-010, FR-HLT-011 | DECIMAL |
| `target_date` | Goal deadline | FR-HLT-010, FR-HLT-011 | DATE |
| `is_active` | Goal status | FR-HLT-013 | BOOLEAN, DEFAULT true |
| `created_at` | Audit trail | FR-SEC-003 | TIMESTAMP |

**Requirements Supported**: FR-HLT-010, FR-HLT-011, FR-HLT-012, FR-HLT-013, FR-SEC-002, FR-SEC-003

### Exercise Management Entities

#### exercise Table
| Field | Purpose | Supporting Requirements | Constraints |
|-------|---------|------------------------|-------------|
| `id` | Primary key | FR-EXE-001 | UUID, NOT NULL |
| `name` | Exercise name | FR-EXE-001, FR-EXE-003 | VARCHAR(200), INDEXED |
| `description` | Exercise details | FR-EXE-004 | TEXT |
| `instructions` | How to perform | FR-EXE-004 | TEXT |
| `difficulty_level` | Exercise difficulty | FR-EXE-002, FR-EXE-003 | ENUM('beginner', 'intermediate', 'advanced') |
| `equipment_needed` | Required equipment | FR-EXE-002, FR-EXE-003 | VARCHAR(500) |
| `created_at` | Audit trail | FR-SEC-003 | TIMESTAMP |

**Full-text Search Index**: (`name`, `description`) - supports FR-EXE-003
**Requirements Supported**: FR-EXE-001, FR-EXE-002, FR-EXE-003, FR-EXE-004, FR-SEC-003

#### training_plan Table
| Field | Purpose | Supporting Requirements | Constraints |
|-------|---------|------------------------|-------------|
| `id` | Primary key | FR-EXE-005 | UUID, NOT NULL |
| `user_id` | Plan owner | FR-EXE-005, FR-SEC-002 | VARCHAR(50), FK to Clerk users |
| `name` | Plan name | FR-EXE-005 | VARCHAR(200) |
| `description` | Plan details | FR-EXE-005 | TEXT |
| `duration_weeks` | Plan duration | FR-EXE-005, FR-EXE-008 | INTEGER, CHECK > 0 |
| `is_template` | Template flag | FR-EXE-006 | BOOLEAN, DEFAULT false |
| `is_active` | Plan status | FR-EXE-005 | BOOLEAN, DEFAULT true |
| `created_at` | Audit trail | FR-SEC-003 | TIMESTAMP |

**Requirements Supported**: FR-EXE-005, FR-EXE-006, FR-EXE-008, FR-SEC-002, FR-SEC-003

### Relationship and Junction Tables

#### training_plan_exercise Table
| Field | Purpose | Supporting Requirements | Constraints |
|-------|---------|------------------------|-------------|
| `training_plan_id` | Plan reference | FR-EXE-007 | UUID, FK to training_plan |
| `exercise_id` | Exercise reference | FR-EXE-007 | UUID, FK to exercise |
| `week_number` | Plan week | FR-EXE-007, FR-EXE-008 | INTEGER, CHECK > 0 |
| `day_number` | Plan day | FR-EXE-007, FR-EXE-008 | INTEGER, CHECK 1-7 |
| `sets` | Target sets | FR-EXE-007 | INTEGER |
| `reps` | Target reps | FR-EXE-007 | INTEGER |
| `weight` | Target weight | FR-EXE-007 | DECIMAL |
| `rest_seconds` | Rest period | FR-EXE-007 | INTEGER |

**Composite Primary Key**: (`training_plan_id`, `exercise_id`, `week_number`, `day_number`)
**Requirements Supported**: FR-EXE-007, FR-EXE-008

## Functional Requirements to API Endpoints Mapping

### Health Management API Endpoints

#### Health Records API
| Functional Requirement | HTTP Method | Endpoint | Request/Response Schema | Authentication |
|----------------------|-------------|----------|------------------------|----------------|
| FR-HLT-004: Store health records | POST | `/api/health/records` | `CreateHealthRecordSchema` | Required |
| FR-HLT-004: Retrieve health records | GET | `/api/health/records` | Query params + pagination | Required |
| FR-HLT-006: Health data visualization | GET | `/api/health/records/analytics` | Analytics response schema | Required |
| FR-HLT-009: Export health data | GET | `/api/health/records/export` | File download (CSV/JSON) | Required |

#### Health Goals API
| Functional Requirement | HTTP Method | Endpoint | Request/Response Schema | Authentication |
|----------------------|-------------|----------|------------------------|----------------|
| FR-HLT-010: Create health goals | POST | `/api/health/goals` | `CreateHealthGoalSchema` | Required |
| FR-HLT-011: Track goal progress | GET | `/api/health/goals/{id}/progress` | Progress calculation response | Required |
| FR-HLT-013: Manage goals | PUT/DELETE | `/api/health/goals/{id}` | `UpdateHealthGoalSchema` | Required |

#### Health Reminders API
| Functional Requirement | HTTP Method | Endpoint | Request/Response Schema | Authentication |
|----------------------|-------------|----------|------------------------|----------------|
| FR-HLT-014: Create reminders | POST | `/api/health/reminders` | `CreateReminderSchema` | Required |
| FR-HLT-016: Customize reminders | PUT | `/api/health/reminders/{id}` | `UpdateReminderSchema` | Required |
| FR-HLT-017: Manage reminders | PATCH | `/api/health/reminders/{id}/snooze` | Snooze action schema | Required |

### Exercise Management API Endpoints

#### Exercise Library API
| Functional Requirement | HTTP Method | Endpoint | Request/Response Schema | Authentication |
|----------------------|-------------|----------|------------------------|----------------|
| FR-EXE-001: Exercise database | GET | `/api/exercises` | Exercise list with pagination | Optional |
| FR-EXE-003: Exercise search | GET | `/api/exercises/search` | Query params + filters | Optional |
| FR-EXE-004: Exercise details | GET | `/api/exercises/{id}` | Detailed exercise response | Optional |

#### Training Plans API
| Functional Requirement | HTTP Method | Endpoint | Request/Response Schema | Authentication |
|----------------------|-------------|----------|------------------------|----------------|
| FR-EXE-005: Create training plans | POST | `/api/training-plans` | `CreateTrainingPlanSchema` | Required |
| FR-EXE-006: Plan templates | GET | `/api/training-plans/templates` | Template list response | Optional |
| FR-EXE-007: Plan customization | PUT | `/api/training-plans/{id}` | `UpdateTrainingPlanSchema` | Required |

#### Workout Sessions API
| Functional Requirement | HTTP Method | Endpoint | Request/Response Schema | Authentication |
|----------------------|-------------|----------|------------------------|----------------|
| FR-EXE-009: Log workout sessions | POST | `/api/workout-sessions` | `CreateWorkoutSessionSchema` | Required |
| FR-EXE-010: Performance metrics | POST | `/api/workout-sessions/{id}/exercises` | `LogWorkoutExerciseSchema` | Required |
| FR-EXE-011: Workout statistics | GET | `/api/workout-sessions/analytics` | Analytics response schema | Required |

### Authentication and Security API Endpoints

#### User Management API
| Functional Requirement | HTTP Method | Endpoint | Request/Response Schema | Authentication |
|----------------------|-------------|----------|------------------------|----------------|
| FR-AUT-001: Authentication methods | POST | `/api/auth/signin` | Clerk integration | N/A (Clerk handled) |
| FR-AUT-003: Session management | GET | `/api/auth/session` | Session validation | Required |
| FR-SEC-003: Audit logging | GET | `/api/user/audit-log` | Audit entries response | Required |

## API Endpoints to Requirements Mapping

### Health Records Endpoints Analysis

#### POST /api/health/records
**Supporting Requirements**: FR-HLT-001, FR-HLT-002, FR-HLT-003, FR-HLT-004, FR-HLT-005
- **Validation**: Zod schema validation supports FR-HLT-002
- **User Association**: Clerk user ID supports FR-HLT-004
- **Duplicate Prevention**: Database constraint supports FR-HLT-005
- **Real-time Response**: Immediate validation feedback supports FR-HLT-003

#### GET /api/health/records
**Supporting Requirements**: FR-HLT-004, FR-HLT-006, FR-HLT-007
- **Data Filtering**: Query parameters support FR-HLT-007
- **User Isolation**: User-specific data access supports FR-HLT-004, FR-SEC-002
- **Pagination**: Performance optimization for large datasets

#### GET /api/health/records/analytics
**Supporting Requirements**: FR-HLT-006, FR-HLT-008, FR-HLT-011
- **Data Visualization**: Chart data generation supports FR-HLT-006
- **Statistical Analysis**: Metric calculations support FR-HLT-008
- **Goal Progress**: Goal comparison analysis supports FR-HLT-011

### Exercise Management Endpoints Analysis

#### GET /api/exercises/search
**Supporting Requirements**: FR-EXE-003, FR-EXE-002, FR-EXE-004
- **Search Algorithm**: Full-text search on indexed fields
- **Category Filtering**: Exercise categorization support
- **Performance**: Optimized queries with proper indexing
- **Public Access**: No authentication required for exercise discovery

#### POST /api/training-plans
**Supporting Requirements**: FR-EXE-005, FR-EXE-007, FR-EXE-008
- **Plan Structure**: Complex nested validation for plan exercises
- **User Association**: Authenticated user as plan owner
- **Validation**: Business rule enforcement through Zod schemas
- **Template Support**: Optional template creation flag

### API Security and Performance Mapping

#### Rate Limiting Implementation
| Endpoint Category | Rate Limit | Supporting Requirements | Implementation |
|------------------|------------|------------------------|----------------|
| Health Records | 100/hour | FR-SEC-001, Performance | Arcjet rate limiting |
| Exercise Library | 1000/hour | FR-EXE-003, Performance | Higher limit for read operations |
| Authentication | 10/minute | FR-AUT-001, FR-SEC-001 | Strict limits for auth endpoints |
| Analytics | 50/hour | FR-HLT-006, FR-EXE-011 | Moderate limits for compute-intensive ops |

#### Authentication Requirements
| Endpoint Pattern | Auth Required | User Isolation | Supporting Requirements |
|-----------------|---------------|----------------|------------------------|
| `/api/health/*` | Yes | User-specific data | FR-HLT-004, FR-SEC-002 |
| `/api/training-plans/*` | Yes | User-specific plans | FR-EXE-005, FR-SEC-002 |
| `/api/exercises/*` | No | Public data | FR-EXE-001, FR-EXE-003 |
| `/api/workout-sessions/*` | Yes | User-specific sessions | FR-EXE-009, FR-SEC-002 |

## Data Validation Rules Mapping

### Application-Level Validation (Zod Schemas)

#### Health Record Validation
```typescript
// Supporting FR-HLT-002, FR-HLT-003
const CreateHealthRecordSchema = z.object({
  healthTypeId: z.string().uuid(),
  value: z.number().positive(),
  recordedAt: z.date(),
  notes: z.string().max(500).optional(),
});
```
**Requirements Supported**: FR-HLT-002 (input validation), FR-HLT-003 (real-time feedback)

#### Health Goal Validation
```typescript
// Supporting FR-HLT-010, FR-HLT-011
const CreateHealthGoalSchema = z.object({
  healthTypeId: z.string().uuid(),
  targetValue: z.number().positive(),
  targetDate: z.date().min(new Date()),
});
```
**Requirements Supported**: FR-HLT-010 (goal structure), FR-HLT-011 (progress tracking setup)

### Database-Level Validation

#### Constraint Mappings
| Database Constraint | Supporting Requirements | Business Rule |
|--------------------|------------------------|---------------|
| `health_record.value > 0` | FR-HLT-002 | Positive health values |
| `UNIQUE(user_id, health_type_id, recorded_at)` | FR-HLT-005 | No duplicate records |
| `health_goal.target_date >= CURRENT_DATE` | FR-HLT-010 | Future goal dates |
| `training_plan.duration_weeks > 0` | FR-EXE-008 | Valid plan duration |

#### Foreign Key Relationships
| Relationship | Supporting Requirements | Data Integrity |
|-------------|------------------------|----------------|
| `health_record.user_id → users` | FR-HLT-004, FR-SEC-002 | User data isolation |
| `health_record.health_type_id → health_type` | FR-HLT-001, FR-HLT-004 | Valid metric types |
| `training_plan.user_id → users` | FR-EXE-005, FR-SEC-002 | Plan ownership |
| `workout_session.training_plan_id → training_plan` | FR-EXE-009 | Session-plan association |

### Validation Error Handling

#### Client-Side Validation
- **Real-time Feedback**: Form validation with immediate error display (FR-HLT-003)
- **Type Safety**: TypeScript integration with Zod schemas
- **User Experience**: Contextual error messages with i18n support (FR-I18N-002)

#### Server-Side Validation
- **Security**: Always validate on server regardless of client validation
- **Audit Trail**: Log validation failures for security monitoring (FR-SEC-003)
- **Error Response**: Structured error responses with field-specific messages

## Business Logic to Implementation Mapping

### Health Management Business Logic

#### Health Record Processing
| Business Rule | Implementation | Supporting Requirements | Location |
|---------------|----------------|------------------------|----------|
| Validate metric value ranges | Zod schema + custom validators | FR-HLT-002 | `src/validations/HealthRecord.ts` |
| Calculate health trends | Statistical aggregation queries | FR-HLT-006, FR-HLT-008 | `src/services/HealthAnalytics.ts` |
| Track goal progress | Progress calculation algorithm | FR-HLT-011, FR-HLT-012 | `src/services/HealthGoal.ts` |
| Generate reminder schedule | Cron-based scheduling logic | FR-HLT-014, FR-HLT-015 | `src/services/HealthReminder.ts` |

#### Temporal Constraints
| Constraint | Implementation | Supporting Requirements | Notes |
|------------|----------------|------------------------|-------|
| No future health records | Date validation in schema | FR-HLT-002 | Prevents data entry errors |
| Goal dates must be future | Database and app validation | FR-HLT-010 | Ensures meaningful goals |
| Reminder frequency limits | Business rule validation | FR-HLT-016 | Prevents spam notifications |

### Exercise Management Business Logic

#### Training Plan Validation
| Business Rule | Implementation | Supporting Requirements | Location |
|---------------|----------------|------------------------|----------|
| Plan structure validation | Complex Zod schema validation | FR-EXE-008 | `src/validations/TrainingPlan.ts` |
| Exercise sequence validation | Custom validation logic | FR-EXE-007, FR-EXE-008 | `src/services/TrainingPlan.ts` |
| Workout capacity limits | Resource constraint validation | FR-EXE-008 | Application-level checks |

#### Performance Tracking Logic
| Calculation | Implementation | Supporting Requirements | Notes |
|-------------|----------------|------------------------|-------|
| Workout statistics | Aggregation queries with time windows | FR-EXE-011 | Rolling averages, PRs |
| Progress visualization | Data transformation for charts | FR-EXE-012 | UI-ready data format |
| Performance trends | Statistical analysis algorithms | FR-EXE-011, FR-EXE-012 | Machine learning potential |

### Data Integrity and Quality Rules

#### Data Quality Enforcement
| Quality Rule | Implementation | Supporting Requirements | Impact |
|-------------|----------------|------------------------|--------|
| User data isolation | Row-level security + app filtering | FR-SEC-002 | Privacy and security |
| Temporal data consistency | Database triggers + app logic | FR-HLT-005, FR-EXE-009 | Data reliability |
| Reference data integrity | Foreign key constraints | All FK relationships | System consistency |
| Audit trail completeness | Automatic timestamp generation | FR-SEC-003 | Compliance and debugging |

#### Bulk Operation Limits
| Operation | Limit | Supporting Requirements | Rationale |
|-----------|-------|------------------------|-----------|
| Health record batch insert | 100 records/request | Performance, FR-HLT-004 | Prevent system overload |
| Exercise search results | 50 results/page | Performance, FR-EXE-003 | Optimal UX performance |
| Analytics time range | 2 years max | Performance, FR-HLT-006 | Balance detail vs performance |

### Integration Patterns

#### Service Layer Architecture
- **Health Services**: `HealthRecord`, `HealthGoal`, `HealthReminder`, `HealthAnalytics`
- **Exercise Services**: `Exercise`, `TrainingPlan`, `WorkoutSession`, `ExerciseAnalytics`
- **User Services**: Authentication delegation to Clerk, user data management
- **Common Services**: Validation, Analytics, Notification, Audit

#### Cross-Domain Business Logic
| Integration Point | Implementation | Supporting Requirements | Notes |
|------------------|----------------|------------------------|-------|
| Health + Exercise correlation | Joint analytics queries | FR-HLT-006, FR-EXE-011 | Holistic user insights |
| Goal-driven exercise planning | Recommendation algorithms | FR-HLT-011, FR-EXE-005 | Personalized training |
| Performance impact on health | Data correlation analysis | FR-HLT-008, FR-EXE-012 | Health-fitness feedback loop |

This completes Part 2 of the Requirements Traceability Matrix, establishing comprehensive mapping between functional requirements and their technical implementation through database schema and API endpoints. Refer to other parts for UI implementation, testing coverage, and compliance traceability.
