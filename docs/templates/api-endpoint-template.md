# API Endpoint Documentation Template

> **Template Version**: 1.0.0  
> **Last Updated**: {YYYY-MM-DD}  
> **Status**: {Draft | Review | Approved | Deprecated}

## Endpoint Overview

### Basic Information
- **Method**: `{HTTP_METHOD}`
- **Path**: `/{locale}/(auth|marketing)/api/{endpoint_path}`
- **Purpose**: {Brief description of what this endpoint does}
- **Category**: {Health Records | Goals | Reminders | Analytics | Behavior | Profile | Marketing}

### Quick Reference
```http
{HTTP_METHOD} /{locale}/(auth|marketing)/api/{endpoint_path}
Authorization: Bearer {token}
Content-Type: application/json
```

## Authentication & Authorization

### Authentication Requirements
- **Required**: {Yes | No}
- **Method**: {Clerk JWT | Bearer Token | None}
- **Header**: `Authorization: Bearer {token}`

### Authorization Rules
- **Resource Ownership**: {Description of ownership requirements}
- **User Permissions**: {Required permissions or roles}
- **Special Cases**: {Any special authorization logic}

### Authentication Examples
```typescript
// Standard Clerk JWT authentication
const headers = {
  'Authorization': `Bearer ${clerkToken}`,
  'Content-Type': 'application/json'
};

// Cron service authentication (if applicable)
const headers = {
  'Authorization': `Bearer ${process.env.CRON_SECRET}`,
  'Content-Type': 'application/json'
};
```

## Rate Limiting & Security

### Rate Limiting
- **Enabled**: {Yes | No}
- **Method**: {Arcjet Token Bucket | IP-based | User-based}
- **Limits**: {X requests per Y seconds}
- **Burst Capacity**: {Maximum burst requests}

### Security Features
- **Arcjet Shield**: {Enabled | Disabled}
- **Bot Protection**: {Enabled | Disabled}
- **Input Validation**: {Zod schemas | Custom validation}
- **CORS Policy**: {Describe CORS configuration}

### Rate Limiting Configuration
```typescript
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    tokenBucket({
      mode: 'LIVE',
      characteristics: ['userId'],
      refillRate: {X}, // requests per interval
      interval: {Y}, // seconds
      capacity: {Z}, // maximum tokens
    }),
  ],
});
```

## Feature Flags

### Required Feature Flags
- **Flag Name**: `{FEATURE_FLAG_NAME}`
- **Default Value**: `{true | false}`
- **Impact**: {Description of what happens when disabled}

### Feature Flag Check
```typescript
if (!process.env.{FEATURE_FLAG_NAME}) {
  return NextResponse.json(
    { error: '{Feature name} is not enabled' },
    { status: 503 }
  );
}
```

## Request Specification

### Path Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `{param}` | `{type}` | {Yes/No} | {Description} | `{example}` |

### Query Parameters
| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|----------|---------|------------|-------------|
| `{param}` | `{type}` | {Yes/No} | `{default}` | `{validation_rule}` | {Description} |

### Request Headers
| Header | Required | Description | Example |
|--------|----------|-------------|---------|
| `Authorization` | {Yes/No} | {Description} | `Bearer {token}` |
| `Content-Type` | {Yes/No} | {Description} | `application/json` |
| `{custom_header}` | {Yes/No} | {Description} | `{example}` |

### Request Body Schema
```typescript
{
  // Required fields
  {field_name}: {type}, // {description} - {validation_rules}
  
  // Optional fields
  {field_name}?: {type}, // {description} - {validation_rules}
}
```

### Request Body Example
```json
{
  "{field_name}": "{example_value}",
  "{field_name}": {example_value}
}
```

## Response Specification

### Success Response Schema
```typescript
// HTTP 200/201 Response
{
  // Data fields
  {field_name}: {type}, // {description}
  
  // Metadata (if applicable)
  message?: string,
  pagination?: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  },
  meta?: {
    // Additional metadata
  }
}
```

### Success Response Example
```json
{
  "{field_name}": "{example_value}",
  "message": "Operation completed successfully"
}
```

### Error Response Schema
```typescript
{
  error: string,           // Human-readable error message
  code?: string,          // Machine-readable error code
  details?: object        // Additional error context
}
```

### HTTP Status Codes
| Status | Description | When Used |
|--------|-------------|-----------|
| `200` | OK | Successful GET, PUT, PATCH operations |
| `201` | Created | Successful POST operations |
| `204` | No Content | Successful DELETE operations |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Authentication required or invalid |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found or access denied |
| `409` | Conflict | Resource conflict (e.g., duplicate) |
| `422` | Unprocessable Entity | Validation errors |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server errors |
| `503` | Service Unavailable | Feature disabled by flag |

## Validation Rules

### Input Validation
- **Schema Validation**: {Zod schema name or description}
- **Business Rules**: {List of business logic validations}
- **Cross-field Validation**: {Dependencies between fields}

### Validation Schema
```typescript
const {SchemaName} = z.object({
  {field_name}: z.{type}()
    .{validation_method}({constraint})
    .{validation_method}({constraint}),
});
```

### Common Validation Patterns
- **Date Validation**: {Date range constraints}
- **Numeric Validation**: {Range constraints}
- **String Validation**: {Length, format constraints}
- **Enum Validation**: {Allowed values}

### Validation Error Response
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "{field_name}": ["Error message 1", "Error message 2"],
    "{another_field}": ["Error message"]
  }
}
```

## Business Logic

### Core Functionality
{Detailed description of what the endpoint does from a business perspective}

### Data Processing Steps
1. {Step 1 description}
2. {Step 2 description}
3. {Step 3 description}

### Business Rules
- **Rule 1**: {Description and rationale}
- **Rule 2**: {Description and rationale}
- **Rule 3**: {Description and rationale}

### Side Effects
- **Database Changes**: {What data is modified}
- **External Services**: {Any external API calls}
- **Notifications**: {Any notifications triggered}

## Integration Examples

### Basic Usage
```typescript
// Basic request example
const response = await fetch('/{locale}/(auth)/api/{endpoint_path}', {
  method: '{HTTP_METHOD}',
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    // Request body
  })
});

const data = await response.json();
```

### Advanced Usage
```typescript
// Advanced usage with error handling
try {
  const response = await fetch('/{locale}/(auth)/api/{endpoint_path}', {
    method: '{HTTP_METHOD}',
    headers: {
      'Authorization': `Bearer ${clerkToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // Request body
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  const data = await response.json();
  // Handle success
} catch (error) {
  // Handle error
  console.error('API Error:', error);
}
```

### React Hook Example
```typescript
// Custom React hook for this endpoint
const use{EndpointName} = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {actionName} = async (requestData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/{locale}/(auth)/api/{endpoint_path}', {
        method: '{HTTP_METHOD}',
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, {actionName} };
};
```

## Error Handling

### Common Error Scenarios
| Error Type | HTTP Status | Error Code | Description | Resolution |
|------------|-------------|------------|-------------|------------|
| {Error Type} | `{status}` | `{CODE}` | {Description} | {How to resolve} |

### Error Handling Best Practices
- **Client-side**: {Guidelines for handling errors in client code}
- **Retry Logic**: {When and how to implement retries}
- **User Feedback**: {How to present errors to users}

### Error Response Examples
```json
// Validation Error
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field_name": ["Field is required"]
  }
}

// Rate Limit Error
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED"
}

// Authorization Error
{
  "error": "Access denied",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

## Performance Considerations

### Response Time
- **Expected Response Time**: {X}ms under normal load
- **Timeout**: {Y}s maximum response time
- **Performance Factors**: {What affects performance}

### Caching
- **Cache Strategy**: {In-memory | Redis | CDN | None}
- **Cache Duration**: {X} minutes/hours
- **Cache Invalidation**: {When cache is cleared}

### Optimization Tips
- **Pagination**: {Use pagination for large datasets}
- **Filtering**: {Use query parameters to reduce data}
- **Batch Operations**: {Consider batch endpoints for multiple operations}

## Testing

### Unit Tests
- **Test File**: `{path_to_test_file}`
- **Coverage**: {X}% line coverage
- **Key Test Cases**: {List important test scenarios}

### Integration Tests
- **Test File**: `{path_to_integration_test}`
- **Test Scenarios**: {List integration test cases}

### E2E Tests
- **Test File**: `{path_to_e2e_test}`
- **User Flows**: {List end-to-end user flows tested}

### Test Examples
```typescript
// Example test case
describe('{Endpoint Name}', () => {
  it('should {test_scenario}', async () => {
    // Test implementation
  });
});
```

## Related Endpoints

### Dependencies
- **Upstream**: {Endpoints this depends on}
- **Downstream**: {Endpoints that depend on this}

### Related Operations
| Endpoint | Relationship | Description |
|----------|--------------|-------------|
| `{endpoint}` | {relationship_type} | {Description} |

### Workflow Integration
{Description of how this endpoint fits into larger workflows}

## Changelog

### Version History
| Version | Date | Changes | Breaking |
|---------|------|---------|----------|
| `{version}` | {YYYY-MM-DD} | {Description of changes} | {Yes/No} |

### Migration Guide
{Instructions for migrating from previous versions, if applicable}

### Deprecation Notice
{If applicable, information about deprecation timeline and alternatives}

## Additional Resources

### Documentation Links
- **OpenAPI Spec**: `{path_to_openapi_spec}`
- **Zod Schema**: `{path_to_zod_schema}`
- **Database Schema**: `{path_to_db_schema}`

### Code References
- **Route Handler**: `{path_to_route_handler}`
- **Service Layer**: `{path_to_service}`
- **Validation Schema**: `{path_to_validation}`

### External Resources
- **API Client Libraries**: {Links to client libraries}
- **Postman Collection**: {Link to Postman collection}
- **Interactive Documentation**: {Link to interactive docs}

---

## Template Usage Instructions

### How to Use This Template
1. **Copy this template** for each new API endpoint
2. **Replace all placeholders** (marked with `{placeholder}`) with actual values
3. **Remove sections** that don't apply to your endpoint
4. **Add custom sections** as needed for specific requirements
5. **Update the changelog** when making changes
6. **Link to related documentation** and resources

### Placeholder Reference
- `{HTTP_METHOD}`: GET, POST, PUT, PATCH, DELETE
- `{locale}`: Language locale parameter (e.g., 'en', 'es')
- `{endpoint_path}`: The specific API path
- `{YYYY-MM-DD}`: Date in ISO format
- `{type}`: TypeScript/JSON type
- `{field_name}`: Actual field names
- `{example_value}`: Example values for fields

### Quality Checklist
- [ ] All placeholders replaced with actual values
- [ ] Request/response examples are valid JSON
- [ ] All HTTP status codes are documented
- [ ] Authentication requirements are clear
- [ ] Validation rules are comprehensive
- [ ] Error scenarios are covered
- [ ] Integration examples work
- [ ] Related endpoints are linked
- [ ] Changelog is updated

### Maintenance Notes
- **Review Frequency**: Monthly
- **Update Triggers**: Code changes, new features, bug fixes
- **Ownership**: {Team/Person responsible for maintenance}
- **Approval Process**: {Review and approval workflow}