import type { HealthSummaryMetric } from './types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateGoalProgress,
  calculatePercentageChange,
  calculateTrendData,
  determineTrendDirection,
  formatPercentage,
  HealthSummaryCards,
} from './HealthSummaryCards';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      'title': 'Health Summary',
      'subtitle': 'Your key health metrics at a glance',
      'ariaLabel': 'Health summary cards',
      'metricsCount': '{count} metrics',
      'emptyState.title': 'No Health Metrics',
      'emptyState.description': 'Start tracking your health to see metrics here.',
      'trend.increase': 'increase',
      'trend.decrease': 'decrease',
      'trend.noChange': 'no change',
      'goal.progress': 'Goal Progress',
      'goal.current': 'Current',
      'goal.target': 'Target',
      'summary.withTrends': 'With Trends',
      'summary.withGoals': 'With Goals',
      'summary.completed': 'Completed',
      'summary.improving': 'Improving',
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

// Mock performance.now for consistent testing
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => 1000),
  },
  writable: true,
});

describe('HealthSummaryCards', () => {
  const mockMetrics: HealthSummaryMetric[] = [
    {
      id: '1',
      label: 'Weight',
      value: 70,
      unit: 'kg',
      previousValue: 72,
      icon: '⚖️',
    },
    {
      id: '2',
      label: 'Steps',
      value: 8500,
      unit: 'steps',
      previousValue: 8000,
      goalTarget: 10000,
      goalCurrent: 8500,
      icon: '👟',
    },
    {
      id: '3',
      label: 'Sleep',
      value: 7.5,
      unit: 'hours',
      previousValue: 7.5,
      goalTarget: 8,
      goalCurrent: 7.5,
      icon: '😴',
    },
    {
      id: '4',
      label: 'Heart Rate',
      value: 72,
      unit: 'bpm',
      goalTarget: 70,
      goalCurrent: 72,
      icon: '❤️',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with multiple metrics', () => {
      render(<HealthSummaryCards metrics={mockMetrics} />);

      expect(screen.getByTestId('health-summary-cards')).toBeInTheDocument();
      expect(screen.getByText('Health Summary')).toBeInTheDocument();
      expect(screen.getByText('Your key health metrics at a glance')).toBeInTheDocument();
      expect(screen.getByText('4 metrics')).toBeInTheDocument();

      // Check all metrics are rendered
      expect(screen.getByText('Weight')).toBeInTheDocument();
      expect(screen.getByText('Steps')).toBeInTheDocument();
      expect(screen.getByText('Sleep')).toBeInTheDocument();
      expect(screen.getByText('Heart Rate')).toBeInTheDocument();
    });

    it('renders with single metric', () => {
      const singleMetric = [mockMetrics[0]];
      render(<HealthSummaryCards metrics={singleMetric} />);

      expect(screen.getByTestId('health-summary-cards')).toBeInTheDocument();
      expect(screen.getByText('1 metrics')).toBeInTheDocument();
      expect(screen.getByText('Weight')).toBeInTheDocument();

      // Should not show summary stats for single metric
      expect(screen.queryByText('With Trends')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const customClass = 'custom-test-class';
      render(<HealthSummaryCards metrics={mockMetrics} className={customClass} />);

      const container = screen.getByTestId('health-summary-cards');

      expect(container).toHaveClass(customClass);
    });

    it('renders metric values and units correctly', () => {
      render(<HealthSummaryCards metrics={mockMetrics} />);

      expect(screen.getByText('70')).toBeInTheDocument();
      expect(screen.getByText('kg')).toBeInTheDocument();
      expect(screen.getByText('8,500')).toBeInTheDocument(); // Should format numbers with commas
      expect(screen.getByText('steps')).toBeInTheDocument();
      expect(screen.getByText('7.5')).toBeInTheDocument();
      expect(screen.getByText('hours')).toBeInTheDocument();
    });

    it('renders metric icons when provided', () => {
      render(<HealthSummaryCards metrics={mockMetrics} />);

      expect(screen.getByText('⚖️')).toBeInTheDocument();
      expect(screen.getByText('👟')).toBeInTheDocument();
      expect(screen.getByText('😴')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no metrics provided', () => {
      render(<HealthSummaryCards metrics={[]} />);

      expect(screen.getByTestId('health-summary-cards-empty')).toBeInTheDocument();
      expect(screen.getByText('No Health Metrics')).toBeInTheDocument();
      expect(screen.getByText('Start tracking your health to see metrics here.')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
    });

    it('shows empty state when metrics is undefined', () => {
      render(<HealthSummaryCards metrics={undefined as any} />);

      expect(screen.getByTestId('health-summary-cards-empty')).toBeInTheDocument();
    });
  });

  describe('Trend Calculation and Display', () => {
    it('displays upward trend correctly', () => {
      const metricWithUpTrend = [{
        id: '1',
        label: 'Steps',
        value: 9000,
        unit: 'steps',
        previousValue: 8000,
      }];

      render(<HealthSummaryCards metrics={metricWithUpTrend} />);

      expect(screen.getByText('↗')).toBeInTheDocument();
      expect(screen.getByText('13% increase')).toBeInTheDocument();
    });

    it('displays downward trend correctly', () => {
      const metricWithDownTrend = [{
        id: '1',
        label: 'Weight',
        value: 68,
        unit: 'kg',
        previousValue: 70,
      }];

      render(<HealthSummaryCards metrics={metricWithDownTrend} />);

      expect(screen.getByText('↘')).toBeInTheDocument();
      expect(screen.getByText('3% decrease')).toBeInTheDocument();
    });

    it('displays neutral trend correctly', () => {
      const metricWithNeutralTrend = [{
        id: '1',
        label: 'Sleep',
        value: 7.5,
        unit: 'hours',
        previousValue: 7.5,
      }];

      render(<HealthSummaryCards metrics={metricWithNeutralTrend} />);

      expect(screen.getByText('→')).toBeInTheDocument();
      expect(screen.getByText('0% no change')).toBeInTheDocument();
    });

    it('does not display trend when no previous value', () => {
      const metricWithoutPrevious = [{
        id: '1',
        label: 'Heart Rate',
        value: 72,
        unit: 'bpm',
      }];

      render(<HealthSummaryCards metrics={metricWithoutPrevious} />);

      expect(screen.queryByText('↗')).not.toBeInTheDocument();
      expect(screen.queryByText('↘')).not.toBeInTheDocument();
      expect(screen.queryByText('→')).not.toBeInTheDocument();
    });
  });

  describe('Goal Progress Visualization', () => {
    it('displays goal progress bar when goal data provided', () => {
      const metricWithGoal = [{
        id: '1',
        label: 'Steps',
        value: 8500,
        unit: 'steps',
        goalTarget: 10000,
        goalCurrent: 8500,
      }];

      render(<HealthSummaryCards metrics={metricWithGoal} />);

      expect(screen.getByText('Goal Progress')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Current: 8,500')).toBeInTheDocument();
      expect(screen.getByText('Target: 10,000')).toBeInTheDocument();

      const progressBar = screen.getByRole('progressbar');

      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '85');
    });

    it('displays completed goal with checkmark', () => {
      const completedGoalMetric = [{
        id: '1',
        label: 'Steps',
        value: 10500,
        unit: 'steps',
        goalTarget: 10000,
        goalCurrent: 10500,
      }];

      render(<HealthSummaryCards metrics={completedGoalMetric} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('does not display goal progress when no goal data', () => {
      const metricWithoutGoal = [{
        id: '1',
        label: 'Heart Rate',
        value: 72,
        unit: 'bpm',
      }];

      render(<HealthSummaryCards metrics={metricWithoutGoal} />);

      expect(screen.queryByText('Goal Progress')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Grid Layout', () => {
    it('applies correct grid classes for different metric counts', () => {
      const { rerender } = render(<HealthSummaryCards metrics={[mockMetrics[0]]} />);
      let grid = screen.getByTestId('health-summary-cards-grid');

      expect(grid).toHaveClass('grid-cols-1');

      rerender(<HealthSummaryCards metrics={mockMetrics.slice(0, 2)} />);
      grid = screen.getByTestId('health-summary-cards-grid');

      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2');

      rerender(<HealthSummaryCards metrics={mockMetrics.slice(0, 3)} />);
      grid = screen.getByTestId('health-summary-cards-grid');

      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');

      rerender(<HealthSummaryCards metrics={mockMetrics} />);
      grid = screen.getByTestId('health-summary-cards-grid');

      expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
    });
  });

  describe('Summary Statistics', () => {
    it('displays summary stats for multiple metrics', () => {
      render(<HealthSummaryCards metrics={mockMetrics} />);

      expect(screen.getByText('With Trends')).toBeInTheDocument();
      expect(screen.getByText('With Goals')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Improving')).toBeInTheDocument();

      // Check counts
      expect(screen.getByText('2')).toBeInTheDocument(); // metrics with trends
      expect(screen.getByText('3')).toBeInTheDocument(); // metrics with goals
      expect(screen.getByText('0')).toBeInTheDocument(); // completed goals
      expect(screen.getByText('1')).toBeInTheDocument(); // improving trends
    });

    it('does not display summary stats for single metric', () => {
      render(<HealthSummaryCards metrics={[mockMetrics[0]]} />);

      expect(screen.queryByText('With Trends')).not.toBeInTheDocument();
      expect(screen.queryByText('With Goals')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('has proper ARIA labels and roles', () => {
      render(<HealthSummaryCards metrics={mockMetrics} />);

      const region = screen.getByRole('region');

      expect(region).toHaveAttribute('aria-label', 'Health summary cards');

      const buttons = screen.getAllByRole('button');

      expect(buttons).toHaveLength(4); // One for each metric card

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
        expect(button).toHaveAttribute('tabIndex', '0');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<HealthSummaryCards metrics={mockMetrics} />);

      const firstCard = screen.getAllByRole('button')[0];

      // Focus the first card
      await user.tab();

      expect(firstCard).toHaveFocus();

      // Press Enter
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: 'health_summary_card_clicked',
          }),
        );
      });

      // Press Space
      await user.keyboard(' ');
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledTimes(6); // 4 view events + 2 click events
      });
    });

    it('has proper progress bar accessibility', () => {
      const metricWithGoal = [{
        id: '1',
        label: 'Steps',
        value: 8500,
        unit: 'steps',
        goalTarget: 10000,
        goalCurrent: 8500,
      }];

      render(<HealthSummaryCards metrics={metricWithGoal} />);

      const progressBar = screen.getByRole('progressbar');

      expect(progressBar).toHaveAttribute('aria-valuenow', '85');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-label', 'Goal progress: 85%');
    });
  });

  describe('Behavior Tracking Integration', () => {
    it('tracks component view on mount', async () => {
      render(<HealthSummaryCards metrics={mockMetrics} />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'health_summary_cards_viewed',
          entityType: 'ui_interaction',
          context: {
            ui: {
              componentName: 'HealthSummaryCards',
              action: 'view',
            },
            healthData: {
              value: 4,
            },
            performance: {
              loadTime: 1000,
            },
          },
        });
      });
    });

    it('tracks individual card views on mount', async () => {
      render(<HealthSummaryCards metrics={[mockMetrics[0]]} />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'health_summary_card_viewed',
          entityType: 'ui_interaction',
          context: {
            ui: {
              componentName: 'HealthSummaryCards',
              elementId: 'SummaryCard',
              action: 'view',
            },
            healthData: {
              recordType: 'Weight',
              value: 70,
              unit: 'kg',
              metricId: '1',
            },
          },
        });
      });
    });

    it('tracks card clicks', async () => {
      const user = userEvent.setup();
      render(<HealthSummaryCards metrics={[mockMetrics[0]]} />);

      const card = screen.getByRole('button');
      await user.click(card);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'health_summary_card_clicked',
          entityType: 'ui_interaction',
          context: {
            ui: {
              componentName: 'HealthSummaryCards',
              elementId: 'SummaryCard',
              action: 'click',
            },
            healthData: {
              recordType: 'Weight',
              value: 70,
              unit: 'kg',
              metricId: '1',
            },
          },
        });
      });
    });
  });

  describe('Helper Functions', () => {
    describe('calculatePercentageChange', () => {
      it('calculates positive percentage change correctly', () => {
        expect(calculatePercentageChange(110, 100)).toBe(10);
        expect(calculatePercentageChange(150, 100)).toBe(50);
      });

      it('calculates negative percentage change correctly', () => {
        expect(calculatePercentageChange(90, 100)).toBe(-10);
        expect(calculatePercentageChange(50, 100)).toBe(-50);
      });

      it('returns 0 when previous value is 0', () => {
        expect(calculatePercentageChange(100, 0)).toBe(0);
      });

      it('returns 0 when values are equal', () => {
        expect(calculatePercentageChange(100, 100)).toBe(0);
      });
    });

    describe('determineTrendDirection', () => {
      it('returns "up" for positive change', () => {
        expect(determineTrendDirection(110, 100)).toBe('up');
      });

      it('returns "down" for negative change', () => {
        expect(determineTrendDirection(90, 100)).toBe('down');
      });

      it('returns "neutral" for no change', () => {
        expect(determineTrendDirection(100, 100)).toBe('neutral');
      });

      it('returns "neutral" for very small changes', () => {
        expect(determineTrendDirection(100.005, 100)).toBe('neutral');
      });

      it('returns "neutral" when no previous value', () => {
        expect(determineTrendDirection(100)).toBe('neutral');
        expect(determineTrendDirection(100, 0)).toBe('neutral');
      });
    });

    describe('formatPercentage', () => {
      it('formats small percentages correctly', () => {
        expect(formatPercentage(0.05)).toBe('0%');
        expect(formatPercentage(0.5)).toBe('0.5%');
      });

      it('formats medium percentages correctly', () => {
        expect(formatPercentage(5.7)).toBe('6%');
        expect(formatPercentage(15.3)).toBe('15%');
      });

      it('handles negative percentages', () => {
        expect(formatPercentage(-5.7)).toBe('6%');
        expect(formatPercentage(-0.05)).toBe('0%');
      });
    });

    describe('calculateTrendData', () => {
      it('returns null when no previous value', () => {
        expect(calculateTrendData(100)).toBeNull();
      });

      it('calculates trend data correctly for positive change', () => {
        const result = calculateTrendData(110, 100);

        expect(result).toEqual({
          direction: 'up',
          percentage: 10,
          isImprovement: true,
        });
      });

      it('calculates trend data correctly for negative change', () => {
        const result = calculateTrendData(90, 100);

        expect(result).toEqual({
          direction: 'down',
          percentage: 10,
          isImprovement: false,
        });
      });
    });

    describe('calculateGoalProgress', () => {
      it('returns null when no goal data', () => {
        expect(calculateGoalProgress()).toBeNull();
        expect(calculateGoalProgress(100)).toBeNull();
        expect(calculateGoalProgress(undefined, 100)).toBeNull();
      });

      it('calculates progress correctly', () => {
        const result = calculateGoalProgress(75, 100);

        expect(result).toEqual({
          percentage: 75,
          isCompleted: false,
          remaining: 25,
        });
      });

      it('handles completed goals', () => {
        const result = calculateGoalProgress(100, 100);

        expect(result).toEqual({
          percentage: 100,
          isCompleted: true,
          remaining: 0,
        });
      });

      it('caps progress at 100%', () => {
        const result = calculateGoalProgress(150, 100);

        expect(result).toEqual({
          percentage: 100,
          isCompleted: true,
          remaining: 0,
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('handles invalid metric data gracefully', () => {
      const invalidMetrics = [
        {
          id: '1',
          label: 'Invalid',
          value: Number.NaN,
          unit: 'test',
        },
      ] as HealthSummaryMetric[];

      expect(() => {
        render(<HealthSummaryCards metrics={invalidMetrics} />);
      }).not.toThrow();

      expect(screen.getByText('Invalid')).toBeInTheDocument();
    });

    it('handles missing required properties', () => {
      const incompleteMetrics = [
        {
          id: '1',
          value: 100,
        },
      ] as HealthSummaryMetric[];

      expect(() => {
        render(<HealthSummaryCards metrics={incompleteMetrics} />);
      }).not.toThrow();
    });
  });
});
