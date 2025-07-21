import { z } from 'zod';

// Goal status enum
export const GoalStatus = z.enum(['active', 'completed', 'paused']);

// Health goal validation schema
export const HealthGoalValidation = z.object({
  type_id: z.coerce.number().int().positive('Health type ID must be a positive integer'),
  target_value: z.coerce.number().positive('Target value must be a positive number'),
  target_date: z.coerce.date().refine(
    date => date > new Date(),
    'Target date must be in the future',
  ),
  status: GoalStatus.default('active'),
}).refine(
  (data) => {
    // Business logic validation for reasonable target values based on health type
    // These ranges can be adjusted based on specific health type requirements
    const reasonableRanges: Record<number, { min: number; max: number }> = {
      1: { min: 30, max: 300 }, // Weight (kg) - reasonable human weight range
      2: { min: 50, max: 200 }, // Systolic BP (mmHg)
      3: { min: 1000, max: 50000 }, // Daily steps
      4: { min: 10, max: 50 }, // BMI
      5: { min: 30, max: 300 }, // Heart rate (bpm) for resting/max
    };

    const range = reasonableRanges[data.type_id];
    if (range) {
      return data.target_value >= range.min && data.target_value <= range.max;
    }

    // For unknown health types, allow any positive value
    return data.target_value > 0;
  },
  {
    message: 'Target value is outside reasonable range for this health metric type',
    path: ['target_value'],
  },
);

// Validation for updating existing goals
export const HealthGoalUpdateValidation = z.object({
  target_value: z.coerce.number().positive('Target value must be a positive number').optional(),
  target_date: z.coerce.date().refine(
    date => date > new Date(),
    'Target date must be in the future',
  ).optional(),
  status: GoalStatus.optional(),
}).refine(
  (data) => {
    // At least one field must be provided for update
    return data.target_value !== undefined || data.target_date !== undefined || data.status !== undefined;
  },
  {
    message: 'At least one field must be provided for update',
  },
);

// Validation for goal progress tracking
export const HealthGoalProgressValidation = z.object({
  current_value: z.coerce.number().positive('Current value must be a positive number'),
  progress_date: z.coerce.date().refine(
    date => date <= new Date(),
    'Progress date cannot be in the future',
  ).default(() => new Date()),
});

// Export types for TypeScript usage
export type HealthGoalInput = z.infer<typeof HealthGoalValidation>;
export type HealthGoalUpdateInput = z.infer<typeof HealthGoalUpdateValidation>;
export type HealthGoalProgressInput = z.infer<typeof HealthGoalProgressValidation>;
export type GoalStatusType = z.infer<typeof GoalStatus>;
