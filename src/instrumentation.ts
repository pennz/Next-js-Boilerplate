import * as Sentry from '@sentry/nextjs';
import { Counter, Gauge, Histogram, register as promRegister } from 'prom-client';
import { Env } from '@/libs/Env';

// Prometheus metrics for health management features
let healthMetrics: {
  recordsCreated: Counter<string>;
  apiRequestDuration: Histogram<string>;
  activeGoals: Gauge<string>;
  remindersSent: Counter<string>;
} | null = null;

// Initialize Prometheus metrics if enabled
function initializePrometheusMetrics() {
  if (!Env.PROMETHEUS_METRICS_ENABLED || !Env.ENABLE_HEALTH_MGMT) {
    return;
  }

  try {
    // Clear existing metrics to avoid duplicate registration
    promRegister.clear();

    healthMetrics = {
      recordsCreated: new Counter({
        name: 'health_records_created_total',
        help: 'Total number of health records created',
        labelNames: ['user_id', 'type'],
      }),

      apiRequestDuration: new Histogram({
        name: 'health_api_request_duration_seconds',
        help: 'Duration of health API requests in seconds',
        labelNames: ['method', 'endpoint', 'status_code'],
        buckets: [0.1, 0.5, 1, 2, 5, 10],
      }),

      activeGoals: new Gauge({
        name: 'health_goals_active_total',
        help: 'Total number of active health goals',
        labelNames: ['user_id', 'type'],
      }),

      remindersSent: new Counter({
        name: 'health_reminders_sent_total',
        help: 'Total number of health reminders sent',
        labelNames: ['user_id', 'type', 'status'],
      }),
    };
  } catch (error) {
    console.error('Failed to initialize Prometheus metrics:', error);
  }
}

const sentryOptions: Sentry.NodeOptions | Sentry.EdgeOptions = {
  // Sentry DSN
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Enable Spotlight in development
  spotlight: process.env.NODE_ENV === 'development',

  integrations: [
    Sentry.consoleLoggingIntegration(),
  ],

  // Adds request headers and IP for users, for more info visit
  sendDefaultPii: true,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  _experiments: { enableLogs: true },

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
};

export async function register() {
  // Initialize Sentry
  if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Node.js Sentry configuration
      Sentry.init(sentryOptions);
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge Sentry configuration
      Sentry.init(sentryOptions);
    }
  }

  // Initialize Prometheus metrics for health management
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    initializePrometheusMetrics();
  }
}

export const onRequestError = Sentry.captureRequestError;

// Export health metrics for use in API routes
export { healthMetrics };

// Export Prometheus register for metrics endpoint
export { promRegister };
