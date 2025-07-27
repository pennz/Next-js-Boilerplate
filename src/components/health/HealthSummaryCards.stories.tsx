import type { Meta, StoryObj } from '@storybook/react';
import type { HealthSummaryMetric } from './types';
import { HealthSummaryCards } from './HealthSummaryCards';

const meta: Meta<typeof HealthSummaryCards> = {
  title: 'Health/HealthSummaryCards',
  component: HealthSummaryCards,
  parameters: {
    docs: {
      description: {
        component: 'Health summary cards component displaying key health metrics with trend indicators, goal progress, and interactive features. Supports responsive grid layout and accessibility features.',
      },
    },
  },
  args: {
    className: '',
  },
  argTypes: {
    metrics: {
      control: { type: 'object' },
      description: 'Array of health metrics to display',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes for styling',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof HealthSummaryCards>;

// Mock data generators
const generateWeightMetric = (overrides?: Partial<HealthSummaryMetric>): HealthSummaryMetric => ({
  id: 'weight',
  label: 'Weight',
  value: 72.5,
  unit: 'kg',
  previousValue: 75.2,
  goalTarget: 70,
  goalCurrent: 72.5,
  icon: '⚖️',
  ...overrides,
});

const generateStepsMetric = (overrides?: Partial<HealthSummaryMetric>): HealthSummaryMetric => ({
  id: 'steps',
  label: 'Daily Steps',
  value: 12450,
  unit: 'steps',
  previousValue: 9800,
  goalTarget: 10000,
  goalCurrent: 12450,
  icon: '👟',
  ...overrides,
});

const generateSleepMetric = (overrides?: Partial<HealthSummaryMetric>): HealthSummaryMetric => ({
  id: 'sleep',
  label: 'Sleep Hours',
  value: 7.5,
  unit: 'hours',
  previousValue: 7.4,
  goalTarget: 8,
  goalCurrent: 7.5,
  icon: '😴',
  ...overrides,
});

const generateHeartRateMetric = (overrides?: Partial<HealthSummaryMetric>): HealthSummaryMetric => ({
  id: 'heart-rate',
  label: 'Resting Heart Rate',
  value: 65,
  unit: 'bpm',
  previousValue: 68,
  goalTarget: 60,
  goalCurrent: 65,
  icon: '❤️',
  ...overrides,
});

const generateBloodPressureMetric = (overrides?: Partial<HealthSummaryMetric>): HealthSummaryMetric => ({
  id: 'blood-pressure',
  label: 'Blood Pressure',
  value: 120,
  unit: 'mmHg',
  previousValue: 125,
  icon: '🩺',
  ...overrides,
});

const generateWaterIntakeMetric = (overrides?: Partial<HealthSummaryMetric>): HealthSummaryMetric => ({
  id: 'water',
  label: 'Water Intake',
  value: 2.1,
  unit: 'liters',
  previousValue: 1.8,
  goalTarget: 2.5,
  goalCurrent: 2.1,
  icon: '💧',
  ...overrides,
});

// Default story with multiple metrics
export const Default: Story = {
  args: {
    metrics: [
      generateWeightMetric(),
      generateStepsMetric(),
      generateSleepMetric(),
      generateHeartRateMetric(),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Default view showing multiple health metrics with trends and goal progress.',
      },
    },
  },
};

// Single metric display
export const SingleMetric: Story = {
  args: {
    metrics: [generateWeightMetric()],
  },
  parameters: {
    docs: {
      description: {
        story: 'Single metric card display showing weight with downward trend and goal progress.',
      },
    },
  },
};

// Metrics with different trend directions
export const TrendVariations: Story = {
  args: {
    metrics: [
      generateWeightMetric({
        value: 72.5,
        previousValue: 75.2,
        label: 'Weight (Decreasing)',
      }),
      generateStepsMetric({
        value: 12450,
        previousValue: 9800,
        label: 'Steps (Increasing)',
      }),
      generateSleepMetric({
        value: 7.5,
        previousValue: 7.5,
        label: 'Sleep (Neutral)',
      }),
      generateHeartRateMetric({
        value: 65,
        previousValue: 68,
        label: 'Heart Rate (Improving)',
      }),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Metrics showing different trend directions: decreasing weight, increasing steps, neutral sleep, and improving heart rate.',
      },
    },
  },
};

// Metrics with goals
export const MetricsWithGoals: Story = {
  args: {
    metrics: [
      generateStepsMetric({
        goalCurrent: 12450,
        goalTarget: 10000,
        label: 'Steps (Goal Exceeded)',
      }),
      generateWaterIntakeMetric({
        goalCurrent: 2.1,
        goalTarget: 2.5,
        label: 'Water (In Progress)',
      }),
      generateSleepMetric({
        goalCurrent: 6.5,
        goalTarget: 8,
        label: 'Sleep (Behind Goal)',
      }),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Metrics with goal progress bars showing different completion states.',
      },
    },
  },
};

// Metrics without trends (no previous values)
export const NoTrends: Story = {
  args: {
    metrics: [
      generateWeightMetric({ previousValue: undefined }),
      generateStepsMetric({ previousValue: undefined }),
      generateSleepMetric({ previousValue: undefined }),
      generateBloodPressureMetric({ previousValue: undefined }),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Metrics without previous values, showing no trend indicators.',
      },
    },
  },
};

// Metrics without goals
export const NoGoals: Story = {
  args: {
    metrics: [
      generateWeightMetric({
        goalTarget: undefined,
        goalCurrent: undefined,
      }),
      generateStepsMetric({
        goalTarget: undefined,
        goalCurrent: undefined,
      }),
      generateSleepMetric({
        goalTarget: undefined,
        goalCurrent: undefined,
      }),
      generateBloodPressureMetric({
        goalTarget: undefined,
        goalCurrent: undefined,
      }),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Metrics without goal tracking, showing only values and trends.',
      },
    },
  },
};

// Empty state
export const EmptyState: Story = {
  args: {
    metrics: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no metrics are available.',
      },
    },
  },
};

// Large dataset with 6 metrics
export const LargeDataset: Story = {
  args: {
    metrics: [
      generateWeightMetric(),
      generateStepsMetric(),
      generateSleepMetric(),
      generateHeartRateMetric(),
      generateWaterIntakeMetric(),
      generateBloodPressureMetric(),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Large dataset with 6 different health metrics showing responsive grid layout.',
      },
    },
  },
};

// High values demonstration
export const HighValues: Story = {
  args: {
    metrics: [
      generateStepsMetric({
        value: 25000,
        previousValue: 22000,
        goalTarget: 15000,
        goalCurrent: 25000,
        label: 'Daily Steps (High)',
      }),
      generateWaterIntakeMetric({
        value: 4.2,
        previousValue: 3.8,
        goalTarget: 3.0,
        goalCurrent: 4.2,
        label: 'Water Intake (High)',
      }),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Metrics with high values to test number formatting and display.',
      },
    },
  },
};

// Goal completion scenarios
export const GoalCompletionStates: Story = {
  args: {
    metrics: [
      generateStepsMetric({
        goalCurrent: 15000,
        goalTarget: 10000,
        label: 'Steps (150% Complete)',
      }),
      generateWaterIntakeMetric({
        goalCurrent: 2.5,
        goalTarget: 2.5,
        label: 'Water (100% Complete)',
      }),
      generateSleepMetric({
        goalCurrent: 6.0,
        goalTarget: 8.0,
        label: 'Sleep (75% Complete)',
      }),
      generateHeartRateMetric({
        goalCurrent: 70,
        goalTarget: 60,
        label: 'Heart Rate (Behind Goal)',
      }),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Different goal completion states: exceeded, completed, in progress, and behind.',
      },
    },
  },
};

// Accessibility focused story
export const AccessibilityFocused: Story = {
  args: {
    metrics: [
      generateWeightMetric(),
      generateStepsMetric(),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Accessibility-focused story with proper ARIA labels and keyboard navigation support.',
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
            id: 'keyboard-navigation',
            enabled: true,
          },
        ],
      },
    },
  },
};

// Custom styling
export const CustomStyling: Story = {
  args: {
    metrics: [
      generateWeightMetric(),
      generateStepsMetric(),
    ],
    className: 'bg-gray-50 p-6 rounded-xl',
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom styling example with additional CSS classes.',
      },
    },
  },
};

// Responsive demo
export const ResponsiveDemo: Story = {
  args: {
    metrics: [
      generateWeightMetric(),
      generateStepsMetric(),
      generateSleepMetric(),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Responsive grid layout demonstration across different screen sizes.',
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

// Interactive controls demo
export const InteractiveDemo: Story = {
  args: {
    metrics: [
      generateWeightMetric(),
      generateStepsMetric(),
    ],
  },
  argTypes: {
    metrics: {
      control: {
        type: 'object',
      },
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo with controls to modify metric values, trends, and goals in real-time.',
      },
    },
  },
};

// Edge cases
export const EdgeCases: Story = {
  args: {
    metrics: [
      generateWeightMetric({
        value: 0,
        previousValue: 0,
        goalCurrent: 0,
        goalTarget: 0,
        label: 'Zero Values',
      }),
      generateStepsMetric({
        value: 1,
        previousValue: 1000000,
        label: 'Large Percentage Change',
      }),
      generateSleepMetric({
        value: 24,
        previousValue: 0.1,
        goalTarget: 8,
        goalCurrent: 24,
        label: 'Extreme Values',
      }),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Edge cases including zero values, large percentage changes, and extreme values.',
      },
    },
  },
};

// Loading state simulation
export const LoadingState: Story = {
  args: {
    metrics: [
      {
        id: 'loading-1',
        label: 'Loading...',
        value: 0,
        unit: '',
        icon: '⏳',
      },
      {
        id: 'loading-2',
        label: 'Loading...',
        value: 0,
        unit: '',
        icon: '⏳',
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Simulated loading state with placeholder metrics.',
      },
    },
  },
};

// Minimal data
export const MinimalData: Story = {
  args: {
    metrics: [
      {
        id: 'minimal',
        label: 'Basic Metric',
        value: 42,
        unit: 'units',
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal metric data with only required fields.',
      },
    },
  },
};
