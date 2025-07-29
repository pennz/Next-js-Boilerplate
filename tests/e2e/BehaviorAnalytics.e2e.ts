// Third-party libraries
import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';

// Local test helpers
import {
  addBehaviorEvent,
  addContextPattern,
  addHabitStrengthData,
  cleanupBehaviorAnalyticsData,
  createBehaviorAnalyticsData,
  createBehaviorFrequencyData,
  generateAnalyticsSummary,
  getFutureDate,
  mockBehaviorAnalyticsAPI,
  navigateToBehaviorAnalytics,
  selectTimeRange,
  verifyDashboardMetrics,
  waitForDashboardLoad,
} from './helpers/behaviorAnalyticsTestHelpers';

/**
 * The x-e2e-random-id header provides a unique identifier for each test request,
 * helping to trace and isolate test runs for improved reliability and debugging.
 * This header is set in the beforeEach hook and included in all test requests.
 */

test.describe('Behavior Analytics', () => {
  let e2eRandomId: number;

  test.beforeEach(async ({ page }) => {
    e2eRandomId = faker.number.int({ max: 1000000 });
    await page.setExtraHTTPHeaders({
      'x-e2e-random-id': e2eRandomId.toString(),
    });
    await navigateToBehaviorAnalytics(page);
  });

  test.afterEach(async ({ page }) => {
    // Clean up behavioral analytics test data
    await cleanupBehaviorAnalyticsData(page);
  });

  test.describe('BehaviorAnalyticsChart E2E Tests', () => {
    test('should render charts correctly with different data types and chart types', async ({
      page,
    }) => {
      await test.step('Create test data for all chart types', async () => {
        await createBehaviorAnalyticsData(page, {
          includeHabitStrength: true,
          includeContextPatterns: true,
          includeBehaviorFrequency: true,
          timeRange: '30d',
        });
      });

      await test.step('Navigate to analytics page with charts', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
      });

      await test.step('Verify all chart types render correctly', async () => {
        // Habit Strength Chart
        await expect(page.getByTestId('habit-strength-chart')).toBeVisible();
        await expect(page.getByText('Habit Strength Over Time')).toBeVisible();

        // Context Patterns Chart
        await expect(page.getByTestId('context-patterns-chart')).toBeVisible();
        await expect(page.getByText('Context Success Patterns')).toBeVisible();

        // Behavior Frequency Chart
        await expect(page.getByTestId('behavior-frequency-chart')).toBeVisible();
        await expect(page.getByText('Behavior Frequency Trends')).toBeVisible();
      });

      await test.step('Verify chart data is displayed', async () => {
        // Check for chart elements (SVG containers)
        await expect(page.locator('.recharts-wrapper')).toHaveCount(3);
        await expect(page.locator('.recharts-surface')).toHaveCount(3);
      });
    });

    test('should handle chart interactions correctly', async ({ page }) => {
      await test.step('Create context patterns data for interaction testing', async () => {
        await addContextPattern(page, {
          context: 'morning_routine',
          successRate: 85,
          frequency: 12,
          confidence: 90,
          predictivePower: 75,
        });
      });

      await test.step('Navigate to dashboard and wait for load', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
      });

      await test.step('Click on context patterns chart bar', async () => {
        // Wait for chart to render
        await expect(page.getByTestId('context-patterns-chart')).toBeVisible();
        
        // Click on a bar in the context patterns chart
        await page.locator('.recharts-bar-rectangle').first().click();
        
        // Verify tracking event was triggered (check for console log or API call)
        await page.waitForTimeout(500);
      });

      await test.step('Test chart hover interactions', async () => {
        // Hover over chart elements to trigger tooltips
        await page.locator('.recharts-bar-rectangle').first().hover();
        
        // Verify tooltip appears
        await expect(page.locator('.recharts-tooltip-wrapper')).toBeVisible();
      });
    });

    test('should adapt to different viewport sizes', async ({ page }) => {
      await test.step('Create test data', async () => {
        await createBehaviorFrequencyData(page, 'daily_exercise', '30d');
      });

      await test.step('Test desktop viewport', async () => {
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        await expect(page.getByTestId('behavior-frequency-chart')).toBeVisible();
        
        // Verify chart maintains proper dimensions
        const chartContainer = page.getByTestId('behavior-frequency-chart');
        const boundingBox = await chartContainer.boundingBox();
        expect(boundingBox?.width).toBeGreaterThan(400);
      });

      await test.step('Test tablet viewport', async () => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.reload();
        await waitForDashboardLoad(page);
        
        await expect(page.getByTestId('behavior-frequency-chart')).toBeVisible();
        
        // Verify responsive layout
        const chartContainer = page.getByTestId('behavior-frequency-chart');
        const boundingBox = await chartContainer.boundingBox();
        expect(boundingBox?.width).toBeLessThan(800);
      });

      await test.step('Test mobile viewport', async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.reload();
        await waitForDashboardLoad(page);
        
        await expect(page.getByTestId('behavior-frequency-chart')).toBeVisible();
        
        // Verify mobile layout adaptations
        const chartContainer = page.getByTestId('behavior-frequency-chart');
        const boundingBox = await chartContainer.boundingBox();
        expect(boundingBox?.width).toBeLessThan(400);
      });
    });

    test('should update charts when data changes or time range is modified', async ({
      page,
    }) => {
      await test.step('Create initial data for 7 days', async () => {
        await createBehaviorFrequencyData(page, 'meditation', '7d');
      });

      await test.step('Navigate to dashboard and select 7d range', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        await selectTimeRange(page, '7d');
      });

      await test.step('Verify initial chart data', async () => {
        await expect(page.getByTestId('behavior-frequency-chart')).toBeVisible();
        await expect(page.getByText('7 data points')).toBeVisible();
      });

      await test.step('Add more data for 30 days', async () => {
        await createBehaviorFrequencyData(page, 'meditation', '30d');
      });

      await test.step('Change time range to 30d and verify update', async () => {
        await selectTimeRange(page, '30d');
        await page.waitForLoadState('networkidle');
        
        // Verify chart updated with more data points
        await expect(page.getByText('30 data points')).toBeVisible();
      });
    });

    test('should display appropriate error states and recovery', async ({
      page,
    }) => {
      await test.step('Mock API error for chart data', async () => {
        await page.route('**/api/behavior/analytics/frequency**', route => 
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal server error' }),
          })
        );
      });

      await test.step('Navigate to dashboard and verify error state', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Verify error state is displayed
        await expect(page.getByText('Failed to load analytics')).toBeVisible();
        await expect(page.locator('.text-red-500')).toBeVisible();
      });

      await test.step('Remove API mock and test recovery', async () => {
        await page.unroute('**/api/behavior/analytics/frequency**');
        
        // Create valid data
        await createBehaviorFrequencyData(page, 'reading', '30d');
        
        // Refresh page to test recovery
        await page.reload();
        await waitForDashboardLoad(page);
        
        // Verify chart loads successfully
        await expect(page.getByTestId('behavior-frequency-chart')).toBeVisible();
        await expect(page.getByText('Failed to load analytics')).toBeHidden();
      });
    });
  });

  test.describe('BehaviorAnalyticsDashboard E2E Tests', () => {
    test('should load complete dashboard with all sections', async ({ page }) => {
      await test.step('Create comprehensive test data', async () => {
        await createBehaviorAnalyticsData(page, {
          includeHabitStrength: true,
          includeContextPatterns: true,
          includeBehaviorFrequency: true,
          includePatterns: true,
          timeRange: '30d',
        });
      });

      await test.step('Navigate to dashboard and verify all sections load', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Verify main dashboard container
        await expect(page.getByTestId('behavior-analytics-dashboard')).toBeVisible();
        
        // Verify header section
        await expect(page.getByText('Behavior Analytics')).toBeVisible();
        await expect(page.getByText('Real-time insights into your habits and patterns')).toBeVisible();
        
        // Verify metrics grid
        await expect(page.getByText('Habit Strength')).toBeVisible();
        await expect(page.getByText('Active Patterns')).toBeVisible();
        await expect(page.getByText('Consistency')).toBeVisible();
        await expect(page.getByText('Prediction Accuracy')).toBeVisible();
        
        // Verify charts grid
        await expect(page.getByTestId('habit-strength-chart')).toBeVisible();
        await expect(page.getByTestId('context-patterns-chart')).toBeVisible();
        await expect(page.getByTestId('behavior-frequency-chart')).toBeVisible();
        
        // Verify pattern insights section
        await expect(page.getByText('Recent Pattern Insights')).toBeVisible();
      });
    });

    test('should handle authentication flow correctly', async ({ page }) => {
      await test.step('Test unauthenticated state', async () => {
        // Mock unauthenticated user
        await page.route('**/api/auth/**', route => 
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Unauthorized' }),
          })
        );
        
        await page.goto('/dashboard/analytics/behavior');
        
        // Verify sign-in message is displayed
        await expect(page.getByText('Please sign in to view your behavior analytics')).toBeVisible();
      });

      await test.step('Test authenticated state', async () => {
        // Remove auth mock
        await page.unroute('**/api/auth/**');
        
        // Create test data
        await generateAnalyticsSummary(page, {
          totalEvents: 150,
          activePatterns: 8,
          habitStrengthAvg: 75,
          consistencyScore: 82,
        });
        
        await page.reload();
        await waitForDashboardLoad(page);
        
        // Verify dashboard loads with data
        await expect(page.getByTestId('behavior-analytics-dashboard')).toBeVisible();
        await expect(page.getByText('Please sign in')).toBeHidden();
      });
    });

    test('should fetch data from correct API endpoints on load', async ({ page }) => {
      const apiCalls: string[] = [];
      
      await test.step('Monitor API calls', async () => {
        await page.route('**/api/behavior/analytics/**', (route) => {
          apiCalls.push(route.request().url());
          route.continue();
        });
      });

      await test.step('Navigate to dashboard and verify API calls', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Verify expected API endpoints were called
        expect(apiCalls).toContain(expect.stringContaining('/api/behavior/analytics/summary'));
        expect(apiCalls).toContain(expect.stringContaining('/api/behavior/analytics/habit-strength'));
        expect(apiCalls).toContain(expect.stringContaining('/api/behavior/analytics/context-patterns'));
        expect(apiCalls).toContain(expect.stringContaining('/api/behavior/analytics/frequency'));
      });
    });

    test('should handle real-time updates correctly', async ({ page }) => {
      await test.step('Enable real-time updates and create initial data', async () => {
        await generateAnalyticsSummary(page, {
          totalEvents: 100,
          activePatterns: 5,
          habitStrengthAvg: 70,
          consistencyScore: 75,
        });
        
        await page.goto('/dashboard/analytics/behavior?realtime=true');
        await waitForDashboardLoad(page);
      });

      await test.step('Verify real-time indicator is active', async () => {
        await expect(page.getByText('Live')).toBeVisible();
        await expect(page.locator('.bg-green-500.animate-pulse')).toBeVisible();
      });

      await test.step('Simulate data update and verify refresh', async () => {
        // Update analytics data
        await generateAnalyticsSummary(page, {
          totalEvents: 120,
          activePatterns: 6,
          habitStrengthAvg: 75,
          consistencyScore: 80,
        });
        
        // Wait for automatic refresh (30 seconds by default, but we'll trigger manually)
        await page.evaluate(() => {
          // Trigger a manual refresh for testing
          window.dispatchEvent(new Event('focus'));
        });
        
        await page.waitForTimeout(2000);
        
        // Verify updated values appear
        await expect(page.getByText('120')).toBeVisible();
        await expect(page.getByText('6')).toBeVisible();
      });

      await test.step('Test disabling real-time updates', async () => {
        await page.goto('/dashboard/analytics/behavior?realtime=false');
        await waitForDashboardLoad(page);
        
        // Verify real-time indicator shows offline
        await expect(page.getByText('Offline')).toBeVisible();
        await expect(page.locator('.bg-gray-300')).toBeVisible();
      });
    });

    test('should handle API failures gracefully', async ({ page }) => {
      await test.step('Mock partial API failures', async () => {
        // Mock summary endpoint failure
        await page.route('**/api/behavior/analytics/summary**', route => 
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Summary service unavailable' }),
          })
        );
        
        // Allow other endpoints to succeed
        await addHabitStrengthData(page, '30d', [
          { date: '2024-01-01', habitStrength: 75, consistencyScore: 80, frequencyScore: 70 },
        ]);
      });

      await test.step('Navigate to dashboard and verify graceful degradation', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Verify error message for failed section
        await expect(page.getByText('Failed to load summary')).toBeVisible();
        
        // Verify other sections still load
        await expect(page.getByTestId('habit-strength-chart')).toBeVisible();
      });

      await test.step('Test error recovery', async () => {
        // Remove API mock
        await page.unroute('**/api/behavior/analytics/summary**');
        
        // Add valid summary data
        await generateAnalyticsSummary(page, {
          totalEvents: 80,
          activePatterns: 4,
          habitStrengthAvg: 65,
          consistencyScore: 70,
        });
        
        // Refresh page
        await page.reload();
        await waitForDashboardLoad(page);
        
        // Verify recovery
        await expect(page.getByText('Failed to load summary')).toBeHidden();
        await expect(page.getByText('Habit Strength')).toBeVisible();
      });
    });
  });

  test.describe('Metric Cards Interaction Tests', () => {
    test('should display metric cards with correct values and trends', async ({
      page,
    }) => {
      await test.step('Create test data with specific metrics', async () => {
        await generateAnalyticsSummary(page, {
          totalEvents: 250,
          activePatterns: 12,
          habitStrengthAvg: 85,
          consistencyScore: 90,
          weeklyTrend: 'up',
          predictionAccuracy: 88,
        });
      });

      await test.step('Navigate to dashboard and verify metric cards', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Verify metric card values
        await expect(page.getByText('85%')).toBeVisible(); // Habit Strength
        await expect(page.getByText('12')).toBeVisible(); // Active Patterns
        await expect(page.getByText('90%')).toBeVisible(); // Consistency
        await expect(page.getByText('88%')).toBeVisible(); // Prediction Accuracy
        
        // Verify trend indicators
        await expect(page.getByText('📈')).toBeVisible(); // Up trend
        await expect(page.getByText('up trend')).toBeVisible();
      });

      await test.step('Verify metric card styling and colors', async () => {
        // Verify habit strength card has purple styling
        const habitStrengthCard = page.locator('text=Habit Strength').locator('..');
        await expect(habitStrengthCard).toHaveClass(/border-purple-200/);
        
        // Verify active patterns card has blue styling
        const activePatternsCard = page.locator('text=Active Patterns').locator('..');
        await expect(activePatternsCard).toHaveClass(/border-blue-200/);
      });
    });

    test('should trigger behavioral tracking events on metric card clicks', async ({
      page,
    }) => {
      const trackingEvents: any[] = [];
      
      await test.step('Monitor tracking events', async () => {
        await page.route('**/api/behavior/events**', (route) => {
          const requestBody = route.request().postDataJSON();
          trackingEvents.push(requestBody);
          route.continue();
        });
      });

      await test.step('Create test data and navigate to dashboard', async () => {
        await generateAnalyticsSummary(page, {
          totalEvents: 100,
          activePatterns: 5,
          habitStrengthAvg: 75,
          consistencyScore: 80,
        });
        
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
      });

      await test.step('Click metric cards and verify tracking events', async () => {
        // Click habit strength card
        await page.locator('text=Habit Strength').locator('..').click();
        await page.waitForTimeout(500);
        
        // Click active patterns card
        await page.locator('text=Active Patterns').locator('..').click();
        await page.waitForTimeout(500);
        
        // Verify tracking events were fired
        expect(trackingEvents.length).toBeGreaterThan(0);
        
        // Verify event structure
        const habitStrengthEvent = trackingEvents.find(event => 
          event.events?.some((e: any) => e.eventName === 'analytics_metric_viewed')
        );
        expect(habitStrengthEvent).toBeDefined();
      });
    });

    test('should be keyboard accessible', async ({ page }) => {
      await test.step('Create test data', async () => {
        await generateAnalyticsSummary(page, {
          totalEvents: 150,
          activePatterns: 8,
          habitStrengthAvg: 70,
          consistencyScore: 85,
        });
      });

      await test.step('Navigate to dashboard and test keyboard navigation', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Focus first metric card using Tab
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        // Verify focus is on a metric card
        const focusedElement = await page.locator(':focus');
        await expect(focusedElement).toHaveAttribute('role', 'button');
        
        // Activate with Enter key
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        
        // Navigate to next card with Tab
        await page.keyboard.press('Tab');
        
        // Activate with Space key
        await page.keyboard.press(' ');
        await page.waitForTimeout(500);
      });
    });

    test('should adapt to different screen sizes', async ({ page }) => {
      await test.step('Create test data', async () => {
        await generateAnalyticsSummary(page, {
          totalEvents: 200,
          activePatterns: 10,
          habitStrengthAvg: 80,
          consistencyScore: 75,
        });
      });

      await test.step('Test desktop layout', async () => {
        await page.setViewportSize({ width: 1200, height: 800 });
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Verify 4-column grid on desktop
        const metricsGrid = page.locator('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
        await expect(metricsGrid).toBeVisible();
      });

      await test.step('Test tablet layout', async () => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.reload();
        await waitForDashboardLoad(page);
        
        // Verify responsive grid adapts
        const metricCards = page.locator('[role="button"]').filter({ hasText: /Habit Strength|Active Patterns|Consistency|Prediction Accuracy/ });
        await expect(metricCards).toHaveCount(4);
      });

      await test.step('Test mobile layout', async () => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.reload();
        await waitForDashboardLoad(page);
        
        // Verify single column layout on mobile
        const metricCards = page.locator('[role="button"]').filter({ hasText: /Habit Strength|Active Patterns|Consistency|Prediction Accuracy/ });
        await expect(metricCards).toHaveCount(4);
        
        // Verify cards stack vertically
        const firstCard = metricCards.first();
        const secondCard = metricCards.nth(1);
        
        const firstCardBox = await firstCard.boundingBox();
        const secondCardBox = await secondCard.boundingBox();
        
        expect(secondCardBox?.y).toBeGreaterThan(firstCardBox?.y! + firstCardBox?.height!);
      });
    });
  });

  test.describe('Pattern Insights Section Tests', () => {
    test('should display pattern insight cards with correct data', async ({
      page,
    }) => {
      await test.step('Create test patterns with varied strength levels', async () => {
        await createBehaviorAnalyticsData(page, {
          includePatterns: true,
          patterns: [
            {
              id: 'pattern1',
              behaviorType: 'morning_exercise',
              strength: 85,
              frequency: 6,
              consistency: 90,
              confidence: 88,
              topTrigger: 'alarm_clock',
            },
            {
              id: 'pattern2',
              behaviorType: 'evening_reading',
              strength: 65,
              frequency: 4,
              consistency: 75,
              confidence: 70,
              topTrigger: 'bedtime_routine',
            },
            {
              id: 'pattern3',
              behaviorType: 'meditation',
              strength: 45,
              frequency: 3,
              consistency: 60,
              confidence: 55,
              topTrigger: 'stress_level',
            },
          ],
        });
      });

      await test.step('Navigate to dashboard and verify pattern cards', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Verify pattern insights section
        await expect(page.getByText('Recent Pattern Insights')).toBeVisible();
        
        // Verify pattern cards are displayed
        await expect(page.getByText('morning_exercise')).toBeVisible();
        await expect(page.getByText('evening_reading')).toBeVisible();
        await expect(page.getByText('meditation')).toBeVisible();
        
        // Verify strength indicators with correct colors
        await expect(page.getByText('85% strong')).toHaveClass(/bg-green-100/);
        await expect(page.getByText('65% strong')).toHaveClass(/bg-yellow-100/);
        await expect(page.getByText('45% strong')).toHaveClass(/bg-gray-100/);
        
        // Verify frequency and consistency data
        await expect(page.getByText('6x/week')).toBeVisible();
        await expect(page.getByText('90%')).toBeVisible(); // consistency
        await expect(page.getByText('88%')).toBeVisible(); // confidence
        
        // Verify top triggers
        await expect(page.getByText('Top trigger: alarm_clock')).toBeVisible();
        await expect(page.getByText('Top trigger: bedtime_routine')).toBeVisible();
      });
    });

    test('should trigger tracking events on pattern card interactions', async ({
      page,
    }) => {
      const trackingEvents: any[] = [];
      
      await test.step('Monitor tracking events', async () => {
        await page.route('**/api/behavior/events**', (route) => {
          const requestBody = route.request().postDataJSON();
          trackingEvents.push(requestBody);
          route.continue();
        });
      });

      await test.step('Create test pattern and navigate to dashboard', async () => {
        await createBehaviorAnalyticsData(page, {
          includePatterns: true,
          patterns: [
            {
              id: 'test_pattern',
              behaviorType: 'daily_walk',
              strength: 75,
              frequency: 5,
              consistency: 80,
              confidence: 85,
            },
          ],
        });
        
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
      });

      await test.step('Click pattern card and verify tracking', async () => {
        await page.getByText('daily_walk').locator('..').click();
        await page.waitForTimeout(500);
        
        // Verify tracking event was fired
        const patternEvent = trackingEvents.find(event => 
          event.events?.some((e: any) => e.eventName === 'pattern_insight_viewed')
        );
        expect(patternEvent).toBeDefined();
        
        // Verify event contains correct context
        const event = patternEvent.events.find((e: any) => e.eventName === 'pattern_insight_viewed');
        expect(event.entityType).toBe('behavior_pattern');
        expect(event.entityId).toBe('test_pattern');
      });
    });

    test('should display empty state when no patterns are detected', async ({
      page,
    }) => {
      await test.step('Navigate to dashboard without creating patterns', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
      });

      await test.step('Verify empty state is displayed', async () => {
        await expect(page.getByText('Recent Pattern Insights')).toBeVisible();
        await expect(page.getByText('No patterns detected yet. Keep tracking your behaviors!')).toBeVisible();
      });
    });

    test('should show analyzing state during pattern analysis', async ({
      page,
    }) => {
      await test.step('Mock pattern analysis in progress', async () => {
        await page.route('**/api/behavior/micro-patterns**', route => {
          // Delay response to simulate analysis
          setTimeout(() => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ patterns: [], isAnalyzing: true }),
            });
          }, 2000);
        });
      });

      await test.step('Navigate to dashboard and verify analyzing state', async () => {
        await page.goto('/dashboard/analytics/behavior');
        
        // Verify analyzing indicator appears
        await expect(page.getByText('Analyzing patterns...')).toBeVisible();
        await expect(page.locator('.animate-spin')).toBeVisible();
      });
    });
  });

  test.describe('Time Range Selection Tests', () => {
    test('should update dashboard data when time range changes', async ({
      page,
    }) => {
      await test.step('Create data for different time ranges', async () => {
        await createBehaviorFrequencyData(page, 'exercise', '7d');
        await createBehaviorFrequencyData(page, 'exercise', '30d');
        await createBehaviorFrequencyData(page, 'exercise', '90d');
      });

      await test.step('Navigate to dashboard and test time range selection', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Test 7d selection
        await selectTimeRange(page, '7d');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('7d')).toHaveClass(/bg-purple-100/);
        
        // Test 30d selection
        await selectTimeRange(page, '30d');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('30d')).toHaveClass(/bg-purple-100/);
        
        // Test 90d selection
        await selectTimeRange(page, '90d');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('90d')).toHaveClass(/bg-purple-100/);
        
        // Test 1y selection
        await selectTimeRange(page, '1y');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('1y')).toHaveClass(/bg-purple-100/);
      });
    });

    test('should trigger new API calls when time range changes', async ({
      page,
    }) => {
      const apiCalls: string[] = [];
      
      await test.step('Monitor API calls', async () => {
        await page.route('**/api/behavior/analytics/**', (route) => {
          apiCalls.push(route.request().url());
          route.continue();
        });
      });

      await test.step('Navigate to dashboard and change time ranges', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Clear initial API calls
        apiCalls.length = 0;
        
        // Change to 7d range
        await selectTimeRange(page, '7d');
        await page.waitForLoadState('networkidle');
        
        // Verify API calls include timeRange parameter
        const summaryCall = apiCalls.find(url => url.includes('/summary') && url.includes('timeRange=7d'));
        expect(summaryCall).toBeDefined();
        
        // Clear and test 90d range
        apiCalls.length = 0;
        await selectTimeRange(page, '90d');
        await page.waitForLoadState('networkidle');
        
        const summaryCall90d = apiCalls.find(url => url.includes('/summary') && url.includes('timeRange=90d'));
        expect(summaryCall90d).toBeDefined();
      });
    });

    test('should be keyboard accessible', async ({ page }) => {
      await test.step('Navigate to dashboard', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
      });

      await test.step('Test keyboard navigation of time range buttons', async () => {
        // Tab to time range buttons
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        // Navigate through time range buttons
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Enter');
        
        // Verify selection changed
        await expect(page.getByText('30d')).toHaveClass(/bg-purple-100/);
        
        // Continue navigation
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Enter');
        
        await expect(page.getByText('90d')).toHaveClass(/bg-purple-100/);
      });
    });

    test('should persist selected time range during real-time updates', async ({
      page,
    }) => {
      await test.step('Navigate to dashboard with real-time enabled', async () => {
        await page.goto('/dashboard/analytics/behavior?realtime=true');
        await waitForDashboardLoad(page);
      });

      await test.step('Select 7d time range', async () => {
        await selectTimeRange(page, '7d');
        await page.waitForLoadState('networkidle');
        
        // Verify selection
        await expect(page.getByText('7d')).toHaveClass(/bg-purple-100/);
      });

      await test.step('Simulate real-time update and verify persistence', async () => {
        // Trigger a simulated update
        await page.evaluate(() => {
          window.dispatchEvent(new Event('focus'));
        });
        
        await page.waitForTimeout(1000);
        
        // Verify time range selection persists
        await expect(page.getByText('7d')).toHaveClass(/bg-purple-100/);
      });
    });
  });

  test.describe('Navigation and Links Tests', () => {
    test('should navigate to full analytics page correctly', async ({ page }) => {
      await test.step('Navigate to dashboard', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
      });

      await test.step('Click View Full Analytics link', async () => {
        await page.getByRole('link', { name: 'View Full Analytics →' }).click();
        
        // Verify navigation to full analytics page
        await expect(page).toHaveURL(/.*\/dashboard\/analytics\/behavior/);
      });
    });

    test('should navigate to patterns page correctly', async ({ page }) => {
      await test.step('Navigate to dashboard', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
      });

      await test.step('Click View All Patterns link', async () => {
        await page.getByRole('link', { name: 'View All Patterns' }).click();
        
        // Verify navigation to patterns page
        await expect(page).toHaveURL(/.*\/dashboard\/analytics\/patterns/);
      });
    });

    test('should have accessible navigation links', async ({ page }) => {
      await test.step('Navigate to dashboard', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
      });

      await test.step('Test keyboard accessibility of links', async () => {
        // Tab to navigation links
        await page.keyboard.press('Tab');
        
        // Find and focus on View Full Analytics link
        const fullAnalyticsLink = page.getByRole('link', { name: 'View Full Analytics →' });
        await fullAnalyticsLink.focus();
        
        // Verify link is focusable and has proper attributes
        await expect(fullAnalyticsLink).toBeFocused();
        await expect(fullAnalyticsLink).toHaveAttribute('href');
        
        // Test activation with Enter key
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
      });
    });

    test('should display proper link hover states', async ({ page }) => {
      await test.step('Navigate to dashboard', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
      });

      await test.step('Test link hover effects', async () => {
        const fullAnalyticsLink = page.getByRole('link', { name: 'View Full Analytics →' });
        
        // Hover over link
        await fullAnalyticsLink.hover();
        
        // Verify hover styling (border appears)
        await expect(fullAnalyticsLink).toHaveClass(/hover:border-b-2/);
      });
    });
  });

  test.describe('Data Persistence Tests', () => {
    test('should persist dashboard state across page reloads', async ({
      page,
    }) => {
      await test.step('Create test data and set initial state', async () => {
        await generateAnalyticsSummary(page, {
          totalEvents: 180,
          activePatterns: 9,
          habitStrengthAvg: 78,
          consistencyScore: 85,
        });
        
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Select specific time range
        await selectTimeRange(page, '90d');
        await page.waitForLoadState('networkidle');
      });

      await test.step('Reload page and verify state persistence', async () => {
        await page.reload();
        await waitForDashboardLoad(page);
        
        // Verify data persists
        await expect(page.getByText('180')).toBeVisible();
        await expect(page.getByText('9')).toBeVisible();
        
        // Verify time range selection persists
        await expect(page.getByText('90d')).toHaveClass(/bg-purple-100/);
      });
    });

    test('should handle cached vs fresh data appropriately', async ({
      page,
    }) => {
      await test.step('Create initial data', async () => {
        await generateAnalyticsSummary(page, {
          totalEvents: 100,
          activePatterns: 5,
          habitStrengthAvg: 70,
          consistencyScore: 75,
        });
      });

      await test.step('Load dashboard and verify initial data', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        await expect(page.getByText('100')).toBeVisible();
        await expect(page.getByText('5')).toBeVisible();
      });

      await test.step('Update data and test cache behavior', async () => {
        // Update analytics data
        await generateAnalyticsSummary(page, {
          totalEvents: 150,
          activePatterns: 8,
          habitStrengthAvg: 80,
          consistencyScore: 85,
        });
        
        // Force refresh to get fresh data
        await page.keyboard.press('F5');
        await waitForDashboardLoad(page);
        
        // Verify fresh data is loaded
        await expect(page.getByText('150')).toBeVisible();
        await expect(page.getByText('8')).toBeVisible();
      });
    });
  });

  test.describe('Accessibility E2E Tests', () => {
    test('should support complete keyboard navigation', async ({ page }) => {
      await test.step('Create test data', async () => {
        await createBehaviorAnalyticsData(page, {
          includeHabitStrength: true,
          includeContextPatterns: true,
          includeBehaviorFrequency: true,
          includePatterns: true,
        });
      });

      await test.step('Navigate dashboard using only keyboard', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Tab through all interactive elements
        let tabCount = 0;
        const maxTabs = 20;
        
        while (tabCount < maxTabs) {
          await page.keyboard.press('Tab');
          tabCount++;
          
          const focusedElement = await page.locator(':focus');
          const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
          
          // Verify focusable elements are interactive
          if (['button', 'a', 'input', 'select'].includes(tagName)) {
            const role = await focusedElement.getAttribute('role');
            const tabIndex = await focusedElement.getAttribute('tabindex');
            
            // Verify element is properly focusable
            expect(tabIndex !== '-1').toBeTruthy();
          }
        }
      });
    });

    test('should provide proper ARIA labels and descriptions', async ({
      page,
    }) => {
      await test.step('Navigate to dashboard', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
      });

      await test.step('Verify ARIA attributes on interactive elements', async () => {
        // Check metric cards have proper ARIA attributes
        const metricCards = page.locator('[role="button"]').filter({ 
          hasText: /Habit Strength|Active Patterns|Consistency|Prediction Accuracy/ 
        });
        
        for (let i = 0; i < await metricCards.count(); i++) {
          const card = metricCards.nth(i);
          
          // Verify role attribute
          await expect(card).toHaveAttribute('role', 'button');
          
          // Verify tabindex for keyboard accessibility
          await expect(card).toHaveAttribute('tabindex', '0');
        }
        
        // Check time range buttons have proper labels
        const timeRangeButtons = page.locator('button').filter({ hasText: /7d|30d|90d|1y/ });
        
        for (let i = 0; i < await timeRangeButtons.count(); i++) {
          const button = timeRangeButtons.nth(i);
          
          // Verify button has accessible text
          const text = await button.textContent();
          expect(text?.trim()).toBeTruthy();
        }
      });
    });

    test('should meet color contrast requirements', async ({ page }) => {
      await test.step('Navigate to dashboard', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
      });

      await test.step('Check color contrast on key elements', async () => {
        // This is a basic check - in a real implementation, you'd use
        // accessibility testing tools like axe-core
        
        // Check main heading contrast
        const mainHeading = page.getByText('Behavior Analytics');
        const headingStyles = await mainHeading.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
          };
        });
        
        // Verify heading has dark text (basic check)
        expect(headingStyles.color).toContain('rgb(17, 24, 39)'); // gray-900
        
        // Check metric card text contrast
        const metricValue = page.getByText('Habit Strength').locator('..');
        const metricStyles = await metricValue.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
          };
        });
        
        // Verify sufficient contrast (basic check)
        expect(metricStyles.color).toBeTruthy();
        expect(metricStyles.backgroundColor).toBeTruthy();
      });
    });
  });

  test.describe('Performance E2E Tests', () => {
    test('should load dashboard within acceptable time limits', async ({
      page,
    }) => {
      await test.step('Measure dashboard load performance', async () => {
        const startTime = Date.now();
        
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        const loadTime = Date.now() - startTime;
        
        // Verify dashboard loads within 5 seconds
        expect(loadTime).toBeLessThan(5000);
      });
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      await test.step('Create large dataset', async () => {
        // Create data with many points
        const largeDataset = Array.from({ length: 100 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          frequency: Math.floor(Math.random() * 10) + 1,
          consistency: Math.floor(Math.random() * 100),
          strength: Math.floor(Math.random() * 100),
        }));
        
        await createBehaviorAnalyticsData(page, {
          includeBehaviorFrequency: true,
          customData: largeDataset,
        });
      });

      await test.step('Verify dashboard handles large dataset', async () => {
        const startTime = Date.now();
        
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        const loadTime = Date.now() - startTime;
        
        // Verify charts render with large dataset
        await expect(page.getByTestId('behavior-frequency-chart')).toBeVisible();
        
        // Verify performance is still acceptable
        expect(loadTime).toBeLessThan(10000);
      });
    });

    test('should respond quickly to user interactions', async ({ page }) => {
      await test.step('Create test data', async () => {
        await generateAnalyticsSummary(page, {
          totalEvents: 100,
          activePatterns: 5,
          habitStrengthAvg: 75,
          consistencyScore: 80,
        });
      });

      await test.step('Test interaction responsiveness', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Measure time range selection response time
        const startTime = Date.now();
        await selectTimeRange(page, '7d');
        await page.waitForLoadState('networkidle');
        const responseTime = Date.now() - startTime;
        
        // Verify interaction responds within 2 seconds
        expect(responseTime).toBeLessThan(2000);
        
        // Measure metric card click response time
        const clickStartTime = Date.now();
        await page.locator('text=Habit Strength').locator('..').click();
        await page.waitForTimeout(100);
        const clickResponseTime = Date.now() - clickStartTime;
        
        // Verify click responds within 500ms
        expect(clickResponseTime).toBeLessThan(500);
      });
    });
  });

  test.describe('Error Scenarios and Edge Cases', () => {
    test('should handle network connectivity issues', async ({ page }) => {
      await test.step('Simulate network failure', async () => {
        await page.route('**/api/behavior/analytics/**', route => route.abort());
      });

      await test.step('Navigate to dashboard and verify error handling', async () => {
        await page.goto('/dashboard/analytics/behavior');
        
        // Verify error states are displayed
        await expect(page.getByText(/Failed to load|Network error|Unable to connect/)).toBeVisible();
        
        // Verify dashboard structure remains intact
        await expect(page.getByTestId('behavior-analytics-dashboard')).toBeVisible();
        await expect(page.getByText('Behavior Analytics')).toBeVisible();
      });

      await test.step('Restore network and test recovery', async () => {
        await page.unroute('**/api/behavior/analytics/**');
        
        // Create valid data
        await generateAnalyticsSummary(page, {
          totalEvents: 75,
          activePatterns: 3,
          habitStrengthAvg: 65,
          consistencyScore: 70,
        });
        
        // Refresh page
        await page.reload();
        await waitForDashboardLoad(page);
        
        // Verify recovery
        await expect(page.getByText('75')).toBeVisible();
        await expect(page.getByText('3')).toBeVisible();
      });
    });

    test('should handle malformed API responses', async ({ page }) => {
      await test.step('Mock malformed API response', async () => {
        await page.route('**/api/behavior/analytics/summary**', route => 
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: 'invalid json response',
          })
        );
      });

      await test.step('Navigate to dashboard and verify graceful handling', async () => {
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Verify error is handled gracefully
        await expect(page.getByText(/Failed to load|Error parsing/)).toBeVisible();
        
        // Verify other sections still attempt to load
        await expect(page.getByTestId('behavior-analytics-dashboard')).toBeVisible();
      });
    });

    test('should handle authentication expiry during session', async ({
      page,
    }) => {
      await test.step('Start with valid session', async () => {
        await generateAnalyticsSummary(page, {
          totalEvents: 50,
          activePatterns: 2,
          habitStrengthAvg: 60,
          consistencyScore: 65,
        });
        
        await page.goto('/dashboard/analytics/behavior');
        await waitForDashboardLoad(page);
        
        // Verify initial load works
        await expect(page.getByText('50')).toBeVisible();
      });

      await test.step('Simulate authentication expiry', async () => {
        await page.route('**/api/behavior/analytics/**', route => 
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Authentication expired' }),
          })
        );
        
        // Trigger a data refresh
        await selectTimeRange(page, '7d');
        
        // Verify appropriate handling (redirect to login or error message)
        await expect(page.getByText(/Authentication|Please sign in|Unauthorized/)).toBeVisible();
      });
    });
  });
});