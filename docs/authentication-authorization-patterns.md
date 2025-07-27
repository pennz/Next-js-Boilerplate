# Authentication and Authorization Patterns

This document provides a comprehensive analysis of authentication and authorization patterns implemented in the Next.js Boilerplate application. The system uses Clerk for authentication, Arcjet for security, and implements robust multi-tenant data isolation patterns.

## Table of Contents

1. [Clerk Authentication Integration](#clerk-authentication-integration)
2. [Middleware Authentication Flow](#middleware-authentication-flow)
3. [Protected Route Patterns](#protected-route-patterns)
4. [User Context and Authorization](#user-context-and-authorization)
5. [Route-Level Security](#route-level-security)
6. [API Key Authentication](#api-key-authentication)
7. [Security Headers and CORS](#security-headers-and-cors)
8. [Session Management](#session-management)
9. [Authorization Patterns](#authorization-patterns)
10. [Authentication Error Handling](#authentication-error-handling)
11. [Feature Flag Security](#feature-flag-security)
12. [Multi-tenant Security](#multi-tenant-security)

## Clerk Authentication Integration

### JWT Authentication Patterns

The application uses Clerk for JWT-based authentication with server-side user context extraction:

```typescript
import { currentUser } from '@clerk/nextjs/server';

// Authentication helper function
const getCurrentUserId = async () => {
  const user = await currentUser();
  if (!user) {
    return null;
  }
  return user.id;
};
```

### User Context Extraction

User authentication is handled consistently across all protected API endpoints:

- **User ID Extraction**: Uses `currentUser()` from Clerk to get authenticated user context
- **Session Validation**: Automatic JWT token validation through Clerk middleware
- **User Object Access**: Full user object available for additional claims and metadata

### Environment Configuration

Clerk authentication requires specific environment variables:

```typescript
// Required Clerk configuration
CLERK_SECRET_KEY: z.string().min(1),
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
```

## Middleware Authentication Flow

### Conditional Authentication Middleware

The middleware implements conditional authentication based on route patterns:

```typescript
// Route matchers for different authentication requirements
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/:locale/dashboard(.*)',
]);

const isAuthPage = createRouteMatcher([
  '/sign-in(.*)',
  '/:locale/sign-in(.*)',
  '/sign-up(.*)',
  '/:locale/sign-up(.*)',
]);
```

### Authentication Flow Logic

```typescript
// Conditional middleware execution
if (isAuthPage(request) || isProtectedRoute(request)) {
  return clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
      const locale = req.nextUrl.pathname.match(/(\/.*)\/dashboard/)?.at(1) ?? '';
      const signInUrl = new URL(`${locale}/sign-in`, req.url);

      await auth.protect({
        unauthenticatedUrl: signInUrl.toString(),
      });
    }

    return handleI18nRouting(request);
  })(request, event);
}
```

### Middleware Security Integration

The middleware integrates multiple security layers:

1. **Arcjet Bot Protection**: Blocks malicious bots while allowing legitimate traffic
2. **Clerk Authentication**: Handles user authentication and session management
3. **Internationalization**: Maintains locale-aware routing with authentication

## Protected Route Patterns

### Route Classification

The application categorizes routes into three types:

1. **Public Routes**: No authentication required (marketing pages, API documentation)
2. **Authentication Pages**: Sign-in/sign-up pages with redirect logic
3. **Protected Routes**: Require authentication (dashboard, API endpoints)

### Dashboard Protection

All dashboard routes require authentication:

```typescript
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/:locale/dashboard(.*)',
]);
```

### API Route Protection

API routes under `(auth)` directory are automatically protected:

- `/api/health/records` - Health records management
- `/api/health/goals` - Health goals management
- `/api/health/reminders` - Health reminders management
- `/api/health/analytics` - Health analytics data

### Redirect Patterns

Unauthenticated users are redirected to locale-aware sign-in pages:

```typescript
const locale = req.nextUrl.pathname.match(/(\/.*)\/dashboard/)?.at(1) ?? '';
const signInUrl = new URL(`${locale}/sign-in`, req.url);

await auth.protect({
  unauthenticatedUrl: signInUrl.toString(),
});
```

## User Context and Authorization

### User ID Extraction Pattern

Consistent user ID extraction across all protected endpoints:

```typescript
// Check authentication
const userId = await getCurrentUserId();
if (!userId) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 },
  );
}
```

### Data Isolation Implementation

All database queries include user ID filtering for data isolation:

```typescript
// Example: Health records query with user isolation
const conditions = [eq(healthRecordSchema.userId, userId)];

const records = await db
  .select()
  .from(healthRecordSchema)
  .where(and(...conditions))
  .orderBy(desc(healthRecordSchema.recordedAt));
```

### Resource Ownership Validation

Before updating or deleting resources, ownership is verified:

```typescript
// Check if record exists and belongs to user
const existingRecord = await db
  .select()
  .from(healthRecordSchema)
  .where(
    and(
      eq(healthRecordSchema.id, id),
      eq(healthRecordSchema.userId, userId),
    ),
  );

if (existingRecord.length === 0) {
  return NextResponse.json(
    { error: 'Health record not found or access denied' },
    { status: 404 },
  );
}
```

## Route-Level Security

### Per-Endpoint Authentication

Each API endpoint implements consistent authentication checks:

1. **Feature Flag Validation**: Check if feature is enabled
2. **User Authentication**: Verify user is authenticated
3. **Rate Limiting**: Apply user-specific rate limits
4. **Resource Authorization**: Validate user access to specific resources

### Authentication Flow Pattern

```typescript
export const GET = async (request: NextRequest) => {
  // 1. Check feature flag
  const featureCheck = checkHealthFeatureFlag();
  if (featureCheck) {
    return featureCheck;
  }

  // 2. Check authentication
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Apply rate limiting
  const decision = await aj.protect(request, { userId, requested: 1 });
  if (decision.isDenied()) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 4. Process request with user context
  // ...
};
```

### Rate Limiting Integration

User-specific rate limiting using Arcjet:

```typescript
const aj = arcjet({
  key: Env.ARCJET_KEY!,
  rules: [
    tokenBucket({
      mode: 'LIVE',
      characteristics: ['userId'],
      refillRate: 10,
      interval: 60,
      capacity: 20,
    }),
  ],
});
```

## API Key Authentication

### Cron Service Authentication

External cron services authenticate using bearer tokens:

```typescript
// Authenticate cron service using secret header
const authHeader = (await headers()).get('authorization');
const expectedAuth = `Bearer ${Env.HEALTH_REMINDER_CRON_SECRET}`;

if (!Env.HEALTH_REMINDER_CRON_SECRET || authHeader !== expectedAuth) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 },
  );
}
```

### Secret-Based Authentication

Environment variable configuration for API keys:

```typescript
HEALTH_REMINDER_CRON_SECRET: z.string().min(1).optional(),
```

### Bearer Token Pattern

Standard bearer token authentication for service-to-service communication:

- **Header Format**: `Authorization: Bearer <secret>`
- **Validation**: Exact string comparison with environment secret
- **Error Response**: 401 Unauthorized for invalid tokens

## Security Headers and CORS

### Arcjet Security Integration

The application uses Arcjet for comprehensive security:

```typescript
// Base Arcjet configuration with Shield protection
export default arcjet({
  key: process.env.ARCJET_KEY ?? '',
  characteristics: ['ip.src'],
  rules: [
    shield({
      mode: 'LIVE', // Blocks requests in production
    }),
  ],
});
```

### Bot Protection

Middleware-level bot detection and filtering:

```typescript
const aj = arcjet.withRule(
  detectBot({
    mode: 'LIVE',
    allow: [
      'CATEGORY:SEARCH_ENGINE', // Allow search engines
      'CATEGORY:PREVIEW', // Allow preview links
      'CATEGORY:MONITOR', // Allow uptime monitoring
    ],
  }),
);
```

### Request Filtering

Automatic blocking of malicious requests:

```typescript
const decision = await aj.protect(request);
if (decision.isDenied()) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Session Management

### JWT Token Validation

Clerk handles JWT token validation automatically:

- **Token Extraction**: Automatic extraction from cookies/headers
- **Signature Verification**: Cryptographic signature validation
- **Expiration Checking**: Automatic token expiration handling
- **Refresh Logic**: Transparent token refresh for active sessions

### User Session Context

Session context is available throughout the application:

```typescript
const user = await currentUser();
// Access to user.id, user.emailAddresses, user.firstName, etc.
```

### Session Persistence

- **Cookie-Based**: Secure HTTP-only cookies for session storage
- **Server-Side Validation**: All session validation occurs server-side
- **Automatic Refresh**: Transparent session refresh for active users

## Authorization Patterns

### Resource-Based Authorization

All resources are scoped to the authenticated user:

```typescript
// All queries include user ID filtering
const conditions = [eq(healthRecordSchema.userId, userId)];

// Updates and deletes verify ownership
and(
  eq(healthRecordSchema.id, id),
  eq(healthRecordSchema.userId, userId),
);
```

### Multi-Level Authorization

1. **Route-Level**: Middleware protects entire route groups
2. **Endpoint-Level**: Individual endpoints verify authentication
3. **Resource-Level**: Database queries enforce user isolation
4. **Operation-Level**: CRUD operations validate ownership

### Access Control Patterns

- **Read Operations**: User can only read their own data
- **Write Operations**: User can only create data associated with their ID
- **Update Operations**: User can only update resources they own
- **Delete Operations**: User can only delete resources they own

## Authentication Error Handling

### Standardized Error Responses

Consistent error response format across all endpoints:

```typescript
// Unauthorized access
return NextResponse.json(
  { error: 'Unauthorized' },
  { status: 401 },
);

// Resource not found or access denied
return NextResponse.json(
  { error: 'Health record not found or access denied' },
  { status: 404 },
);

// Rate limiting exceeded
return NextResponse.json(
  { error: 'Too many requests' },
  { status: 429 },
);
```

### Error Status Codes

- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Valid authentication but insufficient permissions
- **404 Not Found**: Resource doesn't exist or user lacks access
- **429 Too Many Requests**: Rate limiting exceeded

### Error Logging

Comprehensive error logging for security monitoring:

```typescript
logger.error('Error retrieving health records', { error, userId });
```

## Feature Flag Security

### Feature-Based Access Control

Feature flags control access to entire API sections:

```typescript
const checkHealthFeatureFlag = () => {
  if (!Env.ENABLE_HEALTH_MGMT) {
    return NextResponse.json(
      { error: 'Health management feature is not enabled' },
      { status: 503 },
    );
  }
  return null;
};
```

### Environment-Based Features

Feature flags are controlled through environment variables:

```typescript
ENABLE_HEALTH_MGMT: z.string().transform(val => val === 'true').optional().default('false'),
```

### Security Implications

- **Service Unavailable**: Returns 503 when features are disabled
- **Early Termination**: Feature checks occur before authentication
- **Consistent Behavior**: All endpoints in a feature group respect the same flag

## Multi-tenant Security

### User Data Isolation

Strict user data isolation at the database level:

```typescript
// All queries include user ID filtering
const records = await db
  .select()
  .from(healthRecordSchema)
  .where(and(
    eq(healthRecordSchema.userId, userId),
    // Additional filters...
  ));
```

### Tenant Boundary Enforcement

- **Database Level**: All queries include user ID in WHERE clauses
- **Application Level**: User context extracted from authenticated session
- **API Level**: Consistent user ID validation across all endpoints

### Cross-Tenant Protection

- **No Cross-User Access**: Users cannot access other users' data
- **Ownership Validation**: All operations verify resource ownership
- **Audit Trail**: All operations logged with user context

### Data Segregation Patterns

1. **Logical Separation**: User ID column in all user-scoped tables
2. **Query Filtering**: Automatic user ID filtering in all queries
3. **Resource Validation**: Ownership checks before modifications
4. **Audit Logging**: User context in all log entries

## Security Best Practices

### Implementation Guidelines

1. **Defense in Depth**: Multiple security layers (middleware, endpoint, database)
2. **Principle of Least Privilege**: Users can only access their own resources
3. **Fail Secure**: Default to denying access when authentication fails
4. **Audit Everything**: Comprehensive logging of all security events

### Security Monitoring

- **Authentication Events**: Login/logout tracking
- **Authorization Failures**: Failed access attempts
- **Rate Limiting**: Request throttling events
- **Feature Flag Changes**: Feature availability modifications

### Compliance Considerations

- **Data Privacy**: User data isolation ensures privacy compliance
- **Access Control**: Granular permissions support compliance requirements
- **Audit Trail**: Comprehensive logging supports compliance auditing
- **Secure Defaults**: Security-first configuration patterns
