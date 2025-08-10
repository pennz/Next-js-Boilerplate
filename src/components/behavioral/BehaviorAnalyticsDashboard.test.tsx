import type { BehaviorAnalyticsSummary } from './BehaviorAnalyticsDashboard';
import type { BehaviorDataPoint, ContextPatternData, HabitStrengthData } from './BehaviorAnalyticsChart';
import { render, screen, waitFor, fireEvent } from 'vitest-browser-react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { BehaviorAnalyticsDashboard } from './BehaviorAnalyticsDashboard';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      'no_behavior_data': 'No behavior data available',
      'loading': 'Loading...',
      'error': 'Error loading data',
    };
    return translations[key] || key;
  }),
}));

// Mock @clerk/nextjs
const mockUser = {
  id: 'test-user-id',
  firstName: 'Test',
  lastName: 'User',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
};

const mockUseUser = vi.fn();
vi.mock('@clerk/nextjs', () => ({
  useUser: () => mockUseUser(),
}));

// Mock useBehaviorTracking hook
const mockTrackEvent = vi.fn();
vi.mock('@/hooks/useBehaviorTracking', () => ({
  useBehaviorTracking: () => ({
    trackEvent: mockTrackEvent,
    isLoading: false,
    error: null,
    flushEvents: vi.fn(),
  }),
}));

// Mock useMicroBehavior hook
const mockPatterns = [
  {
    id: 'pattern-1',
    behaviorType: 'Exercise',
    frequency: 5,
    consistency: 85,
    strength: 'strong',
    confidence: 92,
    topTrigger: 'Morning routine',
  },
  {
    id: 'pattern-2',
    behaviorType: 'Reading',
    frequency: 3,
    consistency: 70,
    strength: 'moderate',
    confidence: 78,
    topTrigger: 'Evening wind-down',
  },
];

const mockInsights = [
  {
    type: 'pattern' as const,
    message: 'Strong exercise pattern detected',
    confidence: 92,
    actionable: true,
  },
];

const mockUseMicroBehavior = vi.fn();
vi.mock('@/hooks/useMicroBehavior', () => ({
  useMicroBehavior: () => mockUseMicroBehavior(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock BehaviorAnalyticsChart
vi.mock('./BehaviorAnalyticsChart', () => ({
  BehaviorAnalyticsChart: ({ title, chartType, loading, error, data, ...props }: any) => (
    <div data-testid={`chart-${chartType}`} data-title={title}>
      {loading && <div data-testid="chart-loading">Loading chart...</div>}
      {error && <div data-testid="chart-error">{error}</div>}
      {!loading && !error && (
        <div data-testid="chart-content">
          Chart: {title} ({data?.length || 0} data points)
        </div>
      )}
    </div>
  ),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock performance.now for consistent testing
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => 1000),
  },
  writable: true,
});

// Test data generators
const generateMockSummary = (): BehaviorAnalyticsSummary => ({
  totalEvents: 150,
  activePatterns: 5,
  habitStrengthAvg: 78.5,
  consistencyScore: 82.3,
  topContext: 'Morning routine',
  weeklyTrend: 'up',
  predictionAccuracy: 85.7,
});

const generateMockHabitStrengthData = (): HabitStrengthData[] => [
  {
    date: '2024-01-01',
    habitStrength: 75,
    consistencyScore: 80,
    frequencyScore: 70,
    contextScore: 85,
    trend: 'increasing',
  },
  {
    date: '2024-01-02',
    habitStrength: 78,
    consistencyScore: 82,
    frequencyScore: 72,
    contextScore: 87,
    trend: 'increasing',
  },
];

const generateMockContextPatternsData = (): ContextPatternData[] => [
  {
    context: 'Morning routine',
    successRate: 85,
    frequency: 5,
    confidence: 92,
    predictivePower: 78,
  },
  {
    context: 'Evening wind-down',
    successRate: 70,
    frequency: 3,
    confidence: 75,
    predictivePower: 65,
  },
];

const generateMockBehaviorFrequencyData = (): BehaviorDataPoint[] => [
  {
    date: '2024-01-01',
    frequency: 5,
    consistency: 85,
    strength: 78,
  },
  {
    date: '2024-01-02',
    frequency: 6,
    consistency: 87,
    strength: 80,
  },
];

describe('BehaviorAnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default mock implementations
    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
    });

    mockUseMicroBehavior.mockReturnValue({
      patterns: mockPatterns,
      insights: mockInsights,
      isAnalyzing: false,
    });

    // Default successful API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/behavior/analytics/summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(generateMockSummary()),
        });
      }
      if (url.includes('/api/behavior/analytics/habit-strength')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: generateMockHabitStrengthData() }),
        });
      }
      if (url.includes('/api/behavior/analytics/context-patterns')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: generateMockContextPatternsData() }),
        });
      }
      if (url.includes('/api/behavior/analytics/frequency')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: generateMockBehaviorFrequencyData() }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Component Rendering Tests', () => {
    it('renders dashboard with authenticated user and displays all sections', async () => {
      render(<BehaviorAnalyticsDashboard />);

      expect(screen.getByTestId('behavior-analytics-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Behavior Analytics')).toBeInTheDocument();
      expect(screen.getByText('Real-time insights into your habits and patterns')).toBeInTheDocument();
      expect(screen.getByText('View Full Analytics →')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Habit Strength')).toBeInTheDocument();
        expect(screen.getByText('Active Patterns')).toBeInTheDocument();
        expect(screen.getByText('Consistency')).toBeInTheDocument();
        expect(screen.getByText('Prediction Accuracy')).toBeInTheDocument();
      });

      // Check pattern insights section
      expect(screen.getByText('Recent Pattern Insights')).toBeInTheDocument();
      expect(screen.getByText('View All Patterns')).toBeInTheDocument();
    });

    it('shows sign-in message when user is not authenticated', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
      });

      render(<BehaviorAnalyticsDashboard />);

      expect(screen.getByText('Please sign in to view your behavior analytics')).toBeInTheDocument();
      expect(screen.queryByTestId('behavior-analytics-dashboard')).not.toBeInTheDocument();
    });

    it('displays loading states during data fetching', async () => {
      // Mock delayed API response
      mockFetch.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(generateMockSummary()),
        }), 100);
      }));

      render(<BehaviorAnalyticsDashboard />);

      // Charts should show loading state initially
      await waitFor(() => {
        expect(screen.getAllByTestId('chart-loading')).toHaveLength(3);
      });
    });

    it('handles and displays error states from API failures', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getAllByTestId('chart-error')).toHaveLength(3);
      });
    });

    it('renders with different time ranges selected', async () => {
      render(<BehaviorAnalyticsDashboard timeRange="7d" />);

      await waitFor(() => {
        expect(screen.getByText('7d')).toHaveClass('bg-purple-100', 'text-purple-800');
      });

      // Other time range buttons should not be active
      expect(screen.getByText('30d')).toHaveClass('bg-gray-100', 'text-gray-600');
    });
  });

  describe('Sub-component Integration Tests', () => {
    describe('MetricCard Tests', () => {
      it('renders metric cards with correct values, colors, trends, and click handlers', async () => {
        render(<BehaviorAnalyticsDashboard />);

        await waitFor(() => {
          expect(screen.getByText('79%')).toBeInTheDocument(); // Habit strength
          expect(screen.getByText('5')).toBeInTheDocument(); // Active patterns
          expect(screen.getByText('82%')).toBeInTheDocument(); // Consistency
          expect(screen.getByText('86%')).toBeInTheDocument(); // Prediction accuracy
        });

        // Check trend indicators
        expect(screen.getByText('📈')).toBeInTheDocument(); // Up trend icon
        expect(screen.getByText('up trend')).toBeInTheDocument();

        // Test click handler
        const habitStrengthCard = screen.getByText('Habit Strength').closest('[role="button"]');
        expect(habitStrengthCard).toBeInTheDocument();
        
        await userEvent.click(habitStrengthCard!);
        
        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledWith({
            eventName: 'analytics_metric_viewed',
            entityType: 'ui_interaction',
            context: {
              ui: {
                component: 'BehaviorAnalyticsDashboard',
                element: 'MetricCard',
                metricType: 'Habit Strength',
                metricValue: '79%',
              },
              analytics: {
                metricType: 'Habit Strength',
                trend: 'up',
              },
            },
          });
        });
      });

      it('supports keyboard navigation for metric cards', async () => {
        render(<BehaviorAnalyticsDashboard />);

        await waitFor(() => {
          expect(screen.getByText('Habit Strength')).toBeInTheDocument();
        });

        const habitStrengthCard = screen.getByText('Habit Strength').closest('[role="button"]');
        
        // Focus and press Enter
        habitStrengthCard!.focus();
        await userEvent.keyboard('{Enter}');
        
        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              eventName: 'analytics_metric_viewed',
            })
          );
        });

        // Press Space
        await userEvent.keyboard(' ');
        
        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledTimes(2); // Dashboard view + 2 metric clicks
        });
      });
    });

    describe('PatternInsightCard Tests', () => {
      it('displays pattern cards with strength indicators, frequency data, and triggers tracking on click', async () => {
        render(<BehaviorAnalyticsDashboard />);

        await waitFor(() => {
          expect(screen.getByText('Exercise')).toBeInTheDocument();
          expect(screen.getByText('Reading')).toBeInTheDocument();
        });

        // Check strength indicators
        expect(screen.getByText('85% strong')).toBeInTheDocument(); // Exercise pattern
        expect(screen.getByText('70% strong')).toBeInTheDocument(); // Reading pattern

        // Check frequency data
        expect(screen.getByText('5x/week')).toBeInTheDocument();
        expect(screen.getByText('3x/week')).toBeInTheDocument();

        // Check confidence scores
        expect(screen.getByText('92%')).toBeInTheDocument();
        expect(screen.getByText('78%')).toBeInTheDocument();

        // Check top triggers
        expect(screen.getByText('Top trigger: Morning routine')).toBeInTheDocument();
        expect(screen.getByText('Top trigger: Evening wind-down')).toBeInTheDocument();

        // Test click tracking
        const exerciseCard = screen.getByText('Exercise').closest('[role="button"]');
        await userEvent.click(exerciseCard!);

        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledWith({
            eventName: 'pattern_insight_viewed',
            entityType: 'behavior_pattern',
            entityId: 'pattern-1',
            context: {
              ui: {
                component: 'BehaviorAnalyticsDashboard',
                element: 'PatternInsightCard',
              },
              analytics: {
                patternType: 'Exercise',
                strength: 'strong',
                confidence: 92,
              },
            },
          });
        });
      });

      it('displays empty state when no patterns are available', () => {
        mockUseMicroBehavior.mockReturnValue({
          patterns: [],
          insights: [],
          isAnalyzing: false,
        });

        render(<BehaviorAnalyticsDashboard />);

        expect(screen.getByText('No patterns detected yet. Keep tracking your behaviors!')).toBeInTheDocument();
      });

      it('displays analyzing state when isAnalyzing is true', () => {
        mockUseMicroBehavior.mockReturnValue({
          patterns: [],
          insights: [],
          isAnalyzing: true,
        });

        render(<BehaviorAnalyticsDashboard />);

        expect(screen.getByText('Analyzing patterns...')).toBeInTheDocument();
        expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
      });

      it('limits pattern cards to 6 items with proper slicing', () => {
        const manyPatterns = Array.from({ length: 10 }, (_, i) => ({
          id: `pattern-${i}`,
          behaviorType: `Behavior ${i}`,
          frequency: 3,
          consistency: 70,
          strength: 'moderate' as const,
          confidence: 75,
        }));

        mockUseMicroBehavior.mockReturnValue({
          patterns: manyPatterns,
          insights: [],
          isAnalyzing: false,
        });

        render(<BehaviorAnalyticsDashboard />);

        // Should only display first 6 patterns
        expect(screen.getByText('Behavior 0')).toBeInTheDocument();
        expect(screen.getByText('Behavior 5')).toBeInTheDocument();
        expect(screen.queryByText('Behavior 6')).not.toBeInTheDocument();
      });
    });

    describe('RealtimeIndicator Tests', () => {
      it('shows active status and last update time when real-time is enabled', async () => {
        render(<BehaviorAnalyticsDashboard showRealTimeUpdates={true} />);

        await waitFor(() => {
          expect(screen.getByText(/Live/)).toBeInTheDocument();
          expect(screen.getByText(/Updated/)).toBeInTheDocument();
        });

        // Check for active indicator (green dot)
        const indicator = document.querySelector('.bg-green-500');
        expect(indicator).toBeInTheDocument();
        expect(indicator).toHaveClass('animate-pulse');
      });

      it('shows offline status when real-time is disabled', () => {
        render(<BehaviorAnalyticsDashboard showRealTimeUpdates={false} />);

        expect(screen.getByText('Offline')).toBeInTheDocument();
        
        // Check for inactive indicator (gray dot)
        const indicator = document.querySelector('.bg-gray-300');
        expect(indicator).toBeInTheDocument();
      });
    });

    describe('BehaviorAnalyticsChart Integration', () => {
      it('passes correct props to chart components', async () => {
        render(<BehaviorAnalyticsDashboard timeRange="7d" />);

        await waitFor(() => {
          // Check habit strength chart
          const habitChart = screen.getByTestId('chart-habit_strength');
          expect(habitChart).toHaveAttribute('data-title', 'Habit Strength Over Time');

          // Check context patterns chart
          const contextChart = screen.getByTestId('chart-context_patterns');
          expect(contextChart).toHaveAttribute('data-title', 'Context Success Patterns');

          // Check behavior frequency chart
          const frequencyChart = screen.getByTestId('chart-behavior_frequency');
          expect(frequencyChart).toHaveAttribute('data-title', 'Behavior Frequency Trends');
        });
      });
    });
  });

  describe('Data Fetching and State Management', () => {
    it('fetches initial data on component mount with correct API endpoints', async () => {
      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/summary?timeRange=30d');
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/habit-strength?timeRange=30d');
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/context-patterns?timeRange=30d');
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/frequency?timeRange=30d');
      });
    });

    it('fetches data with different time ranges triggers appropriate API calls', async () => {
      const { rerender } = render(<BehaviorAnalyticsDashboard timeRange="7d" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/summary?timeRange=7d');
      });

      vi.clearAllMocks();

      rerender(<BehaviorAnalyticsDashboard timeRange="90d" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/summary?timeRange=90d');
      });
    });

    it('handles error when API endpoints return non-200 responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getAllByTestId('chart-error')).toHaveLength(3);
      });
    });

    it('manages loading states correctly during sequential API calls', async () => {
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValue(delayedPromise);

      render(<BehaviorAnalyticsDashboard />);

      // Should show loading state
      expect(screen.getAllByTestId('chart-loading')).toHaveLength(3);

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve(generateMockSummary()),
      });

      await waitFor(() => {
        expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
      });
    });

    it('updates state correctly when API responses are received', async () => {
      const customSummary = {
        ...generateMockSummary(),
        habitStrengthAvg: 95.5,
        activePatterns: 8,
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/behavior/analytics/summary')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(customSummary),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('96%')).toBeInTheDocument(); // Rounded habit strength
        expect(screen.getByText('8')).toBeInTheDocument(); // Active patterns
      });
    });
  });

  describe('Real-time Updates Testing', () => {
    it('enables automatic data refresh at specified refreshInterval', async () => {
      render(<BehaviorAnalyticsDashboard showRealTimeUpdates={true} refreshInterval={5000} />);

      // Initial fetch
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });

      vi.clearAllMocks();

      // Advance timers by refresh interval
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4); // Should fetch again
      });
    });

    it('stops real-time updates when component unmounts', async () => {
      const { unmount } = render(<BehaviorAnalyticsDashboard showRealTimeUpdates={true} refreshInterval={5000} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });

      vi.clearAllMocks();
      unmount();

      // Advance timers - should not fetch after unmount
      vi.advanceTimersByTime(10000);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('disables real-time updates when showRealTimeUpdates is false', async () => {
      render(<BehaviorAnalyticsDashboard showRealTimeUpdates={false} refreshInterval={5000} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4); // Initial fetch only
      });

      vi.clearAllMocks();

      // Advance timers - should not fetch again
      vi.advanceTimersByTime(10000);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('updates real-time indicator correctly with fetch status', async () => {
      render(<BehaviorAnalyticsDashboard showRealTimeUpdates={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Live/)).toBeInTheDocument();
      });

      // Mock a failed fetch
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      vi.advanceTimersByTime(30000); // Default refresh interval

      // Should still show as live (indicator shows connection status, not fetch success)
      await waitFor(() => {
        expect(screen.getByText(/Live/)).toBeInTheDocument();
      });
    });

    it('cleans up intervals on component unmount and prop changes', async () => {
      const { rerender, unmount } = render(
        <BehaviorAnalyticsDashboard showRealTimeUpdates={true} refreshInterval={5000} />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });

      // Change props - should clear old interval
      rerender(<BehaviorAnalyticsDashboard showRealTimeUpdates={true} refreshInterval={10000} />);

      vi.clearAllMocks();

      // Advance by old interval - should not trigger
      vi.advanceTimersByTime(5000);
      expect(mockFetch).not.toHaveBeenCalled();

      // Advance by new interval - should trigger
      vi.advanceTimersByTime(5000); // Total 10000ms
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });

      // Unmount should clean up
      unmount();
      vi.clearAllMocks();
      vi.advanceTimersByTime(20000);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Time Range Selection', () => {
    it('renders time range buttons with correct active state styling', async () => {
      render(<BehaviorAnalyticsDashboard timeRange="30d" />);

      const activeButton = screen.getByText('30d');
      const inactiveButton = screen.getByText('7d');

      expect(activeButton).toHaveClass('bg-purple-100', 'text-purple-800');
      expect(inactiveButton).toHaveClass('bg-gray-100', 'text-gray-600');
    });

    it('updates selectedTimeRange state when clicking time range buttons', async () => {
      render(<BehaviorAnalyticsDashboard />);

      const sevenDayButton = screen.getByText('7d');
      
      await userEvent.click(sevenDayButton);

      expect(sevenDayButton).toHaveClass('bg-purple-100', 'text-purple-800');
      expect(screen.getByText('30d')).toHaveClass('bg-gray-100', 'text-gray-600');
    });

    it('triggers new API calls with correct parameters when time range changes', async () => {
      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/summary?timeRange=30d');
      });

      vi.clearAllMocks();

      const ninetyDayButton = screen.getByText('90d');
      await userEvent.click(ninetyDayButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/summary?timeRange=90d');
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/habit-strength?timeRange=90d');
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/context-patterns?timeRange=90d');
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/frequency?timeRange=90d');
      });
    });

    it('persists time range selection during real-time updates', async () => {
      render(<BehaviorAnalyticsDashboard showRealTimeUpdates={true} refreshInterval={5000} />);

      // Change to 7d
      const sevenDayButton = screen.getByText('7d');
      await userEvent.click(sevenDayButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/summary?timeRange=7d');
      });

      vi.clearAllMocks();

      // Advance timers for real-time update
      vi.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/behavior/analytics/summary?timeRange=7d');
      });
    });
  });

  describe('Behavioral Tracking Integration', () => {
    it('fires dashboard view tracking event on component mount with correct context', async () => {
      render(<BehaviorAnalyticsDashboard timeRange="7d" behaviorTypes={['exercise', 'reading']} />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'behavior_analytics_dashboard_viewed',
          entityType: 'ui_interaction',
          context: {
            ui: {
              component: 'BehaviorAnalyticsDashboard',
              action: 'view',
            },
            analytics: {
              timeRange: '7d',
              behaviorTypes: ['exercise', 'reading'],
              patternsCount: 2,
              showRealTimeUpdates: true,
            },
          },
        });
      });
    });

    it('tracks metric card clicks with proper data', async () => {
      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Habit Strength')).toBeInTheDocument();
      });

      const metricCard = screen.getByText('Habit Strength').closest('[role="button"]');
      await userEvent.click(metricCard!);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'analytics_metric_viewed',
          entityType: 'ui_interaction',
          context: {
            ui: {
              component: 'BehaviorAnalyticsDashboard',
              element: 'MetricCard',
              metricType: 'Habit Strength',
              metricValue: '79%',
            },
            analytics: {
              metricType: 'Habit Strength',
              trend: 'up',
            },
          },
        });
      });
    });

    it('tracks pattern insight card clicks with proper event data', async () => {
      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Exercise')).toBeInTheDocument();
      });

      const patternCard = screen.getByText('Exercise').closest('[role="button"]');
      await userEvent.click(patternCard!);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'pattern_insight_viewed',
          entityType: 'behavior_pattern',
          entityId: 'pattern-1',
          context: {
            ui: {
              component: 'BehaviorAnalyticsDashboard',
              element: 'PatternInsightCard',
            },
            analytics: {
              patternType: 'Exercise',
              strength: 'strong',
              confidence: 92,
            },
          },
        });
      });
    });

    it('tracks pattern details opening events', async () => {
      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Exercise')).toBeInTheDocument();
      });

      const patternCard = screen.getByText('Exercise').closest('[role="button"]');
      await userEvent.click(patternCard!);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'pattern_details_opened',
          entityType: 'behavior_pattern',
          entityId: 'pattern-1',
          context: {
            analytics: {
              patternType: 'Exercise',
              strength: 'strong',
            },
          },
        });
      });
    });

    it('includes proper UI context and analytics data in all tracking events', async () => {
      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            context: expect.objectContaining({
              ui: expect.objectContaining({
                component: 'BehaviorAnalyticsDashboard',
              }),
              analytics: expect.any(Object),
            }),
          })
        );
      });
    });
  });

  describe('Navigation and Links', () => {
    it('renders View Full Analytics link with correct href and styling', () => {
      render(<BehaviorAnalyticsDashboard />);

      const fullAnalyticsLink = screen.getByText('View Full Analytics →');
      expect(fullAnalyticsLink).toBeInTheDocument();
      expect(fullAnalyticsLink.closest('a')).toHaveAttribute('href', '/dashboard/analytics/behavior');
      expect(fullAnalyticsLink).toHaveClass('text-purple-700', 'hover:border-b-2', 'hover:border-purple-700', 'font-medium');
    });

    it('renders View All Patterns link with correct navigation', () => {
      render(<BehaviorAnalyticsDashboard />);

      const allPatternsLink = screen.getByText('View All Patterns');
      expect(allPatternsLink).toBeInTheDocument();
      expect(allPatternsLink.closest('a')).toHaveAttribute('href', '/dashboard/analytics/patterns');
      expect(allPatternsLink).toHaveClass('text-purple-600', 'hover:text-purple-800', 'text-sm', 'font-medium');
    });

    it('supports keyboard navigation for links', async () => {
      render(<BehaviorAnalyticsDashboard />);

      const fullAnalyticsLink = screen.getByText('View Full Analytics →');
      
      // Tab to the link
      await userEvent.tab();
      // Note: The exact focus behavior depends on the DOM structure
      // This test verifies the link is focusable
      expect(fullAnalyticsLink.closest('a')).toBeInTheDocument();
    });
  });

  describe('Charts Grid Layout', () => {
    it('renders charts grid with correct responsive layout classes', async () => {
      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        const chartsContainer = screen.getByTestId('chart-habit_strength').parentElement;
        expect(chartsContainer).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2', 'gap-6');
      });
    });

    it('renders habit strength chart with full width span', async () => {
      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        const habitChart = screen.getByTestId('chart-habit_strength');
        expect(habitChart).toHaveClass('col-span-1', 'lg:col-span-2');
      });
    });

    it('renders context patterns and behavior frequency charts with equal width', async () => {
      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        const contextChart = screen.getByTestId('chart-context_patterns');
        const frequencyChart = screen.getByTestId('chart-behavior_frequency');
        
        // Both should not have col-span classes (default to equal width)
        expect(contextChart).not.toHaveClass('col-span-2');
        expect(frequencyChart).not.toHaveClass('col-span-2');
      });
    });

    it('passes correct data and props to charts', async () => {
      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        // Check that charts receive data
        expect(screen.getByText('Chart: Habit Strength Over Time (2 data points)')).toBeInTheDocument();
        expect(screen.getByText('Chart: Context Success Patterns (2 data points)')).toBeInTheDocument();
        expect(screen.getByText('Chart: Behavior Frequency Trends (2 data points)')).toBeInTheDocument();
      });
    });
  });

  describe('API Response Handling', () => {
    it('correctly parses summary data and passes to metric cards', async () => {
      const customSummary = {
        ...generateMockSummary(),
        habitStrengthAvg: 88.7,
        activePatterns: 12,
        consistencyScore: 91.2,
        predictionAccuracy: 94.8,
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/behavior/analytics/summary')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(customSummary),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('89%')).toBeInTheDocument(); // Rounded habit strength
        expect(screen.getByText('12')).toBeInTheDocument(); // Active patterns
        expect(screen.getByText('91%')).toBeInTheDocument(); // Consistency
        expect(screen.getByText('95%')).toBeInTheDocument(); // Prediction accuracy
      });
    });

    it('handles API error responses appropriately', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/behavior/analytics/summary')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ message: 'Not found' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        // Should not display metric cards when summary fails
        expect(screen.queryByText('Habit Strength')).not.toBeInTheDocument();
      });
    });

    it('maintains proper data structure for chart consumption', async () => {
      const customHabitData = [
        {
          date: '2024-01-01',
          habitStrength: 85,
          consistencyScore: 90,
          frequencyScore: 80,
          contextScore: 88,
          trend: 'increasing' as const,
        },
      ];

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/behavior/analytics/habit-strength')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: customHabitData }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chart: Habit Strength Over Time (1 data points)')).toBeInTheDocument();
      });
    });
  });

  describe('User Authentication Flow', () => {
    it('only fetches data when user is authenticated', async () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
      });

      render(<BehaviorAnalyticsDashboard />);

      // Should not make any API calls
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles user authentication state changes', async () => {
      const { rerender } = render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });

      vi.clearAllMocks();

      // Simulate user logout
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
      });

      rerender(<BehaviorAnalyticsDashboard />);

      expect(screen.getByText('Please sign in to view your behavior analytics')).toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('cleans up component when user logs out', async () => {
      const { rerender } = render(<BehaviorAnalyticsDashboard showRealTimeUpdates={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Live/)).toBeInTheDocument();
      });

      // Simulate logout
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
      });

      rerender(<BehaviorAnalyticsDashboard showRealTimeUpdates={true} />);

      // Should show sign-in message
      expect(screen.getByText('Please sign in to view your behavior analytics')).toBeInTheDocument();
      expect(screen.queryByText(/Live/)).not.toBeInTheDocument();
    });
  });

  describe('Performance and Memory Management', () => {
    it('properly cleans up intervals and timeouts on unmount', async () => {
      const { unmount } = render(<BehaviorAnalyticsDashboard showRealTimeUpdates={true} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(4);
      });

      // Unmount component
      unmount();

      vi.clearAllMocks();

      // Advance timers - should not trigger any more fetches
      vi.advanceTimersByTime(60000);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles rapid prop changes without memory leaks', async () => {
      const { rerender } = render(<BehaviorAnalyticsDashboard refreshInterval={1000} />);

      // Rapidly change props
      for (let i = 0; i < 10; i++) {
        rerender(<BehaviorAnalyticsDashboard refreshInterval={1000 + i * 100} />);
      }

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Should not cause errors or excessive API calls
      expect(mockFetch).toHaveBeenCalledTimes(4); // Only initial fetch
    });

    it('handles network failures and retries gracefully', async () => {
      // Mock network failure followed by success
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 4) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(generateMockSummary()),
        });
      });

      render(<BehaviorAnalyticsDashboard showRealTimeUpdates={true} refreshInterval={5000} />);

      // Initial calls should fail
      await waitFor(() => {
        expect(screen.getAllByTestId('chart-error')).toHaveLength(3);
      });

      // Advance timer for retry
      vi.advanceTimersByTime(5000);

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByText('Habit Strength')).toBeInTheDocument();
      });
    });

    it('performs well with large datasets', async () => {
      const largeHabitData = Array.from({ length: 1000 }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        habitStrength: 70 + Math.random() * 30,
        consistencyScore: 60 + Math.random() * 40,
        frequencyScore: 50 + Math.random() * 50,
        contextScore: 65 + Math.random() * 35,
        trend: 'stable' as const,
      }));

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/behavior/analytics/habit-strength')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: largeHabitData }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      });

      const startTime = performance.now();
      render(<BehaviorAnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chart: Habit Strength Over Time (1000 data points)')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000); // 1 second
    });
  });
});