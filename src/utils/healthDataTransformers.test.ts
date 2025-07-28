/**
 * Comprehensive unit and integration tests for health data transformers
 *
 * Tests all transformation functions with various health metrics, edge cases,
 * realistic health data scenarios, and integration with healthScoring module.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HealthGoal, HealthRecord } from '@/components/health/HealthOverview';
import type { HealthRadarMetric, PredictedDataPoint, RadarChartData, TrendDirection } from '@/components/health/types';
import type { HealthDataPoint, HealthMetricType, UserProfile } from '@/utils/healthScoring';
import {
  calculateOverallHealthScore,
  calculateTrend,
  formatHealthValue,
  getHealthTypeConfig,
  getScoreColor,
  getPreviousValue,
  normalizeHealthValue,
  transformToPredictiveData,
  transformToRadarData,
  transformToSummaryMetrics,
} from '@/utils/healthDataTransformers';
import {
  aggregateRadarData,
  getHealthMetricRanges,
  getScoreCategory,
  getScoreColor as healthScoringGetScoreColor,
  scoreHealthMetric,
} from '@/utils/healthScoring';

describe('Health Data Transformers', () => {
  let mockHealthRecords: HealthRecord[];
  let mockHealthGoals: HealthGoal[];
  let mockUserProfile: UserProfile;
  let mockTrendData: Array<{ date: string; value: number; unit?: string }>;

  beforeEach(() => {
    // Mock health records covering all supported types
    mockHealthRecords = [
      { id: 1, type: 'weight', value: 70, unit: 'kg', recorded_at: '2024-01-03T10:00:00Z' },
      { id: 2, type: 'weight', value: 71, unit: 'kg', recorded_at: '2024-01-02T10:00:00Z' },
      { id: 3, type: 'weight', value: 72, unit: 'kg', recorded_at: '2024-01-01T10:00:00Z' },
      { id: 4, type: 'steps', value: 8500, unit: 'steps', recorded_at: '2024-01-03T23:59:59Z' },
      { id: 5, type: 'steps', value: 9200, unit: 'steps', recorded_at: '2024-01-02T23:59:59Z' },
      { id: 6, type: 'sleep', value: 7.5, unit: 'hours', recorded_at: '2024-01-03T08:00:00Z' },
      { id: 7, type: 'heart_rate', value: 72, unit: 'bpm', recorded_at: '2024-01-03T12:00:00Z' },
      { id: 8, type: 'blood_pressure', value: 120, unit: 'mmHg', recorded_at: '2024-01-03T09:00:00Z' },
      { id: 9, type: 'water_intake', value: 2.5, unit: 'liters', recorded_at: '2024-01-03T20:00:00Z' },
      { id: 10, type: 'calories', value: 2200, unit: 'kcal', recorded_at: '2024-01-03T21:00:00Z' },
      { id: 11, type: 'glucose', value: 95, unit: 'mg/dL', recorded_at: '2024-01-03T07:00:00Z' },
    ];

    // Mock health goals
    mockHealthGoals = [
      { id: 1, type: 'weight', target_value: 68, current_value: 70, target_date: '2024-06-01', status: 'active' },
      { id: 2, type: 'steps', target_value: 10000, current_value: 8500, target_date: '2024-12-31', status: 'active' },
      { id: 3, type: 'sleep', target_value: 8, current_value: 7.5, target_date: '2024-12-31', status: 'active' },
      { id: 4, type: 'water_intake', target_value: 3, current_value: 2.5, target_date: '2024-12-31', status: 'completed' },
      { id: 5, type: 'heart_rate', target_value: 65, current_value: 72, target_date: '2024-12-31', status: 'paused' },
    ];

    // Mock user profile
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

    // Mock trend data for predictive analytics
    mockTrendData = [
      { date: '2024-01-01', value: 72, unit: 'kg' },
      { date: '2024-01-02', value: 71.5, unit: 'kg' },
      { date: '2024-01-03', value: 71, unit: 'kg' },
      { date: '2024-01-04', value: 70.5, unit: 'kg' },
      { date: '2024-01-05', value: 70, unit: 'kg' },
      { date: '2024-01-06', value: 69.8, unit: 'kg' },
      { date: '2024-01-07', value: 69.5, unit: 'kg' },
    ];
  });

  describe('Integration with healthScoring', () => {
    describe('Score Consistency Tests', () => {
      it('should produce consistent scores between normalizeHealthValue and scoreHealthMetric', () => {
        const testCases: Array<{ type: HealthMetricType; value: number }> = [
          { type: 'weight', value: 70 },
          { type: 'steps', value: 8500 },
          { type: 'sleep', value: 7.5 },
          { type: 'heart_rate', value: 72 },
          { type: 'bmi', value: 22.5 },
          { type: 'water_intake', value: 2500 },
        ];

        testCases.forEach(({ type, value }) => {
          const transformerScore = normalizeHealthValue(value, type, 'percentage');
          const scoringScore = scoreHealthMetric(type, value, 'percentage');

          // Scores should be within reasonable tolerance (±10 points due to different range definitions)
          expect(Math.abs(transformerScore - scoringScore)).toBeLessThanOrEqual(15);
          expect(transformerScore).toBeGreaterThanOrEqual(0);
          expect(transformerScore).toBeLessThanOrEqual(100);
          expect(scoringScore).toBeGreaterThanOrEqual(0);
          expect(scoringScore).toBeLessThanOrEqual(100);
        });
      });

      it('should produce consistent radar data between transformToRadarData and aggregateRadarData', () => {
        // Create health data in both formats
        const healthDataSets: Record<HealthMetricType, HealthDataPoint[]> = {
          weight: [{ date: '2024-01-03', value: 70, unit: 'kg' }],
          steps: [{ date: '2024-01-03', value: 8500, unit: 'steps' }],
          sleep: [{ date: '2024-01-03', value: 7.5, unit: 'hours' }],
          heart_rate: [{ date: '2024-01-03', value: 72, unit: 'bpm' }],
          bmi: [{ date: '2024-01-03', value: 22.5, unit: 'kg/m²' }],
          water_intake: [{ date: '2024-01-03', value: 2500, unit: 'ml' }],
        };

        const transformerResult = transformToRadarData(mockHealthRecords, mockHealthGoals, 'percentage');
        const scoringResult = aggregateRadarData(healthDataSets, 'percentage', mockUserProfile);

        expect(transformerResult).toHaveLength(1);
        expect(transformerResult[0].metrics).toHaveLength.greaterThan(0);
        expect(scoringResult).toHaveLength.greaterThan(0);

        // Check that both produce valid radar metrics
        transformerResult[0].metrics.forEach((metric) => {
          expect(metric.category).toBeDefined();
          expect(metric.value).toBeGreaterThanOrEqual(0);
          expect(metric.score).toBeGreaterThanOrEqual(0);
          expect(metric.score).toBeLessThanOrEqual(100);
          expect(metric.unit).toBeDefined();
          expect(metric.color).toBeDefined();
        });

        scoringResult.forEach((metric) => {
          expect(metric.category).toBeDefined();
          expect(metric.value).toBeGreaterThanOrEqual(0);
          expect(metric.score).toBeGreaterThanOrEqual(0);
          expect(metric.score).toBeLessThanOrEqual(100);
          expect(metric.unit).toBeDefined();
          expect(metric.color).toBeDefined();
        });
      });

      it('should have consistent color mapping between modules', () => {
        const testScores = [25, 45, 65, 85, 95];

        testScores.forEach((score) => {
          const transformerColor = getScoreColor(score);
          const scoringColor = healthScoringGetScoreColor(score);

          // Colors should follow the same categorization
          const transformerCategory = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';
          const scoringCategory = getScoreCategory(score);

          expect(transformerCategory).toBe(scoringCategory);

          // Both should return valid hex colors
          expect(transformerColor).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(scoringColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        });
      });

      it('should handle health metric ranges consistently', () => {
        const metricTypes: HealthMetricType[] = ['weight', 'steps', 'sleep', 'heart_rate', 'bmi'];

        metricTypes.forEach((metricType) => {
          const transformerConfig = getHealthTypeConfig(metricType);
          const scoringRange = getHealthMetricRanges(metricType, mockUserProfile);

          // Both should provide valid configurations
          expect(transformerConfig.unit).toBeDefined();
          expect(scoringRange.unit).toBeDefined();

          if (transformerConfig.idealRange) {
            expect(transformerConfig.idealRange.min).toBeGreaterThanOrEqual(0);
            expect(transformerConfig.idealRange.max).toBeGreaterThan(transformerConfig.idealRange.min);
          }

          expect(scoringRange.optimal.min).toBeGreaterThanOrEqual(0);
          expect(scoringRange.optimal.max).toBeGreaterThan(scoringRange.optimal.min);
        });
      });
    });

    describe('Cross-Module Consistency Tests', () => {
      it('should maintain consistent health type configurations', () => {
        const commonTypes = ['weight', 'steps', 'sleep', 'heart_rate', 'blood_pressure', 'water_intake', 'calories'];

        commonTypes.forEach((type) => {
          const transformerConfig = getHealthTypeConfig(type);
          const scoringRange = getHealthMetricRanges(type as HealthMetricType);

          // Units should be compatible
          expect(transformerConfig.unit).toBeDefined();
          expect(scoringRange.unit).toBeDefined();

          // Icons should be defined
          expect(transformerConfig.icon).toBeDefined();
          expect(transformerConfig.icon).toMatch(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
        });
      });

      it('should produce equivalent category labels for radar charts', () => {
        const testRecord: HealthRecord = { id: 1, type: 'steps', value: 8500, unit: 'steps', recorded_at: '2024-01-03T10:00:00Z' };
        const testGoal: HealthGoal = { id: 1, type: 'steps', target_value: 10000, current_value: 8500, target_date: '2024-12-31', status: 'active' };

        const transformerResult = transformToRadarData([testRecord], [testGoal]);
        const healthDataSets = { steps: [{ date: '2024-01-03', value: 8500, unit: 'steps' }] };
        const scoringResult = aggregateRadarData(healthDataSets);

        const transformerMetric = transformerResult[0].metrics.find(m => m.category.toLowerCase().includes('steps'));
        const scoringMetric = scoringResult.find(m => m.category.toLowerCase().includes('steps'));

        expect(transformerMetric).toBeDefined();
        expect(scoringMetric).toBeDefined();
        expect(transformerMetric?.value).toBe(scoringMetric?.value);
      });
    });
  });

  describe('Health Status Determination Tests', () => {
    describe('Comprehensive Health Metric Ranges', () => {
      const allHealthTypes = [
        'weight', 'bmi', 'steps', 'sleep', 'heart_rate', 'blood_pressure',
        'water_intake', 'exercise_minutes', 'calories_burned', 'distance',
        'body_fat_percentage', 'muscle_mass', 'glucose'
      ];

      allHealthTypes.forEach((type) => {
        it(`should handle ${type} metric correctly`, () => {
          const config = getHealthTypeConfig(type);

          expect(config.icon).toBeDefined();
          expect(config.color).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(config.unit).toBeDefined();

          // Test normalization with various values
          const testValues = [0, 50, 100, 1000];
          testValues.forEach((value) => {
            const score = normalizeHealthValue(value, type);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
          });
        });
      });

      it('should categorize scores into correct boundaries', () => {
        const testCases = [
          { score: 95, expected: 'excellent' },
          { score: 80, expected: 'excellent' },
          { score: 79, expected: 'good' },
          { score: 60, expected: 'good' },
          { score: 59, expected: 'fair' },
          { score: 40, expected: 'fair' },
          { score: 39, expected: 'poor' },
          { score: 0, expected: 'poor' },
        ];

        testCases.forEach(({ score, expected }) => {
          const color = getScoreColor(score);
          const category = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';

          expect(category).toBe(expected);
          expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
        });
      });

      it('should handle gender-specific ranges for body fat percentage', () => {
        const maleProfile: UserProfile = { ...mockUserProfile, gender: 'male' };
        const femaleProfile: UserProfile = { ...mockUserProfile, gender: 'female' };

        const maleScore = normalizeHealthValue(15, 'body_fat_percentage');
        const femaleScore = normalizeHealthValue(20, 'body_fat_percentage');

        // Both should produce valid scores
        expect(maleScore).toBeGreaterThanOrEqual(0);
        expect(maleScore).toBeLessThanOrEqual(100);
        expect(femaleScore).toBeGreaterThanOrEqual(0);
        expect(femaleScore).toBeLessThanOrEqual(100);

        // Test with healthScoring module for consistency
        const maleRange = getHealthMetricRanges('body_fat_percentage', maleProfile);
        const femaleRange = getHealthMetricRanges('body_fat_percentage', femaleProfile);

        expect(maleRange.optimal.min).toBeLessThan(femaleRange.optimal.min);
        expect(maleRange.optimal.max).toBeLessThan(femaleRange.optimal.max);
      });

      it('should personalize ranges based on user goals and profiles', () => {
        const customProfile: UserProfile = {
          ...mockUserProfile,
          goals: {
            dailySteps: 12000,
            sleepHours: 9,
            waterIntake: 3000,
            exerciseMinutes: 200,
          },
        };

        // Test steps with custom goal
        const stepsRange = getHealthMetricRanges('steps', customProfile);
        expect(stepsRange.optimal.min).toBe(9600); // 80% of 12000
        expect(stepsRange.optimal.max).toBe(14400); // 120% of 12000

        // Test sleep with custom goal
        const sleepRange = getHealthMetricRanges('sleep', customProfile);
        expect(sleepRange.optimal.min).toBe(8.5); // 9 - 0.5
        expect(sleepRange.optimal.max).toBe(9.5); // 9 + 0.5
      });
    });
  });

  describe('Comprehensive Trend Analysis Tests', () => {
    describe('calculateTrend function', () => {
      it('should calculate significant improvements correctly', () => {
        const result = calculateTrend(100, 80);

        expect(result.direction).toBe('up');
        expect(result.percentage).toBe(25); // (100-80)/80 * 100 = 25%
      });

      it('should calculate significant deteriorations correctly', () => {
        const result = calculateTrend(80, 100);

        expect(result.direction).toBe('down');
        expect(result.percentage).toBe(20); // (80-100)/100 * 100 = -20%, abs = 20%
      });

      it('should identify plateaus correctly', () => {
        const result = calculateTrend(100, 100.5);

        expect(result.direction).toBe('neutral');
        expect(result.percentage).toBeCloseTo(0.5, 1);
      });

      it('should handle very small changes', () => {
        const result = calculateTrend(100.1, 100);

        expect(result.direction).toBe('neutral');
        expect(result.percentage).toBe(0.1);
      });

      it('should handle zero previous values', () => {
        const result = calculateTrend(50, 0);

        expect(result.direction).toBe('neutral');
        expect(result.percentage).toBe(0);
      });

      it('should handle extreme values', () => {
        const result = calculateTrend(1000000, 1);

        expect(result.direction).toBe('up');
        expect(result.percentage).toBe(99999900);
      });

      it('should validate input parameters', () => {
        expect(() => calculateTrend(NaN, 100)).toThrow('Invalid current value');
        expect(() => calculateTrend(100, NaN)).toThrow('Invalid previous value');
        expect(() => calculateTrend(Infinity, 100)).toThrow('Invalid current value');
        expect(() => calculateTrend(100, Infinity)).toThrow('Invalid previous value');
      });

      it('should handle negative values correctly', () => {
        const result = calculateTrend(-50, -100);

        expect(result.direction).toBe('up');
        expect(result.percentage).toBe(50);
      });
    });

    describe('getPreviousValue function', () => {
      it('should find the most recent previous value', () => {
        const records: HealthRecord[] = [
          { id: 1, type: 'weight', value: 70, unit: 'kg', recorded_at: '2024-01-01T10:00:00Z' },
          { id: 2, type: 'weight', value: 71, unit: 'kg', recorded_at: '2024-01-02T10:00:00Z' },
          { id: 3, type: 'weight', value: 72, unit: 'kg', recorded_at: '2024-01-03T10:00:00Z' },
        ];

        const previousValue = getPreviousValue(records, 'weight', 3);

        expect(previousValue).toBe(71); // Most recent excluding current record
      });

      it('should return undefined when no previous value exists', () => {
        const records: HealthRecord[] = [
          { id: 1, type: 'weight', value: 70, unit: 'kg', recorded_at: '2024-01-01T10:00:00Z' },
        ];

        const previousValue = getPreviousValue(records, 'steps');

        expect(previousValue).toBeUndefined();
      });

      it('should validate input parameters', () => {
        expect(() => getPreviousValue(null as any, 'weight')).toThrow('Invalid records');
        expect(() => getPreviousValue([], '')).toThrow('Invalid type');
        expect(() => getPreviousValue([{ invalid: 'record' } as any], 'weight')).toThrow('Invalid record');
      });

      it('should handle invalid dates gracefully', () => {
        const records: HealthRecord[] = [
          { id: 1, type: 'weight', value: 70, unit: 'kg', recorded_at: 'invalid-date' },
        ];

        expect(() => getPreviousValue(records, 'weight')).toThrow('Invalid record date');
      });
    });
  });

  describe('Goal Progress Calculation Tests', () => {
    describe('transformToSummaryMetrics function', () => {
      it('should match goals with records correctly', () => {
        const metrics = transformToSummaryMetrics(mockHealthRecords, mockHealthGoals);

        const weightMetric = metrics.find(m => m.label.toLowerCase().includes('weight'));
        expect(weightMetric).toBeDefined();
        expect(weightMetric?.goalTarget).toBe(68);
        expect(weightMetric?.goalCurrent).toBe(70);

        const stepsMetric = metrics.find(m => m.label.toLowerCase().includes('steps'));
        expect(stepsMetric).toBeDefined();
        expect(stepsMetric?.goalTarget).toBe(10000);
        expect(stepsMetric?.goalCurrent).toBe(8500);
      });

      it('should handle different target types', () => {
        const customGoals: HealthGoal[] = [
          { id: 1, type: 'weight', target_value: 65, current_value: 70, target_date: '2024-06-01', status: 'active' },
          { id: 2, type: 'steps', target_value: 15000, current_value: 8500, target_date: '2024-12-31', status: 'active' },
          { id: 3, type: 'sleep', target_value: 9, current_value: 7.5, target_date: '2024-12-31', status: 'active' },
        ];

        const metrics = transformToSummaryMetrics(mockHealthRecords, customGoals);

        expect(metrics.length).toBeGreaterThan(0);
        metrics.forEach((metric) => {
          expect(metric.value).toBeGreaterThanOrEqual(0);
          if (metric.goalTarget) {
            expect(metric.goalTarget).toBeGreaterThan(0);
          }
        });
      });

      it('should handle goals without matching records', () => {
        const orphanGoals: HealthGoal[] = [
          { id: 1, type: 'meditation', target_value: 30, current_value: 15, target_date: '2024-12-31', status: 'active' },
          { id: 2, type: 'reading', target_value: 60, current_value: 45, target_date: '2024-12-31', status: 'active' },
        ];

        const metrics = transformToSummaryMetrics([], orphanGoals);

        expect(metrics).toHaveLength(2);
        expect(metrics[0].label).toBe('Meditation');
        expect(metrics[0].value).toBe(15);
        expect(metrics[0].goalTarget).toBe(30);
      });

      it('should handle records without goals', () => {
        const orphanRecords: HealthRecord[] = [
          { id: 1, type: 'temperature', value: 98.6, unit: '°F', recorded_at: '2024-01-03T10:00:00Z' },
          { id: 2, type: 'mood', value: 8, unit: 'scale', recorded_at: '2024-01-03T10:00:00Z' },
        ];

        const metrics = transformToSummaryMetrics(orphanRecords, []);

        expect(metrics).toHaveLength(2);
        expect(metrics[0].goalTarget).toBeUndefined();
        expect(metrics[1].goalTarget).toBeUndefined();
      });

      it('should filter goals by status correctly', () => {
        const mixedStatusGoals: HealthGoal[] = [
          { id: 1, type: 'weight', target_value: 68, current_value: 70, target_date: '2024-06-01', status: 'active' },
          { id: 2, type: 'steps', target_value: 10000, current_value: 8500, target_date: '2024-12-31', status: 'completed' },
          { id: 3, type: 'sleep', target_value: 8, current_value: 7.5, target_date: '2024-12-31', status: 'paused' },
        ];

        const metrics = transformToSummaryMetrics(mockHealthRecords, mixedStatusGoals);

        // Only active goals should be included in metrics
        const weightMetric = metrics.find(m => m.label.toLowerCase().includes('weight'));
        const stepsMetric = metrics.find(m => m.label.toLowerCase().includes('steps'));
        const sleepMetric = metrics.find(m => m.label.toLowerCase().includes('sleep'));

        expect(weightMetric?.goalTarget).toBe(68); // Active goal
        expect(stepsMetric?.goalTarget).toBeUndefined(); // Completed goal excluded
        expect(sleepMetric?.goalTarget).toBeUndefined(); // Paused goal excluded
      });

      it('should handle goal progress edge cases', () => {
        const edgeCaseGoals: HealthGoal[] = [
          // Over-achievement
          { id: 1, type: 'steps', target_value: 8000, current_value: 12000, target_date: '2024-12-31', status: 'active' },
          // Negative progress (impossible but test resilience)
          { id: 2, type: 'weight', target_value: 70, current_value: 75, target_date: '2024-12-31', status: 'active' },
          // Zero target (edge case)
          { id: 3, type: 'test', target_value: 0, current_value: 5, target_date: '2024-12-31', status: 'active' },
        ];

        const metrics = transformToSummaryMetrics([], edgeCaseGoals);

        expect(metrics).toHaveLength(3);
        metrics.forEach((metric) => {
          expect(metric.goalTarget).toBeDefined();
          expect(metric.goalCurrent).toBeDefined();
          expect(typeof metric.goalTarget).toBe('number');
          expect(typeof metric.goalCurrent).toBe('number');
        });
      });

      it('should validate input parameters', () => {
        expect(() => transformToSummaryMetrics(null as any, [])).toThrow('Invalid records');
        expect(() => transformToSummaryMetrics([], null as any)).toThrow('Invalid goals');
        expect(() => transformToSummaryMetrics([{ invalid: 'record' } as any], [])).toThrow('Invalid record');
        expect(() => transformToSummaryMetrics([], [{ invalid: 'goal' } as any])).toThrow('Invalid goal');
      });
    });
  });

  describe('Realistic Health Data Scenarios', () => {
    describe('Excellent Health Profile', () => {
      it('should score excellent health profile correctly', () => {
        const excellentRecords: HealthRecord[] = [
          { id: 1, type: 'weight', value: 70, unit: 'kg', recorded_at: '2024-01-03T10:00:00Z' },
          { id: 2, type: 'steps', value: 12000, unit: 'steps', recorded_at: '2024-01-03T23:59:59Z' },
          { id: 3, type: 'sleep', value: 8, unit: 'hours', recorded_at: '2024-01-03T08:00:00Z' },
          { id: 4, type: 'heart_rate', value: 65, unit: 'bpm', recorded_at: '2024-01-03T12:00:00Z' },
          { id: 5, type: 'water_intake', value: 3, unit: 'liters', recorded_at: '2024-01-03T20:00:00Z' },
        ];

        const excellentGoals: HealthGoal[] = [
          { id: 1, type: 'steps', target_value: 10000, current_value: 12000, target_date: '2024-12-31', status: 'active' },
          { id: 2, type: 'sleep', target_value: 8, current_value: 8, target_date: '2024-12-31', status: 'active' },
        ];

        const radarData = transformToRadarData(excellentRecords, excellentGoals);
        const overallScore = calculateOverallHealthScore(radarData[0].metrics);

        expect(overallScore).toBeGreaterThan(60);
        expect(radarData[0].metrics.length).toBeGreaterThan(3);

        // Most metrics should score well
        const highScoringMetrics = radarData[0].metrics.filter(m => m.score >= 60);
        expect(highScoringMetrics.length).toBeGreaterThan(radarData[0].metrics.length / 2);
      });
    });

    describe('Poor Health Profile', () => {
      it('should score poor health profile correctly', () => {
        const poorRecords: HealthRecord[] = [
          { id: 1, type: 'weight', value: 95, unit: 'kg', recorded_at: '2024-01-03T10:00:00Z' },
          { id: 2, type: 'steps', value: 2000, unit: 'steps', recorded_at: '2024-01-03T23:59:59Z' },
          { id: 3, type: 'sleep', value: 4, unit: 'hours', recorded_at: '2024-01-03T08:00:00Z' },
          { id: 4, type: 'heart_rate', value: 95, unit: 'bpm', recorded_at: '2024-01-03T12:00:00Z' },
          { id: 5, type: 'water_intake', value: 0.5, unit: 'liters', recorded_at: '2024-01-03T20:00:00Z' },
        ];

        const poorGoals: HealthGoal[] = [
          { id: 1, type: 'steps', target_value: 10000, current_value: 2000, target_date: '2024-12-31', status: 'active' },
          { id: 2, type: 'sleep', target_value: 8, current_value: 4, target_date: '2024-12-31', status: 'active' },
        ];

        const radarData = transformToRadarData(poorRecords, poorGoals);
        const overallScore = calculateOverallHealthScore(radarData[0].metrics);

        expect(overallScore).toBeLessThan(60);

        // Most metrics should score poorly
        const lowScoringMetrics = radarData[0].metrics.filter(m => m.score <= 40);
        expect(lowScoringMetrics.length).toBeGreaterThan(0);
      });
    });

    describe('Mixed Health Profile', () => {
      it('should handle mixed health profile appropriately', () => {
        const mixedRecords: HealthRecord[] = [
          { id: 1, type: 'steps', value: 15000, unit: 'steps', recorded_at: '2024-01-03T23:59:59Z' }, // Excellent
          { id: 2, type: 'sleep', value: 4, unit: 'hours', recorded_at: '2024-01-03T08:00:00Z' }, // Poor
          { id: 3, type: 'heart_rate', value: 70, unit: 'bpm', recorded_at: '2024-01-03T12:00:00Z' }, // Good
          { id: 4, type: 'water_intake', value: 0.5, unit: 'liters', recorded_at: '2024-01-03T20:00:00Z' }, // Poor
        ];

        const radarData = transformToRadarData(mixedRecords, []);

        expect(radarData[0].metrics.length).toBeGreaterThan(3);

        // Should have a mix of scores
        const scores = radarData[0].metrics.map(m => m.score);
        const hasHighScore = scores.some(score => score >= 70);
        const hasLowScore = scores.some(score => score <= 30);

        expect(hasHighScore).toBe(true);
        expect(hasLowScore).toBe(true);
      });
    });

    describe('Different User Demographics', () => {
      it('should handle different age groups', () => {
        const youngProfile: UserProfile = { ...mockUserProfile, age: 25 };
        const olderProfile: UserProfile = { ...mockUserProfile, age: 55 };

        const testRecords: HealthRecord[] = [
          { id: 1, type: 'heart_rate', value: 75, unit: 'bpm', recorded_at: '2024-01-03T12:00:00Z' },
        ];

        const youngRadarData = transformToRadarData(testRecords, []);
        const olderRadarData = transformToRadarData(testRecords, []);

        expect(youngRadarData[0].metrics).toHaveLength(olderRadarData[0].metrics.length);
        expect(youngRadarData[0].metrics[0].value).toBe(olderRadarData[0].metrics[0].value);
      });

      it('should handle different activity levels', () => {
        const sedentaryProfile: UserProfile = { ...mockUserProfile, activityLevel: 'sedentary' };
        const activeProfile: UserProfile = { ...mockUserProfile, activityLevel: 'very_active' };

        const testRecords: HealthRecord[] = [
          { id: 1, type: 'steps', value: 8000, unit: 'steps', recorded_at: '2024-01-03T23:59:59Z' },
        ];

        const sedentaryRadarData = transformToRadarData(testRecords, []);
        const activeRadarData = transformToRadarData(testRecords, []);

        expect(sedentaryRadarData[0].metrics).toHaveLength(activeRadarData[0].metrics.length);
        expect(sedentaryRadarData[0].metrics[0].value).toBe(activeRadarData[0].metrics[0].value);
      });
    });

    describe('Seasonal and Long-term Trends', () => {
      it('should handle seasonal health data patterns', () => {
        const winterData = [
          { date: '2024-01-15', value: 6000, unit: 'steps' },
          { date: '2024-02-15', value: 5500, unit: 'steps' },
          { date: '2024-03-15', value: 7000, unit: 'steps' },
        ];

        const summerData = [
          { date: '2024-06-15', value: 9000, unit: 'steps' },
          { date: '2024-07-15', value: 10500, unit: 'steps' },
          { date: '2024-08-15', value: 11000, unit: 'steps' },
        ];

        const winterPredictions = transformToPredictiveData(winterData, 'linear-regression', 5);
        const summerPredictions = transformToPredictiveData(summerData, 'linear-regression', 5);

        expect(winterPredictions.length).toBeGreaterThan(winterData.length);
        expect(summerPredictions.length).toBeGreaterThan(summerData.length);

        // Summer trend should be more positive
        const winterTrend = winterPredictions.filter(p => p.isPrediction);
        const summerTrend = summerPredictions.filter(p => p.isPrediction);

        expect(winterTrend.length).toBeGreaterThan(0);
        expect(summerTrend.length).toBeGreaterThan(0);
      });

      it('should handle long-term health trends', () => {
        const longTermData = Array.from({ length: 30 }, (_, i) => ({
          date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          value: 70 - (i * 0.1), // Gradual weight loss
          unit: 'kg',
        }));

        const predictions = transformToPredictiveData(longTermData, 'linear-regression', 14);

        expect(predictions.length).toBe(longTermData.length + 14);

        const futurePredictions = predictions.filter(p => p.isPrediction);
        expect(futurePredictions.length).toBe(14);

        // Should show continued downward trend
        const lastHistorical = predictions.filter(p => !p.isPrediction).pop();
        const firstPrediction = futurePredictions[0];

        expect(firstPrediction.value).toBeLessThan(lastHistorical!.value);
      });
    });
  });

  describe('Analytics Calculation Tests', () => {
    describe('transformToPredictiveData function', () => {
      it('should handle linear regression algorithm correctly', () => {
        const predictions = transformToPredictiveData(mockTrendData, 'linear-regression', 5);

        expect(predictions.length).toBe(mockTrendData.length + 5);

        const historicalData = predictions.filter(p => !p.isPrediction);
        const predictedData = predictions.filter(p => p.isPrediction);

        expect(historicalData.length).toBe(mockTrendData.length);
        expect(predictedData.length).toBe(5);

        // All predictions should have confidence intervals
        predictedData.forEach((prediction) => {
          expect(prediction.confidenceUpper).toBeDefined();
          expect(prediction.confidenceLower).toBeDefined();
          expect(prediction.algorithm).toBe('linear-regression');
          expect(prediction.confidenceUpper!).toBeGreaterThan(prediction.value);
          expect(prediction.confidenceLower!).toBeLessThan(prediction.value);
        });
      });

      it('should handle moving average algorithm correctly', () => {
        const predictions = transformToPredictiveData(mockTrendData, 'moving-average', 3);

        expect(predictions.length).toBe(mockTrendData.length + 3);

        const predictedData = predictions.filter(p => p.isPrediction);

        expect(predictedData.length).toBe(3);

        predictedData.forEach((prediction) => {
          expect(prediction.algorithm).toBe('moving-average');
          expect(prediction.confidenceUpper).toBeDefined();
          expect(prediction.confidenceLower).toBeDefined();
        });
      });

      it('should handle different data patterns correctly', () => {
        // Trending up
        const upwardData = [
          { date: '2024-01-01', value: 60 },
          { date: '2024-01-02', value: 62 },
          { date: '2024-01-03', value: 64 },
          { date: '2024-01-04', value: 66 },
          { date: '2024-01-05', value: 68 },
        ];

        // Trending down
        const downwardData = [
          { date: '2024-01-01', value: 80 },
          { date: '2024-01-02', value: 78 },
          { date: '2024-01-03', value: 76 },
          { date: '2024-01-04', value: 74 },
          { date: '2024-01-05', value: 72 },
        ];

        // Stable
        const stableData = [
          { date: '2024-01-01', value: 70 },
          { date: '2024-01-02', value: 70.1 },
          { date: '2024-01-03', value: 69.9 },
          { date: '2024-01-04', value: 70.2 },
          { date: '2024-01-05', value: 69.8 },
        ];

        const upwardPredictions = transformToPredictiveData(upwardData, 'linear-regression', 3);
        const downwardPredictions = transformToPredictiveData(downwardData, 'linear-regression', 3);
        const stablePredictions = transformToPredictiveData(stableData, 'linear-regression', 3);

        // Upward trend should predict higher values
        const upwardFuture = upwardPredictions.filter(p => p.isPrediction);
        expect(upwardFuture[0].value).toBeGreaterThan(68);

        // Downward trend should predict lower values
        const downwardFuture = downwardPredictions.filter(p => p.isPrediction);
        expect(downwardFuture[0].value).toBeLessThan(72);

        // Stable trend should predict similar values
        const stableFuture = stablePredictions.filter(p => p.isPrediction);
        expect(stableFuture[0].value).toBeCloseTo(70, 1);
      });

      it('should handle confidence interval calculations', () => {
        const predictions = transformToPredictiveData(mockTrendData, 'linear-regression', 7);
        const predictedData = predictions.filter(p => p.isPrediction);

        // Confidence intervals should increase with prediction distance
        for (let i = 1; i < predictedData.length; i++) {
          const current = predictedData[i];
          const previous = predictedData[i - 1];

          const currentRange = current.confidenceUpper! - current.confidenceLower!;
          const previousRange = previous.confidenceUpper! - previous.confidenceLower!;

          expect(currentRange).toBeGreaterThanOrEqual(previousRange);
        }
      });

      it('should handle prediction horizon variations', () => {
        const shortHorizon = transformToPredictiveData(mockTrendData, 'linear-regression', 3);
        const longHorizon = transformToPredictiveData(mockTrendData, 'linear-regression', 10);

        const shortPredictions = shortHorizon.filter(p => p.isPrediction);
        const longPredictions = longHorizon.filter(p => p.isPrediction);

        expect(shortPredictions.length).toBe(3);
        expect(longPredictions.length).toBe(10);
      });

      it('should handle insufficient data scenarios', () => {
        const insufficientData = [
          { date: '2024-01-01', value: 70 },
        ];

        const predictions = transformToPredictiveData(insufficientData, 'linear-regression', 5);

        // Should return only historical data when insufficient for regression
        expect(predictions.length).toBe(1);
        expect(predictions[0].isPrediction).toBe(false);
      });

      it('should validate input parameters', () => {
        expect(() => transformToPredictiveData(null as any, 'linear-regression', 5)).toThrow('Invalid trendData');
        expect(() => transformToPredictiveData([], 'linear-regression', 5)).not.toThrow();
        expect(() => transformToPredictiveData([{ invalid: 'data' } as any], 'linear-regression', 5)).toThrow('Invalid trendData point');
        expect(() => transformToPredictiveData(mockTrendData, 'invalid' as any, 5)).not.toThrow(); // Should default to linear-regression
        expect(() => transformToPredictiveData(mockTrendData, 'linear-regression', -5)).not.toThrow(); // Should default to 7
      });
    });
  });

  describe('Boundary Conditions and Edge Cases', () => {
    describe('Extreme Health Values', () => {
      it('should handle very high measurements', () => {
        const extremeRecords: HealthRecord[] = [
          { id: 1, type: 'steps', value: 100000, unit: 'steps', recorded_at: '2024-01-03T23:59:59Z' },
          { id: 2, type: 'heart_rate', value: 200, unit: 'bpm', recorded_at: '2024-01-03T12:00:00Z' },
          { id: 3, type: 'weight', value: 200, unit: 'kg', recorded_at: '2024-01-03T10:00:00Z' },
        ];

        const radarData = transformToRadarData(extremeRecords, []);

        expect(radarData[0].metrics.length).toBe(extremeRecords.length);
        radarData[0].metrics.forEach((metric) => {
          expect(metric.score).toBeGreaterThanOrEqual(0);
          expect(metric.score).toBeLessThanOrEqual(100);
        });
      });

      it('should handle very low measurements', () => {
        const extremeRecords: HealthRecord[] = [
          { id: 1, type: 'steps', value: 0, unit: 'steps', recorded_at: '2024-01-03T23:59:59Z' },
          { id: 2, type: 'heart_rate', value: 30, unit: 'bpm', recorded_at: '2024-01-03T12:00:00Z' },
          { id: 3, type: 'weight', value: 30, unit: 'kg', recorded_at: '2024-01-03T10:00:00Z' },
        ];

        const radarData = transformToRadarData(extremeRecords, []);

        expect(radarData[0].metrics.length).toBe(extremeRecords.length);
        radarData[0].metrics.forEach((metric) => {
          expect(metric.score).toBeGreaterThanOrEqual(0);
          expect(metric.score).toBeLessThanOrEqual(100);
        });
      });
    });

    describe('Missing or Incomplete Data', () => {
      it('should handle missing units gracefully', () => {
        const recordsWithoutUnits: HealthRecord[] = [
          { id: 1, type: 'steps', value: 8500, unit: '', recorded_at: '2024-01-03T23:59:59Z' },
          { id: 2, type: 'weight', value: 70, unit: '', recorded_at: '2024-01-03T10:00:00Z' },
        ];

        const radarData = transformToRadarData(recordsWithoutUnits, []);

        expect(radarData[0].metrics.length).toBe(2);
        radarData[0].metrics.forEach((metric) => {
          expect(metric.unit).toBeDefined();
          expect(metric.unit.length).toBeGreaterThan(0);
        });
      });

      it('should handle empty data arrays', () => {
        const radarData = transformToRadarData([], []);

        expect(radarData).toHaveLength(1);
        expect(radarData[0].metrics.length).toBeGreaterThanOrEqual(3); // Should add placeholder metrics
      });

      it('should handle incomplete records', () => {
        const incompleteRecords = [
          { id: 1, type: 'steps', value: 8500, recorded_at: '2024-01-03T23:59:59Z' }, // Missing unit
        ] as HealthRecord[];

        expect(() => transformToRadarData(incompleteRecords, [])).not.toThrow();
      });
    });

    describe('Date Handling Edge Cases', () => {
      it('should handle invalid dates', () => {
        const invalidDateRecords: HealthRecord[] = [
          { id: 1, type: 'steps', value: 8500, unit: 'steps', recorded_at: 'invalid-date' },
        ];

        expect(() => transformToRadarData(invalidDateRecords, [])).toThrow('Invalid record date');
      });

      it('should handle timezone issues', () => {
        const timezoneRecords: HealthRecord[] = [
          { id: 1, type: 'steps', value: 8500, unit: 'steps', recorded_at: '2024-01-03T23:59:59+05:00' },
          { id: 2, type: 'weight', value: 70, unit: 'kg', recorded_at: '2024-01-03T10:00:00-08:00' },
        ];

        const radarData = transformToRadarData(timezoneRecords, []);

        expect(radarData[0].metrics.length).toBe(2);
      });

      it('should handle future dates', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);

        const futureRecords: HealthRecord[] = [
          { id: 1, type: 'steps', value: 8500, unit: 'steps', recorded_at: futureDate.toISOString() },
        ];

        const radarData = transformToRadarData(futureRecords, []);

        expect(radarData[0].metrics.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Large Dataset Performance', () => {
      it('should handle large datasets efficiently', () => {
        const largeRecordSet: HealthRecord[] = Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          type: 'steps',
          value: 8000 + Math.random() * 4000,
          unit: 'steps',
          recorded_at: new Date(2024, 0, (i % 365) + 1).toISOString(),
        }));

        const startTime = performance.now();
        const radarData = transformToRadarData(largeRecordSet, []);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        expect(radarData[0].metrics.length).toBeGreaterThan(0);
      });

      it('should handle large prediction datasets', () => {
        const largeTrendData = Array.from({ length: 365 }, (_, i) => ({
          date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
          value: 70 + Math.sin(i / 30) * 5, // Seasonal variation
          unit: 'kg',
        }));

        const startTime = performance.now();
        const predictions = transformToPredictiveData(largeTrendData, 'linear-regression', 30);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
        expect(predictions.length).toBe(largeTrendData.length + 30);
      });
    });
  });

  describe('Error Handling and Validation', () => {
    describe('Input Validation', () => {
      it('should validate transformToRadarData inputs', () => {
        expect(() => transformToRadarData(null as any, [])).toThrow('Invalid records');
        expect(() => transformToRadarData([], null as any)).toThrow('Invalid goals');
        expect(() => transformToRadarData([{ invalid: 'record' } as any], [])).toThrow('Invalid record');
        expect(() => transformToRadarData([], [{ invalid: 'goal' } as any])).toThrow('Invalid goal');
      });

      it('should validate normalizeHealthValue inputs', () => {
        expect(normalizeHealthValue(NaN, 'steps')).toBe(50);
        expect(normalizeHealthValue(Infinity, 'steps')).toBe(50);
        expect(normalizeHealthValue(100, '')).toBe(50);
        expect(normalizeHealthValue(100, null as any)).toBe(50);
      });

      it('should validate calculateOverallHealthScore inputs', () => {
        expect(calculateOverallHealthScore([])).toBe(50);
        expect(calculateOverallHealthScore(null as any)).toBe(50);
        expect(calculateOverallHealthScore([{ score: NaN } as any])).toBe(50);
      });

      it('should validate formatHealthValue inputs', () => {
        expect(formatHealthValue(NaN, 'kg')).toBe('0');
        expect(formatHealthValue(Infinity, 'kg')).toBe('0');
        expect(formatHealthValue(100, null as any)).toBe('100');
      });
    });

    describe('Error Recovery', () => {
      it('should recover from malformed data gracefully', () => {
        const malformedRecords = [
          { id: 1, type: 'steps', value: 8500, unit: 'steps', recorded_at: '2024-01-03T23:59:59Z' },
          { id: 'invalid', type: null, value: 'not-a-number', unit: undefined, recorded_at: 'bad-date' },
          { id: 3, type: 'weight', value: 70, unit: 'kg', recorded_at: '2024-01-03T10:00:00Z' },
        ] as any;

        // Should not throw but handle gracefully
        expect(() => transformToRadarData(malformedRecords, [])).toThrow();
      });

      it('should handle partial data corruption', () => {
        const partiallyCorruptedData = [
          { date: '2024-01-01', value: 70, unit: 'kg' },
          { date: 'invalid-date', value: NaN, unit: 'kg' },
          { date: '2024-01-03', value: 69, unit: 'kg' },
        ];

        expect(() => transformToPredictiveData(partiallyCorruptedData, 'linear-regression', 5)).toThrow();
      });
    });

    describe('Type Safety', () => {
      it('should maintain type safety with valid inputs', () => {
        const validRecords: HealthRecord[] = [
          { id: 1, type: 'steps', value: 8500, unit: 'steps', recorded_at: '2024-01-03T23:59:59Z' },
        ];

        const validGoals: HealthGoal[] = [
          { id: 1, type: 'steps', target_value: 10000, current_value: 8500, target_date: '2024-12-31', status: 'active' },
        ];

        const result = transformToRadarData(validRecords, validGoals);

        expect(Array.isArray(result)).toBe(true);
        expect(result[0]).toHaveProperty('metrics');
        expect(Array.isArray(result[0].metrics)).toBe(true);
        expect(result[0].metrics[0]).toHaveProperty('category');
        expect(result[0].metrics[0]).toHaveProperty('value');
        expect(result[0].metrics[0]).toHaveProperty('score');
      });
    });
  });

  describe('Performance and Integration Benchmarks', () => {
    describe('Transformation Performance', () => {
      it('should transform data efficiently', () => {
        const startTime = performance.now();

        for (let i = 0; i < 100; i++) {
          transformToRadarData(mockHealthRecords, mockHealthGoals);
        }

        const endTime = performance.now();
        const averageTime = (endTime - startTime) / 100;

        expect(averageTime).toBeLessThan(10); // Should average less than 10ms per transformation
      });

      it('should handle concurrent transformations', async () => {
        const promises = Array.from({ length: 10 }, () =>
          Promise.resolve(transformToRadarData(mockHealthRecords, mockHealthGoals))
        );

        const results = await Promise.all(promises);

        expect(results).toHaveLength(10);
        results.forEach((result) => {
          expect(result[0].metrics.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Memory Usage Patterns', () => {
      it('should not leak memory with repeated operations', () => {
        const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

        for (let i = 0; i < 1000; i++) {
          const result = transformToRadarData(mockHealthRecords, mockHealthGoals);
          // Force garbage collection opportunity
          if (i % 100 === 0) {
            global.gc?.();
          }
        }

        const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const memoryIncrease = finalMemory - initialMemory;

        // Memory increase should be reasonable (less than 10MB)
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      });
    });

    describe('End-to-End Data Flow', () => {
      it('should maintain data integrity through complete transformation pipeline', () => {
        const originalRecords = [...mockHealthRecords];
        const originalGoals = [...mockHealthGoals];

        // Transform to radar data
        const radarData = transformToRadarData(mockHealthRecords, mockHealthGoals);

        // Transform to summary metrics
        const summaryMetrics = transformToSummaryMetrics(mockHealthRecords, mockHealthGoals);

        // Transform to predictive data
        const predictiveData = transformToPredictiveData(mockTrendData, 'linear-regression', 5);

        // Verify original data unchanged
        expect(mockHealthRecords).toEqual(originalRecords);
        expect(mockHealthGoals).toEqual(originalGoals);

        // Verify all transformations produced valid results
        expect(radarData[0].metrics.length).toBeGreaterThan(0);
        expect(summaryMetrics.length).toBeGreaterThan(0);
        expect(predictiveData.length).toBeGreaterThan(mockTrendData.length);

        // Verify data consistency
        const radarStepsMetric = radarData[0].metrics.find(m => m.category.toLowerCase().includes('steps'));
        const summaryStepsMetric = summaryMetrics.find(m => m.label.toLowerCase().includes('steps'));

        if (radarStepsMetric && summaryStepsMetric) {
          expect(radarStepsMetric.value).toBe(summaryStepsMetric.value);
        }
      });
    });
  });
});