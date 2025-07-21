import { z } from 'zod';

// Health type enum for validation
export const HealthTypeEnum = z.enum([
  'weight',
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
  'heart_rate',
  'steps',
  'sleep_hours',
  'water_intake',
  'calories',
  'exercise_minutes',
  'blood_sugar',
  'temperature',
  'oxygen_saturation',
]);

// Unit validation based on health type
const unitValidation = z.string().min(1).max(20).refine((unit) => {
  const validUnits = [
    'kg',
    'lbs',
    'mmHg',
    'bpm',
    'steps',
    'hours',
    'ml',
    'oz',
    'kcal',
    'minutes',
    'mg/dL',
    'mmol/L',
    '°C',
    '°F',
    '%',
  ];
  return validUnits.includes(unit);
}, {
  message: 'Invalid unit. Must be one of: kg, lbs, mmHg, bpm, steps, hours, ml, oz, kcal, minutes, mg/dL, mmol/L, °C, °F, %',
});

// Value range validation based on health type
const createValueValidation = (typeId: number, value: number) => {
  const ranges: Record<string, { min: number; max: number }> = {
    weight: { min: 20, max: 500 }, // kg or lbs
    blood_pressure_systolic: { min: 70, max: 250 }, // mmHg
    blood_pressure_diastolic: { min: 40, max: 150 }, // mmHg
    heart_rate: { min: 30, max: 220 }, // bpm
    steps: { min: 0, max: 100000 }, // steps per day
    sleep_hours: { min: 0, max: 24 }, // hours
    water_intake: { min: 0, max: 10000 }, // ml or oz
    calories: { min: 0, max: 10000 }, // kcal
    exercise_minutes: { min: 0, max: 1440 }, // minutes per day
    blood_sugar: { min: 20, max: 600 }, // mg/dL or mmol/L
    temperature: { min: 90, max: 110 }, // °F or 32-43°C
    oxygen_saturation: { min: 70, max: 100 }, // %
  };

  // For now, we'll use a general range since we don't have type lookup
  // In a real implementation, this would query the health type
  return value >= 0 && value <= 10000;
};

// Base health record validation
export const HealthRecordValidation = z.object({
  type_id: z.coerce.number().int().positive({
    message: 'Health type ID must be a positive integer',
  }),
  value: z.coerce.number().positive({
    message: 'Value must be a positive number',
  }).refine(value => value <= 10000, {
    message: 'Value exceeds maximum allowed range',
  }),
  unit: unitValidation,
  recorded_at: z.coerce.date().refine((date) => {
    const now = new Date();
    return date <= now;
  }, {
    message: 'Recorded date cannot be in the future',
  }).refine((date) => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return date >= oneYearAgo;
  }, {
    message: 'Recorded date cannot be more than one year ago',
  }),
}).refine((data) => {
  // Custom validation for value ranges based on common health metrics
  if (data.value < 0) {
    return false;
  }

  // Additional business logic validation
  if (data.unit === '%' && data.value > 100) {
    return false;
  }
  if (data.unit === 'hours' && data.value > 24) {
    return false;
  }
  if (data.unit === 'minutes' && data.value > 1440) {
    return false;
  }

  return true;
}, {
  message: 'Value is not reasonable for the specified unit',
});

// Validation for updating health records
export const HealthRecordUpdateValidation = HealthRecordValidation.partial().extend({
  id: z.coerce.number().int().positive({
    message: 'Record ID must be a positive integer',
  }),
});

// Validation for health record queries/filters
export const HealthRecordQueryValidation = z.object({
  type_id: z.coerce.number().int().positive().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    return data.start_date <= data.end_date;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
});

// Validation for bulk health record operations
export const HealthRecordBulkValidation = z.object({
  records: z.array(HealthRecordValidation).min(1).max(50, {
    message: 'Cannot process more than 50 records at once',
  }),
});

// Export types for TypeScript
export type HealthRecordInput = z.infer<typeof HealthRecordValidation>;
export type HealthRecordUpdateInput = z.infer<typeof HealthRecordUpdateValidation>;
export type HealthRecordQueryInput = z.infer<typeof HealthRecordQueryValidation>;
export type HealthRecordBulkInput = z.infer<typeof HealthRecordBulkValidation>;
export type HealthType = z.infer<typeof HealthTypeEnum>;
