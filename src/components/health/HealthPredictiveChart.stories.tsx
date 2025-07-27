import type { Meta, StoryObj } from '@storybook/react';
import type { HealthDataPoint } from './HealthChart';
import { HealthPredictiveChart } from './HealthPredictiveChart';

// Mock data generators for realistic health trends
const generateWeightLossTrend = (days: number = 30): HealthDataPoint[] => {
  const startWeight = 85;
  const targetWeight = 75;
  const data: HealthDataPoint[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));

    // Simulate gradual weight loss with some fluctuation
    const progress = i / (days - 1);
    const baseWeight = startWeight - (startWeight - targetWeight) * progress;
    const fluctuation = (Math.random() - 0.5) * 2; // ±1kg random fluctuation
    const weight = Math.max(targetWeight - 2, baseWeight + fluctuation);

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(weight * 10) / 10,
      unit: 'kg',
      isPrediction: false,
    });
  }

  return data;
};

const generateStepsIncrease = (days: number = 30): HealthDataPoint[] => {
  const startSteps = 5000;
  const targetSteps = 10000;
  const data: HealthDataPoint[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));

    // Simulate gradual increase in daily steps
    const progress = i / (days - 1);
    const baseSteps = startSteps + (targetSteps - startSteps) * progress;
    const fluctuation = (Math.random() - 0.5) * 2000; // ±1000 steps variation
    const steps = Math.max(3000, Math.round(baseSteps + fluctuation));

    data.push({
      date: date.toISOString().split('T')[0],
      value: steps,
      unit: 'steps',
      isPrediction: false,
    });
  }

  return data;
};

const generateBloodPressureStable = (days: number = 30): HealthDataPoint[] => {
  const targetSystolic = 120;
  const data: HealthDataPoint[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));

    // Simulate stable blood pressure with minor variations
    const fluctuation = (Math.random() - 0.5) * 10; // ±5 mmHg variation
    const systolic = Math.max(100, Math.min(140, targetSystolic + fluctuation));

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(systolic),
      unit: 'mmHg',
      isPrediction: false,
    });
  }

  return data;
};

const generateHeartRateData = (days: number = 30): HealthDataPoint[] => {
  const baseHeartRate = 70;
  const data: HealthDataPoint[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));

    // Simulate heart rate with daily variations
    const timeOfDay = Math.sin((i % 7) * Math.PI / 3.5); // Weekly pattern
    const variation = (Math.random() - 0.5) * 10; // ±5 bpm variation
    const heartRate = Math.max(50, Math.round(baseHeartRate + timeOfDay * 5 + variation));

    data.push({
      date: date.toISOString().split('T')[0],
      value: heartRate,
      unit: 'bpm',
      isPrediction: false,
    });
  }

  return data;
};

const meta: Meta<typeof HealthPredictiveChart> = {
  title: 'Health/HealthPredictiveChart',
  component: HealthPredictiveChart,
  parameters: {
    docs: {
      description: {
        component: `
Interactive health predictive analytics chart component using Recharts. Supports linear regression and moving average prediction algorithms with confidence intervals.

## Features
- **Prediction Algorithms**: Linear regression and moving average
- **Confidence Intervals**: 95% confidence bounds for predictions
- **Interactive Controls**: Algorithm switching and confidence interval toggle
- **Accuracy Metrics**: Real-time prediction accuracy display
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Full keyboard navigation and screen reader support

## Algorithms
- **Linear Regression**: Uses least squares method to fit a line through historical data points and extrapolate future values
- **Moving Average**: Uses the average of recent data points to predict future values with trend continuation

## Use Cases
- Weight loss/gain tracking and prediction
- Fitness goal progression forecasting
- Health metric trend analysis
- Medical parameter monitoring
        `,
      },
    },
  },
  args: {
    algorithm: 'linear-regression',
    predictionHorizon: 7,
    showConfidenceInterval: true,
    height: 400,
    width: '100%',
    color: '#3b82f6',
    predictionColor: '#f59e0b',
    confidenceColor: '#f59e0b',
    showGrid: true,
    showLegend: true,
    loading: false,
    error: '',
    unit: '',
  },
  argTypes: {
    data: {
      control: { type: 'object' },
      description: 'Array of health data points with date, value, and optional metadata',
    },
    algorithm: {
      control: { type: 'select' },
      options: ['linear-regression', 'moving-average'],
      description: 'Prediction algorithm to use for forecasting',
    },
    predictionHorizon: {
      control: { type: 'number', min: 1, max: 30, step: 1 },
      description: 'Number of days to predict into the future',
    },
    showConfidenceInterval: {
      control: { type: 'boolean' },
      description: 'Show/hide confidence interval bands around predictions',
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
    color: {
      control: { type: 'color' },
      description: 'Color for historical data line',
    },
    predictionColor: {
      control: { type: 'color' },
      description: 'Color for prediction line',
    },
    confidenceColor: {
      control: { type: 'color' },
      description: 'Color for confidence interval area',
    },
    showGrid: {
      control: { type: 'boolean' },
      description: 'Show/hide chart grid lines',
    },
    showLegend: {
      control: { type: 'boolean' },
      description: 'Show/hide chart legend',
    },
    goalValue: {
      control: { type: 'number' },
      description: 'Target goal value to display as reference line',
    },
    loading: {
      control: { type: 'boolean' },
      description: 'Loading state display',
    },
    error: {
      control: { type: 'text' },
      description: 'Error message to display',
    },
    unit: {
      control: { type: 'text' },
      description: 'Unit of measurement for the data',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof HealthPredictiveChart>;

// Generate fresh data for each story render
const weightData = generateWeightLossTrend(21);
const stepsData = generateStepsIncrease(21);
const bloodPressureData = generateBloodPressureStable(21);
const heartRateData = generateHeartRateData(21);

// Default story - Weight loss prediction with linear regression
export const Default: Story = {
  args: {
    data: weightData,
    title: 'Weight Loss Prediction',
    unit: 'kg',
    goalValue: 75,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default weight loss prediction using linear regression algorithm with 7-day forecast and confidence intervals.',
      },
    },
  },
};

// Algorithm variations
export const LinearRegressionPrediction: Story = {
  args: {
    data: weightData,
    title: 'Linear Regression - Weight Trend',
    algorithm: 'linear-regression',
    unit: 'kg',
    goalValue: 75,
    predictionHorizon: 14,
  },
  parameters: {
    docs: {
      description: {
        story: 'Linear regression prediction showing mathematical trend line fitted through historical data with 14-day forecast.',
      },
    },
  },
};

export const MovingAveragePrediction: Story = {
  args: {
    data: stepsData,
    title: 'Moving Average - Daily Steps',
    algorithm: 'moving-average',
    unit: 'steps',
    goalValue: 10000,
    predictionHorizon: 7,
  },
  parameters: {
    docs: {
      description: {
        story: 'Moving average prediction using recent data points to forecast future step counts with trend continuation.',
      },
    },
  },
};

// Confidence interval variations
export const WithConfidenceIntervals: Story = {
  args: {
    data: bloodPressureData,
    title: 'Blood Pressure with Confidence Bands',
    algorithm: 'linear-regression',
    showConfidenceInterval: true,
    unit: 'mmHg',
    goalValue: 120,
    confidenceColor: '#ef4444',
  },
  parameters: {
    docs: {
      description: {
        story: 'Prediction with confidence interval bands showing the uncertainty range around predicted values.',
      },
    },
  },
};

export const WithoutConfidenceIntervals: Story = {
  args: {
    data: heartRateData,
    title: 'Heart Rate Prediction (No Confidence)',
    algorithm: 'moving-average',
    showConfidenceInterval: false,
    unit: 'bpm',
    goalValue: 70,
  },
  parameters: {
    docs: {
      description: {
        story: 'Clean prediction view without confidence intervals for simpler visualization.',
      },
    },
  },
};

// Prediction horizon variations
export const ShortTermPrediction: Story = {
  args: {
    data: weightData,
    title: 'Short-term Forecast (3 days)',
    predictionHorizon: 3,
    unit: 'kg',
  },
  parameters: {
    docs: {
      description: {
        story: '3-day short-term prediction for immediate planning and goal tracking.',
      },
    },
  },
};

export const MediumTermPrediction: Story = {
  args: {
    data: stepsData,
    title: 'Medium-term Forecast (7 days)',
    predictionHorizon: 7,
    unit: 'steps',
    goalValue: 10000,
  },
  parameters: {
    docs: {
      description: {
        story: '7-day medium-term prediction for weekly planning and habit formation.',
      },
    },
  },
};

export const LongTermPrediction: Story = {
  args: {
    data: weightData,
    title: 'Long-term Forecast (14 days)',
    predictionHorizon: 14,
    unit: 'kg',
    goalValue: 75,
  },
  parameters: {
    docs: {
      description: {
        story: '14-day long-term prediction for extended goal planning and trend analysis.',
      },
    },
  },
};

// Algorithm comparison view
export const AlgorithmComparison: Story = {
  render: args => (
    <div className="space-y-6">
      <HealthPredictiveChart
        {...args}
        title="Linear Regression Prediction"
        algorithm="linear-regression"
      />
      <HealthPredictiveChart
        {...args}
        title="Moving Average Prediction"
        algorithm="moving-average"
      />
    </div>
  ),
  args: {
    data: weightData,
    unit: 'kg',
    goalValue: 75,
    predictionHorizon: 7,
  },
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of both prediction algorithms using the same dataset.',
      },
    },
  },
};

// Data scenario variations
export const EmptyData: Story = {
  args: {
    data: [],
    title: 'No Data Available',
    unit: 'kg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with empty data array showing appropriate empty state message.',
      },
    },
  },
};

export const SingleDataPoint: Story = {
  args: {
    data: [{ date: '2024-01-01', value: 75.2, unit: 'kg', isPrediction: false }],
    title: 'Insufficient Data for Prediction',
    unit: 'kg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with only one data point showing insufficient data message for predictions.',
      },
    },
  },
};

export const MinimalDataForPrediction: Story = {
  args: {
    data: [
      { date: '2024-01-01', value: 85.0, unit: 'kg', isPrediction: false },
      { date: '2024-01-02', value: 84.8, unit: 'kg', isPrediction: false },
      { date: '2024-01-03', value: 84.5, unit: 'kg', isPrediction: false },
    ],
    title: 'Minimal Data (3 points)',
    unit: 'kg',
    predictionHorizon: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with minimum required data points (3) for generating predictions.',
      },
    },
  },
};

// State variations
export const LoadingState: Story = {
  args: {
    data: [],
    title: 'Loading Prediction Data',
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart in loading state showing spinner while data is being fetched.',
      },
    },
  },
};

export const ErrorState: Story = {
  args: {
    data: [],
    title: 'Prediction Error',
    error: 'Failed to load health data for prediction analysis. Please try again.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart showing error state when data loading or prediction calculation fails.',
      },
    },
  },
};

// Accessibility focused story
export const AccessibilityFocused: Story = {
  args: {
    data: weightData,
    title: 'Accessible Weight Prediction Chart',
    unit: 'kg',
    goalValue: 75,
    showGrid: true,
    showLegend: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with enhanced accessibility features including proper ARIA labels, keyboard navigation, and high contrast colors.',
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

// Customization examples
export const CustomStyling: Story = {
  args: {
    data: heartRateData,
    title: 'Custom Styled Prediction Chart',
    unit: 'bpm',
    color: '#9333ea',
    predictionColor: '#ec4899',
    confidenceColor: '#ec4899',
    height: 350,
    showGrid: false,
    goalValue: 70,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with custom styling including purple color scheme and disabled grid.',
      },
    },
  },
};

export const CompactSize: Story = {
  args: {
    data: weightData.slice(-10), // Last 10 days only
    title: 'Compact Prediction Widget',
    unit: 'kg',
    height: 250,
    showGrid: false,
    showLegend: false,
    predictionHorizon: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact version suitable for dashboard widgets with reduced height and simplified UI.',
      },
    },
  },
};

export const LargeDataset: Story = {
  args: {
    data: generateWeightLossTrend(60), // 60 days of data
    title: 'Large Dataset Prediction (60 days)',
    unit: 'kg',
    goalValue: 75,
    height: 500,
    predictionHorizon: 14,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chart with large dataset (60 days) showing performance with extensive historical data.',
      },
    },
  },
};

// Responsive design demo
export const ResponsiveDemo: Story = {
  args: {
    data: stepsData,
    title: 'Responsive Prediction Chart',
    unit: 'steps',
    goalValue: 10000,
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

// Different health metrics
export const WeightLossPrediction: Story = {
  args: {
    data: weightData,
    title: 'Weight Loss Journey Prediction',
    unit: 'kg',
    goalValue: 75,
    color: '#10b981',
    predictionColor: '#059669',
  },
  parameters: {
    docs: {
      description: {
        story: 'Weight loss prediction with goal tracking and green color scheme.',
      },
    },
  },
};

export const FitnessGoalPrediction: Story = {
  args: {
    data: stepsData,
    title: 'Daily Steps Goal Achievement',
    unit: 'steps',
    goalValue: 10000,
    color: '#f59e0b',
    predictionColor: '#d97706',
  },
  parameters: {
    docs: {
      description: {
        story: 'Fitness goal prediction showing daily steps progression toward 10,000 step target.',
      },
    },
  },
};

export const HealthMonitoring: Story = {
  args: {
    data: bloodPressureData,
    title: 'Blood Pressure Monitoring',
    unit: 'mmHg',
    goalValue: 120,
    color: '#ef4444',
    predictionColor: '#dc2626',
    algorithm: 'moving-average',
  },
  parameters: {
    docs: {
      description: {
        story: 'Health monitoring prediction for blood pressure with target range visualization.',
      },
    },
  },
};

// Interactive controls demo
export const InteractiveDemo: Story = {
  args: {
    data: weightData,
    title: 'Interactive Prediction Demo',
    unit: 'kg',
    goalValue: 75,
  },
  parameters: {
    docs: {
      description: {
        story: 'Use the controls panel to experiment with different algorithms, prediction horizons, and styling options to see real-time changes.',
      },
    },
  },
};

// Performance testing
export const PerformanceTest: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (99 - i));
      return {
        date: date.toISOString().split('T')[0],
        value: 75 + Math.sin(i / 10) * 5 + Math.random() * 2,
        unit: 'kg',
        isPrediction: false,
      };
    }),
    title: 'Performance Test (100 data points)',
    unit: 'kg',
    predictionHorizon: 30,
    height: 500,
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance test with 100 historical data points and 30-day prediction horizon.',
      },
    },
  },
};
