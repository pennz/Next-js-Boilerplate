import type { Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Types for test data
export type BehaviorEventData = {
  behaviorType: string;
  context?: string;
  frequency?: number;
  strength?: number;
  timestamp?: string;
};

export type HabitStrengthValues = {
  habitStrength: number;
  consistencyScore: number;
  frequencyScore: number;
  contextScore: number;
  trend: 'increasing' | 'decreasing' | 'stable';
};

export type ContextPattern = {
  context: string;
  successRate: number;
  frequency: number;
  confidence: number;
  predictivePower: number;
};

export type AnalyticsMetrics = {
  totalEvents: number;
  activePatterns: number;
  habitStrengthAvg: number;
  consistencyScore: number;
  topContext: string;
  weeklyTrend: 'up' | 'down' | 'stable';
  predictionAccuracy: number;
};

// Behavioral Analytics Data Creation Helpers
export async function createBehaviorAnalyticsData(
  page: Page,
  options: {
    timeRange?: '7d' | '30d' | '90d' | '1y';
    behaviorTypes?: string[];
    eventCount?: number;
    includePatterns?: boolean;
    randomId?: string;
  } = {}
) {
  const {
    timeRange = '30d',
    behaviorTypes = ['exercise', 'meditation', 'reading'],
    eventCount = 50,
    includePatterns = true,
    randomId = faker.string.uuid()
  } = options;

  // Create behavior events
  for (let i = 0; i < eventCount; i++) {
    await addBehaviorEvent(page, {
      behaviorType: faker.helpers.arrayElement(behaviorTypes),
      context: faker.helpers.arrayElement(['morning', 'afternoon', 'evening', 'home', 'work', 'gym']),
      frequency: faker.number.int({ min: 1, max: 10 }),
      strength: faker.number.int({ min: 1, max: 100 }),
      timestamp: faker.date.recent({ days: parseInt(timeRange.replace('d', '')) || 30 }).toISOString()
    });
  }

  // Create patterns if requested
  if (includePatterns) {
    await createContextPatterns(page, [
      {
        context: 'morning',
        successRate: faker.number.int({ min: 70, max: 95 }),
        frequency: faker.number.int({ min: 5, max: 15 }),
        confidence: faker.number.int({ min: 80, max: 95 }),
        predictivePower: faker.number.int({ min: 60, max: 90 })
      },
      {
        context: 'evening',
        successRate: faker.number.int({ min: 50, max: 80 }),
        frequency: faker.number.int({ min: 3, max: 10 }),
        confidence: faker.number.int({ min: 70, max: 85 }),
        predictivePower: faker.number.int({ min: 50, max: 75 })
      }
    ]);
  }

  return randomId;
}

export async function addBehaviorEvent(page: Page, eventData: BehaviorEventData) {
  const randomId = faker.string.uuid();
  
  await page.route('**/api/behavior/events', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: randomId,
          ...eventData,
          timestamp: eventData.timestamp || new Date().toISOString(),
          userId: 'test-user'
        }),
        headers: {
          'x-e2e-random-id': randomId
        }
      });
    } else {
      await route.continue();
    }
  });

  // Simulate API call
  await page.evaluate((data) => {
    return fetch('/api/behavior/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }, eventData);
}

export async function createHabitStrengthData(
  page: Page,
  timeRange: '7d' | '30d' | '90d' | '1y',
  values: HabitStrengthValues[]
) {
  const days = parseInt(timeRange.replace('d', '')) || 365;
  const dataPoints = values.length || Math.min(days, 30);
  
  const habitData = Array.from({ length: dataPoints }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (dataPoints - i - 1));
    
    return {
      date: date.toISOString().split('T')[0],
      habitStrength: values[i]?.habitStrength || faker.number.int({ min: 40, max: 90 }),
      consistencyScore: values[i]?.consistencyScore || faker.number.int({ min: 50, max: 95 }),
      frequencyScore: values[i]?.frequencyScore || faker.number.int({ min: 30, max: 85 }),
      contextScore: values[i]?.contextScore || faker.number.int({ min: 60, max: 90 }),
      trend: values[i]?.trend || faker.helpers.arrayElement(['increasing', 'decreasing', 'stable'])
    };
  });

  await mockHabitStrengthAPI(page, habitData);
  return habitData;
}

export async function createContextPatterns(page: Page, patterns: ContextPattern[]) {
  await mockContextPatternsAPI(page, patterns);
  return patterns;
}

export async function createBehaviorFrequencyData(
  page: Page,
  frequency: number[],
  timeRange: '7d' | '30d' | '90d' | '1y'
) {
  const days = parseInt(timeRange.replace('d', '')) || 30;
  const dataPoints = Math.min(days, frequency.length || 30);
  
  const frequencyData = Array.from({ length: dataPoints }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (dataPoints - i - 1));
    
    return {
      date: date.toISOString().split('T')[0],
      frequency: frequency[i] || faker.number.int({ min: 1, max: 10 }),
      consistency: faker.number.int({ min: 40, max: 100 }),
      strength: faker.number.int({ min: 30, max: 95 })
    };
  });

  await mockBehaviorFrequencyAPI(page, frequencyData);
  return frequencyData;
}

export async function generateAnalyticsSummary(page: Page, metrics: Partial<AnalyticsMetrics>) {
  const summary: AnalyticsMetrics = {
    totalEvents: metrics.totalEvents || faker.number.int({ min: 50, max: 500 }),
    activePatterns: metrics.activePatterns || faker.number.int({ min: 3, max: 15 }),
    habitStrengthAvg: metrics.habitStrengthAvg || faker.number.int({ min: 60, max: 90 }),
    consistencyScore: metrics.consistencyScore || faker.number.int({ min: 70, max: 95 }),
    topContext: metrics.topContext || faker.helpers.arrayElement(['morning', 'evening', 'home', 'work']),
    weeklyTrend: metrics.weeklyTrend || faker.helpers.arrayElement(['up', 'down', 'stable']),
    predictionAccuracy: metrics.predictionAccuracy || faker.number.int({ min: 75, max: 95 })
  };

  await mockAnalyticsSummaryAPI(page, summary);
  return summary;
}

// Dashboard Navigation Helpers
export async function navigateToBehaviorAnalytics(page: Page) {
  await page.goto('/dashboard/analytics/behavior');
  await waitForDashboardLoad(page);
}

export async function navigateToFullAnalytics(page: Page) {
  await page.click('text=View Full Analytics');
  await page.waitForURL('**/dashboard/analytics/behavior');
  await waitForDashboardLoad(page);
}

export async function navigateToPatternDetails(page: Page, patternId: string) {
  await page.click(`[data-pattern-id="${patternId}"]`);
  await page.waitForLoadState('networkidle');
}

export async function navigateToAnalyticsFromDashboard(page: Page) {
  await page.click('text=View All Patterns');
  await page.waitForURL('**/dashboard/analytics/patterns');
  await page.waitForLoadState('networkidle');
}

// Dashboard Interaction Helpers
export async function selectTimeRange(page: Page, range: '7d' | '30d' | '90d' | '1y') {
  await page.click(`button:has-text("${range}")`);
  await page.waitForLoadState('networkidle');
}

export async function clickMetricCard(page: Page, metricType: string) {
  await page.click(`[data-testid="metric-card-${metricType}"], text="${metricType}"`);
  await page.waitForTimeout(500); // Wait for tracking event
}

export async function clickPatternInsightCard(page: Page, patternId: string) {
  await page.click(`[data-pattern-id="${patternId}"]`);
  await page.waitForTimeout(500); // Wait for tracking event
}

export async function toggleRealTimeUpdates(page: Page, enabled: boolean) {
  const currentState = await page.locator('[data-testid="realtime-indicator"]').textContent();
  const isCurrentlyEnabled = currentState?.includes('Live');
  
  if ((enabled && !isCurrentlyEnabled) || (!enabled && isCurrentlyEnabled)) {
    await page.click('[data-testid="realtime-toggle"]');
    await page.waitForTimeout(1000);
  }
}

export async function waitForDashboardLoad(page: Page) {
  await page.waitForSelector('[data-testid="behavior-analytics-dashboard"]');
  await page.waitForLoadState('networkidle');
  
  // Wait for charts to render
  await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });
  await page.waitForTimeout(2000); // Additional time for chart animations
}

// Chart Interaction Helpers
export async function clickChartElement(page: Page, chartType: string, elementIndex: number) {
  const chartSelector = `[data-testid="chart-${chartType}"]`;
  await page.waitForSelector(chartSelector);
  
  if (chartType === 'context_patterns') {
    // Click on bar chart elements
    const bars = page.locator(`${chartSelector} .recharts-bar-rectangle`);
    await bars.nth(elementIndex).click();
  } else {
    // Click on area/line chart elements
    const dots = page.locator(`${chartSelector} .recharts-dot`);
    await dots.nth(elementIndex).click();
  }
  
  await page.waitForTimeout(500);
}

export async function hoverChartElement(page: Page, chartType: string, elementIndex: number) {
  const chartSelector = `[data-testid="chart-${chartType}"]`;
  await page.waitForSelector(chartSelector);
  
  const elements = page.locator(`${chartSelector} .recharts-active-dot, ${chartSelector} .recharts-bar-rectangle`);
  await elements.nth(elementIndex).hover();
  await page.waitForTimeout(300);
}

export async function verifyChartTooltip(page: Page, expectedData: Record<string, string | number>) {
  await page.waitForSelector('.recharts-tooltip-wrapper');
  
  for (const [key, value] of Object.entries(expectedData)) {
    await page.waitForSelector(`.recharts-tooltip-wrapper:has-text("${value}")`);
  }
}

export async function waitForChartRender(page: Page, chartType: string) {
  const chartSelector = `[data-testid="chart-${chartType}"]`;
  await page.waitForSelector(chartSelector);
  await page.waitForSelector(`${chartSelector} .recharts-wrapper`);
  await page.waitForTimeout(1000); // Wait for animations
}

export async function captureChartScreenshot(page: Page, chartType: string, filename: string) {
  const chartSelector = `[data-testid="chart-${chartType}"]`;
  await page.waitForSelector(chartSelector);
  await page.locator(chartSelector).screenshot({ path: filename });
}

// Data Verification Helpers
export async function verifyDashboardMetrics(page: Page, expectedMetrics: Partial<AnalyticsMetrics>) {
  for (const [key, value] of Object.entries(expectedMetrics)) {
    if (typeof value === 'number') {
      await page.waitForSelector(`text="${value}"`);
    } else {
      await page.waitForSelector(`text="${value}"`);
    }
  }
}

export async function verifyPatternInsights(page: Page, expectedPatterns: any[]) {
  for (const pattern of expectedPatterns) {
    await page.waitForSelector(`text="${pattern.behaviorType}"`);
    await page.waitForSelector(`text="${pattern.strength}% strong"`);
  }
}

export async function verifyChartData(page: Page, chartType: string, expectedData: any[]) {
  const chartSelector = `[data-testid="chart-${chartType}"]`;
  await page.waitForSelector(chartSelector);
  
  // Verify data points count
  const dataPoints = page.locator(`${chartSelector} .recharts-dot, ${chartSelector} .recharts-bar-rectangle`);
  const count = await dataPoints.count();
  
  if (expectedData.length > 0) {
    expect(count).toBeGreaterThan(0);
  }
}

export async function verifyRealTimeIndicator(page: Page, expectedState: 'active' | 'offline') {
  const indicator = page.locator('[data-testid="realtime-indicator"]');
  
  if (expectedState === 'active') {
    await expect(indicator).toContainText('Live');
  } else {
    await expect(indicator).toContainText('Offline');
  }
}

export async function verifyTimeRangeSelection(page: Page, expectedRange: '7d' | '30d' | '90d' | '1y') {
  const activeButton = page.locator(`button:has-text("${expectedRange}").bg-purple-100`);
  await expect(activeButton).toBeVisible();
}

// API Mocking Helpers
export async function mockBehaviorAnalyticsAPI(page: Page, responses: {
  summary?: any;
  habitStrength?: any;
  contextPatterns?: any;
  frequency?: any;
}) {
  if (responses.summary) {
    await mockAnalyticsSummaryAPI(page, responses.summary);
  }
  if (responses.habitStrength) {
    await mockHabitStrengthAPI(page, responses.habitStrength);
  }
  if (responses.contextPatterns) {
    await mockContextPatternsAPI(page, responses.contextPatterns);
  }
  if (responses.frequency) {
    await mockBehaviorFrequencyAPI(page, responses.frequency);
  }
}

export async function mockAnalyticsSummaryAPI(page: Page, summaryData: AnalyticsMetrics) {
  await page.route('**/api/behavior/analytics/summary*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(summaryData),
      headers: { 'x-e2e-random-id': faker.string.uuid() }
    });
  });
}

export async function mockHabitStrengthAPI(page: Page, habitData: any[]) {
  await page.route('**/api/behavior/analytics/habit-strength*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: habitData }),
      headers: { 'x-e2e-random-id': faker.string.uuid() }
    });
  });
}

export async function mockContextPatternsAPI(page: Page, contextData: ContextPattern[]) {
  await page.route('**/api/behavior/analytics/context-patterns*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: contextData }),
      headers: { 'x-e2e-random-id': faker.string.uuid() }
    });
  });
}

export async function mockBehaviorFrequencyAPI(page: Page, frequencyData: any[]) {
  await page.route('**/api/behavior/analytics/frequency*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: frequencyData }),
      headers: { 'x-e2e-random-id': faker.string.uuid() }
    });
  });
}

export async function mockAPIError(page: Page, endpoint: string, errorCode: number) {
  await page.route(`**${endpoint}*`, async (route) => {
    await route.fulfill({
      status: errorCode,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Test error' })
    });
  });
}

// Real-time Testing Helpers
export async function enableRealTimeMode(page: Page) {
  await toggleRealTimeUpdates(page, true);
}

export async function simulateRealTimeUpdate(page: Page, newData: any) {
  // Mock the next API call with new data
  await mockBehaviorAnalyticsAPI(page, newData);
  
  // Wait for the next update interval
  await page.waitForTimeout(1000);
}

export async function verifyUpdateInterval(page: Page, expectedInterval: number) {
  const startTime = Date.now();
  
  // Wait for two updates and measure the interval
  await waitForRealTimeUpdate(page);
  const firstUpdate = Date.now();
  
  await waitForRealTimeUpdate(page);
  const secondUpdate = Date.now();
  
  const actualInterval = secondUpdate - firstUpdate;
  const tolerance = expectedInterval * 0.1; // 10% tolerance
  
  expect(actualInterval).toBeGreaterThan(expectedInterval - tolerance);
  expect(actualInterval).toBeLessThan(expectedInterval + tolerance);
}

export async function waitForRealTimeUpdate(page: Page) {
  const initialTime = await page.locator('[data-testid="last-update-time"]').textContent();
  
  await page.waitForFunction(
    (initial) => {
      const current = document.querySelector('[data-testid="last-update-time"]')?.textContent;
      return current && current !== initial;
    },
    initialTime,
    { timeout: 35000 }
  );
}

export async function disableRealTimeMode(page: Page) {
  await toggleRealTimeUpdates(page, false);
}

// Authentication Helpers
export async function loginForBehaviorAnalytics(page: Page, userType: 'premium' | 'basic' = 'basic') {
  // Mock user authentication
  await page.addInitScript((type) => {
    window.localStorage.setItem('test-user-type', type);
  }, userType);
  
  await page.goto('/dashboard/analytics/behavior');
  await waitForDashboardLoad(page);
}

export async function logoutAndVerifyAnalytics(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Sign out');
  
  await page.waitForSelector('text=Please sign in to view your behavior analytics');
}

export async function simulateAuthenticationExpiry(page: Page) {
  await page.route('**/api/behavior/**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' })
    });
  });
}

export async function verifyUnauthenticatedState(page: Page) {
  await page.waitForSelector('text=Please sign in to view your behavior analytics');
}

// Error Simulation Helpers
export async function simulateNetworkError(page: Page, endpoint: string) {
  await page.route(`**${endpoint}*`, async (route) => {
    await route.abort('failed');
  });
}

export async function simulateAPITimeout(page: Page, endpoint: string) {
  await page.route(`**${endpoint}*`, async (route) => {
    await page.waitForTimeout(30000); // Simulate timeout
    await route.continue();
  });
}

export async function simulateCorruptedData(page: Page, endpoint: string) {
  await page.route(`**${endpoint}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'invalid json data'
    });
  });
}

export async function simulatePartialAPIFailure(page: Page, failingEndpoints: string[]) {
  for (const endpoint of failingEndpoints) {
    await mockAPIError(page, endpoint, 500);
  }
}

export async function recoverFromError(page: Page) {
  // Clear all route mocks to allow normal API calls
  await page.unroute('**/api/behavior/**');
  
  // Refresh the page or trigger a retry
  await page.reload();
  await waitForDashboardLoad(page);
}

// Performance Testing Helpers
export async function measureDashboardLoadTime(page: Page): Promise<number> {
  const startTime = Date.now();
  await navigateToBehaviorAnalytics(page);
  const endTime = Date.now();
  
  return endTime - startTime;
}

export async function measureChartRenderTime(page: Page, chartType: string): Promise<number> {
  const startTime = Date.now();
  await waitForChartRender(page, chartType);
  const endTime = Date.now();
  
  return endTime - startTime;
}

export async function simulateSlowNetwork(page: Page, delay: number) {
  await page.route('**/api/behavior/**', async (route) => {
    await page.waitForTimeout(delay);
    await route.continue();
  });
}

export async function measureMemoryUsage(page: Page): Promise<any> {
  return await page.evaluate(() => {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  });
}

export async function stressTestWithLargeData(page: Page, dataSize: number) {
  const largeDataset = Array.from({ length: dataSize }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    frequency: faker.number.int({ min: 1, max: 10 }),
    consistency: faker.number.int({ min: 40, max: 100 }),
    strength: faker.number.int({ min: 30, max: 95 })
  }));
  
  await mockBehaviorFrequencyAPI(page, largeDataset);
  await navigateToBehaviorAnalytics(page);
}

// Accessibility Testing Helpers
export async function testKeyboardNavigation(page: Page) {
  await page.keyboard.press('Tab');
  
  // Test time range buttons
  for (const range of ['7d', '30d', '90d', '1y']) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
  }
  
  // Test metric cards
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
}

export async function verifyARIALabels(page: Page) {
  const elements = await page.locator('[role="button"], [role="link"], [role="tab"]').all();
  
  for (const element of elements) {
    const ariaLabel = await element.getAttribute('aria-label');
    const text = await element.textContent();
    
    expect(ariaLabel || text).toBeTruthy();
  }
}

export async function testScreenReaderAnnouncements(page: Page) {
  // Test live regions for real-time updates
  await page.waitForSelector('[aria-live="polite"]');
  
  // Test chart accessibility
  await page.waitForSelector('[role="img"], [aria-label*="chart"]');
}

export async function verifyFocusManagement(page: Page) {
  await page.keyboard.press('Tab');
  
  let focusedElement = await page.locator(':focus').first();
  expect(await focusedElement.isVisible()).toBe(true);
  
  // Continue tabbing and verify focus order
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    focusedElement = await page.locator(':focus').first();
    expect(await focusedElement.isVisible()).toBe(true);
  }
}

export async function testColorContrast(page: Page) {
  // This would typically use axe-core or similar accessibility testing library
  await page.evaluate(() => {
    // Basic color contrast check implementation
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      const styles = window.getComputedStyle(el);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Basic contrast ratio calculation would go here
      // For now, just ensure colors are defined
      if (color && backgroundColor) {
        console.log(`Element has color: ${color}, background: ${backgroundColor}`);
      }
    });
  });
}

// Mobile and Responsive Helpers
export async function setMobileViewport(page: Page) {
  await page.setViewportSize({ width: 375, height: 667 });
}

export async function setTabletViewport(page: Page) {
  await page.setViewportSize({ width: 768, height: 1024 });
}

export async function testTouchInteractions(page: Page) {
  // Test touch events on mobile
  const metricCard = page.locator('[data-testid^="metric-card"]').first();
  await metricCard.tap();
  await page.waitForTimeout(500);
}

export async function verifyResponsiveLayout(page: Page, viewport: 'mobile' | 'tablet' | 'desktop') {
  const expectedClasses = {
    mobile: 'grid-cols-1',
    tablet: 'md:grid-cols-2',
    desktop: 'lg:grid-cols-4'
  };
  
  await page.waitForSelector(`.${expectedClasses[viewport]}`);
}

export async function simulateOrientationChange(page: Page, orientation: 'portrait' | 'landscape') {
  if (orientation === 'landscape') {
    await page.setViewportSize({ width: 667, height: 375 });
  } else {
    await page.setViewportSize({ width: 375, height: 667 });
  }
  
  await page.waitForTimeout(1000); // Wait for layout adjustment
}

// Data Cleanup Helpers
export async function cleanupBehaviorAnalyticsData(page: Page) {
  await cleanupBehaviorEvents(page);
  await cleanupPatternData(page);
  await cleanupAnalyticsSummary(page);
}

export async function cleanupBehaviorEvents(page: Page) {
  await page.route('**/api/behavior/events*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    } else {
      await route.continue();
    }
  });
  
  await page.evaluate(() => {
    return fetch('/api/behavior/events', { method: 'DELETE' });
  });
}

export async function cleanupPatternData(page: Page) {
  await page.route('**/api/behavior/patterns*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    } else {
      await route.continue();
    }
  });
}

export async function cleanupAnalyticsSummary(page: Page) {
  await page.route('**/api/behavior/analytics/summary*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    } else {
      await route.continue();
    }
  });
}

export async function resetDashboardState(page: Page) {
  // Clear local storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Reset to default time range
  await selectTimeRange(page, '30d');
  
  // Disable real-time updates
  await disableRealTimeMode(page);
}

// Utility Helpers
export function generateTestBehaviorData(options: {
  count?: number;
  behaviorTypes?: string[];
  timeRange?: number;
} = {}) {
  const { count = 30, behaviorTypes = ['exercise', 'meditation'], timeRange = 30 } = options;
  
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - i - 1));
    
    return {
      date: date.toISOString().split('T')[0],
      behaviorType: faker.helpers.arrayElement(behaviorTypes),
      frequency: faker.number.int({ min: 1, max: 10 }),
      consistency: faker.number.int({ min: 40, max: 100 }),
      strength: faker.number.int({ min: 30, max: 95 }),
      context: faker.helpers.arrayElement(['morning', 'afternoon', 'evening'])
    };
  });
}

export function createDeterministicData(seed: string) {
  faker.seed(seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
  
  return generateTestBehaviorData({ count: 30 });
}

export function formatAnalyticsDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function calculateExpectedMetrics(rawData: any[]): AnalyticsMetrics {
  const totalEvents = rawData.length;
  const avgStrength = rawData.reduce((sum, item) => sum + (item.strength || 0), 0) / totalEvents;
  const avgConsistency = rawData.reduce((sum, item) => sum + (item.consistency || 0), 0) / totalEvents;
  
  return {
    totalEvents,
    activePatterns: Math.floor(totalEvents / 10),
    habitStrengthAvg: Math.round(avgStrength),
    consistencyScore: Math.round(avgConsistency),
    topContext: 'morning',
    weeklyTrend: 'up',
    predictionAccuracy: 85
  };
}

export function validateAnalyticsDataStructure(data: any): boolean {
  if (!Array.isArray(data)) return false;
  
  return data.every(item => 
    typeof item === 'object' &&
    'date' in item &&
    typeof item.date === 'string'
  );
}

// Behavioral Tracking Helpers
export async function verifyTrackingEvent(
  page: Page,
  eventName: string,
  expectedContext: Record<string, any>
) {
  // Mock tracking verification
  await page.waitForFunction(
    ({ name, context }) => {
      return window.trackingEvents?.some((event: any) => 
        event.eventName === name &&
        JSON.stringify(event.context).includes(JSON.stringify(context))
      );
    },
    { eventName, expectedContext },
    { timeout: 5000 }
  );
}

export async function waitForTrackingEvent(page: Page, eventName: string) {
  await page.waitForFunction(
    (name) => {
      return window.trackingEvents?.some((event: any) => event.eventName === name);
    },
    eventName,
    { timeout: 5000 }
  );
}

export async function mockTrackingFailure(page: Page) {
  await page.addInitScript(() => {
    window.trackingEnabled = false;
  });
}

export async function verifyTrackingSequence(page: Page, expectedEvents: string[]) {
  for (const eventName of expectedEvents) {
    await waitForTrackingEvent(page, eventName);
  }
}

export async function clearTrackingEvents(page: Page) {
  await page.evaluate(() => {
    window.trackingEvents = [];
  });
}

// Helper to get future date (from healthTestHelpers pattern)
export function getFutureDate(daysToAdd: number): string {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysToAdd);
  return futureDate.toISOString().split('T')[0];
}