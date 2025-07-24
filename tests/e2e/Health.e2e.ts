// Third-party libraries
import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';

// Local test helpers
import {
  addHealthGoal,
  addHealthRecord,
  addHealthReminder,
  getFutureDate,
} from './helpers/healthTestHelpers';

/**
 * The x-e2e-random-id header provides a unique identifier for each test request,
 * helping to trace and isolate test runs for improved reliability and debugging.
 * This header is set in the beforeEach hook and included in all test requests.
 */

test.describe('Health Management', () => {
  let e2eRandomId: number;

  test.beforeEach(async ({ page }) => {
    e2eRandomId = faker.number.int({ max: 1000000 });
    await page.setExtraHTTPHeaders({
      'x-e2e-random-id': e2eRandomId.toString(),
    });
    await page.goto('/dashboard/health/records');
  });

  test.afterEach(async ({ page }) => {
    // Clean up any test data
    await page.goto('/dashboard/health/records');

    // Delete all records
    const recordCount = await page.getByTestId('health-record-item').count();
    for (let i = 0; i < recordCount; i++) {
      await page.getByTestId('delete-record-button').first().click();
      await page.getByRole('button', { name: 'Confirm Delete' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Clean up goals
    await page.goto('/dashboard/health/goals');
    const goalCount = await page.getByTestId('goal-card').count();
    for (let i = 0; i < goalCount; i++) {
      await page.getByTestId('delete-goal-button').first().click();
      await page.getByRole('button', { name: 'Confirm Delete' }).click();
      await page.waitForLoadState('networkidle');
    }

    // Clean up reminders
    await page.goto('/dashboard/health/reminders');
    const reminderCount = await page.getByTestId('reminder-item').count();
    for (let i = 0; i < reminderCount; i++) {
      await page.getByTestId('delete-reminder-button').first().click();
      await page.getByRole('button', { name: 'Confirm Delete' }).click();
      await page.waitForLoadState('networkidle');
    }
  });

  test.describe('Health Records', () => {
    test('should display error message when adding record with invalid value', async ({
      page,
    }) => {
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: 'Add Record' }).click();
      await page.getByLabel('Health Type').selectOption('weight');
      await page.getByLabel('Value').fill('-10');
      await page.getByRole('button', { name: 'Save Record' }).click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Value must be a positive number')).toBeVisible();
    });

    test('should add health record and validate persistence', async ({
      page,
    }) => {
      const initialRecordCount = await page.getByTestId('health-record-item').count();

      await test.step('Add new health record', async () => {
        await addHealthRecord(page, 'weight', '75.5', 'kg');
      });

      await test.step('Verify record was added successfully', async () => {
        await expect(page.getByText('Record added successfully')).toBeVisible();
        await expect(page.getByTestId('health-record-item')).toHaveCount(initialRecordCount + 1);
        await expect(page.getByText('75.5 kg')).toBeVisible();
      });
    });

    test('should edit existing health record', async ({
      page,
    }) => {
      await test.step('Create initial record', async () => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Value').fill('70.0');
        await page.getByLabel('Unit').fill('kg');
        await page.getByRole('button', { name: 'Save Record' }).click();
      });

      await test.step('Edit the record', async () => {
        await page.getByTestId('edit-record-button').first().click();
        await page.getByLabel('Value').fill('72.5');
        await page.getByRole('button', { name: 'Update Record' }).click();
        await page.waitForLoadState('networkidle');
      });

      await test.step('Verify record was updated', async () => {
        await expect(page.getByText('Record updated successfully')).toBeVisible();
        await expect(page.getByText('72.5 kg')).toBeVisible();
        await expect(page.getByText('70.0 kg')).toBeHidden();
      });
    });

    test('should delete health record', async ({
      page,
    }) => {
      await test.step('Create test record', async () => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.getByLabel('Health Type').selectOption('steps');
        await page.getByLabel('Value').fill('10000');
        await page.getByLabel('Unit').fill('steps');
        await page.getByRole('button', { name: 'Save Record' }).click();
      });

      const recordCount = await page.getByTestId('health-record-item').count();

      await test.step('Delete the record', async () => {
        await page.getByTestId('delete-record-button').first().click();
        await page.getByRole('button', { name: 'Confirm Delete' }).click();
        await page.waitForLoadState('networkidle');
      });

      await test.step('Verify record was deleted', async () => {
        await expect(page.getByText('Record deleted successfully')).toBeVisible();
        await expect(page.getByTestId('health-record-item')).toHaveCount(recordCount - 1);
      });
    });

    test('should filter records by health type', async ({
      page,
    }) => {
      await test.step('Create test records of different types', async () => {
        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Value').fill('75.0');
        await page.getByRole('button', { name: 'Save Record' }).click();

        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.getByLabel('Health Type').selectOption('blood_pressure');
        await page.getByLabel('Value').fill('120');
        await page.getByRole('button', { name: 'Save Record' }).click();
      });

      await test.step('Apply weight filter', async () => {
        await page.getByLabel('Filter by Type').selectOption('weight');
        await page.getByRole('button', { name: 'Apply Filter' }).click();
        await page.waitForLoadState('networkidle');
      });

      await test.step('Verify filtered results', async () => {
        await expect(page.getByText('75.0')).toBeVisible();
        await expect(page.getByText('120')).toBeHidden();
      });
    });
  });

  test.describe('Health Analytics', () => {
    test('should display analytics chart for weight data', async ({
      page,
    }) => {
      await page.goto('/dashboard/health/analytics/weight');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('health-chart')).toBeVisible();
      await expect(page.getByText('Weight Trend')).toBeVisible();
    });

    test('should change date range and update chart', async ({
      page,
    }) => {
      await page.goto('/dashboard/health/analytics/weight');

      await page.getByLabel('Date Range').selectOption('30_days');
      await page.getByRole('button', { name: 'Update Chart' }).click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('health-chart')).toBeVisible();
      await expect(page.getByText('Last 30 Days')).toBeVisible();
    });

    test('should export analytics data', async ({
      page,
    }) => {
      await page.goto('/dashboard/health/analytics/weight');

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export Data' }).click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toContain('weight_analytics');
    });
  });

  test.describe('Health Goals', () => {
    test('should display error when creating goal with past target date', async ({
      page,
    }) => {
      await page.goto('/dashboard/health/goals');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: 'Add Goal' }).click();
      await page.getByLabel('Health Type').selectOption('weight');
      await page.getByLabel('Target Value').fill('70');
      await page.getByLabel('Target Date').fill('2020-01-01');
      await page.getByRole('button', { name: 'Save Goal' }).click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Target date must be in the future')).toBeVisible();
    });

    test('should create and track health goal', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });
      await page.goto('/dashboard/health/goals');

      const initialGoalCount = await page.getByTestId('goal-card').count();

      await addHealthGoal(page, 'weight', '70', getFutureDate(3));

      // No need to explicitly clean up here - afterEach hook will handle it
      await expect(page.getByText('Goal created successfully')).toBeVisible();
      await expect(page.getByTestId('goal-card')).toHaveCount(initialGoalCount + 1);
      await expect(page.getByText('Target: 70')).toBeVisible();
      await expect(page.getByTestId('goal-status-active')).toBeVisible();
    });

    test('should update goal status', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });
      await page.goto('/dashboard/health/goals');

      // Create a goal first
      await page.getByRole('button', { name: 'Add Goal' }).click();
      await page.getByLabel('Health Type').selectOption('steps');
      await page.getByLabel('Target Value').fill('10000');

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      const futureDateString = futureDate.toISOString().split('T')[0];

      await page.getByLabel('Target Date').fill(futureDateString);
      await page.getByRole('button', { name: 'Save Goal' }).click();

      // Update goal status
      await page.getByTestId('goal-status-dropdown').first().selectOption('completed');
      await page.getByRole('button', { name: 'Update Status' }).click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Goal status updated')).toBeVisible();
      await expect(page.getByTestId('goal-status-completed')).toBeVisible();
    });

    test('should calculate goal progress correctly', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });
      await page.goto('/dashboard/health/goals');

      // Create a weight goal
      await page.getByRole('button', { name: 'Add Goal' }).click();
      await page.getByLabel('Health Type').selectOption('weight');
      await page.getByLabel('Target Value').fill('70');

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 2);
      const futureDateString = futureDate.toISOString().split('T')[0];

      await page.getByLabel('Target Date').fill(futureDateString);
      await page.getByRole('button', { name: 'Save Goal' }).click();

      // Add a weight record to show progress
      await page.goto('/dashboard/health/records');
      await page.getByRole('button', { name: 'Add Record' }).click();
      await page.getByLabel('Health Type').selectOption('weight');
      await page.getByLabel('Value').fill('75');
      await page.getByRole('button', { name: 'Save Record' }).click();

      // Check progress on goals page
      await page.goto('/dashboard/health/goals');

      await expect(page.getByTestId('goal-progress')).toBeVisible();
      await expect(page.getByText('Current: 75')).toBeVisible();
    });
  });

  test.describe('Health Reminders', () => {
    test('should display error for invalid cron expression', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });
      await page.goto('/dashboard/health/reminders');

      await page.getByRole('button', { name: 'Add Reminder' }).click();
      await page.getByLabel('Health Type').selectOption('weight');
      await page.getByLabel('Schedule').fill('invalid cron');
      await page.getByLabel('Message').fill('Time to weigh yourself');
      await page.getByRole('button', { name: 'Save Reminder' }).click();

      await expect(page.getByText('Invalid cron expression')).toBeVisible();
    });

    test('should create and manage health reminder', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });
      await page.goto('/dashboard/health/reminders');

      const initialReminderCount = await page.getByTestId('reminder-item').count();

      await addHealthReminder(page, 'weight', '0 9 * * *', 'Time to weigh yourself');

      // No need to explicitly clean up here - afterEach hook will handle it
      await expect(page.getByText('Reminder created successfully')).toBeVisible();
      await expect(page.getByTestId('reminder-item')).toHaveCount(initialReminderCount + 1);
      await expect(page.getByText('Time to weigh yourself')).toBeVisible();
      await expect(page.getByText('Daily at 9:00 AM')).toBeVisible();
    });

    test('should toggle reminder active status', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });
      await page.goto('/dashboard/health/reminders');

      // Create a reminder first
      await page.getByRole('button', { name: 'Add Reminder' }).click();
      await page.getByLabel('Health Type').selectOption('steps');
      await page.getByLabel('Schedule').fill('0 20 * * *'); // Daily at 8 PM
      await page.getByLabel('Message').fill('Log your daily steps');
      await page.getByRole('button', { name: 'Save Reminder' }).click();

      // Toggle reminder off
      await page.getByTestId('reminder-toggle').first().click();

      await expect(page.getByText('Reminder deactivated')).toBeVisible();
      await expect(page.getByTestId('reminder-status-inactive')).toBeVisible();

      // Toggle reminder back on
      await page.getByTestId('reminder-toggle').first().click();

      await expect(page.getByText('Reminder activated')).toBeVisible();
      await expect(page.getByTestId('reminder-status-active')).toBeVisible();
    });

    test('should display next execution time', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });
      await page.goto('/dashboard/health/reminders');

      await page.getByRole('button', { name: 'Add Reminder' }).click();
      await page.getByLabel('Health Type').selectOption('blood_pressure');
      await page.getByLabel('Schedule').fill('0 8 * * 1'); // Weekly on Monday at 8 AM
      await page.getByLabel('Message').fill('Check your blood pressure');
      await page.getByRole('button', { name: 'Save Reminder' }).click();

      await expect(page.getByTestId('next-execution')).toBeVisible();
      await expect(page.getByText('Next: Monday at 8:00 AM')).toBeVisible();
    });
  });

  test.describe('Navigation and Integration', () => {
    test('should navigate between health management pages', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });
      await page.goto('/dashboard/health');

      // Navigate to records
      await page.getByRole('link', { name: 'Health Records' }).click();

      await expect(page).toHaveURL(/.*\/dashboard\/health\/records/);
      await expect(page.getByText('Health Records')).toBeVisible();

      // Navigate to analytics
      await page.getByRole('link', { name: 'Analytics' }).click();

      await expect(page).toHaveURL(/.*\/dashboard\/health\/analytics/);
      await expect(page.getByText('Health Analytics')).toBeVisible();

      // Navigate to goals
      await page.getByRole('link', { name: 'Goals' }).click();

      await expect(page).toHaveURL(/.*\/dashboard\/health\/goals/);
      await expect(page.getByText('Health Goals')).toBeVisible();

      // Navigate to reminders
      await page.getByRole('link', { name: 'Reminders' }).click();

      await expect(page).toHaveURL(/.*\/dashboard\/health\/reminders/);
      await expect(page.getByText('Health Reminders')).toBeVisible();
    });

    test('should display health overview on dashboard', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });
      await page.goto('/dashboard/health');

      await expect(page.getByTestId('health-overview')).toBeVisible();
      await expect(page.getByText('Recent Records')).toBeVisible();
      await expect(page.getByText('Active Goals')).toBeVisible();
      await expect(page.getByText('Quick Actions')).toBeVisible();
    });

    test('should maintain data persistence across sessions', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });

      // Add a health record
      await page.goto('/dashboard/health/records');
      await page.getByRole('button', { name: 'Add Record' }).click();
      await page.getByLabel('Health Type').selectOption('weight');
      await page.getByLabel('Value').fill('80.5');
      await page.getByRole('button', { name: 'Save Record' }).click();

      // Reload page and verify data persists
      await page.reload();

      await expect(page.getByText('80.5')).toBeVisible();

      // Navigate away and back
      await page.goto('/dashboard');
      await page.goto('/dashboard/health/records');

      await expect(page.getByText('80.5')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network errors gracefully', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });

      // Simulate network failure
      await page.route('**/api/health/**', route => route.abort());

      // Clean up the route after test
      test.afterEach(async ({ page }) => {
        await page.unroute('**/api/health/**');
      });

      await page.goto('/dashboard/health/records');

      await page.getByRole('button', { name: 'Add Record' }).click();
      await page.getByLabel('Health Type').selectOption('weight');
      await page.getByLabel('Value').fill('75.0');
      await page.getByRole('button', { name: 'Save Record' }).click();

      await expect(page.getByText('Network error. Please try again.')).toBeVisible();
    });

    test('should validate required fields', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });
      await page.goto('/dashboard/health/records');

      await page.getByRole('button', { name: 'Add Record' }).click();
      await page.getByRole('button', { name: 'Save Record' }).click();

      await expect(page.getByText('Health type is required')).toBeVisible();
      await expect(page.getByText('Value is required')).toBeVisible();
    });

    test('should handle empty data states', async ({
      page,
    }) => {
      const e2eRandomId = faker.number.int({ max: 1000000 });
      await page.setExtraHTTPHeaders({
        'x-e2e-random-id': e2eRandomId.toString(),
      });
      await page.goto('/dashboard/health/analytics/weight');

      await expect(page.getByText('No data available for the selected period')).toBeVisible();
      await expect(page.getByTestId('empty-chart-state')).toBeVisible();
    });

    test('should handle unauthorized access', async ({
      page,
    }) => {
      // Test without authentication headers
      await page.goto('/dashboard/health');

      await expect(page).toHaveURL(/.*\/sign-in/);
    });
  });

  test.describe('Health Overview Page', () => {
    test('should display all main sections', async ({ page }) => {
      await page.goto('/dashboard/health');

      await expect(page.getByTestId('health-overview')).toBeVisible();
      await expect(page.getByTestId('health-overview-stats')).toBeVisible();
      await expect(page.getByTestId('health-overview-recent-records')).toBeVisible();
      await expect(page.getByTestId('health-overview-active-goals')).toBeVisible();
      await expect(page.getByTestId('health-overview-quick-actions')).toBeVisible();
      await expect(page.getByTestId('health-overview-mini-charts')).toBeVisible();
    });

    test('should update stats after adding a health record', async ({ page }) => {
      await page.goto('/dashboard/health');
      const initialTotal = await page.locator('[data-testid="health-overview-stats"] .text-2xl').first().textContent();
      await page.goto('/dashboard/health/records');
      await page.getByRole('button', { name: 'Add Record' }).click();
      await page.getByLabel('Health Type').selectOption('weight');
      await page.getByLabel('Value').fill('99.9');
      await page.getByRole('button', { name: 'Save Record' }).click();
      await page.goto('/dashboard/health');
      const updatedTotal = await page.locator('[data-testid="health-overview-stats"] .text-2xl').first().textContent();

      expect(Number(updatedTotal)).toBeGreaterThan(Number(initialTotal));
    });

    test('should show empty state when no records or goals exist', async ({ page }) => {
      // Assume test DB is clean or records/goals are deleted in beforeEach
      await page.goto('/dashboard/health');

      await expect(page.getByTestId('health-overview-recent-records')).toContainText('No recent records');
      await expect(page.getByTestId('health-overview-active-goals')).toContainText('No active goals');
    });
  });
});
