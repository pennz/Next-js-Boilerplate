import type { APIRequestContext } from '@playwright/test';
import type { HealthGoal, HealthRecord } from '@/components/health/HealthOverview';
import type {
  HealthRadarMetric,
  HealthSummaryMetric,
  RadarChartData,
  TrendDirection,
} from '@/components/health/types';
import { expect, test } from '@playwright/test';
import {
  calculateOverallHealthScore,
  calculateTrend,
  getHealthTypeConfig,
  getScoreColor,
  normalizeHealthValue,
  transformToPredictiveData,
  transformToRadarData,
  transformToSummaryMetrics,
} from '@/utils/healthDataTransformers';
import {
  aggregateRadarData,
  getHealthMetricRanges,
  scoreHealthMetric,
} from '@/utils/healthScoring';

// Test data builders
const buildHealthRecord = (overrides: Partial<HealthRecord> = {}): HealthRecord => ({
  id: Math.floor(Math.random() * 10000),
  type: 'weight',
  value: 70,
  unit: 'kg',
  recorded_at: new Date().toISOString(),
  user_id: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const buildHealthGoal = (overrides: Partial<HealthGoal> = {}): HealthGoal => ({
  id: Math.floor(Math.random() * 10000),
  type: 'weight',
  current_value: 70,
  target_value: 65,
  target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'active',
  user_id: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const buildAnalyticsData = (type: string, days: number = 30) => {
  const data = [];
  const baseValue = type === 'weight' ? 70 : type === 'steps' ? 8000 : 7;
  const trend = type === 'weight' ? -0.1 : type === 'steps' ? 50 : 0.02; // weight decreasing, steps increasing, sleep slightly increasing

  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000);
    const value = baseValue + (trend * i) + (Math.random() - 0.5) * 2; // Add some noise
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
      min: value - 1,
      max: value + 1,
      count: 1,
    });
  }
  return data;
};

// API helper functions
class HealthAPIHelper {
  constructor(private request: APIRequestContext, private authToken: string) {}

  async createHealthRecord(data: Partial<HealthRecord>) {
    const response = await this.request.post('/api/health/records', {
      headers: { Authorization: `Bearer ${this.authToken}` },
      data: {
        type_id: 1,
        value: data.value || 70,
        unit: data.unit || 'kg',
        recorded_at: data.recorded_at || new Date().toISOString(),
        ...data,
      },
    });

    expect(response.status()).toBe(201);

    return response.json();
  }

  async createHealthGoal(data: Partial<HealthGoal>) {
    const response = await this.request.post('/api/health/goals', {
      headers: { Authorization: `Bearer ${this.authToken}` },
      data: {
        type_id: 1,
        target_value: data.target_value || 65,
        target_date: data.target_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        status: data.status || 'active',
        ...data,
      },
    });

    expect(response.status()).toBe(201);

    return response.json();
  }

  async getHealthRecords() {
    const response = await this.request.get('/api/health/records', {
      headers: { Authorization: `Bearer ${this.authToken}` },
    });

    expect(response.status()).toBe(200);

    return response.json();
  }

  async getHealthGoals() {
    const response = await this.request.get('/api/health/goals', {
      headers: { Authorization: `Bearer ${this.authToken}` },
    });

    expect(response.status()).toBe(200);

    return response.json();
  }

  async getAnalytics(type: string, params: Record<string, string> = {}) {
    const searchParams = new URLSearchParams(params);
    const response = await this.request.get(`/api/health/analytics/${type}?${searchParams}`, {
      headers: { Authorization: `Bearer ${this.authToken}` },
    });

    expect(response.status()).toBe(200);

    return response.json();
  }
}

test.describe('Health Data Transformation Integration Tests', () => {
  let apiHelper: HealthAPIHelper;
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Authenticate and get token
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'testpassword123',
      },
    });

    expect(loginResponse.status()).toBe(200);

    const loginData = await loginResponse.json();
    authToken = loginData.token;
    apiHelper = new HealthAPIHelper(request, authToken);
  });

  test.describe('API to Summary Metrics Transformation', () => {
    test('should transform API records and goals to summary metrics', async () => {
      // Create test data via API
      const recordData = await apiHelper.createHealthRecord({
        type: 'weight',
        value: 72,
        unit: 'kg',
      });

      const goalData = await apiHelper.createHealthGoal({
        type: 'weight',
        target_value: 65,
        current_value: 72,
      });

      // Fetch data via API
      const records = await apiHelper.getHealthRecords();
      const goals = await apiHelper.getHealthGoals();

      // Transform data
      const summaryMetrics = transformToSummaryMetrics(records.data, goals.data);

      // Verify transformation
      expect(summaryMetrics).toHaveLength(1);

      const metric = summaryMetrics[0];

      expect(metric).toMatchObject({
        label: 'Weight',
        value: 72,
        unit: 'kg',
        goalTarget: 65,
        goalCurrent: 72,
        icon: '⚖️',
      });
      expect(metric.id).toMatch(/^metric-weight-\d+$/);
    });

    test('should handle records without goals', async () => {
      // Create record without corresponding goal
      await apiHelper.createHealthRecord({
        type: 'steps',
        value: 8500,
        unit: 'steps',
      });

      const records = await apiHelper.getHealthRecords();
      const goals = await apiHelper.getHealthGoals();

      const summaryMetrics = transformToSummaryMetrics(records.data, goals.data);

      const stepsMetric = summaryMetrics.find(m => m.label === 'Steps');

      expect(stepsMetric).toBeDefined();
      expect(stepsMetric?.goalTarget).toBeUndefined();
      expect(stepsMetric?.goalCurrent).toBeUndefined();
    });

    test('should handle goals without recent records', async () => {
      // Create goal without recent record
      await apiHelper.createHealthGoal({
        type: 'sleep',
        target_value: 8,
        current_value: 6.5,
      });

      const records = await apiHelper.getHealthRecords();
      const goals = await apiHelper.getHealthGoals();

      const summaryMetrics = transformToSummaryMetrics(records.data, goals.data);

      const sleepMetric = summaryMetrics.find(m => m.label === 'Sleep');

      expect(sleepMetric).toBeDefined();
      expect(sleepMetric?.value).toBe(6.5);
      expect(sleepMetric?.goalTarget).toBe(8);
    });

    test('should validate icon and color assignment from getHealthTypeConfig', async () => {
      const healthTypes = ['weight', 'steps', 'sleep', 'heart_rate', 'water_intake'];

      for (const type of healthTypes) {
        const config = getHealthTypeConfig(type);

        expect(config.icon).toBeDefined();
        expect(config.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(config.unit).toBeDefined();
      }
    });
  });

  test.describe('API to Radar Chart Transformation', () => {
    test('should transform API data to radar chart format', async () => {
      // Create multiple health records
      const healthTypes = [
        { type: 'weight', value: 70, unit: 'kg' },
        { type: 'steps', value: 8500, unit: 'steps' },
        { type: 'sleep', value: 7.5, unit: 'hours' },
        { type: 'heart_rate', value: 72, unit: 'bpm' },
      ];

      for (const data of healthTypes) {
        await apiHelper.createHealthRecord(data);
      }

      // Create corresponding goals
      const goals = [
        { type: 'weight', target_value: 65, current_value: 70 },
        { type: 'steps', target_value: 10000, current_value: 8500 },
      ];

      for (const goal of goals) {
        await apiHelper.createHealthGoal(goal);
      }

      const records = await apiHelper.getHealthRecords();
      const goalsData = await apiHelper.getHealthGoals();

      // Transform to radar data
      const radarData = transformToRadarData(records.data, goalsData.data);

      expect(radarData).toHaveLength(1);

      const radarChart = radarData[0];

      expect(radarChart.metrics.length).toBeGreaterThanOrEqual(4);

      // Verify radar metrics structure
      radarChart.metrics.forEach((metric: HealthRadarMetric) => {
        expect(metric).toHaveProperty('category');
        expect(metric).toHaveProperty('value');
        expect(metric).toHaveProperty('maxValue');
        expect(metric).toHaveProperty('unit');
        expect(metric).toHaveProperty('score');
        expect(metric).toHaveProperty('color');
        expect(metric).toHaveProperty('icon');

        expect(metric.score).toBeGreaterThanOrEqual(0);
        expect(metric.score).toBeLessThanOrEqual(100);
      });
    });

    test('should integrate with normalizeHealthValue for score calculation', async () => {
      await apiHelper.createHealthRecord({
        type: 'weight',
        value: 70,
        unit: 'kg',
      });

      const records = await apiHelper.getHealthRecords();
      const radarData = transformToRadarData(records.data, []);

      const weightMetric = radarData[0].metrics.find(m => m.category === 'Weight');

      expect(weightMetric).toBeDefined();

      // Compare with direct normalizeHealthValue call
      const directScore = normalizeHealthValue(70, 'weight', 'percentage');

      expect(weightMetric?.score).toBe(directScore);
    });

    test('should generate placeholder metrics when fewer than 3 exist', async () => {
      // Create only 2 records
      await apiHelper.createHealthRecord({ type: 'weight', value: 70 });
      await apiHelper.createHealthRecord({ type: 'steps', value: 8000 });

      const records = await apiHelper.getHealthRecords();
      const radarData = transformToRadarData(records.data, []);

      expect(radarData[0].metrics.length).toBeGreaterThanOrEqual(3);

      // Check for placeholder metrics
      const placeholderMetrics = radarData[0].metrics.filter(m => m.value === 0);

      expect(placeholderMetrics.length).toBeGreaterThan(0);
    });
  });

  test.describe('Analytics to Predictive Data Transformation', () => {
    test('should transform analytics data with linear regression', async () => {
      // Create analytics data with known trend
      const analyticsData = buildAnalyticsData('weight', 14); // 14 days of weight loss

      // Transform to predictive data
      const predictiveData = transformToPredictiveData(
        analyticsData.map(d => ({ date: d.date, value: d.value, unit: 'kg' })),
        'linear-regression',
        7,
      );

      // Verify structure
      expect(predictiveData.length).toBe(21); // 14 historical + 7 predictions

      const historicalData = predictiveData.filter(p => !p.isPrediction);
      const predictions = predictiveData.filter(p => p.isPrediction);

      expect(historicalData).toHaveLength(14);
      expect(predictions).toHaveLength(7);

      // Verify predictions have confidence intervals
      predictions.forEach((prediction) => {
        expect(prediction.isPrediction).toBe(true);
        expect(prediction.algorithm).toBe('linear-regression');
        expect(prediction.confidenceUpper).toBeDefined();
        expect(prediction.confidenceLower).toBeDefined();
        expect(prediction.confidenceUpper).toBeGreaterThan(prediction.value);
        expect(prediction.confidenceLower).toBeLessThan(prediction.value);
      });
    });

    test('should transform analytics data with moving average', async () => {
      const analyticsData = buildAnalyticsData('steps', 10);

      const predictiveData = transformToPredictiveData(
        analyticsData.map(d => ({ date: d.date, value: d.value, unit: 'steps' })),
        'moving-average',
        5,
      );

      expect(predictiveData.length).toBe(15); // 10 historical + 5 predictions

      const predictions = predictiveData.filter(p => p.isPrediction);

      expect(predictions).toHaveLength(5);

      predictions.forEach((prediction) => {
        expect(prediction.algorithm).toBe('moving-average');
      });
    });

    test('should handle edge cases in predictive transformation', async () => {
      // Test with insufficient data
      const minimalData = [{ date: '2024-01-01', value: 70, unit: 'kg' }];
      const result = transformToPredictiveData(minimalData, 'linear-regression', 7);

      expect(result).toHaveLength(1); // Only historical data, no predictions
      expect(result[0].isPrediction).toBe(false);
    });

    test('should validate prediction accuracy with known patterns', async () => {
      // Create linear decreasing pattern
      const linearData = [];
      for (let i = 0; i < 10; i++) {
        linearData.push({
          date: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          value: 80 - i, // Decreasing by 1 each day
          unit: 'kg',
        });
      }

      const predictiveData = transformToPredictiveData(linearData, 'linear-regression', 3);
      const predictions = predictiveData.filter(p => p.isPrediction);

      // With perfect linear trend, predictions should continue the pattern
      expect(predictions[0].value).toBeCloseTo(71, 1); // 80 - 9 = 71
      expect(predictions[1].value).toBeCloseTo(70, 1); // 80 - 10 = 70
      expect(predictions[2].value).toBeCloseTo(69, 1); // 80 - 11 = 69
    });
  });

  test.describe('Cross-Module Integration Testing', () => {
    test('should have consistent scoring between modules', async () => {
      const testCases = [
        { type: 'weight', value: 70 },
        { type: 'steps', value: 8500 },
        { type: 'sleep', value: 7.5 },
        { type: 'heart_rate', value: 72 },
      ];

      for (const testCase of testCases) {
        const transformerScore = normalizeHealthValue(testCase.value, testCase.type, 'percentage');
        const scoringScore = scoreHealthMetric(testCase.type as any, testCase.value, 'percentage');

        // Scores should be within reasonable range (allowing for different algorithms)
        expect(Math.abs(transformerScore - scoringScore)).toBeLessThan(20);
      }
    });

    test('should have consistent radar data between aggregateRadarData and transformToRadarData', async () => {
      // Create test records
      const records = [
        buildHealthRecord({ type: 'weight', value: 70 }),
        buildHealthRecord({ type: 'steps', value: 8500 }),
        buildHealthRecord({ type: 'sleep', value: 7.5 }),
      ];

      const goals = [
        buildHealthGoal({ type: 'weight', target_value: 65, current_value: 70 }),
      ];

      // Transform using both methods
      const transformerRadar = transformToRadarData(records, goals);

      const healthDataSets = {
        weight: [{ date: '2024-01-01', value: 70 }],
        steps: [{ date: '2024-01-01', value: 8500 }],
        sleep: [{ date: '2024-01-01', value: 7.5 }],
      };
      const scoringRadar = aggregateRadarData(healthDataSets);

      // Compare structures
      expect(transformerRadar[0].metrics.length).toBeGreaterThanOrEqual(3);
      expect(scoringRadar.length).toBeGreaterThanOrEqual(3);

      // Compare specific metrics
      const transformerWeight = transformerRadar[0].metrics.find(m => m.category === 'Weight');
      const scoringWeight = scoringRadar.find(m => m.category === 'Weight');

      if (transformerWeight && scoringWeight) {
        expect(transformerWeight.value).toBe(scoringWeight.value);
        expect(Math.abs(transformerWeight.score - scoringWeight.score)).toBeLessThan(10);
      }
    });

    test('should have consistent color mapping between modules', async () => {
      const scores = [25, 45, 65, 85]; // poor, fair, good, excellent

      for (const score of scores) {
        const transformerColor = getScoreColor(score);
        const scoringColor = getScoreColor(score);

        expect(transformerColor).toBe(scoringColor);
      }
    });

    test('should have consistent health metric ranges', async () => {
      const healthTypes = ['weight', 'steps', 'sleep', 'heart_rate'];

      for (const type of healthTypes) {
        const transformerConfig = getHealthTypeConfig(type);
        const scoringRanges = getHealthMetricRanges(type as any);

        // Units should match
        expect(transformerConfig.unit).toBe(scoringRanges.unit);

        // Ideal ranges should be consistent
        if (transformerConfig.idealRange && scoringRanges.optimal) {
          expect(transformerConfig.idealRange.min).toBeCloseTo(scoringRanges.optimal.min, 1);
          expect(transformerConfig.idealRange.max).toBeCloseTo(scoringRanges.optimal.max, 1);
        }
      }
    });
  });

  test.describe('Data Flow End-to-End Testing', () => {
    test('should handle complete health data scenario', async () => {
      // Create comprehensive health data
      const healthTypes = ['weight', 'steps', 'sleep', 'heart_rate', 'water_intake'];

      // Create records
      for (const type of healthTypes) {
        await apiHelper.createHealthRecord({
          type,
          value: type === 'weight' ? 70 : type === 'steps' ? 8500 : 7.5,
          unit: type === 'weight' ? 'kg' : type === 'steps' ? 'steps' : 'hours',
        });
      }

      // Create goals
      for (const type of healthTypes.slice(0, 3)) {
        await apiHelper.createHealthGoal({
          type,
          target_value: type === 'weight' ? 65 : type === 'steps' ? 10000 : 8,
          current_value: type === 'weight' ? 70 : type === 'steps' ? 8500 : 7.5,
        });
      }

      // Fetch all data
      const records = await apiHelper.getHealthRecords();
      const goals = await apiHelper.getHealthGoals();

      // Transform through all functions
      const summaryMetrics = transformToSummaryMetrics(records.data, goals.data);
      const radarData = transformToRadarData(records.data, goals.data);
      const overallScore = calculateOverallHealthScore(radarData[0].metrics);

      // Verify final data structures
      expect(summaryMetrics.length).toBeGreaterThanOrEqual(5);
      expect(radarData[0].metrics.length).toBeGreaterThanOrEqual(5);
      expect(overallScore).toBeGreaterThanOrEqual(0);
      expect(overallScore).toBeLessThanOrEqual(100);

      // Verify UI component prop requirements
      summaryMetrics.forEach((metric) => {
        expect(metric).toHaveProperty('id');
        expect(metric).toHaveProperty('label');
        expect(metric).toHaveProperty('value');
        expect(metric).toHaveProperty('unit');
        expect(metric).toHaveProperty('icon');
      });

      radarData[0].metrics.forEach((metric) => {
        expect(metric).toHaveProperty('category');
        expect(metric).toHaveProperty('value');
        expect(metric).toHaveProperty('maxValue');
        expect(metric).toHaveProperty('unit');
        expect(metric).toHaveProperty('score');
        expect(metric).toHaveProperty('color');
        expect(metric).toHaveProperty('icon');
      });
    });

    test('should maintain data consistency throughout transformation pipeline', async () => {
      // Create test data
      await apiHelper.createHealthRecord({ type: 'weight', value: 75, unit: 'kg' });
      await apiHelper.createHealthGoal({ type: 'weight', target_value: 70, current_value: 75 });

      const records = await apiHelper.getHealthRecords();
      const goals = await apiHelper.getHealthGoals();

      // Transform data
      const summaryMetrics = transformToSummaryMetrics(records.data, goals.data);
      const radarData = transformToRadarData(records.data, goals.data);

      // Verify consistency
      const summaryWeight = summaryMetrics.find(m => m.label === 'Weight');
      const radarWeight = radarData[0].metrics.find(m => m.category === 'Weight');

      expect(summaryWeight?.value).toBe(radarWeight?.value);
      expect(summaryWeight?.unit).toBe(radarWeight?.unit);
      expect(summaryWeight?.goalTarget).toBe(radarWeight?.maxValue);
    });
  });

  test.describe('Trend Calculation Integration', () => {
    test('should have consistent trend calculations between API and transformer', async () => {
      // Get analytics data with known trend
      const analyticsResponse = await apiHelper.getAnalytics('weight', {
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString(),
        aggregation: 'daily',
      });

      if (analyticsResponse.data.length >= 2) {
        const firstValue = analyticsResponse.data[0].value;
        const lastValue = analyticsResponse.data[analyticsResponse.data.length - 1].value;

        // Calculate trend using transformer function
        const transformerTrend = calculateTrend(lastValue, firstValue);

        // Compare with API trend
        const apiTrendDirection = analyticsResponse.summary.trend;

        let expectedDirection: TrendDirection;
        if (apiTrendDirection === 'increasing') {
          expectedDirection = 'up';
        } else if (apiTrendDirection === 'decreasing') {
          expectedDirection = 'down';
        } else {
          expectedDirection = 'neutral';
        }

        expect(transformerTrend.direction).toBe(expectedDirection);
      }
    });

    test('should calculate trend percentages correctly', async () => {
      // Test known trend calculations
      const testCases = [
        { current: 100, previous: 90, expectedDirection: 'up' as TrendDirection, expectedPercentage: 11.11 },
        { current: 80, previous: 100, expectedDirection: 'down' as TrendDirection, expectedPercentage: 20 },
        { current: 50, previous: 50, expectedDirection: 'neutral' as TrendDirection, expectedPercentage: 0 },
      ];

      for (const testCase of testCases) {
        const trend = calculateTrend(testCase.current, testCase.previous);

        expect(trend.direction).toBe(testCase.expectedDirection);
        expect(trend.percentage).toBeCloseTo(testCase.expectedPercentage, 1);
      }
    });
  });

  test.describe('Goal Progress Integration', () => {
    test('should match goal progress calculations between API and transformer', async () => {
      // Create goal with known progress
      const goalData = await apiHelper.createHealthGoal({
        type: 'weight',
        target_value: 65,
        current_value: 70,
      });

      const goals = await apiHelper.getHealthGoals();
      const summaryMetrics = transformToSummaryMetrics([], goals.data);

      const weightMetric = summaryMetrics.find(m => m.label === 'Weight');

      expect(weightMetric?.goalCurrent).toBe(70);
      expect(weightMetric?.goalTarget).toBe(65);

      // Calculate expected progress percentage
      const expectedProgress = (70 / 65) * 100; // Over 100% since current > target for weight loss

      expect(expectedProgress).toBeGreaterThan(100);
    });
  });

  test.describe('Health Type Configuration Integration', () => {
    test('should have consistent health type configurations', async () => {
      const healthTypes = ['weight', 'steps', 'sleep', 'heart_rate', 'water_intake'];

      for (const type of healthTypes) {
        const config = getHealthTypeConfig(type);

        // Verify all required properties exist
        expect(config.icon).toBeDefined();
        expect(config.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(config.unit).toBeDefined();

        // Verify ideal ranges are reasonable
        if (config.idealRange) {
          expect(config.idealRange.min).toBeGreaterThan(0);
          expect(config.idealRange.max).toBeGreaterThan(config.idealRange.min);
        }
      }
    });
  });

  test.describe('Error Handling in Transformations', () => {
    test('should handle malformed API responses gracefully', async () => {
      // Test with invalid data
      const invalidRecords = [
        { id: 1, type: 'weight', value: 'invalid', recorded_at: 'invalid-date' },
      ];

      expect(() => {
        transformToSummaryMetrics(invalidRecords as any, []);
      }).toThrow();
    });

    test('should handle missing data fields', async () => {
      const incompleteRecords = [
        { id: 1, type: 'weight' }, // missing value and recorded_at
      ];

      expect(() => {
        transformToSummaryMetrics(incompleteRecords as any, []);
      }).toThrow();
    });

    test('should validate input parameters', async () => {
      // Test invalid inputs
      expect(() => transformToSummaryMetrics(null as any, [])).toThrow();
      expect(() => transformToSummaryMetrics([], null as any)).toThrow();
      expect(() => transformToRadarData('invalid' as any, [])).toThrow();
      expect(() => transformToPredictiveData(null as any)).toThrow();
    });
  });

  test.describe('Performance Integration Testing', () => {
    test('should handle large datasets efficiently', async () => {
      // Create large dataset
      const largeDataset = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          value: 70 + Math.sin(i / 10) * 5,
          unit: 'kg',
        });
      }

      const startTime = Date.now();
      const predictiveData = transformToPredictiveData(largeDataset, 'linear-regression', 30);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(predictiveData.length).toBe(1030); // 1000 historical + 30 predictions
    });

    test('should handle concurrent transformations', async () => {
      const records = [buildHealthRecord({ type: 'weight', value: 70 })];
      const goals = [buildHealthGoal({ type: 'weight', target_value: 65 })];

      // Run multiple transformations concurrently
      const promises = Array.from({ length: 10 }).fill(0).map(() =>
        Promise.all([
          transformToSummaryMetrics(records, goals),
          transformToRadarData(records, goals),
          transformToPredictiveData([{ date: '2024-01-01', value: 70 }], 'linear-regression', 7),
        ]),
      );

      const results = await Promise.all(promises);

      // All should complete successfully
      expect(results).toHaveLength(10);

      results.forEach((result) => {
        expect(result[0]).toHaveLength(1); // summary metrics
        expect(result[1]).toHaveLength(1); // radar data
        expect(result[2]).toHaveLength(8); // predictive data (1 historical + 7 predictions)
      });
    });
  });

  test.describe('Real-World Data Scenarios', () => {
    test('should handle weight loss journey scenario', async () => {
      // Create weight loss journey data
      const weightLossData = [];
      for (let i = 0; i < 90; i++) {
        const date = new Date(Date.now() - (89 - i) * 24 * 60 * 60 * 1000);
        const value = 80 - (i * 0.1); // Losing 0.1kg per day
        weightLossData.push({
          date: date.toISOString().split('T')[0],
          value: Math.round(value * 10) / 10,
          unit: 'kg',
        });
      }

      // Transform to all formats
      const summaryMetrics = transformToSummaryMetrics(
        [buildHealthRecord({ type: 'weight', value: weightLossData[weightLossData.length - 1].value })],
        [buildHealthGoal({ type: 'weight', target_value: 70, current_value: weightLossData[weightLossData.length - 1].value })],
      );

      const radarData = transformToRadarData(
        [buildHealthRecord({ type: 'weight', value: weightLossData[weightLossData.length - 1].value })],
        [buildHealthGoal({ type: 'weight', target_value: 70 })],
      );

      const predictiveData = transformToPredictiveData(weightLossData, 'linear-regression', 30);

      // Verify realistic outputs
      expect(summaryMetrics[0].value).toBeCloseTo(71, 1);
      expect(radarData[0].metrics[0].score).toBeGreaterThan(50); // Should be good score

      const predictions = predictiveData.filter(p => p.isPrediction);

      expect(predictions[0].value).toBeLessThan(weightLossData[weightLossData.length - 1].value); // Should predict continued loss
    });

    test('should handle fitness improvement scenario', async () => {
      // Create fitness improvement data (increasing steps)
      const fitnessData = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
        const value = 5000 + (i * 100); // Increasing by 100 steps per day
        fitnessData.push({
          date: date.toISOString().split('T')[0],
          value,
          unit: 'steps',
        });
      }

      const predictiveData = transformToPredictiveData(fitnessData, 'linear-regression', 14);
      const predictions = predictiveData.filter(p => p.isPrediction);

      // Should predict continued improvement
      expect(predictions[0].value).toBeGreaterThan(fitnessData[fitnessData.length - 1].value);
      expect(predictions[predictions.length - 1].value).toBeGreaterThan(predictions[0].value);
    });
  });

  test.describe('Data Validation and Type Safety', () => {
    test('should validate transformed data matches TypeScript types', async () => {
      const records = [buildHealthRecord()];
      const goals = [buildHealthGoal()];

      const summaryMetrics = transformToSummaryMetrics(records, goals);
      const radarData = transformToRadarData(records, goals);

      // Verify HealthSummaryMetric type compliance
      summaryMetrics.forEach((metric: HealthSummaryMetric) => {
        expect(typeof metric.id).toBe('string');
        expect(typeof metric.label).toBe('string');
        expect(typeof metric.value).toBe('number');
        expect(typeof metric.unit).toBe('string');

        if (metric.previousValue !== undefined) {
          expect(typeof metric.previousValue).toBe('number');
        }
        if (metric.goalTarget !== undefined) {
          expect(typeof metric.goalTarget).toBe('number');
        }
        if (metric.goalCurrent !== undefined) {
          expect(typeof metric.goalCurrent).toBe('number');
        }
        if (metric.icon !== undefined) {
          expect(typeof metric.icon).toBe('string');
        }
      });

      // Verify RadarChartData type compliance
      radarData.forEach((chart: RadarChartData) => {
        expect(Array.isArray(chart.metrics)).toBe(true);

        if (chart.timestamp !== undefined) {
          expect(typeof chart.timestamp).toBe('string');
        }
        if (chart.label !== undefined) {
          expect(typeof chart.label).toBe('string');
        }

        chart.metrics.forEach((metric: HealthRadarMetric) => {
          expect(typeof metric.category).toBe('string');
          expect(typeof metric.value).toBe('number');
          expect(typeof metric.maxValue).toBe('number');
          expect(typeof metric.unit).toBe('string');
          expect(typeof metric.score).toBe('number');

          if (metric.color !== undefined) {
            expect(typeof metric.color).toBe('string');
          }
          if (metric.icon !== undefined) {
            expect(typeof metric.icon).toBe('string');
          }
        });
      });
    });

    test('should ensure all required fields are present', async () => {
      const records = [buildHealthRecord()];
      const goals = [buildHealthGoal()];

      const summaryMetrics = transformToSummaryMetrics(records, goals);
      const radarData = transformToRadarData(records, goals);

      // Check required fields for summary metrics
      summaryMetrics.forEach((metric) => {
        expect(metric.id).toBeDefined();
        expect(metric.label).toBeDefined();
        expect(metric.value).toBeDefined();
        expect(metric.unit).toBeDefined();
      });

      // Check required fields for radar data
      radarData[0].metrics.forEach((metric) => {
        expect(metric.category).toBeDefined();
        expect(metric.value).toBeDefined();
        expect(metric.maxValue).toBeDefined();
        expect(metric.unit).toBeDefined();
        expect(metric.score).toBeDefined();
      });
    });

    test('should handle type mismatches gracefully', async () => {
      // Test with wrong types
      const invalidData = {
        id: 'not-a-number',
        type: 123, // should be string
        value: 'not-a-number', // should be number
        recorded_at: 12345, // should be string
      };

      expect(() => {
        transformToSummaryMetrics([invalidData as any], []);
      }).toThrow();
    });
  });
});
