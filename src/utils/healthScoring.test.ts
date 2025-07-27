/**
 * Unit tests for health scoring utility functions
 *
 * Tests all scoring functions with various health metrics, edge cases,
 * and realistic health data scenarios to ensure accurate scoring and normalization.
 */

import type { CustomScoringRule, HealthDataPoint, HealthMetricType, ScoreColors, UserProfile } from './healthScoring';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  aggregateRadarData,
  calculateStatisticalData,
  calculateZScore,
  createCustomScoring,

  DEFAULT_SCORE_COLORS,
  getHealthMetricRanges,
  getScoreCategory,
  getScoreColor,

  normalizeToPercentage,

  scoreHealthMetric,

} from './healthScoring';

describe('Health Scoring Utilities', () => {
  let mockUserProfile: UserProfile;
  let mockHealthData: Record<HealthMetricType, HealthDataPoint[]>;

  beforeEach(() => {
    mockUserProfile = {
      age: 30,
      gender: 'male',
      height: 175,
      weight: 70,
      activityLevel: 'moderately_active',
      goals: {
        dailySteps: 10000,
        sleepHours: 8,
        waterIntake: 2500,
        exerciseMinutes: 150,
      },
    };

    mockHealthData = {
      steps: [
        { date: '2024-01-01', value: 8500, unit: 'steps' },
        { date: '2024-01-02', value: 9200, unit: 'steps' },
        { date: '2024-01-03', value: 7800, unit: 'steps' },
      ],
      sleep: [
        { date: '2024-01-01', value: 7.5, unit: 'hours' },
        { date: '2024-01-02', value: 8.2, unit: 'hours' },
        { date: '2024-01-03', value: 6.8, unit: 'hours' },
      ],
      heart_rate: [
        { date: '2024-01-01', value: 72, unit: 'bpm' },
        { date: '2024-01-02', value: 68, unit: 'bpm' },
        { date: '2024-01-03', value: 75, unit: 'bpm' },
      ],
    };
  });

  describe('normalizeToPercentage', () => {
    it('should correctly normalize values when higher is better', () => {
      // Steps: 8000 out of 10000 target = 80%
      const result = normalizeToPercentage(8000, { min: 0, max: 10000 }, true);

      expect(result).toBe(80);
    });

    it('should correctly normalize values when lower is better', () => {
      // Heart rate: 70 in range 60-100, closer to 60 is better
      const result = normalizeToPercentage(70, { min: 60, max: 100 }, false);

      expect(result).toBe(75);
    });

    it('should return 100 for values at or above max when higher is better', () => {
      const result = normalizeToPercentage(12000, { min: 0, max: 10000 }, true);

      expect(result).toBe(100);
    });

    it('should return 0 for values at or below min when higher is better', () => {
      const result = normalizeToPercentage(0, { min: 0, max: 10000 }, true);

      expect(result).toBe(0);
    });

    it('should return 100 for values at or below min when lower is better', () => {
      const result = normalizeToPercentage(60, { min: 60, max: 100 }, false);

      expect(result).toBe(100);
    });

    it('should return 0 for values at or above max when lower is better', () => {
      const result = normalizeToPercentage(100, { min: 60, max: 100 }, false);

      expect(result).toBe(0);
    });

    it('should handle negative values by returning 0', () => {
      const result = normalizeToPercentage(-100, { min: 0, max: 10000 }, true);

      expect(result).toBe(0);
    });

    it('should handle invalid range by returning default score', () => {
      const result = normalizeToPercentage(5000, { min: 10000, max: 5000 }, true);

      expect(result).toBe(50);
    });

    it('should handle zero range by returning default score', () => {
      const result = normalizeToPercentage(5000, { min: 5000, max: 5000 }, true);

      expect(result).toBe(50);
    });

    it('should round results to nearest integer', () => {
      const result = normalizeToPercentage(3333, { min: 0, max: 10000 }, true);

      expect(result).toBe(33); // 33.33 rounded to 33
    });
  });

  describe('calculateZScore', () => {
    it('should correctly calculate z-score for value above mean', () => {
      // Value 1 std dev above mean should give ~67 on 0-100 scale
      const result = calculateZScore(9000, 7000, 2000);

      expect(result).toBe(67); // (1 + 3) / 6 * 100 = 66.67 ≈ 67
    });

    it('should correctly calculate z-score for value below mean', () => {
      // Value 1 std dev below mean should give ~33 on 0-100 scale
      const result = calculateZScore(5000, 7000, 2000);

      expect(result).toBe(33); // (-1 + 3) / 6 * 100 = 33.33 ≈ 33
    });

    it('should return 50 for value equal to mean', () => {
      const result = calculateZScore(7000, 7000, 2000);

      expect(result).toBe(50); // (0 + 3) / 6 * 100 = 50
    });

    it('should handle extreme positive z-scores by clamping to 100', () => {
      const result = calculateZScore(20000, 7000, 2000);

      expect(result).toBe(100); // Very high z-score clamped to 100
    });

    it('should handle extreme negative z-scores by clamping to 0', () => {
      const result = calculateZScore(-10000, 7000, 2000);

      expect(result).toBe(0); // Very low z-score clamped to 0
    });

    it('should handle zero standard deviation by returning default score', () => {
      const result = calculateZScore(7000, 7000, 0);

      expect(result).toBe(50);
    });

    it('should handle negative standard deviation by returning default score', () => {
      const result = calculateZScore(7000, 7000, -1000);

      expect(result).toBe(50);
    });
  });

  describe('createCustomScoring', () => {
    it('should apply custom scoring rules correctly', () => {
      const customRules: CustomScoringRule[] = [
        {
          metricType: 'bmi',
          scoreFunction: (bmi) => {
            if (bmi >= 18.5 && bmi <= 24.9) {
              return 100;
            }
            if (bmi >= 25 && bmi <= 29.9) {
              return 70;
            }
            if (bmi >= 17 && bmi < 18.5) {
              return 80;
            }
            return 30;
          },
          description: 'BMI-based scoring',
        },
      ];

      const customScoring = createCustomScoring(customRules);

      // Normal BMI
      expect(customScoring('bmi', 22, mockUserProfile)).toBe(100);

      // Overweight BMI
      expect(customScoring('bmi', 27, mockUserProfile)).toBe(70);

      // Underweight BMI
      expect(customScoring('bmi', 18, mockUserProfile)).toBe(80);

      // Obese BMI
      expect(customScoring('bmi', 35, mockUserProfile)).toBe(30);
    });

    it('should return default score for metrics without custom rules', () => {
      const customRules: CustomScoringRule[] = [
        {
          metricType: 'bmi',
          scoreFunction: () => 100,
          description: 'BMI only',
        },
      ];

      const customScoring = createCustomScoring(customRules);
      const result = customScoring('steps', 8000, mockUserProfile);

      expect(result).toBe(50);
    });

    it('should clamp custom scores to 0-100 range', () => {
      const customRules: CustomScoringRule[] = [
        {
          metricType: 'steps',
          scoreFunction: () => 150, // Above 100
          description: 'High score',
        },
      ];

      const customScoring = createCustomScoring(customRules);
      const result = customScoring('steps', 8000, mockUserProfile);

      expect(result).toBe(100);
    });

    it('should handle negative custom scores', () => {
      const customRules: CustomScoringRule[] = [
        {
          metricType: 'steps',
          scoreFunction: () => -50, // Below 0
          description: 'Negative score',
        },
      ];

      const customScoring = createCustomScoring(customRules);
      const result = customScoring('steps', 8000, mockUserProfile);

      expect(result).toBe(0);
    });
  });

  describe('getHealthMetricRanges', () => {
    it('should return correct ranges for steps metric', () => {
      const range = getHealthMetricRanges('steps');

      expect(range.optimal).toEqual({ min: 8000, max: 12000 });
      expect(range.unit).toBe('steps');
      expect(range.higherIsBetter).toBe(true);
    });

    it('should return correct ranges for BMI metric', () => {
      const range = getHealthMetricRanges('bmi');

      expect(range.optimal).toEqual({ min: 18.5, max: 24.9 });
      expect(range.unit).toBe('kg/m²');
      expect(range.higherIsBetter).toBe(false);
    });

    it('should return correct ranges for heart rate metric', () => {
      const range = getHealthMetricRanges('heart_rate');

      expect(range.optimal).toEqual({ min: 60, max: 80 });
      expect(range.unit).toBe('bpm');
      expect(range.higherIsBetter).toBe(false);
    });

    it('should personalize ranges based on user goals for steps', () => {
      const range = getHealthMetricRanges('steps', mockUserProfile);

      // Should adjust based on user's daily step goal (10000)
      expect(range.optimal.min).toBe(8000); // 80% of goal
      expect(range.optimal.max).toBe(12000); // 120% of goal
    });

    it('should personalize ranges based on user goals for sleep', () => {
      const range = getHealthMetricRanges('sleep', mockUserProfile);

      // Should adjust based on user's sleep goal (8 hours)
      expect(range.optimal.min).toBe(7.5); // goal - 0.5
      expect(range.optimal.max).toBe(8.5); // goal + 0.5
    });

    it('should adjust body fat percentage ranges based on gender', () => {
      const maleRange = getHealthMetricRanges('body_fat_percentage', {
        ...mockUserProfile,
        gender: 'male',
      });

      const femaleRange = getHealthMetricRanges('body_fat_percentage', {
        ...mockUserProfile,
        gender: 'female',
      });

      expect(maleRange.optimal).toEqual({ min: 10, max: 18 });
      expect(femaleRange.optimal).toEqual({ min: 16, max: 24 });
    });

    it('should return default ranges when no user profile provided', () => {
      const range = getHealthMetricRanges('steps');

      expect(range.optimal).toEqual({ min: 8000, max: 12000 });
    });
  });

  describe('scoreHealthMetric', () => {
    it('should score using percentage system correctly', () => {
      const score = scoreHealthMetric('steps', 8000, 'percentage');

      // 8000 steps in 8000-12000 optimal range = 0% (at minimum)
      expect(score).toBe(0);
    });

    it('should score using z-score system correctly', () => {
      const statisticalData = { mean: 7000, standardDeviation: 2000 };
      const score = scoreHealthMetric('steps', 9000, 'z-score', undefined, undefined, statisticalData);

      // 1 std dev above mean should give ~67
      expect(score).toBe(67);
    });

    it('should fallback to percentage when z-score lacks statistical data', () => {
      const score = scoreHealthMetric('steps', 10000, 'z-score');

      // Should fallback to percentage scoring
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should use custom scoring when provided', () => {
      const customRules: CustomScoringRule[] = [
        {
          metricType: 'steps',
          scoreFunction: () => 95,
          description: 'Fixed high score',
        },
      ];

      const score = scoreHealthMetric('steps', 8000, 'custom', undefined, customRules);

      expect(score).toBe(95);
    });

    it('should fallback to percentage when custom scoring lacks rules', () => {
      const score = scoreHealthMetric('steps', 10000, 'custom');

      // Should fallback to percentage scoring
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle invalid scoring system by returning default', () => {
      const score = scoreHealthMetric('steps', 8000, 'invalid' as any);

      expect(score).toBe(50);
    });

    it('should incorporate user profile in percentage scoring', () => {
      const scoreWithProfile = scoreHealthMetric('steps', 9000, 'percentage', mockUserProfile);
      const scoreWithoutProfile = scoreHealthMetric('steps', 9000, 'percentage');

      // Scores might differ due to personalized ranges
      expect(scoreWithProfile).toBeGreaterThanOrEqual(0);
      expect(scoreWithProfile).toBeLessThanOrEqual(100);
    });
  });

  describe('getScoreColor', () => {
    it('should return excellent color for scores 80-100', () => {
      expect(getScoreColor(85)).toBe(DEFAULT_SCORE_COLORS.excellent);
      expect(getScoreColor(100)).toBe(DEFAULT_SCORE_COLORS.excellent);
      expect(getScoreColor(80)).toBe(DEFAULT_SCORE_COLORS.excellent);
    });

    it('should return good color for scores 60-79', () => {
      expect(getScoreColor(70)).toBe(DEFAULT_SCORE_COLORS.good);
      expect(getScoreColor(79)).toBe(DEFAULT_SCORE_COLORS.good);
      expect(getScoreColor(60)).toBe(DEFAULT_SCORE_COLORS.good);
    });

    it('should return fair color for scores 40-59', () => {
      expect(getScoreColor(50)).toBe(DEFAULT_SCORE_COLORS.fair);
      expect(getScoreColor(59)).toBe(DEFAULT_SCORE_COLORS.fair);
      expect(getScoreColor(40)).toBe(DEFAULT_SCORE_COLORS.fair);
    });

    it('should return poor color for scores 0-39', () => {
      expect(getScoreColor(25)).toBe(DEFAULT_SCORE_COLORS.poor);
      expect(getScoreColor(39)).toBe(DEFAULT_SCORE_COLORS.poor);
      expect(getScoreColor(0)).toBe(DEFAULT_SCORE_COLORS.poor);
    });

    it('should use custom colors when provided', () => {
      const customColors: ScoreColors = {
        excellent: '#custom-excellent',
        good: '#custom-good',
        fair: '#custom-fair',
        poor: '#custom-poor',
      };

      expect(getScoreColor(85, customColors)).toBe('#custom-excellent');
      expect(getScoreColor(65, customColors)).toBe('#custom-good');
      expect(getScoreColor(45, customColors)).toBe('#custom-fair');
      expect(getScoreColor(25, customColors)).toBe('#custom-poor');
    });
  });

  describe('getScoreCategory', () => {
    it('should return correct categories for different score ranges', () => {
      expect(getScoreCategory(85)).toBe('excellent');
      expect(getScoreCategory(70)).toBe('good');
      expect(getScoreCategory(50)).toBe('fair');
      expect(getScoreCategory(25)).toBe('poor');
    });

    it('should handle boundary values correctly', () => {
      expect(getScoreCategory(80)).toBe('excellent');
      expect(getScoreCategory(79)).toBe('good');
      expect(getScoreCategory(60)).toBe('good');
      expect(getScoreCategory(59)).toBe('fair');
      expect(getScoreCategory(40)).toBe('fair');
      expect(getScoreCategory(39)).toBe('poor');
    });
  });

  describe('calculateStatisticalData', () => {
    it('should calculate correct mean and standard deviation', () => {
      const dataPoints: HealthDataPoint[] = [
        { date: '2024-01-01', value: 8000 },
        { date: '2024-01-02', value: 9000 },
        { date: '2024-01-03', value: 7000 },
      ];

      const result = calculateStatisticalData(dataPoints);

      expect(result.mean).toBe(8000); // (8000 + 9000 + 7000) / 3
      expect(result.standardDeviation).toBeCloseTo(816.5, 0); // Approximately 816.5
    });

    it('should handle empty data array', () => {
      const result = calculateStatisticalData([]);

      expect(result.mean).toBe(0);
      expect(result.standardDeviation).toBe(1);
    });

    it('should ensure minimum standard deviation of 1', () => {
      const dataPoints: HealthDataPoint[] = [
        { date: '2024-01-01', value: 5000 },
        { date: '2024-01-02', value: 5000 },
        { date: '2024-01-03', value: 5000 },
      ];

      const result = calculateStatisticalData(dataPoints);

      expect(result.mean).toBe(5000);
      expect(result.standardDeviation).toBe(1); // Minimum value
    });

    it('should round results to 2 decimal places', () => {
      const dataPoints: HealthDataPoint[] = [
        { date: '2024-01-01', value: 7333 },
        { date: '2024-01-02', value: 8666 },
        { date: '2024-01-03', value: 9001 },
      ];

      const result = calculateStatisticalData(dataPoints);

      expect(result.mean).toBe(8333.33);
      expect(result.standardDeviation).toBeGreaterThan(1);
    });
  });

  describe('aggregateRadarData', () => {
    it('should transform health data sets into radar metrics correctly', () => {
      const result = aggregateRadarData(mockHealthData, 'percentage', mockUserProfile);

      expect(result).toHaveLength(3); // steps, sleep, heart_rate

      const stepsMetric = result.find(m => m.category === 'Daily Steps');

      expect(stepsMetric).toBeDefined();
      expect(stepsMetric?.value).toBe(7800); // Latest value
      expect(stepsMetric?.unit).toBe('steps');
      expect(stepsMetric?.score).toBeGreaterThanOrEqual(0);
      expect(stepsMetric?.score).toBeLessThanOrEqual(100);
      expect(stepsMetric?.color).toBeDefined();
      expect(stepsMetric?.icon).toBe('👟');
    });

    it('should use most recent data point for each metric', () => {
      const result = aggregateRadarData(mockHealthData, 'percentage');

      const sleepMetric = result.find(m => m.category === 'Sleep Quality');

      expect(sleepMetric?.value).toBe(6.8); // Last value in sleep array
    });

    it('should skip metrics with empty data arrays', () => {
      const emptyData = {
        ...mockHealthData,
        water_intake: [] as HealthDataPoint[],
      };

      const result = aggregateRadarData(emptyData, 'percentage');

      expect(result.find(m => m.category === 'Water Intake')).toBeUndefined();
    });

    it('should skip metrics with undefined data', () => {
      const incompleteData = {
        steps: mockHealthData.steps,
        sleep: mockHealthData.sleep,
        // heart_rate intentionally omitted
      };

      const result = aggregateRadarData(incompleteData, 'percentage');

      expect(result).toHaveLength(2);
      expect(result.find(m => m.category === 'Heart Rate')).toBeUndefined();
    });

    it('should apply custom colors when provided', () => {
      const customColors: ScoreColors = {
        excellent: '#custom-excellent',
        good: '#custom-good',
        fair: '#custom-fair',
        poor: '#custom-poor',
      };

      const result = aggregateRadarData(mockHealthData, 'percentage', undefined, undefined, customColors);

      result.forEach((metric) => {
        expect(Object.values(customColors)).toContain(metric.color);
      });
    });

    it('should use different scoring systems correctly', () => {
      const percentageResult = aggregateRadarData(mockHealthData, 'percentage');
      const zScoreResult = aggregateRadarData(mockHealthData, 'z-score');

      expect(percentageResult).toHaveLength(zScoreResult.length);

      // Scores might be different between systems
      const percentageSteps = percentageResult.find(m => m.category === 'Daily Steps');
      const zScoreSteps = zScoreResult.find(m => m.category === 'Daily Steps');

      expect(percentageSteps?.score).toBeGreaterThanOrEqual(0);
      expect(zScoreSteps?.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle custom scoring rules', () => {
      const customRules: CustomScoringRule[] = [
        {
          metricType: 'steps',
          scoreFunction: () => 95,
          description: 'Fixed high score for steps',
        },
      ];

      const result = aggregateRadarData(mockHealthData, 'custom', undefined, customRules);

      const stepsMetric = result.find(m => m.category === 'Daily Steps');

      expect(stepsMetric?.score).toBe(95);
    });

    it('should format metric names correctly', () => {
      const bmiData = {
        bmi: [{ date: '2024-01-01', value: 22.5, unit: 'kg/m²' }],
        blood_pressure_systolic: [{ date: '2024-01-01', value: 120, unit: 'mmHg' }],
        water_intake: [{ date: '2024-01-01', value: 2500, unit: 'ml' }],
      };

      const result = aggregateRadarData(bmiData, 'percentage');

      expect(result.find(m => m.category === 'BMI')).toBeDefined();
      expect(result.find(m => m.category === 'Systolic BP')).toBeDefined();
      expect(result.find(m => m.category === 'Water Intake')).toBeDefined();
    });

    it('should assign appropriate icons for different metrics', () => {
      const multiMetricData = {
        weight: [{ date: '2024-01-01', value: 70, unit: 'kg' }],
        exercise_minutes: [{ date: '2024-01-01', value: 45, unit: 'min' }],
        calories_burned: [{ date: '2024-01-01', value: 350, unit: 'kcal' }],
      };

      const result = aggregateRadarData(multiMetricData, 'percentage');

      expect(result.find(m => m.category === 'Weight')?.icon).toBe('⚖️');
      expect(result.find(m => m.category === 'Exercise')?.icon).toBe('🏃');
      expect(result.find(m => m.category === 'Calories Burned')?.icon).toBe('🔥');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extreme values gracefully', () => {
      const extremeData = {
        steps: [{ date: '2024-01-01', value: 999999, unit: 'steps' }],
        heart_rate: [{ date: '2024-01-01', value: 300, unit: 'bpm' }],
      };

      const result = aggregateRadarData(extremeData, 'percentage');

      result.forEach((metric) => {
        expect(metric.score).toBeGreaterThanOrEqual(0);
        expect(metric.score).toBeLessThanOrEqual(100);
      });
    });

    it('should handle missing units gracefully', () => {
      const dataWithoutUnits = {
        steps: [{ date: '2024-01-01', value: 8000 }], // No unit specified
      };

      const result = aggregateRadarData(dataWithoutUnits, 'percentage');

      expect(result[0].unit).toBe('steps'); // Should use default from range
    });

    it('should handle zero values correctly', () => {
      const zeroData = {
        steps: [{ date: '2024-01-01', value: 0, unit: 'steps' }],
        sleep: [{ date: '2024-01-01', value: 0, unit: 'hours' }],
      };

      const result = aggregateRadarData(zeroData, 'percentage');

      result.forEach((metric) => {
        expect(metric.value).toBe(0);
        expect(metric.score).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle invalid metric types gracefully', () => {
      const invalidData = {
        invalid_metric: [{ date: '2024-01-01', value: 100 }],
      } as any;

      expect(() => {
        aggregateRadarData(invalidData, 'percentage');
      }).not.toThrow();
    });
  });

  describe('Realistic Health Data Scenarios', () => {
    it('should score excellent health profile correctly', () => {
      const excellentHealthData = {
        steps: [{ date: '2024-01-01', value: 10000, unit: 'steps' }],
        sleep: [{ date: '2024-01-01', value: 8, unit: 'hours' }],
        heart_rate: [{ date: '2024-01-01', value: 65, unit: 'bpm' }],
        water_intake: [{ date: '2024-01-01', value: 2500, unit: 'ml' }],
        exercise_minutes: [{ date: '2024-01-01', value: 180, unit: 'min/week' }],
      };

      const result = aggregateRadarData(excellentHealthData, 'percentage', mockUserProfile);

      // Most metrics should score well
      const averageScore = result.reduce((sum, metric) => sum + metric.score, 0) / result.length;

      expect(averageScore).toBeGreaterThan(60);
    });

    it('should score poor health profile correctly', () => {
      const poorHealthData = {
        steps: [{ date: '2024-01-01', value: 2000, unit: 'steps' }],
        sleep: [{ date: '2024-01-01', value: 4, unit: 'hours' }],
        heart_rate: [{ date: '2024-01-01', value: 95, unit: 'bpm' }],
        water_intake: [{ date: '2024-01-01', value: 500, unit: 'ml' }],
      };

      const result = aggregateRadarData(poorHealthData, 'percentage');

      // Most metrics should score poorly
      const averageScore = result.reduce((sum, metric) => sum + metric.score, 0) / result.length;

      expect(averageScore).toBeLessThan(50);
    });

    it('should handle mixed health profile appropriately', () => {
      const mixedHealthData = {
        steps: [{ date: '2024-01-01', value: 12000, unit: 'steps' }], // Excellent
        sleep: [{ date: '2024-01-01', value: 5, unit: 'hours' }], // Poor
        heart_rate: [{ date: '2024-01-01', value: 70, unit: 'bpm' }], // Good
        bmi: [{ date: '2024-01-01', value: 22, unit: 'kg/m²' }], // Excellent
      };

      const result = aggregateRadarData(mixedHealthData, 'percentage');

      expect(result).toHaveLength(4);

      // Should have a mix of scores
      const scores = result.map(m => m.score);
      const hasHighScore = scores.some(score => score >= 80);
      const hasLowScore = scores.some(score => score <= 40);

      expect(hasHighScore).toBe(true);
      expect(hasLowScore).toBe(true);
    });

    it('should maintain consistency across different user profiles', () => {
      const femaleProfile: UserProfile = {
        ...mockUserProfile,
        gender: 'female',
        goals: {
          dailySteps: 8000,
          sleepHours: 8.5,
          waterIntake: 2200,
          exerciseMinutes: 120,
        },
      };

      const maleResult = aggregateRadarData(mockHealthData, 'percentage', mockUserProfile);
      const femaleResult = aggregateRadarData(mockHealthData, 'percentage', femaleProfile);

      expect(maleResult).toHaveLength(femaleResult.length);

      // Scores might differ due to different goals/ranges
      maleResult.forEach((maleMetric, index) => {
        const femaleMetric = femaleResult[index];

        expect(maleMetric.category).toBe(femaleMetric.category);
        expect(maleMetric.value).toBe(femaleMetric.value);
      });
    });
  });
});
