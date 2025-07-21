import { z } from 'zod';

// Enum for aggregation options
const AggregationOption = z.enum(['daily', 'weekly', 'monthly']);

// Maximum date range in days to prevent performance issues
const MAX_DATE_RANGE_DAYS = 365;

export const HealthAnalyticsValidation = z.object({
  start_date: z.string()
    .datetime({ message: 'start_date must be a valid ISO datetime string' })
    .transform(val => new Date(val)),

  end_date: z.string()
    .datetime({ message: 'end_date must be a valid ISO datetime string' })
    .transform(val => new Date(val)),

  type_ids: z.array(z.number().int().positive({ message: 'type_id must be a positive integer' }))
    .min(1, { message: 'At least one type_id must be provided' })
    .max(10, { message: 'Maximum 10 type_ids allowed' })
    .optional(),

  aggregation: AggregationOption.default('daily'),
}).refine((data) => {
  // Ensure end_date is after start_date
  return data.end_date > data.start_date;
}, {
  message: 'end_date must be after start_date',
  path: ['end_date'],
}).refine((data) => {
  // Ensure date range is not too large (performance constraint)
  const diffInMs = data.end_date.getTime() - data.start_date.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return diffInDays <= MAX_DATE_RANGE_DAYS;
}, {
  message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
  path: ['end_date'],
}).refine((data) => {
  // Ensure start_date is not in the future
  return data.start_date <= new Date();
}, {
  message: 'start_date cannot be in the future',
  path: ['start_date'],
});

// Query parameters validation for GET requests (all optional with defaults)
export const HealthAnalyticsQueryValidation = z.object({
  start_date: z.string()
    .datetime({ message: 'start_date must be a valid ISO datetime string' })
    .transform(val => new Date(val))
    .optional(),

  end_date: z.string()
    .datetime({ message: 'end_date must be a valid ISO datetime string' })
    .transform(val => new Date(val))
    .optional(),

  type_ids: z.union([
    z.string().transform(val => val.split(',').map(id => Number.parseInt(id, 10))),
    z.array(z.string().transform(val => Number.parseInt(val, 10))),
  ]).pipe(
    z.array(z.number().int().positive({ message: 'type_id must be a positive integer' }))
      .max(10, { message: 'Maximum 10 type_ids allowed' }),
  ).optional(),

  aggregation: AggregationOption.optional().default('daily'),
}).transform((data) => {
  // Set default date range if not provided (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

  return {
    start_date: data.start_date || thirtyDaysAgo,
    end_date: data.end_date || now,
    type_ids: data.type_ids,
    aggregation: data.aggregation,
  };
}).refine((data) => {
  // Ensure end_date is after start_date
  return data.end_date > data.start_date;
}, {
  message: 'end_date must be after start_date',
  path: ['end_date'],
}).refine((data) => {
  // Ensure date range is not too large (performance constraint)
  const diffInMs = data.end_date.getTime() - data.start_date.getTime();
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return diffInDays <= MAX_DATE_RANGE_DAYS;
}, {
  message: `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
  path: ['end_date'],
}).refine((data) => {
  // Ensure start_date is not in the future
  return data.start_date <= new Date();
}, {
  message: 'start_date cannot be in the future',
  path: ['start_date'],
});

// Export types for TypeScript usage
export type HealthAnalyticsInput = z.infer<typeof HealthAnalyticsValidation>;
export type HealthAnalyticsQueryInput = z.infer<typeof HealthAnalyticsQueryValidation>;
export type AggregationOptionType = z.infer<typeof AggregationOption>;
