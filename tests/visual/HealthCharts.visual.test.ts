import type { Page } from '@playwright/test';
import type {
  HealthPredictiveChartProps,
  HealthRadarChartProps,
  HealthRadarMetric,
  PredictedDataPoint,
} from '@/components/health/types';
import { expect, test } from '@playwright/test';

// Test data generators
const generateRadarMetrics = (count: number): HealthRadarMetric[] => {
  const categories = ['Weight', 'Steps', 'Sleep', 'Exercise', 'Nutrition', 'Hydration', 'Stress'];
  const icons = ['⚖️', '👟', '😴', '💪', '🥗', '💧', '🧘'];

  return Array.from({ length: count }, (_, i) => ({
    category: categories[i % categories.length],
    value: Math.random() * 100 + 50,
    maxValue: 150,
    unit: i === 0 ? 'kg' : i === 1 ? 'steps' : i === 2 ? 'hours' : 'points',
    score: Math.random() * 100,
    color: `hsl(${(i * 360) / count}, 70%, 50%)`,
    icon: icons[i % icons.length],
  }));
};

const generatePredictiveData = (historicalCount: number, predictionCount: number): PredictedDataPoint[] => {
  const data: PredictedDataPoint[] = [];
  const baseDate = new Date('2024-01-01');

  // Historical data
  for (let i = 0; i < historicalCount; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    data.push({
      date: date.toISOString(),
      value: 70 + Math.sin(i * 0.1) * 5 + Math.random() * 2,
      unit: 'kg',
      isPrediction: false,
    });
  }

  // Prediction data
  for (let i = 0; i < predictionCount; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + historicalCount + i);
    const baseValue = 65 - i * 0.5;
    data.push({
      date: date.toISOString(),
      value: baseValue,
      unit: 'kg',
      isPrediction: true,
      confidenceUpper: baseValue + 2,
      confidenceLower: Math.max(0, baseValue - 2),
      algorithm: 'linear-regression' as const,
    });
  }

  return data;
};

// Helper function to setup chart component
const setupRadarChart = async (page: Page, props: Partial<HealthRadarChartProps> = {}) => {
  const defaultProps: HealthRadarChartProps = {
    data: [{ metrics: generateRadarMetrics(5) }],
    scoringSystem: 'percentage',
    title: 'Health Radar Chart',
    showLegend: true,
    showTooltip: true,
    showScoreLegend: true,
    ...props,
  };

  await page.goto('/test-charts/radar');
  await page.evaluate((chartProps) => {
    window.testChartProps = chartProps;
  }, defaultProps);
  await page.waitForSelector('[data-testid="radar-chart"]');
};

const setupPredictiveChart = async (page: Page, props: Partial<HealthPredictiveChartProps> = {}) => {
  const defaultProps: HealthPredictiveChartProps = {
    data: generatePredictiveData(30, 7),
    algorithm: 'linear-regression',
    predictionHorizon: 7,
    showConfidenceInterval: true,
    title: 'Weight Prediction',
    unit: 'kg',
    goalValue: 65,
    ...props,
  };

  await page.goto('/test-charts/predictive');
  await page.evaluate((chartProps) => {
    window.testChartProps = chartProps;
  }, defaultProps);
  await page.waitForSelector('[data-testid="predictive-chart"]');
};

const setupHealthOverview = async (page: Page, dataState: 'empty' | 'partial' | 'complete' = 'complete') => {
  const mockData = {
    empty: {
      recentRecords: [],
      activeGoals: [],
      stats: { totalRecords: 0, activeGoals: 0, completedGoals: 0, weeklyProgress: 0 },
    },
    partial: {
      recentRecords: [
        { id: 1, type: 'Weight', value: 70, unit: 'kg', recorded_at: new Date().toISOString() },
      ],
      activeGoals: [
        { id: 1, type: 'Weight', target_value: 65, current_value: 70, target_date: '2024-12-31', status: 'active' as const },
      ],
      stats: { totalRecords: 5, activeGoals: 1, completedGoals: 2, weeklyProgress: 45 },
    },
    complete: {
      recentRecords: [
        { id: 1, type: 'Weight', value: 70, unit: 'kg', recorded_at: new Date().toISOString() },
        { id: 2, type: 'Steps', value: 8500, unit: 'steps', recorded_at: new Date().toISOString() },
        { id: 3, type: 'Sleep', value: 7.5, unit: 'hours', recorded_at: new Date().toISOString() },
      ],
      activeGoals: [
        { id: 1, type: 'Weight', target_value: 65, current_value: 70, target_date: '2024-12-31', status: 'active' as const },
        { id: 2, type: 'Steps', target_value: 10000, current_value: 8500, target_date: '2024-12-31', status: 'active' as const },
      ],
      stats: { totalRecords: 25, activeGoals: 2, completedGoals: 5, weeklyProgress: 85 },
    },
  };

  await page.goto('/test-charts/overview');
  await page.evaluate((data) => {
    window.testOverviewData = data;
  }, mockData[dataState]);
  await page.waitForSelector('[data-testid="health-overview"]');
};

// Configure test settings
test.describe('Health Charts Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport and disable animations for stable screenshots
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  });

  test.describe('HealthRadarChart Visual Tests', () => {
    test('radar chart with 3 metrics - layout scaling', async ({ page }) => {
      await setupRadarChart(page, {
        data: [{ metrics: generateRadarMetrics(3) }],
        title: '3 Metrics Radar Chart',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-3-metrics.png');
    });

    test('radar chart with 5 metrics - standard layout', async ({ page }) => {
      await setupRadarChart(page, {
        data: [{ metrics: generateRadarMetrics(5) }],
        title: '5 Metrics Radar Chart',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-5-metrics.png');
    });

    test('radar chart with 7 metrics - dense layout', async ({ page }) => {
      await setupRadarChart(page, {
        data: [{ metrics: generateRadarMetrics(7) }],
        title: '7 Metrics Radar Chart',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-7-metrics.png');
    });

    test('radar chart with percentage scoring system', async ({ page }) => {
      await setupRadarChart(page, {
        scoringSystem: 'percentage',
        title: 'Percentage Scoring System',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-percentage-scoring.png');
    });

    test('radar chart with z-score scoring system', async ({ page }) => {
      await setupRadarChart(page, {
        scoringSystem: 'z-score',
        title: 'Z-Score Scoring System',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-zscore-scoring.png');
    });

    test('radar chart with custom scoring system', async ({ page }) => {
      await setupRadarChart(page, {
        scoringSystem: 'custom',
        title: 'Custom Scoring System',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-custom-scoring.png');
    });

    test('radar chart color schemes for different score ranges', async ({ page }) => {
      const excellentMetrics = generateRadarMetrics(4).map(m => ({ ...m, score: 90 }));
      const goodMetrics = generateRadarMetrics(4).map(m => ({ ...m, score: 70 }));
      const fairMetrics = generateRadarMetrics(4).map(m => ({ ...m, score: 50 }));
      const poorMetrics = generateRadarMetrics(4).map(m => ({ ...m, score: 20 }));

      await setupRadarChart(page, {
        data: [{ metrics: excellentMetrics }],
        title: 'Excellent Scores (80-100)',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-excellent-scores.png');

      await setupRadarChart(page, {
        data: [{ metrics: goodMetrics }],
        title: 'Good Scores (60-79)',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-good-scores.png');

      await setupRadarChart(page, {
        data: [{ metrics: fairMetrics }],
        title: 'Fair Scores (40-59)',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-fair-scores.png');

      await setupRadarChart(page, {
        data: [{ metrics: poorMetrics }],
        title: 'Poor Scores (0-39)',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-poor-scores.png');
    });

    test('radar chart with missing data and placeholders', async ({ page }) => {
      const incompleteMetrics = generateRadarMetrics(5).map((m, i) =>
        i % 2 === 0 ? { ...m, value: 0, score: 0 } : m,
      );

      await setupRadarChart(page, {
        data: [{ metrics: incompleteMetrics }],
        title: 'Chart with Missing Data',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-missing-data.png');
    });

    test('radar chart hover states and tooltip positioning', async ({ page }) => {
      await setupRadarChart(page);

      // Hover over first metric
      await page.hover('[data-testid="radar-chart"] .recharts-radar-dot');
      await page.waitForTimeout(100); // Wait for hover state

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-hover-state.png');
    });

    test('radar chart legend and score legend rendering', async ({ page }) => {
      await setupRadarChart(page, {
        showLegend: true,
        showScoreLegend: true,
        title: 'Chart with Legends',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-with-legends.png');
    });

    test('radar chart without legends', async ({ page }) => {
      await setupRadarChart(page, {
        showLegend: false,
        showScoreLegend: false,
        title: 'Chart without Legends',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-no-legends.png');
    });

    test('radar chart loading state', async ({ page }) => {
      await setupRadarChart(page, {
        loading: true,
        title: 'Loading Chart',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-loading-state.png');
    });

    test('radar chart error state', async ({ page }) => {
      await setupRadarChart(page, {
        error: 'Failed to load chart data',
        title: 'Error Chart',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-error-state.png');
    });

    test('radar chart empty state', async ({ page }) => {
      await setupRadarChart(page, {
        data: [],
        title: 'Empty Chart',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-empty-state.png');
    });

    test('radar chart insufficient data state', async ({ page }) => {
      await setupRadarChart(page, {
        data: [{ metrics: generateRadarMetrics(2) }],
        title: 'Insufficient Data Chart',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-insufficient-data.png');
    });

    test('radar chart responsive - mobile size', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupRadarChart(page);

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-mobile.png');
    });

    test('radar chart responsive - tablet size', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setupRadarChart(page);

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-tablet.png');
    });

    test('radar chart responsive - desktop size', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupRadarChart(page);

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-desktop.png');
    });

    test('radar chart small size configuration', async ({ page }) => {
      await setupRadarChart(page, {
        config: { size: 'small' },
        height: 300,
        title: 'Small Radar Chart',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-size-small.png');
    });

    test('radar chart large size configuration', async ({ page }) => {
      await setupRadarChart(page, {
        config: { size: 'large' },
        height: 500,
        title: 'Large Radar Chart',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-size-large.png');
    });
  });

  test.describe('HealthPredictiveChart Visual Tests', () => {
    test('predictive chart with historical data only', async ({ page }) => {
      const historicalOnly = generatePredictiveData(30, 0);
      await setupPredictiveChart(page, {
        data: historicalOnly,
        title: 'Historical Data Only',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-historical-only.png');
    });

    test('predictive chart with historical and predictions', async ({ page }) => {
      await setupPredictiveChart(page, {
        title: 'Historical + Predictions',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-with-predictions.png');
    });

    test('predictive chart linear regression algorithm', async ({ page }) => {
      await setupPredictiveChart(page, {
        algorithm: 'linear-regression',
        title: 'Linear Regression Algorithm',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-linear-regression.png');
    });

    test('predictive chart moving average algorithm', async ({ page }) => {
      await setupPredictiveChart(page, {
        algorithm: 'moving-average',
        title: 'Moving Average Algorithm',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-moving-average.png');
    });

    test('predictive chart with confidence intervals', async ({ page }) => {
      await setupPredictiveChart(page, {
        showConfidenceInterval: true,
        title: 'With Confidence Intervals',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-with-confidence.png');
    });

    test('predictive chart without confidence intervals', async ({ page }) => {
      await setupPredictiveChart(page, {
        showConfidenceInterval: false,
        title: 'Without Confidence Intervals',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-no-confidence.png');
    });

    test('predictive chart with goal reference line', async ({ page }) => {
      await setupPredictiveChart(page, {
        goalValue: 65,
        title: 'With Goal Reference Line',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-with-goal.png');
    });

    test('predictive chart without goal reference line', async ({ page }) => {
      await setupPredictiveChart(page, {
        goalValue: undefined,
        title: 'Without Goal Reference Line',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-no-goal.png');
    });

    test('predictive chart 1 week time range', async ({ page }) => {
      const weekData = generatePredictiveData(7, 3);
      await setupPredictiveChart(page, {
        data: weekData,
        predictionHorizon: 3,
        title: '1 Week Range',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-1-week.png');
    });

    test('predictive chart 1 month time range', async ({ page }) => {
      const monthData = generatePredictiveData(30, 7);
      await setupPredictiveChart(page, {
        data: monthData,
        title: '1 Month Range',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-1-month.png');
    });

    test('predictive chart 3 months time range', async ({ page }) => {
      const quarterData = generatePredictiveData(90, 14);
      await setupPredictiveChart(page, {
        data: quarterData,
        predictionHorizon: 14,
        title: '3 Months Range',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-3-months.png');
    });

    test('predictive chart 1 year time range', async ({ page }) => {
      const yearData = generatePredictiveData(365, 30);
      await setupPredictiveChart(page, {
        data: yearData,
        predictionHorizon: 30,
        title: '1 Year Range',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-1-year.png');
    });

    test('predictive chart with sparse data', async ({ page }) => {
      const sparseData = generatePredictiveData(10, 5);
      await setupPredictiveChart(page, {
        data: sparseData,
        title: 'Sparse Data',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-sparse-data.png');
    });

    test('predictive chart with dense data', async ({ page }) => {
      const denseData = generatePredictiveData(100, 14);
      await setupPredictiveChart(page, {
        data: denseData,
        title: 'Dense Data',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-dense-data.png');
    });

    test('predictive chart algorithm toggle buttons', async ({ page }) => {
      await setupPredictiveChart(page);

      // Focus on algorithm toggle
      await page.focus('[data-testid="algorithm-toggle"]');

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-algorithm-toggle.png');
    });

    test('predictive chart accuracy badge display', async ({ page }) => {
      await setupPredictiveChart(page, {
        title: 'Chart with Accuracy Badge',
      });

      await expect(page.locator('[data-testid="accuracy-badge"]')).toHaveScreenshot('predictive-accuracy-badge.png');
    });

    test('predictive chart empty state', async ({ page }) => {
      await setupPredictiveChart(page, {
        data: [],
        title: 'Empty Chart',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-empty-state.png');
    });

    test('predictive chart insufficient data message', async ({ page }) => {
      const insufficientData = generatePredictiveData(2, 0);
      await setupPredictiveChart(page, {
        data: insufficientData,
        title: 'Insufficient Data',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-insufficient-data.png');
    });

    test('predictive chart loading state', async ({ page }) => {
      await setupPredictiveChart(page, {
        loading: true,
        title: 'Loading Chart',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-loading-state.png');
    });

    test('predictive chart error state', async ({ page }) => {
      await setupPredictiveChart(page, {
        error: 'Failed to calculate predictions',
        title: 'Error Chart',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-error-state.png');
    });

    test('predictive chart tooltip formatting', async ({ page }) => {
      await setupPredictiveChart(page);

      // Hover over a data point to show tooltip
      await page.hover('[data-testid="predictive-chart"] .recharts-line-dot');
      await page.waitForTimeout(100);

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-tooltip.png');
    });

    test('predictive chart responsive - mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupPredictiveChart(page);

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-mobile.png');
    });

    test('predictive chart responsive - tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setupPredictiveChart(page);

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-tablet.png');
    });
  });

  test.describe('HealthOverview Visual Tests', () => {
    test('health overview with complete data', async ({ page }) => {
      await setupHealthOverview(page, 'complete');

      await expect(page.locator('[data-testid="health-overview"]')).toHaveScreenshot('overview-complete-data.png');
    });

    test('health overview with partial data', async ({ page }) => {
      await setupHealthOverview(page, 'partial');

      await expect(page.locator('[data-testid="health-overview"]')).toHaveScreenshot('overview-partial-data.png');
    });

    test('health overview with empty data', async ({ page }) => {
      await setupHealthOverview(page, 'empty');

      await expect(page.locator('[data-testid="health-overview"]')).toHaveScreenshot('overview-empty-data.png');
    });

    test('health overview stat cards with trend indicators', async ({ page }) => {
      await setupHealthOverview(page, 'complete');

      await expect(page.locator('[data-testid="health-overview-stats"]')).toHaveScreenshot('overview-stat-cards.png');
    });

    test('health overview recent records list', async ({ page }) => {
      await setupHealthOverview(page, 'complete');

      await expect(page.locator('[data-testid="health-overview-recent-records"]')).toHaveScreenshot('overview-recent-records.png');
    });

    test('health overview goal progress cards', async ({ page }) => {
      await setupHealthOverview(page, 'complete');

      await expect(page.locator('[data-testid="health-overview-active-goals"]')).toHaveScreenshot('overview-goal-progress.png');
    });

    test('health overview quick action buttons', async ({ page }) => {
      await setupHealthOverview(page, 'complete');

      await expect(page.locator('[data-testid="health-overview-quick-actions"]')).toHaveScreenshot('overview-quick-actions.png');
    });

    test('health overview quick action buttons hover state', async ({ page }) => {
      await setupHealthOverview(page, 'complete');

      // Hover over first quick action button
      await page.hover('[data-testid="health-overview-quick-actions"] a:first-child');
      await page.waitForTimeout(100);

      await expect(page.locator('[data-testid="health-overview-quick-actions"]')).toHaveScreenshot('overview-quick-actions-hover.png');
    });

    test('health overview mini chart placeholders', async ({ page }) => {
      await setupHealthOverview(page, 'complete');

      await expect(page.locator('[data-testid="health-overview-mini-charts"]')).toHaveScreenshot('overview-mini-charts.png');
    });

    test('health overview behavior analytics section', async ({ page }) => {
      await setupHealthOverview(page, 'complete');

      await expect(page.locator('[data-testid="health-overview-behavior-analytics"]')).toHaveScreenshot('overview-behavior-analytics.png');
    });

    test('health overview responsive - mobile layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupHealthOverview(page, 'complete');

      await expect(page.locator('[data-testid="health-overview"]')).toHaveScreenshot('overview-mobile-layout.png');
    });

    test('health overview responsive - tablet layout', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setupHealthOverview(page, 'complete');

      await expect(page.locator('[data-testid="health-overview"]')).toHaveScreenshot('overview-tablet-layout.png');
    });

    test('health overview responsive - desktop layout', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupHealthOverview(page, 'complete');

      await expect(page.locator('[data-testid="health-overview"]')).toHaveScreenshot('overview-desktop-layout.png');
    });
  });

  test.describe('Chart Integration Visual Tests', () => {
    test('complete health dashboard with all charts', async ({ page }) => {
      await page.goto('/test-charts/dashboard');
      await page.waitForSelector('[data-testid="health-dashboard"]');

      await expect(page.locator('[data-testid="health-dashboard"]')).toHaveScreenshot('dashboard-complete.png');
    });

    test('health dashboard loading sequence', async ({ page }) => {
      await page.goto('/test-charts/dashboard?loading=true');
      await page.waitForSelector('[data-testid="health-dashboard"]');

      await expect(page.locator('[data-testid="health-dashboard"]')).toHaveScreenshot('dashboard-loading.png');
    });

    test('health dashboard error states', async ({ page }) => {
      await page.goto('/test-charts/dashboard?error=true');
      await page.waitForSelector('[data-testid="health-dashboard"]');

      await expect(page.locator('[data-testid="health-dashboard"]')).toHaveScreenshot('dashboard-error-states.png');
    });

    test('health dashboard chart interactions', async ({ page }) => {
      await page.goto('/test-charts/dashboard');
      await page.waitForSelector('[data-testid="health-dashboard"]');

      // Interact with radar chart
      await page.hover('[data-testid="radar-chart"] .recharts-radar-dot');
      await page.waitForTimeout(100);

      await expect(page.locator('[data-testid="health-dashboard"]')).toHaveScreenshot('dashboard-chart-interactions.png');
    });
  });

  test.describe('Data Visualization Accuracy Tests', () => {
    test('radar chart color coding matches score calculations', async ({ page }) => {
      const testMetrics = [
        { ...generateRadarMetrics(1)[0], score: 95, category: 'Excellent' },
        { ...generateRadarMetrics(1)[0], score: 75, category: 'Good' },
        { ...generateRadarMetrics(1)[0], score: 55, category: 'Fair' },
        { ...generateRadarMetrics(1)[0], score: 25, category: 'Poor' },
      ];

      await setupRadarChart(page, {
        data: [{ metrics: testMetrics }],
        title: 'Score-Color Mapping Test',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-score-color-mapping.png');
    });

    test('predictive chart trend lines accuracy', async ({ page }) => {
      // Create data with known linear trend
      const linearData = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        value: 70 - i * 0.5, // Clear downward trend
        isPrediction: false,
        unit: 'kg',
      }));

      await setupPredictiveChart(page, {
        data: linearData,
        algorithm: 'linear-regression',
        title: 'Linear Trend Accuracy Test',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-trend-accuracy.png');
    });

    test('goal progress bars percentage accuracy', async ({ page }) => {
      const testGoals = [
        { id: 1, type: 'Weight', target_value: 100, current_value: 25, target_date: '2024-12-31', status: 'active' as const }, // 25%
        { id: 2, type: 'Steps', target_value: 100, current_value: 50, target_date: '2024-12-31', status: 'active' as const }, // 50%
        { id: 3, type: 'Exercise', target_value: 100, current_value: 75, target_date: '2024-12-31', status: 'active' as const }, // 75%
        { id: 4, type: 'Sleep', target_value: 100, current_value: 100, target_date: '2024-12-31', status: 'completed' as const }, // 100%
      ];

      await page.goto('/test-charts/overview');
      await page.evaluate((goals) => {
        window.testOverviewData = {
          recentRecords: [],
          activeGoals: goals,
          stats: { totalRecords: 0, activeGoals: 3, completedGoals: 1, weeklyProgress: 0 },
        };
      }, testGoals);
      await page.waitForSelector('[data-testid="health-overview"]');

      await expect(page.locator('[data-testid="health-overview-active-goals"]')).toHaveScreenshot('goal-progress-accuracy.png');
    });

    test('confidence intervals visual proportionality', async ({ page }) => {
      // Create data with varying confidence levels
      const dataWithConfidence = generatePredictiveData(20, 10).map((point, i) => {
        if (point.isPrediction) {
          const baseValue = point.value;
          const confidenceWidth = 2 + i * 0.5; // Increasing confidence width
          return {
            ...point,
            confidenceUpper: baseValue + confidenceWidth,
            confidenceLower: Math.max(0, baseValue - confidenceWidth),
          };
        }
        return point;
      });

      await setupPredictiveChart(page, {
        data: dataWithConfidence,
        showConfidenceInterval: true,
        title: 'Confidence Interval Proportionality Test',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('confidence-interval-proportionality.png');
    });
  });

  test.describe('Accessibility Visual Tests', () => {
    test('high contrast mode compatibility', async ({ page }) => {
      // Enable high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              filter: contrast(150%) !important;
            }
          }
        `,
      });

      await setupRadarChart(page, {
        title: 'High Contrast Mode Test',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-high-contrast.png');
    });

    test('keyboard navigation focus indicators', async ({ page }) => {
      await setupHealthOverview(page, 'complete');

      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      await expect(page.locator('[data-testid="health-overview"]')).toHaveScreenshot('overview-keyboard-focus.png');
    });

    test('color-blind friendly color schemes', async ({ page }) => {
      // Simulate deuteranopia (red-green color blindness)
      await page.addStyleTag({
        content: `
          * {
            filter: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><defs><filter id='deuteranopia'><feColorMatrix type='matrix' values='0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0'/></filter></defs></svg>#deuteranopia") !important;
          }
        `,
      });

      await setupRadarChart(page, {
        title: 'Color-Blind Friendly Test',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-color-blind-friendly.png');
    });
  });

  test.describe('Performance Visual Tests', () => {
    test('chart rendering with large datasets', async ({ page }) => {
      const largeDataset = generatePredictiveData(500, 50);

      await setupPredictiveChart(page, {
        data: largeDataset,
        title: 'Large Dataset Performance Test',
      });

      await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot('predictive-large-dataset.png');
    });

    test('concurrent chart rendering', async ({ page }) => {
      await page.goto('/test-charts/concurrent');
      await page.waitForSelector('[data-testid="concurrent-charts"]');

      await expect(page.locator('[data-testid="concurrent-charts"]')).toHaveScreenshot('concurrent-chart-rendering.png');
    });
  });

  test.describe('Cross-Browser Visual Consistency', () => {
    ['chromium', 'firefox', 'webkit'].forEach((browserName) => {
      test(`radar chart consistency in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);

        await setupRadarChart(page, {
          title: `${browserName} Browser Test`,
        });

        await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot(`radar-${browserName}.png`);
      });

      test(`predictive chart consistency in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);

        await setupPredictiveChart(page, {
          title: `${browserName} Browser Test`,
        });

        await expect(page.locator('[data-testid="predictive-chart"]')).toHaveScreenshot(`predictive-${browserName}.png`);
      });
    });
  });

  test.describe('Theme and Styling Tests', () => {
    test('charts with light theme', async ({ page }) => {
      await page.addStyleTag({
        content: `
          :root {
            --background: white;
            --foreground: black;
            --primary: #3b82f6;
          }
        `,
      });

      await setupRadarChart(page, {
        title: 'Light Theme Test',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-light-theme.png');
    });

    test('charts with dark theme', async ({ page }) => {
      await page.addStyleTag({
        content: `
          :root {
            --background: #1f2937;
            --foreground: white;
            --primary: #60a5fa;
          }
          body {
            background-color: var(--background);
            color: var(--foreground);
          }
        `,
      });

      await setupRadarChart(page, {
        title: 'Dark Theme Test',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-dark-theme.png');
    });

    test('charts in different container sizes', async ({ page }) => {
      await setupRadarChart(page, {
        width: '300px',
        height: 200,
        title: 'Small Container Test',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-small-container.png');
    });

    test('charts with custom color schemes', async ({ page }) => {
      await setupRadarChart(page, {
        config: {
          colorScheme: {
            excellent: '#10b981',
            good: '#3b82f6',
            fair: '#f59e0b',
            poor: '#ef4444',
          },
        },
        title: 'Custom Color Scheme Test',
      });

      await expect(page.locator('[data-testid="radar-chart"]')).toHaveScreenshot('radar-custom-colors.png');
    });
  });
});
