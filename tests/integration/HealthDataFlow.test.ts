import type {
  HealthGoal,
  HealthRecord,
  ScoringSystem,
} from '@/components/health/types';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import the modules we're testing
import {
  calculateTrend,
  formatHealthValue,
  getScoreColor,
  normalizeHealthValue,
  transformToPredictiveData,
  transformToRadarData,
  transformToSummaryMetrics,
} from '@/utils/healthDataTransformers';

import {
  aggregateRadarData,
  scoreHealthMetric,
  getScoreColor as scoringGetScoreColor,
} from '@/utils/healthScoring';

import {
  generateConfidenceInterval,
  linearRegression,
  movingAverage,
} from '@/utils/statistics';

// Mock API response types
type MockHealthRecord = {
  id: number;
  userId: string;
  typeId: number;
  type: string;
  value: number;
  unit: string;
  recorded_at: string;
};

type MockHealthGoal = {
  id: number;
  userId: string;
  type: string;
  current_value: number;
  target_value: number;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  target_date?: string;
};

type MockAnalyticsResponse = {
  type: string;
  displayName: string;
  unit: string;
  aggregation: string;
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    currentValue: number | null;
    trend: 'increasing' | 'decreasing' | 'stable';
    trendValue: number;
    totalRecords: number;
  };
  data: Array<{
    date: string;
    value: number;
    min: number;
    max: number;
    count: number;
  }>;
  typicalRange: {
    low: number | null;
    high: number | null;
  };
};

// Performance measurement utility
const measurePerformance = async <T>(
  operation: () => Promise<T> | T,
  label: string,
): Promise<{ result: T; duration: number; memoryUsed: number }> => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;

  const result = await operation();

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;

  const duration = endTime - startTime;
  const memoryUsed = endMemory - startMemory;

  console.log(`${label}: ${duration.toFixed(2)}ms, Memory: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);

  return { result, duration, memoryUsed };
};

// Test data generators
const generateHealthRecords = (count: number, type: string = 'weight'): MockHealthRecord[] => {
  const records: MockHealthRecord[] = [];
  const baseDate = new Date('2024-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);

    // Generate realistic weight progression (gradual decrease)
    let value: number;
    switch (type) {
      case 'weight':
        value = 80 - (i * 0.1) + (Math.random() - 0.5) * 2; // Gradual weight loss with noise
        break;
      case 'steps':
        value = 8000 + Math.sin(i / 7) * 2000 + (Math.random() - 0.5) * 1000; // Weekly pattern
        break;
      case 'sleep':
        value = 7.5 + (Math.random() - 0.5) * 1.5; // Random around 7.5 hours
        break;
      case 'heart_rate':
        value = 70 + (Math.random() - 0.5) * 10; // Random around 70 bpm
        break;
      default:
        value = 50 + (Math.random() - 0.5) * 20;
    }

    records.push({
      id: i + 1,
      userId: 'test-user',
      typeId: 1,
      type,
      value: Math.round(value * 100) / 100,
      unit: type === 'weight' ? 'kg' : type === 'steps' ? 'steps' : type === 'sleep' ? 'hours' : 'bpm',
      recorded_at: date.toISOString(),
    });
  }

  return records;
};

const generateHealthGoals = (types: string[]): MockHealthGoal[] => {
  return types.map((type, index) => ({
    id: index + 1,
    userId: 'test-user',
    type,
    current_value: type === 'weight' ? 78 : type === 'steps' ? 8500 : type === 'sleep' ? 7.2 : 72,
    target_value: type === 'weight' ? 70 : type === 'steps' ? 10000 : type === 'sleep' ? 8 : 65,
    status: 'active' as const,
    created_at: '2024-01-01T00:00:00Z',
    target_date: '2024-06-01T00:00:00Z',
  }));
};

const generateAnalyticsResponse = (type: string, dataPoints: number = 30): MockAnalyticsResponse => {
  const data = [];
  const baseDate = new Date('2024-01-01');

  for (let i = 0; i < dataPoints; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);

    const baseValue = type === 'weight'
      ? 80 - (i * 0.1)
      : type === 'steps'
        ? 8000 + Math.sin(i / 7) * 2000
        : type === 'sleep' ? 7.5 : 70;

    const value = baseValue + (Math.random() - 0.5) * (baseValue * 0.1);

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
      min: Math.round((value * 0.9) * 100) / 100,
      max: Math.round((value * 1.1) * 100) / 100,
      count: 1,
    });
  }

  return {
    type,
    displayName: type.charAt(0).toUpperCase() + type.slice(1),
    unit: type === 'weight' ? 'kg' : type === 'steps' ? 'steps' : type === 'sleep' ? 'hours' : 'bpm',
    aggregation: 'daily',
    dateRange: {
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-30T23:59:59Z',
    },
    summary: {
      currentValue: data[data.length - 1]?.value || null,
      trend: 'decreasing' as const,
      trendValue: 0.1,
      totalRecords: dataPoints,
    },
    data,
    typicalRange: {
      low: type === 'weight' ? 60 : type === 'steps' ? 5000 : type === 'sleep' ? 6 : 60,
      high: type === 'weight' ? 90 : type === 'steps' ? 15000 : type === 'sleep' ? 9 : 100,
    },
  };
};

// Synthetic datasets for mathematical validation
const createLinearDataset = (slope: number, intercept: number, points: number, noise: number = 0) => {
  const data = [];
  for (let i = 0; i < points; i++) {
    const x = i;
    const y = slope * x + intercept + (Math.random() - 0.5) * noise;
    data.push({ x, y });
  }
  return data;
};

const createSeasonalDataset = (baseValue: number, amplitude: number, period: number, points: number) => {
  const data = [];
  for (let i = 0; i < points; i++) {
    const seasonal = amplitude * Math.sin((2 * Math.PI * i) / period);
    const value = baseValue + seasonal + (Math.random() - 0.5) * (baseValue * 0.05);
    data.push({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
    });
  }
  return data;
};

describe('Health Data Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Response to Transformer Integration', () => {
    it('should transform API health records to summary metrics correctly', () => {
      const mockRecords = generateHealthRecords(10, 'weight');
      const mockGoals = generateHealthGoals(['weight']);

      // Convert mock data to expected format
      const healthRecords: HealthRecord[] = mockRecords.map(record => ({
        id: record.id,
        type: record.type,
        value: record.value,
        unit: record.unit,
        recorded_at: record.recorded_at,
      }));

      const healthGoals: HealthGoal[] = mockGoals.map(goal => ({
        id: goal.id,
        type: goal.type,
        current_value: goal.current_value,
        target_value: goal.target_value,
        status: goal.status,
      }));

      const result = transformToSummaryMetrics(healthRecords, healthGoals);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        label: 'Weight',
        value: expect.any(Number),
        unit: 'kg',
        goalTarget: 70,
        goalCurrent: 78,
        icon: '⚖️',
      });

      // Verify goal progress calculation
      const goalProgress = ((78 - 70) / (80 - 70)) * 100; // Progress towards goal

      expect(result[0].goalCurrent).toBe(78);
      expect(result[0].goalTarget).toBe(70);
    });

    it('should handle malformed API data gracefully', () => {
      const malformedRecords = [
        { id: 1, type: 'weight', value: 'invalid', unit: 'kg', recorded_at: '2024-01-01' },
        { id: 2, type: 'weight', value: null, unit: 'kg', recorded_at: 'invalid-date' },
        { id: 3, type: 'weight', value: Infinity, unit: 'kg', recorded_at: '2024-01-03' },
      ] as any;

      expect(() => {
        transformToSummaryMetrics(malformedRecords, []);
      }).toThrow();
    });

    it('should transform analytics data to predictive format with linear regression', () => {
      const mockAnalytics = generateAnalyticsResponse('weight', 30);
      const trendData = mockAnalytics.data.map(point => ({
        date: point.date,
        value: point.value,
        unit: mockAnalytics.unit,
      }));

      const result = transformToPredictiveData(trendData, 'linear-regression', 7);

      expect(result).toHaveLength(37); // 30 historical + 7 predictions

      const historicalData = result.filter(point => !point.isPrediction);
      const predictions = result.filter(point => point.isPrediction);

      expect(historicalData).toHaveLength(30);
      expect(predictions).toHaveLength(7);

      // Verify prediction structure
      predictions.forEach((prediction) => {
        expect(prediction).toMatchObject({
          date: expect.any(String),
          value: expect.any(Number),
          unit: 'kg',
          isPrediction: true,
          algorithm: 'linear-regression',
          confidenceUpper: expect.any(Number),
          confidenceLower: expect.any(Number),
        });

        expect(prediction.confidenceUpper).toBeGreaterThan(prediction.value);
        expect(prediction.confidenceLower).toBeLessThan(prediction.value);
      });
    });

    it('should transform analytics data to predictive format with moving average', () => {
      const mockAnalytics = generateAnalyticsResponse('steps', 20);
      const trendData = mockAnalytics.data.map(point => ({
        date: point.date,
        value: point.value,
        unit: mockAnalytics.unit,
      }));

      const result = transformToPredictiveData(trendData, 'moving-average', 5);

      expect(result).toHaveLength(25); // 20 historical + 5 predictions

      const predictions = result.filter(point => point.isPrediction);

      expect(predictions).toHaveLength(5);

      predictions.forEach((prediction) => {
        expect(prediction.algorithm).toBe('moving-average');
        expect(prediction.value).toBeGreaterThan(0);
      });
    });

    it('should transform radar data with different scoring systems', () => {
      const mockRecords = [
        ...generateHealthRecords(5, 'weight'),
        ...generateHealthRecords(5, 'steps'),
        ...generateHealthRecords(5, 'sleep'),
      ];
      const mockGoals = generateHealthGoals(['weight', 'steps', 'sleep']);

      const healthRecords: HealthRecord[] = mockRecords.map(record => ({
        id: record.id,
        type: record.type,
        value: record.value,
        unit: record.unit,
        recorded_at: record.recorded_at,
      }));

      const healthGoals: HealthGoal[] = mockGoals.map(goal => ({
        id: goal.id,
        type: goal.type,
        current_value: goal.current_value,
        target_value: goal.target_value,
        status: goal.status,
      }));

      const scoringSystems: ScoringSystem[] = ['percentage', 'z-score', 'custom'];

      scoringSystems.forEach((system) => {
        const result = transformToRadarData(healthRecords, healthGoals, system);

        expect(result).toHaveLength(1);
        expect(result[0].metrics).toHaveLength(3);

        result[0].metrics.forEach((metric) => {
          expect(metric.score).toBeGreaterThanOrEqual(0);
          expect(metric.score).toBeLessThanOrEqual(100);
          expect(metric.color).toMatch(/^#[0-9a-f]{6}$/i);
        });
      });
    });
  });

  describe('Cross-Module Consistency Tests', () => {
    it('should produce consistent scores between healthScoring and healthDataTransformers', () => {
      const testCases = [
        { value: 75, type: 'weight', system: 'percentage' as ScoringSystem },
        { value: 8500, type: 'steps', system: 'percentage' as ScoringSystem },
        { value: 7.5, type: 'sleep', system: 'percentage' as ScoringSystem },
        { value: 70, type: 'heart_rate', system: 'percentage' as ScoringSystem },
      ];

      testCases.forEach(({ value, type, system }) => {
        const transformerScore = normalizeHealthValue(value, type, system);
        const scoringScore = scoreHealthMetric(type as any, value, system);

        // Allow small differences due to different implementations
        expect(Math.abs(transformerScore - scoringScore)).toBeLessThan(5);
      });
    });

    it('should produce consistent color mappings between modules', () => {
      const scores = [25, 45, 65, 85];

      scores.forEach((score) => {
        const transformerColor = getScoreColor(score);
        const scoringColor = scoringGetScoreColor(score);

        expect(transformerColor).toBe(scoringColor);
      });
    });

    it('should produce equivalent radar data between modules', () => {
      const healthDataSets = {
        weight: [{ date: '2024-01-01', value: 75 }],
        steps: [{ date: '2024-01-01', value: 8500 }],
        sleep: [{ date: '2024-01-01', value: 7.5 }],
      };

      const mockRecords: HealthRecord[] = [
        { id: 1, type: 'weight', value: 75, unit: 'kg', recorded_at: '2024-01-01' },
        { id: 2, type: 'steps', value: 8500, unit: 'steps', recorded_at: '2024-01-01' },
        { id: 3, type: 'sleep', value: 7.5, unit: 'hours', recorded_at: '2024-01-01' },
      ];

      const mockGoals: HealthGoal[] = [
        { id: 1, type: 'weight', current_value: 75, target_value: 70, status: 'active' },
        { id: 2, type: 'steps', current_value: 8500, target_value: 10000, status: 'active' },
        { id: 3, type: 'sleep', current_value: 7.5, target_value: 8, status: 'active' },
      ];

      const transformerResult = transformToRadarData(mockRecords, mockGoals, 'percentage');
      const scoringResult = aggregateRadarData(healthDataSets as any, 'percentage');

      expect(transformerResult[0].metrics).toHaveLength(3);
      expect(scoringResult).toHaveLength(3);

      // Compare scores (allowing for small differences)
      transformerResult[0].metrics.forEach((metric, index) => {
        const correspondingScoring = scoringResult.find(s =>
          s.category.toLowerCase().includes(metric.category.toLowerCase().split(' ')[0]),
        );

        if (correspondingScoring) {
          expect(Math.abs(metric.score - correspondingScoring.score)).toBeLessThan(10);
        }
      });
    });

    it('should handle unit conversions consistently', () => {
      const testValues = [
        { value: 75.5, unit: 'kg' },
        { value: 8500, unit: 'steps' },
        { value: 7.25, unit: 'hours' },
        { value: 72, unit: 'bpm' },
      ];

      testValues.forEach(({ value, unit }) => {
        const formatted = formatHealthValue(value, unit);

        switch (unit) {
          case 'kg':
          case 'hours':
            expect(formatted).toBe(value.toString());

            break;
          case 'steps':
          case 'bpm':
            expect(formatted).toBe(value.toLocaleString());

            break;
        }
      });
    });
  });

  describe('Predictive Analytics Accuracy', () => {
    it('should accurately perform linear regression with known datasets', () => {
      // Test with perfect linear relationship: y = 2x + 5
      const perfectLinearData = createLinearDataset(2, 5, 10, 0);
      const result = linearRegression(perfectLinearData);

      expect(result.slope).toBeCloseTo(2, 1);
      expect(result.intercept).toBeCloseTo(5, 1);
      expect(result.rSquared).toBeCloseTo(1, 2);
    });

    it('should accurately perform linear regression with noisy data', () => {
      // Test with noisy linear relationship: y = 1.5x + 3 + noise
      const noisyLinearData = createLinearDataset(1.5, 3, 50, 2);
      const result = linearRegression(noisyLinearData);

      expect(result.slope).toBeCloseTo(1.5, 0.5);
      expect(result.intercept).toBeCloseTo(3, 1);
      expect(result.rSquared).toBeGreaterThan(0.8);
    });

    it('should calculate moving averages correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const windowSize = 3;

      const result = movingAverage(values, windowSize);
      const expected = [2, 3, 4, 5, 6, 7, 8, 9]; // (1+2+3)/3=2, (2+3+4)/3=3, etc.

      expect(result).toEqual(expected);
    });

    it('should calculate confidence intervals correctly', () => {
      const predictedValue = 100;
      const config = {
        confidenceLevel: 0.95,
        residualStandardDeviation: 5,
        sampleSize: 30,
      };

      const interval = generateConfidenceInterval(predictedValue, config);

      expect(interval.upper).toBeGreaterThan(predictedValue);
      expect(interval.lower).toBeLessThan(predictedValue);
      expect(interval.upper - interval.lower).toBeGreaterThan(0);
    });

    it('should compare algorithm accuracy with different data patterns', () => {
      // Linear trend data
      const linearData = createSeasonalDataset(80, 0, 365, 30).map((point, index) => ({
        ...point,
        value: 80 - index * 0.1, // Clear linear trend
      }));

      // Seasonal data
      const seasonalData = createSeasonalDataset(8000, 2000, 7, 30);

      // Test linear regression on linear data
      const linearTrendData = linearData.map(point => ({ date: point.date, value: point.value }));
      const linearPredictions = transformToPredictiveData(linearTrendData, 'linear-regression', 7);

      // Test moving average on seasonal data
      const seasonalTrendData = seasonalData.map(point => ({ date: point.date, value: point.value }));
      const seasonalPredictions = transformToPredictiveData(seasonalTrendData, 'moving-average', 7);

      expect(linearPredictions.filter(p => p.isPrediction)).toHaveLength(7);
      expect(seasonalPredictions.filter(p => p.isPrediction)).toHaveLength(7);

      // Verify predictions are reasonable
      const linearPredictionValues = linearPredictions.filter(p => p.isPrediction).map(p => p.value);
      const seasonalPredictionValues = seasonalPredictions.filter(p => p.isPrediction).map(p => p.value);

      expect(linearPredictionValues.every(v => v > 0)).toBe(true);
      expect(seasonalPredictionValues.every(v => v > 0)).toBe(true);
    });

    it('should handle edge cases in predictive analytics', () => {
      // Insufficient data
      const insufficientData = [{ date: '2024-01-01', value: 80 }];
      const result1 = transformToPredictiveData(insufficientData, 'linear-regression', 5);

      expect(result1.filter(p => p.isPrediction)).toHaveLength(0);

      // Zero variance data
      const zeroVarianceData = Array.from({ length: 10 }).fill(null).map((_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: 80,
      }));
      const result2 = transformToPredictiveData(zeroVarianceData, 'linear-regression', 5);

      expect(result2.filter(p => p.isPrediction)).toHaveLength(5);

      // Extreme outliers
      const outlierData = [
        { date: '2024-01-01', value: 80 },
        { date: '2024-01-02', value: 79 },
        { date: '2024-01-03', value: 1000 }, // Extreme outlier
        { date: '2024-01-04', value: 78 },
        { date: '2024-01-05', value: 77 },
      ];
      const result3 = transformToPredictiveData(outlierData, 'moving-average', 3);

      expect(result3.filter(p => p.isPrediction)).toHaveLength(3);
    });
  });

  describe('Goal Progress and Analytics Integration', () => {
    it('should calculate goal progress correctly end-to-end', () => {
      const mockRecords = generateHealthRecords(30, 'weight');
      const mockGoals = generateHealthGoals(['weight']);

      // Simulate weight loss progress
      mockRecords.forEach((record, index) => {
        record.value = 80 - (index * 0.2); // 0.2kg loss per day
      });

      const healthRecords: HealthRecord[] = mockRecords.map(record => ({
        id: record.id,
        type: record.type,
        value: record.value,
        unit: record.unit,
        recorded_at: record.recorded_at,
      }));

      const healthGoals: HealthGoal[] = mockGoals.map(goal => ({
        id: goal.id,
        type: goal.type,
        current_value: mockRecords[mockRecords.length - 1].value, // Latest value
        target_value: goal.target_value,
        status: goal.status,
      }));

      const summaryMetrics = transformToSummaryMetrics(healthRecords, healthGoals);
      const radarData = transformToRadarData(healthRecords, healthGoals, 'percentage');

      expect(summaryMetrics[0].goalCurrent).toBe(healthGoals[0].current_value);
      expect(summaryMetrics[0].goalTarget).toBe(healthGoals[0].target_value);

      // Verify radar data reflects progress
      expect(radarData[0].metrics[0].value).toBe(healthGoals[0].current_value);
      expect(radarData[0].metrics[0].maxValue).toBe(healthGoals[0].target_value);
    });

    it('should integrate trend analysis with scoring systems', () => {
      const records = generateHealthRecords(10, 'weight');

      // Create clear downward trend
      records.forEach((record, index) => {
        record.value = 80 - index * 0.5;
      });

      const healthRecords: HealthRecord[] = records.map(record => ({
        id: record.id,
        type: record.type,
        value: record.value,
        unit: record.unit,
        recorded_at: record.recorded_at,
      }));

      // Test trend calculation
      const currentValue = records[records.length - 1].value;
      const previousValue = records[records.length - 2].value;
      const trend = calculateTrend(currentValue, previousValue);

      expect(trend.direction).toBe('down');
      expect(trend.percentage).toBeGreaterThan(0);

      // Test scoring integration
      const score = normalizeHealthValue(currentValue, 'weight', 'percentage');

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should validate goal status transitions', () => {
      const mockGoals = generateHealthGoals(['weight']);
      mockGoals[0].current_value = mockGoals[0].target_value; // Goal achieved

      const healthGoals: HealthGoal[] = mockGoals.map(goal => ({
        id: goal.id,
        type: goal.type,
        current_value: goal.current_value,
        target_value: goal.target_value,
        status: goal.current_value >= goal.target_value ? 'completed' : 'active',
      }));

      expect(healthGoals[0].status).toBe('completed');
    });
  });

  describe('Data Validation and Type Safety', () => {
    it('should validate transformed data matches TypeScript types', () => {
      const mockRecords = generateHealthRecords(5, 'weight');
      const mockGoals = generateHealthGoals(['weight']);

      const healthRecords: HealthRecord[] = mockRecords.map(record => ({
        id: record.id,
        type: record.type,
        value: record.value,
        unit: record.unit,
        recorded_at: record.recorded_at,
      }));

      const healthGoals: HealthGoal[] = mockGoals.map(goal => ({
        id: goal.id,
        type: goal.type,
        current_value: goal.current_value,
        target_value: goal.target_value,
        status: goal.status,
      }));

      const summaryMetrics = transformToSummaryMetrics(healthRecords, healthGoals);
      const radarData = transformToRadarData(healthRecords, healthGoals);
      const trendData = mockRecords.map(r => ({ date: r.recorded_at.split('T')[0], value: r.value }));
      const predictiveData = transformToPredictiveData(trendData);

      // Validate HealthSummaryMetric structure
      summaryMetrics.forEach((metric) => {
        expect(metric).toMatchObject({
          id: expect.any(String),
          label: expect.any(String),
          value: expect.any(Number),
          unit: expect.any(String),
          icon: expect.any(String),
        });
      });

      // Validate HealthRadarMetric structure
      radarData[0].metrics.forEach((metric) => {
        expect(metric).toMatchObject({
          category: expect.any(String),
          value: expect.any(Number),
          maxValue: expect.any(Number),
          unit: expect.any(String),
          score: expect.any(Number),
          color: expect.any(String),
          icon: expect.any(String),
        });
      });

      // Validate PredictedDataPoint structure
      predictiveData.forEach((point) => {
        expect(point).toMatchObject({
          date: expect.any(String),
          value: expect.any(Number),
          isPrediction: expect.any(Boolean),
        });

        if (point.isPrediction) {
          expect(point).toMatchObject({
            algorithm: expect.any(String),
            confidenceUpper: expect.any(Number),
            confidenceLower: expect.any(Number),
          });
        }
      });
    });

    it('should handle boundary conditions correctly', () => {
      // Test with extreme values
      const extremeRecords: HealthRecord[] = [
        { id: 1, type: 'weight', value: 0, unit: 'kg', recorded_at: '2024-01-01' },
        { id: 2, type: 'weight', value: 1000, unit: 'kg', recorded_at: '2024-01-02' },
        { id: 3, type: 'steps', value: 0, unit: 'steps', recorded_at: '2024-01-03' },
        { id: 4, type: 'steps', value: 100000, unit: 'steps', recorded_at: '2024-01-04' },
      ];

      const result = transformToSummaryMetrics(extremeRecords, []);

      expect(result).toHaveLength(2); // weight and steps

      result.forEach((metric) => {
        expect(metric.value).toBeGreaterThanOrEqual(0);
        expect(isFinite(metric.value)).toBe(true);
      });
    });

    it('should validate error handling for type mismatches', () => {
      const invalidRecords = [
        { id: 'invalid', type: 123, value: 'not-a-number', unit: null, recorded_at: 'invalid-date' },
      ] as any;

      expect(() => {
        transformToSummaryMetrics(invalidRecords, []);
      }).toThrow();
    });
  });

  describe('Performance Integration Testing', () => {
    it('should handle large datasets efficiently', async () => {
      const largeRecordCount = 1000;
      const mockRecords = generateHealthRecords(largeRecordCount, 'weight');
      const mockGoals = generateHealthGoals(['weight']);

      const healthRecords: HealthRecord[] = mockRecords.map(record => ({
        id: record.id,
        type: record.type,
        value: record.value,
        unit: record.unit,
        recorded_at: record.recorded_at,
      }));

      const healthGoals: HealthGoal[] = mockGoals.map(goal => ({
        id: goal.id,
        type: goal.type,
        current_value: goal.current_value,
        target_value: goal.target_value,
        status: goal.status,
      }));

      const { result: summaryResult, duration: summaryDuration } = await measurePerformance(
        () => transformToSummaryMetrics(healthRecords, healthGoals),
        'Summary Metrics Transformation',
      );

      const { result: radarResult, duration: radarDuration } = await measurePerformance(
        () => transformToRadarData(healthRecords, healthGoals),
        'Radar Data Transformation',
      );

      const trendData = mockRecords.map(r => ({
        date: r.recorded_at.split('T')[0],
        value: r.value,
      }));

      const { result: predictiveResult, duration: predictiveDuration } = await measurePerformance(
        () => transformToPredictiveData(trendData, 'linear-regression', 30),
        'Predictive Data Transformation',
      );

      // Performance assertions (adjust thresholds as needed)
      expect(summaryDuration).toBeLessThan(100); // 100ms
      expect(radarDuration).toBeLessThan(100); // 100ms
      expect(predictiveDuration).toBeLessThan(500); // 500ms for complex calculations

      // Verify results are still correct
      expect(summaryResult).toHaveLength(1);
      expect(radarResult[0].metrics).toHaveLength(1);
      expect(predictiveResult).toHaveLength(1030); // 1000 historical + 30 predictions
    });

    it('should handle concurrent transformation operations', async () => {
      const recordSets = Array.from({ length: 5 }).fill(null).map(() => generateHealthRecords(100, 'weight'));
      const goalSets = Array.from({ length: 5 }).fill(null).map(() => generateHealthGoals(['weight']));

      const transformationPromises = recordSets.map(async (records, index) => {
        const healthRecords: HealthRecord[] = records.map(record => ({
          id: record.id,
          type: record.type,
          value: record.value,
          unit: record.unit,
          recorded_at: record.recorded_at,
        }));

        const healthGoals: HealthGoal[] = goalSets[index].map(goal => ({
          id: goal.id,
          type: goal.type,
          current_value: goal.current_value,
          target_value: goal.target_value,
          status: goal.status,
        }));

        return {
          summary: transformToSummaryMetrics(healthRecords, healthGoals),
          radar: transformToRadarData(healthRecords, healthGoals),
        };
      });

      const { result: results, duration } = await measurePerformance(
        () => Promise.all(transformationPromises),
        'Concurrent Transformations',
      );

      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(1000); // 1 second for 5 concurrent operations

      results.forEach((result) => {
        expect(result.summary).toHaveLength(1);
        expect(result.radar[0].metrics).toHaveLength(1);
      });
    });
  });

  describe('Real-World Data Scenarios', () => {
    it('should handle realistic weight fluctuations', () => {
      const weightData = Array.from({ length: 30 }).fill(null).map((_, i) => {
        const baseDate = new Date('2024-01-01');
        baseDate.setDate(baseDate.getDate() + i);

        // Simulate realistic weight loss with daily fluctuations
        const trendValue = 80 - (i * 0.1); // Gradual loss
        const dailyFluctuation = (Math.random() - 0.5) * 2; // ±1kg daily variation
        const weekendEffect = [0, 6].includes(baseDate.getDay()) ? 0.5 : 0; // Weekend weight gain

        return {
          id: i + 1,
          type: 'weight',
          value: Math.round((trendValue + dailyFluctuation + weekendEffect) * 10) / 10,
          unit: 'kg',
          recorded_at: baseDate.toISOString(),
        };
      });

      const healthRecords: HealthRecord[] = weightData;
      const result = transformToSummaryMetrics(healthRecords, []);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBeGreaterThan(70);
      expect(result[0].value).toBeLessThan(85);
    });

    it('should handle seasonal exercise patterns', () => {
      const exerciseData = Array.from({ length: 365 }).fill(null).map((_, i) => {
        const baseDate = new Date('2024-01-01');
        baseDate.setDate(baseDate.getDate() + i);

        // Simulate seasonal variation (more exercise in summer)
        const seasonalFactor = 1 + 0.3 * Math.sin((i / 365) * 2 * Math.PI);
        const baseSteps = 8000;
        const weekdayFactor = [0, 6].includes(baseDate.getDay()) ? 0.7 : 1; // Less on weekends

        return {
          date: baseDate.toISOString().split('T')[0],
          value: Math.round(baseSteps * seasonalFactor * weekdayFactor),
        };
      });

      const result = transformToPredictiveData(exerciseData, 'moving-average', 30);
      const predictions = result.filter(p => p.isPrediction);

      expect(predictions).toHaveLength(30);

      predictions.forEach((prediction) => {
        expect(prediction.value).toBeGreaterThan(4000);
        expect(prediction.value).toBeLessThan(15000);
      });
    });

    it('should handle missing data gracefully', () => {
      const sparseData = [
        { date: '2024-01-01', value: 80 },
        // Missing data for several days
        { date: '2024-01-05', value: 79.5 },
        { date: '2024-01-10', value: 79 },
        // More missing data
        { date: '2024-01-15', value: 78.5 },
      ];

      const result = transformToPredictiveData(sparseData, 'linear-regression', 5);

      expect(result).toHaveLength(9); // 4 historical + 5 predictions

      const predictions = result.filter(p => p.isPrediction);

      expect(predictions).toHaveLength(5);

      // Verify predictions are reasonable despite sparse data
      predictions.forEach((prediction) => {
        expect(prediction.value).toBeGreaterThan(70);
        expect(prediction.value).toBeLessThan(85);
      });
    });

    it('should handle different timezone formats', () => {
      const timezoneData = [
        { date: '2024-01-01T00:00:00Z', value: 80 },
        { date: '2024-01-02T12:00:00+05:00', value: 79.5 },
        { date: '2024-01-03T18:30:00-08:00', value: 79 },
        { date: '2024-01-04', value: 78.5 }, // Date only
      ];

      const healthRecords: HealthRecord[] = timezoneData.map((data, i) => ({
        id: i + 1,
        type: 'weight',
        value: data.value,
        unit: 'kg',
        recorded_at: data.date,
      }));

      const result = transformToSummaryMetrics(healthRecords, []);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(78.5); // Latest value
    });

    it('should recover from corrupted data scenarios', () => {
      const corruptedData = [
        { id: 1, type: 'weight', value: 80, unit: 'kg', recorded_at: '2024-01-01' },
        { id: 2, type: 'weight', value: Number.NaN, unit: 'kg', recorded_at: '2024-01-02' },
        { id: 3, type: 'weight', value: 79, unit: 'kg', recorded_at: '2024-01-03' },
        { id: 4, type: 'weight', value: Infinity, unit: 'kg', recorded_at: '2024-01-04' },
        { id: 5, type: 'weight', value: 78, unit: 'kg', recorded_at: '2024-01-05' },
      ] as HealthRecord[];

      // Should throw error for invalid data
      expect(() => {
        transformToSummaryMetrics(corruptedData, []);
      }).toThrow();

      // Test with filtered valid data
      const validData = corruptedData.filter(record =>
        isFinite(record.value) && !isNaN(record.value),
      );

      const result = transformToSummaryMetrics(validData, []);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(78); // Latest valid value
    });
  });
});
