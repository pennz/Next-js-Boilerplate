import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';

test.describe('Health Management', () => {
  test.describe('Health Records API', () => {
    test('should create a new health record with valid data', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      const healthRecord = await page.request.post('/api/health/records', {
        data: {
          type_id: 1,
          value: 70.5,
          unit: 'kg',
          recorded_at: new Date().toISOString(),
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(healthRecord.status()).toBe(201);
      
      const recordJson = await healthRecord.json();
      expect(recordJson).toHaveProperty('id');
      expect(recordJson.type_id).toBe(1);
      expect(recordJson.value).toBe(70.5);
      expect(recordJson.unit).toBe('kg');
    });

    test('shouldn\'t create a health record with invalid type_id', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      const healthRecord = await page.request.post('/api/health/records', {
        data: {
          type_id: 'invalid',
          value: 70.5,
          unit: 'kg',
          recorded_at: new Date().toISOString(),
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(healthRecord.status()).toBe(422);
    });

    test('shouldn\'t create a health record with negative value', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      const healthRecord = await page.request.post('/api/health/records', {
        data: {
          type_id: 1,
          value: -10,
          unit: 'kg',
          recorded_at: new Date().toISOString(),
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(healthRecord.status()).toBe(422);
    });

    test('shouldn\'t create a health record with future date', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const healthRecord = await page.request.post('/api/health/records', {
        data: {
          type_id: 1,
          value: 70.5,
          unit: 'kg',
          recorded_at: futureDate.toISOString(),
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(healthRecord.status()).toBe(422);
    });

    test('should retrieve health records for authenticated user', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      // Create a record first
      await page.request.post('/api/health/records', {
        data: {
          type_id: 1,
          value: 75.0,
          unit: 'kg',
          recorded_at: new Date().toISOString(),
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      const records = await page.request.get('/api/health/records', {
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(records.status()).toBe(200);
      
      const recordsJson = await records.json();
      expect(Array.isArray(recordsJson.data)).toBe(true);
      expect(recordsJson.data.length).toBeGreaterThan(0);
    });

    test('should update an existing health record', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      // Create a record first
      const createResponse = await page.request.post('/api/health/records', {
        data: {
          type_id: 1,
          value: 70.0,
          unit: 'kg',
          recorded_at: new Date().toISOString(),
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      const createdRecord = await createResponse.json();
      
      // Update the record
      const updateResponse = await page.request.put(`/api/health/records/${createdRecord.id}`, {
        data: {
          value: 72.0,
          unit: 'kg',
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(updateResponse.status()).toBe(200);
      
      const updatedRecord = await updateResponse.json();
      expect(updatedRecord.value).toBe(72.0);
    });

    test('should delete a health record', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      // Create a record first
      const createResponse = await page.request.post('/api/health/records', {
        data: {
          type_id: 1,
          value: 70.0,
          unit: 'kg',
          recorded_at: new Date().toISOString(),
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      const createdRecord = await createResponse.json();
      
      // Delete the record
      const deleteResponse = await page.request.delete(`/api/health/records/${createdRecord.id}`, {
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(deleteResponse.status()).toBe(204);
    });
  });

  test.describe('Health Goals API', () => {
    test('should create a new health goal with valid data', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      
      const healthGoal = await page.request.post('/api/health/goals', {
        data: {
          type_id: 1,
          target_value: 65.0,
          target_date: futureDate.toISOString(),
          status: 'active',
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(healthGoal.status()).toBe(201);
      
      const goalJson = await healthGoal.json();
      expect(goalJson).toHaveProperty('id');
      expect(goalJson.type_id).toBe(1);
      expect(goalJson.target_value).toBe(65.0);
      expect(goalJson.status).toBe('active');
    });

    test('shouldn\'t create a health goal with past target date', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);
      
      const healthGoal = await page.request.post('/api/health/goals', {
        data: {
          type_id: 1,
          target_value: 65.0,
          target_date: pastDate.toISOString(),
          status: 'active',
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(healthGoal.status()).toBe(422);
    });

    test('shouldn\'t create a health goal with invalid status', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      
      const healthGoal = await page.request.post('/api/health/goals', {
        data: {
          type_id: 1,
          target_value: 65.0,
          target_date: futureDate.toISOString(),
          status: 'invalid_status',
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(healthGoal.status()).toBe(422);
    });

    test('should retrieve health goals for authenticated user', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      
      // Create a goal first
      await page.request.post('/api/health/goals', {
        data: {
          type_id: 1,
          target_value: 65.0,
          target_date: futureDate.toISOString(),
          status: 'active',
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      const goals = await page.request.get('/api/health/goals', {
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(goals.status()).toBe(200);
      
      const goalsJson = await goals.json();
      expect(Array.isArray(goalsJson.data)).toBe(true);
      expect(goalsJson.data.length).toBeGreaterThan(0);
    });

    test('should update goal status', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      
      // Create a goal first
      const createResponse = await page.request.post('/api/health/goals', {
        data: {
          type_id: 1,
          target_value: 65.0,
          target_date: futureDate.toISOString(),
          status: 'active',
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      const createdGoal = await createResponse.json();
      
      // Update the goal status
      const updateResponse = await page.request.patch(`/api/health/goals/${createdGoal.id}`, {
        data: {
          status: 'completed',
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(updateResponse.status()).toBe(200);
      
      const updatedGoal = await updateResponse.json();
      expect(updatedGoal.status).toBe('completed');
    });
  });

  test.describe('Health Reminders API', () => {
    test('should create a new health reminder with valid data', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      const healthReminder = await page.request.post('/api/health/reminders', {
        data: {
          type_id: 1,
          cron_expr: '0 9 * * *',
          message: 'Time to weigh yourself!',
          active: true,
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(healthReminder.status()).toBe(201);
      
      const reminderJson = await healthReminder.json();
      expect(reminderJson).toHaveProperty('id');
      expect(reminderJson.type_id).toBe(1);
      expect(reminderJson.cron_expr).toBe('0 9 * * *');
      expect(reminderJson.message).toBe('Time to weigh yourself!');
      expect(reminderJson.active).toBe(true);
    });

    test('shouldn\'t create a reminder with invalid cron expression', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      const healthReminder = await page.request.post('/api/health/reminders', {
        data: {
          type_id: 1,
          cron_expr: 'invalid cron',
          message: 'Time to weigh yourself!',
          active: true,
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(healthReminder.status()).toBe(422);
    });

    test('shouldn\'t create a reminder with empty message', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      const healthReminder = await page.request.post('/api/health/reminders', {
        data: {
          type_id: 1,
          cron_expr: '0 9 * * *',
          message: '',
          active: true,
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(healthReminder.status()).toBe(422);
    });

    test('should retrieve health reminders for authenticated user', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      // Create a reminder first
      await page.request.post('/api/health/reminders', {
        data: {
          type_id: 1,
          cron_expr: '0 9 * * *',
          message: 'Time to weigh yourself!',
          active: true,
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      const reminders = await page.request.get('/api/health/reminders', {
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(reminders.status()).toBe(200);
      
      const remindersJson = await reminders.json();
      expect(Array.isArray(remindersJson.data)).toBe(true);
      expect(remindersJson.data.length).toBeGreaterThan(0);
    });

    test('should update reminder activation status', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      // Create a reminder first
      const createResponse = await page.request.post('/api/health/reminders', {
        data: {
          type_id: 1,
          cron_expr: '0 9 * * *',
          message: 'Time to weigh yourself!',
          active: true,
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      const createdReminder = await createResponse.json();
      
      // Deactivate the reminder
      const updateResponse = await page.request.patch(`/api/health/reminders/${createdReminder.id}`, {
        data: {
          active: false,
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(updateResponse.status()).toBe(200);
      
      const updatedReminder = await updateResponse.json();
      expect(updatedReminder.active).toBe(false);
    });
  });

  test.describe('Health Analytics API', () => {
    test('should retrieve analytics data for a specific health type', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      // Create some health records first
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      await page.request.post('/api/health/records', {
        data: {
          type_id: 1,
          value: 70.0,
          unit: 'kg',
          recorded_at: yesterday.toISOString(),
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      await page.request.post('/api/health/records', {
        data: {
          type_id: 1,
          value: 69.5,
          unit: 'kg',
          recorded_at: today.toISOString(),
        },
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      const analytics = await page.request.get('/api/health/analytics/1', {
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(analytics.status()).toBe(200);
      
      const analyticsJson = await analytics.json();
      expect(analyticsJson).toHaveProperty('data');
      expect(Array.isArray(analyticsJson.data)).toBe(true);
      expect(analyticsJson.data.length).toBeGreaterThan(0);
    });

    test('should retrieve analytics data with date range filter', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();
      
      const analytics = await page.request.get(`/api/health/analytics/1?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`, {
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(analytics.status()).toBe(200);
      
      const analyticsJson = await analytics.json();
      expect(analyticsJson).toHaveProperty('data');
      expect(analyticsJson).toHaveProperty('start_date');
      expect(analyticsJson).toHaveProperty('end_date');
    });

    test('shouldn\'t retrieve analytics for invalid health type', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      const analytics = await page.request.get('/api/health/analytics/999', {
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(analytics.status()).toBe(404);
    });

    test('shouldn\'t retrieve analytics with invalid date range', async ({ page }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 7); // End date before start date
      
      const analytics = await page.request.get(`/api/health/analytics/1?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`, {
        headers: {
          'x-e2e-random-id': e2eRandomId.toString(),
        },
      });

      expect(analytics.status()).toBe(422);
    });
  });

  test.describe('Health Reminder Trigger API', () => {
    test('should trigger reminders with valid cron secret', async ({ page }) => {
      const triggerResponse = await page.request.post('/api/health/reminders/trigger', {
        headers: {
          'Authorization': 'Bearer test-cron-secret',
        },
      });

      expect(triggerResponse.status()).toBe(200);
      
      const triggerJson = await triggerResponse.json();
      expect(triggerJson).toHaveProperty('triggered_count');
      expect(typeof triggerJson.triggered_count).toBe('number');
    });

    test('shouldn\'t trigger reminders without authentication', async ({ page }) => {
      const triggerResponse = await page.request.post('/api/health/reminders/trigger');

      expect(triggerResponse.status()).toBe(401);
    });

    test('shouldn\'t trigger reminders with invalid cron secret', async ({ page }) => {
      const triggerResponse = await page.request.post('/api/health/reminders/trigger', {
        headers: {
          'Authorization': 'Bearer invalid-secret',
        },
      });

      expect(triggerResponse.status()).toBe(401);
    });
  });

  test.describe('Authentication and Authorization', () => {
    test('shouldn\'t access health records without authentication', async ({ page }) => {
      const records = await page.request.get('/api/health/records');
      expect(records.status()).toBe(401);
    });

    test('shouldn\'t access health goals without authentication', async ({ page }) => {
      const goals = await page.request.get('/api/health/goals');
      expect(goals.status()).toBe(401);
    });

    test('shouldn\'t access health reminders without authentication', async ({ page }) => {
      const reminders = await page.request.get('/api/health/reminders');
      expect(reminders.status()).toBe(401);
    });

    test('shouldn\'t access analytics without authentication', async ({ page }) => {
      const analytics = await page.request.get('/api/health/analytics/1');
      expect(analytics.status()).toBe(401);
    });
  });

  test.describe('Data Isolation', () => {
    test('should isolate health records between different users', async ({ page }) => {
      const user1Id = faker.number.int({ max: 1000000 });
      const user2Id = faker.number.int({ max: 1000000 });
      
      // Create record for user 1
      await page.request.post('/api/health/records', {
        data: {
          type_id: 1,
          value: 70.0,
          unit: 'kg',
          recorded_at: new Date().toISOString(),
        },
        headers: {
          'x-e2e-random-id': user1Id.toString(),
        },
      });

      // Create record for user 2
      await page.request.post('/api/health/records', {
        data: {
          type_id: 1,
          value: 80.0,
          unit: 'kg',
          recorded_at: new Date().toISOString(),
        },
        headers: {
          'x-e2e-random-id': user2Id.toString(),
        },
      });

      // Get records for user 1
      const user1Records = await page.request.get('/api/health/records', {
        headers: {
          'x-e2e-random-id': user1Id.toString(),
        },
      });

      // Get records for user 2
      const user2Records = await page.request.get('/api/health/records', {
        headers: {
          'x-e2e-random-id': user2Id.toString(),
        },
      });

      const user1Json = await user1Records.json();
      const user2Json = await user2Records.json();

      // Verify data isolation
      expect(user1Json.data.some((record: any) => record.value === 80.0)).toBe(false);
      expect(user2Json.data.some((record: any) => record.value === 70.0)).toBe(false);
    });
  });
});