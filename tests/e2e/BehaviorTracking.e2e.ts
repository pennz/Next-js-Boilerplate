// Third-party libraries
import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';

// Local test helpers
import {
  addHealthGoal,
  addHealthRecord,
  getFutureDate,
} from './helpers/healthTestHelpers';

/**
 * The x-e2e-random-id header provides a unique identifier for each test request,
 * helping to trace and isolate test runs for improved reliability and debugging.
 * This header is set in the beforeEach hook and included in all test requests.
 */

test.describe('Behavioral Event Tracking', () => {
  let e2eRandomId: number;

  test.beforeEach(async ({ page }) => {
    e2eRandomId = faker.number.int({ max: 1000000 });
    await page.setExtraHTTPHeaders({
      'x-e2e-random-id': e2eRandomId.toString(),
    });

    // Enable behavioral tracking for tests
    await page.addInitScript(() => {
      window.localStorage.setItem('ENABLE_BEHAVIOR_TRACKING', 'true');
    });

    // Mock PostHog to capture events
    await page.addInitScript(() => {
      window.posthog = {
        capture: (eventName, properties) => {
          window.capturedEvents = window.capturedEvents || [];
          window.capturedEvents.push({ eventName, properties });
        },
        identify: () => {},
        reset: () => {},
      };
    });

    await page.goto('/dashboard/health');
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data
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

  test.describe('Health Overview Component Tracking', () => {
    test('should track health overview page view events', async ({ page }) => {
      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Wait for tracking to initialize
      await page.waitForTimeout(1000);

      // Check PostHog events
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const pageViewEvent = capturedEvents.find(event =>
        event.eventName === 'health_overview_viewed',
      );

      expect(pageViewEvent).toBeTruthy();
      expect(pageViewEvent.properties).toMatchObject({
        component: 'HealthOverview',
        page: '/dashboard/health',
      });
    });

    test('should track quick action button clicks', async ({ page }) => {
      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Intercept behavioral event API calls
      const behaviorEventRequests = [];
      await page.route('**/api/behavior/events', (route) => {
        behaviorEventRequests.push(route.request().postData());
        route.continue();
      });

      // Click "Add Record" quick action button
      await page.getByTestId('quick-action-add-record').click();
      await page.waitForTimeout(500);

      // Verify PostHog event
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const clickEvent = capturedEvents.find(event =>
        event.eventName === 'ui_click'
        && event.properties.buttonType === 'quick_action_add_record',
      );

      expect(clickEvent).toBeTruthy();
      expect(clickEvent.properties).toMatchObject({
        component: 'HealthOverview',
        buttonType: 'quick_action_add_record',
        action: 'add_health_record',
      });

      // Verify server-side event (may be batched)
      await page.waitForTimeout(2000);

      expect(behaviorEventRequests.length).toBeGreaterThan(0);
    });

    test('should track health statistics viewing', async ({ page }) => {
      // Add some test data first
      await addHealthRecord(page, 'weight', '75.5', 'kg');
      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Wait for stats to load and tracking to fire
      await page.waitForTimeout(1500);

      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const statsEvent = capturedEvents.find(event =>
        event.eventName === 'health_stats_viewed',
      );

      expect(statsEvent).toBeTruthy();
      expect(statsEvent.properties).toHaveProperty('totalRecords');
      expect(statsEvent.properties).toHaveProperty('activeGoals');
    });

    test('should track goal progress card interactions', async ({ page }) => {
      // Create a test goal first
      await addHealthGoal(page, 'weight', '70', getFutureDate(3));
      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Click on goal progress card
      await page.getByTestId('goal-progress-card').first().click();
      await page.waitForTimeout(500);

      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const goalEvent = capturedEvents.find(event =>
        event.eventName === 'goal_progress_viewed',
      );

      expect(goalEvent).toBeTruthy();
      expect(goalEvent.properties).toMatchObject({
        component: 'HealthOverview',
        goalType: 'weight',
      });
    });

    test('should track recent records interactions', async ({ page }) => {
      // Add test records
      await addHealthRecord(page, 'weight', '75.5', 'kg');
      await addHealthRecord(page, 'steps', '10000', 'steps');

      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Click on recent record item
      await page.getByTestId('recent-record-item').first().click();
      await page.waitForTimeout(500);

      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const recordEvent = capturedEvents.find(event =>
        event.eventName === 'recent_record_viewed',
      );

      expect(recordEvent).toBeTruthy();
      expect(recordEvent.properties).toHaveProperty('recordType');
      expect(recordEvent.properties).toHaveProperty('recordValue');
    });
  });

  test.describe('Exercise Overview Component Tracking', () => {
    test('should track exercise overview page view events', async ({ page }) => {
      await page.goto('/dashboard/exercise');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const pageViewEvent = capturedEvents.find(event =>
        event.eventName === 'exercise_overview_viewed',
      );

      expect(pageViewEvent).toBeTruthy();
      expect(pageViewEvent.properties).toMatchObject({
        component: 'ExerciseOverview',
        page: '/dashboard/exercise',
      });
    });

    test('should track exercise quick action button clicks', async ({ page }) => {
      await page.goto('/dashboard/exercise');
      await page.waitForLoadState('networkidle');

      // Click "Start Workout" quick action button
      await page.getByTestId('quick-action-start-workout').click();
      await page.waitForTimeout(500);

      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const clickEvent = capturedEvents.find(event =>
        event.eventName === 'ui_click'
        && event.properties.buttonType === 'quick_action_start_workout',
      );

      expect(clickEvent).toBeTruthy();
      expect(clickEvent.properties).toMatchObject({
        component: 'ExerciseOverview',
        buttonType: 'quick_action_start_workout',
        action: 'start_workout',
      });
    });

    test('should track training plan card interactions', async ({ page }) => {
      await page.goto('/dashboard/exercise');
      await page.waitForLoadState('networkidle');

      // Click on training plan card (if exists)
      const planCard = page.getByTestId('training-plan-card').first();
      if (await planCard.count() > 0) {
        await planCard.click();
        await page.waitForTimeout(500);

        const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
        const planEvent = capturedEvents.find(event =>
          event.eventName === 'training_plan_viewed',
        );

        expect(planEvent).toBeTruthy();
        expect(planEvent.properties).toHaveProperty('planId');
        expect(planEvent.properties).toHaveProperty('planType');
      }
    });

    test('should track workout statistics viewing', async ({ page }) => {
      await page.goto('/dashboard/exercise');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const statsEvent = capturedEvents.find(event =>
        event.eventName === 'exercise_stats_viewed',
      );

      expect(statsEvent).toBeTruthy();
      expect(statsEvent.properties).toHaveProperty('totalWorkouts');
      expect(statsEvent.properties).toHaveProperty('weeklyProgress');
    });
  });

  test.describe('Server-Side Event Tracking', () => {
    test('should track health record creation events', async ({ page }) => {
      const behaviorEventRequests = [];
      await page.route('**/api/behavior/events', (route) => {
        const postData = route.request().postData();
        if (postData) {
          behaviorEventRequests.push(JSON.parse(postData));
        }
        route.continue();
      });

      await page.goto('/dashboard/health/records');
      await addHealthRecord(page, 'weight', '75.5', 'kg');

      // Wait for potential batched events
      await page.waitForTimeout(3000);

      // Check if health record creation event was tracked
      const hasCreationEvent = behaviorEventRequests.some(request =>
        request.events && request.events.some(event =>
          event.eventName === 'health_record_created'
          && event.entityType === 'health_record',
        ),
      );

      expect(hasCreationEvent).toBeTruthy();
    });

    test('should track health record modification events', async ({ page }) => {
      // First create a record
      await page.goto('/dashboard/health/records');
      await addHealthRecord(page, 'weight', '75.0', 'kg');

      const behaviorEventRequests = [];
      await page.route('**/api/behavior/events', (route) => {
        const postData = route.request().postData();
        if (postData) {
          behaviorEventRequests.push(JSON.parse(postData));
        }
        route.continue();
      });

      // Edit the record
      await page.getByTestId('edit-record-button').first().click();
      await page.getByLabel('Value').fill('76.0');
      await page.getByRole('button', { name: 'Update Record' }).click();
      await page.waitForLoadState('networkidle');

      // Wait for events
      await page.waitForTimeout(3000);

      const hasUpdateEvent = behaviorEventRequests.some(request =>
        request.events && request.events.some(event =>
          event.eventName === 'health_record_updated'
          && event.entityType === 'health_record',
        ),
      );

      expect(hasUpdateEvent).toBeTruthy();
    });

    test('should track health record deletion events', async ({ page }) => {
      // First create a record
      await page.goto('/dashboard/health/records');
      await addHealthRecord(page, 'steps', '10000', 'steps');

      const behaviorEventRequests = [];
      await page.route('**/api/behavior/events', (route) => {
        const postData = route.request().postData();
        if (postData) {
          behaviorEventRequests.push(JSON.parse(postData));
        }
        route.continue();
      });

      // Delete the record
      await page.getByTestId('delete-record-button').first().click();
      await page.getByRole('button', { name: 'Confirm Delete' }).click();
      await page.waitForLoadState('networkidle');

      // Wait for events
      await page.waitForTimeout(3000);

      const hasDeleteEvent = behaviorEventRequests.some(request =>
        request.events && request.events.some(event =>
          event.eventName === 'health_record_deleted'
          && event.entityType === 'health_record',
        ),
      );

      expect(hasDeleteEvent).toBeTruthy();
    });

    test('should track health records query events', async ({ page }) => {
      const behaviorEventRequests = [];
      await page.route('**/api/behavior/events', (route) => {
        const postData = route.request().postData();
        if (postData) {
          behaviorEventRequests.push(JSON.parse(postData));
        }
        route.continue();
      });

      await page.goto('/dashboard/health/records');

      // Apply a filter to trigger query event
      await page.getByLabel('Filter by Type').selectOption('weight');
      await page.getByRole('button', { name: 'Apply Filter' }).click();
      await page.waitForLoadState('networkidle');

      // Wait for events
      await page.waitForTimeout(3000);

      const hasQueryEvent = behaviorEventRequests.some(request =>
        request.events && request.events.some(event =>
          event.eventName === 'health_records_queried',
        ),
      );

      expect(hasQueryEvent).toBeTruthy();
    });
  });

  test.describe('Client-Side Event Batching', () => {
    test('should batch multiple events before sending to server', async ({ page }) => {
      const behaviorEventRequests = [];
      await page.route('**/api/behavior/events', (route) => {
        const postData = route.request().postData();
        if (postData) {
          behaviorEventRequests.push(JSON.parse(postData));
        }
        route.continue();
      });

      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Trigger multiple quick actions
      await page.getByTestId('quick-action-add-record').click();
      await page.waitForTimeout(100);
      await page.getByRole('button', { name: 'Cancel' }).click();

      await page.getByTestId('quick-action-view-analytics').click();
      await page.waitForTimeout(100);
      await page.goBack();

      await page.getByTestId('quick-action-add-goal').click();
      await page.waitForTimeout(100);
      await page.getByRole('button', { name: 'Cancel' }).click();

      // Wait for batch to be sent (should be within 30 seconds or 10 events)
      await page.waitForTimeout(5000);

      // Should have batched events in fewer requests than individual events
      expect(behaviorEventRequests.length).toBeGreaterThan(0);

      // Check that at least one request contains multiple events
      const hasBatchedEvents = behaviorEventRequests.some(request =>
        request.events && request.events.length > 1,
      );

      expect(hasBatchedEvents).toBeTruthy();
    });

    test('should flush events after buffer size limit', async ({ page }) => {
      // Set a small buffer size for testing
      await page.addInitScript(() => {
        window.localStorage.setItem('BEHAVIOR_EVENT_BUFFER_SIZE', '3');
      });

      const behaviorEventRequests = [];
      await page.route('**/api/behavior/events', (route) => {
        const postData = route.request().postData();
        if (postData) {
          behaviorEventRequests.push(JSON.parse(postData));
        }
        route.continue();
      });

      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Trigger more events than buffer size
      for (let i = 0; i < 5; i++) {
        await page.getByTestId('quick-action-add-record').click();
        await page.waitForTimeout(50);
        await page.getByRole('button', { name: 'Cancel' }).click();
        await page.waitForTimeout(50);
      }

      // Wait for flush
      await page.waitForTimeout(2000);

      // Should have flushed when buffer reached limit
      expect(behaviorEventRequests.length).toBeGreaterThan(0);

      // First batch should have exactly 3 events (buffer size)
      const firstBatch = behaviorEventRequests[0];

      expect(firstBatch.events).toHaveLength(3);
    });

    test('should flush events after time interval', async ({ page }) => {
      // Set a short flush interval for testing
      await page.addInitScript(() => {
        window.localStorage.setItem('BEHAVIOR_EVENT_FLUSH_INTERVAL', '2000'); // 2 seconds
      });

      const behaviorEventRequests = [];
      await page.route('**/api/behavior/events', (route) => {
        const postData = route.request().postData();
        if (postData) {
          behaviorEventRequests.push(JSON.parse(postData));
        }
        route.continue();
      });

      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Trigger a single event
      await page.getByTestId('quick-action-add-record').click();
      await page.getByRole('button', { name: 'Cancel' }).click();

      // Wait for time-based flush (2 seconds + buffer)
      await page.waitForTimeout(3000);

      // Should have flushed due to time interval
      expect(behaviorEventRequests.length).toBeGreaterThan(0);
      expect(behaviorEventRequests[0].events.length).toBeGreaterThan(0);
    });
  });

  test.describe('PostHog Integration', () => {
    test('should capture events in PostHog with correct properties', async ({ page }) => {
      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Trigger an event
      await page.getByTestId('quick-action-add-record').click();
      await page.waitForTimeout(500);

      // Check PostHog captured the event
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const clickEvent = capturedEvents.find(event =>
        event.eventName === 'ui_click',
      );

      expect(clickEvent).toBeTruthy();
      expect(clickEvent.properties).toMatchObject({
        component: 'HealthOverview',
        buttonType: 'quick_action_add_record',
        action: 'add_health_record',
      });

      // Verify session ID is included
      expect(clickEvent.properties).toHaveProperty('sessionId');
      expect(typeof clickEvent.properties.sessionId).toBe('string');
    });

    test('should include device and browser context in events', async ({ page }) => {
      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Trigger an event
      await page.getByTestId('health-overview-stats').click();
      await page.waitForTimeout(500);

      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const statsEvent = capturedEvents.find(event =>
        event.eventName === 'health_stats_viewed',
      );

      expect(statsEvent).toBeTruthy();
      expect(statsEvent.properties.context).toHaveProperty('userAgent');
      expect(statsEvent.properties.context).toHaveProperty('viewport');
      expect(statsEvent.properties.context).toHaveProperty('timestamp');
    });

    test('should maintain session consistency across page navigation', async ({ page }) => {
      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Trigger event on health page
      await page.getByTestId('quick-action-add-record').click();
      await page.getByRole('button', { name: 'Cancel' }).click();
      await page.waitForTimeout(500);

      // Navigate to exercise page
      await page.goto('/dashboard/exercise');
      await page.waitForLoadState('networkidle');

      // Trigger event on exercise page
      await page.getByTestId('quick-action-start-workout').click();
      await page.waitForTimeout(500);

      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const healthEvent = capturedEvents.find(event =>
        event.eventName === 'ui_click'
        && event.properties.component === 'HealthOverview',
      );
      const exerciseEvent = capturedEvents.find(event =>
        event.eventName === 'ui_click'
        && event.properties.component === 'ExerciseOverview',
      );

      // Both events should have the same session ID
      expect(healthEvent.properties.sessionId).toBe(exerciseEvent.properties.sessionId);
    });
  });

  test.describe('User Experience and Performance', () => {
    test('should not interfere with normal user workflows', async ({ page }) => {
      await page.goto('/dashboard/health/records');

      // Measure time to complete normal workflow
      const startTime = Date.now();

      await addHealthRecord(page, 'weight', '75.5', 'kg');

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Workflow should complete in reasonable time (less than 10 seconds)
      expect(duration).toBeLessThan(10000);

      // Verify the record was actually created
      await expect(page.getByText('75.5 kg')).toBeVisible();
      await expect(page.getByText('Record added successfully')).toBeVisible();
    });

    test('should handle tracking errors gracefully', async ({ page }) => {
      // Simulate API failure for behavior events
      await page.route('**/api/behavior/events', (route) => {
        route.abort('failed');
      });

      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Normal functionality should still work despite tracking failure
      await page.getByTestId('quick-action-add-record').click();

      // Should still navigate to add record form
      await expect(page.getByLabel('Health Type')).toBeVisible();

      // Cancel and verify no user-facing errors
      await page.getByRole('button', { name: 'Cancel' }).click();

      // Should return to health overview without errors
      await expect(page.getByTestId('health-overview')).toBeVisible();
    });

    test('should not impact page load performance', async ({ page }) => {
      // Measure page load time
      const startTime = Date.now();

      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Page should load in reasonable time (less than 5 seconds)
      expect(loadTime).toBeLessThan(5000);

      // Verify tracking is initialized
      const hasTracking = await page.evaluate(() => {
        return typeof window.posthog !== 'undefined';
      });

      expect(hasTracking).toBeTruthy();
    });

    test('should respect feature flag settings', async ({ page }) => {
      // Disable behavioral tracking
      await page.addInitScript(() => {
        window.localStorage.setItem('ENABLE_BEHAVIOR_TRACKING', 'false');
      });

      const behaviorEventRequests = [];
      await page.route('**/api/behavior/events', (route) => {
        behaviorEventRequests.push(route.request());
        route.continue();
      });

      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Trigger actions
      await page.getByTestId('quick-action-add-record').click();
      await page.getByRole('button', { name: 'Cancel' }).click();

      // Wait for potential events
      await page.waitForTimeout(2000);

      // Should not send behavior events when disabled
      expect(behaviorEventRequests.length).toBe(0);

      // But PostHog events might still be captured (depending on implementation)
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      // This assertion depends on implementation - events might be filtered client-side
    });
  });

  test.describe('Different User Scenarios', () => {
    test('should track new user onboarding interactions', async ({ page }) => {
      // Simulate new user with no data
      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // New user should see empty states and onboarding prompts
      await page.getByTestId('onboarding-add-first-record').click();
      await page.waitForTimeout(500);

      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const onboardingEvent = capturedEvents.find(event =>
        event.eventName === 'onboarding_action'
        || (event.eventName === 'ui_click' && event.properties.context?.isFirstTime),
      );

      expect(onboardingEvent).toBeTruthy();
    });

    test('should track power user interaction patterns', async ({ page }) => {
      // Create multiple records to simulate power user
      await page.goto('/dashboard/health/records');

      for (let i = 0; i < 3; i++) {
        await addHealthRecord(page, 'weight', `${75 + i}.0`, 'kg');
        await page.waitForTimeout(200);
      }

      // Create goals
      await addHealthGoal(page, 'weight', '70', getFutureDate(3));

      // Navigate to analytics
      await page.goto('/dashboard/health/analytics/weight');
      await page.waitForLoadState('networkidle');

      // Power user interactions should be tracked
      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);

      // Should have multiple record creation events
      const recordEvents = capturedEvents.filter(event =>
        event.eventName === 'ui_click'
        && event.properties.action === 'add_health_record',
      );

      expect(recordEvents.length).toBeGreaterThanOrEqual(3);

      // Should have analytics view event
      const analyticsEvent = capturedEvents.find(event =>
        event.eventName === 'analytics_viewed'
        || event.eventName === 'health_analytics_viewed',
      );

      expect(analyticsEvent).toBeTruthy();
    });

    test('should track mobile vs desktop interaction differences', async ({ page, browserName }) => {
      // Simulate mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/dashboard/health');
      await page.waitForLoadState('networkidle');

      // Trigger mobile-specific interactions
      await page.getByTestId('mobile-menu-toggle').click();
      await page.waitForTimeout(500);

      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);
      const mobileEvent = capturedEvents.find(event =>
        event.properties.context?.viewport?.width === 375,
      );

      expect(mobileEvent).toBeTruthy();
      expect(mobileEvent.properties.context.isMobile).toBeTruthy();
    });

    test('should track error recovery scenarios', async ({ page }) => {
      await page.goto('/dashboard/health/records');

      // Trigger validation error
      await page.getByRole('button', { name: 'Add Record' }).click();
      await page.getByLabel('Health Type').selectOption('weight');
      await page.getByLabel('Value').fill('-10'); // Invalid value
      await page.getByRole('button', { name: 'Save Record' }).click();
      await page.waitForTimeout(500);

      // Correct the error
      await page.getByLabel('Value').fill('75.0');
      await page.getByRole('button', { name: 'Save Record' }).click();
      await page.waitForLoadState('networkidle');

      const capturedEvents = await page.evaluate(() => window.capturedEvents || []);

      // Should track both error and recovery
      const errorEvent = capturedEvents.find(event =>
        event.eventName === 'validation_error'
        || (event.eventName === 'form_error' && event.properties.errorType === 'validation'),
      );

      const recoveryEvent = capturedEvents.find(event =>
        event.eventName === 'error_recovery'
        || (event.eventName === 'form_success' && event.properties.hadPreviousError),
      );

      expect(errorEvent).toBeTruthy();
      expect(recoveryEvent).toBeTruthy();
    });
  });
});
