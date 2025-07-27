/**
 * Health Scoring Utilities
 *
 * This module provides comprehensive utilities for scoring and normalizing health metrics
 * for use in health tracking applications, particularly for radar chart visualizations.
 */

import type { HealthRadarMetric, ScoringSystem } from '@/components/health/types';

// Re-export the HealthDataPoint type from HealthChart for consistency
export type HealthDataPoint = {
  date: string;
  value: number;
  unit?: string;
  label?: string;
};

/**
 * Health metric types supported by the scoring system
 */
export type HealthMetricType
  = | 'weight'
    | 'bmi'
    | 'steps'
    | 'sleep'
    | 'heart_rate'
    | 'blood_pressure_systolic'
    | 'blood_pressure_diastolic'
    | 'water_intake'
    | 'exercise_minutes'
    | 'calories_burned'
    | 'distance'
    | 'body_fat_percentage'
    | 'muscle_mass';

/**
 * User profile data for personalized scoring
 */
export type UserProfile = {
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number; // in cm
  weight: number; // in kg
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  goals?: {
    dailySteps?: number;
    sleepHours?: number;
    waterIntake?: number; // in ml
    exerciseMinutes?: number; // per week
  };
};

/**
 * Health metric range definition
 */
export type HealthMetricRange = {
  optimal: { min: number; max: number };
  good: { min: number; max: number };
  fair: { min: number; max: number };
  poor: { min: number; max: number };
  unit: string;
  higherIsBetter: boolean;
};

/**
 * Custom scoring rule for specific metrics
 */
export type CustomScoringRule = {
  metricType: HealthMetricType;
  scoreFunction: (value: number, userProfile?: UserProfile) => number;
  description: string;
};

/**
 * Score range colors for visualization
 */
export type ScoreColors = {
  excellent: string; // 80-100
  good: string; // 60-79
  fair: string; // 40-59
  poor: string; // 0-39
};

/**
 * Default color scheme for health scores
 */
export const DEFAULT_SCORE_COLORS: ScoreColors = {
  excellent: '#10b981', // green-500
  good: '#3b82f6', // blue-500
  fair: '#f59e0b', // amber-500
  poor: '#ef4444', // red-500
};

/**
 * Normalizes a health value to a 0-100 percentage score based on target ranges
 *
 * @param value - The raw health metric value
 * @param targetRange - The optimal range for the metric
 * @param higherIsBetter - Whether higher values are better (e.g., steps) or worse (e.g., blood pressure)
 * @returns Normalized score between 0-100
 *
 * @example
 * ```typescript
 * // For steps (higher is better)
 * const stepsScore = normalizeToPercentage(8000, { min: 0, max: 10000 }, true);
 * // Returns: 80
 *
 * // For resting heart rate (lower is better in normal range)
 * const hrScore = normalizeToPercentage(70, { min: 60, max: 100 }, false);
 * // Returns: 75 (closer to 60 is better)
 * ```
 */
export function normalizeToPercentage(
  value: number,
  targetRange: { min: number; max: number },
  higherIsBetter: boolean = true,
): number {
  if (value < 0) {
    return 0;
  }

  const { min, max } = targetRange;
  const range = max - min;

  if (range <= 0) {
    return 50;
  } // Default score if invalid range

  if (higherIsBetter) {
    // For metrics where higher values are better (steps, exercise, etc.)
    if (value >= max) {
      return 100;
    }
    if (value <= min) {
      return 0;
    }
    return Math.round(((value - min) / range) * 100);
  } else {
    // For metrics where lower values are better (resting HR, blood pressure, etc.)
    if (value <= min) {
      return 100;
    }
    if (value >= max) {
      return 0;
    }
    return Math.round(((max - value) / range) * 100);
  }
}

/**
 * Calculates Z-score for statistical normalization
 *
 * @param value - The value to normalize
 * @param mean - The mean of the dataset
 * @param standardDeviation - The standard deviation of the dataset
 * @returns Z-score converted to 0-100 scale
 *
 * @example
 * ```typescript
 * const zScore = calculateZScore(8500, 7000, 2000);
 * // Returns: ~57 (0.75 standard deviations above mean)
 * ```
 */
export function calculateZScore(
  value: number,
  mean: number,
  standardDeviation: number,
): number {
  if (standardDeviation <= 0) {
    return 50;
  } // Default score if invalid std dev

  const zScore = (value - mean) / standardDeviation;

  // Convert Z-score to 0-100 scale
  // Z-scores typically range from -3 to +3, so we map this to 0-100
  const normalizedScore = ((zScore + 3) / 6) * 100;

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(normalizedScore)));
}

/**
 * Creates a custom scoring function for specific health metrics
 *
 * @param rules - Array of custom scoring rules
 * @returns Function that applies custom scoring based on metric type
 *
 * @example
 * ```typescript
 * const customScoring = createCustomScoring([
 *   {
 *     metricType: 'bmi',
 *     scoreFunction: (bmi) => {
 *       if (bmi >= 18.5 && bmi <= 24.9) return 100;
 *       if (bmi >= 25 && bmi <= 29.9) return 70;
 *       return 30;
 *     },
 *     description: 'BMI-based scoring'
 *   }
 * ]);
 * ```
 */
export function createCustomScoring(rules: CustomScoringRule[]) {
  return function (metricType: HealthMetricType, value: number, userProfile?: UserProfile): number {
    const rule = rules.find(r => r.metricType === metricType);
    if (rule) {
      return Math.max(0, Math.min(100, Math.round(rule.scoreFunction(value, userProfile))));
    }
    return 50; // Default score if no custom rule found
  };
}

/**
 * Returns optimal ranges for different health metric types
 *
 * @param metricType - The type of health metric
 * @param userProfile - Optional user profile for personalized ranges
 * @returns Health metric range definition
 *
 * @example
 * ```typescript
 * const stepsRange = getHealthMetricRanges('steps');
 * // Returns: { optimal: { min: 8000, max: 12000 }, ... }
 * ```
 */
export function getHealthMetricRanges(
  metricType: HealthMetricType,
  userProfile?: UserProfile,
): HealthMetricRange {
  const baseRanges: Record<HealthMetricType, HealthMetricRange> = {
    weight: {
      optimal: { min: 50, max: 90 }, // Will be calculated based on BMI
      good: { min: 45, max: 100 },
      fair: { min: 40, max: 110 },
      poor: { min: 0, max: 200 },
      unit: 'kg',
      higherIsBetter: false,
    },
    bmi: {
      optimal: { min: 18.5, max: 24.9 },
      good: { min: 17, max: 27 },
      fair: { min: 15, max: 30 },
      poor: { min: 0, max: 50 },
      unit: 'kg/m²',
      higherIsBetter: false,
    },
    steps: {
      optimal: { min: 8000, max: 12000 },
      good: { min: 6000, max: 15000 },
      fair: { min: 3000, max: 20000 },
      poor: { min: 0, max: 30000 },
      unit: 'steps',
      higherIsBetter: true,
    },
    sleep: {
      optimal: { min: 7, max: 9 },
      good: { min: 6, max: 10 },
      fair: { min: 5, max: 11 },
      poor: { min: 0, max: 24 },
      unit: 'hours',
      higherIsBetter: false,
    },
    heart_rate: {
      optimal: { min: 60, max: 80 },
      good: { min: 50, max: 90 },
      fair: { min: 40, max: 100 },
      poor: { min: 0, max: 200 },
      unit: 'bpm',
      higherIsBetter: false,
    },
    blood_pressure_systolic: {
      optimal: { min: 90, max: 120 },
      good: { min: 80, max: 130 },
      fair: { min: 70, max: 140 },
      poor: { min: 0, max: 200 },
      unit: 'mmHg',
      higherIsBetter: false,
    },
    blood_pressure_diastolic: {
      optimal: { min: 60, max: 80 },
      good: { min: 50, max: 85 },
      fair: { min: 40, max: 90 },
      poor: { min: 0, max: 120 },
      unit: 'mmHg',
      higherIsBetter: false,
    },
    water_intake: {
      optimal: { min: 2000, max: 3000 },
      good: { min: 1500, max: 3500 },
      fair: { min: 1000, max: 4000 },
      poor: { min: 0, max: 6000 },
      unit: 'ml',
      higherIsBetter: true,
    },
    exercise_minutes: {
      optimal: { min: 150, max: 300 }, // per week
      good: { min: 100, max: 400 },
      fair: { min: 50, max: 500 },
      poor: { min: 0, max: 1000 },
      unit: 'min/week',
      higherIsBetter: true,
    },
    calories_burned: {
      optimal: { min: 300, max: 600 }, // per day
      good: { min: 200, max: 800 },
      fair: { min: 100, max: 1000 },
      poor: { min: 0, max: 2000 },
      unit: 'kcal',
      higherIsBetter: true,
    },
    distance: {
      optimal: { min: 5, max: 10 }, // km per day
      good: { min: 3, max: 15 },
      fair: { min: 1, max: 20 },
      poor: { min: 0, max: 50 },
      unit: 'km',
      higherIsBetter: true,
    },
    body_fat_percentage: {
      optimal: { min: 10, max: 20 }, // varies by gender
      good: { min: 8, max: 25 },
      fair: { min: 5, max: 30 },
      poor: { min: 0, max: 50 },
      unit: '%',
      higherIsBetter: false,
    },
    muscle_mass: {
      optimal: { min: 30, max: 50 }, // percentage
      good: { min: 25, max: 55 },
      fair: { min: 20, max: 60 },
      poor: { min: 0, max: 80 },
      unit: '%',
      higherIsBetter: true,
    },
  };

  const range = { ...baseRanges[metricType] };

  // Personalize ranges based on user profile
  if (userProfile) {
    switch (metricType) {
      case 'steps':
        if (userProfile.goals?.dailySteps) {
          const goal = userProfile.goals.dailySteps;
          range.optimal = { min: goal * 0.8, max: goal * 1.2 };
        }
        break;
      case 'sleep':
        if (userProfile.goals?.sleepHours) {
          const goal = userProfile.goals.sleepHours;
          range.optimal = { min: goal - 0.5, max: goal + 0.5 };
        }
        break;
      case 'water_intake':
        if (userProfile.goals?.waterIntake) {
          const goal = userProfile.goals.waterIntake;
          range.optimal = { min: goal * 0.9, max: goal * 1.1 };
        }
        break;
      case 'body_fat_percentage':
        // Adjust based on gender
        if (userProfile.gender === 'female') {
          range.optimal = { min: 16, max: 24 };
          range.good = { min: 14, max: 28 };
        } else if (userProfile.gender === 'male') {
          range.optimal = { min: 10, max: 18 };
          range.good = { min: 8, max: 22 };
        }
        break;
    }
  }

  return range;
}

/**
 * Scores a health metric value based on the specified scoring system
 *
 * @param metricType - Type of health metric
 * @param value - The metric value to score
 * @param scoringSystem - The scoring system to use
 * @param userProfile - Optional user profile for personalization
 * @param customRules - Optional custom scoring rules
 * @param statisticalData - Optional data for z-score calculation
 * @returns Normalized score between 0-100
 *
 * @example
 * ```typescript
 * const score = scoreHealthMetric('steps', 8500, 'percentage');
 * // Returns: 85 (based on percentage of daily goal)
 * ```
 */
export function scoreHealthMetric(
  metricType: HealthMetricType,
  value: number,
  scoringSystem: ScoringSystem = 'percentage',
  userProfile?: UserProfile,
  customRules?: CustomScoringRule[],
  statisticalData?: { mean: number; standardDeviation: number },
): number {
  switch (scoringSystem) {
    case 'percentage': {
      const range = getHealthMetricRanges(metricType, userProfile);
      return normalizeToPercentage(value, range.optimal, range.higherIsBetter);
    }

    case 'z-score': {
      if (!statisticalData) {
        // Fallback to percentage if no statistical data provided
        const range = getHealthMetricRanges(metricType, userProfile);
        return normalizeToPercentage(value, range.optimal, range.higherIsBetter);
      }
      return calculateZScore(value, statisticalData.mean, statisticalData.standardDeviation);
    }

    case 'custom': {
      if (!customRules) {
        // Fallback to percentage if no custom rules provided
        const range = getHealthMetricRanges(metricType, userProfile);
        return normalizeToPercentage(value, range.optimal, range.higherIsBetter);
      }
      const customScoring = createCustomScoring(customRules);
      return customScoring(metricType, value, userProfile);
    }

    default:
      return 50; // Default score
  }
}

/**
 * Assigns color based on score range
 *
 * @param score - Score value (0-100)
 * @param colors - Optional custom color scheme
 * @returns Color string for the score
 *
 * @example
 * ```typescript
 * const color = getScoreColor(85);
 * // Returns: '#10b981' (excellent/green)
 * ```
 */
export function getScoreColor(score: number, colors: ScoreColors = DEFAULT_SCORE_COLORS): string {
  if (score >= 80) {
    return colors.excellent;
  }
  if (score >= 60) {
    return colors.good;
  }
  if (score >= 40) {
    return colors.fair;
  }
  return colors.poor;
}

/**
 * Gets score category label based on score value
 *
 * @param score - Score value (0-100)
 * @returns Category label
 *
 * @example
 * ```typescript
 * const category = getScoreCategory(85);
 * // Returns: 'excellent'
 * ```
 */
export function getScoreCategory(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) {
    return 'excellent';
  }
  if (score >= 60) {
    return 'good';
  }
  if (score >= 40) {
    return 'fair';
  }
  return 'poor';
}

/**
 * Transforms multiple HealthDataPoint arrays into HealthRadarMetric format
 *
 * @param healthDataSets - Object mapping metric types to their data arrays
 * @param scoringSystem - Scoring system to use for normalization
 * @param userProfile - Optional user profile for personalization
 * @param customRules - Optional custom scoring rules
 * @param colors - Optional custom color scheme
 * @returns Array of HealthRadarMetric objects suitable for radar chart
 *
 * @example
 * ```typescript
 * const radarData = aggregateRadarData({
 *   steps: [{ date: '2024-01-01', value: 8500 }],
 *   sleep: [{ date: '2024-01-01', value: 7.5 }],
 *   heart_rate: [{ date: '2024-01-01', value: 72 }]
 * }, 'percentage');
 * ```
 */
export function aggregateRadarData(
  healthDataSets: Record<HealthMetricType, HealthDataPoint[]>,
  scoringSystem: ScoringSystem = 'percentage',
  userProfile?: UserProfile,
  customRules?: CustomScoringRule[],
  colors: ScoreColors = DEFAULT_SCORE_COLORS,
): HealthRadarMetric[] {
  const metrics: HealthRadarMetric[] = [];

  Object.entries(healthDataSets).forEach(([metricType, dataPoints]) => {
    if (!dataPoints || dataPoints.length === 0) {
      return;
    }

    // Use the most recent data point
    const latestData = dataPoints[dataPoints.length - 1];
    const value = latestData.value;

    // Get metric range for max value calculation
    const range = getHealthMetricRanges(metricType as HealthMetricType, userProfile);

    // Calculate score
    const score = scoreHealthMetric(
      metricType as HealthMetricType,
      value,
      scoringSystem,
      userProfile,
      customRules,
    );

    // Determine max value for radar chart scaling
    const maxValue = range.higherIsBetter ? range.good.max : range.optimal.max;

    // Create radar metric
    const radarMetric: HealthRadarMetric = {
      category: formatMetricName(metricType as HealthMetricType),
      value,
      maxValue,
      unit: latestData.unit || range.unit,
      score,
      color: getScoreColor(score, colors),
      icon: getMetricIcon(metricType as HealthMetricType),
    };

    metrics.push(radarMetric);
  });

  return metrics;
}

/**
 * Formats metric type name for display
 *
 * @param metricType - The metric type to format
 * @returns Formatted display name
 */
function formatMetricName(metricType: HealthMetricType): string {
  const nameMap: Record<HealthMetricType, string> = {
    weight: 'Weight',
    bmi: 'BMI',
    steps: 'Daily Steps',
    sleep: 'Sleep Quality',
    heart_rate: 'Heart Rate',
    blood_pressure_systolic: 'Systolic BP',
    blood_pressure_diastolic: 'Diastolic BP',
    water_intake: 'Water Intake',
    exercise_minutes: 'Exercise',
    calories_burned: 'Calories Burned',
    distance: 'Distance',
    body_fat_percentage: 'Body Fat %',
    muscle_mass: 'Muscle Mass',
  };

  return nameMap[metricType] || metricType;
}

/**
 * Gets icon for metric type
 *
 * @param metricType - The metric type
 * @returns Icon string (emoji or icon name)
 */
function getMetricIcon(metricType: HealthMetricType): string {
  const iconMap: Record<HealthMetricType, string> = {
    weight: '⚖️',
    bmi: '📊',
    steps: '👟',
    sleep: '😴',
    heart_rate: '❤️',
    blood_pressure_systolic: '🩺',
    blood_pressure_diastolic: '🩺',
    water_intake: '💧',
    exercise_minutes: '🏃',
    calories_burned: '🔥',
    distance: '📏',
    body_fat_percentage: '📈',
    muscle_mass: '💪',
  };

  return iconMap[metricType] || '📊';
}

/**
 * Calculates statistical data for z-score normalization
 *
 * @param dataPoints - Array of health data points
 * @returns Statistical data with mean and standard deviation
 *
 * @example
 * ```typescript
 * const stats = calculateStatisticalData([
 *   { date: '2024-01-01', value: 8000 },
 *   { date: '2024-01-02', value: 9000 },
 *   { date: '2024-01-03', value: 7500 }
 * ]);
 * // Returns: { mean: 8166.67, standardDeviation: 611.01 }
 * ```
 */
export function calculateStatisticalData(dataPoints: HealthDataPoint[]): { mean: number; standardDeviation: number } {
  if (dataPoints.length === 0) {
    return { mean: 0, standardDeviation: 1 };
  }

  const values = dataPoints.map(point => point.value);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    mean: Math.round(mean * 100) / 100,
    standardDeviation: Math.max(1, Math.round(standardDeviation * 100) / 100), // Ensure min std dev of 1
  };
}
