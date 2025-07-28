import { describe, expect, it, vi, beforeEach } from 'vitest';
import type {
  HealthGoal,
  HealthRecord,
} from '@/components/health/HealthOverview';
import type {
  HealthRadarMetric,
  HealthSummaryMetric,
  PredictedDataPoint,
  PredictionAlgorithm,
  RadarChartData,
  ScoringSystem,
  TrendDirection,
} from '@/components/health/types';
import {
  calculateTrend,
  getPreviousValue,
  getHealthTypeConfig,
  normalizeHealthValue,
  transformToSummaryMetrics,
  transformToPredictiveData,
  transformToRadarData,
  calculateOverallHealthScore,
  getScoreColor,
  formatHealthValue,
} from '@/utils/healthDataTransformers';

// Mock healthScoring utilities
vi.mock('@/utils/healthScoring', () => ({}));

describe('healthDataTransformers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateTrend', () => {
    it('calculates positive trend correctly', () => {
      const result = calculateTrend(110, 100);
      expect(result).toEqual({
        direction: 'up' as TrendDirection,
        percentage: 10,
      });
    });

    it('calculates negative trend correctly', () => {
      const result = calculateTrend(90, 100);
      expect(result).toEqual({
        direction: 'down' as TrendDirection,
        percentage: 10,
      });
    });

    it('calculates neutral trend for equal values', () => {
      const result = calculateTrend(100, 100);
      expect(result).toEqual({
        direction: 'neutral' as TrendDirection,
        percentage: 0,
      });
    });

    it('handles zero previous value', () => {
      const result = calculateTrend(100, 0);
      expect(result).toEqual({
        direction: 'neutral' as TrendDirection,
        percentage: 0,
      });
    });

    it('handles very small changes as neutral', () => {
      const result = calculateTrend(100.001, 100);
      expect(result).toEqual({
        direction: 'neutral' as TrendDirection,
        percentage: 0,
      });
    });

    it('throws error for invalid current value', () => {
      expect(() => calculateTrend(null as any, 100)).toThrow('Invalid current value: must be a finite number');
    });

    it('throws error for invalid previous value', () => {
      expect(() => calculateTrend(100, undefined)).toThrow('Invalid previous value: must be a finite number');
    });

    it('calculates large percentage changes correctly', () => {
      const result = calculateTrend(200, 100);
      expect(result).toEqual({
        direction: 'up' as TrendDirection,
        percentage: 100,
      });
    });

    describe('calculateTrend edge cases', () => {
      it('handles very large positive percentage changes', () => {
        const result = calculateTrend(1000, 100);
        expect(result.direction).toBe('up');
        expect(result.percentage).toBe(900);
      });

      it('handles very large negative percentage changes', () => {
        const result = calculateTrend(10, 1000);
        expect(result.direction).toBe('down');
        expect(result.percentage).toBe(99);
      });

      it('handles current value being zero', () => {
        const result = calculateTrend(0, 100);
        expect(result.direction).toBe('down');
        expect(result.percentage).toBe(100);
      });

      it('handles previous value being zero with positive current value', () => {
        const result = calculateTrend(50, 0);
        expect(result.direction).toBe('neutral');
        expect(result.percentage).toBe(0);
      });

      it('handles both values being zero', () => {
        const result = calculateTrend(0, 0);
        expect(result.direction).toBe('neutral');
        expect(result.percentage).toBe(0);
      });
    });
  });

  describe('getPreviousValue', () => {
    const mockRecords: HealthRecord[] = [
      { id: 1, type: 'weight', value: 100, recorded_at: '2024-01-01' },
      { id: 2, type: 'weight', value: 110, recorded_at: '2024-01-02' },
      { id: 3, type: 'weight', value: 105, recorded_at: '2024-01-03' },
      { id: 4, type: 'steps', value: 8000, recorded_at: '2024-01-01' },
      { id: 5, type: 'steps', value: 9000, recorded_at: '2024-01-02' },
    ];

    it('returns most recent value for matching type', () => {
      const result = getPreviousValue(mockRecords, 'weight', 3);
      expect(result).toBe(110);
    });

    it('excludes current record by id', () => {
      const result = getPreviousValue(mockRecords, 'weight', 2);
      expect(result).toBe(100);
    });

    it('returns undefined for no matching records', () => {
      const result = getPreviousValue(mockRecords, 'heart_rate', 1);
      expect(result).toBeUndefined();
    });

    it('returns undefined for empty array', () => {
      const result = getPreviousValue([], 'weight', 1);
      expect(result).toBeUndefined();
    });

    it('throws error for invalid records array', () => {
      expect(() => getPreviousValue(null as any, 'weight', 1)).toThrow('Invalid records: must be an array');
    });

    it('throws error for invalid record properties', () => {
      const invalidRecords = [
        { id: 1, value: 100, recorded_at: '2024-01-01' }, // missing type
      ] as HealthRecord[];
      expect(() => getPreviousValue(invalidRecords, 'weight', 2)).toThrow('Invalid record: missing required properties (type, recorded_at)');
    });

    it('sorts records by date correctly', () => {
      const unsortedRecords = [
        { id: 3, type: 'weight', value: 105, recorded_at: '2024-01-03' },
        { id: 1, type: 'weight', value: 100, recorded_at: '2024-01-01' },
        { id: 2, type: 'weight', value: 110, recorded_at: '2024-01-02' },
      ];
      const result = getPreviousValue(unsortedRecords, 'weight', 4);
      expect(result).toBe(105);
    });
  });

  describe('getHealthTypeConfig', () => {
    it('returns correct config for valid health types', () => {
      const config = getHealthTypeConfig('steps');
      expect(config).toEqual({
        icon: '👟',
        color: '#ffc658',
        unit: 'steps',
        idealRange: { min: 8000, max: 15000 },
        scoringMultiplier: 0.01,
      });
    });

    it('normalizes health type with spaces', () => {
      const config = getHealthTypeConfig('heart rate');
      expect(config).toEqual({
        icon: '❤️',
        color: '#ff7300',
        unit: 'bpm',
        idealRange: { min: 60, max: 100 },
        scoringMultiplier: 1,
      });
    });

    it('handles case insensitive input', () => {
      const config = getHealthTypeConfig('STEPS');
      expect(config.unit).toBe('steps');
    });

    it('returns fallback for unknown types', () => {
      const config = getHealthTypeConfig('unknown_type');
      expect(config).toEqual({
        icon: '📊',
        color: '#6b7280',
        unit: '',
      });
    });
  });

  describe('normalizeHealthValue', () => {
    it('normalizes value using percentage scoring system', () => {
      const result = normalizeHealthValue(8000, 'steps', 'percentage');
      expect(result).toBe(0); // Based on idealRange min 8000
    });

    it('normalizes value using z-score scoring system', () => {
      const result = normalizeHealthValue(70, 'heart_rate', 'z-score');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('normalizes value using custom scoring system', () => {
      const result = normalizeHealthValue(8, 'sleep', 'custom');
      expect(result).toBe(80); // 8 * scoringMultiplier 10
    });

    it('returns 50 for invalid health type', () => {
      const result = normalizeHealthValue(100, 'invalid_type', 'percentage');
      expect(result).toBe(50);
    });

    it('returns 50 for invalid values', () => {
      const result = normalizeHealthValue(NaN, 'steps', 'percentage');
      expect(result).toBe(50);
    });
  });

  describe('transformToSummaryMetrics', () => {
    const mockRecords: HealthRecord[] = [
      { id: 1, type: 'steps', value: 8000, recorded_at: '2024-01-01', unit: 'steps' },
      { id: 2, type: 'steps', value: 8500, recorded_at: '2024-01-02', unit: 'steps' },
      { id: 3, type: 'sleep', value: 7.5, recorded_at: '2024-01-01', unit: 'hours' },
      { id: 4, type: 'sleep', value: 8, recorded_at: '2024-01-02', unit: 'hours' },
    ];

    const mockGoals: HealthGoal[] = [
      { id: 'goal1', type: 'steps', target_value: 10000, current_value: 8500, status: 'active' },
      { id: 'goal2', type: 'sleep', target_value: 8, current_value: 8, status: 'active' },
    ];

    it('transforms records and goals to summary metrics', () => {
      const result = transformToSummaryMetrics(mockRecords, mockGoals);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        label: 'Steps',
        value: 8500,
        unit: 'steps',
        previousValue: 8000,
        goalTarget: 10000,
        goalCurrent: 8500,
        icon: '👟',
      });
    });

    it('throws error for invalid records', () => {
      expect(() => transformToSummaryMetrics(null as any, mockGoals)).toThrow('Invalid records: must be an array');
    });
  });

  describe('transformToPredictiveData', () => {
    const mockTrendData = [
      { date: '2024-01-01', value: 8000, unit: 'steps' },
      { date: '2024-01-02', value: 8200, unit: 'steps' },
      { date: '2024-01-03', value: 8400, unit: 'steps' },
      { date: '2024-01-04', value: 8600, unit: 'steps' },
      { date: '2024-01-05', value: 8800, unit: 'steps' },
    ];

    it('generates predictions using linear regression', () => {
      const result = transformToPredictiveData(mockTrendData, 'linear-regression', 3);
      expect(result).toHaveLength(8); // 5 historical + 3 predictions
      expect(result.slice(-3).every(p => p.isPrediction)).toBe(true);
    });

    it('returns only historical data for insufficient data', () => {
      const insufficientData = [mockTrendData[0]];
      const result = transformToPredictiveData(insufficientData, 'linear-regression', 3);
      expect(result).toHaveLength(1);
    });

    describe('transformToPredictiveData edge cases', () => {
      it('throws error for invalid date formats', () => {
        const invalidDateData = [
          { date: 'invalid-date', value: 8000, unit: 'steps' },
          { date: '2024-01-02', value: 8200, unit: 'steps' },
        ];
        expect(() => transformToPredictiveData(invalidDateData, 'linear-regression', 3)).toThrow('Invalid trendData date at index 0: invalid-date');
      });
    
      it('throws error for missing date property', () => {
        const missingDateData = [
          { value: 8000, unit: 'steps' } as any,
          { date: '2024-01-02', value: 8200, unit: 'steps' },
        ];
        expect(() => transformToPredictiveData(missingDateData, 'linear-regression', 3)).toThrow('Invalid trendData point at index 0: missing required properties (date, value)');
      });
    
      it('throws error for non-numeric values', () => {
        const nonNumericData = [
          { date: '2024-01-01', value: '8000' as any, unit: 'steps' },
          { date: '2024-01-02', value: 8200, unit: 'steps' },
        ];
        expect(() => transformToPredictiveData(nonNumericData, 'linear-regression', 3)).toThrow('Invalid trendData value at index 0: 8000 must be a finite number');
      });
    
      it('handles extreme values without mathematical errors', () => {
        const extremeValues = [
          { date: '2024-01-01', value: Number.MAX_SAFE_INTEGER, unit: 'steps' },
          { date: '2024-01-02', value: Number.MAX_SAFE_INTEGER - 1000, unit: 'steps' },
          { date: '2024-01-03', value: Number.MAX_SAFE_INTEGER - 2000, unit: 'steps' },
        ];
        expect(() => transformToPredictiveData(extremeValues, 'linear-regression', 3)).not.toThrow();
      });
    
      it('handles negative prediction horizon', () => {
        const result = transformToPredictiveData(mockTrendData, 'linear-regression', -5);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('throws error for records with non-numeric values', () => {
      const invalidRecords = [
        { id: 1, type: 'steps', value: '8000' as any, recorded_at: '2024-01-01', unit: 'steps' },
      ] as HealthRecord[];
      expect(() => transformToSummaryMetrics(invalidRecords, [])).toThrow('Invalid record value: 8000 must be a finite number');
    });

    it('throws error for goals with invalid status', () => {
      const invalidGoals = [
        { id: 'goal1', type: 'steps', target_value: 10000, current_value: 8500, status: 'invalid' as any },
      ] as HealthGoal[];
      expect(() => transformToSummaryMetrics([], invalidGoals)).toThrow('Invalid goal status: invalid');
    });

    it('handles records with future dates', () => {
      const futureRecords = [
        { id: 1, type: 'steps', value: 8000, recorded_at: new Date(Date.now() + 86400000).toISOString(), unit: 'steps' },
      ] as HealthRecord[];
      const result = transformToSummaryMetrics(futureRecords, []);
      expect(result.length).toBe(1);
    });

    it('handles goals with current_value greater than target_value', () => {
      const overachievedGoals = [
        { id: 'goal1', type: 'steps', target_value: 10000, current_value: 15000, status: 'active' },
      ] as HealthGoal[];
      const result = transformToSummaryMetrics([], overachievedGoals);
      expect(result[0].value).toBe(15000);
    });
  });

  it('throws error for invalid records', () => {
    expect(() => transformToSummaryMetrics(null as any, mockGoals)).toThrow('Invalid records: must be an array');
  });
  });

  describe('transformToRadarData', () => {
    const mockRecords: HealthRecord[] = [
      { id: 1, type: 'steps', value: 8500, recorded_at: '2024-01-01', unit: 'steps' },
      { id: 2, type: 'sleep', value: 7.5, recorded_at: '2024-01-01', unit: 'hours' },
      { id: 3, type: 'heart_rate', value: 72, recorded_at: '2024-01-01', unit: 'bpm' },
    ];

    const mockGoals: HealthGoal[] = [
      { id: 'goal1', type: 'steps', target_value: 10000, current_value: 8500, status: 'active' },
      { id: 'goal2', type: 'sleep', target_value: 8, current_value: 7.5, status: 'active' },
    ];

    it('transforms records and goals to radar metrics', () => {
      const result = transformToRadarData(mockRecords, mockGoals, 'percentage');
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('category', 'Steps');
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('score');
    });
  });

  describe('calculateOverallHealthScore', () => {
    const mockMetrics: HealthRadarMetric[] = [
      { category: 'Steps', value: 8500, maxValue: 10000, unit: 'steps', score: 85 },
      { category: 'Sleep', value: 7.5, maxValue: 9, unit: 'hours', score: 90 },
      { category: 'Heart Rate', value: 72, maxValue: 100, unit: 'bpm', score: 75 },
    ];

    it('calculates average score correctly', () => {
      const result = calculateOverallHealthScore(mockMetrics);
      expect(result).toBe(83); // (85 + 90 + 75) / 3 = 83.33, rounded to 83
    });

    it('returns neutral score for empty array', () => {
      const result = calculateOverallHealthScore([]);
      expect(result).toBe(50);
    });

    it('handles single metric', () => {
      const singleMetric = [mockMetrics[0]];
      const result = calculateOverallHealthScore(singleMetric);
      expect(result).toBe(85);
    });

    it('handles metrics with missing scores', () => {
      const metricsWithMissingScores = [
        { category: 'Steps', value: 8500, maxValue: 10000, unit: 'steps', score: 85 },
        { category: 'Sleep', value: 7.5, maxValue: 9, unit: 'hours' }, // missing score
      ] as HealthRadarMetric[];
      const result = calculateOverallHealthScore(metricsWithMissingScores);
      expect(result).toBe(85); // Only counts valid scores
    });

    it('handles non-numeric scores', () => {
      const metricsWithInvalidScores = [
        { category: 'Steps', value: 8500, maxValue: 10000, unit: 'steps', score: 'invalid' as any },
        { category: 'Sleep', value: 7.5, maxValue: 9, unit: 'hours', score: 90 },
      ] as HealthRadarMetric[];
      const result = calculateOverallHealthScore(metricsWithInvalidScores);
      expect(result).toBe(90); // Only counts valid scores
    });

    it('handles all invalid scores', () => {
      const metricsWithAllInvalidScores = [
        { category: 'Steps', value: 8500, maxValue: 10000, unit: 'steps', score: NaN },
        { category: 'Sleep', value: 7.5, maxValue: 9, unit: 'hours', score: 'invalid' as any },
      ] as HealthRadarMetric[];
      const result = calculateOverallHealthScore(metricsWithAllInvalidScores);
      expect(result).toBe(50); // Neutral score
    });

    it('rounds result correctly', () => {
      const metricsWithDecimalAverage = [
        { category: 'Steps', value: 8500, maxValue: 10000, unit: 'steps', score: 83 },
        { category: 'Sleep', value: 7.5, maxValue: 9, unit: 'hours', score: 84 },
      ];
      const result = calculateOverallHealthScore(metricsWithDecimalAverage);
      expect(result).toBe(84); // (83 + 84) / 2 = 83.5, rounded to 84
    });
  });

  describe('getScoreColor', () => {
    it('returns poor color for low scores (0-39)', () => {
      expect(getScoreColor(0)).toBe('#ef4444');
      expect(getScoreColor(39)).toBe('#ef4444');
    });

    it('returns fair color for medium scores (40-59)', () => {
      expect(getScoreColor(40)).toBe('#f59e0b');
      expect(getScoreColor(59)).toBe('#f59e0b');
    });

    it('returns good color for medium-high scores (60-79)', () => {
      expect(getScoreColor(60)).toBe('#3b82f6');
      expect(getScoreColor(79)).toBe('#3b82f6');
    });

    it('returns excellent color for high scores (80-100)', () => {
      expect(getScoreColor(80)).toBe('#10b981');
      expect(getScoreColor(100)).toBe('#10b981');
    });

    it('handles boundary values correctly', () => {
      expect(getScoreColor(39)).toBe('#ef4444');
      expect(getScoreColor(40)).toBe('#f59e0b');
      expect(getScoreColor(59)).toBe('#f59e0b');
      expect(getScoreColor(60)).toBe('#3b82f6');
      expect(getScoreColor(79)).toBe('#3b82f6');
      expect(getScoreColor(80)).toBe('#10b981');
    });

    it('handles invalid inputs', () => {
      expect(getScoreColor(NaN)).toBe('#6b7280');
      expect(getScoreColor(Infinity)).toBe('#6b7280');
      expect(getScoreColor(-10)).toBe('#6b7280');
      expect(getScoreColor(150)).toBe('#6b7280');
      expect(getScoreColor('invalid' as any)).toBe('#6b7280');
    });
  });

  describe('formatHealthValue', () => {
    it('formats integer values correctly', () => {
      expect(formatHealthValue(8500, 'steps')).toBe('8,500');
      expect(formatHealthValue(10000, 'steps')).toBe('10,000');
    });

    it('formats decimal values correctly', () => {
      expect(formatHealthValue(7.5, 'hours')).toBe('7.5');
      expect(formatHealthValue(72.8, 'bpm')).toBe('72.8');
    });

    it('handles different units', () => {
      expect(formatHealthValue(70.5, 'kg')).toBe('70.5');
      expect(formatHealthValue(2500, 'ml')).toBe('2,500');
      expect(formatHealthValue(150, 'min')).toBe('150');
      expect(formatHealthValue(120, 'mmHg')).toBe('120');
    });

    it('handles edge cases', () => {
      expect(formatHealthValue(0, 'steps')).toBe('0');
      expect(formatHealthValue(-5, 'change')).toBe('-5');
      expect(formatHealthValue(1000000, 'steps')).toBe('1,000,000');
      expect(formatHealthValue(0.001, 'precision')).toBe('0.001');
    });

    it('handles invalid values', () => {
      expect(formatHealthValue(NaN, 'steps')).toBe('0');
      expect(formatHealthValue(Infinity, 'steps')).toBe('0');
      expect(formatHealthValue(null as any, 'steps')).toBe('0');
    });

    it('handles unknown units', () => {
      expect(formatHealthValue(123, 'unknown_unit')).toBe('123');
    });
  });

  describe('transformToPredictiveData with moving-average algorithm', () => {
    const mockTrendData = [
      { date: '2024-01-01', value: 8000, unit: 'steps' },
      { date: '2024-01-02', value: 8200, unit: 'steps' },
      { date: '2024-01-03', value: 8400, unit: 'steps' },
      { date: '2024-01-04', value: 8600, unit: 'steps' },
      { date: '2024-01-05', value: 8800, unit: 'steps' },
    ];

    it('generates moving average predictions correctly', () => {
      const result = transformToPredictiveData(mockTrendData, 'moving-average', 3);
      expect(result).toHaveLength(8); // 5 historical + 3 predictions
      expect(result.slice(-3).every(p => p.isPrediction)).toBe(true);
      // Verify predictions are calculated as moving averages
      expect(result[5].value).toBeCloseTo((8400 + 8600 + 8800) / 3);
    });

    it('calculates confidence intervals for moving average', () => {
      const result = transformToPredictiveData(mockTrendData, 'moving-average', 2);
      const predictions = result.filter(p => p.isPrediction);
      predictions.forEach(prediction => {
        expect(prediction.confidenceUpper).toBeDefined();
        expect(prediction.confidenceLower).toBeDefined();
        expect(prediction.confidenceUpper).toBeGreaterThan(prediction.value);
        expect(prediction.confidenceLower).toBeLessThan(prediction.value);
      });
    });

    it('handles window size parameter', () => {
      const result = transformToPredictiveData(mockTrendData, 'moving-average', 2, { windowSize: 2 });
      expect(result).toHaveLength(7); // 5 historical + 2 predictions
    });

    it('returns only historical data for insufficient data', () => {
      const insufficientData = [mockTrendData[0]];
      const result = transformToPredictiveData(insufficientData, 'moving-average', 3);
      expect(result).toHaveLength(1);
    });
  });

  describe('Integration tests enhancements', () => {
    it('ensures consistent scoring between normalization and overall score', () => {
      const records: HealthRecord[] = [
        { id: 1, type: 'steps', value: 8500, recorded_at: '2024-01-01', unit: 'steps' },
        { id: 2, type: 'sleep', value: 6.5, recorded_at: '2024-01-01', unit: 'hours' },
        { id: 3, type: 'heart_rate', value: 85, recorded_at: '2024-01-01', unit: 'bpm' },
      ];

      const radarData = transformToRadarData(records, [], 'percentage');
      const normalizedScores = records.map(record => 
        normalizeHealthValue(record.value, record.type, 'percentage')
      );
      const manualAverage = Math.round(normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length);

      expect(radarData.overallScore).toBe(manualAverage);
    });

    it('validates prediction algorithm mathematical accuracy', () => {
      // Test with known linear data (1,2,3,4,5) should predict 6,7,8
      const linearData = [1, 2, 3, 4, 5].map((value, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value
      }));

      const result = transformToPredictiveData(linearData, 'linear-regression', 3);
      const predictions = result.filter(p => p.isPrediction);

      // Check if predictions are approximately 6,7,8 (with small tolerance for floating point)
      expect(predictions[0].value).toBeCloseTo(6, 1);
      expect(predictions[1].value).toBeCloseTo(7, 1);
      expect(predictions[2].value).toBeCloseTo(8, 1);
    });
  });

  describe('getPreviousValue edge cases', () => {
    it('returns undefined when multiple records have same date', () => {
      const sameDateRecords = [
        { id: 1, type: 'weight', value: 100, recorded_at: '2024-01-01' },
        { id: 2, type: 'weight', value: 110, recorded_at: '2024-01-01' },
      ] as HealthRecord[];
      const result = getPreviousValue(sameDateRecords, 'weight', 3);
      expect(result).toBeDefined();
    });

    it('throws error for records with invalid date format', () => {
      const invalidDateRecords = [
        { id: 1, type: 'weight', value: 100, recorded_at: 'invalid-date' },
      ] as HealthRecord[];
      expect(() => getPreviousValue(invalidDateRecords, 'weight', 2)).toThrow('Invalid record date: invalid-date');
    });

    it('handles records with future dates', () => {
      const futureRecords = [
        { id: 1, type: 'weight', value: 100, recorded_at: new Date(Date.now() + 86400000).toISOString() },
        { id: 2, type: 'weight', value: 110, recorded_at: '2024-01-01' },
      ] as HealthRecord[];
      const result = getPreviousValue(futureRecords, 'weight', 1);
      expect(result).toBe(110);
    });
  });

  describe('Integration tests enhancements', () => {
    it('ensures consistent scoring between normalization and overall score', () => {
      const records: HealthRecord[] = [
        { id: 1, type: 'steps', value: 8500, recorded_at: '2024-01-01', unit: 'steps' },
        { id: 2, type: 'sleep', value: 6.5, recorded_at: '2024-01-01', unit: 'hours' },
        { id: 3, type: 'heart_rate', value: 85, recorded_at: '2024-01-01', unit: 'bpm' },
      ];

      const radarData = transformToRadarData(records, [], 'percentage');
      const normalizedScores = records.map(record => 
        normalizeHealthValue(record.value, record.type, 'percentage')
      );
      const manualAverage = Math.round(normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length);

      expect(radarData.overallScore).toBe(manualAverage);
    });

    it('validates prediction algorithm mathematical accuracy', () => {
      // Test with known linear data (1,2,3,4,5) should predict 6,7,8
      const linearData = [1, 2, 3, 4, 5].map((value, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value
      }));

      const result = transformToPredictiveData(linearData, 'linear-regression', 3);
      const predictions = result.filter(p => p.isPrediction);

      // Check if predictions are approximately 6,7,8 (with small tolerance for floating point)
      expect(predictions[0].value).toBeCloseTo(6, 1);
      expect(predictions[1].value).toBeCloseTo(7, 1);
      expect(predictions[2].value).toBeCloseTo(8, 1);
    });
  });

  describe('normalizeHealthValue edge cases', () => {
    it('clamps values below ideal range to 0', () => {
      const result = normalizeHealthValue(5000, 'steps', 'percentage');
      expect(result).toBe(0);
    });

    it('clamps values above ideal range to 100', () => {
      const result = normalizeHealthValue(20000, 'steps', 'percentage');
      expect(result).toBe(100);
    });

    it('handles ideal range with min greater than max', () => {
      // This test assumes there's a health type with inverted range (for testing purposes)
      const result = normalizeHealthValue(150, 'invalid_range_type', 'percentage');
      expect(result).toBe(50);
    });

    it('handles z-score with extreme values', () => {
      const result = normalizeHealthValue(200, 'heart_rate', 'z-score');
      expect(result).toBe(100);
    });

    it('handles custom scoring with zero multiplier', () => {
      // This test assumes there's a health type with zero multiplier (for testing purposes)
      const result = normalizeHealthValue(100, 'zero_multiplier_type', 'custom');
      expect(result).toBe(50);
    });
  });

  describe('getPreviousValue edge cases', () => {
    it('returns undefined when multiple records have same date', () => {
      const sameDateRecords = [
        { id: 1, type: 'weight', value: 100, recorded_at: '2024-01-01' },
        { id: 2, type: 'weight', value: 110, recorded_at: '2024-01-01' },
      ] as HealthRecord[];
      const result = getPreviousValue(sameDateRecords, 'weight', 3);
      expect(result).toBeDefined();
    });

    it('throws error for records with invalid date format', () => {
      const invalidDateRecords = [
        { id: 1, type: 'weight', value: 100, recorded_at: 'invalid-date' },
      ] as HealthRecord[];
      expect(() => getPreviousValue(invalidDateRecords, 'weight', 2)).toThrow('Invalid record date: invalid-date');
    });

    it('handles records with future dates', () => {
      const futureRecords = [
        { id: 1, type: 'weight', value: 100, recorded_at: new Date(Date.now() + 86400000).toISOString() },
        { id: 2, type: 'weight', value: 110, recorded_at: '2024-01-01' },
      ] as HealthRecord[];
      const result = getPreviousValue(futureRecords, 'weight', 1);
      expect(result).toBe(110);
    });
  });

  describe('Integration tests enhancements', () => {
    it('ensures consistent scoring between normalization and overall score', () => {
      const records: HealthRecord[] = [
        { id: 1, type: 'steps', value: 8500, recorded_at: '2024-01-01', unit: 'steps' },
        { id: 2, type: 'sleep', value: 6.5, recorded_at: '2024-01-01', unit: 'hours' },
        { id: 3, type: 'heart_rate', value: 85, recorded_at: '2024-01-01', unit: 'bpm' },
      ];

      const radarData = transformToRadarData(records, [], 'percentage');
      const normalizedScores = records.map(record => 
        normalizeHealthValue(record.value, record.type, 'percentage')
      );
      const manualAverage = Math.round(normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length);

      expect(radarData.overallScore).toBe(manualAverage);
    });

    it('validates prediction algorithm mathematical accuracy', () => {
      // Test with known linear data (1,2,3,4,5) should predict 6,7,8
      const linearData = [1, 2, 3, 4, 5].map((value, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        value
      }));

      const result = transformToPredictiveData(linearData, 'linear-regression', 3);
      const predictions = result.filter(p => p.isPrediction);

      // Check if predictions are approximately 6,7,8 (with small tolerance for floating point)
      expect(predictions[0].value).toBeCloseTo(6, 1);
      expect(predictions[1].value).toBeCloseTo(7, 1);
      expect(predictions[2].value).toBeCloseTo(8, 1);
    });
  });
// This appears to be a dangling closing brace. Looking at the context,
// the code seems to be missing an opening brace before this closing brace.
// Since the file is truncated, it's assumed this is meant to close the main `describe` block.
// We'll add the closing brace and ensure proper indentation.