import { z } from 'zod';

// Fitness level enum for validation
export const FitnessLevelEnum = z.enum([
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);

// Experience level enum for validation
export const ExperienceLevelEnum = z.enum([
  'none',
  'less_than_6_months',
  '6_months_to_1_year',
  '1_to_2_years',
  '2_to_5_years',
  'more_than_5_years',
]);

// Fitness goal type enum for validation
export const FitnessGoalTypeEnum = z.enum([
  'weight_loss',
  'muscle_gain',
  'endurance',
  'strength',
  'flexibility',
  'general_fitness',
  'rehabilitation',
  'maintenance',
]);

// Workout type enum for validation
export const WorkoutTypeEnum = z.enum([
  'strength',
  'cardio',
  'yoga',
  'pilates',
  'crossfit',
  'running',
  'cycling',
  'swimming',
  'hiking',
  'dancing',
  'martial_arts',
  'sports',
]);

// Equipment enum for validation
export const EquipmentEnum = z.enum([
  'none',
  'dumbbells',
  'barbell',
  'resistance_bands',
  'kettlebell',
  'treadmill',
  'bike',
  'rowing_machine',
  'pull_up_bar',
  'yoga_mat',
  'foam_roller',
  'medicine_ball',
]);

// Constraint type enum for validation
export const ConstraintTypeEnum = z.enum([
  'injury',
  'schedule',
  'equipment',
  'location',
  'medical',
  'dietary',
  'mobility',
]);

// Severity enum for validation
export const SeverityEnum = z.enum([
  'low',
  'medium',
  'high',
  'critical',
]);

// Time of day enum for validation
export const TimeOfDayEnum = z.enum([
  'early_morning',
  'morning',
  'late_morning',
  'afternoon',
  'evening',
  'night',
  'late_night',
]);

// Day of week enum for validation
export const DayOfWeekEnum = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

// Priority level enum for validation
export const PriorityLevelEnum = z.enum([
  'low',
  'medium',
  'high',
  'critical',
]);

// Goal status enum for validation
export const GoalStatusEnum = z.enum([
  'active',
  'paused',
  'completed',
  'abandoned',
  'archived',
]);

// Core user profile validation
export const UserProfileValidation = z.object({
  fitness_level: FitnessLevelEnum,
  experience_level: ExperienceLevelEnum,
  age: z.coerce.number().int().min(13, {
    message: 'Age must be at least 13 years old',
  }).max(120, {
    message: 'Age must be less than 120 years',
  }),
  height: z.coerce.number().positive({
    message: 'Height must be a positive number',
  }).min(50, {
    message: 'Height must be at least 50 cm',
  }).max(300, {
    message: 'Height must be less than 300 cm',
  }),
  weight: z.coerce.number().positive({
    message: 'Weight must be a positive number',
  }).min(20, {
    message: 'Weight must be at least 20 kg',
  }).max(500, {
    message: 'Weight must be less than 500 kg',
  }),
  timezone: z.string().min(1, {
    message: 'Timezone is required',
  }).max(50, {
    message: 'Timezone must be less than 50 characters',
  }),
  activity_level: z.coerce.number().min(1, {
    message: 'Activity level must be at least 1',
  }).max(5, {
    message: 'Activity level must be at most 5',
  }),
  weekly_workout_frequency: z.coerce.number().int().min(0, {
    message: 'Weekly workout frequency cannot be negative',
  }).max(14, {
    message: 'Weekly workout frequency cannot exceed 14 sessions',
  }),
  preferred_workout_duration: z.coerce.number().int().min(5, {
    message: 'Workout duration must be at least 5 minutes',
  }).max(300, {
    message: 'Workout duration cannot exceed 300 minutes',
  }),
  bio: z.string().max(500, {
    message: 'Bio must be less than 500 characters',
  }).optional(),
  profile_picture_url: z.string().url({
    message: 'Profile picture must be a valid URL',
  }).optional(),
}).refine((data) => {
  // Business logic validation for reasonable combinations
  if (data.fitness_level === 'beginner' && data.experience_level === 'more_than_5_years') {
    return false;
  }
  if (data.fitness_level === 'expert' && data.experience_level === 'none') {
    return false;
  }
  if (data.weekly_workout_frequency > 7 && data.fitness_level === 'beginner') {
    return false;
  }
  return true;
}, {
  message: 'Fitness level and experience level combination is not reasonable',
});

// Fitness goal validation
export const UserFitnessGoalValidation = z.object({
  goal_type: FitnessGoalTypeEnum,
  target_value: z.coerce.number().positive({
    message: 'Target value must be a positive number',
  }).optional(),
  target_unit: z.string().max(20, {
    message: 'Target unit must be less than 20 characters',
  }).optional(),
  target_date: z.coerce.date().refine((date) => {
    const now = new Date();
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    return date > now && date <= maxDate;
  }, {
    message: 'Target date must be in the future but within 2 years',
  }),
  priority_level: PriorityLevelEnum,
  status: GoalStatusEnum.default('active'),
  description: z.string().min(1, {
    message: 'Goal description is required',
  }).max(200, {
    message: 'Goal description must be less than 200 characters',
  }),
  weekly_target: z.coerce.number().positive({
    message: 'Weekly target must be a positive number',
  }).optional(),
  notes: z.string().max(500, {
    message: 'Notes must be less than 500 characters',
  }).optional(),
}).refine((data) => {
  // Business logic validation for reasonable goals
  if (data.goal_type === 'weight_loss' && data.target_value && data.target_value > 50) {
    return false; // Unrealistic weight loss target
  }
  if (data.goal_type === 'muscle_gain' && data.target_value && data.target_value > 30) {
    return false; // Unrealistic muscle gain target
  }

  // Validate target date is reasonable for goal type
  const now = new Date();
  const timeDiff = data.target_date.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  if (data.goal_type === 'weight_loss' && daysDiff < 30) {
    return false; // Weight loss goals should be at least 30 days
  }
  if (data.goal_type === 'muscle_gain' && daysDiff < 60) {
    return false; // Muscle gain goals should be at least 60 days
  }

  return true;
}, {
  message: 'Goal target or timeline is not reasonable for the specified goal type',
});

// User preference validation
export const UserPreferenceValidation = z.object({
  preferred_workout_types: z.array(WorkoutTypeEnum).min(1, {
    message: 'At least one workout type must be selected',
  }).max(5, {
    message: 'Cannot select more than 5 workout types',
  }),
  preferred_times: z.array(TimeOfDayEnum).min(1, {
    message: 'At least one preferred time must be selected',
  }),
  preferred_days: z.array(DayOfWeekEnum).min(1, {
    message: 'At least one preferred day must be selected',
  }),
  available_equipment: z.array(EquipmentEnum).max(10, {
    message: 'Cannot select more than 10 equipment types',
  }),
  workout_intensity_preference: z.coerce.number().min(1, {
    message: 'Workout intensity must be at least 1',
  }).max(5, {
    message: 'Workout intensity must be at most 5',
  }),
  rest_day_preference: z.coerce.number().int().min(1, {
    message: 'Must have at least 1 rest day per week',
  }).max(6, {
    message: 'Cannot have more than 6 rest days per week',
  }),
  notification_preferences: z.object({
    workout_reminders: z.boolean().default(true),
    goal_progress: z.boolean().default(true),
    weekly_summary: z.boolean().default(true),
    achievement_alerts: z.boolean().default(true),
  }).default({}),
  privacy_settings: z.object({
    profile_visibility: z.enum(['public', 'friends', 'private']).default('private'),
    share_workout_data: z.boolean().default(false),
    share_progress: z.boolean().default(false),
  }).default({}),
}).refine((data) => {
  // Business logic validation for preference combinations
  const totalWorkoutDays = 7 - data.rest_day_preference;
  if (data.preferred_days.length > totalWorkoutDays) {
    return false; // Cannot prefer more days than available workout days
  }

  // Validate equipment and workout type compatibility
  const hasCardioEquipment = data.available_equipment.some(eq =>
    ['treadmill', 'bike', 'rowing_machine'].includes(eq),
  );
  const prefersCardio = data.preferred_workout_types.includes('cardio');

  if (prefersCardio && !hasCardioEquipment && !data.available_equipment.includes('none')) {
    // This is just a warning case, not a hard validation failure
  }

  return true;
}, {
  message: 'Workout preferences and available equipment are not compatible',
});

// User constraint validation
export const UserConstraintValidation = z.object({
  constraint_type: ConstraintTypeEnum,
  severity: SeverityEnum,
  description: z.string().min(1, {
    message: 'Constraint description is required',
  }).max(300, {
    message: 'Constraint description must be less than 300 characters',
  }),
  affected_areas: z.array(z.string()).max(10, {
    message: 'Cannot specify more than 10 affected areas',
  }).optional(),
  start_date: z.coerce.date().refine((date) => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return date >= oneYearAgo;
  }, {
    message: 'Start date cannot be more than one year ago',
  }),
  end_date: z.coerce.date().optional(),
  is_permanent: z.boolean().default(false),
  impact_level: z.coerce.number().min(1, {
    message: 'Impact level must be at least 1',
  }).max(5, {
    message: 'Impact level must be at most 5',
  }),
  restrictions: z.array(z.string()).max(20, {
    message: 'Cannot specify more than 20 restrictions',
  }).optional(),
  accommodations: z.array(z.string()).max(20, {
    message: 'Cannot specify more than 20 accommodations',
  }).optional(),
  notes: z.string().max(500, {
    message: 'Notes must be less than 500 characters',
  }).optional(),
}).refine((data) => {
  // Business logic validation for constraints
  if (data.end_date && data.start_date >= data.end_date) {
    return false; // End date must be after start date
  }

  if (data.is_permanent && data.end_date) {
    return false; // Permanent constraints cannot have end dates
  }

  // Validate severity and impact level correlation
  const severityToImpact: Record<string, number[]> = {
    low: [1, 2],
    medium: [2, 3, 4],
    high: [3, 4, 5],
    critical: [4, 5],
  };

  if (!severityToImpact[data.severity]?.includes(data.impact_level)) {
    return false; // Severity and impact level must be correlated
  }

  return true;
}, {
  message: 'Constraint dates, severity, or impact level are not valid',
});

// Validation for updating user profile
export const UserProfileUpdateValidation = UserProfileValidation.partial().extend({
  id: z.coerce.number().int().positive({
    message: 'Profile ID must be a positive integer',
  }).optional(),
  updated_at: z.coerce.date().optional(),
});

// Validation for updating fitness goals
export const UserFitnessGoalUpdateValidation = UserFitnessGoalValidation.partial().extend({
  id: z.coerce.number().int().positive({
    message: 'Goal ID must be a positive integer',
  }),
  progress_percentage: z.coerce.number().min(0, {
    message: 'Progress percentage cannot be negative',
  }).max(100, {
    message: 'Progress percentage cannot exceed 100',
  }).optional(),
  updated_at: z.coerce.date().optional(),
});

// Validation for updating preferences
export const UserPreferenceUpdateValidation = UserPreferenceValidation.partial().extend({
  id: z.coerce.number().int().positive({
    message: 'Preference ID must be a positive integer',
  }).optional(),
});

// Validation for updating constraints
export const UserConstraintUpdateValidation = UserConstraintValidation.partial().extend({
  id: z.coerce.number().int().positive({
    message: 'Constraint ID must be a positive integer',
  }),
  is_active: z.boolean().optional(),
  resolution_notes: z.string().max(300, {
    message: 'Resolution notes must be less than 300 characters',
  }).optional(),
});

// Validation for user profile queries/filters
export const UserProfileQueryValidation = z.object({
  fitness_level: FitnessLevelEnum.optional(),
  experience_level: ExperienceLevelEnum.optional(),
  age_min: z.coerce.number().int().min(13).optional(),
  age_max: z.coerce.number().int().max(120).optional(),
  activity_level_min: z.coerce.number().min(1).max(5).optional(),
  activity_level_max: z.coerce.number().min(1).max(5).optional(),
  include_goals: z.boolean().default(false),
  include_preferences: z.boolean().default(false),
  include_constraints: z.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sort_by: z.enum(['created_at', 'updated_at', 'fitness_level', 'age']).default('updated_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
}).refine((data) => {
  if (data.age_min && data.age_max && data.age_min > data.age_max) {
    return false;
  }
  if (data.activity_level_min && data.activity_level_max && data.activity_level_min > data.activity_level_max) {
    return false;
  }
  return true;
}, {
  message: 'Minimum values cannot be greater than maximum values',
});

// Validation for fitness goal queries
export const UserFitnessGoalQueryValidation = z.object({
  goal_type: FitnessGoalTypeEnum.optional(),
  status: GoalStatusEnum.optional(),
  priority_level: PriorityLevelEnum.optional(),
  target_date_start: z.coerce.date().optional(),
  target_date_end: z.coerce.date().optional(),
  include_completed: z.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
}).refine((data) => {
  if (data.target_date_start && data.target_date_end) {
    return data.target_date_start <= data.target_date_end;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
});

// Validation for constraint queries
export const UserConstraintQueryValidation = z.object({
  constraint_type: ConstraintTypeEnum.optional(),
  severity: SeverityEnum.optional(),
  is_active: z.boolean().optional(),
  is_permanent: z.boolean().optional(),
  impact_level_min: z.coerce.number().min(1).max(5).optional(),
  impact_level_max: z.coerce.number().min(1).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

// Validation for profile completion calculation
export const ProfileCompletenessValidation = z.object({
  basic_info_weight: z.coerce.number().min(0).max(1).default(0.3),
  goals_weight: z.coerce.number().min(0).max(1).default(0.25),
  preferences_weight: z.coerce.number().min(0).max(1).default(0.25),
  constraints_weight: z.coerce.number().min(0).max(1).default(0.2),
}).refine((data) => {
  const total = data.basic_info_weight + data.goals_weight + data.preferences_weight + data.constraints_weight;
  return Math.abs(total - 1.0) < 0.01; // Allow for floating point precision
}, {
  message: 'Profile completeness weights must sum to 1.0',
});

// Validation for bulk operations
export const UserProfileBulkValidation = z.object({
  profiles: z.array(UserProfileValidation).min(1).max(20, {
    message: 'Cannot process more than 20 profiles at once',
  }),
});

export const UserFitnessGoalBulkValidation = z.object({
  goals: z.array(UserFitnessGoalValidation).min(1).max(50, {
    message: 'Cannot process more than 50 goals at once',
  }),
});

// Export types for TypeScript
export type UserProfileInput = z.infer<typeof UserProfileValidation>;
export type UserProfileUpdateInput = z.infer<typeof UserProfileUpdateValidation>;
export type UserProfileQueryInput = z.infer<typeof UserProfileQueryValidation>;
export type UserProfileBulkInput = z.infer<typeof UserProfileBulkValidation>;

export type UserFitnessGoalInput = z.infer<typeof UserFitnessGoalValidation>;
export type UserFitnessGoalUpdateInput = z.infer<typeof UserFitnessGoalUpdateValidation>;
export type UserFitnessGoalQueryInput = z.infer<typeof UserFitnessGoalQueryValidation>;
export type UserFitnessGoalBulkInput = z.infer<typeof UserFitnessGoalBulkValidation>;

export type UserPreferenceInput = z.infer<typeof UserPreferenceValidation>;
export type UserPreferenceUpdateInput = z.infer<typeof UserPreferenceUpdateValidation>;

export type UserConstraintInput = z.infer<typeof UserConstraintValidation>;
export type UserConstraintUpdateInput = z.infer<typeof UserConstraintUpdateValidation>;
export type UserConstraintQueryInput = z.infer<typeof UserConstraintQueryValidation>;

export type ProfileCompletenessInput = z.infer<typeof ProfileCompletenessValidation>;

export type FitnessLevel = z.infer<typeof FitnessLevelEnum>;
export type ExperienceLevel = z.infer<typeof ExperienceLevelEnum>;
export type FitnessGoalType = z.infer<typeof FitnessGoalTypeEnum>;
export type WorkoutType = z.infer<typeof WorkoutTypeEnum>;
export type Equipment = z.infer<typeof EquipmentEnum>;
export type ConstraintType = z.infer<typeof ConstraintTypeEnum>;
export type Severity = z.infer<typeof SeverityEnum>;
export type TimeOfDay = z.infer<typeof TimeOfDayEnum>;
export type DayOfWeek = z.infer<typeof DayOfWeekEnum>;
export type PriorityLevel = z.infer<typeof PriorityLevelEnum>;
export type GoalStatus = z.infer<typeof GoalStatusEnum>;
