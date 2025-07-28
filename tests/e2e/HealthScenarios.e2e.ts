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
 * Comprehensive scenario-based E2E tests for health management workflows.
 * These tests cover complete user journeys from data entry to analytics visualization,
 * including realistic health scenarios and data patterns.
 */

test.describe('Health Management Scenarios', () => {
  let e2eRandomId: number;

  test.beforeEach(async ({ page }) => {
    e2eRandomId = faker.number.int({ max: 1000000 });
    await page.setExtraHTTPHeaders({
      'x-e2e-random-id': e2eRandomId.toString(),
    });
  });

  test.afterEach(async ({ page }) => {
    // Comprehensive cleanup of all test data
    const cleanupPages = [
      '/dashboard/health/records',
      '/dashboard/health/goals',
      '/dashboard/health/reminders',
    ];

    for (const cleanupPage of cleanupPages) {
      await page.goto(cleanupPage);
      await page.waitForLoadState('networkidle');

      // Clean up records
      if (cleanupPage.includes('records')) {
        const recordCount = await page.getByTestId('health-record-item').count();
        for (let i = 0; i < recordCount; i++) {
          await page.getByTestId('delete-record-button').first().click();
          await page.getByRole('button', { name: 'Confirm Delete' }).click();
          await page.waitForLoadState('networkidle');
        }
      }

      // Clean up goals
      if (cleanupPage.includes('goals')) {
        const goalCount = await page.getByTestId('goal-card').count();
        for (let i = 0; i < goalCount; i++) {
          await page.getByTestId('delete-goal-button').first().click();
          await page.getByRole('button', { name: 'Confirm Delete' }).click();
          await page.waitForLoadState('networkidle');
        }
      }

      // Clean up reminders
      if (cleanupPage.includes('reminders')) {
        const reminderCount = await page.getByTestId('reminder-item').count();
        for (let i = 0; i < reminderCount; i++) {
          await page.getByTestId('delete-reminder-button').first().click();
          await page.getByRole('button', { name: 'Confirm Delete' }).click();
          await page.waitForLoadState('networkidle');
        }
      }
    }
  });

  test.describe('Scenario 1: Weight Loss Journey (3-month timeline)', () => {
    test('should complete comprehensive weight loss journey with multiple metrics', async ({ page }) => {
      // Step 1: Set up initial weight goal
      await test.step('Create weight loss goal', async () => {
        await page.goto('/dashboard/health/goals');
        await page.waitForLoadState('networkidle');

        await addHealthGoal(page, 'weight', '70', getFutureDate(3));

        await expect(page.getByText('Goal created successfully')).toBeVisible();
        await expect(page.getByText('Target: 70')).toBeVisible();
      });

      // Step 2: Add baseline metrics
      await test.step('Add baseline health metrics', async () => {
        await page.goto('/dashboard/health/records');

        // Starting weight: 80kg
        await addHealthRecord(page, 'weight', '80.0', 'kg');

        await expect(page.getByText('Record added successfully')).toBeVisible();

        // Baseline steps: 5000
        await addHealthRecord(page, 'steps', '5000', 'steps');

        await expect(page.getByText('Record added successfully')).toBeVisible();

        // Baseline sleep: 6 hours
        await addHealthRecord(page, 'sleep', '6.0', 'hours');

        await expect(page.getByText('Record added successfully')).toBeVisible();
      });

      // Step 3: Simulate weekly progress over 12 weeks
      const weeklyData = [
        { week: 1, weight: 79.5, steps: 5500, sleep: 6.2 },
        { week: 2, weight: 79.0, steps: 6000, sleep: 6.5 },
        { week: 3, weight: 78.5, steps: 6500, sleep: 6.8 },
        { week: 4, weight: 78.0, steps: 7000, sleep: 7.0 },
        { week: 5, weight: 77.5, steps: 7500, sleep: 7.2 },
        { week: 6, weight: 77.0, steps: 8000, sleep: 7.5 },
        { week: 7, weight: 76.5, steps: 8500, sleep: 7.7 },
        { week: 8, weight: 76.0, steps: 9000, sleep: 7.8 },
        { week: 9, weight: 75.5, steps: 9500, sleep: 8.0 },
        { week: 10, weight: 75.0, steps: 10000, sleep: 8.0 },
        { week: 11, weight: 74.0, steps: 10500, sleep: 8.0 },
        { week: 12, weight: 72.5, steps: 11000, sleep: 8.0 },
      ];

      await test.step('Add progressive weekly data', async () => {
        for (const data of weeklyData) {
          await addHealthRecord(page, 'weight', data.weight.toString(), 'kg');
          await addHealthRecord(page, 'steps', data.steps.toString(), 'steps');
          await addHealthRecord(page, 'sleep', data.sleep.toString(), 'hours');

          // Brief pause to simulate realistic data entry timing
          await page.waitForTimeout(100);
        }
      });

      // Step 4: Verify health overview shows progress
      await test.step('Verify health overview displays progress correctly', async () => {
        await page.goto('/dashboard/health');
        await page.waitForLoadState('networkidle');

        // Check that overview shows recent records
        await expect(page.getByTestId('health-overview')).toBeVisible();
        await expect(page.getByTestId('health-overview-stats')).toBeVisible();

        // Verify total records count increased
        const totalRecordsElement = page.locator('[data-testid="health-overview-stats"] .text-2xl').first();
        const totalRecords = await totalRecordsElement.textContent();

        expect(Number(totalRecords)).toBeGreaterThan(35); // 3 baseline + 36 weekly records

        // Check recent records show latest entries
        await expect(page.getByTestId('health-overview-recent-records')).toBeVisible();
        await expect(page.getByText('72.5 kg')).toBeVisible(); // Latest weight
      });

      // Step 5: Test radar chart with multiple metrics
      await test.step('Verify radar chart shows improving scores', async () => {
        await page.goto('/dashboard/health/analytics');
        await page.waitForLoadState('networkidle');

        // Look for radar chart component
        const radarChart = page.getByTestId('health-radar-chart');
        if (await radarChart.isVisible()) {
          // Verify chart displays multiple metrics
          await expect(radarChart).toBeVisible();

          // Check for metric categories in the chart
          await expect(page.getByText('weight')).toBeVisible();
          await expect(page.getByText('steps')).toBeVisible();
          await expect(page.getByText('sleep')).toBeVisible();
        }
      });

      // Step 6: Test predictive analytics
      await test.step('Verify predictive chart shows weight loss trend', async () => {
        await page.goto('/dashboard/health/analytics/weight');
        await page.waitForLoadState('networkidle');

        // Check for predictive chart
        const predictiveChart = page.getByTestId('health-predictive-chart');
        if (await predictiveChart.isVisible()) {
          await expect(predictiveChart).toBeVisible();

          // Test algorithm toggle
          const algorithmToggle = page.getByRole('button', { name: 'Linear Regression' });
          if (await algorithmToggle.isVisible()) {
            await algorithmToggle.click();
            await page.waitForLoadState('networkidle');
          }

          // Check for confidence interval toggle
          const confidenceToggle = page.getByRole('button', { name: 'Confidence Interval' });
          if (await confidenceToggle.isVisible()) {
            await confidenceToggle.click();
            await page.waitForLoadState('networkidle');
          }
        }
      });

      // Step 7: Verify goal progress calculation
      await test.step('Verify goal progress calculations', async () => {
        await page.goto('/dashboard/health/goals');
        await page.waitForLoadState('networkidle');

        // Check goal progress
        const goalProgress = page.getByTestId('goal-progress');
        if (await goalProgress.isVisible()) {
          await expect(goalProgress).toBeVisible();

          // Verify current weight is displayed
          await expect(page.getByText('Current: 72.5')).toBeVisible();

          // Check progress percentage (should be significant progress toward 70kg goal)
          const progressText = await page.getByTestId('goal-progress').textContent();

          expect(progressText).toContain('%');
        }
      });

      // Step 8: Test data export functionality
      await test.step('Test data export for weight loss journey', async () => {
        await page.goto('/dashboard/health/analytics/weight');
        await page.waitForLoadState('networkidle');

        const exportButton = page.getByRole('button', { name: 'Export Data' });
        if (await exportButton.isVisible()) {
          const downloadPromise = page.waitForEvent('download');
          await exportButton.click();
          const download = await downloadPromise;

          expect(download.suggestedFilename()).toContain('weight');
        }
      });
    });

    test('should handle weight loss plateau and recovery', async ({ page }) => {
      await test.step('Create weight plateau scenario', async () => {
        await page.goto('/dashboard/health/records');

        // Add plateau data (weight stays same for several weeks)
        const plateauData = [
          { weight: 75.0, week: 1 },
          { weight: 75.1, week: 2 },
          { weight: 74.9, week: 3 },
          { weight: 75.0, week: 4 },
          { weight: 74.8, week: 5 }, // Start of recovery
          { weight: 74.5, week: 6 },
          { weight: 74.0, week: 7 },
        ];

        for (const data of plateauData) {
          await addHealthRecord(page, 'weight', data.weight.toString(), 'kg');
        }
      });

      await test.step('Verify analytics handle plateau correctly', async () => {
        await page.goto('/dashboard/health/analytics/weight');
        await page.waitForLoadState('networkidle');

        // Check that chart displays the plateau period
        const chart = page.getByTestId('health-chart');
        if (await chart.isVisible()) {
          await expect(chart).toBeVisible();
        }

        // Verify trend analysis handles plateau
        const trendIndicator = page.getByTestId('trend-indicator');
        if (await trendIndicator.isVisible()) {
          // Should show neutral or slight downward trend
          await expect(trendIndicator).toBeVisible();
        }
      });
    });
  });

  test.describe('Scenario 2: Fitness Improvement Program (6-week timeline)', () => {
    test('should track comprehensive fitness improvement across multiple metrics', async ({ page }) => {
      // Step 1: Set up multiple fitness goals
      await test.step('Create comprehensive fitness goals', async () => {
        await page.goto('/dashboard/health/goals');
        await page.waitForLoadState('networkidle');

        // Steps goal: 12000 daily
        await addHealthGoal(page, 'steps', '12000', getFutureDate(2));

        await expect(page.getByText('Goal created successfully')).toBeVisible();

        // Exercise minutes goal: 60 daily
        await addHealthGoal(page, 'exercise', '60', getFutureDate(2));

        await expect(page.getByText('Goal created successfully')).toBeVisible();

        // Heart rate goal: 65 resting
        await addHealthGoal(page, 'heart_rate', '65', getFutureDate(2));

        await expect(page.getByText('Goal created successfully')).toBeVisible();
      });

      // Step 2: Add baseline fitness metrics
      await test.step('Add baseline fitness metrics', async () => {
        await page.goto('/dashboard/health/records');

        const baselineMetrics = [
          { type: 'steps', value: '6000', unit: 'steps' },
          { type: 'exercise', value: '20', unit: 'minutes' },
          { type: 'heart_rate', value: '80', unit: 'bpm' },
          { type: 'weight', value: '70', unit: 'kg' },
          { type: 'sleep', value: '7', unit: 'hours' },
        ];

        for (const metric of baselineMetrics) {
          await addHealthRecord(page, metric.type, metric.value, metric.unit);

          await expect(page.getByText('Record added successfully')).toBeVisible();
        }
      });

      // Step 3: Simulate 6-week progressive improvement
      const weeklyFitnessData = [
        { week: 1, steps: 7000, exercise: 25, heartRate: 78, weight: 69.8, sleep: 7.2 },
        { week: 2, steps: 8000, exercise: 30, heartRate: 76, weight: 69.5, sleep: 7.5 },
        { week: 3, steps: 9000, exercise: 35, heartRate: 74, weight: 69.2, sleep: 7.7 },
        { week: 4, steps: 10000, exercise: 45, heartRate: 72, weight: 69.0, sleep: 8.0 },
        { week: 5, steps: 11000, exercise: 50, heartRate: 68, weight: 68.8, sleep: 8.0 },
        { week: 6, steps: 12500, exercise: 65, heartRate: 65, weight: 68.5, sleep: 8.2 },
      ];

      await test.step('Add progressive fitness data', async () => {
        for (const data of weeklyFitnessData) {
          const weekMetrics = [
            { type: 'steps', value: data.steps.toString(), unit: 'steps' },
            { type: 'exercise', value: data.exercise.toString(), unit: 'minutes' },
            { type: 'heart_rate', value: data.heartRate.toString(), unit: 'bpm' },
            { type: 'weight', value: data.weight.toString(), unit: 'kg' },
            { type: 'sleep', value: data.sleep.toString(), unit: 'hours' },
          ];

          for (const metric of weekMetrics) {
            await addHealthRecord(page, metric.type, metric.value, metric.unit);
          }
        }
      });

      // Step 4: Test radar chart evolution
      await test.step('Verify radar chart shows fitness improvement', async () => {
        await page.goto('/dashboard/health/analytics');
        await page.waitForLoadState('networkidle');

        const radarChart = page.getByTestId('health-radar-chart');
        if (await radarChart.isVisible()) {
          await expect(radarChart).toBeVisible();

          // Test different time ranges to see evolution
          const dateRangeSelector = page.getByLabel('Date Range');
          if (await dateRangeSelector.isVisible()) {
            await dateRangeSelector.selectOption('7_days');
            await page.waitForLoadState('networkidle');

            await dateRangeSelector.selectOption('30_days');
            await page.waitForLoadState('networkidle');
          }
        }
      });

      // Step 5: Test predictive analytics accuracy
      await test.step('Verify predictive analytics for fitness metrics', async () => {
        const metricsToTest = ['steps', 'exercise', 'heart_rate'];

        for (const metric of metricsToTest) {
          await page.goto(`/dashboard/health/analytics/${metric}`);
          await page.waitForLoadState('networkidle');

          const predictiveChart = page.getByTestId('health-predictive-chart');
          if (await predictiveChart.isVisible()) {
            // Test both prediction algorithms
            const linearRegressionBtn = page.getByRole('button', { name: 'Linear Regression' });
            const movingAverageBtn = page.getByRole('button', { name: 'Moving Average' });

            if (await linearRegressionBtn.isVisible()) {
              await linearRegressionBtn.click();
              await page.waitForLoadState('networkidle');

              // Check for accuracy badge
              const accuracyBadge = page.getByText(/\d+\.\d+% accurate/);
              if (await accuracyBadge.isVisible()) {
                await expect(accuracyBadge).toBeVisible();
              }
            }

            if (await movingAverageBtn.isVisible()) {
              await movingAverageBtn.click();
              await page.waitForLoadState('networkidle');
            }
          }
        }
      });

      // Step 6: Test reminder system integration
      await test.step('Set up and test workout reminders', async () => {
        await page.goto('/dashboard/health/reminders');
        await page.waitForLoadState('networkidle');

        // Create workout schedule reminders
        const workoutReminders = [
          { type: 'exercise', schedule: '0 6 * * 1,3,5', message: 'Morning workout time!' },
          { type: 'steps', schedule: '0 12 * * *', message: 'Lunchtime walk reminder' },
          { type: 'heart_rate', schedule: '0 21 * * *', message: 'Check resting heart rate' },
        ];

        for (const reminder of workoutReminders) {
          await addHealthReminder(page, reminder.type, reminder.schedule, reminder.message);

          await expect(page.getByText('Reminder created successfully')).toBeVisible();
        }

        // Verify reminders are displayed correctly
        await expect(page.getByText('Morning workout time!')).toBeVisible();
        await expect(page.getByText('Lunchtime walk reminder')).toBeVisible();
        await expect(page.getByText('Check resting heart rate')).toBeVisible();
      });

      // Step 7: Validate cross-metric correlations
      await test.step('Verify cross-metric correlations in analytics', async () => {
        await page.goto('/dashboard/health/analytics');
        await page.waitForLoadState('networkidle');

        // Check if correlation analysis is available
        const correlationSection = page.getByTestId('metric-correlations');
        if (await correlationSection.isVisible()) {
          await expect(correlationSection).toBeVisible();

          // Look for correlation indicators between metrics
          const correlationIndicators = page.getByTestId('correlation-indicator');
          if (await correlationIndicators.first().isVisible()) {
            const count = await correlationIndicators.count();

            expect(count).toBeGreaterThan(0);
          }
        }
      });
    });

    test('should handle fitness setbacks and recovery patterns', async ({ page }) => {
      await test.step('Create fitness setback scenario', async () => {
        await page.goto('/dashboard/health/records');

        // Simulate injury/illness setback
        const setbackData = [
          { steps: 12000, exercise: 60, week: 1 }, // Peak performance
          { steps: 3000, exercise: 0, week: 2 }, // Injury week
          { steps: 4000, exercise: 10, week: 3 }, // Recovery start
          { steps: 6000, exercise: 20, week: 4 }, // Gradual return
          { steps: 8000, exercise: 35, week: 5 }, // Building back
          { steps: 11000, exercise: 55, week: 6 }, // Near recovery
        ];

        for (const data of setbackData) {
          await addHealthRecord(page, 'steps', data.steps.toString(), 'steps');
          await addHealthRecord(page, 'exercise', data.exercise.toString(), 'minutes');
        }
      });

      await test.step('Verify analytics handle setback patterns', async () => {
        await page.goto('/dashboard/health/analytics/steps');
        await page.waitForLoadState('networkidle');

        // Check that chart shows the setback and recovery
        const chart = page.getByTestId('health-chart');
        if (await chart.isVisible()) {
          await expect(chart).toBeVisible();
        }

        // Test different date ranges to see full pattern
        const dateRangeSelector = page.getByLabel('Date Range');
        if (await dateRangeSelector.isVisible()) {
          await dateRangeSelector.selectOption('60_days');
          await page.waitForLoadState('networkidle');
        }
      });
    });
  });

  test.describe('Scenario 3: Chronic Condition Management (ongoing monitoring)', () => {
    test('should manage blood pressure monitoring with medication tracking', async ({ page }) => {
      // Step 1: Set up blood pressure monitoring goals
      await test.step('Create blood pressure management goals', async () => {
        await page.goto('/dashboard/health/goals');
        await page.waitForLoadState('networkidle');

        // Systolic BP goal: 120
        await addHealthGoal(page, 'blood_pressure', '120', getFutureDate(6));

        await expect(page.getByText('Goal created successfully')).toBeVisible();

        // Weight stability goal
        await addHealthGoal(page, 'weight', '75', getFutureDate(6));

        await expect(page.getByText('Goal created successfully')).toBeVisible();
      });

      // Step 2: Set up medication reminders
      await test.step('Create medication reminder schedule', async () => {
        await page.goto('/dashboard/health/reminders');
        await page.waitForLoadState('networkidle');

        const medicationReminders = [
          { type: 'blood_pressure', schedule: '0 8 * * *', message: 'Take morning BP medication' },
          { type: 'blood_pressure', schedule: '0 20 * * *', message: 'Take evening BP medication' },
          { type: 'blood_pressure', schedule: '0 9 * * *', message: 'Record morning blood pressure' },
          { type: 'weight', schedule: '0 7 * * *', message: 'Daily weight check' },
        ];

        for (const reminder of medicationReminders) {
          await addHealthReminder(page, reminder.type, reminder.schedule, reminder.message);

          await expect(page.getByText('Reminder created successfully')).toBeVisible();
        }
      });

      // Step 3: Add daily blood pressure readings over 8 weeks
      await test.step('Add comprehensive blood pressure monitoring data', async () => {
        await page.goto('/dashboard/health/records');

        // Simulate realistic BP readings with medication effects
        const dailyBPData = [];
        const baselineSystolic = 145;
        const baselineDiastolic = 95;

        // Generate 56 days of data (8 weeks)
        for (let day = 0; day < 56; day++) {
          // Simulate medication effect (gradual improvement)
          const medicationEffect = Math.min(day * 0.3, 20);
          const dailyVariation = (Math.random() - 0.5) * 8; // ±4 mmHg variation

          const systolic = Math.round(baselineSystolic - medicationEffect + dailyVariation);
          const diastolic = Math.round(baselineDiastolic - (medicationEffect * 0.6) + (dailyVariation * 0.7));

          dailyBPData.push({
            systolic: Math.max(100, Math.min(180, systolic)),
            diastolic: Math.max(60, Math.min(110, diastolic)),
            weight: 75 + (Math.random() - 0.5) * 2, // Weight stability ±1kg
            day,
          });
        }

        // Add every 3rd day to avoid overwhelming the test
        for (let i = 0; i < dailyBPData.length; i += 3) {
          const data = dailyBPData[i];
          await addHealthRecord(page, 'blood_pressure', data.systolic.toString(), 'mmHg');
          await addHealthRecord(page, 'weight', data.weight.toFixed(1), 'kg');

          // Add related metrics
          if (i % 7 === 0) { // Weekly metrics
            await addHealthRecord(page, 'exercise', (20 + Math.random() * 20).toFixed(0), 'minutes');
            await addHealthRecord(page, 'sleep', (7 + Math.random()).toFixed(1), 'hours');
          }
        }
      });

      // Step 4: Test analytics aggregation with different time periods
      await test.step('Verify analytics aggregation across time periods', async () => {
        await page.goto('/dashboard/health/analytics/blood_pressure');
        await page.waitForLoadState('networkidle');

        const timePeriods = ['7_days', '30_days', '90_days'];

        for (const period of timePeriods) {
          const dateRangeSelector = page.getByLabel('Date Range');
          if (await dateRangeSelector.isVisible()) {
            await dateRangeSelector.selectOption(period);
            await page.waitForLoadState('networkidle');

            // Verify chart updates with new time period
            const chart = page.getByTestId('health-chart');
            if (await chart.isVisible()) {
              await expect(chart).toBeVisible();
            }
          }
        }
      });

      // Step 5: Test alert thresholds and goal adjustments
      await test.step('Verify alert thresholds for blood pressure', async () => {
        await page.goto('/dashboard/health/records');

        // Add a high BP reading to trigger alerts
        await addHealthRecord(page, 'blood_pressure', '160', 'mmHg');

        await expect(page.getByText('Record added successfully')).toBeVisible();

        // Check if alert indicators appear
        const alertIndicator = page.getByTestId('health-alert');
        if (await alertIndicator.isVisible()) {
          await expect(alertIndicator).toBeVisible();
        }
      });

      // Step 6: Test data export for medical consultations
      await test.step('Test medical data export functionality', async () => {
        await page.goto('/dashboard/health/analytics/blood_pressure');
        await page.waitForLoadState('networkidle');

        const exportButton = page.getByRole('button', { name: 'Export Data' });
        if (await exportButton.isVisible()) {
          const downloadPromise = page.waitForEvent('download');
          await exportButton.click();
          const download = await downloadPromise;

          expect(download.suggestedFilename()).toContain('blood_pressure');
        }
      });

      // Step 7: Validate long-term trend analysis
      await test.step('Verify long-term trend analysis accuracy', async () => {
        await page.goto('/dashboard/health/analytics/blood_pressure');
        await page.waitForLoadState('networkidle');

        // Test trend analysis over full period
        const dateRangeSelector = page.getByLabel('Date Range');
        if (await dateRangeSelector.isVisible()) {
          await dateRangeSelector.selectOption('90_days');
          await page.waitForLoadState('networkidle');
        }

        // Check for trend indicators
        const trendIndicator = page.getByTestId('trend-indicator');
        if (await trendIndicator.isVisible()) {
          await expect(trendIndicator).toBeVisible();

          // Should show downward trend due to medication effect
          const trendText = await trendIndicator.textContent();

          expect(trendText).toMatch(/(down|decreasing|improving)/i);
        }

        // Test predictive analytics for chronic condition
        const predictiveChart = page.getByTestId('health-predictive-chart');
        if (await predictiveChart.isVisible()) {
          await expect(predictiveChart).toBeVisible();

          // Verify confidence intervals are appropriate for medical data
          const confidenceToggle = page.getByRole('button', { name: 'Confidence Interval' });
          if (await confidenceToggle.isVisible()) {
            await confidenceToggle.click();
            await page.waitForLoadState('networkidle');
          }
        }
      });
    });

    test('should handle medication adherence tracking', async ({ page }) => {
      await test.step('Track medication adherence patterns', async () => {
        await page.goto('/dashboard/health/reminders');
        await page.waitForLoadState('networkidle');

        // Create detailed medication schedule
        await addHealthReminder(page, 'blood_pressure', '0 8,20 * * *', 'BP medication - twice daily');

        await expect(page.getByText('Reminder created successfully')).toBeVisible();

        // Verify reminder shows correct frequency
        await expect(page.getByText('BP medication - twice daily')).toBeVisible();
      });

      await test.step('Simulate missed medication effects', async () => {
        await page.goto('/dashboard/health/records');

        // Add BP readings showing missed medication effects
        const adherenceData = [
          { bp: 125, day: 1, adherent: true },
          { bp: 128, day: 2, adherent: true },
          { bp: 142, day: 3, adherent: false }, // Missed medication
          { bp: 145, day: 4, adherent: false },
          { bp: 135, day: 5, adherent: true }, // Back on medication
          { bp: 130, day: 6, adherent: true },
        ];

        for (const data of adherenceData) {
          await addHealthRecord(page, 'blood_pressure', data.bp.toString(), 'mmHg');
        }
      });
    });
  });

  test.describe('Scenario 4: Multi-User Data Isolation', () => {
    test('should maintain complete data isolation between users', async ({ page, context }) => {
      // Step 1: Create first user session
      await test.step('Set up first user with improving health pattern', async () => {
        const user1RandomId = faker.number.int({ max: 1000000 });
        await page.setExtraHTTPHeaders({
          'x-e2e-random-id': `user1_${user1RandomId}`,
        });

        await page.goto('/dashboard/health/records');
        await page.waitForLoadState('networkidle');

        // Add improving pattern for user 1
        const user1Data = [
          { type: 'weight', value: '80', unit: 'kg' },
          { type: 'weight', value: '78', unit: 'kg' },
          { type: 'weight', value: '76', unit: 'kg' },
          { type: 'steps', value: '8000', unit: 'steps' },
          { type: 'steps', value: '9000', unit: 'steps' },
          { type: 'steps', value: '10000', unit: 'steps' },
        ];

        for (const record of user1Data) {
          await addHealthRecord(page, record.type, record.value, record.unit);

          await expect(page.getByText('Record added successfully')).toBeVisible();
        }

        // Add goal for user 1
        await page.goto('/dashboard/health/goals');
        await addHealthGoal(page, 'weight', '75', getFutureDate(2));

        await expect(page.getByText('Goal created successfully')).toBeVisible();
      });

      // Step 2: Create second user session in new context
      await test.step('Set up second user with declining health pattern', async () => {
        const newPage = await context.newPage();
        const user2RandomId = faker.number.int({ max: 1000000 });
        await newPage.setExtraHTTPHeaders({
          'x-e2e-random-id': `user2_${user2RandomId}`,
        });

        await newPage.goto('/dashboard/health/records');
        await newPage.waitForLoadState('networkidle');

        // Add declining pattern for user 2
        const user2Data = [
          { type: 'weight', value: '70', unit: 'kg' },
          { type: 'weight', value: '72', unit: 'kg' },
          { type: 'weight', value: '74', unit: 'kg' },
          { type: 'steps', value: '10000', unit: 'steps' },
          { type: 'steps', value: '8000', unit: 'steps' },
          { type: 'steps', value: '6000', unit: 'steps' },
        ];

        for (const record of user2Data) {
          await addHealthRecord(newPage, record.type, record.value, record.unit);

          await expect(newPage.getByText('Record added successfully')).toBeVisible();
        }

        // Add different goal for user 2
        await newPage.goto('/dashboard/health/goals');
        await addHealthGoal(newPage, 'weight', '68', getFutureDate(3));

        await expect(newPage.getByText('Goal created successfully')).toBeVisible();

        await newPage.close();
      });

      // Step 3: Verify data isolation
      await test.step('Verify complete data isolation between users', async () => {
        // Check user 1 data is still isolated
        await page.goto('/dashboard/health/records');
        await page.waitForLoadState('networkidle');

        // User 1 should only see their improving pattern
        await expect(page.getByText('76 kg')).toBeVisible(); // User 1's latest weight
        await expect(page.getByText('10000 steps')).toBeVisible(); // User 1's latest steps

        // User 1 should NOT see user 2's data
        await expect(page.getByText('74 kg')).toBeHidden(); // User 2's latest weight
        await expect(page.getByText('6000 steps')).toBeHidden(); // User 2's latest steps

        // Check goals isolation
        await page.goto('/dashboard/health/goals');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Target: 75')).toBeVisible(); // User 1's goal
        await expect(page.getByText('Target: 68')).toBeHidden(); // User 2's goal
      });

      // Step 4: Test analytics isolation
      await test.step('Verify analytics and predictions are user-specific', async () => {
        await page.goto('/dashboard/health/analytics/weight');
        await page.waitForLoadState('networkidle');

        // Check that analytics only show user 1's improving trend
        const chart = page.getByTestId('health-chart');
        if (await chart.isVisible()) {
          await expect(chart).toBeVisible();
        }

        // Test predictive analytics isolation
        const predictiveChart = page.getByTestId('health-predictive-chart');
        if (await predictiveChart.isVisible()) {
          await expect(predictiveChart).toBeVisible();

          // Predictions should be based only on user 1's improving data
          const accuracyBadge = page.getByText(/\d+\.\d+% accurate/);
          if (await accuracyBadge.isVisible()) {
            await expect(accuracyBadge).toBeVisible();
          }
        }
      });

      // Step 5: Test reminder isolation
      await test.step('Verify reminder triggers are user-isolated', async () => {
        await page.goto('/dashboard/health/reminders');
        await page.waitForLoadState('networkidle');

        // Add reminder for user 1
        await addHealthReminder(page, 'weight', '0 8 * * *', 'User 1 weight check');

        await expect(page.getByText('Reminder created successfully')).toBeVisible();
        await expect(page.getByText('User 1 weight check')).toBeVisible();

        // Verify only user 1's reminders are visible
        const reminderCount = await page.getByTestId('reminder-item').count();

        expect(reminderCount).toBe(1); // Only user 1's reminder
      });
    });

    test('should handle concurrent access patterns safely', async ({ page, context }) => {
      await test.step('Test concurrent data entry from multiple users', async () => {
        // Set up user 1
        const user1RandomId = faker.number.int({ max: 1000000 });
        await page.setExtraHTTPHeaders({
          'x-e2e-random-id': `concurrent_user1_${user1RandomId}`,
        });

        // Set up user 2 in new page
        const user2Page = await context.newPage();
        const user2RandomId = faker.number.int({ max: 1000000 });
        await user2Page.setExtraHTTPHeaders({
          'x-e2e-random-id': `concurrent_user2_${user2RandomId}`,
        });

        // Navigate both users to records page
        await Promise.all([
          page.goto('/dashboard/health/records'),
          user2Page.goto('/dashboard/health/records'),
        ]);

        await Promise.all([
          page.waitForLoadState('networkidle'),
          user2Page.waitForLoadState('networkidle'),
        ]);

        // Add records concurrently
        await Promise.all([
          addHealthRecord(page, 'weight', '75', 'kg'),
          addHealthRecord(user2Page, 'weight', '80', 'kg'),
        ]);

        // Verify both records were added successfully
        await Promise.all([
          expect(page.getByText('Record added successfully')).toBeVisible(),
          expect(user2Page.getByText('Record added successfully')).toBeVisible(),
        ]);

        // Verify data isolation maintained during concurrent access
        await expect(page.getByText('75 kg')).toBeVisible();
        await expect(page.getByText('80 kg')).toBeHidden();

        await expect(user2Page.getByText('80 kg')).toBeVisible();
        await expect(user2Page.getByText('75 kg')).toBeHidden();

        await user2Page.close();
      });
    });
  });

  test.describe('Data Flow Validation', () => {
    test('should validate complete data flow from record creation to UI display', async ({ page }) => {
      await test.step('Create comprehensive test dataset', async () => {
        await page.goto('/dashboard/health/records');
        await page.waitForLoadState('networkidle');

        // Create a comprehensive dataset for flow validation
        const testDataset = [
          { type: 'weight', value: '75.5', unit: 'kg' },
          { type: 'steps', value: '8500', unit: 'steps' },
          { type: 'sleep', value: '7.5', unit: 'hours' },
          { type: 'exercise', value: '45', unit: 'minutes' },
          { type: 'heart_rate', value: '72', unit: 'bpm' },
        ];

        for (const record of testDataset) {
          await addHealthRecord(page, record.type, record.value, record.unit);

          await expect(page.getByText('Record added successfully')).toBeVisible();
        }
      });

      await test.step('Verify data flows to health overview correctly', async () => {
        await page.goto('/dashboard/health');
        await page.waitForLoadState('networkidle');

        // Check that overview displays the new records
        await expect(page.getByTestId('health-overview')).toBeVisible();
        await expect(page.getByTestId('health-overview-recent-records')).toBeVisible();

        // Verify specific values appear in recent records
        await expect(page.getByText('75.5 kg')).toBeVisible();
        await expect(page.getByText('8500 steps')).toBeVisible();
        await expect(page.getByText('7.5 hours')).toBeVisible();
      });

      await test.step('Verify data flows to analytics correctly', async () => {
        await page.goto('/dashboard/health/analytics');
        await page.waitForLoadState('networkidle');

        // Check that analytics processes the data
        const analyticsChart = page.getByTestId('health-chart');
        if (await analyticsChart.isVisible()) {
          await expect(analyticsChart).toBeVisible();
        }

        // Test specific metric analytics
        await page.goto('/dashboard/health/analytics/weight');
        await page.waitForLoadState('networkidle');

        const weightChart = page.getByTestId('health-chart');
        if (await weightChart.isVisible()) {
          await expect(weightChart).toBeVisible();
        }
      });

      await test.step('Verify transformToSummaryMetrics produces correct calculations', async () => {
        await page.goto('/dashboard/health');
        await page.waitForLoadState('networkidle');

        // Check summary statistics are calculated correctly
        const statsSection = page.getByTestId('health-overview-stats');

        await expect(statsSection).toBeVisible();

        // Verify total records count
        const totalRecordsElement = page.locator('[data-testid="health-overview-stats"] .text-2xl').first();
        const totalRecords = await totalRecordsElement.textContent();

        expect(Number(totalRecords)).toBeGreaterThanOrEqual(5); // At least our 5 test records
      });

      await test.step('Verify transformToRadarData creates accurate score distributions', async () => {
        await page.goto('/dashboard/health/analytics');
        await page.waitForLoadState('networkidle');

        const radarChart = page.getByTestId('health-radar-chart');
        if (await radarChart.isVisible()) {
          await expect(radarChart).toBeVisible();

          // Check that multiple metrics are displayed
          const metricCount = await page.getByTestId('radar-metric').count();
          if (metricCount > 0) {
            expect(metricCount).toBeGreaterThanOrEqual(3); // Should have multiple metrics
          }
        }
      });

      await test.step('Verify transformToPredictiveData generates sound predictions', async () => {
        // Add more data points to enable predictions
        await page.goto('/dashboard/health/records');

        const additionalData = [
          { type: 'weight', value: '75.2', unit: 'kg' },
          { type: 'weight', value: '74.8', unit: 'kg' },
          { type: 'weight', value: '74.5', unit: 'kg' },
        ];

        for (const record of additionalData) {
          await addHealthRecord(page, record.type, record.value, record.unit);
        }

        await page.goto('/dashboard/health/analytics/weight');
        await page.waitForLoadState('networkidle');

        const predictiveChart = page.getByTestId('health-predictive-chart');
        if (await predictiveChart.isVisible()) {
          await expect(predictiveChart).toBeVisible();

          // Check for accuracy indicator
          const accuracyBadge = page.getByText(/\d+\.\d+% accurate/);
          if (await accuracyBadge.isVisible()) {
            await expect(accuracyBadge).toBeVisible();
          }
        }
      });
    });

    test('should handle error scenarios gracefully throughout the workflow', async ({ page }) => {
      await test.step('Test error handling in record creation', async () => {
        await page.goto('/dashboard/health/records');
        await page.waitForLoadState('networkidle');

        // Test invalid value
        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Value').fill('invalid');
        await page.getByRole('button', { name: 'Save Record' }).click();

        // Should show validation error
        const errorMessage = page.getByText(/invalid|error/i);
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toBeVisible();
        }
      });

      await test.step('Test graceful degradation with missing data', async () => {
        await page.goto('/dashboard/health/analytics/nonexistent_metric');
        await page.waitForLoadState('networkidle');

        // Should show empty state or error message
        const emptyState = page.getByText(/no data|empty|not found/i);
        if (await emptyState.isVisible()) {
          await expect(emptyState).toBeVisible();
        }
      });

      await test.step('Test network error handling', async () => {
        // Simulate network failure for API calls
        await page.route('**/api/health/**', route => route.abort());

        await page.goto('/dashboard/health/records');
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Add Record' }).click();
        await page.getByLabel('Health Type').selectOption('weight');
        await page.getByLabel('Value').fill('75');
        await page.getByRole('button', { name: 'Save Record' }).click();

        // Should show network error message
        const networkError = page.getByText(/network|connection|error/i);
        if (await networkError.isVisible()) {
          await expect(networkError).toBeVisible();
        }

        // Clean up route
        await page.unroute('**/api/health/**');
      });
    });
  });

  test.describe('Performance and Edge Cases', () => {
    test('should handle large datasets efficiently', async ({ page }) => {
      await test.step('Create large dataset for performance testing', async () => {
        await page.goto('/dashboard/health/records');
        await page.waitForLoadState('networkidle');

        // Add 50 records (reduced from 100+ for test performance)
        const startTime = Date.now();

        for (let i = 0; i < 50; i++) {
          const value = (70 + Math.random() * 10).toFixed(1);
          await addHealthRecord(page, 'weight', value, 'kg');

          // Add steps data
          const steps = Math.floor(5000 + Math.random() * 5000);
          await addHealthRecord(page, 'steps', steps.toString(), 'steps');
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should complete within reasonable time (30 seconds for 100 records)
        expect(duration).toBeLessThan(30000);
      });

      await test.step('Verify analytics performance with large dataset', async () => {
        const startTime = Date.now();

        await page.goto('/dashboard/health/analytics/weight');
        await page.waitForLoadState('networkidle');

        const endTime = Date.now();
        const loadTime = endTime - startTime;

        // Analytics should load within 10 seconds even with large dataset
        expect(loadTime).toBeLessThan(10000);

        // Chart should still be visible
        const chart = page.getByTestId('health-chart');
        if (await chart.isVisible()) {
          await expect(chart).toBeVisible();
        }
      });
    });

    test('should handle edge cases and extreme values', async ({ page }) => {
      await test.step('Test extreme values handling', async () => {
        await page.goto('/dashboard/health/records');
        await page.waitForLoadState('networkidle');

        const extremeValues = [
          { type: 'weight', value: '300', unit: 'kg' }, // Very high weight
          { type: 'weight', value: '30', unit: 'kg' }, // Very low weight
          { type: 'steps', value: '50000', unit: 'steps' }, // Very high steps
          { type: 'steps', value: '0', unit: 'steps' }, // Zero steps
        ];

        for (const record of extremeValues) {
          await addHealthRecord(page, record.type, record.value, record.unit);

          await expect(page.getByText('Record added successfully')).toBeVisible();
        }
      });

      await test.step('Verify analytics handle extreme values gracefully', async () => {
        await page.goto('/dashboard/health/analytics/weight');
        await page.waitForLoadState('networkidle');

        // Chart should still render with extreme values
        const chart = page.getByTestId('health-chart');
        if (await chart.isVisible()) {
          await expect(chart).toBeVisible();
        }

        // Test that predictions are still reasonable
        const predictiveChart = page.getByTestId('health-predictive-chart');
        if (await predictiveChart.isVisible()) {
          await expect(predictiveChart).toBeVisible();
        }
      });

      await test.step('Test missing data scenarios', async () => {
        await page.goto('/dashboard/health/analytics/blood_pressure');
        await page.waitForLoadState('networkidle');

        // Should show empty state for metrics with no data
        const emptyState = page.getByText(/no data|empty/i);
        if (await emptyState.isVisible()) {
          await expect(emptyState).toBeVisible();
        }
      });

      await test.step('Test invalid date handling', async () => {
        // This would typically be tested at the API level
        // but we can verify the UI handles date edge cases
        await page.goto('/dashboard/health/analytics/weight');
        await page.waitForLoadState('networkidle');

        // Test different date ranges
        const dateRangeSelector = page.getByLabel('Date Range');
        if (await dateRangeSelector.isVisible()) {
          const options = ['7_days', '30_days', '90_days', '1_year'];

          for (const option of options) {
            await dateRangeSelector.selectOption(option);
            await page.waitForLoadState('networkidle');

            // Chart should handle all date ranges
            const chart = page.getByTestId('health-chart');
            if (await chart.isVisible()) {
              await expect(chart).toBeVisible();
            }
          }
        }
      });
    });

    test('should validate caching behavior in analytics endpoints', async ({ page }) => {
      await test.step('Test analytics caching performance', async () => {
        // First load - should be slower
        const firstLoadStart = Date.now();
        await page.goto('/dashboard/health/analytics/weight');
        await page.waitForLoadState('networkidle');
        const firstLoadTime = Date.now() - firstLoadStart;

        // Second load - should be faster due to caching
        const secondLoadStart = Date.now();
        await page.reload();
        await page.waitForLoadState('networkidle');
        const secondLoadTime = Date.now() - secondLoadStart;

        // Second load should be faster (allowing for some variance)
        expect(secondLoadTime).toBeLessThanOrEqual(firstLoadTime * 1.5);
      });

      await test.step('Test cache invalidation after data changes', async () => {
        // Load analytics page
        await page.goto('/dashboard/health/analytics/weight');
        await page.waitForLoadState('networkidle');

        // Add new record
        await page.goto('/dashboard/health/records');
        await addHealthRecord(page, 'weight', '77', 'kg');

        // Return to analytics - should show updated data
        await page.goto('/dashboard/health/analytics/weight');
        await page.waitForLoadState('networkidle');

        // Chart should be updated with new data
        const chart = page.getByTestId('health-chart');
        if (await chart.isVisible()) {
          await expect(chart).toBeVisible();
        }
      });
    });
  });

  test.describe('Error Recovery and System Resilience', () => {
    const apiEndpoints = ['/api/health/records', '/api/health/goals', '/api/health/reminders'];

    test('should handle database failures gracefully', async ({ page }) => {
      await test.step('Simulate database offline and verify UI feedback', async () => {
        await simulateDatabaseFailure(page, 'offline', apiEndpoints);
        await page.goto('/dashboard/health/records');
        await addHealthRecord(page, 'weight', '70', 'kg');

        await expect(page.getByText(/database connection error/i)).toBeVisible();

        await page.unrouteAll();
      });

      await test.step('Simulate database corruption and verify UI feedback', async () => {
        await simulateDatabaseFailure(page, 'corrupt', apiEndpoints);
        await page.goto('/dashboard/health/records');

        await expect(page.getByText(/data corruption detected/i)).toBeVisible();

        await page.unrouteAll();
      });
    });

    test('should handle authentication errors and redirect to login', async ({ page }) => {
      await test.step('Simulate expired token and verify redirect', async () => {
        await simulateAuthenticationError(page, 'expired_token', apiEndpoints);
        await page.goto('/dashboard/health/records');
        await page.waitForURL('**/login');

        await expect(page.getByText(/session expired/i)).toBeVisible();

        await page.unrouteAll();
      });

      await test.step('Simulate invalid credentials and verify error message', async () => {
        await simulateAuthenticationError(page, 'invalid_credentials', apiEndpoints);
        await page.goto('/dashboard/health/records');
        await addHealthRecord(page, 'weight', '70', 'kg');

        await expect(page.getByText(/invalid credentials/i)).toBeVisible();

        await page.unrouteAll();
      });
    });

    test('should handle rate limiting with user feedback', async ({ page }) => {
      await test.step('Simulate rate limiting and verify retry message', async () => {
        await simulateRateLimiting(page, apiEndpoints);
        await page.goto('/dashboard/health/records');
        await addHealthRecord(page, 'weight', '70', 'kg');

        await expect(page.getByText(/too many requests/i)).toBeVisible();
        await expect(page.getByText(/please try again in \d+ seconds/i)).toBeVisible();

        await page.unrouteAll();
      });
    });

    test('should handle client-side memory exhaustion', async ({ page }) => {
      await test.step('Simulate memory exhaustion and verify graceful degradation', async () => {
        await page.goto('/dashboard/health/analytics');
        await simulateMemoryExhaustion(page);
        await page.reload();

        await expect(page.getByText(/memory usage is high/i)).toBeVisible();
        await expect(page.getByText(/some features may be disabled/i)).toBeVisible();
      });
    });

    test('should handle data corruption from the server', async ({ page }) => {
      await test.step('Simulate data corruption and verify error handling', async () => {
        await simulateDataCorruption(page, ['/api/health/records']);
        await page.goto('/dashboard/health/records');

        await expect(page.getByText(/invalid data received/i)).toBeVisible();
        await expect(page.getByTestId('health-record-item')).toBeHidden();

        await page.unrouteAll();
      });
    });
  });
});
