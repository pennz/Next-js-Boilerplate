import { z } from 'zod';

// Entity type enum for validation
export const EntityTypeEnum = z.enum([
  'health_record',
  'training_session',
  'exercise_log',
  'health_goal',
  'ui_interaction',
]);

// Event name validation with predefined common events
const eventNameValidation = z.string().min(1).max(100).refine((eventName) => {
  // Allow alphanumeric, underscores, and hyphens
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(eventName);
}, {
  message: 'Event name must contain only alphanumeric characters, underscores, and hyphens',
}).refine((eventName) => {
  // Predefined common event names for validation
  const commonEvents = [
    'workout_started',
    'workout_completed',
    'workout_paused',
    'health_record_added',
    'health_record_updated',
    'health_record_deleted',
    'health_record_viewed',
    'health_records_queried',
    'goal_created',
    'goal_updated',
    'goal_achieved',
    'goal_progress_viewed',
    'training_plan_created',
    'training_plan_started',
    'exercise_log_created',
    'ui_click',
    'ui_view',
    'ui_interaction',
    'page_view',
    'component_mounted',
    'health_overview_viewed',
    'exercise_overview_viewed',
    'stats_viewed',
    'quick_action_clicked',
  ];
  
  // Allow custom events but they should follow naming convention
  return commonEvents.includes(eventName) || eventName.includes('_');
}, {
  message: 'Event name should be a known event or follow snake_case convention with underscores',
});

// Device info validation for context
const DeviceInfoValidation = z.object({
  userAgent: z.string().max(500).optional(),
  platform: z.string().max(50).optional(),
  screenWidth: z.number().int().min(1).max(10000).optional(),
  screenHeight: z.number().int().min(1).max(10000).optional(),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  browser: z.string().max(50).optional(),
  os: z.string().max(50).optional(),
}).optional();

// UI state validation for context
const UIStateValidation = z.object({
  componentName: z.string().max(100).optional(),
  route: z.string().max(200).optional(),
  action: z.string().max(100).optional(),
  elementId: z.string().max(100).optional(),
  elementType: z.string().max(50).optional(),
  position: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
  }).optional(),
  viewport: z.object({
    width: z.number().int().min(1).optional(),
    height: z.number().int().min(1).optional(),
  }).optional(),
}).optional();

// Environmental data validation for context
const EnvironmentalDataValidation = z.object({
  timestamp: z.coerce.date().optional(),
  timezone: z.string().max(50).optional(),
  locale: z.string().max(10).optional(),
  sessionDuration: z.number().int().min(0).optional(),
  pageLoadTime: z.number().min(0).optional(),
  networkType: z.enum(['wifi', 'cellular', '4g', '5g', 'ethernet', 'unknown']).optional(),
  referrer: z.string().max(500).optional(),
}).optional();

// Context data validation with nested validations
export const ContextDataValidation = z.object({
  // Device information
  device: DeviceInfoValidation,
  
  // UI state information
  ui: UIStateValidation,
  
  // Environmental data
  environment: EnvironmentalDataValidation,
  
  // Custom data for specific events
  custom: z.record(z.string(), z.any()).optional(),
  
  // Health-specific context
  healthData: z.object({
    recordType: z.string().max(50).optional(),
    value: z.number().optional(),
    unit: z.string().max(20).optional(),
    goalId: z.number().int().positive().optional(),
  }).optional(),
  
  // Exercise-specific context
  exerciseData: z.object({
    exerciseType: z.string().max(100).optional(),
    duration: z.number().min(0).optional(),
    intensity: z.enum(['low', 'moderate', 'high']).optional(),
    planId: z.number().int().positive().optional(),
    sessionId: z.number().int().positive().optional(),
  }).optional(),
  
  // Performance metrics
  performance: z.object({
    loadTime: z.number().min(0).optional(),
    renderTime: z.number().min(0).optional(),
    interactionTime: z.number().min(0).optional(),
  }).optional(),
}).optional();

// Session ID validation
const sessionIdValidation = z.string().min(1).max(100).refine((sessionId) => {
  // Allow alphanumeric, hyphens, and underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(sessionId);
}, {
  message: 'Session ID must contain only alphanumeric characters, underscores, and hyphens',
}).optional();

// Base behavioral event validation
export const BehaviorEventValidation = z.object({
  eventName: eventNameValidation,
  entityType: EntityTypeEnum,
  entityId: z.coerce.number().int().positive().optional(),
  context: ContextDataValidation,
  sessionId: sessionIdValidation,
}).refine((data) => {
  // Business logic: if entityType is not 'ui_interaction', entityId should be provided
  if (data.entityType !== 'ui_interaction' && !data.entityId) {
    return false;
  }
  return true;
}, {
  message: 'Entity ID is required for non-UI interaction events',
  path: ['entityId'],
}).refine((data) => {
  // Business logic: UI interaction events must have UI context
  if (data.entityType === 'ui_interaction' && (!data.context || !data.context.ui)) {
    return false;
  }
  return true;
}, {
  message: 'UI interaction events must include UI context data',
  path: ['context', 'ui'],
}).refine((data) => {
  // Business logic: Health-related events should have health context when available
  if ((data.entityType === 'health_record' || data.entityType === 'health_goal') && 
      data.context && !data.context.healthData && data.eventName.includes('health')) {
    // This is a warning rather than an error, so we'll allow it
    return true;
  }
  return true;
}, {
  message: 'Health-related events should include health context data when available',
});

// Validation for bulk behavioral event operations
export const BehaviorEventBulkValidation = z.object({
  events: z.array(BehaviorEventValidation).min(1).max(50, {
    message: 'Cannot process more than 50 events at once',
  }),
}).refine((data) => {
  // Business logic: All events in a bulk operation should have the same sessionId if provided
  const sessionIds = data.events
    .map(event => event.sessionId)
    .filter(id => id !== undefined);
  
  if (sessionIds.length > 0) {
    const uniqueSessionIds = new Set(sessionIds);
    if (uniqueSessionIds.size > 1) {
      return false;
    }
  }
  return true;
}, {
  message: 'All events in a bulk operation should have the same session ID',
  path: ['events'],
});

// Validation for behavioral event queries/filters
export const BehaviorEventQueryValidation = z.object({
  eventName: z.string().max(100).optional(),
  entityType: EntityTypeEnum.optional(),
  entityId: z.coerce.number().int().positive().optional(),
  sessionId: z.string().max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'eventName', 'entityType']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).refine((data) => {
  // Business logic: Start date must be before or equal to end date
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['startDate'],
}).refine((data) => {
  // Business logic: Date range should not exceed 1 year
  if (data.startDate && data.endDate) {
    const oneYear = 365 * 24 * 60 * 60 * 1000; // milliseconds in a year
    const timeDiff = data.endDate.getTime() - data.startDate.getTime();
    return timeDiff <= oneYear;
  }
  return true;
}, {
  message: 'Date range cannot exceed one year',
  path: ['endDate'],
}).refine((data) => {
  // Business logic: If entityId is provided, entityType should also be provided
  if (data.entityId && !data.entityType) {
    return false;
  }
  return true;
}, {
  message: 'Entity type must be provided when filtering by entity ID',
  path: ['entityType'],
});

// Validation for behavioral event aggregation queries
export const BehaviorEventAggregationValidation = z.object({
  groupBy: z.enum(['eventName', 'entityType', 'hour', 'day', 'week', 'month']),
  eventName: z.string().max(100).optional(),
  entityType: EntityTypeEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
});

// Export types for TypeScript
export type BehaviorEventInput = z.infer<typeof BehaviorEventValidation>;
export type BehaviorEventBulkInput = z.infer<typeof BehaviorEventBulkValidation>;
export type BehaviorEventQueryInput = z.infer<typeof BehaviorEventQueryValidation>;
export type BehaviorEventAggregationInput = z.infer<typeof BehaviorEventAggregationValidation>;
export type ContextData = z.infer<typeof ContextDataValidation>;
export type EntityType = z.infer<typeof EntityTypeEnum>;
export type DeviceInfo = z.infer<typeof DeviceInfoValidation>;
export type UIState = z.infer<typeof UIStateValidation>;
export type EnvironmentalData = z.infer<typeof EnvironmentalDataValidation>;