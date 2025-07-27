# Deployment and Infrastructure Requirements

This document outlines the complete deployment and infrastructure requirements for the Next.js 14 application, extracted from configuration files and deployment settings.

## Table of Contents

1. [Next.js Deployment Configuration](#nextjs-deployment-configuration)
2. [Environment Configuration Requirements](#environment-configuration-requirements)
3. [Database Infrastructure Requirements](#database-infrastructure-requirements)
4. [Node.js Runtime Requirements](#nodejs-runtime-requirements)
5. [Build and Deployment Scripts](#build-and-deployment-scripts)
6. [Static Asset Management](#static-asset-management)
7. [CDN and Hosting Requirements](#cdn-and-hosting-requirements)
8. [SSL and Security Infrastructure](#ssl-and-security-infrastructure)
9. [Monitoring Infrastructure](#monitoring-infrastructure)
10. [CI/CD Pipeline Requirements](#cicd-pipeline-requirements)
11. [Production Environment Setup](#production-environment-setup)

## Next.js Deployment Configuration

### Core Configuration (`next.config.ts`)

The application uses a sophisticated Next.js configuration with multiple plugins and conditional features:

```typescript
// Base configuration requirements
const baseConfig: NextConfig = {
  eslint: {
    dirs: ['.'], // Lint entire project
  },
  poweredByHeader: false, // Security: Remove X-Powered-By header
  reactStrictMode: true, // Enable React strict mode for better debugging
};
```

### Plugin Architecture

1. **Next-Intl Plugin**: Internationalization support
   - Configuration file: `./src/libs/I18n.ts`
   - Enables multi-language routing and content management

2. **Bundle Analyzer** (Conditional):
   - Enabled when `ANALYZE=true` environment variable is set
   - Provides bundle size analysis and optimization insights
   - Command: `npm run build-stats`

3. **Sentry Integration** (Conditional):
   - Enabled unless `NEXT_PUBLIC_SENTRY_DISABLED` is set
   - Requires organization and project configuration
   - Features:
     - Source map uploading for better error tracking
     - React component annotation
     - Tunnel route `/monitoring` to bypass ad-blockers
     - Automatic logger tree-shaking
     - Telemetry disabled for privacy

### Build Optimization Features

- **Tree-shaking**: Automatic removal of unused code
- **Code splitting**: Automatic route-based code splitting
- **Source maps**: Enhanced debugging with Sentry integration
- **Bundle analysis**: Optional bundle size monitoring

## Environment Configuration Requirements

### Server-Side Variables (Required)

Based on `src/libs/Env.ts`, the following server-side environment variables are required:

```bash
# Authentication (Required)
CLERK_SECRET_KEY=sk_test_... # Clerk authentication secret key

# Database (Required)
DATABASE_URL=postgresql://user:password@host:port/database # PostgreSQL connection string

# Security (Optional but Recommended)
ARCJET_KEY=ajkey_... # Arcjet security protection key

# Logging (Optional)
BETTER_STACK_SOURCE_TOKEN=... # Better Stack logging token

# Feature Flags (Optional)
ENABLE_HEALTH_MGMT=true # Enable health management features
HEALTH_REMINDER_CRON_SECRET=... # Secret for health reminder cron jobs
PROMETHEUS_METRICS_ENABLED=true # Enable Prometheus metrics collection
```

### Client-Side Variables (Required)

```bash
# Authentication (Required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... # Clerk publishable key

# Application URL (Optional but Recommended)
NEXT_PUBLIC_APP_URL=https://yourdomain.com # Canonical application URL

# Analytics (Optional)
NEXT_PUBLIC_POSTHOG_KEY=... # PostHog analytics key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com # PostHog host URL
```

### Shared Variables

```bash
# Environment
NODE_ENV=production # Environment mode: test, development, or production
```

### Environment Variable Validation

The application uses `@t3-oss/env-nextjs` with Zod validation:
- Type-safe environment variable access
- Runtime validation of required variables
- Automatic type inference and IDE support

## Database Infrastructure Requirements

### PostgreSQL Database Setup

Based on `drizzle.config.ts` and `src/libs/DB.ts`:

#### Database Configuration

```typescript
// Database connection requirements
{
  dialect: 'postgresql',
  connectionString: process.env.DATABASE_URL,
  ssl: !DATABASE_URL.includes('localhost') && !DATABASE_URL.includes('127.0.0.1'),
  schema: './src/models/Schema.ts',
  migrationsFolder: './migrations'
}
```

#### Production Database Requirements

1. **PostgreSQL Version**: Compatible with Drizzle ORM
2. **SSL Configuration**:
   - SSL enabled for non-localhost connections
   - SSL certificates required for production deployments
3. **Connection Pooling**: Recommended for production environments
4. **Migration Management**:
   - Automatic migration execution on startup
   - Migration files stored in `./migrations` directory
   - Verbose and strict mode enabled for safety

#### Database Connection Features

- **Global Connection Caching**: Prevents multiple connections during development hot reloads
- **Automatic Migration**: Runs migrations on application startup
- **Schema Validation**: Type-safe database operations with Drizzle ORM

#### Development vs Production

- **Development**: Uses local PGLite server or local PostgreSQL
- **Production**: Requires external PostgreSQL instance with SSL
- **Testing**: Uses in-memory PGLite server

## Node.js Runtime Requirements

### Version Requirements

From `package.json`:
```json
{
  "engines": {
    "node": ">=20"
  }
}
```

- **Minimum Node.js Version**: 20.x or higher
- **Recommended**: Latest LTS version of Node.js 20.x
- **Runtime Features**: ES2022+ support, native fetch API, Web Streams API

### Runtime Configuration

- **React Version**: 19.1.0 (Latest stable)
- **Next.js Version**: 15.4.1 (App Router)
- **TypeScript**: 5.8.3 with strict mode enabled

## Build and Deployment Scripts

### Core Scripts

From `package.json`:

#### Development Scripts
```bash
npm run dev              # Start development server with Turbopack
npm run dev:spotlight    # Start Spotlight debugging tool
npm run db-server:file   # Start PGLite file-based database server
```

#### Build Scripts
```bash
npm run build           # Production build with in-memory database
npm run build:next      # Next.js build only
npm run build-stats     # Build with bundle analysis
npm run start           # Start production server
```

#### Database Scripts
```bash
npm run db:generate     # Generate database migrations
npm run db:seed:health  # Seed health management data
npm run db:seed:exercise # Seed exercise data
npm run db:studio       # Open Drizzle Studio
```

#### Quality Assurance Scripts
```bash
npm run lint            # ESLint code analysis
npm run lint:fix        # Auto-fix ESLint issues
npm run check:types     # TypeScript type checking
npm run check:deps      # Dependency analysis with Knip
npm run check:i18n      # Internationalization validation
npm run test            # Unit tests with Vitest
npm run test:e2e        # End-to-end tests with Playwright
```

#### API and Documentation Scripts
```bash
npm run api:generate    # Generate OpenAPI documentation
npm run api:mock        # Start API mock server
npm run storybook       # Start Storybook development server
npm run build-storybook # Build Storybook for production
```

#### Performance Testing Scripts
```bash
npm run lighthouse      # Run Lighthouse performance tests
npm run test:lighthouse # Combined start and Lighthouse testing
```

### Deployment Workflow

1. **Pre-deployment**: Type checking, linting, testing
2. **Build**: Next.js build with optimizations
3. **Database**: Migration execution
4. **Asset Generation**: Static assets, sitemap, robots.txt
5. **Monitoring Setup**: Sentry, analytics initialization

## Static Asset Management

### Robots.txt Configuration

From `src/app/robots.ts`:
```typescript
{
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: '/dashboard/', // Protect authenticated routes
  },
  sitemap: `${getBaseUrl()}/sitemap.xml`,
}
```

### Sitemap Generation

From `src/app/sitemap.ts`:
```typescript
{
  url: `${getBaseUrl()}/`,
  lastModified: new Date(),
  changeFrequency: 'daily',
  priority: 0.7,
}
```

### Static Asset Requirements

- **Favicon Management**: Multi-format favicon support
- **Image Optimization**: Next.js Image component with optimization
- **Font Loading**: Optimized web font loading
- **Asset Compression**: Automatic compression for production builds

## CDN and Hosting Requirements

### Hosting Platform Requirements

1. **Node.js Support**: Node.js 20+ runtime environment
2. **PostgreSQL Database**: External database service
3. **Environment Variables**: Secure environment variable management
4. **SSL/TLS**: HTTPS certificate management
5. **Static Asset Serving**: CDN integration for optimal performance

### Recommended Hosting Platforms

- **Vercel**: Native Next.js support, automatic deployments
- **Netlify**: Static site generation with serverless functions
- **AWS**: EC2/ECS with RDS PostgreSQL
- **Railway**: Full-stack deployment with PostgreSQL
- **DigitalOcean**: App Platform with managed databases

### CDN Configuration

- **Static Assets**: Images, fonts, CSS, JavaScript
- **Cache Headers**: Appropriate cache control for different asset types
- **Compression**: Gzip/Brotli compression enabled
- **Geographic Distribution**: Multi-region CDN for global performance

## SSL and Security Infrastructure

### HTTPS Requirements

- **SSL Certificate**: Valid SSL/TLS certificate for production domain
- **HSTS**: HTTP Strict Transport Security headers
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options

### Database Security

- **SSL Connections**: Required for production database connections
- **Connection String Security**: Secure storage of database credentials
- **Network Security**: VPC/firewall configuration for database access

### Application Security

- **Environment Variables**: Secure management of sensitive configuration
- **API Security**: Rate limiting, authentication validation
- **Content Security Policy**: XSS protection through CSP headers

## Monitoring Infrastructure

### Error Monitoring (Sentry)

Configuration requirements:
```bash
# Sentry Configuration
SENTRY_ORGANIZATION=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token
NEXT_PUBLIC_SENTRY_DSN=your-dsn
```

Features:
- **Error Tracking**: Automatic error capture and reporting
- **Performance Monitoring**: Core Web Vitals and custom metrics
- **Source Maps**: Enhanced error debugging with source maps
- **Release Tracking**: Deployment and release monitoring

### Logging (Better Stack)

```bash
BETTER_STACK_SOURCE_TOKEN=your-token
```

Features:
- **Structured Logging**: JSON-formatted log ingestion
- **Log Aggregation**: Centralized log management
- **Real-time Monitoring**: Live log streaming and alerts

### Analytics (PostHog)

```bash
NEXT_PUBLIC_POSTHOG_KEY=your-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

Features:
- **User Analytics**: User behavior tracking and analysis
- **Feature Flags**: A/B testing and feature rollouts
- **Session Recording**: User session replay for debugging

### Uptime Monitoring (Checkly)

From `checkly.config.ts`:
```bash
CHECKLY_EMAIL_ADDRESS=contact@example.com
CHECKLY_PROJECT_NAME=Your Project Name
CHECKLY_LOGICAL_ID=your-project-id
```

Features:
- **Uptime Monitoring**: 24/7 availability monitoring
- **API Testing**: Automated API endpoint testing
- **Performance Monitoring**: Response time and performance metrics
- **Multi-region Testing**: Global availability verification

### Metrics Collection (Prometheus)

```bash
PROMETHEUS_METRICS_ENABLED=true
```

Features:
- **Custom Metrics**: Application-specific metric collection
- **Performance Metrics**: Request duration, throughput, error rates
- **Infrastructure Metrics**: System resource utilization

## CI/CD Pipeline Requirements

### Git Hooks Configuration (Lefthook)

From `lefthook.yml`:

#### Pre-commit Hooks
```yaml
pre-commit:
  commands:
    lint:
      glob: '*'
      run: npx --no -- eslint --fix --no-warn-ignored
      stage_fixed: true
      priority: 1
    check-types:
      glob: '*.{ts,tsx}'
      run: npm run check:types
      priority: 2
```

#### Commit Message Validation
```yaml
commit-msg:
  commands:
    commitlint:
      run: npx --no -- commitlint --edit {1}
```

### CI/CD Pipeline Requirements

1. **Code Quality Gates**:
   - ESLint validation with auto-fixing
   - TypeScript type checking
   - Dependency analysis with Knip
   - Commit message validation with Commitlint

2. **Testing Pipeline**:
   - Unit tests with Vitest
   - End-to-end tests with Playwright
   - Accessibility testing with Storybook
   - Performance testing with Lighthouse

3. **Build Pipeline**:
   - Next.js production build
   - Bundle analysis and optimization
   - Static asset generation
   - Database migration validation

4. **Deployment Pipeline**:
   - Environment variable validation
   - Database migration execution
   - Health check validation
   - Monitoring setup verification

### Automated Quality Checks

- **Conventional Commits**: Enforced commit message format
- **Semantic Release**: Automated versioning and changelog generation
- **Code Coverage**: Test coverage reporting with Codecov
- **Security Scanning**: Dependency vulnerability scanning

## Production Environment Setup

### Production Environment Variables

From `.env.production`:

#### Required Production Variables
```bash
# Application
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database (Secure)
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication (Secure)
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# Security (Secure)
ARCJET_KEY=ajkey_...

# Monitoring (Secure)
SENTRY_AUTH_TOKEN=...
BETTER_STACK_SOURCE_TOKEN=...
NEXT_PUBLIC_SENTRY_DSN=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Uptime Monitoring
CHECKLY_EMAIL_ADDRESS=contact@yourdomain.com
CHECKLY_PROJECT_NAME=Your Project Name
CHECKLY_LOGICAL_ID=your-project-id
```

### Security Considerations

1. **Environment Variable Management**:
   - Use `.env.production.local` for sensitive variables
   - Never commit sensitive data to version control
   - Use secure secret management services

2. **Database Security**:
   - SSL-enabled PostgreSQL connection
   - Network-level access restrictions
   - Regular security updates and patches

3. **Application Security**:
   - HTTPS-only communication
   - Security headers configuration
   - Regular dependency updates

### Production Deployment Checklist

- [ ] Node.js 20+ runtime environment
- [ ] PostgreSQL database with SSL
- [ ] All required environment variables configured
- [ ] SSL certificate installed and configured
- [ ] Monitoring services configured (Sentry, Better Stack, PostHog, Checkly)
- [ ] CDN configured for static assets
- [ ] Database migrations executed
- [ ] Health checks configured
- [ ] Error monitoring and alerting setup
- [ ] Performance monitoring enabled
- [ ] Security headers configured
- [ ] Backup and disaster recovery procedures
- [ ] Scaling and load balancing configuration

### Performance Optimization

1. **Build Optimization**:
   - Bundle analysis and tree-shaking
   - Code splitting and lazy loading
   - Image optimization and compression

2. **Runtime Optimization**:
   - Database connection pooling
   - Caching strategies implementation
   - CDN integration for global performance

3. **Monitoring and Alerting**:
   - Real-time performance monitoring
   - Error rate and response time alerts
   - Capacity planning and scaling triggers

This comprehensive infrastructure setup ensures a robust, scalable, and maintainable production deployment with enterprise-grade monitoring, security, and performance optimization.
