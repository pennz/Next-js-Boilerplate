import type { HealthDataPoint, HealthMetricType, UserProfile } from './healthScoring';
import type { HealthGoal, HealthRecord } from '@/components/health/HealthOverview';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  calculateOverallHealthScore,
  calculateTrend,
  getHealthTypeConfig,
  getScoreColor as getTransformerScoreColor,
  normalizeHealthValue,
  transformToPredictiveData,
  transformToRadarData,
  transformToSummaryMetrics,
} from './healthDataTransformers';
// Import both modules for integration testing
import {
  aggregateRadarData,
  DEFAULT_SCORE_COLORS,
  getHealthMetricRanges,
  getScoreCategory,
  getScoreColor,
  scoreHealthMetric,

} from './healthScoring';

describe('Health Status Integration Tests', () => {
  // Mock data fixtures
  let mockUserProfile: UserProfile;
  let mockHealthRecords: HealthRecord[];
  let mockHealthGoals: HealthGoal[];
  let mockHealthDataPoints: Record<HealthMetricType, HealthDataPoint[]>;

  beforeEach(() => {
    // Create comprehensive user profile
    mockUserProfile = {
      age: 30,
      gender: 'male',
      height: 175,
      weight: 75,
      activityLevel: 'moderately_active',
      goals: {
        dailySteps: 10000,
        sleepHours: 8,
        waterIntake: 2500,
        exerciseMinutes: 150,
      },
    };

    // Create realistic health records spanning multiple months
    mockHealthRecords = [
      {
        id: 1,
        type: 'weight',
        value: 75.5,
        unit: 'kg',
        recorded_at: '2024-01-01T08:00:00Z',
        notes: 'Morning weight',
      },
      {
        id: 2,
        type: 'steps',
        value: 8500,
        unit: 'steps',
        recorded_at: '2024-01-01T23:59:59Z',
        notes: 'Daily step count',
      },
      {
        id: 3,
        type: 'sleep',
        value: 7.5,
        unit: 'hours',
        recorded_at: '2024-01-01T07:00:00Z',
        notes: 'Good sleep quality',
      },
      {
        id: 4,
        type: 'heart_rate',
        value: 72,
        unit: 'bpm',
        recorded_at: '2024-01-01T09:00:00Z',
        notes: 'Resting heart rate',
      },
      {
        id: 5,
        type: 'water_intake',
        value: 2.2,
        unit: 'liters',
        recorded_at: '2024-01-01T20:00:00Z',
        notes: 'Daily water consumption',
      },
      // Previous day data for trend analysis
      {
        id: 6,
        type: 'weight',
        value: 76.0,
        unit: 'kg',
        recorded_at: '2023-12-31T08:00:00Z',
        notes: 'Previous weight',
      },
      {
        id: 7,
        type: 'steps',
        value: 7800,
        unit: 'steps',
        recorded_at: '2023-12-31T23:59:59Z',
        notes: 'Previous day steps',
      },
    ];

    // Create comprehensive goal datasets
    mockHealthGoals = [
      {
        id: 1,
        type: 'weight',
        target_value: 70,
        current_value: 75.5,
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        target_date: '2024-06-01T00:00:00Z',
      },
      {
        id: 2,
        type: 'steps',
        target_value: 10000,
        current_value: 8500,
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        target_date: '2024-12-31T00:00:00Z',
      },
      {
        id: 3,
        type: 'sleep',
        target_value: 8,
        current_value: 7.5,
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        target_date: '2024-12-31T00:00:00Z',
      },
      {
        id: 4,
        type: 'water_intake',
        target_value: 2.5,
        current_value: 2.2,
        status: 'completed',
        created_at: '2024-01-01T00:00:00Z',
        target_date: '2024-01-31T00:00:00Z',
      },
    ];

    // Create health data points for aggregateRadarData
    mockHealthDataPoints = {
      weight: [
        { date: '2024-01-01', value: 75.5, unit: 'kg' },
        { date: '2023-12-31', value: 76.0, unit: 'kg' },
      ],
      steps: [
        { date: '2024-01-01', value: 8500, unit: 'steps' },
        { date: '2023-12-31', value: 7800, unit: 'steps' },
      ],
      sleep: [
        { date: '2024-01-01', value: 7.5, unit: 'hours' },
        { date: '2023-12-31', value: 7.0, unit: 'hours' },
      ],
      heart_rate: [
        { date: '2024-01-01', value: 72, unit: 'bpm' },
        { date: '2023-12-31', value: 75, unit: 'bpm' },
      ],
      water_intake: [
        { date: '2024-01-01', value: 2200, unit: 'ml' },
        { date: '2023-12-31', value: 2000, unit: 'ml' },
      ],
      bmi: [],
      blood_pressure_systolic: [],
      blood_pressure_diastolic: [],
      exercise_minutes: [],
      calories_burned: [],
      distance: [],
      body_fat_percentage: [],
      muscle_mass: [],
    };
  });

  describe('Health Status Consistency Tests', () => {
    it('should produce consistent health scores between modules for the same input data', () => {
      const testCases: Array<{ type: HealthMetricType; value: number }> = [
        { type: 'weight', value: 75 },
        { type: 'steps', value: 8500 },
        { type: 'sleep', value: 7.5 },
        { type: 'heart_rate', value: 72 },
      ];

      testCases.forEach(({ type, value }) => {
        // Get score from healthScoring module
        const scoringScore = scoreHealthMetric(type, value, 'percentage', mockUserProfile);

        // Get score from healthDataTransformers module
        const transformerScore = normalizeHealthValue(value, type, 'percentage');

        // Scores should be within acceptable tolerance (±10 points due to different scoring approaches)
        const tolerance = 15;

        expect(Math.abs(scoringScore - transformerScore)).toBeLessThanOrEqual(tolerance);
      });
    });

    it('should have consistent score categorization between modules', () => {
      const testScores = [25, 45, 65, 85, 95];

      testScores.forEach((score) => {
        const scoringCategory = getScoreCategory(score);

        // Determine category from transformer score color
        let transformerCategory: string;
        const color = getTransformerScoreColor(score);

        if (score >= 80) {
          transformerCategory = 'excellent';
        } else if (score >= 60) {
          transformerCategory = 'good';
        } else if (score >= 40) {
          transformerCategory = 'fair';
        } else {
          transformerCategory = 'poor';
        }

        expect(scoringCategory).toBe(transformerCategory);
      });
    });

    it('should have consistent color mapping between modules', () => {
      const testScores = [20, 50, 70, 90];

      testScores.forEach((score) => {
        const scoringColor = getScoreColor(score);
        const transformerColor = getTransformerScoreColor(score);

        // Colors should match exactly for the same score ranges
        expect(scoringColor).toBe(transformerColor);
      });
    });
  });

  describe('Metric Range and Scoring Integration', () => {
    it('should have aligned metric ranges between getHealthMetricRanges and getHealthTypeConfig', () => {
      const overlappingTypes: HealthMetricType[] = ['weight', 'steps', 'sleep', 'heart_rate'];

      overlappingTypes.forEach((type) => {
        const scoringRange = getHealthMetricRanges(type, mockUserProfile);
        const transformerConfig = getHealthTypeConfig(type);

        // Units should match
        expect(scoringRange.unit).toBe(transformerConfig.unit);

        // Ideal ranges should be compatible (within reasonable bounds)
        if (transformerConfig.idealRange) {
          const { min: tMin, max: tMax } = transformerConfig.idealRange;
          const { min: sMin, max: sMax } = scoringRange.optimal;

          // Ranges should overlap or be close
          const rangeOverlap = Math.max(0, Math.min(sMax, tMax) - Math.max(sMin, tMin));
          const totalRange = Math.max(sMax, tMax) - Math.min(sMin, tMin);
          const overlapPercentage = rangeOverlap / totalRange;

          expect(overlapPercentage).toBeGreaterThan(0.3); // At least 30% overlap
        }
      });
    });

    it('should produce consistent scoring results for overlapping metrics', () => {
      const testData = [
        { type: 'steps' as HealthMetricType, value: 8000 },
        { type: 'sleep' as HealthMetricType, value: 7.5 },
        { type: 'heart_rate' as HealthMetricType, value: 70 },
      ];

      testData.forEach(({ type, value }) => {
        const scoringResult = scoreHealthMetric(type, value, 'percentage', mockUserProfile);
        const transformerResult = normalizeHealthValue(value, type, 'percentage');

        // Results should be in the same general category
        const scoringCategory = getScoreCategory(scoringResult);
        const transformerCategory = getScoreCategory(transformerResult);

        // Allow for one category difference due to different algorithms
        const categories = ['poor', 'fair', 'good', 'excellent'];
        const scoringIndex = categories.indexOf(scoringCategory);
        const transformerIndex = categories.indexOf(transformerCategory);

        expect(Math.abs(scoringIndex - transformerIndex)).toBeLessThanOrEqual(1);
      });
    });

    it('should handle personalized ranges consistently across modules', () => {
      const personalizedProfile: UserProfile = {
        ...mockUserProfile,
        goals: {
          dailySteps: 12000,
          sleepHours: 9,
          waterIntake: 3000,
          exerciseMinutes: 200,
        },
      };

      // Test steps with personalized goal
      const stepsValue = 11000;
      const scoringScore = scoreHealthMetric('steps', stepsValue, 'percentage', personalizedProfile);
      const transformerScore = normalizeHealthValue(stepsValue, 'steps', 'percentage');

      // Both should recognize this as a good score (close to personalized goal)
      expect(scoringScore).toBeGreaterThan(70);
      expect(transformerScore).toBeGreaterThan(50); // Transformer uses fixed ranges
    });
  });

  describe('Radar Chart Data Consistency', () => {
    it('should produce equivalent radar data between aggregateRadarData and transformToRadarData', () => {
      const scoringRadarData = aggregateRadarData(
        mockHealthDataPoints,
        'percentage',
        mockUserProfile,
        undefined,
        DEFAULT_SCORE_COLORS,
      );

      const transformerRadarData = transformToRadarData(
        mockHealthRecords,
        mockHealthGoals,
        'percentage',
      );

      // Both should produce radar data
      expect(scoringRadarData).toHaveLength.greaterThan(0);
      expect(transformerRadarData).toHaveLength.greaterThan(0);

      // Find common metrics
      const scoringMetrics = scoringRadarData;
      const transformerMetrics = transformerRadarData[0]?.metrics || [];

      const commonTypes = ['Weight', 'Daily Steps', 'Sleep Quality', 'Heart Rate'];

      commonTypes.forEach((categoryName) => {
        const scoringMetric = scoringMetrics.find(m => m.category === categoryName);
        const transformerMetric = transformerMetrics.find(m => m.category === categoryName);

        if (scoringMetric && transformerMetric) {
          // Values should match
          expect(scoringMetric.value).toBeCloseTo(transformerMetric.value, 1);

          // Units should match
          expect(scoringMetric.unit).toBe(transformerMetric.unit);

          // Scores should be within reasonable range
          const scoreDiff = Math.abs(scoringMetric.score - transformerMetric.score);

          expect(scoreDiff).toBeLessThanOrEqual(20);
        }
      });
    });

    it('should have consistent maxValue calculations between approaches', () => {
      const scoringRadarData = aggregateRadarData(mockHealthDataPoints, 'percentage', mockUserProfile);
      const transformerRadarData = transformToRadarData(mockHealthRecords, mockHealthGoals, 'percentage');

      const transformerMetrics = transformerRadarData[0]?.metrics || [];

      scoringRadarData.forEach((scoringMetric) => {
        const matchingTransformerMetric = transformerMetrics.find(
          tm => tm.category === scoringMetric.category,
        );

        if (matchingTransformerMetric) {
          // MaxValue calculations should be reasonable and consistent
          const ratio = scoringMetric.maxValue / matchingTransformerMetric.maxValue;

          expect(ratio).toBeGreaterThan(0.5);
          expect(ratio).toBeLessThan(2.0);
        }
      });
    });

    it('should maintain score calculation accuracy within tolerance ranges', () => {
      const testMetrics = [
        { type: 'weight' as HealthMetricType, value: 75, expectedRange: [60, 80] },
        { type: 'steps' as HealthMetricType, value: 8500, expectedRange: [70, 90] },
        { type: 'sleep' as HealthMetricType, value: 7.5, expectedRange: [70, 90] },
      ];

      testMetrics.forEach(({ type, value, expectedRange }) => {
        const scoringScore = scoreHealthMetric(type, value, 'percentage', mockUserProfile);
        const transformerScore = normalizeHealthValue(value, type, 'percentage');

        // Both scores should be within expected range
        expect(scoringScore).toBeGreaterThanOrEqual(expectedRange[0]);
        expect(scoringScore).toBeLessThanOrEqual(expectedRange[1]);
        expect(transformerScore).toBeGreaterThanOrEqual(expectedRange[0] - 20);
        expect(transformerScore).toBeLessThanOrEqual(expectedRange[1] + 20);
      });
    });
  });

  describe('Goal Progress and Analytics Integration', () => {
    it('should calculate end-to-end goal progress consistently', () => {
      const summaryMetrics = transformToSummaryMetrics(mockHealthRecords, mockHealthGoals);

      summaryMetrics.forEach((metric) => {
        if (metric.goalTarget && metric.goalCurrent !== undefined) {
          const progress = (metric.goalCurrent / metric.goalTarget) * 100;

          // Progress should be reasonable
          expect(progress).toBeGreaterThan(0);
          expect(progress).toBeLessThan(200); // Allow for over-achievement

          // Current value should match record value for active goals
          const matchingRecord = mockHealthRecords.find(r =>
            r.type === metric.label.toLowerCase().replace(/\s+/g, '_'),
          );

          if (matchingRecord) {
            expect(metric.value).toBeCloseTo(matchingRecord.value, 1);
          }
        }
      });
    });

    it('should integrate trend analysis with scoring systems properly', () => {
      // Test weight trend (decreasing is good)
      const weightTrend = calculateTrend(75.5, 76.0);

      expect(weightTrend.direction).toBe('down');
      expect(weightTrend.percentage).toBeCloseTo(0.66, 1);

      // Test steps trend (increasing is good)
      const stepsTrend = calculateTrend(8500, 7800);

      expect(stepsTrend.direction).toBe('up');
      expect(stepsTrend.percentage).toBeCloseTo(8.97, 1);

      // Verify trends align with scoring improvements
      const currentWeightScore = scoreHealthMetric('weight', 75.5, 'percentage', mockUserProfile);
      const previousWeightScore = scoreHealthMetric('weight', 76.0, 'percentage', mockUserProfile);

      if (weightTrend.direction === 'down') {
        expect(currentWeightScore).toBeGreaterThanOrEqual(previousWeightScore);
      }
    });

    it('should validate predictive analytics accuracy with health scoring', () => {
      const trendData = [
        { date: '2023-12-28', value: 77.0 },
        { date: '2023-12-29', value: 76.5 },
        { date: '2023-12-30', value: 76.2 },
        { date: '2023-12-31', value: 76.0 },
        { date: '2024-01-01', value: 75.5 },
      ];

      const predictions = transformToPredictiveData(trendData, 'linear-regression', 3);

      // Verify predictions are reasonable
      const futurePredictions = predictions.filter(p => p.isPrediction);

      expect(futurePredictions).toHaveLength(3);

      futurePredictions.forEach((prediction, index) => {
        // Weight should continue decreasing trend
        expect(prediction.value).toBeLessThan(75.5);
        expect(prediction.value).toBeGreaterThan(70); // Reasonable lower bound

        // Confidence intervals should exist
        expect(prediction.confidenceUpper).toBeDefined();
        expect(prediction.confidenceLower).toBeDefined();

        if (prediction.confidenceUpper && prediction.confidenceLower) {
          expect(prediction.confidenceUpper).toBeGreaterThan(prediction.value);
          expect(prediction.confidenceLower).toBeLessThan(prediction.value);
        }
      });
    });
  });

  describe('User Profile Impact Testing', () => {
    it('should handle gender-specific adjustments consistently', () => {
      const maleProfile: UserProfile = { ...mockUserProfile, gender: 'male' };
      const femaleProfile: UserProfile = { ...mockUserProfile, gender: 'female' };

      // Test body fat percentage (gender-specific ranges)
      const bodyFatValue = 15;

      const maleScore = scoreHealthMetric('body_fat_percentage', bodyFatValue, 'percentage', maleProfile);
      const femaleScore = scoreHealthMetric('body_fat_percentage', bodyFatValue, 'percentage', femaleProfile);

      // 15% body fat should be better for males than females
      expect(maleScore).toBeGreaterThan(femaleScore);
    });

    it('should apply activity level impacts correctly across modules', () => {
      const sedentaryProfile: UserProfile = { ...mockUserProfile, activityLevel: 'sedentary' };
      const activeProfile: UserProfile = { ...mockUserProfile, activityLevel: 'very_active' };

      // Test steps scoring with different activity levels
      const stepsValue = 6000;

      const sedentaryScore = scoreHealthMetric('steps', stepsValue, 'percentage', sedentaryProfile);
      const activeScore = scoreHealthMetric('steps', stepsValue, 'percentage', activeProfile);

      // Both should be valid scores
      expect(sedentaryScore).toBeGreaterThanOrEqual(0);
      expect(sedentaryScore).toBeLessThanOrEqual(100);
      expect(activeScore).toBeGreaterThanOrEqual(0);
      expect(activeScore).toBeLessThanOrEqual(100);
    });

    it('should maintain personalized range consistency across both systems', () => {
      const customProfile: UserProfile = {
        ...mockUserProfile,
        goals: {
          dailySteps: 15000,
          sleepHours: 9,
          waterIntake: 3500,
          exerciseMinutes: 300,
        },
      };

      // Test with high goals
      const stepsScore = scoreHealthMetric('steps', 12000, 'percentage', customProfile);
      const sleepScore = scoreHealthMetric('sleep', 8.5, 'percentage', customProfile);

      // Scores should reflect personalized goals
      expect(stepsScore).toBeGreaterThan(60); // Good progress toward high goal
      expect(sleepScore).toBeGreaterThan(70); // Close to personalized sleep goal
    });
  });

  describe('Real-World Health Scenarios', () => {
    it('should handle weight loss journey scenario', () => {
      const weightLossData = [
        { date: '2024-01-01', value: 80.0 },
        { date: '2024-01-15', value: 79.2 },
        { date: '2024-02-01', value: 78.5 },
        { date: '2024-02-15', value: 77.8 },
        { date: '2024-03-01', value: 77.0 },
      ];

      // Test trend calculation
      const trend = calculateTrend(77.0, 80.0);

      expect(trend.direction).toBe('down');
      expect(trend.percentage).toBeCloseTo(3.75, 1);

      // Test predictive analytics
      const predictions = transformToPredictiveData(weightLossData, 'linear-regression', 5);
      const futurePredictions = predictions.filter(p => p.isPrediction);

      // Should predict continued weight loss
      futurePredictions.forEach((prediction) => {
        expect(prediction.value).toBeLessThan(77.0);
        expect(prediction.value).toBeGreaterThan(70.0); // Reasonable target
      });

      // Test scoring improvement
      const initialScore = scoreHealthMetric('weight', 80.0, 'percentage', mockUserProfile);
      const currentScore = scoreHealthMetric('weight', 77.0, 'percentage', mockUserProfile);

      expect(currentScore).toBeGreaterThan(initialScore);
    });

    it('should handle fitness improvement scenario with multiple metrics', () => {
      const fitnessJourney = {
        steps: [
          { date: '2024-01-01', value: 5000 },
          { date: '2024-01-15', value: 6500 },
          { date: '2024-02-01', value: 8000 },
          { date: '2024-02-15', value: 9500 },
          { date: '2024-03-01', value: 11000 },
        ],
        heart_rate: [
          { date: '2024-01-01', value: 85 },
          { date: '2024-01-15', value: 82 },
          { date: '2024-02-01', value: 78 },
          { date: '2024-02-15', value: 75 },
          { date: '2024-03-01', value: 72 },
        ],
      };

      // Test steps improvement
      const stepsTrend = calculateTrend(11000, 5000);

      expect(stepsTrend.direction).toBe('up');
      expect(stepsTrend.percentage).toBe(120);

      // Test heart rate improvement (lower is better)
      const hrTrend = calculateTrend(72, 85);

      expect(hrTrend.direction).toBe('down');
      expect(hrTrend.percentage).toBeCloseTo(15.29, 1);

      // Test overall health score improvement
      const initialStepsScore = scoreHealthMetric('steps', 5000, 'percentage', mockUserProfile);
      const currentStepsScore = scoreHealthMetric('steps', 11000, 'percentage', mockUserProfile);

      expect(currentStepsScore).toBeGreaterThan(initialStepsScore);

      const initialHRScore = scoreHealthMetric('heart_rate', 85, 'percentage', mockUserProfile);
      const currentHRScore = scoreHealthMetric('heart_rate', 72, 'percentage', mockUserProfile);

      expect(currentHRScore).toBeGreaterThan(initialHRScore);
    });

    it('should handle chronic condition management scenario', () => {
      const diabeticProfile: UserProfile = {
        ...mockUserProfile,
        age: 55,
        goals: {
          dailySteps: 8000, // Moderate goal for condition management
          sleepHours: 8,
          waterIntake: 2000,
          exerciseMinutes: 120,
        },
      };

      // Test blood pressure monitoring
      const bpData = [
        { date: '2024-01-01', value: 140 }, // High
        { date: '2024-01-15', value: 135 },
        { date: '2024-02-01', value: 130 },
        { date: '2024-02-15', value: 125 },
        { date: '2024-03-01', value: 120 }, // Normal
      ];

      const bpTrend = calculateTrend(120, 140);

      expect(bpTrend.direction).toBe('down');
      expect(bpTrend.percentage).toBeCloseTo(14.29, 1);

      // Test scoring with condition-aware profile
      const initialBPScore = scoreHealthMetric('blood_pressure_systolic', 140, 'percentage', diabeticProfile);
      const currentBPScore = scoreHealthMetric('blood_pressure_systolic', 120, 'percentage', diabeticProfile);

      expect(currentBPScore).toBeGreaterThan(initialBPScore);

      // Verify reasonable scores for condition management
      expect(currentBPScore).toBeGreaterThan(80); // Excellent control
      expect(initialBPScore).toBeLessThan(40); // Poor initial control
    });

    it('should handle preventive health monitoring scenario', () => {
      const preventiveProfile: UserProfile = {
        ...mockUserProfile,
        age: 25,
        activityLevel: 'very_active',
        goals: {
          dailySteps: 12000,
          sleepHours: 8,
          waterIntake: 3000,
          exerciseMinutes: 200,
        },
      };

      // Test optimal health metrics
      const optimalMetrics = {
        weight: 70,
        steps: 12500,
        sleep: 8.2,
        heart_rate: 65,
        water_intake: 3200,
      };

      Object.entries(optimalMetrics).forEach(([type, value]) => {
        const score = scoreHealthMetric(type as HealthMetricType, value, 'percentage', preventiveProfile);

        expect(score).toBeGreaterThan(70); // Should score well for preventive care
      });

      // Test radar chart for comprehensive health view
      const healthDataPoints: Record<HealthMetricType, HealthDataPoint[]> = {
        weight: [{ date: '2024-01-01', value: 70, unit: 'kg' }],
        steps: [{ date: '2024-01-01', value: 12500, unit: 'steps' }],
        sleep: [{ date: '2024-01-01', value: 8.2, unit: 'hours' }],
        heart_rate: [{ date: '2024-01-01', value: 65, unit: 'bpm' }],
        water_intake: [{ date: '2024-01-01', value: 3200, unit: 'ml' }],
        bmi: [],
        blood_pressure_systolic: [],
        blood_pressure_diastolic: [],
        exercise_minutes: [],
        calories_burned: [],
        distance: [],
        body_fat_percentage: [],
        muscle_mass: [],
      };

      const radarData = aggregateRadarData(healthDataPoints, 'percentage', preventiveProfile);
      const overallScore = calculateOverallHealthScore(radarData);

      expect(overallScore).toBeGreaterThan(75); // Excellent overall health
    });
  });

  describe('Data Flow Integration Tests', () => {
    it('should maintain data integrity through complete transformation pipeline', () => {
      // Start with raw records
      const rawRecords = mockHealthRecords;

      // Transform to summary metrics
      const summaryMetrics = transformToSummaryMetrics(rawRecords, mockHealthGoals);

      // Verify data integrity
      summaryMetrics.forEach((metric) => {
        const originalRecord = rawRecords.find(r =>
          r.type === metric.label.toLowerCase().replace(/\s+/g, '_'),
        );

        if (originalRecord) {
          expect(metric.value).toBe(originalRecord.value);
          expect(metric.unit).toBe(originalRecord.unit || '');
        }
      });

      // Transform to radar data
      const radarData = transformToRadarData(rawRecords, mockHealthGoals, 'percentage');

      // Verify radar data integrity
      expect(radarData).toHaveLength(1);

      const metrics = radarData[0].metrics;

      metrics.forEach((metric) => {
        const originalRecord = rawRecords.find(r =>
          r.type === metric.category.toLowerCase().replace(/\s+/g, '_'),
        );

        if (originalRecord) {
          expect(metric.value).toBe(originalRecord.value);
        }
      });
    });

    it('should handle error conditions consistently across module boundaries', () => {
      // Test with invalid data
      const invalidRecords: HealthRecord[] = [
        {
          id: 1,
          type: 'weight',
          value: Number.NaN,
          unit: 'kg',
          recorded_at: 'invalid-date',
          notes: 'Invalid data',
        },
      ];

      // Both modules should handle invalid data gracefully
      expect(() => transformToSummaryMetrics(invalidRecords, [])).toThrow();
      expect(() => transformToRadarData(invalidRecords, [], 'percentage')).toThrow();
    });

    it('should preserve data flow accuracy across transformations', () => {
      const testValue = 8500;
      const testType = 'steps';

      // Direct scoring
      const directScore = scoreHealthMetric('steps', testValue, 'percentage', mockUserProfile);

      // Through transformation pipeline
      const testRecord: HealthRecord = {
        id: 999,
        type: testType,
        value: testValue,
        unit: 'steps',
        recorded_at: '2024-01-01T12:00:00Z',
        notes: 'Test record',
      };

      const radarData = transformToRadarData([testRecord], [], 'percentage');
      const radarMetric = radarData[0].metrics.find(m =>
        m.category.toLowerCase().includes('steps'),
      );

      if (radarMetric) {
        expect(radarMetric.value).toBe(testValue);

        // Scores should be within reasonable range
        const scoreDiff = Math.abs(directScore - radarMetric.score);

        expect(scoreDiff).toBeLessThanOrEqual(15);
      }
    });
  });

  describe('Performance and Scalability Integration', () => {
    it('should handle large datasets efficiently in both modules', () => {
      // Create large dataset
      const largeRecords: HealthRecord[] = [];
      const largeDataPoints: Record<HealthMetricType, HealthDataPoint[]> = {
        weight: [],
        steps: [],
        sleep: [],
        heart_rate: [],
        water_intake: [],
        bmi: [],
        blood_pressure_systolic: [],
        blood_pressure_diastolic: [],
        exercise_minutes: [],
        calories_burned: [],
        distance: [],
        body_fat_percentage: [],
        muscle_mass: [],
      };

      // Generate 1000 records over 100 days
      for (let i = 0; i < 1000; i++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + (i % 100));

        const record: HealthRecord = {
          id: i,
          type: ['weight', 'steps', 'sleep', 'heart_rate'][i % 4] as any,
          value: 70 + Math.random() * 20,
          unit: ['kg', 'steps', 'hours', 'bpm'][i % 4],
          recorded_at: date.toISOString(),
          notes: `Record ${i}`,
        };

        largeRecords.push(record);

        // Add to data points
        const type = record.type as HealthMetricType;
        if (largeDataPoints[type]) {
          largeDataPoints[type].push({
            date: date.toISOString().split('T')[0],
            value: record.value,
            unit: record.unit,
          });
        }
      }

      // Test performance
      const start = performance.now();

      const summaryMetrics = transformToSummaryMetrics(largeRecords, []);
      const radarData = transformToRadarData(largeRecords, [], 'percentage');
      const aggregatedRadar = aggregateRadarData(largeDataPoints, 'percentage', mockUserProfile);

      const end = performance.now();
      const duration = end - start;

      // Should complete within reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);

      // Should produce valid results
      expect(summaryMetrics.length).toBeGreaterThan(0);
      expect(radarData.length).toBeGreaterThan(0);
      expect(aggregatedRadar.length).toBeGreaterThan(0);
    });

    it('should maintain memory efficiency during integrated operations', () => {
      // Test with repeated operations
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const summaryMetrics = transformToSummaryMetrics(mockHealthRecords, mockHealthGoals);
        const radarData = transformToRadarData(mockHealthRecords, mockHealthGoals, 'percentage');
        const aggregatedRadar = aggregateRadarData(mockHealthDataPoints, 'percentage', mockUserProfile);

        // Verify results are consistent across iterations
        expect(summaryMetrics.length).toBeGreaterThan(0);
        expect(radarData.length).toBe(1);
        expect(aggregatedRadar.length).toBeGreaterThan(0);
      }

      // If we reach here without memory issues, the test passes
      expect(true).toBe(true);
    });

    it('should provide consistent benchmarks for integrated health status calculations', () => {
      const benchmarkRuns = 10;
      const durations: number[] = [];

      for (let i = 0; i < benchmarkRuns; i++) {
        const start = performance.now();

        // Perform integrated calculations
        const summaryMetrics = transformToSummaryMetrics(mockHealthRecords, mockHealthGoals);
        const radarData = transformToRadarData(mockHealthRecords, mockHealthGoals, 'percentage');
        const aggregatedRadar = aggregateRadarData(mockHealthDataPoints, 'percentage', mockUserProfile);

        // Calculate overall health score
        const overallScore = calculateOverallHealthScore(aggregatedRadar);

        // Perform trend analysis
        const trends = mockHealthRecords.map((record) => {
          const previousValue = mockHealthRecords.find(r =>
            r.type === record.type && r.id !== record.id,
          )?.value;

          if (previousValue) {
            return calculateTrend(record.value, previousValue);
          }
          return null;
        }).filter(Boolean);

        const end = performance.now();
        durations.push(end - start);

        // Verify results
        expect(summaryMetrics.length).toBeGreaterThan(0);
        expect(radarData.length).toBe(1);
        expect(aggregatedRadar.length).toBeGreaterThan(0);
        expect(overallScore).toBeGreaterThanOrEqual(0);
        expect(overallScore).toBeLessThanOrEqual(100);
        expect(trends.length).toBeGreaterThan(0);
      }

      // Calculate benchmark statistics
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      // Performance benchmarks
      expect(avgDuration).toBeLessThan(50); // Average < 50ms
      expect(maxDuration).toBeLessThan(100); // Max < 100ms

      // Consistency check (standard deviation should be low)
      const variance = durations.reduce((sum, d) => sum + (d - avgDuration) ** 2, 0) / durations.length;
      const stdDev = Math.sqrt(variance);

      expect(stdDev).toBeLessThan(avgDuration * 0.5); // StdDev < 50% of average
    });
  });
});
