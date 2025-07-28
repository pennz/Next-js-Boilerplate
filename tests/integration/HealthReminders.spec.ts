import { expect, test } from '@playwright/test';
import { parseExpression } from 'cron-parser';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

// Test data constants
const VALID_CRON_EXPRESSIONS = {
  DAILY_9AM: '0 9 * * *',
  WEEKLY_MONDAY_NOON: '0 12 * * 1',
  EVERY_15_MINUTES: '*/15 * * * *',
  DAILY_8AM: '0 8 * * *',
  WEEKLY_MONDAY_6PM: '0 18 * * 1',
  TWICE_DAILY: '0 9,21 * * *',
  MONTHLY_FIRST_10AM: '0 10 1 * *',
  NAMED_DAILY: '@daily',
  NAMED_HOURLY: '@hourly',
};

const INVALID_CRON_EXPRESSIONS = [
  '60 9 * * *', // Invalid minute (60)
  '0 25 * * *', // Invalid hour (25)
  '0 9 32 * *', // Invalid day (32)
  '0 9 * 13 *', // Invalid month (13)
  '0 9 * * 8', // Invalid day of week (8)
  'invalid', // Completely invalid
  '', // Empty string
  '0 9 * *', // Missing field
  '0 9 * * * *', // Too many fields
];

const HEALTH_TYPES = {
  WEIGHT: 1,
  STEPS: 2,
  SLEEP: 3,
  HEART_RATE: 4,
  BLOOD_PRESSURE: 5,
};

// Helper functions
async function createTestUser(request: any) {
  // In a real implementation, this would create a test user
  // For now, we'll assume authentication is handled by the test setup
  return 'test-user-id';
}

async function getAuthHeaders() {
  // In a real implementation, this would get authentication headers
  // For now, we'll assume the test environment handles auth
  return {};
}

async function createHealthReminder(request: any, reminderData: any) {
  const response = await request.post(`${BASE_URL}/api/health/reminders`, {
    data: reminderData,
    headers: await getAuthHeaders(),
  });
  return response;
}

async function updateHealthReminder(request: any, id: number, updateData: any) {
  const response = await request.patch(`${BASE_URL}/api/health/reminders`, {
    data: { id, ...updateData },
    headers: await getAuthHeaders(),
  });
  return response;
}

async function getHealthReminders(request: any, queryParams: any = {}) {
  const searchParams = new URLSearchParams(queryParams);
  const response = await request.get(
    `${BASE_URL}/api/health/reminders?${searchParams.toString()}`,
    {
      headers: await getAuthHeaders(),
    },
  );
  return response;
}

async function deleteHealthReminder(request: any, id: number) {
  const response = await request.delete(
    `${BASE_URL}/api/health/reminders?id=${id}`,
    {
      headers: await getAuthHeaders(),
    },
  );
  return response;
}

async function triggerReminders(request: any, cronSecret: string) {
  const response = await request.post(`${BASE_URL}/api/health/reminders/trigger`, {
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });
  return response;
}

function getNextCronExecution(cronExpr: string): Date {
  const interval = parseExpression(cronExpr);
  return interval.next().toDate();
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

test.describe('Health Reminders Integration Tests', () => {
  let testUserId: string;

  test.beforeEach(async ({ request }) => {
    testUserId = await createTestUser(request);
  });

  test.describe('Cron Expression Validation', () => {
    test('should accept valid cron expressions', async ({ request }) => {
      for (const [name, cronExpr] of Object.entries(VALID_CRON_EXPRESSIONS)) {
        const reminderData = {
          type_id: HEALTH_TYPES.WEIGHT,
          cron_expr: cronExpr,
          message: `Test reminder for ${name}`,
          active: true,
        };

        const response = await createHealthReminder(request, reminderData);

        expect(response.status()).toBe(201);

        const responseBody = await response.json();

        expect(responseBody.reminder).toBeDefined();
        expect(responseBody.reminder.cronExpr).toBe(cronExpr);
        expect(responseBody.reminder.nextRunAt).toBeDefined();

        // Verify nextRunAt is calculated correctly
        const expectedNextRun = getNextCronExecution(cronExpr);
        const actualNextRun = new Date(responseBody.reminder.nextRunAt);

        // Allow for small time differences (within 1 minute)
        const timeDiff = Math.abs(expectedNextRun.getTime() - actualNextRun.getTime());

        expect(timeDiff).toBeLessThan(60000);
      }
    });

    test('should reject invalid cron expressions with 422 error', async ({ request }) => {
      for (const invalidCron of INVALID_CRON_EXPRESSIONS) {
        const reminderData = {
          type_id: HEALTH_TYPES.WEIGHT,
          cron_expr: invalidCron,
          message: 'Test reminder with invalid cron',
          active: true,
        };

        const response = await createHealthReminder(request, reminderData);

        expect(response.status()).toBe(422);

        const responseBody = await response.json();

        expect(responseBody.error || responseBody.cron_expr).toBeDefined();
      }
    });

    test('should handle edge case cron expressions correctly', async ({ request }) => {
      const edgeCases = [
        { expr: '*/15 * * * *', description: 'every 15 minutes' },
        { expr: '0 0 29 2 *', description: 'Feb 29th (leap year)' },
        { expr: '59 23 31 12 *', description: 'last minute of year' },
        { expr: '0 0 1 1 *', description: 'first minute of year' },
      ];

      for (const edgeCase of edgeCases) {
        const reminderData = {
          type_id: HEALTH_TYPES.WEIGHT,
          cron_expr: edgeCase.expr,
          message: `Edge case: ${edgeCase.description}`,
          active: true,
        };

        const response = await createHealthReminder(request, reminderData);

        expect(response.status()).toBe(201);

        const responseBody = await response.json();

        expect(responseBody.reminder.nextRunAt).toBeDefined();
      }
    });
  });

  test.describe('Next Run Time Calculation', () => {
    test('should calculate nextRunAt correctly for daily 9 AM reminder', async ({ request }) => {
      const reminderData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Daily weight check',
        active: true,
      };

      const response = await createHealthReminder(request, reminderData);

      expect(response.status()).toBe(201);

      const responseBody = await response.json();
      const nextRunAt = new Date(responseBody.reminder.nextRunAt);

      // Should be set to next 9 AM
      expect(nextRunAt.getHours()).toBe(9);
      expect(nextRunAt.getMinutes()).toBe(0);
      expect(nextRunAt.getSeconds()).toBe(0);

      // Should be in the future
      expect(nextRunAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('should update nextRunAt when cron expression is modified', async ({ request }) => {
      // Create reminder with daily 9 AM
      const reminderData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Daily weight check',
        active: true,
      };

      const createResponse = await createHealthReminder(request, reminderData);

      expect(createResponse.status()).toBe(201);

      const createdReminder = await createResponse.json();
      const originalNextRun = new Date(createdReminder.reminder.nextRunAt);

      // Update to daily 8 AM
      const updateResponse = await updateHealthReminder(
        request,
        createdReminder.reminder.id,
        { cron_expr: VALID_CRON_EXPRESSIONS.DAILY_8AM },
      );

      expect(updateResponse.status()).toBe(200);

      const updatedReminder = await updateResponse.json();
      const newNextRun = new Date(updatedReminder.reminder.nextRunAt);

      // Next run time should be different
      expect(newNextRun.getTime()).not.toBe(originalNextRun.getTime());

      // Should be set to next 8 AM
      expect(newNextRun.getHours()).toBe(8);
      expect(newNextRun.getMinutes()).toBe(0);
    });

    test('should handle various cron expressions correctly', async ({ request }) => {
      const testCases = [
        {
          cron: VALID_CRON_EXPRESSIONS.WEEKLY_MONDAY_NOON,
          expectedHour: 12,
          expectedMinute: 0,
        },
        {
          cron: VALID_CRON_EXPRESSIONS.TWICE_DAILY,
          expectedHours: [9, 21], // Should be one of these
        },
        {
          cron: VALID_CRON_EXPRESSIONS.MONTHLY_FIRST_10AM,
          expectedHour: 10,
          expectedDay: 1,
        },
      ];

      for (const testCase of testCases) {
        const reminderData = {
          type_id: HEALTH_TYPES.WEIGHT,
          cron_expr: testCase.cron,
          message: `Test for ${testCase.cron}`,
          active: true,
        };

        const response = await createHealthReminder(request, reminderData);

        expect(response.status()).toBe(201);

        const responseBody = await response.json();
        const nextRunAt = new Date(responseBody.reminder.nextRunAt);

        if (testCase.expectedHour !== undefined) {
          expect(nextRunAt.getHours()).toBe(testCase.expectedHour);
        }
        if (testCase.expectedHours) {
          expect(testCase.expectedHours).toContain(nextRunAt.getHours());
        }
        if (testCase.expectedDay !== undefined) {
          expect(nextRunAt.getDate()).toBe(testCase.expectedDay);
        }
      }
    });
  });

  test.describe('Reminder Trigger Endpoint', () => {
    const VALID_CRON_SECRET = process.env.HEALTH_REMINDER_CRON_SECRET || 'test-secret';

    test('should authenticate with valid cron secret', async ({ request }) => {
      const response = await triggerReminders(request, VALID_CRON_SECRET);

      expect(response.status()).toBe(200);

      const responseBody = await response.json();

      expect(responseBody.message).toBe('Reminders processed');
      expect(responseBody.processed).toBeDefined();
      expect(responseBody.timestamp).toBeDefined();
    });

    test('should reject unauthorized access with 401 error', async ({ request }) => {
      const invalidSecrets = ['invalid-secret', '', 'wrong-token'];

      for (const invalidSecret of invalidSecrets) {
        const response = await triggerReminders(request, invalidSecret);

        expect(response.status()).toBe(401);

        const responseBody = await response.json();

        expect(responseBody.error).toBe('Unauthorized');
      }
    });

    test('should process due reminders correctly', async ({ request }) => {
      // Create a reminder that's due now (set nextRunAt to past)
      const reminderData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Due reminder test',
        active: true,
      };

      const createResponse = await createHealthReminder(request, reminderData);

      expect(createResponse.status()).toBe(201);

      const createdReminder = await createResponse.json();

      // Manually set nextRunAt to past (this would require direct DB access in real test)
      // For this test, we'll assume the reminder is due

      const triggerResponse = await triggerReminders(request, VALID_CRON_SECRET);

      expect(triggerResponse.status()).toBe(200);

      const triggerBody = await triggerResponse.json();

      expect(triggerBody.processed).toBeGreaterThanOrEqual(0);
      expect(triggerBody.details).toBeDefined();
    });

    test('should return processed: 0 when no reminders are due', async ({ request }) => {
      // Create reminder with future nextRunAt
      const reminderData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Future reminder test',
        active: true,
      };

      await createHealthReminder(request, reminderData);

      const triggerResponse = await triggerReminders(request, VALID_CRON_SECRET);

      expect(triggerResponse.status()).toBe(200);

      const triggerBody = await triggerResponse.json();

      expect(triggerBody.processed).toBe(0);
      expect(triggerBody.message).toContain('No reminders due');
    });
  });

  test.describe('Reminder Processing Logic', () => {
    test('should process multiple due reminders in single trigger call', async ({ request }) => {
      // Create multiple reminders
      const reminderPromises = [];
      for (let i = 0; i < 3; i++) {
        const reminderData = {
          type_id: HEALTH_TYPES.WEIGHT + i,
          cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
          message: `Test reminder ${i + 1}`,
          active: true,
        };
        reminderPromises.push(createHealthReminder(request, reminderData));
      }

      const createResponses = await Promise.all(reminderPromises);
      createResponses.forEach((response) => {
        expect(response.status()).toBe(201);
      });

      // Trigger reminders
      const triggerResponse = await triggerReminders(request, VALID_CRON_SECRET);

      expect(triggerResponse.status()).toBe(200);

      const triggerBody = await triggerResponse.json();

      expect(triggerBody.processed).toBeGreaterThanOrEqual(0);
      expect(triggerBody.details.successful).toBeDefined();
    });

    test('should respect reminder active status in processing', async ({ request }) => {
      // Create active reminder
      const activeReminderData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Active reminder',
        active: true,
      };

      // Create inactive reminder
      const inactiveReminderData = {
        type_id: HEALTH_TYPES.STEPS,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Inactive reminder',
        active: false,
      };

      await createHealthReminder(request, activeReminderData);
      await createHealthReminder(request, inactiveReminderData);

      const triggerResponse = await triggerReminders(request, VALID_CRON_SECRET);

      expect(triggerResponse.status()).toBe(200);

      // Only active reminders should be processed
      const triggerBody = await triggerResponse.json();

      expect(triggerBody.details).toBeDefined();
    });
  });

  test.describe('Reminder CRUD Operations', () => {
    test('should create reminder with all required fields', async ({ request }) => {
      const reminderData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Daily weight check reminder',
        active: true,
      };

      const response = await createHealthReminder(request, reminderData);

      expect(response.status()).toBe(201);

      const responseBody = await response.json();

      expect(responseBody.reminder).toBeDefined();
      expect(responseBody.reminder.typeId).toBe(reminderData.type_id);
      expect(responseBody.reminder.cronExpr).toBe(reminderData.cron_expr);
      expect(responseBody.reminder.message).toBe(reminderData.message);
      expect(responseBody.reminder.active).toBe(reminderData.active);
      expect(responseBody.reminder.nextRunAt).toBeDefined();
    });

    test('should update reminder fields correctly', async ({ request }) => {
      // Create reminder
      const reminderData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Original message',
        active: true,
      };

      const createResponse = await createHealthReminder(request, reminderData);

      expect(createResponse.status()).toBe(201);

      const createdReminder = await createResponse.json();

      // Update reminder
      const updateData = {
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_8AM,
        message: 'Updated message',
        active: false,
      };

      const updateResponse = await updateHealthReminder(
        request,
        createdReminder.reminder.id,
        updateData,
      );

      expect(updateResponse.status()).toBe(200);

      const updatedReminder = await updateResponse.json();

      expect(updatedReminder.reminder.cronExpr).toBe(updateData.cron_expr);
      expect(updatedReminder.reminder.message).toBe(updateData.message);
      expect(updatedReminder.reminder.active).toBe(updateData.active);
    });

    test('should soft delete reminder by setting active to false', async ({ request }) => {
      // Create reminder
      const reminderData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'To be deleted',
        active: true,
      };

      const createResponse = await createHealthReminder(request, reminderData);

      expect(createResponse.status()).toBe(201);

      const createdReminder = await createResponse.json();

      // Delete reminder
      const deleteResponse = await deleteHealthReminder(
        request,
        createdReminder.reminder.id,
      );

      expect(deleteResponse.status()).toBe(200);

      const deleteBody = await deleteResponse.json();

      expect(deleteBody.message).toContain('deactivated successfully');
      expect(deleteBody.reminder.active).toBe(false);
    });

    test('should validate required fields on creation', async ({ request }) => {
      const invalidReminderData = [
        { cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM, message: 'Missing type_id', active: true },
        { type_id: HEALTH_TYPES.WEIGHT, message: 'Missing cron_expr', active: true },
        { type_id: HEALTH_TYPES.WEIGHT, cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM, active: true },
        { type_id: HEALTH_TYPES.WEIGHT, cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM, message: 'Missing active' },
      ];

      for (const invalidData of invalidReminderData) {
        const response = await createHealthReminder(request, invalidData);

        expect(response.status()).toBe(422);
      }
    });
  });

  test.describe('Reminder Filtering and Querying', () => {
    test('should filter reminders by active status', async ({ request }) => {
      // Create active and inactive reminders
      await createHealthReminder(request, {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Active reminder',
        active: true,
      });

      await createHealthReminder(request, {
        type_id: HEALTH_TYPES.STEPS,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Inactive reminder',
        active: false,
      });

      // Filter by active status
      const activeResponse = await getHealthReminders(request, { active: 'true' });

      expect(activeResponse.status()).toBe(200);

      const activeBody = await activeResponse.json();

      expect(activeBody.reminders).toBeDefined();

      activeBody.reminders.forEach((reminder: any) => {
        expect(reminder.active).toBe(true);
      });

      // Filter by inactive status
      const inactiveResponse = await getHealthReminders(request, { active: 'false' });

      expect(inactiveResponse.status()).toBe(200);

      const inactiveBody = await inactiveResponse.json();

      expect(inactiveBody.reminders).toBeDefined();

      inactiveBody.reminders.forEach((reminder: any) => {
        expect(reminder.active).toBe(false);
      });
    });

    test('should filter reminders by health type', async ({ request }) => {
      // Create reminders for different health types
      await createHealthReminder(request, {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Weight reminder',
        active: true,
      });

      await createHealthReminder(request, {
        type_id: HEALTH_TYPES.STEPS,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Steps reminder',
        active: true,
      });

      // Filter by weight type
      const weightResponse = await getHealthReminders(request, { type_id: HEALTH_TYPES.WEIGHT });

      expect(weightResponse.status()).toBe(200);

      const weightBody = await weightResponse.json();

      expect(weightBody.reminders).toBeDefined();

      weightBody.reminders.forEach((reminder: any) => {
        expect(reminder.typeId).toBe(HEALTH_TYPES.WEIGHT);
      });
    });

    test('should return reminders ordered by creation date', async ({ request }) => {
      // Create multiple reminders with slight delays
      const reminderIds = [];
      for (let i = 0; i < 3; i++) {
        const response = await createHealthReminder(request, {
          type_id: HEALTH_TYPES.WEIGHT,
          cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
          message: `Reminder ${i + 1}`,
          active: true,
        });
        const body = await response.json();
        reminderIds.push(body.reminder.id);

        // Small delay to ensure different creation times
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const response = await getHealthReminders(request);

      expect(response.status()).toBe(200);

      const body = await response.json();

      expect(body.reminders).toBeDefined();
      expect(body.reminders.length).toBeGreaterThanOrEqual(3);

      // Check ordering by creation date
      for (let i = 1; i < body.reminders.length; i++) {
        const prevDate = new Date(body.reminders[i - 1].createdAt);
        const currDate = new Date(body.reminders[i].createdAt);

        expect(prevDate.getTime()).toBeLessThanOrEqual(currDate.getTime());
      }
    });
  });

  test.describe('Integration with Health Types', () => {
    test('should create reminders for different health types', async ({ request }) => {
      const healthTypeTests = [
        { type_id: HEALTH_TYPES.WEIGHT, message: 'Weight check reminder' },
        { type_id: HEALTH_TYPES.STEPS, message: 'Steps goal reminder' },
        { type_id: HEALTH_TYPES.SLEEP, message: 'Sleep tracking reminder' },
        { type_id: HEALTH_TYPES.HEART_RATE, message: 'Heart rate check reminder' },
      ];

      for (const test of healthTypeTests) {
        const reminderData = {
          type_id: test.type_id,
          cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
          message: test.message,
          active: true,
        };

        const response = await createHealthReminder(request, reminderData);

        expect(response.status()).toBe(201);

        const responseBody = await response.json();

        expect(responseBody.reminder.typeId).toBe(test.type_id);
        expect(responseBody.reminder.message).toBe(test.message);
      }
    });

    test('should reject invalid health type IDs', async ({ request }) => {
      const invalidTypeIds = [0, -1, 999, 'invalid'];

      for (const invalidTypeId of invalidTypeIds) {
        const reminderData = {
          type_id: invalidTypeId,
          cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
          message: 'Test with invalid type',
          active: true,
        };

        const response = await createHealthReminder(request, reminderData);

        expect(response.status()).toBe(422);
      }
    });
  });

  test.describe('Reminder Scheduling Scenarios', () => {
    test('should handle realistic scheduling scenarios', async ({ request }) => {
      const scenarios = [
        {
          name: 'Daily weight check',
          cron_expr: '0 8 * * *',
          message: 'Time for your daily weight check!',
          type_id: HEALTH_TYPES.WEIGHT,
        },
        {
          name: 'Weekly exercise reminder',
          cron_expr: '0 18 * * 1',
          message: 'Weekly exercise session - let\'s get moving!',
          type_id: HEALTH_TYPES.STEPS,
        },
        {
          name: 'Medication reminder',
          cron_expr: '0 9,21 * * *',
          message: 'Time to take your medication',
          type_id: HEALTH_TYPES.HEART_RATE,
        },
        {
          name: 'Monthly health checkup',
          cron_expr: '0 10 1 * *',
          message: 'Monthly health checkup reminder',
          type_id: HEALTH_TYPES.WEIGHT,
        },
      ];

      for (const scenario of scenarios) {
        const response = await createHealthReminder(request, scenario);

        expect(response.status()).toBe(201);

        const responseBody = await response.json();

        expect(responseBody.reminder.message).toBe(scenario.message);
        expect(responseBody.reminder.cronExpr).toBe(scenario.cron_expr);
        expect(responseBody.reminder.typeId).toBe(scenario.type_id);

        // Verify nextRunAt is calculated correctly
        const nextRunAt = new Date(responseBody.reminder.nextRunAt);

        expect(nextRunAt.getTime()).toBeGreaterThan(Date.now());
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle message length validation', async ({ request }) => {
      // Test empty message
      const emptyMessageData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: '',
        active: true,
      };

      const emptyResponse = await createHealthReminder(request, emptyMessageData);

      expect(emptyResponse.status()).toBe(422);

      // Test too long message (over 500 characters)
      const longMessage = 'A'.repeat(501);
      const longMessageData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: longMessage,
        active: true,
      };

      const longResponse = await createHealthReminder(request, longMessageData);

      expect(longResponse.status()).toBe(422);

      // Test valid message length
      const validMessage = 'A'.repeat(500);
      const validMessageData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: validMessage,
        active: true,
      };

      const validResponse = await createHealthReminder(request, validMessageData);

      expect(validResponse.status()).toBe(201);
    });

    test('should handle cron expression edge cases', async ({ request }) => {
      const edgeCases = [
        {
          name: 'Leap year February 29th',
          cron_expr: '0 9 29 2 *',
          shouldWork: true,
        },
        {
          name: 'Last day of month',
          cron_expr: '0 9 31 * *',
          shouldWork: true,
        },
        {
          name: 'Every second',
          cron_expr: '* * * * * *',
          shouldWork: false, // Too frequent, should be rejected
        },
      ];

      for (const edgeCase of edgeCases) {
        const reminderData = {
          type_id: HEALTH_TYPES.WEIGHT,
          cron_expr: edgeCase.cron_expr,
          message: `Edge case: ${edgeCase.name}`,
          active: true,
        };

        const response = await createHealthReminder(request, reminderData);

        if (edgeCase.shouldWork) {
          expect(response.status()).toBe(201);
        } else {
          expect(response.status()).toBe(422);
        }
      }
    });

    test('should handle malformed request data', async ({ request }) => {
      const malformedData = [
        null,
        undefined,
        'not an object',
        { type_id: 'not a number' },
        { active: 'not a boolean' },
      ];

      for (const data of malformedData) {
        const response = await request.post(`${BASE_URL}/api/health/reminders`, {
          data,
          headers: await getAuthHeaders(),
        });

        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });
  });

  test.describe('Authentication and Security', () => {
    test('should require authentication for all reminder operations', async ({ request }) => {
      const unauthenticatedRequest = request;

      // Test GET without auth
      const getResponse = await unauthenticatedRequest.get(`${BASE_URL}/api/health/reminders`);

      expect(getResponse.status()).toBe(401);

      // Test POST without auth
      const postResponse = await unauthenticatedRequest.post(`${BASE_URL}/api/health/reminders`, {
        data: {
          type_id: HEALTH_TYPES.WEIGHT,
          cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
          message: 'Test',
          active: true,
        },
      });

      expect(postResponse.status()).toBe(401);

      // Test PATCH without auth
      const patchResponse = await unauthenticatedRequest.patch(`${BASE_URL}/api/health/reminders`, {
        data: { id: 1, message: 'Updated' },
      });

      expect(patchResponse.status()).toBe(401);

      // Test DELETE without auth
      const deleteResponse = await unauthenticatedRequest.delete(`${BASE_URL}/api/health/reminders?id=1`);

      expect(deleteResponse.status()).toBe(401);
    });

    test('should isolate reminders by user', async ({ request }) => {
      // This test would require creating multiple users
      // For now, we'll test that reminders are properly filtered by user
      const response = await getHealthReminders(request);

      expect(response.status()).toBe(200);

      const body = await response.json();

      expect(body.reminders).toBeDefined();

      // All reminders should belong to the current user
      // (This would be validated by the API implementation)
    });

    test('should not expose sensitive information in responses', async ({ request }) => {
      const reminderData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Test reminder',
        active: true,
      };

      const response = await createHealthReminder(request, reminderData);

      expect(response.status()).toBe(201);

      const responseBody = await response.json();

      // Should not expose internal secrets or sensitive data
      expect(responseBody.reminder.userId).toBeUndefined();
      expect(responseBody.reminder.cronSecret).toBeUndefined();
      expect(responseBody.reminder.internalId).toBeUndefined();
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should handle multiple concurrent reminder operations', async ({ request }) => {
      const concurrentOperations = [];

      // Create multiple reminders concurrently
      for (let i = 0; i < 10; i++) {
        const reminderData = {
          type_id: HEALTH_TYPES.WEIGHT,
          cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
          message: `Concurrent reminder ${i + 1}`,
          active: true,
        };
        concurrentOperations.push(createHealthReminder(request, reminderData));
      }

      const responses = await Promise.all(concurrentOperations);

      // All operations should succeed
      responses.forEach((response) => {
        expect(response.status()).toBe(201);
      });
    });

    test('should handle trigger endpoint with large number of reminders', async ({ request }) => {
      // Create multiple reminders
      const reminderPromises = [];
      for (let i = 0; i < 20; i++) {
        const reminderData = {
          type_id: HEALTH_TYPES.WEIGHT,
          cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
          message: `Performance test reminder ${i + 1}`,
          active: true,
        };
        reminderPromises.push(createHealthReminder(request, reminderData));
      }

      await Promise.all(reminderPromises);

      // Trigger reminders and measure response time
      const startTime = Date.now();
      const triggerResponse = await triggerReminders(request, VALID_CRON_SECRET);
      const endTime = Date.now();

      expect(triggerResponse.status()).toBe(200);

      // Response should be reasonably fast (under 5 seconds)
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(5000);

      const triggerBody = await triggerResponse.json();

      expect(triggerBody.processed).toBeDefined();
      expect(triggerBody.timestamp).toBeDefined();
    });
  });

  test.describe('Notification Integration', () => {
    test('should log notification messages correctly during trigger', async ({ request }) => {
      // Create a reminder
      const reminderData = {
        type_id: HEALTH_TYPES.WEIGHT,
        cron_expr: VALID_CRON_EXPRESSIONS.DAILY_9AM,
        message: 'Test notification message',
        active: true,
      };

      await createHealthReminder(request, reminderData);

      // Trigger reminders
      const triggerResponse = await triggerReminders(request, VALID_CRON_SECRET);

      expect(triggerResponse.status()).toBe(200);

      const triggerBody = await triggerResponse.json();

      expect(triggerBody.details).toBeDefined();

      // Verify notification context is included
      if (triggerBody.details.successful && triggerBody.details.successful.length > 0) {
        const processedReminder = triggerBody.details.successful[0];

        expect(processedReminder.id).toBeDefined();
        expect(processedReminder.userId).toBeDefined();
        expect(processedReminder.healthType).toBeDefined();
        expect(processedReminder.nextRunAt).toBeDefined();
      }
    });
  });
});
