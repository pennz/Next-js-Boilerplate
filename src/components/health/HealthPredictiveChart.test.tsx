import type { HealthDataPoint, PredictionAlgorithm } from './types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthPredictiveChart } from './HealthPredictiveChart';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      analytics_empty_state: 'No data available for predictions',
      chart_prediction_title: 'Prediction',
      chart_confidence_interval: 'Confidence Interval',
      chart_accuracy_label: 'Accuracy',
      algorithm_linear_regression: 'Linear Regression',
      algorithm_moving_average: 'Moving Average',
      prediction_horizon_label: 'Prediction Horizon',
      prediction_horizon_days: '{days} days',
      accuracy_percentage: '{percentage}% accurate',
      toggle_algorithm: 'Switch Algorithm',
      show_confidence_interval: 'Show Confidence Interval',
      hide_confidence_interval: 'Hide Confidence Interval',
      prediction_based_on: 'Based on {algorithm}',
      insufficient_data_prediction: 'Need at least 3 data points for predictions',
      prediction_disclaimer: 'Predictions are estimates based on historical data',
    };
    return translations[key] || key;
  }),
}));

// Mock behavior tracking hook
const mockTrackEvent = vi.fn();
vi.mock('@/hooks/useBehaviorTracking', () => ({
  useBehaviorTracking: () => ({
    trackEvent: mockTrackEvent,
    isLoading: false,
    error: null,
    flushEvents: vi.fn(),
  }),
}));

// Mock statistical utility functions
const mockLinearRegression = vi.fn();
const mockMovingAverage = vi.fn();
const mockTransformHealthDataForRegression = vi.fn();
const mockGenerateFuturePredictions = vi.fn();
const mockGenerateConfidenceInterval = vi.fn();
const mockCalculatePredictionAccuracy = vi.fn();
const mockDateToNumeric = vi.fn();

vi.mock('@/utils/statistics', () => ({
  linearRegression: mockLinearRegression,
  movingAverage: mockMovingAverage,
  transformHealthDataForRegression: mockTransformHealthDataForRegression,
  generateFuturePredictions: mockGenerateFuturePredictions,
  generateConfidenceInterval: mockGenerateConfidenceInterval,
  calculatePredictionAccuracy: mockCalculatePredictionAccuracy,
  dateToNumeric: mockDateToNumeric,
}));

// Mock Recharts components
vi.mock('recharts', () => ({
  Area: ({ children, ...props }: any) => <div data-testid="mock-area" {...props}>{children}</div>,
  ComposedChart: ({ children, ...props }: any) => <div data-testid="mock-composed-chart" {...props}>{children}</div>,
  Line: ({ children, ...props }: any) => <div data-testid="mock-line" {...props}>{children}</div>,
  LineChart: ({ children, ...props }: any) => <div data-testid="mock-line-chart" {...props}>{children}</div>,
  CartesianGrid: (props: any) => <div data-testid="mock-cartesian-grid" {...props} />,
  Legend: (props: any) => <div data-testid="mock-legend" {...props} />,
  ReferenceLine: (props: any) => <div data-testid="mock-reference-line" {...props} />,
  ResponsiveContainer: ({ children, ...props }: any) => <div data-testid="mock-responsive-container" {...props}>{children}</div>,
  Tooltip: (props: any) => <div data-testid="mock-tooltip" {...props} />,
  XAxis: (props: any) => <div data-testid="mock-x-axis" {...props} />,
  YAxis: (props: any) => <div data-testid="mock-y-axis" {...props} />,
}));

// Mock performance.now for consistent testing
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => 1000),
  },
  writable: true,
});

describe('HealthPredictiveChart', () => {
  const mockHealthData: HealthDataPoint[] = [
    {
      date: '2024-01-01T00:00:00.000Z',
      value: 70,
      unit: 'kg',
      isPrediction: false,
    },
    {
      date: '2024-01-02T00:00:00.000Z',
      value: 69.8,
      unit: 'kg',
      isPrediction: false,
    },
    {
      date: '2024-01-03T00:00:00.000Z',
      value: 69.5,
      unit: 'kg',
      isPrediction: false,
    },
    {
      date: '2024-01-04T00:00:00.000Z',
      value: 69.2,
      unit: 'kg',
      isPrediction: false,
    },
    {
      date: '2024-01-05T00:00:00.000Z',
      value: 69.0,
      unit: 'kg',
      isPrediction: false,
    },
  ];

  const mockPredictionData: HealthDataPoint[] = [
    {
      date: '2024-01-06T00:00:00.000Z',
      value: 68.8,
      unit: 'kg',
      isPrediction: true,
      algorithm: 'linear-regression' as PredictionAlgorithm,
      confidenceUpper: 69.5,
      confidenceLower: 68.1,
    },
    {
      date: '2024-01-07T00:00:00.000Z',
      value: 68.6,
      unit: 'kg',
      isPrediction: true,
      algorithm: 'linear-regression' as PredictionAlgorithm,
      confidenceUpper: 69.3,
      confidenceLower: 67.9,
    },
  ];

  const setupMockStatistics = () => {
    mockTransformHealthDataForRegression.mockReturnValue([
      { x: 1, y: 70 },
      { x: 2, y: 69.8 },
      { x: 3, y: 69.5 },
      { x: 4, y: 69.2 },
      { x: 5, y: 69.0 },
    ]);

    mockLinearRegression.mockReturnValue({
      slope: -0.2,
      intercept: 70.2,
      rSquared: 0.95,
      residualStandardDeviation: 0.1,
    });

    mockGenerateFuturePredictions.mockReturnValue([
      {
        date: '2024-01-06T00:00:00.000Z',
        value: 68.8,
        isPrediction: true,
      },
      {
        date: '2024-01-07T00:00:00.000Z',
        value: 68.6,
        isPrediction: true,
      },
    ]);

    mockGenerateConfidenceInterval.mockReturnValue({
      upper: 69.5,
      lower: 68.1,
    });

    mockMovingAverage.mockReturnValue([69.5, 69.2, 69.0]);

    mockDateToNumeric.mockImplementation((date: string) => new Date(date).getTime());
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupMockStatistics();
  });

  describe('Component Rendering', () => {
    it('renders with multiple data points', () => {
      render(<HealthPredictiveChart data={mockHealthData} />);

      expect(screen.getByTestId('mock-responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('mock-composed-chart')).toBeInTheDocument();
      expect(screen.getAllByTestId('mock-line')).toHaveLength(2); // Historical + Prediction lines
    });

    it('renders with custom title', () => {
      const title = 'Weight Prediction Chart';
      render(<HealthPredictiveChart data={mockHealthData} title={title} />);

      expect(screen.getByText(title)).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const customClass = 'custom-chart-class';
      const { container } = render(
        <HealthPredictiveChart data={mockHealthData} className={customClass} />,
      );

      expect(container.firstChild).toHaveClass(customClass);
    });

    it('renders accuracy badge when predictions are available', () => {
      render(<HealthPredictiveChart data={mockHealthData} />);

      expect(screen.getByText('95.0% accurate')).toBeInTheDocument();
    });

    it('renders algorithm toggle buttons', () => {
      render(<HealthPredictiveChart data={mockHealthData} />);

      expect(screen.getByText('Linear Regression')).toBeInTheDocument();
      expect(screen.getByText('Moving Average')).toBeInTheDocument();
    });

    it('renders confidence interval toggle button', () => {
      render(<HealthPredictiveChart data={mockHealthData} />);

      expect(screen.getByText('Confidence Interval')).toBeInTheDocument();
    });

    it('displays footer information', () => {
      render(<HealthPredictiveChart data={mockHealthData} />);

      expect(screen.getByText(/5 historical data points/)).toBeInTheDocument();
      expect(screen.getByText(/2 predictions/)).toBeInTheDocument();
      expect(screen.getByText('Predictions are estimates based on historical data')).toBeInTheDocument();
    });
  });

  describe('Empty and Error States', () => {
    it('shows empty state when no data provided', () => {
      render(<HealthPredictiveChart data={[]} />);

      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('No data available for predictions')).toBeInTheDocument();
    });

    it('shows insufficient data message for less than 3 data points', () => {
      const insufficientData = mockHealthData.slice(0, 2);
      render(<HealthPredictiveChart data={insufficientData} />);

      expect(screen.getByText('Need at least 3 data points for predictions')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(<HealthPredictiveChart data={mockHealthData} loading={true} />);

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Loading spinner
    });

    it('shows error state', () => {
      const errorMessage = 'Failed to load chart data';
      render(<HealthPredictiveChart data={mockHealthData} error={errorMessage} />);

      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('Algorithm Switching', () => {
    it('starts with linear regression as default algorithm', () => {
      render(<HealthPredictiveChart data={mockHealthData} />);

      const linearRegressionButton = screen.getByText('Linear Regression');

      expect(linearRegressionButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('switches to moving average algorithm when clicked', async () => {
      const user = userEvent.setup();
      render(<HealthPredictiveChart data={mockHealthData} />);

      const movingAverageButton = screen.getByText('Moving Average');
      await user.click(movingAverageButton);

      expect(movingAverageButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Linear Regression')).toHaveAttribute('aria-pressed', 'false');
    });

    it('calls onAlgorithmChange callback when algorithm is switched', async () => {
      const onAlgorithmChange = vi.fn();
      const user = userEvent.setup();
      render(
        <HealthPredictiveChart
          data={mockHealthData}
          onAlgorithmChange={onAlgorithmChange}
        />,
      );

      const movingAverageButton = screen.getByText('Moving Average');
      await user.click(movingAverageButton);

      expect(onAlgorithmChange).toHaveBeenCalledWith('moving-average');
    });

    it('tracks algorithm change events', async () => {
      const user = userEvent.setup();
      render(<HealthPredictiveChart data={mockHealthData} />);

      const movingAverageButton = screen.getByText('Moving Average');
      await user.click(movingAverageButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'prediction_algorithm_changed',
          entityType: 'health_chart',
          context: {
            algorithm: 'moving-average',
            dataPoints: 5,
          },
        });
      });
    });

    it('produces different predictions for different algorithms', async () => {
      const user = userEvent.setup();

      // Setup different mock returns for moving average
      mockMovingAverage.mockReturnValue([69.0, 68.8, 68.6]);

      render(<HealthPredictiveChart data={mockHealthData} />);

      // Initially linear regression
      expect(mockLinearRegression).toHaveBeenCalled();

      // Switch to moving average
      const movingAverageButton = screen.getByText('Moving Average');
      await user.click(movingAverageButton);

      expect(mockMovingAverage).toHaveBeenCalled();
    });
  });

  describe('Confidence Interval Toggle', () => {
    it('shows confidence interval by default', () => {
      render(<HealthPredictiveChart data={mockHealthData} />);

      const confidenceButton = screen.getByText('Confidence Interval');

      expect(confidenceButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('toggles confidence interval display when clicked', async () => {
      const user = userEvent.setup();
      render(<HealthPredictiveChart data={mockHealthData} />);

      const confidenceButton = screen.getByText('Confidence Interval');
      await user.click(confidenceButton);

      expect(confidenceButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('calls onConfidenceToggle callback when toggled', async () => {
      const onConfidenceToggle = vi.fn();
      const user = userEvent.setup();
      render(
        <HealthPredictiveChart
          data={mockHealthData}
          onConfidenceToggle={onConfidenceToggle}
        />,
      );

      const confidenceButton = screen.getByText('Confidence Interval');
      await user.click(confidenceButton);

      expect(onConfidenceToggle).toHaveBeenCalledWith(false);
    });

    it('tracks confidence interval toggle events', async () => {
      const user = userEvent.setup();
      render(<HealthPredictiveChart data={mockHealthData} />);

      const confidenceButton = screen.getByText('Confidence Interval');
      await user.click(confidenceButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'confidence_interval_toggled',
          entityType: 'health_chart',
          context: {
            show: false,
            algorithm: 'linear-regression',
          },
        });
      });
    });

    it('respects initial showConfidenceInterval prop', () => {
      render(<HealthPredictiveChart data={mockHealthData} showConfidenceInterval={false} />);

      const confidenceButton = screen.getByText('Confidence Interval');

      expect(confidenceButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Chart Configuration', () => {
    it('renders goal reference line when goalValue is provided', () => {
      render(<HealthPredictiveChart data={mockHealthData} goalValue={68} />);

      expect(screen.getByTestId('mock-reference-line')).toBeInTheDocument();
    });

    it('renders grid when showGrid is true', () => {
      render(<HealthPredictiveChart data={mockHealthData} showGrid={true} />);

      expect(screen.getByTestId('mock-cartesian-grid')).toBeInTheDocument();
    });

    it('does not render grid when showGrid is false', () => {
      render(<HealthPredictiveChart data={mockHealthData} showGrid={false} />);

      expect(screen.queryByTestId('mock-cartesian-grid')).not.toBeInTheDocument();
    });

    it('renders legend when showLegend is true', () => {
      render(<HealthPredictiveChart data={mockHealthData} showLegend={true} />);

      expect(screen.getByTestId('mock-legend')).toBeInTheDocument();
    });

    it('does not render legend when showLegend is false', () => {
      render(<HealthPredictiveChart data={mockHealthData} showLegend={false} />);

      expect(screen.queryByTestId('mock-legend')).not.toBeInTheDocument();
    });

    it('applies custom colors', () => {
      const customColor = '#ff0000';
      const customPredictionColor = '#00ff00';
      render(
        <HealthPredictiveChart
          data={mockHealthData}
          color={customColor}
          predictionColor={customPredictionColor}
        />,
      );

      // Chart should render with custom colors (mocked components receive props)
      expect(screen.getByTestId('mock-composed-chart')).toBeInTheDocument();
    });

    it('applies custom dimensions', () => {
      render(
        <HealthPredictiveChart
          data={mockHealthData}
          height={500}
          width="80%"
        />,
      );

      const chartContainer = screen.getByTestId('mock-responsive-container');

      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('has proper ARIA labels for algorithm buttons', () => {
      render(<HealthPredictiveChart data={mockHealthData} />);

      const linearRegressionButton = screen.getByText('Linear Regression');
      const movingAverageButton = screen.getByText('Moving Average');

      expect(linearRegressionButton).toHaveAttribute('aria-pressed');
      expect(movingAverageButton).toHaveAttribute('aria-pressed');
    });

    it('has proper ARIA labels for confidence interval button', () => {
      render(<HealthPredictiveChart data={mockHealthData} />);

      const confidenceButton = screen.getByText('Confidence Interval');

      expect(confidenceButton).toHaveAttribute('aria-pressed');
    });

    it('supports keyboard navigation for algorithm buttons', async () => {
      const user = userEvent.setup();
      render(<HealthPredictiveChart data={mockHealthData} />);

      const linearRegressionButton = screen.getByText('Linear Regression');

      // Focus the button
      await user.tab();

      expect(linearRegressionButton).toHaveFocus();

      // Press Enter
      await user.keyboard('{Enter}');

      expect(linearRegressionButton).toHaveAttribute('aria-pressed', 'true');

      // Tab to next button
      await user.tab();
      const movingAverageButton = screen.getByText('Moving Average');

      expect(movingAverageButton).toHaveFocus();

      // Press Space
      await user.keyboard(' ');

      expect(movingAverageButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('supports keyboard navigation for confidence interval button', async () => {
      const user = userEvent.setup();
      render(<HealthPredictiveChart data={mockHealthData} />);

      // Tab to confidence interval button (after algorithm buttons)
      await user.tab(); // Linear regression
      await user.tab(); // Moving average
      await user.tab(); // Confidence interval

      const confidenceButton = screen.getByText('Confidence Interval');

      expect(confidenceButton).toHaveFocus();

      // Press Enter
      await user.keyboard('{Enter}');

      expect(confidenceButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Data Processing', () => {
    it('filters historical data correctly', () => {
      const mixedData = [
        ...mockHealthData,
        ...mockPredictionData,
      ];

      render(<HealthPredictiveChart data={mixedData} />);

      // Should only use historical data for predictions
      expect(mockTransformHealthDataForRegression).toHaveBeenCalledWith(
        expect.arrayContaining(mockHealthData),
      );
    });

    it('handles prediction computation errors gracefully', () => {
      mockLinearRegression.mockImplementation(() => {
        throw new Error('Computation error');
      });

      // Should not crash
      expect(() => {
        render(<HealthPredictiveChart data={mockHealthData} />);
      }).not.toThrow();

      // Should not show accuracy badge when computation fails
      expect(screen.queryByText(/accurate/)).not.toBeInTheDocument();
    });

    it('handles different prediction horizons', () => {
      render(<HealthPredictiveChart data={mockHealthData} predictionHorizon={14} />);

      // Should call prediction functions with correct horizon
      expect(mockGenerateFuturePredictions).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        14,
      );
    });

    it('respects initial algorithm prop', () => {
      render(<HealthPredictiveChart data={mockHealthData} algorithm="moving-average" />);

      const movingAverageButton = screen.getByText('Moving Average');

      expect(movingAverageButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Custom Formatters', () => {
    it('uses custom tooltip formatter when provided', () => {
      const customFormatter = vi.fn(() => ['Custom Value', 'Custom Name']);
      render(
        <HealthPredictiveChart
          data={mockHealthData}
          formatTooltip={customFormatter}
        />,
      );

      // Tooltip component should be rendered (mocked)
      expect(screen.getByTestId('mock-tooltip')).toBeInTheDocument();
    });

    it('uses custom axis formatters when provided', () => {
      const customXFormatter = vi.fn(value => `X: ${value}`);
      const customYFormatter = vi.fn(value => `Y: ${value}`);

      render(
        <HealthPredictiveChart
          data={mockHealthData}
          formatXAxis={customXFormatter}
          formatYAxis={customYFormatter}
        />,
      );

      // Axes should be rendered (mocked)
      expect(screen.getByTestId('mock-x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('mock-y-axis')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('adapts header layout on different screen sizes', () => {
      render(<HealthPredictiveChart data={mockHealthData} title="Test Chart" />);

      // Header should have responsive classes
      const header = screen.getByText('Test Chart').closest('div');

      expect(header).toHaveClass('flex', 'flex-col', 'sm:flex-row');
    });

    it('adapts control layout on different screen sizes', () => {
      render(<HealthPredictiveChart data={mockHealthData} />);

      // Controls container should have responsive classes
      const controlsContainer = screen.getByText('Confidence Interval').closest('div');

      expect(controlsContainer).toHaveClass('flex', 'flex-col', 'sm:flex-row');
    });
  });

  describe('Performance Optimizations', () => {
    it('memoizes prediction calculations', () => {
      const { rerender } = render(<HealthPredictiveChart data={mockHealthData} />);

      // Initial render should call prediction functions
      expect(mockLinearRegression).toHaveBeenCalledTimes(1);

      // Re-render with same data should not recalculate
      rerender(<HealthPredictiveChart data={mockHealthData} />);

      expect(mockLinearRegression).toHaveBeenCalledTimes(1);

      // Re-render with different data should recalculate
      const newData = [...mockHealthData, {
        date: '2024-01-06T00:00:00.000Z',
        value: 68.8,
        unit: 'kg',
        isPrediction: false,
      }];
      rerender(<HealthPredictiveChart data={newData} />);

      expect(mockLinearRegression).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('handles single data point gracefully', () => {
      const singlePoint = [mockHealthData[0]];
      render(<HealthPredictiveChart data={singlePoint} />);

      expect(screen.getByText('Need at least 3 data points for predictions')).toBeInTheDocument();
    });

    it('handles data with missing values', () => {
      const dataWithMissing = [
        { date: '2024-01-01T00:00:00.000Z', value: 70, unit: 'kg', isPrediction: false },
        { date: '2024-01-02T00:00:00.000Z', value: Number.NaN, unit: 'kg', isPrediction: false },
        { date: '2024-01-03T00:00:00.000Z', value: 69, unit: 'kg', isPrediction: false },
      ];

      expect(() => {
        render(<HealthPredictiveChart data={dataWithMissing} />);
      }).not.toThrow();
    });

    it('handles very large datasets', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        value: 70 + Math.sin(i / 10) * 5,
        unit: 'kg',
        isPrediction: false,
      }));

      expect(() => {
        render(<HealthPredictiveChart data={largeDataset} />);
      }).not.toThrow();
    });

    it('handles disabled algorithm buttons', () => {
      render(<HealthPredictiveChart data={mockHealthData.slice(0, 2)} />);

      // With insufficient data, buttons should be disabled
      expect(screen.getByText('Need at least 3 data points for predictions')).toBeInTheDocument();
    });
  });
});
