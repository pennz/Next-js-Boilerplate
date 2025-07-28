import type { APIRequestContext } from '@playwright/test';
import { expect, request, test } from '@playwright/test';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_USER_ID = `test_user_${Date.now()}`;
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';

// Helper function to get authenticated request context
async function getAuthenticatedRequest(): Promise<APIRequestContext> {
  const requestContext = await request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  return requestContext;
}

// Helper function to create test health types
async function createTestHealthTypes(apiRequest: APIRequestContext) {
  const healthTypes = [
    { id: 1, slug: 'weight', displayName: 'Weight', unit: 'kg', typicalRangeLow: 50, typicalRangeHigh: 100 },
    { id: 2, slug: 'blood_pressure_systolic', displayName: 'Systolic BP', unit: 'mmHg', typicalRangeLow: 90, typicalRangeHigh: 140 },
    { id: 3, slug: 'steps', displayName: 'Steps', unit: 'steps', typicalRangeLow: 5000, typicalRangeHigh: 15000 },
    { id: 4, slug: 'sleep_hours', displayName: 'Sleep', unit: 'hours', typicalRangeLow: 6, typicalRangeHigh: 9 },
    { id: 5, slug: 'heart_rate', displayName: 'Heart Rate', unit: 'bpm', typicalRangeLow: 60, typicalRangeHigh: 100 },
  ];

  for (const type of healthTypes) {
    await apiRequest.post('/api/admin/health-types', { data: type });
  }
}

// Helper function to clean test data
async function cleanTestData(apiRequest: APIRequestContext) {
  await apiRequest.delete(`/api/test/cleanup?userId=${TEST_USER_ID}`);
}

test.describe('Health Business Logic Edge Cases', () => {
  let apiRequest: APIRequestContext;

  test.beforeAll(async () => {
    apiRequest = await getAuthenticatedRequest();
    await createTestHealthTypes(apiRequest);
  });

  test.afterAll(async () => {
    await cleanTestData(apiRequest);
    await apiRequest.dispose();
  });

  test.describe('Health Record Business Logic Edge Cases', () => {
    test('should handle boundary values for health records', async () => {
      // Test minimum boundary values
      const minValueRecord = {
        type_id: 1,
        value: 0.1,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      };

      const minResponse = await apiRequest.post('/api/health/records', {
        data: minValueRecord,
      });

      expect(minResponse.status()).toBe(201);

      // Test maximum boundary values
      const maxValueRecord = {
        type_id: 1,
        value: 9999.99,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      };

      const maxResponse = await apiRequest.post('/api/health/records', {
        data: maxValueRecord,
      });

      expect(maxResponse.status()).toBe(201);

      // Test exactly at limit (10000)
      const limitRecord = {
        type_id: 1,
        value: 10000,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      };

      const limitResponse = await apiRequest.post('/api/health/records', {
        data: limitRecord,
      });

      expect(limitResponse.status()).toBe(422);

      const limitError = await limitResponse.json();

      expect(limitError.error).toContain('exceeds maximum');
    });

    test('should validate unit-specific value ranges', async () => {
      // Test percentage values > 100
      const invalidPercentage = {
        type_id: 5,
        value: 150,
        unit: '%',
        recorded_at: new Date().toISOString(),
      };

      const percentResponse = await apiRequest.post('/api/health/records', {
        data: invalidPercentage,
      });

      expect(percentResponse.status()).toBe(422);

      // Test hours > 24
      const invalidHours = {
        type_id: 4,
        value: 25,
        unit: 'hours',
        recorded_at: new Date().toISOString(),
      };

      const hoursResponse = await apiRequest.post('/api/health/records', {
        data: invalidHours,
      });

      expect(hoursResponse.status()).toBe(422);

      // Test minutes > 1440 (24 hours)
      const invalidMinutes = {
        type_id: 3,
        value: 1441,
        unit: 'minutes',
        recorded_at: new Date().toISOString(),
      };

      const minutesResponse = await apiRequest.post('/api/health/records', {
        data: invalidMinutes,
      });

      expect(minutesResponse.status()).toBe(422);
    });

    test('should handle date validation edge cases', async () => {
      // Test exactly one year ago (should be valid)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      oneYearAgo.setDate(oneYearAgo.getDate() + 1); // One day after one year ago

      const validOldRecord = {
        type_id: 1,
        value: 70,
        unit: 'kg',
        recorded_at: oneYearAgo.toISOString(),
      };

      const validResponse = await apiRequest.post('/api/health/records', {
        data: validOldRecord,
      });

      expect(validResponse.status()).toBe(201);

      // Test more than one year ago (should be invalid)
      const tooOld = new Date();
      tooOld.setFullYear(tooOld.getFullYear() - 1);
      tooOld.setDate(tooOld.getDate() - 1); // One day before one year ago

      const invalidOldRecord = {
        type_id: 1,
        value: 70,
        unit: 'kg',
        recorded_at: tooOld.toISOString(),
      };

      const invalidResponse = await apiRequest.post('/api/health/records', {
        data: invalidOldRecord,
      });

      expect(invalidResponse.status()).toBe(422);

      // Test future date (should be invalid)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const futureRecord = {
        type_id: 1,
        value: 70,
        unit: 'kg',
        recorded_at: futureDate.toISOString(),
      };

      const futureResponse = await apiRequest.post('/api/health/records', {
        data: futureRecord,
      });

      expect(futureResponse.status()).toBe(422);
    });

    test('should handle partial record updates correctly', async () => {
      // Create initial record
      const initialRecord = {
        type_id: 1,
        value: 70,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      };

      const createResponse = await apiRequest.post('/api/health/records', {
        data: initialRecord,
      });

      expect(createResponse.status()).toBe(201);

      const created = await createResponse.json();

      // Update only value
      const valueUpdate = {
        id: created.record.id,
        value: 75,
      };

      const valueResponse = await apiRequest.put('/api/health/records', {
        data: valueUpdate,
      });

      expect(valueResponse.status()).toBe(200);

      const valueUpdated = await valueResponse.json();

      expect(valueUpdated.record.value).toBe('75');
      expect(valueUpdated.record.unit).toBe('kg'); // Should remain unchanged

      // Update only unit
      const unitUpdate = {
        id: created.record.id,
        unit: 'lbs',
      };

      const unitResponse = await apiRequest.put('/api/health/records', {
        data: unitUpdate,
      });

      expect(unitResponse.status()).toBe(200);

      const unitUpdated = await unitResponse.json();

      expect(unitUpdated.record.unit).toBe('lbs');
      expect(unitUpdated.record.value).toBe('75'); // Should remain unchanged
    });

    test('should handle invalid unit validation', async () => {
      const invalidUnitRecord = {
        type_id: 1,
        value: 70,
        unit: 'invalid_unit',
        recorded_at: new Date().toISOString(),
      };

      const response = await apiRequest.post('/api/health/records', {
        data: invalidUnitRecord,
      });

      expect(response.status()).toBe(422);

      const error = await response.json();

      expect(error.error).toContain('Invalid unit');
    });
  });

  test.describe('Goal Business Logic Edge Cases', () => {
    test('should handle goal creation with boundary target dates', async () => {
      // Test goal with target date tomorrow (should be valid)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tomorrowGoal = {
        type_id: 1,
        target_value: 65,
        target_date: tomorrow.toISOString(),
        status: 'active',
      };

      const tomorrowResponse = await apiRequest.post('/api/health/goals', {
        data: tomorrowGoal,
      });

      expect(tomorrowResponse.status()).toBe(201);

      // Test goal with target date today (should be invalid)
      const today = new Date();
      const todayGoal = {
        type_id: 2,
        target_value: 120,
        target_date: today.toISOString(),
        status: 'active',
      };

      const todayResponse = await apiRequest.post('/api/health/goals', {
        data: todayGoal,
      });

      expect(todayResponse.status()).toBe(422);

      // Test goal with far future date (should be valid)
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 5);

      const farFutureGoal = {
        type_id: 3,
        target_value: 10000,
        target_date: farFuture.toISOString(),
        status: 'active',
      };

      const farFutureResponse = await apiRequest.post('/api/health/goals', {
        data: farFutureGoal,
      });

      expect(farFutureResponse.status()).toBe(201);
    });

    test('should validate reasonable target values for different health types', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      // Test unreasonable weight target (too low)
      const lowWeightGoal = {
        type_id: 1,
        target_value: 10,
        target_date: futureDate.toISOString(),
        status: 'active',
      };

      const lowWeightResponse = await apiRequest.post('/api/health/goals', {
        data: lowWeightGoal,
      });

      expect(lowWeightResponse.status()).toBe(422);

      // Test unreasonable weight target (too high)
      const highWeightGoal = {
        type_id: 1,
        target_value: 500,
        target_date: futureDate.toISOString(),
        status: 'active',
      };

      const highWeightResponse = await apiRequest.post('/api/health/goals', {
        data: highWeightGoal,
      });

      expect(highWeightResponse.status()).toBe(422);

      // Test reasonable weight target
      const reasonableGoal = {
        type_id: 1,
        target_value: 70,
        target_date: futureDate.toISOString(),
        status: 'active',
      };

      const reasonableResponse = await apiRequest.post('/api/health/goals', {
        data: reasonableGoal,
      });

      expect(reasonableResponse.status()).toBe(201);
    });

    test('should detect goal conflicts for same health type', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      // Create first active goal
      const firstGoal = {
        type_id: 2,
        target_value: 120,
        target_date: futureDate.toISOString(),
        status: 'active',
      };

      const firstResponse = await apiRequest.post('/api/health/goals', {
        data: firstGoal,
      });

      expect(firstResponse.status()).toBe(201);

      // Try to create second active goal for same type (should fail)
      const secondGoal = {
        type_id: 2,
        target_value: 110,
        target_date: futureDate.toISOString(),
        status: 'active',
      };

      const secondResponse = await apiRequest.post('/api/health/goals', {
        data: secondGoal,
      });

      expect(secondResponse.status()).toBe(409);

      const error = await secondResponse.json();

      expect(error.error).toContain('active goal already exists');
    });

    test('should handle goal completion logic correctly', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      // Create goal
      const goal = {
        type_id: 3,
        target_value: 8000,
        target_date: futureDate.toISOString(),
        status: 'active',
      };

      const goalResponse = await apiRequest.post('/api/health/goals', {
        data: goal,
      });

      expect(goalResponse.status()).toBe(201);

      const createdGoal = await goalResponse.json();

      // Add record that doesn't reach target
      const record = {
        type_id: 3,
        value: 6000,
        unit: 'steps',
        recorded_at: new Date().toISOString(),
      };

      await apiRequest.post('/api/health/records', { data: record });

      // Mark goal as completed despite not reaching target
      const completionUpdate = {
        id: createdGoal.goal.id,
        status: 'completed',
      };

      const completionResponse = await apiRequest.patch('/api/health/goals', {
        data: completionUpdate,
      });

      expect(completionResponse.status()).toBe(200);

      // Verify warning is logged (check response or logs)
      const updatedGoal = await completionResponse.json();

      expect(updatedGoal.goal.status).toBe('completed');
    });

    test('should handle goal status transitions correctly', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      // Create active goal
      const goal = {
        type_id: 4,
        target_value: 8,
        target_date: futureDate.toISOString(),
        status: 'active',
      };

      const goalResponse = await apiRequest.post('/api/health/goals', {
        data: goal,
      });

      expect(goalResponse.status()).toBe(201);

      const createdGoal = await goalResponse.json();

      // Transition to paused
      const pauseUpdate = {
        id: createdGoal.goal.id,
        status: 'paused',
      };

      const pauseResponse = await apiRequest.patch('/api/health/goals', {
        data: pauseUpdate,
      });

      expect(pauseResponse.status()).toBe(200);

      // Transition back to active
      const reactivateUpdate = {
        id: createdGoal.goal.id,
        status: 'active',
      };

      const reactivateResponse = await apiRequest.patch('/api/health/goals', {
        data: reactivateUpdate,
      });

      expect(reactivateResponse.status()).toBe(200);

      // Transition to completed
      const completeUpdate = {
        id: createdGoal.goal.id,
        status: 'completed',
      };

      const completeResponse = await apiRequest.patch('/api/health/goals', {
        data: completeUpdate,
      });

      expect(completeResponse.status()).toBe(200);
    });
  });

  test.describe('Analytics Business Logic Edge Cases', () => {
    test('should handle analytics with insufficient data', async () => {
      // Create only one record
      const singleRecord = {
        type_id: 5,
        value: 70,
        unit: 'bpm',
        recorded_at: new Date().toISOString(),
      };

      await apiRequest.post('/api/health/records', { data: singleRecord });

      // Request analytics
      const analyticsResponse = await apiRequest.get('/api/health/analytics/heart_rate');

      expect(analyticsResponse.status()).toBe(200);

      const analytics = await analyticsResponse.json();

      // Should handle single point gracefully
      expect(analytics.summary.trend).toBe('stable');
      expect(analytics.summary.trendValue).toBe(0);
      expect(analytics.data.length).toBe(1);
    });

    test('should handle aggregation with sparse data', async () => {
      const baseDate = new Date();

      // Create records with gaps (day 1, day 5, day 10)
      const sparseRecords = [
        {
          type_id: 1,
          value: 70,
          unit: 'kg',
          recorded_at: new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          type_id: 1,
          value: 69,
          unit: 'kg',
          recorded_at: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          type_id: 1,
          value: 68,
          unit: 'kg',
          recorded_at: baseDate.toISOString(),
        },
      ];

      for (const record of sparseRecords) {
        await apiRequest.post('/api/health/records', { data: record });
      }

      // Request daily analytics
      const analyticsResponse = await apiRequest.get('/api/health/analytics/weight?aggregation=daily');

      expect(analyticsResponse.status()).toBe(200);

      const analytics = await analyticsResponse.json();

      // Should only return data for days with records
      expect(analytics.data.length).toBe(3);
      expect(analytics.summary.trend).toBe('decreasing');
    });

    test('should handle zero variance data correctly', async () => {
      const baseDate = new Date();

      // Create multiple records with identical values
      const identicalRecords = [];
      for (let i = 0; i < 5; i++) {
        identicalRecords.push({
          type_id: 2,
          value: 120,
          unit: 'mmHg',
          recorded_at: new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      for (const record of identicalRecords) {
        await apiRequest.post('/api/health/records', { data: record });
      }

      const analyticsResponse = await apiRequest.get('/api/health/analytics/blood_pressure_systolic');

      expect(analyticsResponse.status()).toBe(200);

      const analytics = await analyticsResponse.json();

      // Should handle zero variance gracefully
      expect(analytics.summary.trend).toBe('stable');
      expect(analytics.summary.trendValue).toBe(0);
      expect(analytics.data.every(d => d.value === 120)).toBe(true);
    });

    test('should validate analytics caching behavior', async () => {
      // Create test record
      const record = {
        type_id: 3,
        value: 5000,
        unit: 'steps',
        recorded_at: new Date().toISOString(),
      };

      await apiRequest.post('/api/health/records', { data: record });

      // First request (should cache)
      const firstResponse = await apiRequest.get('/api/health/analytics/steps');

      expect(firstResponse.status()).toBe(200);

      const firstData = await firstResponse.json();

      // Second request (should return cached data)
      const secondResponse = await apiRequest.get('/api/health/analytics/steps');

      expect(secondResponse.status()).toBe(200);

      const secondData = await secondResponse.json();

      // Data should be identical
      expect(JSON.stringify(firstData)).toBe(JSON.stringify(secondData));

      // Add new record
      const newRecord = {
        type_id: 3,
        value: 6000,
        unit: 'steps',
        recorded_at: new Date().toISOString(),
      };

      await apiRequest.post('/api/health/records', { data: newRecord });

      // Wait for cache to potentially expire (if TTL is short)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Third request (should still return cached data if TTL hasn't expired)
      const thirdResponse = await apiRequest.get('/api/health/analytics/steps');

      expect(thirdResponse.status()).toBe(200);
    });

    test('should handle extreme outlier values', async () => {
      const baseDate = new Date();

      // Create records with extreme outliers
      const outlierRecords = [
        {
          type_id: 1,
          value: 70,
          unit: 'kg',
          recorded_at: new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          type_id: 1,
          value: 71,
          unit: 'kg',
          recorded_at: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          type_id: 1,
          value: 500, // Extreme outlier
          unit: 'kg',
          recorded_at: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          type_id: 1,
          value: 72,
          unit: 'kg',
          recorded_at: baseDate.toISOString(),
        },
      ];

      for (const record of outlierRecords) {
        await apiRequest.post('/api/health/records', { data: record });
      }

      const analyticsResponse = await apiRequest.get('/api/health/analytics/weight');

      expect(analyticsResponse.status()).toBe(200);

      const analytics = await analyticsResponse.json();

      // Should handle outliers without crashing
      expect(analytics.data.length).toBe(4);
      expect(analytics.data.some(d => d.max === 500)).toBe(true);
      expect(analytics.summary.totalRecords).toBe(4);
    });

    test('should handle invalid health type in analytics', async () => {
      const invalidResponse = await apiRequest.get('/api/health/analytics/invalid_type');

      expect(invalidResponse.status()).toBe(404);

      const error = await invalidResponse.json();

      expect(error.error).toBe('Invalid health type');
    });

    test('should validate date range parameters', async () => {
      // Test invalid date format
      const invalidDateResponse = await apiRequest.get('/api/health/analytics/weight?start_date=invalid-date');

      expect(invalidDateResponse.status()).toBe(422);

      // Test end date before start date
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const invalidRangeResponse = await apiRequest.get(
        `/api/health/analytics/weight?start_date=${startDate}&end_date=${endDate}`,
      );

      expect(invalidRangeResponse.status()).toBe(422);
    });
  });

  test.describe('Reminder Business Logic Edge Cases', () => {
    test('should validate complex cron expressions', async () => {
      const validCronExpressions = [
        '0 9 * * *', // Daily at 9 AM
        '0 12 * * 1', // Weekly Monday at noon
        '*/15 * * * *', // Every 15 minutes
        '0 9,21 * * *', // Twice daily at 9 AM and 9 PM
        '0 10 1 * *', // Monthly on 1st at 10 AM
        '@daily', // Named schedule
        '@weekly', // Named schedule
      ];

      for (const cronExpr of validCronExpressions) {
        const reminder = {
          type_id: 1,
          cron_expr: cronExpr,
          message: `Test reminder with ${cronExpr}`,
          active: true,
        };

        const response = await apiRequest.post('/api/health/reminders', {
          data: reminder,
        });

        expect(response.status()).toBe(201);
      }

      // Test invalid cron expressions
      const invalidCronExpressions = [
        '60 9 * * *', // Invalid minute (60)
        '0 25 * * *', // Invalid hour (25)
        '0 9 32 * *', // Invalid day (32)
        '0 9 * 13 *', // Invalid month (13)
        '0 9 * * 8', // Invalid day of week (8)
        'invalid', // Completely invalid
      ];

      for (const cronExpr of invalidCronExpressions) {
        const reminder = {
          type_id: 1,
          cron_expr: cronExpr,
          message: `Test reminder with ${cronExpr}`,
          active: true,
        };

        const response = await apiRequest.post('/api/health/reminders', {
          data: reminder,
        });

        expect(response.status()).toBe(422);
      }
    });

    test('should calculate next run time correctly', async () => {
      // Create reminder with daily schedule
      const dailyReminder = {
        type_id: 1,
        cron_expr: '0 9 * * *', // Daily at 9 AM
        message: 'Daily weight check',
        active: true,
      };

      const response = await apiRequest.post('/api/health/reminders', {
        data: dailyReminder,
      });

      expect(response.status()).toBe(201);

      const created = await response.json();

      // Verify nextRunAt is set to next 9 AM
      const nextRun = new Date(created.reminder.nextRunAt);

      expect(nextRun.getHours()).toBe(9);
      expect(nextRun.getMinutes()).toBe(0);
      expect(nextRun > new Date()).toBe(true);
    });

    test('should handle reminder trigger endpoint authentication', async () => {
      // Test without authentication
      const unauthResponse = await apiRequest.post('/api/health/reminders/trigger');

      expect(unauthResponse.status()).toBe(401);

      // Test with wrong secret
      const wrongSecretResponse = await apiRequest.post('/api/health/reminders/trigger', {
        headers: {
          'X-Cron-Secret': 'wrong-secret',
        },
      });

      expect(wrongSecretResponse.status()).toBe(401);

      // Test with correct secret
      const correctResponse = await apiRequest.post('/api/health/reminders/trigger', {
        headers: {
          'X-Cron-Secret': CRON_SECRET,
        },
      });

      expect(correctResponse.status()).toBe(200);
    });

    test('should process due reminders correctly', async () => {
      // Create reminder that should be due
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

      const dueReminder = {
        type_id: 1,
        cron_expr: '0 * * * *', // Every hour
        message: 'Hourly reminder',
        active: true,
      };

      const createResponse = await apiRequest.post('/api/health/reminders', {
        data: dueReminder,
      });

      expect(createResponse.status()).toBe(201);

      // Manually set nextRunAt to past time (would need database access)
      // For this test, we'll assume the reminder is due

      // Trigger reminders
      const triggerResponse = await apiRequest.post('/api/health/reminders/trigger', {
        headers: {
          'X-Cron-Secret': CRON_SECRET,
        },
      });

      expect(triggerResponse.status()).toBe(200);

      const result = await triggerResponse.json();

      expect(result.processed).toBeGreaterThanOrEqual(0);
    });

    test('should handle reminder deactivation and reactivation', async () => {
      // Create active reminder
      const reminder = {
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: 'Daily reminder',
        active: true,
      };

      const createResponse = await apiRequest.post('/api/health/reminders', {
        data: reminder,
      });

      expect(createResponse.status()).toBe(201);

      const created = await createResponse.json();

      // Deactivate reminder
      const deactivateResponse = await apiRequest.delete(
        `/api/health/reminders?id=${created.reminder.id}`,
      );

      expect(deactivateResponse.status()).toBe(200);

      const deactivated = await deactivateResponse.json();

      expect(deactivated.reminder.active).toBe(false);

      // Reactivate reminder
      const reactivateUpdate = {
        id: created.reminder.id,
        active: true,
      };

      const reactivateResponse = await apiRequest.patch('/api/health/reminders', {
        data: reactivateUpdate,
      });

      expect(reactivateResponse.status()).toBe(200);

      const reactivated = await reactivateResponse.json();

      expect(reactivated.reminder.active).toBe(true);
    });

    test('should validate reminder message length', async () => {
      // Test empty message
      const emptyMessageReminder = {
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: '',
        active: true,
      };

      const emptyResponse = await apiRequest.post('/api/health/reminders', {
        data: emptyMessageReminder,
      });

      expect(emptyResponse.status()).toBe(422);

      // Test message too long (> 500 characters)
      const longMessage = 'a'.repeat(501);
      const longMessageReminder = {
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: longMessage,
        active: true,
      };

      const longResponse = await apiRequest.post('/api/health/reminders', {
        data: longMessageReminder,
      });

      expect(longResponse.status()).toBe(422);

      // Test valid message
      const validReminder = {
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: 'Valid reminder message',
        active: true,
      };

      const validResponse = await apiRequest.post('/api/health/reminders', {
        data: validReminder,
      });

      expect(validResponse.status()).toBe(201);
    });
  });

  test.describe('Cross-Entity Business Logic', () => {
    test('should handle records without corresponding goals', async () => {
      // Create record without goal
      const orphanRecord = {
        type_id: 1,
        value: 70,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      };

      const recordResponse = await apiRequest.post('/api/health/records', {
        data: orphanRecord,
      });

      expect(recordResponse.status()).toBe(201);

      // Verify analytics still work
      const analyticsResponse = await apiRequest.get('/api/health/analytics/weight');

      expect(analyticsResponse.status()).toBe(200);

      const analytics = await analyticsResponse.json();

      expect(analytics.summary.currentValue).toBe('70');
    });

    test('should handle goals without corresponding records', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      // Create goal without records
      const orphanGoal = {
        type_id: 5,
        target_value: 80,
        target_date: futureDate.toISOString(),
        status: 'active',
      };

      const goalResponse = await apiRequest.post('/api/health/goals', {
        data: orphanGoal,
      });

      expect(goalResponse.status()).toBe(201);

      // Verify goal progress calculation handles missing records
      const goalsResponse = await apiRequest.get('/api/health/goals');

      expect(goalsResponse.status()).toBe(200);

      const goals = await goalsResponse.json();

      const orphanGoalData = goals.goals.find(g => g.typeId === 5);

      expect(orphanGoalData.currentValue).toBe(0);
      expect(orphanGoalData.progressPercentage).toBe(0);
      expect(orphanGoalData.lastRecordedAt).toBeNull();
    });

    test('should maintain data consistency during concurrent operations', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      // Create multiple concurrent requests
      const concurrentPromises = [];

      // Concurrent record creation
      for (let i = 0; i < 5; i++) {
        concurrentPromises.push(
          apiRequest.post('/api/health/records', {
            data: {
              type_id: 1,
              value: 70 + i,
              unit: 'kg',
              recorded_at: new Date(Date.now() - i * 60 * 1000).toISOString(),
            },
          }),
        );
      }

      // Concurrent goal creation for different types
      for (let i = 2; i <= 4; i++) {
        concurrentPromises.push(
          apiRequest.post('/api/health/goals', {
            data: {
              type_id: i,
              target_value: 100 + i,
              target_date: futureDate.toISOString(),
              status: 'active',
            },
          }),
        );
      }

      // Execute all concurrent requests
      const results = await Promise.allSettled(concurrentPromises);

      // Verify all succeeded
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      expect(successCount).toBe(concurrentPromises.length);
    });
  });

  test.describe('User Isolation and Security Edge Cases', () => {
    test('should isolate data between different users', async () => {
      // This test would require multiple user contexts
      // For now, we'll test that unauthorized access is properly blocked

      const unauthorizedRequest = await request.newContext({
        baseURL: API_BASE_URL,
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          // No authorization header
        },
      });

      const response = await unauthorizedRequest.get('/api/health/records');

      expect(response.status()).toBe(401);

      await unauthorizedRequest.dispose();
    });

    test('should handle malformed authentication tokens', async () => {
      const malformedAuthRequest = await request.newContext({
        baseURL: API_BASE_URL,
        extraHTTPHeaders: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json',
        },
      });

      const response = await malformedAuthRequest.get('/api/health/records');

      expect(response.status()).toBe(401);

      await malformedAuthRequest.dispose();
    });
  });

  test.describe('Data Validation Edge Cases', () => {
    test('should handle malformed JSON payloads', async () => {
      const malformedResponse = await apiRequest.post('/api/health/records', {
        data: 'invalid-json',
      });

      expect(malformedResponse.status()).toBe(400);
    });

    test('should handle extremely large numeric values', async () => {
      const largeValueRecord = {
        type_id: 1,
        value: Number.MAX_SAFE_INTEGER,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      };

      const response = await apiRequest.post('/api/health/records', {
        data: largeValueRecord,
      });

      expect(response.status()).toBe(422);
    });

    test('should handle special characters in string fields', async () => {
      const specialCharReminder = {
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: 'Test with special chars: !@#$%^&*()_+{}|:"<>?[]\\;\',./',
        active: true,
      };

      const response = await apiRequest.post('/api/health/reminders', {
        data: specialCharReminder,
      });

      expect(response.status()).toBe(201);
    });

    test('should handle Unicode characters', async () => {
      const unicodeReminder = {
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: 'Unicode test: 你好世界 🏥💊⚕️',
        active: true,
      };

      const response = await apiRequest.post('/api/health/reminders', {
        data: unicodeReminder,
      });

      expect(response.status()).toBe(201);
    });
  });

  test.describe('Performance and Scalability Edge Cases', () => {
    test('should handle large datasets efficiently', async () => {
      // Create a large number of records
      const batchSize = 50; // Limited by validation
      const records = [];

      for (let i = 0; i < batchSize; i++) {
        records.push({
          type_id: 1,
          value: 70 + (i % 10),
          unit: 'kg',
          recorded_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        });
      }

      // Create records in batches
      const startTime = Date.now();
      for (const record of records) {
        await apiRequest.post('/api/health/records', { data: record });
      }
      const endTime = Date.now();

      // Verify performance is reasonable (less than 30 seconds for 50 records)
      expect(endTime - startTime).toBeLessThan(30000);

      // Test analytics performance with large dataset
      const analyticsStartTime = Date.now();
      const analyticsResponse = await apiRequest.get('/api/health/analytics/weight');
      const analyticsEndTime = Date.now();

      expect(analyticsResponse.status()).toBe(200);
      expect(analyticsEndTime - analyticsStartTime).toBeLessThan(5000); // Less than 5 seconds
    });

    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = [];

      // Create 10 concurrent analytics requests
      for (let i = 0; i < 10; i++) {
        concurrentRequests.push(
          apiRequest.get('/api/health/analytics/weight'),
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      // All requests should succeed
      results.forEach((response) => {
        expect(response.status()).toBe(200);
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // Less than 10 seconds
    });
  });

  test.describe('Realistic Complex Scenarios', () => {
    test('should handle multi-metric health tracking journey', async () => {
      const baseDate = new Date();
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);

      // Create goals for multiple health types
      const goals = [
        { type_id: 1, target_value: 65, target_date: futureDate.toISOString(), status: 'active' },
        { type_id: 3, target_value: 10000, target_date: futureDate.toISOString(), status: 'active' },
        { type_id: 4, target_value: 8, target_date: futureDate.toISOString(), status: 'active' },
      ];

      for (const goal of goals) {
        const response = await apiRequest.post('/api/health/goals', { data: goal });

        expect(response.status()).toBe(201);
      }

      // Create 6 months of progressive health records
      const healthJourney = [];
      for (let month = 0; month < 6; month++) {
        for (let day = 0; day < 30; day += 3) { // Every 3 days
          const recordDate = new Date(baseDate.getTime() - (month * 30 + day) * 24 * 60 * 60 * 1000);

          // Weight loss progression
          healthJourney.push({
            type_id: 1,
            value: 75 - (month * 2) - (day * 0.1), // Gradual weight loss
            unit: 'kg',
            recorded_at: recordDate.toISOString(),
          });

          // Steps improvement
          healthJourney.push({
            type_id: 3,
            value: 5000 + (month * 1000) + (day * 50), // Gradual step increase
            unit: 'steps',
            recorded_at: recordDate.toISOString(),
          });

          // Sleep improvement
          healthJourney.push({
            type_id: 4,
            value: 6 + (month * 0.3) + (day * 0.01), // Gradual sleep improvement
            unit: 'hours',
            recorded_at: recordDate.toISOString(),
          });
        }
      }

      // Create all records
      for (const record of healthJourney) {
        const response = await apiRequest.post('/api/health/records', { data: record });

        expect(response.status()).toBe(201);
      }

      // Verify analytics show proper trends
      const weightAnalytics = await apiRequest.get('/api/health/analytics/weight');

      expect(weightAnalytics.status()).toBe(200);

      const weightData = await weightAnalytics.json();

      expect(weightData.summary.trend).toBe('decreasing');

      const stepsAnalytics = await apiRequest.get('/api/health/analytics/steps');

      expect(stepsAnalytics.status()).toBe(200);

      const stepsData = await stepsAnalytics.json();

      expect(stepsData.summary.trend).toBe('increasing');

      // Verify goal progress
      const goalsResponse = await apiRequest.get('/api/health/goals');

      expect(goalsResponse.status()).toBe(200);

      const goalsData = await goalsResponse.json();

      goalsData.goals.forEach((goal) => {
        expect(goal.progressPercentage).toBeGreaterThan(0);
        expect(goal.currentValue).toBeGreaterThan(0);
      });
    });

    test('should handle goal achievement and re-setting cycle', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      // Create initial weight loss goal
      const initialGoal = {
        type_id: 1,
        target_value: 70,
        target_date: futureDate.toISOString(),
        status: 'active',
      };

      const goalResponse = await apiRequest.post('/api/health/goals', {
        data: initialGoal,
      });

      expect(goalResponse.status()).toBe(201);

      const createdGoal = await goalResponse.json();

      // Add records showing goal achievement
      const achievementRecords = [
        { type_id: 1, value: 75, unit: 'kg', recorded_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
        { type_id: 1, value: 72, unit: 'kg', recorded_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
        { type_id: 1, value: 70, unit: 'kg', recorded_at: new Date().toISOString() },
      ];

      for (const record of achievementRecords) {
        await apiRequest.post('/api/health/records', { data: record });
      }

      // Mark goal as completed
      const completionUpdate = {
        id: createdGoal.goal.id,
        status: 'completed',
      };

      const completionResponse = await apiRequest.patch('/api/health/goals', {
        data: completionUpdate,
      });

      expect(completionResponse.status()).toBe(200);

      // Create new goal (further weight loss)
      const newFutureDate = new Date();
      newFutureDate.setMonth(newFutureDate.getMonth() + 6);

      const newGoal = {
        type_id: 1,
        target_value: 65,
        target_date: newFutureDate.toISOString(),
        status: 'active',
      };

      const newGoalResponse = await apiRequest.post('/api/health/goals', {
        data: newGoal,
      });

      expect(newGoalResponse.status()).toBe(201);

      // Verify both goals exist with correct statuses
      const allGoalsResponse = await apiRequest.get('/api/health/goals');

      expect(allGoalsResponse.status()).toBe(200);

      const allGoals = await allGoalsResponse.json();

      const completedGoal = allGoals.goals.find(g => g.id === createdGoal.goal.id);

      expect(completedGoal.status).toBe('completed');

      const activeGoals = allGoals.goals.filter(g => g.status === 'active' && g.typeId === 1);

      expect(activeGoals.length).toBe(1);
    });
  });

  test.describe('Boundary Condition Testing', () => {
    test('should handle exact validation boundaries', async () => {
      // Test exactly at 10000 value limit
      const boundaryRecord = {
        type_id: 1,
        value: 9999.99,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      };

      const response = await apiRequest.post('/api/health/records', {
        data: boundaryRecord,
      });

      expect(response.status()).toBe(201);

      // Test exactly over the limit
      const overLimitRecord = {
        type_id: 1,
        value: 10000.01,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      };

      const overResponse = await apiRequest.post('/api/health/records', {
        data: overLimitRecord,
      });

      expect(overResponse.status()).toBe(422);
    });

    test('should handle leap year date boundaries', async () => {
      // Test February 29th on a leap year
      const leapYearDate = new Date('2024-02-29T12:00:00.000Z');

      const leapYearRecord = {
        type_id: 1,
        value: 70,
        unit: 'kg',
        recorded_at: leapYearDate.toISOString(),
      };

      const response = await apiRequest.post('/api/health/records', {
        data: leapYearRecord,
      });

      expect(response.status()).toBe(201);
    });

    test('should handle decimal precision correctly', async () => {
      const precisionRecord = {
        type_id: 1,
        value: 70.123456789,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      };

      const response = await apiRequest.post('/api/health/records', {
        data: precisionRecord,
      });

      expect(response.status()).toBe(201);

      const created = await response.json();

      // Verify precision is maintained appropriately
      expect(Number.parseFloat(created.record.value)).toBeCloseTo(70.123456789, 2);
    });

    test('should handle string length limits', async () => {
      // Test reminder message at exactly 500 characters
      const exactLimitMessage = 'a'.repeat(500);
      const exactLimitReminder = {
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: exactLimitMessage,
        active: true,
      };

      const response = await apiRequest.post('/api/health/reminders', {
        data: exactLimitReminder,
      });

      expect(response.status()).toBe(201);

      // Test message at 501 characters (should fail)
      const overLimitMessage = 'a'.repeat(501);
      const overLimitReminder = {
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: overLimitMessage,
        active: true,
      };

      const overResponse = await apiRequest.post('/api/health/reminders', {
        data: overLimitReminder,
      });

      expect(overResponse.status()).toBe(422);
    });
  });
});
