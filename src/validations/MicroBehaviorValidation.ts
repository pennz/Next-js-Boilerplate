import { z } from 'zod';
import { ContextDataValidation, EntityTypeEnum } from './BehaviorEventValidation';

// Behavior pattern type enum
export const BehaviorPatternTypeEnum = z.enum([
  'habit',
  'routine',
  'trigger_response',
  'environmental',
  'temporal',
  'social',
  'emotional',
  'physical',
]);

// Frequency pattern enum
export const FrequencyPatternEnum = z.enum([
  'daily',
  'weekly',
  'monthly',
  'sporadic',
  'seasonal',
  'event_driven',
  'contextual',
]);

// Trigger type enum
export const TriggerTypeEnum = z.enum([
  'time_based',
  'location_based',
  'emotional_state',
  'social_context',
  'environmental',
  'physiological',
  'cognitive',
  'external_event',
]);

// Outcome type enum
export const OutcomeTypeEnum = z.enum([
  'behavioral_change',
  'performance_metric',
  'emotional_state',
  'physiological_response',
  'goal_progress',
  'habit_formation',
  'skill_development',
]);

// Statistical significance level enum
export const SignificanceLevelEnum = z.enum([
  'very_low',
  'low',
  'moderate',
  'high',
  'very_high',
]);

// Pattern strength enum
export const PatternStrengthEnum = z.enum([
  'weak',
  'moderate',
  'strong',
  'very_strong',
]);

// Behavior trigger validation
export const BehaviorTriggerValidation = z.object({
  triggerType: TriggerTypeEnum,
  triggerName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  conditions: z.object({
    // Time-based conditions
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
    dayOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
    timeRange: z.object({
      start: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).optional(),
      end: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).optional(),
    }).optional(),

    // Location-based conditions
    location: z.object({
      type: z.enum(['home', 'work', 'gym', 'outdoor', 'specific_address']).optional(),
      coordinates: z.object({
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        radius: z.number().min(0).max(10000).optional(), // meters
      }).optional(),
    }).optional(),

    // Emotional/physiological conditions
    emotionalState: z.enum(['stressed', 'relaxed', 'motivated', 'tired', 'energetic', 'anxious', 'happy', 'neutral']).optional(),
    energyLevel: z.number().min(1).max(10).optional(),
    stressLevel: z.number().min(1).max(10).optional(),

    // Environmental conditions
    weather: z.enum(['sunny', 'rainy', 'cloudy', 'snowy', 'windy']).optional(),
    temperature: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
    }).optional(),

    // Social context
    socialContext: z.enum(['alone', 'with_family', 'with_friends', 'with_colleagues', 'in_group']).optional(),

    // Custom conditions
    custom: z.record(z.string(), z.any()).optional(),
  }),
  threshold: z.object({
    value: z.number(),
    operator: z.enum(['greater_than', 'less_than', 'equal_to', 'between']),
    unit: z.string().max(20).optional(),
  }).optional(),
  confidence: z.number().min(0).max(1),
  isActive: z.boolean().default(true),
}).refine((data) => {
  // Business logic: Time range validation
  if (data.conditions.timeRange?.start && data.conditions.timeRange?.end) {
    const start = data.conditions.timeRange.start;
    const end = data.conditions.timeRange.end;
    const startMinutes = Number.parseInt(start.split(':')[0]) * 60 + Number.parseInt(start.split(':')[1]);
    const endMinutes = Number.parseInt(end.split(':')[0]) * 60 + Number.parseInt(end.split(':')[1]);
    return startMinutes < endMinutes;
  }
  return true;
}, {
  message: 'Start time must be before end time',
  path: ['conditions', 'timeRange'],
}).refine((data) => {
  // Business logic: Location coordinates validation
  if (data.conditions.location?.coordinates) {
    const coords = data.conditions.location.coordinates;
    return (coords.latitude !== undefined && coords.longitude !== undefined)
      || (coords.latitude === undefined && coords.longitude === undefined);
  }
  return true;
}, {
  message: 'Both latitude and longitude must be provided together',
  path: ['conditions', 'location', 'coordinates'],
});

// Behavior outcome validation
export const BehaviorOutcomeValidation = z.object({
  outcomeType: OutcomeTypeEnum,
  outcomeName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  metrics: z.object({
    // Quantitative metrics
    value: z.number().optional(),
    unit: z.string().max(20).optional(),
    baseline: z.number().optional(),
    target: z.number().optional(),
    improvement: z.number().optional(),

    // Qualitative metrics
    rating: z.number().min(1).max(10).optional(),
    category: z.string().max(50).optional(),

    // Success criteria
    successThreshold: z.number().optional(),
    isSuccess: z.boolean().optional(),

    // Temporal metrics
    duration: z.number().min(0).optional(), // in minutes
    frequency: z.number().min(0).optional(),
    consistency: z.number().min(0).max(1).optional(),

    // Custom metrics
    custom: z.record(z.string(), z.any()).optional(),
  }),
  measurement: z.object({
    method: z.enum(['self_report', 'objective_measurement', 'behavioral_observation', 'physiological_data']),
    accuracy: z.number().min(0).max(1).optional(),
    reliability: z.number().min(0).max(1).optional(),
    timestamp: z.coerce.date(),
  }),
  impact: z.object({
    immediate: z.enum(['positive', 'negative', 'neutral']).optional(),
    shortTerm: z.enum(['positive', 'negative', 'neutral']).optional(),
    longTerm: z.enum(['positive', 'negative', 'neutral']).optional(),
    significance: SignificanceLevelEnum.optional(),
  }).optional(),
}).refine((data) => {
  // Business logic: If target is provided, baseline should also be provided
  if (data.metrics.target !== undefined && data.metrics.baseline === undefined) {
    return false;
  }
  return true;
}, {
  message: 'Baseline value must be provided when target is specified',
  path: ['metrics', 'baseline'],
}).refine((data) => {
  // Business logic: Success threshold validation
  if (data.metrics.successThreshold !== undefined && data.metrics.target !== undefined) {
    return Math.abs(data.metrics.successThreshold - data.metrics.target) <= Math.abs(data.metrics.target);
  }
  return true;
}, {
  message: 'Success threshold should be reasonable relative to target',
  path: ['metrics', 'successThreshold'],
});

// Context pattern validation
export const ContextPatternValidation = z.object({
  patternName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  contextType: z.enum(['temporal', 'spatial', 'social', 'environmental', 'physiological', 'cognitive']),
  contextData: ContextDataValidation.required(),
  frequency: z.object({
    pattern: FrequencyPatternEnum,
    count: z.number().int().min(0),
    timeframe: z.enum(['hour', 'day', 'week', 'month', 'year']),
    consistency: z.number().min(0).max(1), // 0 = completely inconsistent, 1 = perfectly consistent
  }),
  correlations: z.array(z.object({
    entityType: EntityTypeEnum,
    entityId: z.number().int().positive().optional(),
    correlationStrength: z.number().min(-1).max(1), // -1 = strong negative, 1 = strong positive
    significance: SignificanceLevelEnum,
    sampleSize: z.number().int().min(1),
  })).optional(),
  conditions: z.object({
    minOccurrences: z.number().int().min(1).default(3),
    minTimeSpan: z.number().int().min(1).default(7), // days
    confidenceThreshold: z.number().min(0).max(1).default(0.7),
  }),
  isActive: z.boolean().default(true),
}).refine((data) => {
  // Business logic: Correlation validation
  if (data.correlations) {
    return data.correlations.every(corr =>
      Math.abs(corr.correlationStrength) >= 0.1 || corr.significance === 'very_low',
    );
  }
  return true;
}, {
  message: 'Correlation strength should be meaningful or marked as very low significance',
  path: ['correlations'],
});

// Micro-behavior pattern validation
export const MicroBehaviorPatternValidation = z.object({
  patternName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  patternType: BehaviorPatternTypeEnum,
  entityType: EntityTypeEnum,
  entityId: z.number().int().positive().optional(),

  // Pattern characteristics
  frequency: z.object({
    pattern: FrequencyPatternEnum,
    averageCount: z.number().min(0),
    timeframe: z.enum(['hour', 'day', 'week', 'month']),
    variance: z.number().min(0).optional(),
    trend: z.enum(['increasing', 'decreasing', 'stable', 'cyclical']).optional(),
  }),

  // Pattern strength and reliability
  strength: PatternStrengthEnum,
  confidence: z.number().min(0).max(1),
  reliability: z.number().min(0).max(1).optional(),

  // Triggers and outcomes
  triggers: z.array(BehaviorTriggerValidation).optional(),
  outcomes: z.array(BehaviorOutcomeValidation).optional(),

  // Context patterns
  contextPatterns: z.array(z.string().max(100)).optional(), // References to context pattern names

  // Statistical data
  statistics: z.object({
    sampleSize: z.number().int().min(1),
    timeSpan: z.object({
      start: z.coerce.date(),
      end: z.coerce.date(),
    }),
    significance: SignificanceLevelEnum,
    pValue: z.number().min(0).max(1).optional(),
    effectSize: z.number().optional(),
  }),

  // Metadata
  discoveredAt: z.coerce.date(),
  lastUpdated: z.coerce.date(),
  isActive: z.boolean().default(true),
  tags: z.array(z.string().max(50)).optional(),
}).refine((data) => {
  // Business logic: Time span validation
  return data.statistics.timeSpan.start <= data.statistics.timeSpan.end;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['statistics', 'timeSpan'],
}).refine((data) => {
  // Business logic: Sample size should be reasonable for pattern strength
  const minSampleSizes = {
    weak: 5,
    moderate: 10,
    strong: 20,
    very_strong: 30,
  };
  return data.statistics.sampleSize >= minSampleSizes[data.strength];
}, {
  message: 'Sample size should be sufficient for the claimed pattern strength',
  path: ['statistics', 'sampleSize'],
}).refine((data) => {
  // Business logic: Confidence should align with significance level
  const minConfidenceLevels = {
    very_low: 0.1,
    low: 0.3,
    moderate: 0.5,
    high: 0.7,
    very_high: 0.9,
  };
  return data.confidence >= minConfidenceLevels[data.statistics.significance];
}, {
  message: 'Confidence level should align with statistical significance',
  path: ['confidence'],
});

// Pattern analysis validation
export const PatternAnalysisValidation = z.object({
  analysisType: z.enum(['correlation', 'trend', 'anomaly', 'prediction', 'clustering']),
  entityType: EntityTypeEnum.optional(),
  entityId: z.number().int().positive().optional(),

  // Time range for analysis
  timeRange: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  }),

  // Analysis parameters
  parameters: z.object({
    minPatternStrength: PatternStrengthEnum.optional(),
    minConfidence: z.number().min(0).max(1).default(0.5),
    minSampleSize: z.number().int().min(1).default(10),
    significanceLevel: SignificanceLevelEnum.optional(),

    // Correlation analysis specific
    correlationThreshold: z.number().min(0).max(1).default(0.3),

    // Trend analysis specific
    trendWindow: z.number().int().min(1).default(7), // days

    // Anomaly detection specific
    anomalyThreshold: z.number().min(0).max(1).default(0.05),

    // Prediction specific
    predictionHorizon: z.number().int().min(1).max(365).default(30), // days

    // Clustering specific
    maxClusters: z.number().int().min(2).max(20).default(5),
  }).optional(),

  // Filters
  filters: z.object({
    patternTypes: z.array(BehaviorPatternTypeEnum).optional(),
    triggerTypes: z.array(TriggerTypeEnum).optional(),
    outcomeTypes: z.array(OutcomeTypeEnum).optional(),
    contextTypes: z.array(z.enum(['temporal', 'spatial', 'social', 'environmental', 'physiological', 'cognitive'])).optional(),
    tags: z.array(z.string().max(50)).optional(),
    isActive: z.boolean().optional(),
  }).optional(),

  // Output preferences
  output: z.object({
    includeStatistics: z.boolean().default(true),
    includeVisualization: z.boolean().default(false),
    format: z.enum(['summary', 'detailed', 'raw']).default('summary'),
    maxResults: z.number().int().min(1).max(1000).default(100),
  }).optional(),
}).refine((data) => {
  // Business logic: Time range validation
  return data.timeRange.start <= data.timeRange.end;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['timeRange'],
}).refine((data) => {
  // Business logic: Time range should not exceed reasonable limits
  const maxTimeSpan = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
  const timeSpan = data.timeRange.end.getTime() - data.timeRange.start.getTime();
  return timeSpan <= maxTimeSpan;
}, {
  message: 'Analysis time range cannot exceed 2 years',
  path: ['timeRange'],
}).refine((data) => {
  // Business logic: Entity ID requires entity type
  if (data.entityId && !data.entityType) {
    return false;
  }
  return true;
}, {
  message: 'Entity type must be provided when filtering by entity ID',
  path: ['entityType'],
});

// Bulk pattern operations validation
export const MicroBehaviorPatternBulkValidation = z.object({
  patterns: z.array(MicroBehaviorPatternValidation).min(1).max(20, {
    message: 'Cannot process more than 20 patterns at once',
  }),
}).refine((data) => {
  // Business logic: All patterns should have unique names within the bulk operation
  const patternNames = data.patterns.map(pattern => pattern.patternName);
  const uniqueNames = new Set(patternNames);
  return uniqueNames.size === patternNames.length;
}, {
  message: 'All patterns in a bulk operation must have unique names',
  path: ['patterns'],
});

// Pattern query validation
export const MicroBehaviorPatternQueryValidation = z.object({
  patternName: z.string().max(100).optional(),
  patternType: BehaviorPatternTypeEnum.optional(),
  entityType: EntityTypeEnum.optional(),
  entityId: z.number().int().positive().optional(),
  strength: PatternStrengthEnum.optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  significance: SignificanceLevelEnum.optional(),
  isActive: z.boolean().optional(),
  tags: z.array(z.string().max(50)).optional(),

  // Time range filters
  discoveredAfter: z.coerce.date().optional(),
  discoveredBefore: z.coerce.date().optional(),
  updatedAfter: z.coerce.date().optional(),
  updatedBefore: z.coerce.date().optional(),

  // Pagination and sorting
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['patternName', 'strength', 'confidence', 'discoveredAt', 'lastUpdated']).default('lastUpdated'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).refine((data) => {
  // Business logic: Date range validations
  if (data.discoveredAfter && data.discoveredBefore) {
    return data.discoveredAfter <= data.discoveredBefore;
  }
  return true;
}, {
  message: 'Discovered after date must be before or equal to discovered before date',
  path: ['discoveredAfter'],
}).refine((data) => {
  if (data.updatedAfter && data.updatedBefore) {
    return data.updatedAfter <= data.updatedBefore;
  }
  return true;
}, {
  message: 'Updated after date must be before or equal to updated before date',
  path: ['updatedAfter'],
}).refine((data) => {
  // Business logic: Entity ID requires entity type
  if (data.entityId && !data.entityType) {
    return false;
  }
  return true;
}, {
  message: 'Entity type must be provided when filtering by entity ID',
  path: ['entityType'],
});

// Export types for TypeScript
export type MicroBehaviorPatternInput = z.infer<typeof MicroBehaviorPatternValidation>;
export type ContextPatternInput = z.infer<typeof ContextPatternValidation>;
export type BehaviorTriggerInput = z.infer<typeof BehaviorTriggerValidation>;
export type BehaviorOutcomeInput = z.infer<typeof BehaviorOutcomeValidation>;
export type PatternAnalysisInput = z.infer<typeof PatternAnalysisValidation>;
export type MicroBehaviorPatternBulkInput = z.infer<typeof MicroBehaviorPatternBulkValidation>;
export type MicroBehaviorPatternQueryInput = z.infer<typeof MicroBehaviorPatternQueryValidation>;

export type BehaviorPatternType = z.infer<typeof BehaviorPatternTypeEnum>;
export type FrequencyPattern = z.infer<typeof FrequencyPatternEnum>;
export type TriggerType = z.infer<typeof TriggerTypeEnum>;
export type OutcomeType = z.infer<typeof OutcomeTypeEnum>;
export type SignificanceLevel = z.infer<typeof SignificanceLevelEnum>;
export type PatternStrength = z.infer<typeof PatternStrengthEnum>;
