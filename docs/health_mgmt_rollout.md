# Health Management Feature Rollout Documentation

## Overview

This document provides comprehensive deployment instructions for the Personal Health Management feature rollout in the Next.js boilerplate application. The feature includes health record tracking, analytics, goal management, and reminder systems.

## Prerequisites

- Database access (staging and production)
- Environment variable configuration access
- Deployment pipeline access
- Monitoring dashboard access
- Feature flag management system

## Phase 1: Environment Setup

### 1.1 Environment Variables

Add the following environment variables to your deployment environments:

#### Required Variables

```bash
# Health Management Feature Flags
ENABLE_HEALTH_MGMT=false  # Start with false for gradual rollout
HEALTH_REMINDER_CRON_SECRET=your-secure-random-secret-here
PROMETHEUS_METRICS_ENABLED=true

# Database (if using separate health DB)
HEALTH_DATABASE_URL=your-health-database-url

# External Services
HEALTH_NOTIFICATION_SERVICE_URL=your-notification-service-url
HEALTH_ANALYTICS_CACHE_TTL=3600
```

#### Development Environment

```bash
# .env.local
ENABLE_HEALTH_MGMT=true
HEALTH_REMINDER_CRON_SECRET=dev-secret-123
PROMETHEUS_METRICS_ENABLED=true
HEALTH_ANALYTICS_CACHE_TTL=300
```

#### Staging Environment

```bash
# .env.staging
ENABLE_HEALTH_MGMT=true
HEALTH_REMINDER_CRON_SECRET=staging-secure-secret-456
PROMETHEUS_METRICS_ENABLED=true
HEALTH_ANALYTICS_CACHE_TTL=1800
```

#### Production Environment

```bash
# .env.production
ENABLE_HEALTH_MGMT=false  # Initially disabled
HEALTH_REMINDER_CRON_SECRET=production-ultra-secure-secret-789
PROMETHEUS_METRICS_ENABLED=true
HEALTH_ANALYTICS_CACHE_TTL=3600
```

### 1.2 Secret Generation

Generate secure secrets for production:

```bash
# Generate HEALTH_REMINDER_CRON_SECRET
openssl rand -hex 32

# Verify secret strength
echo "your-generated-secret" | wc -c  # Should be 64+ characters
```

## Phase 2: Database Migration

### 2.1 Pre-Migration Checklist

- [ ] Database backup completed
- [ ] Migration scripts tested in development
- [ ] Rollback scripts prepared
- [ ] Database connection verified
- [ ] Maintenance window scheduled

### 2.2 Staging Migration

```bash
# 1. Backup staging database
pg_dump -h staging-db-host -U username -d database_name > backup_staging_$(date +%Y%m%d_%H%M%S).sql

# 2. Run health management migrations
npm run db:migrate:staging

# 3. Verify migration success
npm run db:verify:health-tables

# 4. Seed initial health types data
npm run db:seed:health-types:staging

# 5. Run integration tests
npm run test:integration:health
```

### 2.3 Production Migration

```bash
# 1. Enable maintenance mode
kubectl scale deployment app --replicas=0

# 2. Backup production database
pg_dump -h prod-db-host -U username -d database_name > backup_prod_$(date +%Y%m%d_%H%M%S).sql

# 3. Run migrations with transaction safety
BEGIN;
-- Run migration scripts
npm run db:migrate:production
-- Verify tables created
\dt health_*
-- Verify indexes created
\di health_*
COMMIT;

# 4. Seed production health types
npm run db:seed:health-types:production

# 5. Verify data integrity
npm run db:verify:health-schema

# 6. Disable maintenance mode
kubectl scale deployment app --replicas=3
```

### 2.4 Migration Verification

```sql
-- Verify all health tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'health_%' 
AND table_schema = 'public';

-- Verify indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename LIKE 'health_%';

-- Verify foreign key constraints
SELECT conname, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE contype = 'f' 
AND conrelid::regclass::text LIKE 'health_%';

-- Check health types seeded
SELECT COUNT(*) FROM health_type;
```

## Phase 3: Gradual Rollout Strategy

### 3.1 Rollout Phases

#### Phase 3.1: Internal Testing (0% users)
```bash
# Enable for internal team only
ENABLE_HEALTH_MGMT=false
HEALTH_MGMT_INTERNAL_USERS=user1@company.com,user2@company.com
```

#### Phase 3.2: Beta Users (5% users)
```bash
# Enable for beta user group
ENABLE_HEALTH_MGMT=false
HEALTH_MGMT_BETA_PERCENTAGE=5
```

#### Phase 3.3: Gradual Rollout (25% → 50% → 100%)
```bash
# Week 1: 25% of users
ENABLE_HEALTH_MGMT=false
HEALTH_MGMT_ROLLOUT_PERCENTAGE=25

# Week 2: 50% of users
HEALTH_MGMT_ROLLOUT_PERCENTAGE=50

# Week 3: 100% of users
ENABLE_HEALTH_MGMT=true
```

### 3.2 Feature Flag Implementation

```typescript
// Example feature flag check in components
const isHealthMgmtEnabled = useFeatureFlag('ENABLE_HEALTH_MGMT') || 
  isUserInBeta(user.id) || 
  isUserInRolloutPercentage(user.id, rolloutPercentage);
```

### 3.3 Rollout Monitoring

Monitor these metrics during rollout:

- API response times for health endpoints
- Database query performance
- Error rates for health operations
- User engagement with health features
- Memory and CPU usage

## Phase 4: Monitoring Setup

### 4.1 Prometheus Metrics

Add health-specific metrics monitoring:

```yaml
# prometheus.yml
- job_name: 'health-management'
  static_configs:
    - targets: ['app:3000']
  metrics_path: '/api/metrics'
  scrape_interval: 30s
```

### 4.2 Key Metrics to Monitor

```bash
# Health Records
health_records_created_total
health_records_updated_total
health_records_deleted_total

# API Performance
health_api_request_duration_seconds
health_api_requests_total
health_api_errors_total

# Goals and Reminders
health_goals_active_total
health_goals_completed_total
health_reminders_sent_total
health_reminders_failed_total

# Database Performance
health_db_query_duration_seconds
health_db_connections_active
```

### 4.3 Alerting Rules

```yaml
# alerts.yml
groups:
  - name: health_management
    rules:
      - alert: HealthAPIHighErrorRate
        expr: rate(health_api_errors_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate in health management API"

      - alert: HealthDBSlowQueries
        expr: health_db_query_duration_seconds > 2
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Slow database queries in health management"

      - alert: HealthReminderFailures
        expr: rate(health_reminders_failed_total[10m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Health reminder system experiencing failures"
```

### 4.4 Dashboard Setup

Create Grafana dashboard with panels for:

- Health API request volume and latency
- Database performance metrics
- Feature adoption rates
- Error rates and types
- User engagement metrics

## Phase 5: Cron Job Setup

### 5.1 GitHub Actions Cron Configuration

```yaml
# .github/workflows/health-reminder-cron.yml
name: Health Reminder Cron
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

jobs:
  trigger-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Health Reminders
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.HEALTH_REMINDER_CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            "${{ secrets.APP_URL }}/api/health/reminders/trigger"
```

### 5.2 Alternative Cron Services

#### Using Vercel Cron (if deployed on Vercel)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/health/reminders/trigger",
      "schedule": "0 * * * *"
    }
  ]
}
```

#### Using External Cron Service

```bash
# crontab entry
0 * * * * curl -X POST -H "Authorization: Bearer YOUR_SECRET" https://your-app.com/api/health/reminders/trigger
```

## Phase 6: Testing Procedures

### 6.1 Pre-Deployment Testing

```bash
# Run full test suite
npm run test:all

# Run health-specific tests
npm run test:health

# Run E2E tests
npm run test:e2e:health

# Performance testing
npm run test:load:health
```

### 6.2 Post-Deployment Verification

```bash
# Health check endpoints
curl https://your-app.com/api/health/status
curl https://your-app.com/api/health/records
curl https://your-app.com/api/health/analytics/weight

# Database connectivity
npm run db:health-check

# Feature flag verification
npm run verify:feature-flags
```

### 6.3 User Acceptance Testing

- [ ] Health record creation and editing
- [ ] Analytics chart rendering
- [ ] Goal setting and progress tracking
- [ ] Reminder scheduling and notifications
- [ ] Data export functionality
- [ ] Mobile responsiveness
- [ ] Accessibility compliance

## Phase 7: Rollback Procedures

### 7.1 Emergency Rollback

```bash
# 1. Disable feature immediately
kubectl set env deployment/app ENABLE_HEALTH_MGMT=false

# 2. Scale down if needed
kubectl scale deployment app --replicas=1

# 3. Monitor error rates
kubectl logs -f deployment/app | grep "health"
```

### 7.2 Database Rollback

```bash
# 1. Stop application
kubectl scale deployment app --replicas=0

# 2. Restore database backup
psql -h prod-db-host -U username -d database_name < backup_prod_YYYYMMDD_HHMMSS.sql

# 3. Remove health tables if needed (CAUTION)
DROP TABLE IF EXISTS health_reminder CASCADE;
DROP TABLE IF EXISTS health_goal CASCADE;
DROP TABLE IF EXISTS health_record CASCADE;
DROP TABLE IF EXISTS health_type CASCADE;

# 4. Restart application
kubectl scale deployment app --replicas=3
```

### 7.3 Partial Rollback

```bash
# Reduce rollout percentage
HEALTH_MGMT_ROLLOUT_PERCENTAGE=0

# Or disable for specific user groups
HEALTH_MGMT_BETA_PERCENTAGE=0
```

## Phase 8: Troubleshooting Guide

### 8.1 Common Issues

#### Database Connection Issues

```bash
# Check database connectivity
pg_isready -h your-db-host -p 5432

# Verify health tables exist
psql -h your-db-host -U username -d database_name -c "\dt health_*"

# Check for migration locks
SELECT * FROM schema_migrations WHERE dirty = true;
```

#### API Endpoint Issues

```bash
# Check API health
curl -v https://your-app.com/api/health/status

# Verify authentication
curl -H "Authorization: Bearer valid-token" https://your-app.com/api/health/records

# Check rate limiting
curl -v https://your-app.com/api/health/records  # Look for rate limit headers
```

#### Feature Flag Issues

```bash
# Verify environment variables
env | grep HEALTH

# Check feature flag service
curl https://your-app.com/api/feature-flags/health

# Test user-specific flags
curl -H "User-ID: test-user" https://your-app.com/api/feature-flags/health
```

### 8.2 Performance Issues

#### Slow Database Queries

```sql
-- Find slow health queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%health_%' 
ORDER BY mean_time DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
WHERE tablename LIKE 'health_%';
```

#### High Memory Usage

```bash
# Check application memory
kubectl top pods

# Monitor health-specific memory usage
curl https://your-app.com/api/metrics | grep health_memory

# Check for memory leaks in analytics
curl https://your-app.com/api/health/analytics/debug
```

### 8.3 Reminder System Issues

#### Cron Job Failures

```bash
# Check GitHub Actions logs
gh run list --workflow=health-reminder-cron.yml

# Verify cron secret
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-app.com/api/health/reminders/trigger

# Check reminder queue
curl https://your-app.com/api/health/reminders/status
```

#### Missing Notifications

```bash
# Check reminder logs
kubectl logs -f deployment/app | grep "reminder"

# Verify next_run_at calculations
psql -c "SELECT id, cron_expr, next_run_at FROM health_reminder WHERE active = true;"

# Test notification service
curl -X POST https://your-notification-service.com/test
```

## Phase 9: Success Metrics

### 9.1 Technical Metrics

- [ ] API response time < 200ms (95th percentile)
- [ ] Database query time < 100ms (95th percentile)
- [ ] Error rate < 0.1%
- [ ] Uptime > 99.9%
- [ ] Memory usage increase < 10%

### 9.2 Business Metrics

- [ ] User adoption rate > 20% within first month
- [ ] Daily active users in health section > 5%
- [ ] Health record creation rate > 1 per user per week
- [ ] Goal completion rate > 30%
- [ ] User retention with health features > 80%

### 9.3 Monitoring Checklist

- [ ] Prometheus metrics collecting
- [ ] Grafana dashboards configured
- [ ] Alerting rules active
- [ ] Log aggregation working
- [ ] Error tracking enabled
- [ ] Performance monitoring active

## Phase 10: Post-Rollout Activities

### 10.1 Documentation Updates

- [ ] Update API documentation
- [ ] Create user guides
- [ ] Update admin documentation
- [ ] Document lessons learned

### 10.2 Team Training

- [ ] Train support team on health features
- [ ] Update runbooks
- [ ] Create troubleshooting guides
- [ ] Document escalation procedures

### 10.3 Continuous Improvement

- [ ] Collect user feedback
- [ ] Monitor usage patterns
- [ ] Identify optimization opportunities
- [ ] Plan feature enhancements

## Contact Information

- **Development Team**: dev-team@company.com
- **DevOps Team**: devops@company.com
- **Product Team**: product@company.com
- **On-call Engineer**: +1-555-ON-CALL

## Appendix

### A.1 Migration Scripts Location

```
/migrations/
├── 001_create_health_type_table.sql
├── 002_create_health_record_table.sql
├── 003_create_health_goal_table.sql
├── 004_create_health_reminder_table.sql
├── 005_create_health_indexes.sql
└── 006_seed_health_types.sql
```

### A.2 Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| ENABLE_HEALTH_MGMT | No | false | Master feature flag |
| HEALTH_REMINDER_CRON_SECRET | Yes | - | Cron authentication secret |
| PROMETHEUS_METRICS_ENABLED | No | true | Enable metrics collection |
| HEALTH_ANALYTICS_CACHE_TTL | No | 3600 | Cache TTL in seconds |

### A.3 API Endpoint Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/health/records | GET, POST | Health records CRUD |
| /api/health/analytics/{type} | GET | Analytics data |
| /api/health/goals | GET, POST, PATCH | Goals management |
| /api/health/reminders | GET, POST, PATCH | Reminders management |
| /api/health/reminders/trigger | POST | Cron trigger endpoint |

---

**Document Version**: 1.0  
**Last Updated**: $(date +%Y-%m-%d)  
**Next Review**: $(date -d "+3 months" +%Y-%m-%d)