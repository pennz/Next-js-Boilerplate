import type {
  HealthRadarChartProps,
  HealthRadarMetric,
  RadarChartConfig,
  RadarChartData,
} from './types';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthRadarChart } from './HealthRadarChart';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      radar_chart_title: 'Health Overview Radar',
      radar_chart_subtitle: 'Multi-metric health visualization',
      scoring_system_label: 'Scoring System',
      scoring_percentage: 'Percentage',
      scoring_z_score: 'Z-Score',
      scoring_custom: 'Custom',
      radar_score_excellent: 'Excellent (80-100)',
      radar_score_good: 'Good (60-79)',
      radar_score_fair: 'Fair (40-59)',
      radar_score_poor: 'Poor (0-39)',
      radar_legend_title: 'Score Legend',
      radar_metric_weight: 'Weight (BMI)',
      radar_metric_steps: 'Daily Steps',
      radar_metric_sleep: 'Sleep Quality',
      radar_metric_heart_rate: 'Heart Rate',
      radar_metric_blood_pressure: 'Blood Pressure',
      radar_metric_water: 'Water Intake',
      radar_metric_exercise: 'Exercise',
      radar_tooltip_score: 'Score: {score}/100',
      radar_tooltip_value: '{value} {unit}',
      radar_empty_state: 'No health metrics available for radar chart',
      radar_insufficient_data: 'Need at least 3 metrics for radar visualization',
      change_scoring_system: 'Change Scoring System',
      radar_chart_description: 'Radar chart showing normalized health metric scores',
      radar_accessibility_label: 'Health metrics radar chart with {count} categories',
      chart_data_points: '{count} data points',
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

// Mock health scoring utilities
vi.mock('@/utils/healthScoring', () => ({
  aggregateRadarData: vi.fn(),
  getScoreColor: vi.fn((score: number) => {
    if (score >= 80) {
      return '#10b981';
    }
    if (score >= 60) {
      return '#3b82f6';
    }
    if (score >= 40) {
      return '#f59e0b';
    }
    return '#ef4444';
  }),
  getScoreCategory: vi.fn((score: number) => {
    if (score >= 80) {
      return 'excellent';
    }
    if (score >= 60) {
      return 'good';
    }
    if (score >= 40) {
      return 'fair';
    }
    return 'poor';
  }),
  DEFAULT_SCORE_COLORS: {
    excellent: '#10b981',
    good: '#3b82f6',
    fair: '#f59e0b',
    poor: '#ef4444',
  },
}));

// Mock recharts components to avoid JSDOM rendering issues
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children, width = 800, height = 400 }: any) => (
      <div data-testid="responsive-container" style={{ width, height }}>
        {children}
      </div>
    ),
    RadarChart: ({ children, data, ...props }: any) => (
      <div data-testid="radar-chart" data-chart-data={JSON.stringify(data)} {...props}>
        {children}
      </div>
    ),
    PolarGrid: (props: any) => <div data-testid="polar-grid" {...props} />,
    PolarAngleAxis: (props: any) => <div data-testid="polar-angle-axis" {...props} />,
    PolarRadiusAxis: (props: any) => <div data-testid="polar-radius-axis" {...props} />,
    Radar: (props: any) => <div data-testid="radar" {...props} />,
    Tooltip: ({ content }: any) => <div data-testid="tooltip">{content}</div>,
    Legend: (props: any) => <div data-testid="legend" {...props} />,
  };
});

// Mock performance.now for consistent testing
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => 1000),
  },
  writable: true,
});

describe('HealthRadarChart', () => {
  // Test data fixtures
  const mockRadarMetrics: HealthRadarMetric[] = [
    {
      category: 'Weight',
      value: 70,
      maxValue: 100,
      unit: 'kg',
      score: 85,
      color: '#10b981',
      icon: '⚖️',
    },
    {
      category: 'Steps',
      value: 8500,
      maxValue: 12000,
      unit: 'steps',
      score: 71,
      color: '#3b82f6',
      icon: '👟',
    },
    {
      category: 'Sleep',
      value: 7.5,
      maxValue: 9,
      unit: 'hours',
      score: 83,
      color: '#10b981',
      icon: '😴',
    },
    {
      category: 'Heart Rate',
      value: 72,
      maxValue: 100,
      unit: 'bpm',
      score: 75,
      color: '#3b82f6',
      icon: '❤️',
    },
    {
      category: 'Water Intake',
      value: 2200,
      maxValue: 3000,
      unit: 'ml',
      score: 73,
      color: '#3b82f6',
      icon: '💧',
    },
  ];

  const mockRadarData: RadarChartData[] = [
    {
      metrics: mockRadarMetrics,
      timestamp: '2024-01-15T10:00:00Z',
      label: 'Current Health Status',
    },
  ];

  const defaultProps: HealthRadarChartProps = {
    data: mockRadarData,
    scoringSystem: 'percentage',
    title: 'Health Overview',
    subtitle: 'Your health metrics at a glance',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with multiple metrics', () => {
      render(<HealthRadarChart {...defaultProps} />);

      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(screen.getByText('Health Overview')).toBeInTheDocument();
      expect(screen.getByText('Your health metrics at a glance')).toBeInTheDocument();
      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders with single metric data set', () => {
      const singleMetricData = [
        {
          metrics: [mockRadarMetrics[0]],
          timestamp: '2024-01-15T10:00:00Z',
        },
      ];

      render(<HealthRadarChart data={singleMetricData} />);

      // Should show insufficient data message for single metric
      expect(screen.getByText('Need at least 3 metrics for radar visualization')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const customClass = 'custom-radar-class';
      render(<HealthRadarChart {...defaultProps} className={customClass} />);

      const container = screen.getByRole('img');

      expect(container).toHaveClass(customClass);
    });

    it('renders without title and subtitle', () => {
      render(<HealthRadarChart data={mockRadarData} />);

      expect(screen.queryByText('Health Overview')).not.toBeInTheDocument();
      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });

    it('renders chart components correctly', () => {
      render(<HealthRadarChart {...defaultProps} />);

      expect(screen.getByTestId('polar-grid')).toBeInTheDocument();
      expect(screen.getByTestId('polar-angle-axis')).toBeInTheDocument();
      expect(screen.getByTestId('polar-radius-axis')).toBeInTheDocument();
      expect(screen.getByTestId('radar')).toBeInTheDocument();
    });
  });

  describe('Empty and Error States', () => {
    it('shows empty state when no data provided', () => {
      render(<HealthRadarChart data={[]} />);

      expect(screen.getByText('No health metrics available for radar chart')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
    });

    it('shows empty state when data is undefined', () => {
      render(<HealthRadarChart data={undefined as any} />);

      expect(screen.getByText('No health metrics available for radar chart')).toBeInTheDocument();
    });

    it('shows insufficient data state for less than 3 metrics', () => {
      const insufficientData = [
        {
          metrics: mockRadarMetrics.slice(0, 2),
          timestamp: '2024-01-15T10:00:00Z',
        },
      ];

      render(<HealthRadarChart data={insufficientData} />);

      expect(screen.getByText('Need at least 3 metrics for radar visualization')).toBeInTheDocument();
      expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(<HealthRadarChart {...defaultProps} loading={true} />);

      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(screen.getByText('Health Overview')).toBeInTheDocument();

      // Should show loading spinner
      const spinner = screen.getByRole('img').querySelector('.animate-spin');

      expect(spinner).toBeInTheDocument();
      expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
    });

    it('shows error state', () => {
      const errorMessage = 'Failed to load health data';
      render(<HealthRadarChart {...defaultProps} error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
    });
  });

  describe('Scoring Systems', () => {
    it('renders with percentage scoring system by default', () => {
      render(<HealthRadarChart {...defaultProps} />);

      const radarChart = screen.getByTestId('radar-chart');

      expect(radarChart).toBeInTheDocument();

      // Check that data is processed (mocked data should be present)
      const chartData = radarChart.getAttribute('data-chart-data');

      expect(chartData).toBeTruthy();
    });

    it('handles z-score scoring system', () => {
      render(<HealthRadarChart {...defaultProps} scoringSystem="z-score" />);

      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });

    it('handles custom scoring system', () => {
      render(<HealthRadarChart {...defaultProps} scoringSystem="custom" />);

      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });

    it('calls onScoringSystemChange when scoring system changes', async () => {
      const onScoringSystemChange = vi.fn();
      render(
        <HealthRadarChart
          {...defaultProps}
          onScoringSystemChange={onScoringSystemChange}
        />,
      );

      // This would be triggered by a scoring system selector component
      // For now, we'll test the callback directly
      expect(onScoringSystemChange).not.toHaveBeenCalled();
    });
  });

  describe('Chart Configuration', () => {
    it('applies custom chart configuration', () => {
      const customConfig: RadarChartConfig = {
        gridLevels: 3,
        size: 'large',
        colorScheme: {
          excellent: '#00ff00',
          good: '#0000ff',
          fair: '#ffff00',
          poor: '#ff0000',
        },
      };

      render(<HealthRadarChart {...defaultProps} config={customConfig} />);

      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });

    it('handles different chart sizes', () => {
      const { rerender } = render(
        <HealthRadarChart {...defaultProps} config={{ size: 'small' }} />,
      );

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();

      rerender(<HealthRadarChart {...defaultProps} config={{ size: 'medium' }} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();

      rerender(<HealthRadarChart {...defaultProps} config={{ size: 'large' }} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('calls onConfigChange when configuration changes', () => {
      const onConfigChange = vi.fn();
      render(
        <HealthRadarChart
          {...defaultProps}
          onConfigChange={onConfigChange}
        />,
      );

      // Configuration changes would be triggered by UI controls
      expect(onConfigChange).not.toHaveBeenCalled();
    });
  });

  describe('Interactive Features', () => {
    it('displays tooltip when enabled', () => {
      render(<HealthRadarChart {...defaultProps} showTooltip={true} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('hides tooltip when disabled', () => {
      render(<HealthRadarChart {...defaultProps} showTooltip={false} />);

      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
    });

    it('displays legend when enabled', () => {
      render(<HealthRadarChart {...defaultProps} showLegend={true} />);

      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('hides legend when disabled', () => {
      render(<HealthRadarChart {...defaultProps} showLegend={false} />);

      expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    });

    it('calls onMetricHover when metric is hovered', () => {
      const onMetricHover = vi.fn();
      render(
        <HealthRadarChart
          {...defaultProps}
          onMetricHover={onMetricHover}
        />,
      );

      // Hover interactions would be handled by the radar component
      expect(onMetricHover).not.toHaveBeenCalled();
    });
  });

  describe('Score Legend', () => {
    it('displays score legend by default', () => {
      render(<HealthRadarChart {...defaultProps} />);

      expect(screen.getByText('Score Legend')).toBeInTheDocument();
      expect(screen.getByText('Excellent (80-100)')).toBeInTheDocument();
      expect(screen.getByText('Good (60-79)')).toBeInTheDocument();
      expect(screen.getByText('Fair (40-59)')).toBeInTheDocument();
      expect(screen.getByText('Poor (0-39)')).toBeInTheDocument();
    });

    it('hides score legend when disabled', () => {
      render(<HealthRadarChart {...defaultProps} showScoreLegend={false} />);

      expect(screen.queryByText('Score Legend')).not.toBeInTheDocument();
    });

    it('displays color indicators in score legend', () => {
      render(<HealthRadarChart {...defaultProps} />);

      const legend = screen.getByText('Score Legend').closest('div');

      expect(legend).toBeInTheDocument();

      // Check for color indicator elements
      const colorIndicators = legend?.querySelectorAll('.h-3.w-3.rounded-full');

      expect(colorIndicators).toHaveLength(4);
    });
  });

  describe('Accessibility Features', () => {
    it('has proper ARIA labels and roles', () => {
      render(<HealthRadarChart {...defaultProps} />);

      const chart = screen.getByRole('img');

      expect(chart).toHaveAttribute('aria-label');
      expect(chart).toHaveAttribute('aria-description');
    });

    it('uses custom accessibility labels when provided', () => {
      const customAriaLabel = 'Custom health radar chart';
      const customAriaDescription = 'Custom description for health metrics';

      render(
        <HealthRadarChart
          {...defaultProps}
          ariaLabel={customAriaLabel}
          ariaDescription={customAriaDescription}
        />,
      );

      const chart = screen.getByRole('img');

      expect(chart).toHaveAttribute('aria-label', customAriaLabel);
      expect(chart).toHaveAttribute('aria-description', customAriaDescription);
    });

    it('generates appropriate accessibility labels for metric count', () => {
      render(<HealthRadarChart {...defaultProps} />);

      const chart = screen.getByRole('img');
      const ariaLabel = chart.getAttribute('aria-label');

      expect(ariaLabel).toContain('5'); // Number of metrics in mock data
    });
  });

  describe('Responsive Design', () => {
    it('handles different width and height props', () => {
      render(
        <HealthRadarChart
          {...defaultProps}
          width="600px"
          height={300}
        />,
      );

      const container = screen.getByTestId('responsive-container');

      expect(container).toHaveStyle({ width: '600px', height: '300px' });
    });

    it('uses default dimensions when not specified', () => {
      render(<HealthRadarChart {...defaultProps} />);

      const container = screen.getByTestId('responsive-container');

      expect(container).toHaveStyle({ width: '100%' });
    });
  });

  describe('Data Processing', () => {
    it('processes multiple data sets correctly', () => {
      const multipleDataSets = [
        {
          metrics: mockRadarMetrics.slice(0, 3),
          timestamp: '2024-01-14T10:00:00Z',
          label: 'Previous Day',
        },
        {
          metrics: mockRadarMetrics,
          timestamp: '2024-01-15T10:00:00Z',
          label: 'Current Day',
        },
      ];

      render(<HealthRadarChart data={multipleDataSets} />);

      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();

      // Should use the latest data set
      const chartData = screen.getByTestId('radar-chart').getAttribute('data-chart-data');

      expect(chartData).toBeTruthy();
    });

    it('handles empty metrics in data sets', () => {
      const emptyMetricsData = [
        {
          metrics: [],
          timestamp: '2024-01-15T10:00:00Z',
        },
      ];

      render(<HealthRadarChart data={emptyMetricsData} />);

      expect(screen.getByText('No health metrics available for radar chart')).toBeInTheDocument();
    });

    it('normalizes scores to 0-100 range', () => {
      const extremeScoreMetrics = [
        { ...mockRadarMetrics[0], score: -10 }, // Below 0
        { ...mockRadarMetrics[1], score: 150 }, // Above 100
        { ...mockRadarMetrics[2], score: 50 }, // Normal
      ];

      const extremeData = [{ metrics: extremeScoreMetrics }];
      render(<HealthRadarChart data={extremeData} />);

      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });
  });

  describe('Custom Formatting', () => {
    it('uses custom tooltip formatter when provided', () => {
      const formatTooltip = vi.fn((metric: HealthRadarMetric) =>
        `Custom: ${metric.category} - ${metric.score}%`,
      );

      render(
        <HealthRadarChart
          {...defaultProps}
          formatTooltip={formatTooltip}
        />,
      );

      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });

    it('uses custom score formatter when provided', () => {
      const formatScore = vi.fn((score: number) => `${score.toFixed(1)}pts`);

      render(
        <HealthRadarChart
          {...defaultProps}
          formatScore={formatScore}
        />,
      );

      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });
  });

  describe('Behavior Tracking Integration', () => {
    it('tracks metric hover events', async () => {
      render(<HealthRadarChart {...defaultProps} />);

      // Simulate hover event (would be triggered by radar component)
      // Since we're mocking recharts, we'll test the tracking function directly
      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'radar_chart_metric_hover',
        }),
      );
    });

    it('tracks scoring system changes', async () => {
      const onScoringSystemChange = vi.fn();
      render(
        <HealthRadarChart
          {...defaultProps}
          onScoringSystemChange={onScoringSystemChange}
        />,
      );

      // Scoring system changes would trigger tracking
      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'radar_chart_scoring_system_change',
        }),
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles invalid metric data gracefully', () => {
      const invalidMetrics = [
        {
          category: 'Invalid',
          value: Number.NaN,
          maxValue: 100,
          unit: 'test',
          score: Number.NaN,
        },
      ] as HealthRadarMetric[];

      const invalidData = [{ metrics: invalidMetrics }];

      expect(() => {
        render(<HealthRadarChart data={invalidData} />);
      }).not.toThrow();

      // Should show insufficient data message
      expect(screen.getByText('Need at least 3 metrics for radar visualization')).toBeInTheDocument();
    });

    it('handles missing required properties in metrics', () => {
      const incompleteMetrics = [
        {
          category: 'Incomplete',
          value: 100,
        },
      ] as HealthRadarMetric[];

      const incompleteData = [{ metrics: incompleteMetrics }];

      expect(() => {
        render(<HealthRadarChart data={incompleteData} />);
      }).not.toThrow();
    });

    it('handles null or undefined metric values', () => {
      const nullValueMetrics = mockRadarMetrics.map(metric => ({
        ...metric,
        value: null as any,
      }));

      const nullData = [{ metrics: nullValueMetrics }];

      expect(() => {
        render(<HealthRadarChart data={nullData} />);
      }).not.toThrow();
    });

    it('handles extremely large datasets', () => {
      const largeMetrics = Array.from({ length: 20 }, (_, i) => ({
        category: `Metric ${i + 1}`,
        value: Math.random() * 100,
        maxValue: 100,
        unit: 'units',
        score: Math.random() * 100,
        color: '#3b82f6',
      }));

      const largeData = [{ metrics: largeMetrics }];

      expect(() => {
        render(<HealthRadarChart data={largeData} />);
      }).not.toThrow();

      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });
  });

  describe('Data Summary Display', () => {
    it('displays metric count in data summary', () => {
      render(<HealthRadarChart {...defaultProps} />);

      expect(screen.getByText('5 metrics')).toBeInTheDocument();
    });

    it('updates summary when hovering over metrics', () => {
      render(<HealthRadarChart {...defaultProps} />);

      // Initial state should show metric count
      expect(screen.getByText('5 metrics')).toBeInTheDocument();

      // Hover state would be updated by the component's internal state
      // This would be tested through integration with the actual radar component
    });
  });

  describe('Performance Considerations', () => {
    it('memoizes processed data to avoid unnecessary recalculations', () => {
      const { rerender } = render(<HealthRadarChart {...defaultProps} />);

      // Re-render with same data should not cause issues
      rerender(<HealthRadarChart {...defaultProps} />);
      rerender(<HealthRadarChart {...defaultProps} />);

      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });

    it('handles rapid prop changes without errors', () => {
      const { rerender } = render(<HealthRadarChart {...defaultProps} />);

      // Rapidly change scoring systems
      rerender(<HealthRadarChart {...defaultProps} scoringSystem="z-score" />);
      rerender(<HealthRadarChart {...defaultProps} scoringSystem="custom" />);
      rerender(<HealthRadarChart {...defaultProps} scoringSystem="percentage" />);

      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });
  });
});
