import type {
  BehaviorAnalyticsChartProps,
  BehaviorDataPoint,
  ContextPatternData,
  HabitStrengthData,
} from './BehaviorAnalyticsChart';
import { render, screen, fireEvent, waitFor } from 'vitest-browser-react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorAnalyticsChart } from './BehaviorAnalyticsChart';
import {
  generateBehaviorFrequencyData,
  generateHabitStrengthData,
  generateContextPatternsData,
  generateEmptyBehaviorData,
  generateSingleBehaviorPoint,
  generateLargeBehaviorDataset,
  generateBehaviorDataWithTrends,
  generateHabitStrengthWithConfidence,
  generateContextPatternsWithLongNames,
  generateCorruptedData,
  createDeterministicData,
  createBehaviorAnalyticsChartProps,
} from './BehaviorAnalyticsChart.fixtures';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      'no_behavior_data': 'No behavior data available',
      'behavior_frequency': 'Behavior Frequency',
      'habit_strength': 'Habit Strength',
      'context_patterns': 'Context Patterns',
      'consistency_trends': 'Consistency Trends',
      'loading': 'Loading...',
      'error': 'Error loading data',
    };
    return translations[key] || key;
  }),
}));

// Mock Recharts components for isolated testing
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children, data, margin }: any) => (
    <div data-testid="area-chart" data-margin={JSON.stringify(margin)} data-data-length={data?.length}>
      {children}
    </div>
  ),
  BarChart: ({ children, data, margin }: any) => (
    <div data-testid="bar-chart" data-margin={JSON.stringify(margin)} data-data-length={data?.length}>
      {children}
    </div>
  ),
  LineChart: ({ children, data, margin }: any) => (
    <div data-testid="line-chart" data-margin={JSON.stringify(margin)} data-data-length={data?.length}>
      {children}
    </div>
  ),
  CartesianGrid: (props: any) => (
    <div data-testid="cartesian-grid" data-stroke-dasharray={props.strokeDasharray} data-stroke={props.stroke} />
  ),
  XAxis: (props: any) => (
    <div 
      data-testid="x-axis" 
      data-datakey={props.dataKey}
      data-stroke={props.stroke}
      data-fontsize={props.fontSize}
      data-angle={props.angle}
      data-textanchor={props.textAnchor}
      data-height={props.height}
    />
  ),
  YAxis: (props: any) => (
    <div 
      data-testid="y-axis" 
      data-domain={JSON.stringify(props.domain)}
      data-stroke={props.stroke}
      data-fontsize={props.fontSize}
    />
  ),
  Tooltip: (props: any) => (
    <div 
      data-testid="tooltip" 
      data-formatter={props.formatter ? 'custom' : 'default'}
      data-labelstyle={JSON.stringify(props.labelStyle)}
      data-contentstyle={JSON.stringify(props.contentStyle)}
    />
  ),
  Legend: () => <div data-testid="legend" />,
  Area: (props: any) => (
    <div 
      data-testid="area" 
      data-datakey={props.dataKey}
      data-stackid={props.stackId}
      data-stroke={props.stroke}
      data-fill={props.fill}
      data-fillopacity={props.fillOpacity}
      data-strokewidth={props.strokeWidth}
      data-type={props.type}
    />
  ),
  Bar: (props: any) => (
    <div 
      data-testid="bar" 
      data-datakey={props.dataKey}
      data-fill={props.fill}
      data-radius={JSON.stringify(props.radius)}
      data-cursor={props.cursor}
      onClick={props.onClick}
    />
  ),
  Line: (props: any) => (
    <div 
      data-testid="line" 
      data-datakey={props.dataKey}
      data-stroke={props.stroke}
      data-strokewidth={props.strokeWidth}
      data-type={props.type}
      data-dot={JSON.stringify(props.dot)}
      data-activedot={JSON.stringify(props.activeDot)}
    />
  ),
}));

// Mock performance.now for consistent timing in tests
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => 1000),
  },
  writable: true,
});

describe('BehaviorAnalyticsChart', () => {
  const defaultProps: BehaviorAnalyticsChartProps = {
    data: generateBehaviorFrequencyData(7),
    chartType: 'behavior_frequency',
    title: 'Test Chart',
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering Tests', () => {
    it('renders with default props and behavior_frequency chart type', () => {
      render(<BehaviorAnalyticsChart {...defaultProps} />);

      expect(screen.getByText('Test Chart')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('renders with all four chart types', () => {
      const chartTypes: Array<BehaviorAnalyticsChartProps['chartType']> = [
        'behavior_frequency',
        'habit_strength',
        'context_patterns',
        'consistency_trends',
      ];

      chartTypes.forEach((chartType) => {
        const { unmount } = render(
          <BehaviorAnalyticsChart 
            {...defaultProps} 
            chartType={chartType}
            data={chartType === 'context_patterns' ? generateContextPatternsData() : generateBehaviorFrequencyData()}
          />
        );

        switch (chartType) {
          case 'behavior_frequency':
          case 'habit_strength':
            expect(screen.getByTestId('area-chart')).toBeInTheDocument();
            break;
          case 'context_patterns':
            expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
            break;
          case 'consistency_trends':
            expect(screen.getByTestId('line-chart')).toBeInTheDocument();
            break;
        }

        unmount();
      });
    });

    it('renders with custom className, height, width, and title props', () => {
      const customProps = {
        ...defaultProps,
        className: 'custom-chart-class',
        height: 600,
        width: '80%',
        title: 'Custom Chart Title',
      };

      render(<BehaviorAnalyticsChart {...customProps} />);

      const container = screen.getByText('Custom Chart Title').closest('div');
      expect(container).toHaveClass('custom-chart-class');
      expect(screen.getByText('Custom Chart Title')).toBeInTheDocument();
    });

    it('renders with different time ranges', () => {
      const timeRanges: Array<BehaviorAnalyticsChartProps['timeRange']> = ['7d', '30d', '90d', '1y'];

      timeRanges.forEach((timeRange) => {
        const { unmount } = render(
          <BehaviorAnalyticsChart {...defaultProps} timeRange={timeRange} />
        );

        expect(screen.getByText(new RegExp(timeRange))).toBeInTheDocument();
        unmount();
      });
    });

    it('renders with behaviorType badge when provided', () => {
      render(<BehaviorAnalyticsChart {...defaultProps} behaviorType="Exercise" />);

      expect(screen.getByText('Exercise')).toBeInTheDocument();
      const badge = screen.getByText('Exercise');
      expect(badge).toHaveClass('rounded-full', 'bg-purple-100', 'px-3', 'py-1', 'text-sm', 'font-medium', 'text-purple-800');
    });

    it('renders prediction indicator when showPrediction is true', () => {
      render(<BehaviorAnalyticsChart {...defaultProps} showPrediction={true} />);

      expect(screen.getByText('🔮 Predictive analysis enabled')).toBeInTheDocument();
    });
  });

  describe('Chart Type Specific Tests', () => {
    it('renders Behavior Frequency Chart with correct configuration', () => {
      const data = generateBehaviorFrequencyData();
      render(
        <BehaviorAnalyticsChart 
          {...defaultProps} 
          chartType="behavior_frequency" 
          data={data}
        />
      );

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      
      const areas = screen.getAllByTestId('area');
      expect(areas).toHaveLength(2); // frequency and strength

      // Check frequency area
      const frequencyArea = areas.find(area => area.getAttribute('data-datakey') === 'frequency');
      expect(frequencyArea).toHaveAttribute('data-stroke', '#3b82f6');
      expect(frequencyArea).toHaveAttribute('data-fill', '#3b82f6');
      expect(frequencyArea).toHaveAttribute('data-fillopacity', '0.3');

      // Check strength area
      const strengthArea = areas.find(area => area.getAttribute('data-datakey') === 'strength');
      expect(strengthArea).toHaveAttribute('data-stroke', '#10b981');
      expect(strengthArea).toHaveAttribute('data-fill', '#10b981');
      expect(strengthArea).toHaveAttribute('data-fillopacity', '0.2');
    });

    it('renders Habit Strength Chart with proper stacking', () => {
      const data = generateHabitStrengthData();
      render(
        <BehaviorAnalyticsChart 
          {...defaultProps} 
          chartType="habit_strength" 
          data={data}
        />
      );

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      
      const areas = screen.getAllByTestId('area');
      expect(areas).toHaveLength(3); // habitStrength, consistencyScore, frequencyScore

      // Check habit strength area
      const habitStrengthArea = areas.find(area => area.getAttribute('data-datakey') === 'habitStrength');
      expect(habitStrengthArea).toHaveAttribute('data-stackid', '1');
      expect(habitStrengthArea).toHaveAttribute('data-stroke', '#8b5cf6');
      expect(habitStrengthArea).toHaveAttribute('data-fillopacity', '0.6');

      // Check consistency score area
      const consistencyArea = areas.find(area => area.getAttribute('data-datakey') === 'consistencyScore');
      expect(consistencyArea).toHaveAttribute('data-stackid', '2');
      expect(consistencyArea).toHaveAttribute('data-stroke', '#06b6d4');

      // Check frequency score area
      const frequencyArea = areas.find(area => area.getAttribute('data-datakey') === 'frequencyScore');
      expect(frequencyArea).toHaveAttribute('data-stackid', '3');
      expect(frequencyArea).toHaveAttribute('data-stroke', '#10b981');
    });

    it('renders Context Patterns Chart with angled X-axis labels', () => {
      const data = generateContextPatternsData();
      render(
        <BehaviorAnalyticsChart 
          {...defaultProps} 
          chartType="context_patterns" 
          data={data}
        />
      );

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      
      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-datakey', 'context');
      expect(xAxis).toHaveAttribute('data-angle', '-45');
      expect(xAxis).toHaveAttribute('data-textanchor', 'end');
      expect(xAxis).toHaveAttribute('data-height', '80');

      const bars = screen.getAllByTestId('bar');
      expect(bars).toHaveLength(2); // successRate and predictivePower

      // Check success rate bar
      const successRateBar = bars.find(bar => bar.getAttribute('data-datakey') === 'successRate');
      expect(successRateBar).toHaveAttribute('data-fill', '#3b82f6');
      expect(successRateBar).toHaveAttribute('data-cursor', 'pointer');

      // Check predictive power bar
      const predictivePowerBar = bars.find(bar => bar.getAttribute('data-datakey') === 'predictivePower');
      expect(predictivePowerBar).toHaveAttribute('data-fill', '#f59e0b');
    });

    it('renders Consistency Trends Chart with confidence intervals when enabled', () => {
      const data = generateHabitStrengthWithConfidence();
      render(
        <BehaviorAnalyticsChart 
          {...defaultProps} 
          chartType="consistency_trends" 
          data={data}
          showConfidenceInterval={true}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      
      const lines = screen.getAllByTestId('line');
      expect(lines.length).toBeGreaterThanOrEqual(2); // consistency and frequency lines

      // Check consistency line
      const consistencyLine = lines.find(line => line.getAttribute('data-datakey') === 'consistency');
      expect(consistencyLine).toHaveAttribute('data-stroke', '#8b5cf6');
      expect(consistencyLine).toHaveAttribute('data-strokewidth', '3');

      // Check frequency line
      const frequencyLine = lines.find(line => line.getAttribute('data-datakey') === 'frequency');
      expect(frequencyLine).toHaveAttribute('data-stroke', '#06b6d4');
      expect(frequencyLine).toHaveAttribute('data-strokewidth', '2');
    });
  });

  describe('Data Transformation Tests', () => {
    it('applies correct chart margins and styling configurations', () => {
      render(<BehaviorAnalyticsChart {...defaultProps} />);

      const chart = screen.getByTestId('area-chart');
      const margin = JSON.parse(chart.getAttribute('data-margin') || '{}');
      
      expect(margin).toEqual({
        top: 20,
        right: 30,
        left: 20,
        bottom: 20,
      });
    });

    it('sets correct Y-axis domain for percentage charts', () => {
      const percentageChartTypes = ['habit_strength', 'context_patterns', 'consistency_trends'];
      
      percentageChartTypes.forEach((chartType) => {
        const { unmount } = render(
          <BehaviorAnalyticsChart 
            {...defaultProps} 
            chartType={chartType as any}
            data={chartType === 'context_patterns' ? generateContextPatternsData() : generateHabitStrengthData()}
          />
        );

        const yAxis = screen.getByTestId('y-axis');
        const domain = JSON.parse(yAxis.getAttribute('data-domain') || '[]');
        expect(domain).toEqual([0, 100]);

        unmount();
      });
    });

    it('sets auto Y-axis domain for frequency charts', () => {
      render(
        <BehaviorAnalyticsChart 
          {...defaultProps} 
          chartType="behavior_frequency"
        />
      );

      const yAxis = screen.getByTestId('y-axis');
      const domain = yAxis.getAttribute('data-domain');
      expect(domain).toBeNull(); // Auto domain when not specified
    });

    it('applies correct grid and axis styling', () => {
      render(<BehaviorAnalyticsChart {...defaultProps} />);

      const grid = screen.getByTestId('cartesian-grid');
      expect(grid).toHaveAttribute('data-stroke-dasharray', '3 3');
      expect(grid).toHaveAttribute('data-stroke', '#f3f4f6');

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-stroke', '#6b7280');
      expect(xAxis).toHaveAttribute('data-fontsize', '12');

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-stroke', '#6b7280');
      expect(yAxis).toHaveAttribute('data-fontsize', '12');
    });
  });

  describe('Interactive Features Tests', () => {
    it('triggers onDataPointClick callback when clicking on chart elements', async () => {
      const mockOnClick = vi.fn();
      const data = generateContextPatternsData();
      
      render(
        <BehaviorAnalyticsChart 
          {...defaultProps} 
          chartType="context_patterns"
          data={data}
          onDataPointClick={mockOnClick}
        />
      );

      const bars = screen.getAllByTestId('bar');
      const clickableBar = bars[0];
      
      fireEvent.click(clickableBar);
      
      expect(mockOnClick).toHaveBeenCalled();
    });

    it('displays tooltip with custom formatter', () => {
      render(<BehaviorAnalyticsChart {...defaultProps} />);

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-formatter', 'custom');
      
      const contentStyle = JSON.parse(tooltip.getAttribute('data-contentstyle') || '{}');
      expect(contentStyle).toEqual({
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      });
    });

    it('displays legend when appropriate for each chart type', () => {
      const chartTypes = ['behavior_frequency', 'habit_strength', 'context_patterns', 'consistency_trends'];
      
      chartTypes.forEach((chartType) => {
        const { unmount } = render(
          <BehaviorAnalyticsChart 
            {...defaultProps} 
            chartType={chartType as any}
            data={chartType === 'context_patterns' ? generateContextPatternsData() : generateBehaviorFrequencyData()}
          />
        );

        expect(screen.getByTestId('legend')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('State Management Tests', () => {
    it('renders LoadingSpinner when loading=true and preserves title', () => {
      render(<BehaviorAnalyticsChart {...defaultProps} loading={true} />);

      expect(screen.getByText('Test Chart')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Loading spinner
      expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
    });

    it('renders ErrorState when error prop is provided', () => {
      const errorMessage = 'Failed to load chart data';
      render(<BehaviorAnalyticsChart {...defaultProps} error={errorMessage} />);

      expect(screen.getByText('Test Chart')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
    });

    it('renders EmptyState when data array is empty', () => {
      render(<BehaviorAnalyticsChart {...defaultProps} data={[]} />);

      expect(screen.getByText('Test Chart')).toBeInTheDocument();
      expect(screen.getByText('No behavior data available')).toBeInTheDocument();
      expect(screen.getByText('🧠')).toBeInTheDocument();
      expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
    });

    it('handles undefined or null data gracefully', () => {
      const { rerender } = render(<BehaviorAnalyticsChart {...defaultProps} data={undefined as any} />);
      
      expect(screen.getByText('No behavior data available')).toBeInTheDocument();

      rerender(<BehaviorAnalyticsChart {...defaultProps} data={null as any} />);
      
      expect(screen.getByText('No behavior data available')).toBeInTheDocument();
    });
  });

  describe('Props Validation Tests', () => {
    it('handles missing optional props with appropriate defaults', () => {
      const minimalProps = {
        data: generateBehaviorFrequencyData(),
      };

      render(<BehaviorAnalyticsChart {...minimalProps} />);

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('area-chart')).toBeInTheDocument(); // Default chart type
    });

    it('validates chartType prop and falls back to behavior_frequency', () => {
      render(
        <BehaviorAnalyticsChart 
          {...defaultProps} 
          chartType={undefined as any}
        />
      );

      expect(screen.getByTestId('area-chart')).toBeInTheDocument(); // Default behavior_frequency chart
    });

    it('handles invalid data structures without crashing', () => {
      const corruptedData = generateCorruptedData();
      
      expect(() => {
        render(<BehaviorAnalyticsChart {...defaultProps} data={corruptedData} />);
      }).not.toThrow();
    });

    it('respects showConfidenceInterval and showPrediction flags', () => {
      const { rerender } = render(
        <BehaviorAnalyticsChart 
          {...defaultProps} 
          showPrediction={false}
          showConfidenceInterval={false}
        />
      );

      expect(screen.queryByText('🔮 Predictive analysis enabled')).not.toBeInTheDocument();

      rerender(
        <BehaviorAnalyticsChart 
          {...defaultProps} 
          showPrediction={true}
          showConfidenceInterval={true}
        />
      );

      expect(screen.getByText('🔮 Predictive analysis enabled')).toBeInTheDocument();
    });
  });

  describe('Accessibility Tests', () => {
    it('has proper container structure and styling', () => {
      render(<BehaviorAnalyticsChart {...defaultProps} />);

      const container = screen.getByText('Test Chart').closest('div');
      expect(container).toHaveClass('rounded-lg', 'border', 'border-gray-200', 'bg-white', 'p-4');
    });

    it('provides semantic structure with proper headings', () => {
      render(<BehaviorAnalyticsChart {...defaultProps} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Test Chart');
      expect(heading).toHaveClass('text-lg', 'font-semibold', 'text-gray-900');
    });

    it('maintains proper color contrast in chart elements', () => {
      render(<BehaviorAnalyticsChart {...defaultProps} />);

      const tooltip = screen.getByTestId('tooltip');
      const contentStyle = JSON.parse(tooltip.getAttribute('data-contentstyle') || '{}');
      
      expect(contentStyle.backgroundColor).toBe('#ffffff');
      expect(contentStyle.border).toBe('1px solid #e5e7eb');
    });
  });

  describe('Data Footer Tests', () => {
    it('displays data point count and time range in footer', () => {
      const data = generateBehaviorFrequencyData(14);
      render(
        <BehaviorAnalyticsChart 
          {...defaultProps} 
          data={data}
          timeRange="30d"
        />
      );

      expect(screen.getByText('14 data points • 30d range')).toBeInTheDocument();
    });

    it('shows predictive analysis indicator when showPrediction is true', () => {
      render(
        <BehaviorAnalyticsChart 
          {...defaultProps} 
          showPrediction={true}
        />
      );

      expect(screen.getByText('🔮 Predictive analysis enabled')).toBeInTheDocument();
    });

    it('only renders footer when data is present', () => {
      const { rerender } = render(<BehaviorAnalyticsChart {...defaultProps} data={[]} />);
      
      expect(screen.queryByText(/data points/)).not.toBeInTheDocument();

      rerender(<BehaviorAnalyticsChart {...defaultProps} data={generateBehaviorFrequencyData(5)} />);
      
      expect(screen.getByText('5 data points • 30d range')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles extremely large datasets', () => {
      const largeData = generateLargeBehaviorDataset();
      
      expect(() => {
        render(<BehaviorAnalyticsChart {...defaultProps} data={largeData} />);
      }).not.toThrow();

      const chart = screen.getByTestId('area-chart');
      expect(chart).toHaveAttribute('data-data-length', largeData.length.toString());
    });

    it('handles malformed date strings gracefully', () => {
      const dataWithBadDates = [
        { date: 'invalid-date', frequency: 5, consistency: 70, strength: 60 },
        { date: '2024-13-45', frequency: 3, consistency: 80, strength: 50 },
      ] as BehaviorDataPoint[];

      expect(() => {
        render(<BehaviorAnalyticsChart {...defaultProps} data={dataWithBadDates} />);
      }).not.toThrow();
    });

    it('handles negative values appropriately', () => {
      const dataWithNegatives = [
        { date: '2024-01-01', frequency: -5, consistency: -10, strength: -20 },
        { date: '2024-01-02', frequency: 5, consistency: 70, strength: 60 },
      ] as BehaviorDataPoint[];

      expect(() => {
        render(<BehaviorAnalyticsChart {...defaultProps} data={dataWithNegatives} />);
      }).not.toThrow();
    });

    it('handles missing required data fields', () => {
      const incompleteData = [
        { date: '2024-01-01', frequency: 5 }, // missing consistency and strength
        { consistency: 70, strength: 60 }, // missing date and frequency
      ] as BehaviorDataPoint[];

      expect(() => {
        render(<BehaviorAnalyticsChart {...defaultProps} data={incompleteData} />);
      }).not.toThrow();
    });

    it('handles single data point correctly', () => {
      const singlePoint = generateSingleBehaviorPoint();
      
      render(<BehaviorAnalyticsChart {...defaultProps} data={singlePoint} />);

      expect(screen.getByText('1 data points • 30d range')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('handles context patterns with very long names', () => {
      const longNameData = generateContextPatternsWithLongNames();
      
      expect(() => {
        render(
          <BehaviorAnalyticsChart 
            {...defaultProps} 
            chartType="context_patterns"
            data={longNameData}
          />
        );
      }).not.toThrow();
    });

    it('gracefully handles component unmounting during data updates', () => {
      const { unmount } = render(<BehaviorAnalyticsChart {...defaultProps} />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Chart Configuration Tests', () => {
    it('applies deterministic data for consistent testing', () => {
      const deterministicData = createDeterministicData('test-seed');
      
      render(<BehaviorAnalyticsChart {...defaultProps} data={deterministicData} />);

      const chart = screen.getByTestId('area-chart');
      expect(chart).toHaveAttribute('data-data-length', deterministicData.length.toString());
    });

    it('handles different trend patterns correctly', () => {
      const trendTypes = ['increasing', 'decreasing', 'stable'] as const;
      
      trendTypes.forEach((trend) => {
        const trendData = generateBehaviorDataWithTrends(trend);
        const { unmount } = render(
          <BehaviorAnalyticsChart {...defaultProps} data={trendData} />
        );

        expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
        unmount();
      });
    });

    it('maintains responsive container configuration', () => {
      render(<BehaviorAnalyticsChart {...defaultProps} width="50%" height={300} />);

      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
    });
  });
});