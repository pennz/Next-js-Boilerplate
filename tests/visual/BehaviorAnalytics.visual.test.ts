import type { Page } from '@playwright/test';
import type {
  BehaviorDataPoint,
  HabitStrengthData,
  ContextPatternData,
  BehaviorAnalyticsChartProps,
} from '@/components/behavioral/BehaviorAnalyticsChart';
import type { BehaviorAnalyticsSummary } from '@/components/behavioral/BehaviorAnalyticsDashboard';
import { expect, test } from '@playwright/test';

// Test data generators using deterministic data for consistent screenshots
const generateDeterministicBehaviorData = (count: number = 14, seed: string = 'behavior'): BehaviorDataPoint[] => {
  const seedNum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return Array.from({ length: count }, (_, i) => {
    const date = new Date('2024-01-01');
    date.setDate(date.getDate() + i);
    
    const frequency = 3 + ((seedNum + i) % 5);
    const consistency = 60 + ((seedNum + i * 2) % 30);
    const strength = 50 + ((seedNum + i * 3) % 40);
    
    return {
      date: date.toISOString().split('T')[0],
      frequency,
      consistency,
      strength,
      context: ['morning', 'afternoon', 'evening'][i % 3],
      label: ['Exercise', 'Reading', 'Meditation'][i % 3],
    };
  });
};

const generateDeterministicHabitStrengthData = (count: number = 14, trend: 'increasing' | 'decreasing' | 'stable' = 'stable'): HabitStrengthData[] => {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date('2024-01-01');
    date.setDate(date.getDate() + i);
    
    let baseStrength: number;
    let baseConsistency: number;
    let baseFrequency: number;
    let baseContext: number;
    
    switch (trend) {
      case 'increasing':
        baseStrength = 40 + (i / count) * 50;
        baseConsistency = 50 + (i / count) * 40;
        baseFrequency = 30 + (i / count) * 50;
        baseContext = 45 + (i / count) * 35;
        break;
      case 'decreasing':
        baseStrength = 90 - (i / count) * 50;
        baseConsistency = 90 - (i / count) * 40;
        baseFrequency = 80 - (i / count) * 50;
        baseContext = 80 - (i / count) * 35;
        break;
      case 'stable':
      default:
        baseStrength = 65 + Math.sin(i * 0.3) * 5;
        baseConsistency = 70 + Math.sin(i * 0.4) * 5;
        baseFrequency = 60 + Math.sin(i * 0.5) * 5;
        baseContext = 65 + Math.sin(i * 0.6) * 5;
        break;
    }
    
    return {
      date: date.toISOString().split('T')[0],
      habitStrength: Math.round(baseStrength),
      consistencyScore: Math.round(baseConsistency),
      frequencyScore: Math.round(baseFrequency),
      contextScore: Math.round(baseContext),
      trend,
    };
  });
};

const generateDeterministicContextPatterns = (count: number = 8): ContextPatternData[] => {
  const contexts = [
    'Morning Routine',
    'After Work',
    'Weekend',
    'Stressful Days',
    'Social Events',
    'Quiet Evenings',
    'Travel Days',
    'Rainy Weather',
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    context: contexts[i] || `Context ${i + 1}`,
    successRate: 30 + (i * 8) % 60,
    frequency: 2 + (i * 2) % 12,
    confidence: 65 + (i * 5) % 30,
    predictivePower: 45 + (i * 7) % 40,
  }));
};

const generateDeterministicSummary = (trend: 'up' | 'down' | 'stable' = 'stable'): BehaviorAnalyticsSummary => {
  return {
    totalEvents: 125,
    activePatterns: 6,
    habitStrengthAvg: trend === 'up' ? 85 : trend === 'down' ? 55 : 70,
    consistencyScore: trend === 'up' ? 90 : trend === 'down' ? 60 : 75,
    topContext: 'Morning Routine',
    weeklyTrend: trend,
    predictionAccuracy: 82,
  };
};

const generateDeterministicPatterns = (count: number = 6) => {
  const behaviorTypes = ['Exercise', 'Reading', 'Meditation', 'Coding', 'Journaling', 'Healthy Eating'];
  const triggers = ['Morning alarm', 'After coffee', 'Lunch break', 'Evening routine', 'Weekend mornings', 'Before bed'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `pattern-${i + 1}`,
    behaviorType: behaviorTypes[i] || `Behavior ${i + 1}`,
    strength: 40 + (i * 10) % 50,
    frequency: 3 + (i * 2) % 10,
    consistency: 55 + (i * 7) % 35,
    confidence: 70 + (i * 5) % 25,
    topTrigger: triggers[i] || 'Default trigger',
  }));
};

// Helper functions for component setup
const setupBehaviorAnalyticsChart = async (page: Page, props: Partial<BehaviorAnalyticsChartProps> = {}) => {
  const defaultProps: BehaviorAnalyticsChartProps = {
    data: generateDeterministicBehaviorData(),
    chartType: 'behavior_frequency',
    title: 'Behavior Analytics Chart',
    height: 400,
    width: '100%',
    loading: false,
    error: undefined,
    className: '',
    timeRange: '30d',
    behaviorType: 'Exercise',
    showPrediction: false,
    showConfidenceInterval: false,
    onDataPointClick: undefined,
    ...props,
  };

  await page.goto('/test-charts/behavior-analytics');
  await page.evaluate((chartProps) => {
    window.testBehaviorChartProps = chartProps;
  }, defaultProps);
  await page.waitForSelector('[data-testid="behavior-analytics-chart"]');
};

const setupBehaviorAnalyticsDashboard = async (page: Page, dataState: 'empty' | 'loading' | 'error' | 'complete' = 'complete') => {
  const mockData = {
    empty: {
      summary: {
        totalEvents: 0,
        activePatterns: 0,
        habitStrengthAvg: 0,
        consistencyScore: 0,
        topContext: 'None',
        weeklyTrend: 'stable' as const,
        predictionAccuracy: 0,
      },
      patterns: [],
      habitStrengthData: [],
      contextPatternsData: [],
      behaviorFrequencyData: [],
      loading: false,
      error: null,
    },
    loading: {
      summary: null,
      patterns: null,
      habitStrengthData: null,
      contextPatternsData: null,
      behaviorFrequencyData: null,
      loading: true,
      error: null,
    },
    error: {
      summary: null,
      patterns: null,
      habitStrengthData: null,
      contextPatternsData: null,
      behaviorFrequencyData: null,
      loading: false,
      error: 'Failed to load analytics data',
    },
    complete: {
      summary: generateDeterministicSummary(),
      patterns: generateDeterministicPatterns(),
      habitStrengthData: generateDeterministicHabitStrengthData(),
      contextPatternsData: generateDeterministicContextPatterns(),
      behaviorFrequencyData: generateDeterministicBehaviorData(),
      loading: false,
      error: null,
    },
  };

  await page.goto('/test-charts/behavior-dashboard');
  await page.evaluate((data) => {
    window.testBehaviorDashboardData = data;
  }, mockData[dataState]);
  await page.waitForSelector('[data-testid="behavior-analytics-dashboard"]');
};

// Configure test settings
test.describe('Behavior Analytics Visual Regression Tests', () => {
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

  test.describe('BehaviorAnalyticsChart Visual Tests', () => {
    test.describe('Chart Type Variations', () => {
      test('behavior frequency chart with area visualization', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          data: generateDeterministicBehaviorData(),
          chartType: 'behavior_frequency',
          title: 'Behavior Frequency Chart',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('behavior-frequency-chart.png');
      });

      test('habit strength chart with stacked areas', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          data: generateDeterministicHabitStrengthData(),
          chartType: 'habit_strength',
          title: 'Habit Strength Chart',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('habit-strength-chart.png');
      });

      test('context patterns chart with bars', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          data: generateDeterministicContextPatterns(),
          chartType: 'context_patterns',
          title: 'Context Patterns Chart',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('context-patterns-chart.png');
      });

      test('consistency trends chart with lines', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          data: generateDeterministicBehaviorData(),
          chartType: 'consistency_trends',
          title: 'Consistency Trends Chart',
          showConfidenceInterval: true,
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('consistency-trends-chart.png');
      });
    });

    test.describe('Data State Variations', () => {
      test('chart with empty data state', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          data: [],
          title: 'Empty Data Chart',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-empty-data.png');
      });

      test('chart with single data point', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          data: generateDeterministicBehaviorData(1),
          title: 'Single Data Point Chart',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-single-data-point.png');
      });

      test('chart with normal dataset', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          data: generateDeterministicBehaviorData(14),
          title: 'Normal Dataset Chart',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-normal-dataset.png');
      });

      test('chart with large dataset', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          data: generateDeterministicBehaviorData(50),
          title: 'Large Dataset Chart',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-large-dataset.png');
      });
    });

    test.describe('Loading and Error States', () => {
      test('chart loading state with spinner', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          loading: true,
          title: 'Loading Chart',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-loading-state.png');
      });

      test('chart error state with message', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          error: 'Failed to load chart data',
          title: 'Error Chart',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-error-state.png');
      });

      test('chart empty state with message', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          data: [],
          title: 'Empty State Chart',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-empty-state-message.png');
      });
    });

    test.describe('Interactive States', () => {
      test('chart hover states on elements', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          chartType: 'context_patterns',
          data: generateDeterministicContextPatterns(),
        });

        // Hover over first bar
        await page.hover('[data-testid="behavior-analytics-chart"] .recharts-bar-rectangle');
        await page.waitForTimeout(100);

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-hover-state.png');
      });

      test('chart tooltip display', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          chartType: 'behavior_frequency',
          data: generateDeterministicBehaviorData(),
        });

        // Hover to show tooltip
        await page.hover('[data-testid="behavior-analytics-chart"] .recharts-area');
        await page.waitForTimeout(100);

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-tooltip-display.png');
      });

      test('chart active elements highlighting', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          chartType: 'consistency_trends',
          data: generateDeterministicBehaviorData(),
        });

        // Hover over line to activate dot
        await page.hover('[data-testid="behavior-analytics-chart"] .recharts-line-dot');
        await page.waitForTimeout(100);

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-active-elements.png');
      });
    });

    test.describe('Customization Options', () => {
      test('chart with custom height', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          height: 600,
          title: 'Custom Height Chart',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-custom-height.png');
      });

      test('chart with behavior type badge', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          behaviorType: 'Exercise',
          title: 'Chart with Behavior Type',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-behavior-type-badge.png');
      });

      test('chart with prediction enabled', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          showPrediction: true,
          title: 'Chart with Prediction',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-with-prediction.png');
      });

      test('chart with confidence intervals', async ({ page }) => {
        await setupBehaviorAnalyticsChart(page, {
          chartType: 'consistency_trends',
          showConfidenceInterval: true,
          title: 'Chart with Confidence Intervals',
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-confidence-intervals.png');
      });
    });
  });

  test.describe('BehaviorAnalyticsDashboard Visual Tests', () => {
    test.describe('Dashboard States', () => {
      test('complete dashboard with all sections', async ({ page }) => {
        await setupBehaviorAnalyticsDashboard(page, 'complete');

        await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-complete.png');
      });

      test('empty dashboard with no data', async ({ page }) => {
        await setupBehaviorAnalyticsDashboard(page, 'empty');

        await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-empty.png');
      });

      test('loading dashboard with spinners', async ({ page }) => {
        await setupBehaviorAnalyticsDashboard(page, 'loading');

        await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-loading.png');
      });

      test('error dashboard with error states', async ({ page }) => {
        await setupBehaviorAnalyticsDashboard(page, 'error');

        await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-error.png');
      });
    });

    test.describe('Real-time Indicator', () => {
      test('dashboard with active real-time indicator', async ({ page }) => {
        await setupBehaviorAnalyticsDashboard(page, 'complete');
        
        // Mock active real-time state
        await page.evaluate(() => {
          window.testBehaviorDashboardData.realTimeActive = true;
          window.testBehaviorDashboardData.lastUpdate = new Date();
        });

        await expect(page.locator('[data-testid="realtime-indicator"]')).toHaveScreenshot('realtime-indicator-active.png');
      });

      test('dashboard with offline real-time indicator', async ({ page }) => {
        await setupBehaviorAnalyticsDashboard(page, 'complete');
        
        // Mock offline real-time state
        await page.evaluate(() => {
          window.testBehaviorDashboardData.realTimeActive = false;
          window.testBehaviorDashboardData.lastUpdate = new Date(Date.now() - 300000); // 5 minutes ago
        });

        await expect(page.locator('[data-testid="realtime-indicator"]')).toHaveScreenshot('realtime-indicator-offline.png');
      });
    });
  });

  test.describe('Responsive Layout Tests', () => {
    test('mobile view (375px) with stacked layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-mobile-375px.png');
    });

    test('tablet view (768px) with responsive grid', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-tablet-768px.png');
    });

    test('desktop view (1200px) with full grid', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 });
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-desktop-1200px.png');
    });

    test('large screen (1920px) with scaling', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-large-1920px.png');
    });
  });

  test.describe('Chart-Specific Visual Tests', () => {
    test('behavior frequency chart color gradients', async ({ page }) => {
      await setupBehaviorAnalyticsChart(page, {
        chartType: 'behavior_frequency',
        data: generateDeterministicBehaviorData(),
        title: 'Frequency Chart Color Test',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('frequency-chart-colors.png');
    });

    test('habit strength chart color layering', async ({ page }) => {
      await setupBehaviorAnalyticsChart(page, {
        chartType: 'habit_strength',
        data: generateDeterministicHabitStrengthData(),
        title: 'Habit Strength Layering Test',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('habit-strength-layering.png');
    });

    test('context patterns chart label truncation', async ({ page }) => {
      const longNamePatterns = [
        {
          context: 'Very Long Context Name That Should Be Truncated',
          successRate: 75,
          frequency: 8,
          confidence: 85,
          predictivePower: 70,
        },
        {
          context: 'Another Extremely Long Context Name',
          successRate: 60,
          frequency: 5,
          confidence: 70,
          predictivePower: 65,
        },
      ];

      await setupBehaviorAnalyticsChart(page, {
        chartType: 'context_patterns',
        data: longNamePatterns,
        title: 'Context Patterns Label Test',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('context-patterns-labels.png');
    });

    test('consistency trends chart dot markers', async ({ page }) => {
      await setupBehaviorAnalyticsChart(page, {
        chartType: 'consistency_trends',
        data: generateDeterministicBehaviorData(),
        title: 'Consistency Trends Markers Test',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('consistency-trends-markers.png');
    });
  });

  test.describe('Interactive Element Visual Tests', () => {
    test('metric cards with trend indicators', async ({ page }) => {
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      // Test different trend states
      await page.evaluate(() => {
        window.testBehaviorDashboardData.summary.weeklyTrend = 'up';
      });

      await expect(page.locator('[data-testid="metric-cards"]')).toHaveScreenshot('metric-cards-up-trend.png');

      await page.evaluate(() => {
        window.testBehaviorDashboardData.summary.weeklyTrend = 'down';
      });

      await expect(page.locator('[data-testid="metric-cards"]')).toHaveScreenshot('metric-cards-down-trend.png');

      await page.evaluate(() => {
        window.testBehaviorDashboardData.summary.weeklyTrend = 'stable';
      });

      await expect(page.locator('[data-testid="metric-cards"]')).toHaveScreenshot('metric-cards-stable-trend.png');
    });

    test('pattern insight cards with strength levels', async ({ page }) => {
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      await expect(page.locator('[data-testid="pattern-insights"]')).toHaveScreenshot('pattern-insight-cards.png');
    });

    test('time range buttons active states', async ({ page }) => {
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      // Test different active states
      await page.click('button:has-text("7d")');
      await expect(page.locator('[data-testid="time-range-selector"]')).toHaveScreenshot('time-range-7d-active.png');

      await page.click('button:has-text("30d")');
      await expect(page.locator('[data-testid="time-range-selector"]')).toHaveScreenshot('time-range-30d-active.png');

      await page.click('button:has-text("90d")');
      await expect(page.locator('[data-testid="time-range-selector"]')).toHaveScreenshot('time-range-90d-active.png');

      await page.click('button:has-text("1y")');
      await expect(page.locator('[data-testid="time-range-selector"]')).toHaveScreenshot('time-range-1y-active.png');
    });

    test('navigation links hover states', async ({ page }) => {
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      // Hover over "View Full Analytics" link
      await page.hover('a:has-text("View Full Analytics")');
      await page.waitForTimeout(100);

      await expect(page.locator('[data-testid="navigation-links"]')).toHaveScreenshot('navigation-links-hover.png');
    });
  });

  test.describe('Data Visualization Accuracy Tests', () => {
    test('charts with upward trends', async ({ page }) => {
      await setupBehaviorAnalyticsChart(page, {
        chartType: 'habit_strength',
        data: generateDeterministicHabitStrengthData(14, 'increasing'),
        title: 'Upward Trend Test',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-upward-trend.png');
    });

    test('charts with downward trends', async ({ page }) => {
      await setupBehaviorAnalyticsChart(page, {
        chartType: 'habit_strength',
        data: generateDeterministicHabitStrengthData(14, 'decreasing'),
        title: 'Downward Trend Test',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-downward-trend.png');
    });

    test('charts with stable trends', async ({ page }) => {
      await setupBehaviorAnalyticsChart(page, {
        chartType: 'habit_strength',
        data: generateDeterministicHabitStrengthData(14, 'stable'),
        title: 'Stable Trend Test',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-stable-trend.png');
    });

    test('color coding consistency across data ranges', async ({ page }) => {
      // Test high values
      const highValuePatterns = generateDeterministicContextPatterns().map(p => ({
        ...p,
        successRate: 80 + (p.successRate % 15),
      }));

      await setupBehaviorAnalyticsChart(page, {
        chartType: 'context_patterns',
        data: highValuePatterns,
        title: 'High Values Color Test',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-high-values-colors.png');

      // Test low values
      const lowValuePatterns = generateDeterministicContextPatterns().map(p => ({
        ...p,
        successRate: 10 + (p.successRate % 20),
      }));

      await setupBehaviorAnalyticsChart(page, {
        chartType: 'context_patterns',
        data: lowValuePatterns,
        title: 'Low Values Color Test',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-low-values-colors.png');
    });

    test('tooltip formatting accuracy', async ({ page }) => {
      await setupBehaviorAnalyticsChart(page, {
        chartType: 'habit_strength',
        data: generateDeterministicHabitStrengthData(),
      });

      // Hover to show tooltip with formatted values
      await page.hover('[data-testid="behavior-analytics-chart"] .recharts-area');
      await page.waitForTimeout(100);

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('tooltip-formatting-accuracy.png');
    });
  });

  test.describe('Theme and Styling Tests', () => {
    test('components in light theme', async ({ page }) => {
      await page.addStyleTag({
        content: `
          :root {
            --background: white;
            --foreground: black;
            --primary: #3b82f6;
          }
        `,
      });

      await setupBehaviorAnalyticsDashboard(page, 'complete');

      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-light-theme.png');
    });

    test('components with high contrast', async ({ page }) => {
      await page.addStyleTag({
        content: `
          * {
            filter: contrast(150%) !important;
          }
        `,
      });

      await setupBehaviorAnalyticsChart(page, {
        chartType: 'behavior_frequency',
        data: generateDeterministicBehaviorData(),
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-high-contrast.png');
    });

    test('charts with custom color schemes', async ({ page }) => {
      await page.addStyleTag({
        content: `
          .recharts-area {
            fill: #10b981 !important;
          }
          .recharts-bar {
            fill: #f59e0b !important;
          }
        `,
      });

      await setupBehaviorAnalyticsChart(page, {
        chartType: 'context_patterns',
        data: generateDeterministicContextPatterns(),
        title: 'Custom Color Scheme',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-custom-colors.png');
    });

    test('components border and spacing consistency', async ({ page }) => {
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      // Focus on layout and spacing
      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-spacing-borders.png');
    });
  });

  test.describe('Animation and Transition Tests', () => {
    test('chart loading to loaded transition', async ({ page }) => {
      // Start with loading state
      await setupBehaviorAnalyticsChart(page, {
        loading: true,
        title: 'Transition Test',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-loading-frame.png');

      // Transition to loaded state
      await page.evaluate(() => {
        window.testBehaviorChartProps.loading = false;
        window.testBehaviorChartProps.data = window.generateDeterministicBehaviorData();
      });

      await page.waitForTimeout(100);
      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-loaded-frame.png');
    });

    test('hover animation effects', async ({ page }) => {
      await setupBehaviorAnalyticsChart(page, {
        chartType: 'context_patterns',
        data: generateDeterministicContextPatterns(),
      });

      // Capture before hover
      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-before-hover.png');

      // Hover and capture transition
      await page.hover('[data-testid="behavior-analytics-chart"] .recharts-bar-rectangle');
      await page.waitForTimeout(50);
      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-during-hover.png');
    });

    test('real-time update visual changes', async ({ page }) => {
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      // Capture initial state
      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-before-update.png');

      // Simulate data update
      await page.evaluate(() => {
        window.testBehaviorDashboardData.summary.habitStrengthAvg = 85;
        window.testBehaviorDashboardData.lastUpdate = new Date();
      });

      await page.waitForTimeout(100);
      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-after-update.png');
    });
  });

  test.describe('Error and Edge Case Visuals', () => {
    test('dashboard during network error', async ({ page }) => {
      await setupBehaviorAnalyticsDashboard(page, 'error');

      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-network-error.png');
    });

    test('charts with extreme values', async ({ page }) => {
      const extremeData = [
        {
          date: '2024-01-01',
          frequency: 0,
          consistency: 0,
          strength: 0,
        },
        {
          date: '2024-01-02',
          frequency: 100,
          consistency: 100,
          strength: 100,
        },
      ];

      await setupBehaviorAnalyticsChart(page, {
        data: extremeData,
        title: 'Extreme Values Test',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-extreme-values.png');
    });

    test('components with very long text content', async ({ page }) => {
      const longTextPatterns = generateDeterministicPatterns().map(p => ({
        ...p,
        behaviorType: 'Very Long Behavior Type Name That Should Test Text Wrapping And Truncation Behavior',
        topTrigger: 'An extremely long trigger description that should test how the component handles overflow text content',
      }));

      await setupBehaviorAnalyticsDashboard(page, 'complete');
      await page.evaluate((patterns) => {
        window.testBehaviorDashboardData.patterns = patterns;
      }, longTextPatterns);

      await expect(page.locator('[data-testid="pattern-insights"]')).toHaveScreenshot('components-long-text.png');
    });
  });

  test.describe('Performance Visual Tests', () => {
    test('charts with 100+ data points', async ({ page }) => {
      const largeDataset = generateDeterministicBehaviorData(120);

      await setupBehaviorAnalyticsChart(page, {
        data: largeDataset,
        title: 'Large Dataset Performance Test',
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-large-dataset-performance.png');
    });

    test('dashboard with all charts rendering', async ({ page }) => {
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      // Ensure all charts are rendered
      await page.waitForSelector('[data-testid="habit-strength-chart"]');
      await page.waitForSelector('[data-testid="context-patterns-chart"]');
      await page.waitForSelector('[data-testid="behavior-frequency-chart"]');

      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-all-charts-rendering.png');
    });

    test('components after extended use simulation', async ({ page }) => {
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      // Simulate multiple interactions
      for (let i = 0; i < 5; i++) {
        await page.click('button:has-text("7d")');
        await page.waitForTimeout(50);
        await page.click('button:has-text("30d")');
        await page.waitForTimeout(50);
      }

      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-after-extended-use.png');
    });
  });

  test.describe('Accessibility Visual Tests', () => {
    test('keyboard focus indicators', async ({ page }) => {
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-keyboard-focus.png');
    });

    test('color-blind friendly palettes', async ({ page }) => {
      // Simulate deuteranopia (red-green color blindness)
      await page.addStyleTag({
        content: `
          * {
            filter: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><defs><filter id='deuteranopia'><feColorMatrix type='matrix' values='0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0'/></filter></defs></svg>#deuteranopia") !important;
          }
        `,
      });

      await setupBehaviorAnalyticsChart(page, {
        chartType: 'habit_strength',
        data: generateDeterministicHabitStrengthData(),
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('chart-color-blind-friendly.png');
    });

    test('high contrast mode compatibility', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              filter: contrast(200%) !important;
            }
          }
        `,
      });

      await setupBehaviorAnalyticsDashboard(page, 'complete');

      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('dashboard-high-contrast-mode.png');
    });
  });

  test.describe('Cross-Browser Visual Consistency', () => {
    ['chromium', 'firefox', 'webkit'].forEach((browserName) => {
      test(`behavior analytics chart consistency in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);

        await setupBehaviorAnalyticsChart(page, {
          chartType: 'habit_strength',
          data: generateDeterministicHabitStrengthData(),
          title: `${browserName} Browser Test`,
        });

        await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot(`chart-${browserName}.png`);
      });

      test(`behavior analytics dashboard consistency in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);

        await setupBehaviorAnalyticsDashboard(page, 'complete');

        await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot(`dashboard-${browserName}.png`);
      });
    });
  });

  test.describe('Visual Regression Configuration', () => {
    test.use({
      // Set appropriate threshold for visual comparison
      expect: {
        toHaveScreenshot: { threshold: 0.2, mode: 'percent' },
      },
    });

    test('visual regression baseline establishment', async ({ page }) => {
      await setupBehaviorAnalyticsDashboard(page, 'complete');

      // This test establishes the baseline for visual regression
      await expect(page.locator('[data-testid="behavior-analytics-dashboard"]')).toHaveScreenshot('baseline-dashboard.png');
    });

    test('visual regression with retry logic', async ({ page }) => {
      // Test with potential flakiness
      await setupBehaviorAnalyticsChart(page, {
        chartType: 'context_patterns',
        data: generateDeterministicContextPatterns(),
      });

      // Wait for chart to fully render
      await page.waitForFunction(() => {
        const chart = document.querySelector('[data-testid="behavior-analytics-chart"]');
        return chart && chart.querySelector('.recharts-surface');
      });

      await expect(page.locator('[data-testid="behavior-analytics-chart"]')).toHaveScreenshot('retry-test-chart.png');
    });
  });
});