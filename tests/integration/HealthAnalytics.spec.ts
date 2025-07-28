import type { APIRequestContext } from '@playwright/test';
import { expect, test } from '@playwright/test';

// Test data interfaces
type HealthRecord = {
  id?: number;
  type_id: number;
  value: number;
  unit: string;
  recorded_at: string;
  user_id?: string;
};

type HealthType = {
  id: number;
  slug: string;
  displayName: string;
  unit: string;
  typicalRangeLow?: number;
  typicalRangeHigh?: number;
};

type AnalyticsResponse = {
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

// Helper functions
class HealthAnalyticsTestHelper {
  constructor(private request: APIRequestContext, private authToken: string) {}

  async createHealthRecord(record: Omit<HealthRecord, 'id' | 'user_id'>): Promise<HealthRecord> {
    const response = await this.request.post('/api/health/records', {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
      data: record,
    });

    expect(response.status()).toBe(201);

    return await response.json();
  }

  async getAnalytics(
    type: string,
    params: {
      start_date?: string;
      end_date?: string;
      aggregation?: 'daily' | 'weekly' | 'monthly';
    } = {},
  ): Promise<AnalyticsResponse> {
    const searchParams = new URLSearchParams();
    if (params.start_date) {
      searchParams.set('start_date', params.start_date);
    }
    if (params.end_date) {
      searchParams.set('end_date', params.end_date);
    }
    if (params.aggregation) {
      searchParams.set('aggregation', params.aggregation);
    }

    const response = await this.request.get(`/api/health/analytics/${type}?${searchParams}`, {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });

    return await response.json();
  }

  async createTestDataset(
    typeId: number,
    unit: string,
    values: number[],
    startDate: Date,
    intervalDays: number = 1,
  ): Promise<HealthRecord[]> {
    const records: HealthRecord[] = [];

    for (let i = 0; i < values.length; i++) {
      const recordDate = new Date(startDate);
      recordDate.setDate(recordDate.getDate() + (i * intervalDays));

      const record = await this.createHealthRecord({
        type_id: typeId,
        value: values[i],
        unit,
        recorded_at: recordDate.toISOString(),
      });

      records.push(record);
    }

    return records;
  }

  async cleanupHealthRecords(): Promise<void> {
    // Delete all health records for the test user
    await this.request.delete('/api/health/records/cleanup', {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });
  }

  generateDateRange(daysBack: number): { start: string; end: string } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - daysBack);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  calculateExpectedTrend(values: number[]): { direction: 'increasing' | 'decreasing' | 'stable'; slope: number } {
    if (values.length < 2) {
      return { direction: 'stable', slope: 0 };
    }

    const n = values.length;
    const sumX = values.reduce((sum, _, index) => sum + index, 0);
    const sumY = values.reduce((sum, value) => sum + value, 0);
    const sumXY = values.reduce((sum, value, index) => sum + index * value, 0);
    const sumXX = values.reduce((sum, _, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return {
      direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      slope,
    };
  }

  calculateExpectedAggregation(values: number[]): {
    avg: number;
    min: number;
    max: number;
    count: number;
  } {
    if (values.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    const sum = values.reduce((acc, val) => acc + val, 0);
    return {
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }
}

// Test suite
test.describe('Health Analytics Integration Tests', () => {
  let helper: HealthAnalyticsTestHelper;
  let authToken: string;

  test.beforeEach(async ({ request }) => {
    // Setup authentication - this would depend on your auth system
    const authResponse = await request.post('/api/auth/test-login', {
      data: { testUser: true },
    });
    const authData = await authResponse.json();
    authToken = authData.token;

    helper = new HealthAnalyticsTestHelper(request, authToken);

    // Clean up any existing test data
    await helper.cleanupHealthRecords();
  });

  test.afterEach(async () => {
    // Clean up test data
    await helper.cleanupHealthRecords();
  });

  test.describe('Analytics Aggregation Tests', () => {
    test('should calculate daily aggregation correctly with known dataset', async () => {
      // Create 30 days of weight data with known values
      const weightValues = [
        80.0,
        79.8,
        79.5,
        79.3,
        79.0,
        78.8,
        78.5,
        78.3,
        78.0,
        77.8,
        77.5,
        77.3,
        77.0,
        76.8,
        76.5,
        76.3,
        76.0,
        75.8,
        75.5,
        75.3,
        75.0,
        74.8,
        74.5,
        74.3,
        74.0,
        73.8,
        73.5,
        73.3,
        73.0,
        72.8,
      ];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29); // 30 days ago

      await helper.createTestDataset(1, 'kg', weightValues, startDate);

      const analytics = await helper.getAnalytics('weight', {
        aggregation: 'daily',
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      });

      expect(analytics.aggregation).toBe('daily');
      expect(analytics.data).toHaveLength(30);

      // Verify each day's aggregation
      analytics.data.forEach((dayData, index) => {
        expect(dayData.value).toBeCloseTo(weightValues[index], 1);
        expect(dayData.min).toBe(weightValues[index]);
        expect(dayData.max).toBe(weightValues[index]);
        expect(dayData.count).toBe(1);
      });

      // Verify summary statistics
      expect(analytics.summary.totalRecords).toBe(30);
      expect(analytics.summary.currentValue).toBeCloseTo(72.8, 1);
    });

    test('should calculate weekly aggregation correctly', async () => {
      // Create 4 weeks of data with multiple records per week
      const dailyValues = Array.from({ length: 28 }, (_, i) => 80 - (i * 0.2));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 27);

      await helper.createTestDataset(1, 'kg', dailyValues, startDate);

      const analytics = await helper.getAnalytics('weight', {
        aggregation: 'weekly',
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      });

      expect(analytics.aggregation).toBe('weekly');
      expect(analytics.data.length).toBeGreaterThan(0);

      // Verify weekly aggregation calculations
      analytics.data.forEach((weekData) => {
        expect(weekData.count).toBeGreaterThan(0);
        expect(weekData.min).toBeLessThanOrEqual(weekData.value);
        expect(weekData.max).toBeGreaterThanOrEqual(weekData.value);
        expect(weekData.value).toBeGreaterThan(0);
      });
    });

    test('should calculate monthly aggregation correctly', async () => {
      // Create 3 months of data
      const monthlyData = [];
      for (let month = 0; month < 3; month++) {
        for (let day = 0; day < 30; day++) {
          monthlyData.push(80 - (month * 2) - (day * 0.05));
        }
      }

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);

      await helper.createTestDataset(1, 'kg', monthlyData, startDate);

      const analytics = await helper.getAnalytics('weight', {
        aggregation: 'monthly',
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      });

      expect(analytics.aggregation).toBe('monthly');
      expect(analytics.data.length).toBeGreaterThan(0);

      // Verify monthly aggregation
      analytics.data.forEach((monthData) => {
        expect(monthData.count).toBeGreaterThan(0);
        expect(monthData.value).toBeGreaterThan(0);
      });
    });
  });

  test.describe('Trend Calculation Accuracy', () => {
    test('should calculate linear increasing trend correctly', async () => {
      // Create linear weight loss: 80kg → 75kg over 10 days
      const weightValues = [80.0, 79.4, 78.8, 78.2, 77.6, 77.0, 76.4, 75.8, 75.2, 75.0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 9);

      await helper.createTestDataset(1, 'kg', weightValues, startDate);

      const analytics = await helper.getAnalytics('weight', {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      });

      const expectedTrend = helper.calculateExpectedTrend(weightValues);

      expect(analytics.summary.trend).toBe('decreasing'); // Weight loss = decreasing trend
      expect(analytics.summary.trendValue).toBeGreaterThan(0);

      // Verify trend calculation matches expected slope
      expect(Math.abs(analytics.summary.trendValue)).toBeCloseTo(Math.abs(expectedTrend.slope), 1);
    });

    test('should detect stable trend with minimal variance', async () => {
      // Create stable weight data with minimal fluctuation
      const stableValues = [75.0, 75.1, 74.9, 75.0, 75.1, 74.9, 75.0, 75.1, 74.9, 75.0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 9);

      await helper.createTestDataset(1, 'kg', stableValues, startDate);

      const analytics = await helper.getAnalytics('weight');

      expect(analytics.summary.trend).toBe('stable');
      expect(analytics.summary.trendValue).toBeLessThan(0.1);
    });

    test('should calculate increasing trend correctly', async () => {
      // Create increasing step count data
      const stepValues = [5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 9);

      await helper.createTestDataset(2, 'steps', stepValues, startDate);

      const analytics = await helper.getAnalytics('steps');

      expect(analytics.summary.trend).toBe('increasing');
      expect(analytics.summary.trendValue).toBeGreaterThan(0);
    });
  });

  test.describe('Date Range and Filtering', () => {
    test('should filter records by date range correctly', async () => {
      // Create 30 days of data
      const values = Array.from({ length: 30 }, (_, i) => 75 + i);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29);

      await helper.createTestDataset(1, 'kg', values, startDate);

      // Test 1 week range
      const weekRange = helper.generateDateRange(7);
      const weekAnalytics = await helper.getAnalytics('weight', {
        start_date: weekRange.start,
        end_date: weekRange.end,
      });

      expect(weekAnalytics.data.length).toBeLessThanOrEqual(8); // 7 days + potential partial day
      expect(weekAnalytics.summary.totalRecords).toBeLessThanOrEqual(8);

      // Test 1 month range
      const monthRange = helper.generateDateRange(30);
      const monthAnalytics = await helper.getAnalytics('weight', {
        start_date: monthRange.start,
        end_date: monthRange.end,
      });

      expect(monthAnalytics.summary.totalRecords).toBe(30);
    });

    test('should handle same start and end date', async () => {
      const today = new Date().toISOString().split('T')[0];

      await helper.createHealthRecord({
        type_id: 1,
        value: 75.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      const analytics = await helper.getAnalytics('weight', {
        start_date: today,
        end_date: today,
      });

      expect(analytics.summary.totalRecords).toBe(1);
      expect(analytics.data).toHaveLength(1);
    });

    test('should exclude records outside date range', async ({ request }) => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Create records on different days
      await helper.createHealthRecord({
        type_id: 1,
        value: 75.0,
        unit: 'kg',
        recorded_at: twoDaysAgo.toISOString(),
      });

      await helper.createHealthRecord({
        type_id: 1,
        value: 74.5,
        unit: 'kg',
        recorded_at: yesterday.toISOString(),
      });

      await helper.createHealthRecord({
        type_id: 1,
        value: 74.0,
        unit: 'kg',
        recorded_at: today.toISOString(),
      });

      // Query only yesterday's data
      const analytics = await helper.getAnalytics('weight', {
        start_date: yesterday.toISOString(),
        end_date: yesterday.toISOString(),
      });

      expect(analytics.summary.totalRecords).toBe(1);
      expect(analytics.data[0].value).toBeCloseTo(74.5, 1);
    });
  });

  test.describe('Caching Behavior', () => {
    test('should return cached results for identical requests', async () => {
      await helper.createHealthRecord({
        type_id: 1,
        value: 75.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      const params = {
        start_date: helper.generateDateRange(7).start,
        end_date: helper.generateDateRange(7).end,
        aggregation: 'daily' as const,
      };

      // First request
      const startTime1 = Date.now();
      const analytics1 = await helper.getAnalytics('weight', params);
      const duration1 = Date.now() - startTime1;

      // Second identical request (should be cached)
      const startTime2 = Date.now();
      const analytics2 = await helper.getAnalytics('weight', params);
      const duration2 = Date.now() - startTime2;

      // Verify results are identical
      expect(analytics1).toEqual(analytics2);

      // Second request should be faster (cached)
      expect(duration2).toBeLessThan(duration1);
    });

    test('should invalidate cache when new records are added', async () => {
      // Initial request
      const analytics1 = await helper.getAnalytics('weight');

      expect(analytics1.summary.totalRecords).toBe(0);

      // Add new record
      await helper.createHealthRecord({
        type_id: 1,
        value: 75.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      // Request again - should reflect new data
      const analytics2 = await helper.getAnalytics('weight');

      expect(analytics2.summary.totalRecords).toBe(1);
      expect(analytics2.summary.currentValue).toBeCloseTo(75.0, 1);
    });
  });

  test.describe('Statistical Accuracy', () => {
    test('should verify currentValue matches most recent record', async () => {
      const records = [
        { value: 80.0, daysAgo: 5 },
        { value: 79.0, daysAgo: 3 },
        { value: 78.0, daysAgo: 1 }, // Most recent
        { value: 77.0, daysAgo: 2 }, // Older than the 78.0 record
      ];

      for (const record of records) {
        const recordDate = new Date();
        recordDate.setDate(recordDate.getDate() - record.daysAgo);

        await helper.createHealthRecord({
          type_id: 1,
          value: record.value,
          unit: 'kg',
          recorded_at: recordDate.toISOString(),
        });
      }

      const analytics = await helper.getAnalytics('weight');

      // Should match the most recent record (78.0, 1 day ago)
      expect(analytics.summary.currentValue).toBeCloseTo(78.0, 1);
    });

    test('should count total records accurately', async () => {
      const recordCount = 15;
      const values = Array.from({ length: recordCount }, (_, i) => 75 + i);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (recordCount - 1));

      await helper.createTestDataset(1, 'kg', values, startDate);

      const analytics = await helper.getAnalytics('weight');

      expect(analytics.summary.totalRecords).toBe(recordCount);
    });

    test('should include typical range values from health type configuration', async () => {
      await helper.createHealthRecord({
        type_id: 1,
        value: 75.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      const analytics = await helper.getAnalytics('weight');

      // Verify typical range is included (values depend on health type config)
      expect(analytics.typicalRange).toBeDefined();
      expect(typeof analytics.typicalRange.low).toBe('number');
      expect(typeof analytics.typicalRange.high).toBe('number');
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle analytics for health types with no records', async ({ request }) => {
      const response = await request.get('/api/health/analytics/weight', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200);

      const analytics = await response.json();

      expect(analytics.summary.totalRecords).toBe(0);
      expect(analytics.summary.currentValue).toBeNull();
      expect(analytics.data).toHaveLength(0);
    });

    test('should return 404 for invalid health type IDs', async ({ request }) => {
      const response = await request.get('/api/health/analytics/invalid_type', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(404);

      const error = await response.json();

      expect(error.error).toBe('Invalid health type');
    });

    test('should return 422 for malformed date parameters', async ({ request }) => {
      const response = await request.get('/api/health/analytics/weight?start_date=invalid-date', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(422);

      const error = await response.json();

      expect(error.error).toBe('Invalid query parameters');
    });

    test('should validate response structure for UI consumption', async () => {
      await helper.createHealthRecord({
        type_id: 1,
        value: 75.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      const analytics = await helper.getAnalytics('weight');

      // Verify complete response structure
      expect(analytics).toHaveProperty('type');
      expect(analytics).toHaveProperty('displayName');
      expect(analytics).toHaveProperty('unit');
      expect(analytics).toHaveProperty('aggregation');
      expect(analytics).toHaveProperty('dateRange');
      expect(analytics).toHaveProperty('summary');
      expect(analytics).toHaveProperty('data');
      expect(analytics).toHaveProperty('typicalRange');

      // Verify summary structure
      expect(analytics.summary).toHaveProperty('currentValue');
      expect(analytics.summary).toHaveProperty('trend');
      expect(analytics.summary).toHaveProperty('trendValue');
      expect(analytics.summary).toHaveProperty('totalRecords');

      // Verify data array structure
      if (analytics.data.length > 0) {
        const dataPoint = analytics.data[0];

        expect(dataPoint).toHaveProperty('date');
        expect(dataPoint).toHaveProperty('value');
        expect(dataPoint).toHaveProperty('min');
        expect(dataPoint).toHaveProperty('max');
        expect(dataPoint).toHaveProperty('count');
      }
    });
  });

  test.describe('Performance Testing', () => {
    test('should handle large datasets efficiently', async () => {
      // Create 500+ records
      const largeDataset = Array.from({ length: 500 }, (_, i) => 75 + (i % 10));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 499);

      // Measure creation time
      const createStart = Date.now();
      await helper.createTestDataset(1, 'kg', largeDataset, startDate);
      const createDuration = Date.now() - createStart;

      console.log(`Created 500 records in ${createDuration}ms`);

      // Measure analytics query time
      const queryStart = Date.now();
      const analytics = await helper.getAnalytics('weight');
      const queryDuration = Date.now() - queryStart;

      console.log(`Analytics query completed in ${queryDuration}ms`);

      // Verify results
      expect(analytics.summary.totalRecords).toBe(500);
      expect(queryDuration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle multiple concurrent analytics requests', async () => {
      // Create test data
      const values = Array.from({ length: 50 }, (_, i) => 75 + i);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 49);

      await helper.createTestDataset(1, 'kg', values, startDate);

      // Make 5 concurrent requests
      const concurrentRequests = Array.from({ length: 5 }, () =>
        helper.getAnalytics('weight', { aggregation: 'daily' }));

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const duration = Date.now() - startTime;

      console.log(`5 concurrent requests completed in ${duration}ms`);

      // Verify all requests returned the same data
      results.forEach((result, index) => {
        expect(result.summary.totalRecords).toBe(50);

        if (index > 0) {
          expect(result).toEqual(results[0]);
        }
      });

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  test.describe('Integration with Health Types', () => {
    test('should work correctly for all supported health types', async () => {
      const healthTypes = [
        { slug: 'weight', unit: 'kg', value: 75.0 },
        { slug: 'steps', unit: 'steps', value: 8000 },
        { slug: 'heart_rate', unit: 'bpm', value: 72 },
        { slug: 'sleep', unit: 'hours', value: 8.0 },
        { slug: 'water_intake', unit: 'liters', value: 2.5 },
      ];

      for (const healthType of healthTypes) {
        await helper.createHealthRecord({
          type_id: 1, // This would need to map to actual type IDs
          value: healthType.value,
          unit: healthType.unit,
          recorded_at: new Date().toISOString(),
        });

        const analytics = await helper.getAnalytics(healthType.slug);

        expect(analytics.type).toBe(healthType.slug);
        expect(analytics.unit).toBe(healthType.unit);
        expect(analytics.summary.currentValue).toBeCloseTo(healthType.value, 1);
      }
    });

    test('should include proper unit information in responses', async () => {
      await helper.createHealthRecord({
        type_id: 1,
        value: 75.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      const analytics = await helper.getAnalytics('weight');

      expect(analytics.unit).toBe('kg');
      expect(analytics.displayName).toBeDefined();
      expect(analytics.displayName.length).toBeGreaterThan(0);
    });

    test('should populate ideal range information correctly', async () => {
      await helper.createHealthRecord({
        type_id: 1,
        value: 75.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      const analytics = await helper.getAnalytics('weight');

      expect(analytics.typicalRange).toBeDefined();

      // If typical range is configured, it should have valid values
      if (analytics.typicalRange.low !== null && analytics.typicalRange.high !== null) {
        expect(analytics.typicalRange.low).toBeLessThan(analytics.typicalRange.high);
        expect(analytics.typicalRange.low).toBeGreaterThan(0);
        expect(analytics.typicalRange.high).toBeGreaterThan(0);
      }
    });
  });
});
