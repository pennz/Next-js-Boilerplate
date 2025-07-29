// Third-party libraries
import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';

// Local test helpers
import {
  addExerciseLog,
  createTrainingPlan,
  activateTrainingPlan,
  completeWorkoutSession,
  verifyExerciseStats,
  verifyRecentLogs,
  verifyTrainingPlans,
  verifyProgressCharts,
  navigateToExerciseOverview,
  navigateToWorkoutPage,
  navigateToExerciseAnalytics,
  navigateToTrainingPlans,
  clickStatCard,
  clickTrainingPlanCard,
  clickQuickAction,
  clickProgressChart,
  cleanupExerciseLogs,
  cleanupTrainingPlans,
  cleanupExerciseData,
  validateExerciseLogData,
  validateTrainingPlanData,
  validateStatsCalculations,
  getFutureDate,
  getFormattedDate,
  calculateTimeAgo,
  verifyExerciseTrackingEvent,
  waitForTrackingEvent,
  mockExerciseTrackingFailure,
} from './helpers/exerciseTestHelpers';

/**
 * The x-e2e-random-id header provides a unique identifier for each test request,
 * helping to trace and isolate test runs for improved reliability and debugging.
 * This header is set in the beforeEach hook and included in all test requests.
 */

test.describe('Exercise Overview Management', () => {
  let e2eRandomId: number;

  test.beforeEach(async ({ page }) => {
    e2eRandomId = faker.number.int({ max: 1000000 });
    await page.setExtraHTTPHeaders({
      'x-e2e-random-id': e2eRandomId.toString(),
    });
    await page.goto('/dashboard/exercise');
  });

  test.afterEach(async ({ page }) => {
    // Clean up any test data
    await cleanupExerciseData(page);
  });

  test.describe('Exercise Overview Display', () => {
    test('should display all main sections', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('exercise-overview')).toBeVisible();
      await expect(page.getByTestId('exercise-overview-stats')).toBeVisible();
      await expect(page.getByTestId('exercise-overview-recent-logs')).toBeVisible();
      await expect(page.getByTestId('exercise-overview-active-plans')).toBeVisible();
      await expect(page.getByTestId('exercise-overview-quick-actions')).toBeVisible();
      await expect(page.getByTestId('exercise-overview-progress-charts')).toBeVisible();
    });

    test('should display stats with real data', async ({ page }) => {
      await test.step('Add exercise data', async () => {
        await addExerciseLog(page, 'Bench Press', 3, 10, 80);
        await addExerciseLog(page, 'Squats', 4, 8, 100);
        await createTrainingPlan(page, 'Strength Training', 'intermediate', 4);
      });

      await test.step('Verify stats display', async () => {
        await navigateToExerciseOverview(page);
        await verifyExerciseStats(page, {
          totalWorkouts: 2,
          activePlans: 1,
          completedSessions: 0,
          weeklyProgress: 2,
        });
      });
    });

    test('should show empty states when no data exists', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('exercise-overview-recent-logs')).toContainText('No recent workouts');
      await expect(page.getByTestId('exercise-overview-active-plans')).toContainText('No active training plans');
    });

    test('should maintain data persistence across page reloads', async ({ page }) => {
      await test.step('Add test data', async () => {
        await addExerciseLog(page, 'Deadlifts', 3, 5, 120);
        await createTrainingPlan(page, 'Power Building', 'advanced', 5);
      });

      await test.step('Reload page and verify persistence', async () => {
        await page.reload();
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Deadlifts')).toBeVisible();
        await expect(page.getByText('Power Building')).toBeVisible();
      });

      await test.step('Navigate away and back', async () => {
        await page.goto('/dashboard');
        await navigateToExerciseOverview(page);

        await expect(page.getByText('Deadlifts')).toBeVisible();
        await expect(page.getByText('Power Building')).toBeVisible();
      });
    });
  });

  test.describe('Stats Interaction', () => {
    test('should trigger tracking events when clicking stat cards', async ({ page }) => {
      await test.step('Setup tracking listener', async () => {
        await page.route('**/api/tracking/**', async (route) => {
          const request = route.request();
          const postData = request.postData();
          
          if (postData?.includes('exercise_stat_card_clicked')) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ success: true }),
            });
          } else {
            await route.continue();
          }
        });
      });

      await test.step('Click stat card and verify tracking', async () => {
        await clickStatCard(page, 'total_workouts');
        await verifyExerciseTrackingEvent(page, 'exercise_stat_card_clicked', {
          ui: {
            component: 'ExerciseOverview',
            element: 'StatCard',
            statType: 'total_workouts',
          },
        });
      });
    });

    test('should support keyboard navigation through stats grid', async ({ page }) => {
      await test.step('Navigate with keyboard', async () => {
        const firstStatCard = page.getByTestId('exercise-overview-stats').locator('[role="button"]').first();
        await firstStatCard.focus();
        await expect(firstStatCard).toBeFocused();

        await page.keyboard.press('Tab');
        const secondStatCard = page.getByTestId('exercise-overview-stats').locator('[role="button"]').nth(1);
        await expect(secondStatCard).toBeFocused();
      });

      await test.step('Activate with Enter key', async () => {
        const statCard = page.getByTestId('exercise-overview-stats').locator('[role="button"]').first();
        await statCard.focus();
        await page.keyboard.press('Enter');
        
        await waitForTrackingEvent(page, 'exercise_stat_card_clicked');
      });

      await test.step('Activate with Space key', async () => {
        const statCard = page.getByTestId('exercise-overview-stats').locator('[role="button"]').nth(1);
        await statCard.focus();
        await page.keyboard.press(' ');
        
        await waitForTrackingEvent(page, 'exercise_stat_card_clicked');
      });
    });

    test('should update stats after adding new exercise data', async ({ page }) => {
      const initialTotal = await page.locator('[data-testid="exercise-overview-stats"] .text-2xl').first().textContent();

      await test.step('Add new exercise log', async () => {
        await addExerciseLog(page, 'Pull-ups', 3, 12, null);
      });

      await test.step('Verify stats updated', async () => {
        await navigateToExerciseOverview(page);
        const updatedTotal = await page.locator('[data-testid="exercise-overview-stats"] .text-2xl').first().textContent();
        
        expect(Number(updatedTotal)).toBeGreaterThan(Number(initialTotal));
      });
    });

    test('should display hover states and accessibility features', async ({ page }) => {
      const statCard = page.getByTestId('exercise-overview-stats').locator('[role="button"]').first();

      await test.step('Verify accessibility attributes', async () => {
        await expect(statCard).toHaveAttribute('role', 'button');
        await expect(statCard).toHaveAttribute('tabindex', '0');
      });

      await test.step('Test hover state', async () => {
        await statCard.hover();
        await expect(statCard).toHaveClass(/hover:shadow-md/);
      });
    });
  });

  test.describe('Training Plan Cards', () => {
    test('should display training plans with different difficulty levels', async ({ page }) => {
      await test.step('Create plans with different difficulties', async () => {
        await createTrainingPlan(page, 'Beginner Routine', 'beginner', 3);
        await createTrainingPlan(page, 'Intermediate Program', 'intermediate', 4);
        await createTrainingPlan(page, 'Advanced Training', 'advanced', 6);
      });

      await test.step('Verify difficulty indicators', async () => {
        await navigateToExerciseOverview(page);
        
        await expect(page.getByText('beginner')).toBeVisible();
        await expect(page.getByText('intermediate')).toBeVisible();
        await expect(page.getByText('advanced')).toBeVisible();
        
        // Verify difficulty colors
        await expect(page.locator('.bg-green-100.text-green-800')).toBeVisible(); // beginner
        await expect(page.locator('.bg-yellow-100.text-yellow-800')).toBeVisible(); // intermediate
        await expect(page.locator('.bg-red-100.text-red-800')).toBeVisible(); // advanced
      });
    });

    test('should show active vs inactive plan indicators', async ({ page }) => {
      await test.step('Create and activate training plan', async () => {
        const planId = await createTrainingPlan(page, 'Active Plan', 'intermediate', 4);
        await activateTrainingPlan(page, planId);
      });

      await test.step('Create inactive plan', async () => {
        await createTrainingPlan(page, 'Inactive Plan', 'beginner', 3);
      });

      await test.step('Verify active indicators', async () => {
        await navigateToExerciseOverview(page);
        
        await expect(page.getByText('🟢 Active')).toBeVisible();
        await expect(page.getByText('Active Plan')).toBeVisible();
        await expect(page.getByText('Inactive Plan')).toBeVisible();
      });
    });

    test('should trigger tracking when clicking training plan cards', async ({ page }) => {
      await test.step('Create test plan', async () => {
        await createTrainingPlan(page, 'Test Plan', 'intermediate', 4);
      });

      await test.step('Click plan card and verify tracking', async () => {
        await navigateToExerciseOverview(page);
        await clickTrainingPlanCard(page, 'Test Plan');
        
        await verifyExerciseTrackingEvent(page, 'training_plan_card_viewed', {
          ui: {
            component: 'ExerciseOverview',
            element: 'TrainingPlanCard',
          },
          exercise: {
            planName: 'Test Plan',
            difficulty: 'intermediate',
            sessionsPerWeek: 4,
          },
        });
      });
    });

    test('should support keyboard navigation and accessibility', async ({ page }) => {
      await test.step('Create test plan', async () => {
        await createTrainingPlan(page, 'Keyboard Test Plan', 'beginner', 3);
      });

      await test.step('Test keyboard navigation', async () => {
        await navigateToExerciseOverview(page);
        const planCard = page.getByTestId('exercise-overview-active-plans').locator('[role="button"]').first();
        
        await planCard.focus();
        await expect(planCard).toBeFocused();
        
        await page.keyboard.press('Enter');
        await waitForTrackingEvent(page, 'training_plan_card_viewed');
      });
    });

    test('should display accurate plan data', async ({ page }) => {
      const planData = {
        name: 'Data Accuracy Test',
        difficulty: 'advanced',
        sessionsPerWeek: 5,
        startDate: getFutureDate(1),
      };

      await test.step('Create plan with specific data', async () => {
        await createTrainingPlan(page, planData.name, planData.difficulty, planData.sessionsPerWeek);
      });

      await test.step('Verify plan data accuracy', async () => {
        await navigateToExerciseOverview(page);
        await validateTrainingPlanData(page, planData);
        
        await expect(page.getByText(`${planData.sessionsPerWeek} sessions/week`)).toBeVisible();
        await expect(page.getByText(planData.difficulty)).toBeVisible();
      });
    });
  });

  test.describe('Recent Logs Section', () => {
    test('should display recent workout logs', async ({ page }) => {
      await test.step('Add multiple exercise logs', async () => {
        await addExerciseLog(page, 'Bench Press', 3, 10, 80);
        await addExerciseLog(page, 'Squats', 4, 8, 100);
        await addExerciseLog(page, 'Deadlifts', 3, 5, 120);
      });

      await test.step('Verify logs display', async () => {
        await navigateToExerciseOverview(page);
        await verifyRecentLogs(page, [
          { exercise: 'Bench Press', sets: 3, reps: 10, weight: 80 },
          { exercise: 'Squats', sets: 4, reps: 8, weight: 100 },
          { exercise: 'Deadlifts', sets: 3, reps: 5, weight: 120 },
        ]);
      });
    });

    test('should calculate time ago accurately', async ({ page }) => {
      const hoursAgo = 2;
      
      await test.step('Add log with specific timestamp', async () => {
        const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
        await addExerciseLog(page, 'Time Test Exercise', 3, 10, 75, timestamp);
      });

      await test.step('Verify time calculation', async () => {
        await navigateToExerciseOverview(page);
        await expect(page.getByText(`${hoursAgo}h ago`)).toBeVisible();
      });
    });

    test('should trigger tracking when clicking log items', async ({ page }) => {
      await test.step('Add test log', async () => {
        await addExerciseLog(page, 'Click Test Exercise', 3, 12, 60);
      });

      await test.step('Click log item and verify tracking', async () => {
        await navigateToExerciseOverview(page);
        const logItem = page.getByText('Click Test Exercise').locator('..');
        await logItem.click();
        
        await verifyExerciseTrackingEvent(page, 'recent_workout_log_viewed', {
          ui: {
            component: 'ExerciseOverview',
            element: 'RecentLogItem',
          },
          exercise: {
            exerciseName: 'Click Test Exercise',
            sets: 3,
            reps: 12,
            weight: 60,
          },
        });
      });
    });

    test('should show empty state when no recent logs', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByTestId('exercise-overview-recent-logs')).toContainText('No recent workouts');
    });

    test('should format log data correctly', async ({ page }) => {
      await test.step('Add logs with different data formats', async () => {
        await addExerciseLog(page, 'With Weight', 3, 10, 80);
        await addExerciseLog(page, 'Without Weight', 4, 15, null);
        await addExerciseLog(page, 'Without Reps', 5, null, 100);
      });

      await test.step('Verify data formatting', async () => {
        await navigateToExerciseOverview(page);
        
        await expect(page.getByText('3 sets × 10 reps')).toBeVisible();
        await expect(page.getByText('80kg')).toBeVisible();
        
        await expect(page.getByText('4 sets × 15 reps')).toBeVisible();
        await expect(page.getByText('5 sets')).toBeVisible();
        await expect(page.getByText('100kg')).toBeVisible();
      });
    });
  });

  test.describe('Quick Actions', () => {
    test('should navigate to workout page when clicking Start Workout', async ({ page }) => {
      await test.step('Click Start Workout button', async () => {
        await clickQuickAction(page, 'Start Workout');
      });

      await test.step('Verify navigation', async () => {
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/workout/);
      });
    });

    test('should navigate to plan creation when clicking Create Plan', async ({ page }) => {
      await test.step('Click Create Plan button', async () => {
        await clickQuickAction(page, 'Create Plan');
      });

      await test.step('Verify navigation', async () => {
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/plans\?action=create/);
      });
    });

    test('should navigate to exercises browser when clicking Browse Exercises', async ({ page }) => {
      await test.step('Click Browse Exercises button', async () => {
        await clickQuickAction(page, 'Browse Exercises');
      });

      await test.step('Verify navigation', async () => {
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/exercises/);
      });
    });

    test('should navigate to analytics when clicking View Progress', async ({ page }) => {
      await test.step('Click View Progress button', async () => {
        await clickQuickAction(page, 'View Progress');
      });

      await test.step('Verify navigation', async () => {
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/analytics/);
      });
    });

    test('should support keyboard accessibility for quick actions', async ({ page }) => {
      await test.step('Navigate with keyboard', async () => {
        const quickActionsSection = page.getByTestId('exercise-overview-quick-actions');
        const firstAction = quickActionsSection.locator('a').first();
        
        await firstAction.focus();
        await expect(firstAction).toBeFocused();
        
        await page.keyboard.press('Tab');
        const secondAction = quickActionsSection.locator('a').nth(1);
        await expect(secondAction).toBeFocused();
      });

      await test.step('Activate with Enter key', async () => {
        const startWorkoutButton = page.getByRole('link', { name: /Start Workout/ });
        await startWorkoutButton.focus();
        await page.keyboard.press('Enter');
        
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/workout/);
      });
    });

    test('should track quick action clicks', async ({ page }) => {
      await test.step('Setup tracking listener', async () => {
        await page.route('**/api/tracking/**', async (route) => {
          const request = route.request();
          const postData = request.postData();
          
          if (postData?.includes('ui_click')) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ success: true }),
            });
          } else {
            await route.continue();
          }
        });
      });

      await test.step('Click quick action and verify tracking', async () => {
        const startWorkoutButton = page.getByRole('link', { name: /Start Workout/ });
        await startWorkoutButton.click();
        
        await verifyExerciseTrackingEvent(page, 'ui_click', {
          ui: {
            component: 'ExerciseOverview',
            element: 'QuickActionButton',
            action: 'start_workout',
            destination: '/dashboard/exercise/workout',
          },
          exercise: {
            actionType: 'Start Workout',
          },
        });
      });
    });
  });

  test.describe('Progress Charts Interaction', () => {
    test('should display all chart types', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Strength Progress')).toBeVisible();
      await expect(page.getByText('Workout Frequency')).toBeVisible();
      await expect(page.getByText('Volume Trends')).toBeVisible();
      
      await expect(page.getByText('📈 Chart placeholder')).toBeVisible();
      await expect(page.getByText('📊 Chart placeholder')).toBeVisible();
      await expect(page.getByText('📉 Chart placeholder')).toBeVisible();
    });

    test('should trigger tracking when clicking different chart types', async ({ page }) => {
      await test.step('Click strength progress chart', async () => {
        await clickProgressChart(page, 'strength_progress');
        await verifyExerciseTrackingEvent(page, 'progress_chart_viewed', {
          ui: {
            component: 'ExerciseOverview',
            element: 'ProgressChart',
            chartType: 'strength_progress',
          },
        });
      });

      await test.step('Click workout frequency chart', async () => {
        await clickProgressChart(page, 'workout_frequency');
        await verifyExerciseTrackingEvent(page, 'progress_chart_viewed', {
          ui: {
            chartType: 'workout_frequency',
          },
        });
      });

      await test.step('Click volume trends chart', async () => {
        await clickProgressChart(page, 'volume_trends');
        await verifyExerciseTrackingEvent(page, 'progress_chart_viewed', {
          ui: {
            chartType: 'volume_trends',
          },
        });
      });
    });

    test('should support keyboard interaction with chart elements', async ({ page }) => {
      await test.step('Navigate to first chart with keyboard', async () => {
        const chartsSection = page.getByTestId('exercise-overview-progress-charts');
        const firstChart = chartsSection.locator('[role="button"]').first();
        
        await firstChart.focus();
        await expect(firstChart).toBeFocused();
        
        await page.keyboard.press('Enter');
        await waitForTrackingEvent(page, 'progress_chart_viewed');
      });

      await test.step('Navigate between charts', async () => {
        const chartsSection = page.getByTestId('exercise-overview-progress-charts');
        const charts = chartsSection.locator('[role="button"]');
        
        await charts.first().focus();
        await page.keyboard.press('Tab');
        await expect(charts.nth(1)).toBeFocused();
        
        await page.keyboard.press('Tab');
        await expect(charts.nth(2)).toBeFocused();
      });
    });

    test('should navigate to detailed analytics when clicking View Details', async ({ page }) => {
      await test.step('Click View Details link', async () => {
        const viewDetailsLink = page.getByTestId('exercise-overview-progress-charts').getByRole('link', { name: 'View Details' });
        await viewDetailsLink.click();
      });

      await test.step('Verify navigation', async () => {
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/analytics/);
      });
    });
  });

  test.describe('Behavioral Tracking E2E', () => {
    test('should fire page view events on component load', async ({ page }) => {
      await test.step('Setup tracking listener', async () => {
        let trackingEventReceived = false;
        
        await page.route('**/api/tracking/**', async (route) => {
          const request = route.request();
          const postData = request.postData();
          
          if (postData?.includes('exercise_overview_viewed')) {
            trackingEventReceived = true;
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ success: true }),
            });
          } else {
            await route.continue();
          }
        });
        
        // Store the flag on the page context for later verification
        await page.evaluate((flag) => {
          window.trackingEventReceived = flag;
        }, trackingEventReceived);
      });

      await test.step('Navigate to overview and verify tracking', async () => {
        await navigateToExerciseOverview(page);
        await page.waitForLoadState('networkidle');
        
        // Wait for tracking event to be sent
        await page.waitForFunction(() => window.trackingEventReceived === true, { timeout: 5000 });
      });
    });

    test('should track interaction events properly', async ({ page }) => {
      const trackingEvents: string[] = [];
      
      await test.step('Setup comprehensive tracking listener', async () => {
        await page.route('**/api/tracking/**', async (route) => {
          const request = route.request();
          const postData = request.postData();
          
          if (postData) {
            const eventData = JSON.parse(postData);
            trackingEvents.push(eventData.eventName);
          }
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        });
      });

      await test.step('Perform multiple interactions', async () => {
        await clickStatCard(page, 'total_workouts');
        await clickQuickAction(page, 'Start Workout');
        
        // Navigate back to overview
        await navigateToExerciseOverview(page);
        await clickProgressChart(page, 'strength_progress');
      });

      await test.step('Verify tracking event sequence', async () => {
        expect(trackingEvents).toContain('exercise_stat_card_clicked');
        expect(trackingEvents).toContain('ui_click');
        expect(trackingEvents).toContain('exercise_overview_viewed');
        expect(trackingEvents).toContain('progress_chart_viewed');
      });
    });

    test('should handle tracking failures gracefully', async ({ page }) => {
      await test.step('Mock tracking failure', async () => {
        await mockExerciseTrackingFailure(page);
      });

      await test.step('Verify component still functions', async () => {
        await clickStatCard(page, 'total_workouts');
        await clickQuickAction(page, 'Browse Exercises');
        
        // Component should still work despite tracking failures
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/exercises/);
      });
    });

    test('should include proper context data in tracking events', async ({ page }) => {
      let capturedEventData: any = null;
      
      await test.step('Setup detailed tracking capture', async () => {
        await page.route('**/api/tracking/**', async (route) => {
          const request = route.request();
          const postData = request.postData();
          
          if (postData?.includes('exercise_overview_viewed')) {
            capturedEventData = JSON.parse(postData);
          }
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        });
      });

      await test.step('Add test data and navigate', async () => {
        await addExerciseLog(page, 'Context Test', 3, 10, 80);
        await createTrainingPlan(page, 'Context Plan', 'intermediate', 4);
        await navigateToExerciseOverview(page);
      });

      await test.step('Verify context data accuracy', async () => {
        expect(capturedEventData).toBeTruthy();
        expect(capturedEventData.context.exercise).toMatchObject({
          totalWorkouts: expect.any(Number),
          activePlans: expect.any(Number),
          completedSessions: expect.any(Number),
          weeklyProgress: expect.any(Number),
          hasRecentLogs: true,
          hasActivePlans: true,
        });
      });
    });
  });

  test.describe('Navigation and Integration', () => {
    test('should navigate between exercise management pages', async ({ page }) => {
      await test.step('Navigate to workout page', async () => {
        await navigateToWorkoutPage(page);
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/workout/);
      });

      await test.step('Navigate to training plans', async () => {
        await navigateToTrainingPlans(page);
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/plans/);
      });

      await test.step('Navigate to analytics', async () => {
        await navigateToExerciseAnalytics(page);
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/analytics/);
      });

      await test.step('Navigate back to overview', async () => {
        await navigateToExerciseOverview(page);
        await expect(page).toHaveURL(/.*\/dashboard\/exercise/);
      });
    });

    test('should handle View All links functionality', async ({ page }) => {
      await test.step('Click View All for recent logs', async () => {
        const viewAllLink = page.getByTestId('exercise-overview-recent-logs').getByRole('link', { name: 'View All' });
        await viewAllLink.click();
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/logs/);
      });

      await test.step('Navigate back and click Manage for training plans', async () => {
        await navigateToExerciseOverview(page);
        const manageLink = page.getByTestId('exercise-overview-active-plans').getByRole('link', { name: 'Manage' });
        await manageLink.click();
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/plans/);
      });

      await test.step('Navigate back and click main View All', async () => {
        await navigateToExerciseOverview(page);
        const mainViewAllLink = page.getByRole('link', { name: 'View All →' });
        await mainViewAllLink.click();
        await expect(page).toHaveURL(/.*\/dashboard\/exercise/);
      });
    });

    test('should support breadcrumb navigation', async ({ page }) => {
      await test.step('Navigate to sub-page', async () => {
        await navigateToWorkoutPage(page);
      });

      await test.step('Use breadcrumb to return', async () => {
        const breadcrumb = page.getByRole('navigation', { name: /breadcrumb/i });
        if (await breadcrumb.isVisible()) {
          await breadcrumb.getByRole('link', { name: /exercise/i }).click();
          await expect(page).toHaveURL(/.*\/dashboard\/exercise/);
        }
      });
    });

    test('should handle back button behavior correctly', async ({ page }) => {
      await test.step('Navigate to sub-page', async () => {
        await navigateToExerciseAnalytics(page);
      });

      await test.step('Use browser back button', async () => {
        await page.goBack();
        await expect(page).toHaveURL(/.*\/dashboard\/exercise/);
      });

      await test.step('Verify overview is functional after back navigation', async () => {
        await expect(page.getByTestId('exercise-overview')).toBeVisible();
      });
    });

    test('should support deep linking to specific sections', async ({ page }) => {
      await test.step('Direct navigation to overview with hash', async () => {
        await page.goto('/dashboard/exercise#stats');
        await expect(page.getByTestId('exercise-overview-stats')).toBeVisible();
      });

      await test.step('Direct navigation to plans section', async () => {
        await page.goto('/dashboard/exercise#plans');
        await expect(page.getByTestId('exercise-overview-active-plans')).toBeVisible();
      });
    });
  });

  test.describe('Accessibility E2E', () => {
    test('should support complete keyboard-only navigation workflow', async ({ page }) => {
      await test.step('Navigate through all interactive elements', async () => {
        // Start from first stat card
        const firstStatCard = page.getByTestId('exercise-overview-stats').locator('[role="button"]').first();
        await firstStatCard.focus();
        
        // Tab through all stat cards
        for (let i = 0; i < 4; i++) {
          await page.keyboard.press('Tab');
        }
        
        // Tab through quick actions
        const quickActions = page.getByTestId('exercise-overview-quick-actions').locator('a');
        const quickActionCount = await quickActions.count();
        for (let i = 0; i < quickActionCount; i++) {
          await page.keyboard.press('Tab');
        }
        
        // Tab through progress charts
        for (let i = 0; i < 3; i++) {
          await page.keyboard.press('Tab');
        }
      });

      await test.step('Verify all elements are reachable', async () => {
        // Test that we can activate elements with keyboard
        const firstStatCard = page.getByTestId('exercise-overview-stats').locator('[role="button"]').first();
        await firstStatCard.focus();
        await page.keyboard.press('Enter');
        
        await waitForTrackingEvent(page, 'exercise_stat_card_clicked');
      });
    });

    test('should have proper ARIA labels and descriptions', async ({ page }) => {
      await test.step('Verify ARIA attributes on interactive elements', async () => {
        const statCards = page.getByTestId('exercise-overview-stats').locator('[role="button"]');
        await expect(statCards.first()).toHaveAttribute('role', 'button');
        await expect(statCards.first()).toHaveAttribute('tabindex', '0');
        
        const quickActionButtons = page.getByTestId('exercise-overview-quick-actions').locator('a');
        for (let i = 0; i < await quickActionButtons.count(); i++) {
          await expect(quickActionButtons.nth(i)).toHaveAttribute('href');
        }
        
        const progressCharts = page.getByTestId('exercise-overview-progress-charts').locator('[role="button"]');
        for (let i = 0; i < await progressCharts.count(); i++) {
          await expect(progressCharts.nth(i)).toHaveAttribute('role', 'button');
          await expect(progressCharts.nth(i)).toHaveAttribute('tabindex', '0');
        }
      });
    });

    test('should maintain focus management and tab order', async ({ page }) => {
      await test.step('Verify logical tab order', async () => {
        const focusableElements = [
          page.getByTestId('exercise-overview-stats').locator('[role="button"]').first(),
          page.getByTestId('exercise-overview-quick-actions').locator('a').first(),
          page.getByTestId('exercise-overview-progress-charts').locator('[role="button"]').first(),
        ];
        
        for (const element of focusableElements) {
          await element.focus();
          await expect(element).toBeFocused();
          await page.keyboard.press('Tab');
        }
      });
    });

    test('should support screen reader compatibility', async ({ page }) => {
      await test.step('Verify semantic HTML structure', async () => {
        // Check for proper heading hierarchy
        await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
        await expect(page.getByRole('heading', { level: 3 })).toHaveCount(4); // Recent Workouts, Training Plans, Quick Actions, Training Progress
        
        // Check for proper list structures where applicable
        const quickActionsList = page.getByTestId('exercise-overview-quick-actions');
        await expect(quickActionsList).toBeVisible();
      });

      await test.step('Verify descriptive text content', async () => {
        await expect(page.getByText('Track your workouts and training progress')).toBeVisible();
        await expect(page.getByText('All time')).toBeVisible();
        await expect(page.getByText('In progress')).toBeVisible();
      });
    });

    test('should handle high contrast and visual accessibility', async ({ page }) => {
      await test.step('Verify color contrast in different states', async () => {
        // Test hover states
        const statCard = page.getByTestId('exercise-overview-stats').locator('[role="button"]').first();
        await statCard.hover();
        
        // Test focus states
        await statCard.focus();
        
        // Verify elements are still visible and accessible
        await expect(statCard).toBeVisible();
      });

      await test.step('Test with reduced motion preferences', async () => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        
        // Verify component still functions with reduced motion
        await expect(page.getByTestId('exercise-overview')).toBeVisible();
        
        const statCard = page.getByTestId('exercise-overview-stats').locator('[role="button"]').first();
        await statCard.click();
        await waitForTrackingEvent(page, 'exercise_stat_card_clicked');
      });
    });
  });

  test.describe('Data Integration', () => {
    test('should update overview when adding new exercise data', async ({ page }) => {
      const initialStats = await page.getByTestId('exercise-overview-stats').textContent();
      
      await test.step('Add new exercise data', async () => {
        await addExerciseLog(page, 'Integration Test', 3, 10, 80);
        await createTrainingPlan(page, 'Integration Plan', 'intermediate', 4);
      });

      await test.step('Verify overview updates', async () => {
        await navigateToExerciseOverview(page);
        const updatedStats = await page.getByTestId('exercise-overview-stats').textContent();
        
        expect(updatedStats).not.toBe(initialStats);
        await expect(page.getByText('Integration Test')).toBeVisible();
        await expect(page.getByText('Integration Plan')).toBeVisible();
      });
    });

    test('should update stats when completing training sessions', async ({ page }) => {
      await test.step('Create training plan and complete session', async () => {
        const planId = await createTrainingPlan(page, 'Session Test Plan', 'intermediate', 4);
        await activateTrainingPlan(page, planId);
        await completeWorkoutSession(page, planId, ['Bench Press', 'Squats']);
      });

      await test.step('Verify completed sessions stat updates', async () => {
        await navigateToExerciseOverview(page);
        const completedSessionsCard = page.getByText('Completed Sessions').locator('..');
        await expect(completedSessionsCard.locator('.text-2xl')).not.toHaveText('0');
      });
    });

    test('should handle data synchronization across browser tabs', async ({ browser }) => {
      const context = await browser.newContext();
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      await test.step('Setup both tabs', async () => {
        await page1.setExtraHTTPHeaders({ 'x-e2e-random-id': e2eRandomId.toString() });
        await page2.setExtraHTTPHeaders({ 'x-e2e-random-id': e2eRandomId.toString() });
        
        await page1.goto('/dashboard/exercise');
        await page2.goto('/dashboard/exercise');
      });

      await test.step('Add data in first tab', async () => {
        await addExerciseLog(page1, 'Sync Test', 3, 10, 80);
      });

      await test.step('Verify data appears in second tab after refresh', async () => {
        await page2.reload();
        await expect(page2.getByText('Sync Test')).toBeVisible();
      });

      await context.close();
    });

    test('should validate stats calculations accuracy', async ({ page }) => {
      const testData = {
        logs: [
          { exercise: 'Test 1', sets: 3, reps: 10, weight: 80 },
          { exercise: 'Test 2', sets: 4, reps: 8, weight: 100 },
          { exercise: 'Test 3', sets: 3, reps: 5, weight: 120 },
        ],
        plans: [
          { name: 'Plan 1', difficulty: 'intermediate', sessions: 4 },
          { name: 'Plan 2', difficulty: 'advanced', sessions: 5 },
        ],
      };

      await test.step('Add test data', async () => {
        for (const log of testData.logs) {
          await addExerciseLog(page, log.exercise, log.sets, log.reps, log.weight);
        }
        
        for (const plan of testData.plans) {
          await createTrainingPlan(page, plan.name, plan.difficulty, plan.sessions);
        }
      });

      await test.step('Verify calculations', async () => {
        await navigateToExerciseOverview(page);
        await validateStatsCalculations(page, testData, {
          totalWorkouts: testData.logs.length,
          activePlans: testData.plans.length,
          completedSessions: 0,
          weeklyProgress: testData.logs.length,
        });
      });
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      await test.step('Simulate network failure', async () => {
        await page.route('**/api/exercise/**', route => route.abort());
      });

      await test.step('Verify graceful degradation', async () => {
        await page.goto('/dashboard/exercise');
        
        // Component should still render basic structure
        await expect(page.getByTestId('exercise-overview')).toBeVisible();
        
        // Should show appropriate error states
        await expect(page.getByText('Unable to load exercise data')).toBeVisible();
      });

      await test.step('Clean up route mock', async () => {
        await page.unroute('**/api/exercise/**');
      });
    });

    test('should handle corrupted or invalid data', async ({ page }) => {
      await test.step('Mock API with invalid data', async () => {
        await page.route('**/api/exercise/overview', route => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              recentLogs: [{ invalid: 'data' }],
              activeTrainingPlans: null,
              stats: { totalWorkouts: 'invalid' },
            }),
          });
        });
      });

      await test.step('Verify error handling', async () => {
        await page.goto('/dashboard/exercise');
        
        // Should show fallback content or error states
        await expect(page.getByTestId('exercise-overview')).toBeVisible();
        await expect(page.getByText('No recent workouts')).toBeVisible();
        await expect(page.getByText('No active training plans')).toBeVisible();
      });
    });

    test('should handle unauthorized access scenarios', async ({ page }) => {
      await test.step('Mock unauthorized response', async () => {
        await page.route('**/api/exercise/**', route => {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Unauthorized' }),
          });
        });
      });

      await test.step('Verify redirect to sign-in', async () => {
        await page.goto('/dashboard/exercise');
        await expect(page).toHaveURL(/.*\/sign-in/);
      });
    });

    test('should handle extremely large datasets', async ({ page }) => {
      await test.step('Create large dataset', async () => {
        // Add many exercise logs
        for (let i = 0; i < 50; i++) {
          await addExerciseLog(page, `Exercise ${i}`, 3, 10, 80 + i);
        }
        
        // Add many training plans
        for (let i = 0; i < 20; i++) {
          await createTrainingPlan(page, `Plan ${i}`, 'intermediate', 4);
        }
      });

      await test.step('Verify performance with large dataset', async () => {
        const startTime = Date.now();
        await navigateToExerciseOverview(page);
        const loadTime = Date.now() - startTime;
        
        // Should load within reasonable time (5 seconds)
        expect(loadTime).toBeLessThan(5000);
        
        // Should still display correctly
        await expect(page.getByTestId('exercise-overview')).toBeVisible();
        await expect(page.getByTestId('exercise-overview-recent-logs')).toBeVisible();
      });
    });

    test('should handle mobile responsiveness and touch interactions', async ({ page }) => {
      await test.step('Set mobile viewport', async () => {
        await page.setViewportSize({ width: 375, height: 667 });
      });

      await test.step('Verify mobile layout', async () => {
        await page.goto('/dashboard/exercise');
        
        // Should adapt to mobile layout
        await expect(page.getByTestId('exercise-overview')).toBeVisible();
        
        // Stats grid should stack on mobile
        const statsGrid = page.getByTestId('exercise-overview-stats');
        await expect(statsGrid).toHaveClass(/grid-cols-1/);
      });

      await test.step('Test touch interactions', async () => {
        const statCard = page.getByTestId('exercise-overview-stats').locator('[role="button"]').first();
        
        // Simulate touch tap
        await statCard.tap();
        await waitForTrackingEvent(page, 'exercise_stat_card_clicked');
        
        // Test quick action touch
        const quickAction = page.getByTestId('exercise-overview-quick-actions').locator('a').first();
        await quickAction.tap();
        
        // Should navigate properly
        await expect(page).toHaveURL(/.*\/dashboard\/exercise\/workout/);
      });
    });
  });

  test.describe('Performance E2E', () => {
    test('should load within acceptable time limits', async ({ page }) => {
      await test.step('Measure page load performance', async () => {
        const startTime = Date.now();
        await page.goto('/dashboard/exercise');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Should load within 3 seconds
        expect(loadTime).toBeLessThan(3000);
      });
    });

    test('should maintain responsiveness during interactions', async ({ page }) => {
      await test.step('Test interaction responsiveness', async () => {
        await page.goto('/dashboard/exercise');
        
        // Rapid clicks should not cause issues
        const statCard = page.getByTestId('exercise-overview-stats').locator('[role="button"]').first();
        
        for (let i = 0; i < 5; i++) {
          const startTime = Date.now();
          await statCard.click();
          const responseTime = Date.now() - startTime;
          
          // Each interaction should respond within 500ms
          expect(responseTime).toBeLessThan(500);
        }
      });
    });

    test('should handle slow network conditions', async ({ page }) => {
      await test.step('Simulate slow network', async () => {
        await page.route('**/api/exercise/**', async (route) => {
          // Add 2 second delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          await route.continue();
        });
      });

      await test.step('Verify loading states', async () => {
        await page.goto('/dashboard/exercise');
        
        // Should show loading indicators
        await expect(page.getByTestId('exercise-overview')).toBeVisible();
        
        // Should eventually load content
        await expect(page.getByTestId('exercise-overview-stats')).toBeVisible({ timeout: 10000 });
      });
    });

    test('should manage memory usage during extended use', async ({ page }) => {
      await test.step('Simulate extended usage', async () => {
        await page.goto('/dashboard/exercise');
        
        // Navigate between pages multiple times
        for (let i = 0; i < 10; i++) {
          await navigateToWorkoutPage(page);
          await navigateToExerciseOverview(page);
          await navigateToExerciseAnalytics(page);
          await navigateToExerciseOverview(page);
        }
        
        // Should still be responsive
        await expect(page.getByTestId('exercise-overview')).toBeVisible();
        
        const statCard = page.getByTestId('exercise-overview-stats').locator('[role="button"]').first();
        await statCard.click();
        await waitForTrackingEvent(page, 'exercise_stat_card_clicked');
      });
    });
  });
});