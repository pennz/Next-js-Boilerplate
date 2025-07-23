# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Development is centered around npm scripts for common tasks:

- `npm run dev` - Start development server (uses Turbopack, includes local PGlite database server)
- `npm run build` - Build production bundle 
- `npm run start` - Start production server
- `npm run test` - Run unit tests with Vitest
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run lint` - Lint codebase with ESLint
- `npm run lint:fix` - Auto-fix linting issues
- `npm run check:types` - Type check with TypeScript (tsc --noEmit)
- `npm run check:deps` - Check for unused dependencies with Knip
- `npm run check:i18n` - Validate i18n translations

### Database Management

- `npm run db:generate` - Generate migrations from schema changes
- `npm run db:studio` - Open Drizzle Studio at https://local.drizzle.studio
- `npm run db:seed:health` - Seed health data for development

### Testing & Quality

- `npm run storybook` - Run Storybook UI development
- `npm run build-stats` - Bundle analyzer for optimization
- `npm run lighthouse` - Performance testing
- `npm run commit` - Interactive commit with Commitizen

## Architecture Overview

This is a Next.js 15+ boilerplate with App Router, built for production-ready applications with extensive tooling.

### Core Technologies
- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS 4
- **Database**: DrizzleORM (PostgreSQL compatible, local PGlite for development)
- **Authentication**: Clerk with passwordless, MFA, social auth
- **Testing**: Vitest (unit), Playwright (E2E), Testing Library
- **Monitoring**: Sentry error tracking, PostHog analytics
- **i18n**: next-intl with Crowdin integration

### Directory Structure

```
src/
├── app/[locale]/           # Next.js App Router with i18n
│   ├── (auth)/            # Authenticated routes
│   │   ├── dashboard/     # Main app dashboard
│   │   └── api/           # API routes  
│   └── (marketing)/       # Public marketing pages
├── components/            # React components
├── libs/                  # Third-party library configurations
├── models/Schema.ts       # Database schema (Drizzle ORM)
├── services/              # Business logic layer
├── validations/           # Zod validation schemas
├── utils/                 # Utility functions
├── locales/               # i18n translation files
└── middleware.ts          # Next.js middleware (auth, i18n, security)
```

### Key Architectural Patterns

#### Database Layer
- **Schema**: Centralized in `src/models/Schema.ts` using Drizzle ORM
- **Migrations**: Auto-generated with `npm run db:generate`, auto-applied on dev server start
- **Local Development**: Uses PGlite (serverless PostgreSQL) via `pglite-server`
- **Production**: Compatible with any PostgreSQL provider (Prisma Postgres recommended)

#### Authentication & Security
- **Clerk Integration**: Full authentication system in `src/app/[locale]/(auth)/`
- **Middleware Protection**: Route protection and security headers in `src/middleware.ts`
- **Arcjet Security**: Bot detection and WAF protection configured in `src/libs/Arcjet.ts`

#### Internationalization
- **Route Structure**: `[locale]` dynamic segment for all routes
- **Config**: `src/utils/AppConfig.ts` defines supported locales
- **Files**: Translation files in `src/locales/` (en.json, fr.json)
- **Components**: `LocaleSwitcher` for language switching

#### API Design
- **Health Management**: Full CRUD API for health records, goals, analytics, reminders
- **Validation**: Zod schemas in `src/validations/` for type-safe API inputs
- **Error Handling**: Centralized error monitoring with Sentry

### Environment Variables

Development uses `.env.local` (not tracked by Git):
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `SENTRY_DSN` - Error monitoring
- `ARCJET_KEY` - Security protection

### Database Schema Changes

1. Modify `src/models/Schema.ts`
2. Run `npm run db:generate` to create migration
3. Migration auto-applies on next database interaction

### Form Handling & Validation

- **Forms**: React Hook Form with `@hookform/resolvers` 
- **Validation**: Zod schemas provide runtime validation and TypeScript types
- **Pattern**: Forms use validation schemas from `src/validations/`

### Testing Strategy

- **Unit Tests**: Co-located with components (`.test.tsx`)
- **E2E Tests**: Playwright in `tests/e2e/`
- **Component Testing**: Storybook for UI development
- **Single Test**: Use `npm run test -- specific-test-name` or run specific E2E with Playwright

### Code Quality & Standards

- **Linting**: ESLint with Antfu config + Next.js rules
- **Formatting**: Prettier (auto-format on save)
- **Git Hooks**: Lefthook for pre-commit linting
- **Commits**: Conventional Commits enforced via Commitizen
- **Dependencies**: Monthly updates, unused dependency detection with Knip