import type { Meta, StoryObj } from '@storybook/react';
import { HealthChart } from './HealthChart';

import { generateBloodPressureData, generateStepsData, generateWeightData } from './HealthChart.fixtures';

const meta: Meta<typeof HealthChart> = {
  title: 'Health/HealthChart',
  component: HealthChart,
  parameters: {
    docs: {
      description: {
        component: 'Interactive health analytics chart component using Recharts. Supports line, bar, and area chart types with responsive design and accessibility features.',
      },
    },
  },
  args: {
    chartType: 'line',
    height: 400,
    showGrid: true,
    showTooltip: true,
    showLegend: false,
    isLoading: false,
    error: '',
    xAxisLabel: 'Date',
    yAxisLabel: 'Value',
  },
  argTypes: {
    chartType: {
      control: { type: 'select' },
      options: ['line', 'bar', 'area'],
      description: 'Type of chart to display',
    },
    data: {
      control: { type: 'object' },
      description: 'Chart data array',
    },
    title: {
      control: { type: 'text' },
      description: 'Chart title',
    },
    xAxisLabel: {
      control: { type: 'text' },
      description: 'X-axis label',
    },
    yAxisLabel: {
      control: { type: 'text' },
      description: 'Y-axis label',
    },
    color: {
      control: { type: 'color' },
      description: 'Primary chart color',
    },
    height: {
      control: { type: 'number', min: 200, max: 800, step: 50 },
      description: 'Chart height in pixels',
    },
    showGrid: {
      control: { type: 'boolean' },
      description: 'Show/hide grid lines',
    },
    showTooltip: {
      control: { type: 'boolean' },
      description: 'Show/hide tooltip on hover',
    },
    showLegend: {
      control: { type: 'boolean' },
      description: 'Show/hide legend',
    },
    isLoading: {
      control: { type: 'boolean' },
      description: 'Loading state',
    },
    error: {
      control: { type: 'text' },
      description: 'Error message to display',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof HealthChart>;

// Generate fresh data for each story render
const weightData = generateWeightData();
const stepsData = generateStepsData();
const bloodPressureData = generateBloodPressureData();

// Default story - Weight trend line chart
export const Default: Story = {
  args: {
    data: weightData,
    title: 'Weight Trend',
    yAxisLabel: 'Weight (kg)',
    color: '#8884d8',
  },
};

// Line chart variations
export const WeightTrendLine: Story = {
  args: {
    ...Default.args,
    title: 'Weight Loss Progress',
    color: '#82ca9d',
  },
  parameters: {
    docs: {
      description: {
        story: 'Line chart showing weight loss progress over time with smooth curves.',
      },
    },
  },
};

export const StepsBarChart: Story = {
  args: {
    chartType: 'bar',
    data: stepsData,
    title: 'Daily Steps',
    yAxisLabel: 'Steps',
    color: '#ffc658',
  },
  parameters: {
    docs: {
      description: {
        story: 'Bar chart displaying daily step counts with clear visual comparison.',
      },
    },
  },
};

export const WeightAreaChart: Story = {
  args: {
    chartType: 'area',
    data: weightData,
    title: 'Weight Trend Area',
    yAxisLabel: 'Weight (kg)',
    color: '#ff7c7c',
  },
  parameters: {
    docs: {
      description: {
        story: 'Area chart showing weight trend with filled area for better visual impact.',
      },
    },
  },
};

// Data scenario variations
export const EmptyData: Story = {
  args: {
    ...Default.args,
    data: [],
    title: 'No Data Available',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with empty data array showing appropriate empty state.',
      },
    },
  },
};

export const SingleDataPoint: Story = {
  args: {
    ...Default.args,
    data: [{ date: '2024-01-01', value: 75.2, unit: 'kg' }],
    title: 'Single Measurement',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with only one data point showing how the component handles minimal data.',
      },
    },
  },
};

export const LargeDataset: Story = {
  args: {
    ...Default.args,
    data: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
      value: 75 + Math.sin(i / 5) * 2 + Math.random() * 0.5,
      unit: 'kg',
    })),
    title: 'Monthly Weight Trend',
    height: 500,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with 30 days of data showing performance with larger datasets.',
      },
    },
  },
};

// Multi-series data (for blood pressure)
export const MultiSeriesChart: Story = {
  args: {
    chartType: 'line',
    data: bloodPressureData,
    title: 'Blood Pressure Readings',
    xAxisLabel: 'Date',
    yAxisLabel: 'Pressure (mmHg)',
    color: '#8884d8',
    height: 400,
    showGrid: true,
    showTooltip: true,
    showLegend: true,
    isLoading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-series line chart showing both systolic and diastolic blood pressure.',
      },
    },
  },
};

// Loading state
export const LoadingState: Story = {
  args: {
    ...Default.args,
    isLoading: true,
    data: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart in loading state showing skeleton or spinner while data is being fetched.',
      },
    },
  },
};

// Error state
export const ErrorState: Story = {
  args: {
    ...Default.args,
    data: [],
    error: 'Failed to load health data. Please try again.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart showing error state when data loading fails.',
      },
    },
  },
};

// Accessibility focused story
export const AccessibilityFocused: Story = {
  args: {
    ...Default.args,
    title: 'Weight Trend (Accessible)',
    showGrid: true,
    showTooltip: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with enhanced accessibility features including proper ARIA labels and keyboard navigation.',
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
        ],
      },
    },
  },
};

// Customization examples
export const CustomStyling: Story = {
  args: {
    ...Default.args,
    title: 'Custom Styled Chart',
    color: '#9333ea',
    height: 350,
    showGrid: false,
    showTooltip: true,
    showLegend: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with custom styling options including colors and grid visibility.',
      },
    },
  },
};

export const CompactSize: Story = {
  args: {
    ...Default.args,
    title: 'Compact Chart',
    height: 250,
    showGrid: false,
    showLegend: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact version of the chart suitable for dashboard widgets.',
      },
    },
  },
};

export const ResponsiveDemo: Story = {
  args: {
    ...Default.args,
    title: 'Responsive Chart',
    height: 400,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart demonstrating responsive behavior across different screen sizes.',
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
    ...Default.args,
    title: 'Interactive Chart Demo',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use the controls panel to experiment with different chart configurations and see real-time changes.',
      },
    },
  },
};
