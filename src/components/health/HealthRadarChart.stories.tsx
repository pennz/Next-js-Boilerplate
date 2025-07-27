import type { Meta, StoryObj } from '@storybook/react';
import type {
  RadarChartData,
} from './types';
import { HealthRadarChart } from './HealthRadarChart';

// Mock data generators for different health scenarios
const generateExcellentHealthData = (): RadarChartData => ({
  metrics: [
    {
      category: 'Weight (BMI)',
      value: 22.5,
      maxValue: 25,
      unit: 'BMI',
      score: 90,
      color: '#10b981',
      icon: '⚖️',
    },
    {
      category: 'Daily Steps',
      value: 12000,
      maxValue: 10000,
      unit: 'steps',
      score: 95,
      color: '#10b981',
      icon: '👟',
    },
    {
      category: 'Sleep Quality',
      value: 8.2,
      maxValue: 8,
      unit: 'hours',
      score: 92,
      color: '#10b981',
      icon: '😴',
    },
    {
      category: 'Heart Rate',
      value: 65,
      maxValue: 70,
      unit: 'bpm',
      score: 88,
      color: '#10b981',
      icon: '❤️',
    },
    {
      category: 'Blood Pressure',
      value: 115,
      maxValue: 120,
      unit: 'mmHg',
      score: 85,
      color: '#10b981',
      icon: '🩺',
    },
    {
      category: 'Water Intake',
      value: 2.8,
      maxValue: 2.5,
      unit: 'liters',
      score: 95,
      color: '#10b981',
      icon: '💧',
    },
    {
      category: 'Exercise',
      value: 180,
      maxValue: 150,
      unit: 'minutes/week',
      score: 90,
      color: '#10b981',
      icon: '💪',
    },
  ],
  timestamp: new Date().toISOString(),
  label: 'Excellent Health Profile',
});

const generatePoorHealthData = (): RadarChartData => ({
  metrics: [
    {
      category: 'Weight (BMI)',
      value: 32.1,
      maxValue: 25,
      unit: 'BMI',
      score: 25,
      color: '#ef4444',
      icon: '⚖️',
    },
    {
      category: 'Daily Steps',
      value: 3200,
      maxValue: 10000,
      unit: 'steps',
      score: 32,
      color: '#ef4444',
      icon: '👟',
    },
    {
      category: 'Sleep Quality',
      value: 5.2,
      maxValue: 8,
      unit: 'hours',
      score: 35,
      color: '#ef4444',
      icon: '😴',
    },
    {
      category: 'Heart Rate',
      value: 95,
      maxValue: 70,
      unit: 'bpm',
      score: 20,
      color: '#ef4444',
      icon: '❤️',
    },
    {
      category: 'Blood Pressure',
      value: 155,
      maxValue: 120,
      unit: 'mmHg',
      score: 15,
      color: '#ef4444',
      icon: '🩺',
    },
    {
      category: 'Water Intake',
      value: 1.1,
      maxValue: 2.5,
      unit: 'liters',
      score: 44,
      color: '#ef4444',
      icon: '💧',
    },
    {
      category: 'Exercise',
      value: 45,
      maxValue: 150,
      unit: 'minutes/week',
      score: 30,
      color: '#ef4444',
      icon: '💪',
    },
  ],
  timestamp: new Date().toISOString(),
  label: 'Poor Health Profile',
});

const generateMixedHealthData = (): RadarChartData => ({
  metrics: [
    {
      category: 'Weight (BMI)',
      value: 26.8,
      maxValue: 25,
      unit: 'BMI',
      score: 65,
      color: '#f59e0b',
      icon: '⚖️',
    },
    {
      category: 'Daily Steps',
      value: 8500,
      maxValue: 10000,
      unit: 'steps',
      score: 85,
      color: '#10b981',
      icon: '👟',
    },
    {
      category: 'Sleep Quality',
      value: 6.8,
      maxValue: 8,
      unit: 'hours',
      score: 70,
      color: '#f59e0b',
      icon: '😴',
    },
    {
      category: 'Heart Rate',
      value: 78,
      maxValue: 70,
      unit: 'bpm',
      score: 55,
      color: '#f59e0b',
      icon: '❤️',
    },
    {
      category: 'Blood Pressure',
      value: 128,
      maxValue: 120,
      unit: 'mmHg',
      score: 60,
      color: '#f59e0b',
      icon: '🩺',
    },
    {
      category: 'Water Intake',
      value: 2.2,
      maxValue: 2.5,
      unit: 'liters',
      score: 88,
      color: '#10b981',
      icon: '💧',
    },
    {
      category: 'Exercise',
      value: 120,
      maxValue: 150,
      unit: 'minutes/week',
      score: 80,
      color: '#10b981',
      icon: '💪',
    },
  ],
  timestamp: new Date().toISOString(),
  label: 'Mixed Health Profile',
});

const generateMinimalHealthData = (): RadarChartData => ({
  metrics: [
    {
      category: 'Weight (BMI)',
      value: 23.5,
      maxValue: 25,
      unit: 'BMI',
      score: 85,
      color: '#10b981',
      icon: '⚖️',
    },
    {
      category: 'Daily Steps',
      value: 9200,
      maxValue: 10000,
      unit: 'steps',
      score: 92,
      color: '#10b981',
      icon: '👟',
    },
    {
      category: 'Sleep Quality',
      value: 7.5,
      maxValue: 8,
      unit: 'hours',
      score: 88,
      color: '#10b981',
      icon: '😴',
    },
  ],
  timestamp: new Date().toISOString(),
  label: 'Minimal Health Data',
});

const generateFiveMetricsData = (): RadarChartData => ({
  metrics: [
    {
      category: 'Weight (BMI)',
      value: 24.2,
      maxValue: 25,
      unit: 'BMI',
      score: 82,
      color: '#10b981',
      icon: '⚖️',
    },
    {
      category: 'Daily Steps',
      value: 7800,
      maxValue: 10000,
      unit: 'steps',
      score: 78,
      color: '#f59e0b',
      icon: '👟',
    },
    {
      category: 'Sleep Quality',
      value: 7.2,
      maxValue: 8,
      unit: 'hours',
      score: 75,
      color: '#f59e0b',
      icon: '😴',
    },
    {
      category: 'Heart Rate',
      value: 72,
      maxValue: 70,
      unit: 'bpm',
      score: 68,
      color: '#f59e0b',
      icon: '❤️',
    },
    {
      category: 'Water Intake',
      value: 2.3,
      maxValue: 2.5,
      unit: 'liters',
      score: 92,
      color: '#10b981',
      icon: '💧',
    },
  ],
  timestamp: new Date().toISOString(),
  label: 'Five Metrics Profile',
});

// Color schemes for different themes
const defaultColorScheme = {
  excellent: '#10b981', // green-500
  good: '#22c55e', // green-400
  fair: '#f59e0b', // amber-500
  poor: '#ef4444', // red-500
};

const blueColorScheme = {
  excellent: '#3b82f6', // blue-500
  good: '#60a5fa', // blue-400
  fair: '#93c5fd', // blue-300
  poor: '#dbeafe', // blue-100
};

const purpleColorScheme = {
  excellent: '#8b5cf6', // violet-500
  good: '#a78bfa', // violet-400
  fair: '#c4b5fd', // violet-300
  poor: '#e0e7ff', // violet-200
};

// Storybook meta configuration
const meta: Meta<typeof HealthRadarChart> = {
  title: 'Health/HealthRadarChart',
  component: HealthRadarChart,
  parameters: {
    docs: {
      description: {
        component: `
Interactive health radar chart component for multi-metric health visualization using Recharts. 
Displays normalized health scores across multiple categories in a radar/spider chart format.

## Features
- **Multiple Scoring Systems**: Percentage, Z-score, and custom scoring
- **Responsive Design**: Adapts to different screen sizes
- **Interactive Elements**: Hover effects, tooltips, and metric highlighting
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Customizable**: Colors, sizes, grid levels, and metric configurations
- **Health Metrics**: Weight (BMI), steps, sleep, heart rate, blood pressure, water, exercise

## Scoring System
- **Excellent (80-100)**: Green - Optimal health range
- **Good (60-79)**: Light green - Above average health
- **Fair (40-59)**: Yellow/amber - Average health range
- **Poor (0-39)**: Red - Below optimal health range

## Usage
\`\`\`tsx
import { HealthRadarChart } from '@/components/health';

<HealthRadarChart
  data={[radarChartData]}
  title="Health Overview"
  scoringSystem="percentage"
  showScoreLegend={true}
/>
\`\`\`
        `,
      },
    },
  },
  args: {
    title: 'Health Overview Radar',
    subtitle: 'Multi-metric health visualization',
    scoringSystem: 'percentage',
    height: 400,
    width: '100%',
    showLegend: false,
    showTooltip: true,
    showScoreLegend: true,
    loading: false,
    error: '',
  },
  argTypes: {
    data: {
      control: { type: 'object' },
      description: 'Array of radar chart data with health metrics',
    },
    title: {
      control: { type: 'text' },
      description: 'Chart title',
    },
    subtitle: {
      control: { type: 'text' },
      description: 'Chart subtitle',
    },
    scoringSystem: {
      control: { type: 'select' },
      options: ['percentage', 'z-score', 'custom'],
      description: 'Scoring system for metric normalization',
    },
    height: {
      control: { type: 'number', min: 250, max: 600, step: 50 },
      description: 'Chart height in pixels',
    },
    width: {
      control: { type: 'text' },
      description: 'Chart width (CSS value)',
    },
    showLegend: {
      control: { type: 'boolean' },
      description: 'Show/hide chart legend',
    },
    showTooltip: {
      control: { type: 'boolean' },
      description: 'Show/hide tooltip on hover',
    },
    showScoreLegend: {
      control: { type: 'boolean' },
      description: 'Show/hide score legend with color coding',
    },
    loading: {
      control: { type: 'boolean' },
      description: 'Loading state',
    },
    error: {
      control: { type: 'text' },
      description: 'Error message to display',
    },
    config: {
      control: { type: 'object' },
      description: 'Chart configuration options',
    },
    ariaLabel: {
      control: { type: 'text' },
      description: 'Accessibility label for screen readers',
    },
    ariaDescription: {
      control: { type: 'text' },
      description: 'Accessibility description for screen readers',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof HealthRadarChart>;

// Default story - Mixed health profile with percentage scoring
export const Default: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Health Overview Radar',
    subtitle: 'Multi-metric health visualization',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default radar chart showing a mixed health profile with percentage-based scoring system.',
      },
    },
  },
};

// Scoring system variations
export const PercentageScoring: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Percentage Scoring System',
    subtitle: 'Metrics normalized to 0-100% scale',
    scoringSystem: 'percentage',
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart using percentage-based scoring where each metric is normalized to a 0-100% scale based on target ranges.',
      },
    },
  },
};

export const ZScoreNormalization: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Z-Score Normalization',
    subtitle: 'Statistical normalization using mean and standard deviation',
    scoringSystem: 'z-score',
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart using Z-score normalization for statistical comparison against population averages.',
      },
    },
  },
};

export const CustomScoring: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Custom Scoring Rules',
    subtitle: 'User-defined scoring logic for each metric',
    scoringSystem: 'custom',
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart with custom scoring rules that can be tailored for specific health goals or conditions.',
      },
    },
  },
};

// Health profile variations
export const ExcellentHealthProfile: Story = {
  args: {
    data: [generateExcellentHealthData()],
    title: 'Excellent Health Profile',
    subtitle: 'All metrics in optimal range (mostly green)',
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart showing an excellent health profile with all metrics scoring in the optimal range.',
      },
    },
  },
};

export const PoorHealthProfile: Story = {
  args: {
    data: [generatePoorHealthData()],
    title: 'Poor Health Profile',
    subtitle: 'Multiple metrics below optimal (mostly red)',
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart showing a poor health profile with multiple metrics below optimal ranges.',
      },
    },
  },
};

export const MixedHealthProfile: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Mixed Health Profile',
    subtitle: 'Combination of good and areas for improvement',
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart showing a realistic mixed health profile with some metrics performing well and others needing improvement.',
      },
    },
  },
};

// Chart size variations
export const SmallSize: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Small Radar Chart',
    height: 300,
    config: {
      size: 'small',
      gridLevels: 4,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact radar chart suitable for dashboard widgets or mobile displays.',
      },
    },
  },
};

export const MediumSize: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Medium Radar Chart',
    height: 400,
    config: {
      size: 'medium',
      gridLevels: 5,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Standard medium-sized radar chart for general use cases.',
      },
    },
  },
};

export const LargeSize: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Large Radar Chart',
    height: 500,
    config: {
      size: 'large',
      gridLevels: 6,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Large radar chart with enhanced detail for comprehensive health analysis.',
      },
    },
  },
};

// Color scheme variations
export const DefaultColorScheme: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Default Color Scheme',
    subtitle: 'Standard green-to-red health scoring colors',
    config: {
      colorScheme: defaultColorScheme,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart with the default color scheme using intuitive green-to-red health scoring.',
      },
    },
  },
};

export const BlueColorScheme: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Blue Color Scheme',
    subtitle: 'Professional blue-toned color palette',
    config: {
      colorScheme: blueColorScheme,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart with a professional blue color scheme suitable for corporate health dashboards.',
      },
    },
  },
};

export const PurpleColorScheme: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Purple Color Scheme',
    subtitle: 'Modern purple-violet color palette',
    config: {
      colorScheme: purpleColorScheme,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart with a modern purple color scheme for contemporary health applications.',
      },
    },
  },
};

// Metric count variations
export const ThreeMetrics: Story = {
  args: {
    data: [generateMinimalHealthData()],
    title: 'Three Metrics Radar',
    subtitle: 'Minimal viable radar chart',
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart with the minimum number of metrics (3) for meaningful visualization.',
      },
    },
  },
};

export const FiveMetrics: Story = {
  args: {
    data: [generateFiveMetricsData()],
    title: 'Five Metrics Radar',
    subtitle: 'Balanced metric selection',
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart with five key health metrics providing a balanced overview.',
      },
    },
  },
};

export const SevenMetrics: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Seven Metrics Radar',
    subtitle: 'Comprehensive health assessment',
  },
  parameters: {
    docs: {
      description: {
        story: 'Comprehensive radar chart with seven health metrics for detailed health analysis.',
      },
    },
  },
};

// State variations
export const EmptyData: Story = {
  args: {
    data: [],
    title: 'No Health Data',
    subtitle: 'Empty state demonstration',
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart with empty data array showing appropriate empty state message.',
      },
    },
  },
};

export const InsufficientData: Story = {
  args: {
    data: [{
      metrics: [
        {
          category: 'Weight (BMI)',
          value: 23.5,
          maxValue: 25,
          unit: 'BMI',
          score: 85,
          color: '#10b981',
          icon: '⚖️',
        },
        {
          category: 'Daily Steps',
          value: 9200,
          maxValue: 10000,
          unit: 'steps',
          score: 92,
          color: '#10b981',
          icon: '👟',
        },
      ],
      timestamp: new Date().toISOString(),
      label: 'Insufficient Data',
    }],
    title: 'Insufficient Data',
    subtitle: 'Need at least 3 metrics for radar visualization',
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart with insufficient data (less than 3 metrics) showing appropriate message.',
      },
    },
  },
};

export const LoadingState: Story = {
  args: {
    data: [],
    title: 'Loading Health Data',
    subtitle: 'Please wait while we fetch your health metrics',
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart in loading state showing spinner while data is being fetched.',
      },
    },
  },
};

export const ErrorState: Story = {
  args: {
    data: [],
    title: 'Health Data Error',
    subtitle: 'Unable to load health metrics',
    error: 'Failed to load health data. Please check your connection and try again.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart showing error state when data loading fails.',
      },
    },
  },
};

// Accessibility focused story
export const AccessibilityFocused: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Accessible Health Radar',
    subtitle: 'Enhanced accessibility features',
    ariaLabel: 'Health metrics radar chart showing 7 health categories',
    ariaDescription: 'Interactive radar chart displaying normalized health scores for weight, steps, sleep, heart rate, blood pressure, water intake, and exercise',
    showTooltip: true,
    showScoreLegend: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart with enhanced accessibility features including proper ARIA labels, keyboard navigation, and screen reader support.',
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'focus-order-semantics',
            enabled: true,
          },
          {
            id: 'aria-valid-attr-value',
            enabled: true,
          },
        ],
      },
    },
  },
};

// Responsive design demonstration
export const ResponsiveDemo: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Responsive Radar Chart',
    subtitle: 'Adapts to different screen sizes',
    width: '100%',
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart demonstrating responsive behavior across different screen sizes and orientations.',
      },
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1200px',
            height: '800px',
          },
        },
      },
    },
  },
};

// Advanced configuration demo
export const AdvancedConfiguration: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Advanced Configuration',
    subtitle: 'Custom grid levels and styling',
    config: {
      gridLevels: 8,
      angleAxisConfig: {
        tick: true,
        tickLine: true,
        axisLine: true,
        fontSize: 11,
      },
      radiusAxisConfig: {
        tick: true,
        tickLine: true,
        axisLine: false,
        domain: [0, 100],
      },
      colorScheme: {
        excellent: '#059669',
        good: '#34d399',
        fair: '#fbbf24',
        poor: '#f87171',
      },
      size: 'large',
    },
    height: 450,
    showLegend: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart with advanced configuration options including custom grid levels, axis styling, and color schemes.',
      },
    },
  },
};

// Interactive controls demo
export const InteractiveDemo: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Interactive Radar Chart',
    subtitle: 'Use controls to experiment with settings',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use the controls panel to experiment with different radar chart configurations and see real-time changes. Try adjusting the scoring system, colors, size, and other options.',
      },
    },
  },
};

// Comparison demo with multiple datasets
export const ComparisonDemo: Story = {
  args: {
    data: [
      {
        ...generateExcellentHealthData(),
        label: 'Target Goals',
      },
      {
        ...generateMixedHealthData(),
        label: 'Current Status',
      },
    ],
    title: 'Health Progress Comparison',
    subtitle: 'Current status vs target goals',
    showLegend: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart comparing multiple datasets, such as current health status versus target goals.',
      },
    },
  },
};

// Custom tooltip formatting demo
export const CustomTooltipDemo: Story = {
  args: {
    data: [generateMixedHealthData()],
    title: 'Custom Tooltip Formatting',
    subtitle: 'Enhanced tooltip with additional information',
    formatTooltip: (metric) => {
      const category = metric.score >= 80
        ? 'Excellent'
        : metric.score >= 60
          ? 'Good'
          : metric.score >= 40 ? 'Fair' : 'Poor';
      return `Category: ${category} | Target: ${metric.maxValue} ${metric.unit}`;
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Radar chart with custom tooltip formatting to display additional context and health category information.',
      },
    },
  },
};
