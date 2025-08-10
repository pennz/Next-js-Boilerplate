import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const Env = createEnv({
  server: {
    ARCJET_KEY: z.string().startsWith('ajkey_').optional(),
    CLERK_SECRET_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    BETTER_STACK_SOURCE_TOKEN: z.string().optional(),
    ENABLE_HEALTH_MGMT: z.string().transform(val => val === 'true').optional().default(false),
    /**
     * Enables behavioral tracking functionality.
     * When set to 'true', client-side behavioral events will be collected and sent.
     * Note: Client-side buffer settings (NEXT_PUBLIC_BEHAVIOR_EVENT_BUFFER_SIZE and
     * NEXT_PUBLIC_BEHAVIOR_EVENT_FLUSH_INTERVAL) are only used when this is enabled.
     */
    ENABLE_BEHAVIOR_TRACKING: z.string().transform(val => val === 'true').optional().default(true),
    /**
     * Enables user profile management functionality.
     * When set to 'true', users can create and manage detailed profiles including
     * fitness goals, preferences, and constraints.
     */
    ENABLE_USER_PROFILES: z.string().transform(val => val === 'true').optional().default(false),
    /**
     * Enables micro-behavior pattern analysis functionality.
     * When set to 'true', detailed behavioral patterns and context analysis will be performed.
     * Note: Client-side micro-behavior settings are only used when this is enabled.
     */
    ENABLE_MICRO_BEHAVIOR_TRACKING: z.string().transform(val => val === 'true').optional().default(false),
    /**
     * Percentage threshold for profile completion scoring.
     * Must be between 1 and 100. Default is 80%.
     */
    PROFILE_COMPLETION_THRESHOLD: z.string()
      .transform(val => Number.parseInt(val, 10))
      .pipe(z.number().int().positive().min(1).max(100))
      .optional()
      .default(80),
    HEALTH_REMINDER_CRON_SECRET: z.string().min(1).optional(),
    PROMETHEUS_METRICS_ENABLED: z.string().transform(val => val === 'true').optional().default(false),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().optional(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
    /**
     * The maximum number of behavioral events to buffer before sending.
     * Only used when ENABLE_BEHAVIOR_TRACKING is set to 'true'.
     * Must be between 1 and 100.
     */
    /**
     * The maximum number of behavioral events to buffer before sending.
     * Only used when ENABLE_BEHAVIOR_TRACKING is set to 'true'.
     * Must be between 1 and 100.
     */
    NEXT_PUBLIC_BEHAVIOR_EVENT_BUFFER_SIZE: z.string()
      .transform(val => Number.parseInt(val, 10))
      .pipe(z.number().int().positive().min(1).max(100))
      .optional()
      .default(10),
    /**
     * The interval (in milliseconds) at which to flush the behavioral event buffer.
     * Only used when ENABLE_BEHAVIOR_TRACKING is set to 'true'.
     * Must be between 1000ms (1 second) and 300000ms (5 minutes).
     */
    NEXT_PUBLIC_BEHAVIOR_EVENT_FLUSH_INTERVAL: z.string()
      .transform(val => Number.parseInt(val, 10))
      .pipe(z.number().int().positive().min(1000).max(300000))
      .optional()
      .default(30000),
    /**
     * The interval (in milliseconds) for auto-saving profile changes.
     * Only used when ENABLE_USER_PROFILES is set to 'true'.
     * Must be between 5000ms (5 seconds) and 300000ms (5 minutes).
     */
    NEXT_PUBLIC_PROFILE_AUTO_SAVE_INTERVAL: z.string()
      .transform(val => Number.parseInt(val, 10))
      .pipe(z.number().int().positive().min(5000).max(300000))
      .optional()
      .default(60000),
    /**
     * The maximum number of micro-behaviors to buffer before analysis.
     * Only used when ENABLE_MICRO_BEHAVIOR_TRACKING is set to 'true'.
     * Must be between 1 and 100.
     */
    NEXT_PUBLIC_MICRO_BEHAVIOR_BUFFER_SIZE: z.string()
      .transform(val => Number.parseInt(val, 10))
      .pipe(z.number().int().positive().min(1).max(100))
      .optional()
      .default(20),
  },
  shared: {
    NODE_ENV: z.enum(['test', 'development', 'production']).optional(),
  },
  // You need to destructure all the keys manually
  runtimeEnv: {
    ARCJET_KEY: process.env.ARCJET_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_STACK_SOURCE_TOKEN: process.env.BETTER_STACK_SOURCE_TOKEN,
    ENABLE_HEALTH_MGMT: process.env.ENABLE_HEALTH_MGMT,
    ENABLE_BEHAVIOR_TRACKING: process.env.ENABLE_BEHAVIOR_TRACKING,
    ENABLE_USER_PROFILES: process.env.ENABLE_USER_PROFILES,
    ENABLE_MICRO_BEHAVIOR_TRACKING: process.env.ENABLE_MICRO_BEHAVIOR_TRACKING,
    PROFILE_COMPLETION_THRESHOLD: process.env.PROFILE_COMPLETION_THRESHOLD,
    HEALTH_REMINDER_CRON_SECRET: process.env.HEALTH_REMINDER_CRON_SECRET,
    PROMETHEUS_METRICS_ENABLED: process.env.PROMETHEUS_METRICS_ENABLED,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_BEHAVIOR_EVENT_BUFFER_SIZE: process.env.NEXT_PUBLIC_BEHAVIOR_EVENT_BUFFER_SIZE,
    NEXT_PUBLIC_BEHAVIOR_EVENT_FLUSH_INTERVAL: process.env.NEXT_PUBLIC_BEHAVIOR_EVENT_FLUSH_INTERVAL,
    NEXT_PUBLIC_PROFILE_AUTO_SAVE_INTERVAL: process.env.NEXT_PUBLIC_PROFILE_AUTO_SAVE_INTERVAL,
    NEXT_PUBLIC_MICRO_BEHAVIOR_BUFFER_SIZE: process.env.NEXT_PUBLIC_MICRO_BEHAVIOR_BUFFER_SIZE,
  },
});
