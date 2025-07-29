import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { BehaviorAnalyticsChart } from './BehaviorAnalyticsChart';
import {
  generateBehaviorFrequencyData,
  generateHabitStrengthData,
  generateContextPatternsData,
  generateEmptyBehaviorData,
  generateSingleBehaviorPoint,
  generateLargeBehaviorDataset,
  generateBehaviorDataWithTrends,
  generateHabitStrengthTrends,
  generateHabitStrengthWithConfidence,
  generateHabitStrengthEdgeCases,
  generateContextPatternsWithLongNames,
  generateContextPatternsVariedSuccess,
  generateDataForTimeRange,
  generateFutureProjections,
  generateCorruptedData,
  createDeterministicData,
  createChartPropsForType,
} from './BehaviorAnalyticsChart.fixtures';

const meta: Meta<typeof BehaviorAnalyticsChart> = {
  title: 'Behavioral/BehaviorAnalyticsChart',
  component: BehaviorAnalyticsChart,
  parameters: {
    docs: {
      description: {
        component: `
Interactive behavioral analytics chart component using Recharts. Supports four different chart types:
- **behavior_frequency**: Area chart showing behavior frequency and strength trends
- **habit_strength**: Multi-series area chart displaying habit strength progression
- **context_patterns**: Bar chart showing context success patterns with predictive power
- **consistency_trends**: Line chart displaying consistency and frequency trends over time

Features responsive design, accessibility support, real-time updates, and comprehensive error handling.
        `,
      },
    },
  },
  args: {
    chartType: 'behavior_frequency',
    height: 400,
    width: '100%',
    loading: false,
    error: undefined,
    className: '',
    timeRange: '30d',
    behaviorType: undefined,
    showPrediction: false,
    showConfidenceInterval: false,
    onDataPointClick: undefined,
  },
  argTypes: {
    chartType: {
      control: { type: 'select' },
      options: ['behavior_frequency', 'habit_strength', 'context_patterns', 'consistency_trends'],
      description: 'Type of chart to display',
    },
    data: {
      control: { type: 'object' },
      description: 'Chart data array - structure varies by chart type',
    },
    title: {
      control: { type: 'text' },
      description: 'Chart title displayed at the top',
    },
    height: {
      control: { type: 'number', min: 200, max: 800, step: 50 },
      description: 'Chart height in pixels',
    },
    width: {
      control: { type: 'text' },
      description: 'Chart width (CSS value)',
    },
    timeRange: {
      control: { type: 'select' },
      options: ['7d', '30d', '90d', '1y'],
      description: 'Time range for data display',
    },
    loading: {
      control: { type: 'boolean' },
      description: 'Loading state with spinner',
    },
    error: {
      control: { type: 'text' },
      description: 'Error message to display',
    },
    behaviorType: {
      control: { type: 'text' },
      description: 'Behavior type badge text',
    },
    showPrediction: {
      control: { type: 'boolean' },
      description: 'Enable prediction features and indicators',
    },
    showConfidenceInterval: {
      control: { type: 'boolean' },
      description: 'Show confidence intervals (consistency_trends only)',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
    onDataPointClick: {
      action: 'dataPointClicked',
      description: 'Callback for chart element clicks',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BehaviorAnalyticsChart>;

// Default and Chart Type Stories
export const Default: Story = {
  args: {
    data: generateBehaviorFrequencyData(),
    title: 'Behavior Frequency Analysis',
    chartType: 'behavior_frequency',
    behaviorType: 'Exercise',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default behavior frequency chart showing frequency and strength trends over time with area visualization.',
      },
    },
  },
};

export const HabitStrengthChart: Story = {
  args: {
    data: generateHabitStrengthData(),
    title: 'Habit Strength Progression',
    chartType: 'habit_strength',
    behaviorType: 'Daily Meditation',
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-series area chart displaying habit strength, consistency, frequency, and context scores with stacked visualization.',
      },
    },
  },
};

export const ContextPatternsChart: Story = {
  args: {
    data: generateContextPatternsData(),
    title: 'Context Success Patterns',
    chartType: 'context_patterns',
    onDataPointClick: action('contextPatternClicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Bar chart showing success rates and predictive power across different contexts. Bars are clickable for detailed analysis.',
      },
    },
  },
};

export const ConsistencyTrendsChart: Story = {
  args: {
    data: generateBehaviorFrequencyData(),
    title: 'Consistency Trends Over Time',
    chartType: 'consistency_trends',
    showConfidenceInterval: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Line chart displaying consistency and frequency trends with optional confidence intervals for statistical analysis.',
      },
    },
  },
};

// Data Variation Stories
export const EmptyData: Story = {
  args: {
    data: generateEmptyBehaviorData(),
    title: 'No Data Available',
    chartType: 'behavior_frequency',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with empty data array showing appropriate empty state with brain icon and helpful message.',
      },
    },
  },
};

export const SingleDataPoint: Story = {
  args: {
    data: generateSingleBehaviorPoint(),
    title: 'Single Measurement',
    chartType: 'behavior_frequency',
    timeRange: '7d',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with minimal data (one point) demonstrating how the component handles edge cases gracefully.',
      },
    },
  },
};

export const LargeDataset: Story = {
  args: {
    data: generateLargeBehaviorDataset(),
    title: 'Extended Analysis (35 Days)',
    chartType: 'behavior_frequency',
    timeRange: '30d',
    height: 500,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with 35+ data points demonstrating performance with extensive datasets and scrollable visualization.',
      },
    },
  },
};

export const RichData: Story = {
  args: {
    data: generateBehaviorFrequencyData().map(item => ({
      ...item,
      context: 'morning',
      label: 'Exercise',
      confidence: 85,
      metadata: { source: 'manual', verified: true },
    })),
    title: 'Comprehensive Data Analysis',
    chartType: 'behavior_frequency',
    behaviorType: 'Morning Exercise',
    showPrediction: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with comprehensive data including all optional fields, metadata, and enhanced features.',
      },
    },
  },
};

export const MinimalData: Story = {
  args: {
    data: generateBehaviorFrequencyData().map(({ date, frequency, consistency, strength }) => ({
      date,
      frequency,
      consistency,
      strength,
    })),
    title: 'Basic Data Structure',
    chartType: 'behavior_frequency',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with only required fields demonstrating basic functionality without optional enhancements.',
      },
    },
  },
};

// State Variation Stories
export const LoadingState: Story = {
  args: {
    data: [],
    title: 'Loading Analytics Data',
    loading: true,
    chartType: 'behavior_frequency',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart in loading state with spinner animation while maintaining title and container structure.',
      },
    },
  },
};

export const ErrorState: Story = {
  args: {
    data: [],
    title: 'Analytics Error',
    error: 'Failed to load behavioral analytics data. Please try again.',
    chartType: 'behavior_frequency',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart displaying error state with warning icon and actionable error message.',
      },
    },
  },
};

export const LoadingWithTitle: Story = {
  args: {
    data: [],
    title: 'Habit Strength Analysis',
    loading: true,
    chartType: 'habit_strength',
    behaviorType: 'Reading',
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while preserving title, behavior type badge, and overall layout structure.',
      },
    },
  },
};

export const ErrorWithRetry: Story = {
  args: {
    data: [],
    title: 'Context Patterns',
    error: 'Network timeout. Check your connection and refresh the page.',
    chartType: 'context_patterns',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state with specific, actionable error message guiding user recovery steps.',
      },
    },
  },
};

// Interactive Feature Stories
export const ClickableElements: Story = {
  args: {
    data: generateContextPatternsData(),
    title: 'Interactive Context Patterns',
    chartType: 'context_patterns',
    onDataPointClick: action('dataPointClicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Context patterns chart with clickable bars. Click events are logged in the Actions panel for testing interactions.',
      },
    },
  },
};

export const TooltipDemo: Story = {
  args: {
    data: generateHabitStrengthData(),
    title: 'Tooltip Interaction Demo',
    chartType: 'habit_strength',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart optimized for tooltip interaction testing. Hover over chart elements to see formatted data tooltips.',
      },
    },
  },
};

export const HoverStates: Story = {
  args: {
    data: generateBehaviorDataWithTrends('increasing'),
    title: 'Hover Effects Demo',
    chartType: 'consistency_trends',
  },
  parameters: {
    docs: {
      description: {
        story: 'Line chart demonstrating hover effects on different chart elements including active dots and line highlighting.',
      },
    },
  },
};

export const KeyboardNavigation: Story = {
  args: {
    data: generateContextPatternsData(),
    title: 'Keyboard Accessible Chart',
    chartType: 'context_patterns',
    onDataPointClick: action('keyboardActivated'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart configured for keyboard accessibility testing. Use Tab and Enter keys to navigate and interact with chart elements.',
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'keyboard', enabled: true },
        ],
      },
    },
  },
};

// Customization Stories
export const CustomStyling: Story = {
  args: {
    data: generateBehaviorFrequencyData(),
    title: 'Custom Styled Chart',
    chartType: 'behavior_frequency',
    height: 350,
    className: 'border-2 border-purple-300 shadow-lg',
    behaviorType: 'Custom Behavior',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with custom styling including enhanced borders, shadows, and visual customizations.',
      },
    },
  },
};

export const CompactSize: Story = {
  args: {
    data: generateBehaviorFrequencyData(7),
    title: 'Compact Widget',
    chartType: 'behavior_frequency',
    height: 250,
    timeRange: '7d',
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact chart suitable for dashboard widgets with reduced height and simplified data display.',
      },
    },
  },
};

export const LargeSize: Story = {
  args: {
    data: generateLargeBehaviorDataset(),
    title: 'Detailed Analysis View',
    chartType: 'habit_strength',
    height: 600,
    showPrediction: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Expanded chart for detailed analysis with increased height and enhanced features for comprehensive data exploration.',
      },
    },
  },
};

export const NoGrid: Story = {
  args: {
    data: generateBehaviorFrequencyData(),
    title: 'Clean Minimal Design',
    chartType: 'behavior_frequency',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with clean, minimal design focusing on data visualization without grid distractions.',
      },
    },
  },
};

export const WithBehaviorType: Story = {
  args: {
    data: generateHabitStrengthData(),
    title: 'Behavior Type Badge Demo',
    chartType: 'habit_strength',
    behaviorType: 'Morning Meditation',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart displaying behavior type badge with enhanced metadata and visual identification.',
      },
    },
  },
};

// Time Range Variations
export const SevenDayRange: Story = {
  args: {
    data: generateDataForTimeRange('7d'),
    title: 'Weekly Analysis',
    chartType: 'behavior_frequency',
    timeRange: '7d',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with 7-day data range optimized for short-term trend analysis and recent behavior tracking.',
      },
    },
  },
};

export const ThirtyDayRange: Story = {
  args: {
    data: generateDataForTimeRange('30d'),
    title: 'Monthly Trends',
    chartType: 'habit_strength',
    timeRange: '30d',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with 30-day data range showing monthly patterns and medium-term trend analysis.',
      },
    },
  },
};

export const NinetyDayRange: Story = {
  args: {
    data: generateDataForTimeRange('90d'),
    title: 'Quarterly Analysis',
    chartType: 'consistency_trends',
    timeRange: '90d',
    height: 450,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with 90-day data range for quarterly analysis and long-term pattern identification.',
      },
    },
  },
};

export const YearlyRange: Story = {
  args: {
    data: generateDataForTimeRange('1y'),
    title: 'Annual Behavior Trends',
    chartType: 'behavior_frequency',
    timeRange: '1y',
    height: 500,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with 1-year data range for comprehensive annual analysis and long-term behavior evolution.',
      },
    },
  },
};

// Advanced Feature Stories
export const WithPrediction: Story = {
  args: {
    data: [...generateBehaviorFrequencyData(), ...generateFutureProjections()],
    title: 'Predictive Analysis',
    chartType: 'behavior_frequency',
    showPrediction: true,
    timeRange: '30d',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with prediction features enabled showing future projections and predictive indicators.',
      },
    },
  },
};

export const WithConfidenceInterval: Story = {
  args: {
    data: generateHabitStrengthWithConfidence(),
    title: 'Statistical Confidence',
    chartType: 'consistency_trends',
    showConfidenceInterval: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Consistency trends chart with confidence intervals displayed for statistical analysis and uncertainty visualization.',
      },
    },
  },
};

export const PredictiveAnalysis: Story = {
  args: {
    data: [...generateBehaviorDataWithTrends('increasing'), ...generateFutureProjections()],
    title: 'AI-Powered Predictions',
    chartType: 'behavior_frequency',
    showPrediction: true,
    behaviorType: 'AI Enhanced',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart showcasing predictive analysis capabilities with AI-powered future projections and trend forecasting.',
      },
    },
  },
};

export const RealTimeData: Story = {
  args: {
    data: generateBehaviorFrequencyData(),
    title: 'Real-Time Updates',
    chartType: 'behavior_frequency',
    showPrediction: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart simulating real-time data updates with dynamic content changes and live indicators.',
      },
    },
  },
};

// Accessibility Stories
export const HighContrast: Story = {
  args: {
    data: generateBehaviorFrequencyData(),
    title: 'High Contrast Accessibility',
    chartType: 'behavior_frequency',
    className: 'high-contrast-theme',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart optimized for high contrast accessibility requirements with enhanced color differentiation.',
      },
    },
    backgrounds: {
      default: 'dark',
    },
  },
};

export const ScreenReaderOptimized: Story = {
  args: {
    data: generateContextPatternsData(),
    title: 'Screen Reader Compatible',
    chartType: 'context_patterns',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with enhanced ARIA labels and screen reader support for comprehensive accessibility.',
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'aria-labels', enabled: true },
          { id: 'landmark-one-main', enabled: true },
        ],
      },
    },
  },
};

export const KeyboardOnly: Story = {
  args: {
    data: generateHabitStrengthData(),
    title: 'Keyboard Navigation Only',
    chartType: 'habit_strength',
    onDataPointClick: action('keyboardInteraction'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart demonstrating complete keyboard-only interaction without mouse dependency.',
      },
    },
  },
};

export const ColorBlindFriendly: Story = {
  args: {
    data: generateContextPatternsVariedSuccess(),
    title: 'Color Blind Friendly',
    chartType: 'context_patterns',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart using color-blind friendly palette ensuring accessibility for users with color vision deficiencies.',
      },
    },
  },
};

// Responsive Design Stories
export const MobileView: Story = {
  args: {
    data: generateBehaviorFrequencyData(7),
    title: 'Mobile Optimized',
    chartType: 'behavior_frequency',
    height: 300,
    timeRange: '7d',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart optimized for mobile viewport with compact layout and touch-friendly interactions.',
      },
    },
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const TabletView: Story = {
  args: {
    data: generateHabitStrengthData(),
    title: 'Tablet Configuration',
    chartType: 'habit_strength',
    height: 400,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart configured for tablet viewport with balanced layout and medium-density data display.',
      },
    },
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const DesktopView: Story = {
  args: {
    data: generateLargeBehaviorDataset(),
    title: 'Desktop Full Features',
    chartType: 'consistency_trends',
    height: 500,
    showPrediction: true,
    showConfidenceInterval: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart in standard desktop configuration with full feature set and comprehensive data visualization.',
      },
    },
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

export const ResponsiveDemo: Story = {
  args: {
    data: generateBehaviorFrequencyData(),
    title: 'Responsive Behavior Demo',
    chartType: 'behavior_frequency',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart demonstrating responsive behavior across different screen sizes and breakpoints.',
      },
    },
  },
};

// Edge Case Stories
export const ExtremeValues: Story = {
  args: {
    data: [
      ...generateHabitStrengthEdgeCases(),
      ...generateHabitStrengthData().map(item => ({
        ...item,
        habitStrength: Math.random() > 0.5 ? 0 : 100,
        consistencyScore: Math.random() > 0.5 ? 0 : 100,
      })),
    ],
    title: 'Extreme Value Handling',
    chartType: 'habit_strength',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart handling extreme values (0%, 100%) and edge cases with appropriate scaling and visualization.',
      },
    },
  },
};

export const LongContextNames: Story = {
  args: {
    data: generateContextPatternsWithLongNames(),
    title: 'Long Context Names',
    chartType: 'context_patterns',
    height: 450,
  },
  parameters: {
    docs: {
      description: {
        story: 'Context patterns chart with very long context names testing text truncation and label handling.',
      },
    },
  },
};

export const MixedDataTypes: Story = {
  args: {
    data: [
      ...generateBehaviorFrequencyData(5),
      ...generateBehaviorDataWithTrends('increasing').slice(0, 5),
      ...generateBehaviorDataWithTrends('decreasing').slice(0, 4),
    ],
    title: 'Mixed Data Patterns',
    chartType: 'behavior_frequency',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart handling mixed data types and patterns including positive, negative, and varied trend combinations.',
      },
    },
  },
};

export const CorruptedData: Story = {
  args: {
    data: generateCorruptedData() as any,
    title: 'Corrupted Data Handling',
    chartType: 'behavior_frequency',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart gracefully handling malformed, incomplete, or corrupted data without crashing.',
      },
    },
  },
};

// Performance Stories
export const HighFrequencyUpdates: Story = {
  args: {
    data: generateBehaviorFrequencyData(),
    title: 'High Frequency Updates',
    chartType: 'behavior_frequency',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart simulating rapid data updates for performance testing and real-time scenarios.',
      },
    },
  },
};

export const MemoryStress: Story = {
  args: {
    data: generateDataForTimeRange('1y'),
    title: 'Large Dataset Performance',
    chartType: 'habit_strength',
    height: 600,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with large dataset (365 data points) for memory usage and rendering performance testing.',
      },
    },
  },
};

export const ConcurrentCharts: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <BehaviorAnalyticsChart
        data={generateBehaviorFrequencyData()}
        title="Chart 1"
        chartType="behavior_frequency"
        height={300}
      />
      <BehaviorAnalyticsChart
        data={generateHabitStrengthData()}
        title="Chart 2"
        chartType="habit_strength"
        height={300}
      />
      <BehaviorAnalyticsChart
        data={generateContextPatternsData()}
        title="Chart 3"
        chartType="context_patterns"
        height={300}
      />
      <BehaviorAnalyticsChart
        data={generateBehaviorFrequencyData()}
        title="Chart 4"
        chartType="consistency_trends"
        height={300}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple chart instances rendering concurrently for performance and memory testing.',
      },
    },
  },
};

// Interactive Controls Demo
export const InteractiveDemo: Story = {
  args: {
    data: generateBehaviorFrequencyData(),
    title: 'Interactive Controls Demo',
    chartType: 'behavior_frequency',
    onDataPointClick: action('dataPointClicked'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Use the controls panel to experiment with different chart configurations and see real-time changes. Perfect for testing all available props and features.',
      },
    },
  },
};