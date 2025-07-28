import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';

// Utility function to handle API requests with auto-generated x-e2e-random-id
const apiRequest = async (request: any, method: 'get' | 'post' | 'put' | 'patch' | 'delete', endpoint: string, data?: any) => {
  const e2eRandomId = faker.number.int({ max: 1000000 });
  return request[method](endpoint, {
    ...(data && { data }),
    headers: {
      'x-e2e-random-id': e2eRandomId.toString(),
    },
  });
};

test.describe('Health Management', () => {
  test.describe('Health Records API', () => {
    test('should create a new health record with valid data', async ({ request }) => {
      const healthRecord = await apiRequest(request, 'post', '/api/health/records', {
        type_id: 1,
        value: 70.5,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      expect(healthRecord.status()).toBe(201);
      
      const recordJson = await healthRecord.json();
      expect(recordJson).toHaveProperty('id');
      expect(recordJson.type_id).toBe(1);
      expect(recordJson.value).toBe(70.5);
      expect(recordJson.unit).toBe('kg');
    });

    test('shouldn\'t create a health record with invalid type_id', async ({ request }) => {
      const healthRecord = await apiRequest(request, 'post', '/api/health/records', {
        type_id: 'invalid',
        value: 70.5,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      expect(healthRecord.status()).toBe(422);
      
      const errorJson = await healthRecord.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('shouldn\'t create a health record with negative value', async ({ request }) => {
      const healthRecord = await apiRequest(request, 'post', '/api/health/records', {
        type_id: 1,
        value: -10,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      expect(healthRecord.status()).toBe(422);
      
      const errorJson = await healthRecord.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('shouldn\'t create a health record with future date', async ({ request }) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const healthRecord = await apiRequest(request, 'post', '/api/health/records', {
        type_id: 1,
        value: 70.5,
        unit: 'kg',
        recorded_at: futureDate.toISOString(),
      });

      expect(healthRecord.status()).toBe(422);
      
      const errorJson = await healthRecord.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('should retrieve health records for authenticated user', async ({ request }) => {
      // Create a record first
      await apiRequest(request, 'post', '/api/health/records', {
        type_id: 1,
        value: 75.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      const records = await apiRequest(request, 'get', '/api/health/records');

      expect(records.status()).toBe(200);
      
      const recordsJson = await records.json();
      expect(Array.isArray(recordsJson.data)).toBe(true);
      expect(recordsJson.data.length).toBeGreaterThan(0);
    });

    test('should update an existing health record', async ({ request }) => {
      // Create a record first
      const createResponse = await apiRequest(request, 'post', '/api/health/records', {
        type_id: 1,
        value: 70.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      const createdRecord = await createResponse.json();
      
      // Update the record
      const updateResponse = await apiRequest(request, 'put', `/api/health/records/${createdRecord.id}`, {
        value: 72.0,
        unit: 'kg',
      });

      expect(updateResponse.status()).toBe(200);
      
      const updatedRecord = await updateResponse.json();
      expect(updatedRecord.value).toBe(72.0);
    });

    test('should delete a health record', async ({ request }) => {
      // Create a record first
      const createResponse = await apiRequest(request, 'post', '/api/health/records', {
        type_id: 1,
        value: 70.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      const createdRecord = await createResponse.json();
      
      // Delete the record
      const deleteResponse = await apiRequest(request, 'delete', `/api/health/records/${createdRecord.id}`);

      expect(deleteResponse.status()).toBe(204);
      
      // Verify record is deleted
      const getResponse = await apiRequest(request, 'get', `/api/health/records/${createdRecord.id}`);
      expect(getResponse.status()).toBe(404);
    });
  });

  test.describe('Health Goals API', () => {
    test('should create a new health goal with valid data', async ({ request }) => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      
      const healthGoal = await apiRequest(request, 'post', '/api/health/goals', {
        type_id: 1,
        target_value: 65.0,
        target_date: futureDate.toISOString(),
        status: 'active',
      });

      expect(healthGoal.status()).toBe(201);
      
      const goalJson = await healthGoal.json();
      expect(goalJson).toHaveProperty('id');
      expect(goalJson.type_id).toBe(1);
      expect(goalJson.target_value).toBe(65.0);
      expect(goalJson.status).toBe('active');
    });

    test('shouldn\'t create a health goal with past target date', async ({ request }) => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);
      
      const healthGoal = await apiRequest(request, 'post', '/api/health/goals', {
        type_id: 1,
        target_value: 65.0,
        target_date: pastDate.toISOString(),
        status: 'active',
      });

      expect(healthGoal.status()).toBe(422);
      
      const errorJson = await healthGoal.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('shouldn\'t create a health goal with invalid status', async ({ request }) => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      
      const healthGoal = await apiRequest(request, 'post', '/api/health/goals', {
        type_id: 1,
        target_value: 65.0,
        target_date: futureDate.toISOString(),
        status: 'invalid_status',
      });

      expect(healthGoal.status()).toBe(422);
      
      const errorJson = await healthGoal.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('should retrieve health goals for authenticated user', async ({ request }) => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      
      // Create a goal first
      await apiRequest(request, 'post', '/api/health/goals', {
        type_id: 1,
        target_value: 65.0,
        target_date: futureDate.toISOString(),
        status: 'active',
      });

      const goals = await apiRequest(request, 'get', '/api/health/goals');

      expect(goals.status()).toBe(200);
      
      const goalsJson = await goals.json();
      expect(Array.isArray(goalsJson.data)).toBe(true);
      expect(goalsJson.data.length).toBeGreaterThan(0);
    });

    test('should update goal status', async ({ request }) => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      
      // Create a goal first
      const createResponse = await apiRequest(request, 'post', '/api/health/goals', {
        type_id: 1,
        target_value: 65.0,
        target_date: futureDate.toISOString(),
        status: 'active',
      });

      const createdGoal = await createResponse.json();
      
      // Update the goal status
      const updateResponse = await apiRequest(request, 'patch', `/api/health/goals/${createdGoal.id}`, {
        status: 'completed',
      });

      expect(updateResponse.status()).toBe(200);
      
      const updatedGoal = await updateResponse.json();
      expect(updatedGoal.status).toBe('completed');
    });
  });

  test.describe('Health Reminders API', () => {
    test('should create a new health reminder with valid data', async ({ request }) => {
      const healthReminder = await apiRequest(request, 'post', '/api/health/reminders', {
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: 'Time to weigh yourself!',
        active: true,
      });

      expect(healthReminder.status()).toBe(201);
      
      const reminderJson = await healthReminder.json();
      expect(reminderJson).toHaveProperty('id');
      expect(reminderJson.type_id).toBe(1);
      expect(reminderJson.cron_expr).toBe('0 9 * * *');
      expect(reminderJson.message).toBe('Time to weigh yourself!');
      expect(reminderJson.active).toBe(true);
      expect(reminderJson).toHaveProperty('next_run_at');
    });

    test('shouldn\'t create a reminder with invalid cron expression', async ({ request }) => {
      const healthReminder = await apiRequest(request, 'post', '/api/health/reminders', {
        type_id: 1,
        cron_expr: 'invalid cron',
        message: 'Time to weigh yourself!',
        active: true,
      });

      expect(healthReminder.status()).toBe(422);
      
      const errorJson = await healthReminder.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('shouldn\'t create a reminder with empty message', async ({ request }) => {
      const healthReminder = await apiRequest(request, 'post', '/api/health/reminders', {
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: '',
        active: true,
      });

      expect(healthReminder.status()).toBe(422);
      
      const errorJson = await healthReminder.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('should retrieve health reminders for authenticated user', async ({ request }) => {
      // Create a reminder first
      await apiRequest(request, 'post', '/api/health/reminders', {
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: 'Time to weigh yourself!',
        active: true,
      });

      const reminders = await apiRequest(request, 'get', '/api/health/reminders');

      expect(reminders.status()).toBe(200);
      
      const remindersJson = await reminders.json();
      expect(Array.isArray(remindersJson.data)).toBe(true);
      expect(remindersJson.data.length).toBeGreaterThan(0);
    });

    test('should update reminder activation status', async ({ request }) => {
      // Create a reminder first
      const createResponse = await apiRequest(request, 'post', '/api/health/reminders', {
        type_id: 1,
        cron_expr: '0 9 * * *',
        message: 'Time to weigh yourself!',
        active: true,
      });

      const createdReminder = await createResponse.json();
      
      // Deactivate the reminder
      const updateResponse = await apiRequest(request, 'patch', `/api/health/reminders/${createdReminder.id}`, {
        active: false,
      });

      expect(updateResponse.status()).toBe(200);
      
      const updatedReminder = await updateResponse.json();
      expect(updatedReminder.active).toBe(false);
    });
  });

  test.describe('Health Analytics API', () => {
    test('should retrieve analytics data for a specific health type', async ({ request }) => {
      // Create some health records first
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      await apiRequest(request, 'post', '/api/health/records', {
        type_id: 1,
        value: 70.0,
        unit: 'kg',
        recorded_at: yesterday.toISOString(),
      });

      await apiRequest(request, 'post', '/api/health/records', {
        type_id: 1,
        value: 69.5,
        unit: 'kg',
        recorded_at: today.toISOString(),
      });

      const analytics = await apiRequest(request, 'get', '/api/health/analytics/1');

      expect(analytics.status()).toBe(200);
      
      const analyticsJson = await analytics.json();
      expect(analyticsJson).toHaveProperty('data');
      expect(analyticsJson).toHaveProperty('currentValue');
      expect(analyticsJson).toHaveProperty('trend');
      expect(Array.isArray(analyticsJson.data)).toBe(true);
      expect(analyticsJson.data.length).toBeGreaterThan(0);
    });

    test('should retrieve analytics data with date range filter', async ({ request }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();
      
      const analytics = await apiRequest(request, 'get', `/api/health/analytics/1?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`);

      expect(analytics.status()).toBe(200);
      
      const analyticsJson = await analytics.json();
      expect(analyticsJson).toHaveProperty('data');
      expect(analyticsJson).toHaveProperty('start_date');
      expect(analyticsJson).toHaveProperty('end_date');
    });

    test('shouldn\'t retrieve analytics for invalid health type', async ({ request }) => {
      const analytics = await apiRequest(request, 'get', '/api/health/analytics/999');

      expect(analytics.status()).toBe(404);
      
      const errorJson = await analytics.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('shouldn\'t retrieve analytics with invalid date range', async ({ request }) => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 7); // End date before start date
      
      const analytics = await apiRequest(request, 'get', `/api/health/analytics/1?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`);

      expect(analytics.status()).toBe(422);
      
      const errorJson = await analytics.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('should retrieve analytics with aggregation parameter', async ({ request }) => {
      // Create multiple records for aggregation testing
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date);
        
        await apiRequest(request, 'post', '/api/health/records', {
          type_id: 1,
          value: 70 + i,
          unit: 'kg',
          recorded_at: date.toISOString(),
        });
      }

      // Test daily aggregation
      const dailyAnalytics = await apiRequest(request, 'get', '/api/health/analytics/1?aggregation=daily');
      expect(dailyAnalytics.status()).toBe(200);
      
      const dailyJson = await dailyAnalytics.json();
      expect(dailyJson).toHaveProperty('data');
      expect(Array.isArray(dailyJson.data)).toBe(true);

      // Test weekly aggregation
      const weeklyAnalytics = await apiRequest(request, 'get', '/api/health/analytics/1?aggregation=weekly');
      expect(weeklyAnalytics.status()).toBe(200);
      
      const weeklyJson = await weeklyAnalytics.json();
      expect(weeklyJson).toHaveProperty('data');
      expect(Array.isArray(weeklyJson.data)).toBe(true);
    });

    test('should validate trend direction in analytics', async ({ request }) => {
      // Create records with increasing trend
      const baseDate = new Date();
      for (let i = 0; i < 5; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - (4 - i));
        
        await apiRequest(request, 'post', '/api/health/records', {
          type_id: 1,
          value: 70 + i, // Increasing values
          unit: 'kg',
          recorded_at: date.toISOString(),
        });
      }

      const analytics = await apiRequest(request, 'get', '/api/health/analytics/1');
      expect(analytics.status()).toBe(200);
      
      const analyticsJson = await analytics.json();
      expect(analyticsJson).toHaveProperty('trend');
      expect(analyticsJson.trend).toHaveProperty('direction');
      expect(['increasing', 'decreasing', 'stable']).toContain(analyticsJson.trend.direction);
    });
  });

  test.describe('Health Reminder Trigger API', () => {
    test('should trigger reminders with valid cron secret', async ({ request }) => {
      const triggerResponse = await request.post('/api/health/reminders/trigger', {
        headers: {
          'Authorization': 'Bearer test-cron-secret',
        },
      });

      expect(triggerResponse.status()).toBe(200);
      
      const triggerJson = await triggerResponse.json();
      expect(triggerJson).toHaveProperty('processed');
      expect(typeof triggerJson.processed).toBe('number');
    });

    test('shouldn\'t trigger reminders without authentication', async ({ request }) => {
      const triggerResponse = await request.post('/api/health/reminders/trigger');

      expect(triggerResponse.status()).toBe(401);
      
      const errorJson = await triggerResponse.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('shouldn\'t trigger reminders with invalid cron secret', async ({ request }) => {
      const triggerResponse = await request.post('/api/health/reminders/trigger', {
        headers: {
          'Authorization': 'Bearer invalid-secret',
        },
      });

      expect(triggerResponse.status()).toBe(401);
      
      const errorJson = await triggerResponse.json();
      expect(errorJson).toHaveProperty('error');
    });
  });

  test.describe('Authentication and Authorization', () => {
    test('shouldn\'t access health records without authentication', async ({ request }) => {
      const records = await request.get('/api/health/records');
      expect(records.status()).toBe(401);
      
      const errorJson = await records.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('shouldn\'t access health goals without authentication', async ({ request }) => {
      const goals = await request.get('/api/health/goals');
      expect(goals.status()).toBe(401);
      
      const errorJson = await goals.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('shouldn\'t access health reminders without authentication', async ({ request }) => {
      const reminders = await request.get('/api/health/reminders');
      expect(reminders.status()).toBe(401);
      
      const errorJson = await reminders.json();
      expect(errorJson).toHaveProperty('error');
    });

    test('shouldn\'t access analytics without authentication', async ({ request }) => {
      const analytics = await request.get('/api/health/analytics/1');
      expect(analytics.status()).toBe(401);
      
      const errorJson = await analytics.json();
      expect(errorJson).toHaveProperty('error');
    });
  });

  test.describe('Data Isolation', () => {
    test('should isolate health records between different users', async ({ request }) => {
      // Create a helper function for requests with specific user IDs
      const apiRequestWithUser = async (userId: string, method: 'get' | 'post' | 'put' | 'patch' | 'delete', endpoint: string, data?: any) => {
        return request[method](endpoint, {
          ...(data && { data }),
          headers: {
            'x-e2e-random-id': userId,
          },
        });
      };

      const user1Id = faker.number.int({ max: 1000000 }).toString();
      const user2Id = faker.number.int({ max: 1000000 }).toString();

      // Create record for user 1
      await apiRequestWithUser(user1Id, 'post', '/api/health/records', {
        type_id: 1,
        value: 70.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      // Create record for user 2
      await apiRequestWithUser(user2Id, 'post', '/api/health/records', {
        type_id: 1,
        value: 80.0,
        unit: 'kg',
        recorded_at: new Date().toISOString(),
      });

      // Get records for user 1
      const user1Records = await apiRequestWithUser(user1Id, 'get', '/api/health/records');

      // Get records for user 2
      const user2Records = await apiRequestWithUser(user2Id, 'get', '/api/health/records');

      expect(user1Records.status()).toBe(200);
      expect(user2Records.status()).toBe(200);

      const user1Json = await user1Records.json();
      const user2Json = await user2Records.json();

      // Verify data isolation - each user should only see their own records
      expect(Array.isArray(user1Json.data)).toBe(true);
      expect(Array.isArray(user2Json.data)).toBe(true);
      
      // User 1 should not see user 2's record (value 80.0)
      expect(user1Json.data.some((record: any) => record.value === 80.0)).toBe(false);
      // User 2 should not see user 1's record (value 70.0)
      expect(user2Json.data.some((record: any) => record.value === 70.0)).toBe(false);
    });

    test('should isolate health goals between different users', async ({ request }) => {
      const apiRequestWithUser = async (userId: string, method: 'get' | 'post' | 'put' | 'patch' | 'delete', endpoint: string, data?: any) => {
        return request[method](endpoint, {
          ...(data && { data }),
          headers: {
            'x-e2e-random-id': userId,
          },
        });
      };

      const user1Id = faker.number.int({ max: 1000000 }).toString();
      const user2Id = faker.number.int({ max: 1000000 }).toString();
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      // Create goal for user 1
      await apiRequestWithUser(user1Id, 'post', '/api/health/goals', {
        type_id: 1,
        target_value: 65.0,
        target_date: futureDate.toISOString(),
        status: 'active',
      });

      // Create goal for user 2
      await apiRequestWithUser(user2Id, 'post', '/api/health/goals', {
        type_id: 1,
        target_value: 75.0,
        target_date: futureDate.toISOString(),
        status: 'active',
      });

      // Get goals for each user
      const user1Goals = await apiRequestWithUser(user1Id, 'get', '/api/health/goals');
      const user2Goals = await apiRequestWithUser(user2Id, 'get', '/api/health/goals');

      expect(user1Goals.status()).toBe(200);
      expect(user2Goals.status()).toBe(200);

      const user1Json = await user1Goals.json();
      const user2Json = await user2Goals.json();

      // Verify goal isolation
      expect(user1Json.data.some((goal: any) => goal.target_value === 75.0)).toBe(false);
      expect(user2Json.data.some((goal: any) => goal.target_value === 65.0)).toBe(false);
    });
  });
});
