import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { within, userEvent, expect } from '@storybook/test';
import { BehaviorAnalyticsContainer } from './BehaviorAnalyticsContainer';
import {
  createTestScenario,
  generateBehaviorAnalyticsSummary,
  generateBehaviorPatterns,
  generateHabitStrengthData,
  generateContextPatternsData,
  generateBehaviorFrequencyData,
  generateSummaryWithTrends,
  generatePatternsWithVariedStrength,
  generateBehaviorDataWithTrends,
  generateHabitStrengthTrends,
  generateContextPatternsVariedSuccess,
  generateSummaryEmpty,
  generatePatternsEmpty,
  generateEmptyBehaviorData,
  generateContextPatternsEmpty,
  createDeterministicData,
  generateLargeBehaviorDataset,
} from './BehaviorAnalyticsChart.fixtures';

// Mock hooks for Storybook
const mockUseBehaviorTracking = () => ({
  trackEvent: action('trackEvent'),
  isLoading: false,
  error: null,
  flushEvents: action('flushEvents'),
});

const mockUseMicroBehavior = (patterns: any[] = [], isAnalyzing = false) => ({
  patterns,
  insights: patterns.slice(0, 3),
  isAnalyzing,
  trackMicroBehavior: action('trackMicroBehavior'),
  getPatterns: action('getPatterns'),
  analyzePatterns: action('analyzePatterns'),
  trackContext: action('trackContext'),
  getContextPatterns: action('getContextPatterns'),
  correlateContextBehavior: action('correlateContextBehavior'),
  getRealtimeInsights: action('getRealtimeInsights'),
  detectAnomalies: action('detectAnomalies'),
  getPredictions: action('getPredictions'),
  isLoading: false,
  error: null,
  lastAnalysis: new Date(),
  flushMicroBehaviors: action('flushMicroBehaviors'),
});

const mockUseUser = (authenticated = true, loading = false) => ({
  user: authenticated ? {
    id: 'user_123',
    firstName: 'John',
    lastName: 'Doe',
    emailAddresses: [{ emailAddress: 'john@example.com' }],
  } : null,
  isLoaded: !loading,
  isSignedIn: authenticated,
});

// Mock fetch for API calls
const mockFetch = (responses: Record<string, any>) => {
  global.fetch = jest.fn((url: string) => {
    const endpoint = url.split('?')[0].split('/').pop();
    const response = responses[endpoint || 'default'];
    
    return Promise.resolve({
      ok: response?.ok !== false,
      status: response?.status || 200,
      json: () => Promise.resolve(response?.data || response || {}),
    } as Response);
  });
};

const meta: Meta<typeof BehaviorAnalyticsContainer> = {
  title: 'Behavioral/BehaviorAnalyticsContainer',
  component: BehaviorAnalyticsContainer,
  parameters: {
    docs: {
      description: {
        component: `
# Behavior Analytics Container

A comprehensive container component for displaying behavioral analytics with real-time updates, pattern insights, and interactive charts. This component handles data fetching and state management while delegating presentation to the BehaviorAnalyticsLayout component.

## Features

- **Real-time Updates**: Live data refresh with configurable intervals
- **Pattern Insights**: AI-powered behavior pattern detection and analysis
- **Interactive Charts**: Multiple chart types for different data visualizations
- **Metric Cards**: Key performance indicators with trend analysis
- **Time Range Selection**: Flexible time range filtering (7d, 30d, 90d, 1y)
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Accessibility**: Full keyboard navigation and screen reader support
- **Container/Layout Pattern**: Separation of data logic and presentation concerns

## Usage

\`\`\`tsx
import { BehaviorAnalyticsContainer } from '@/components/behavioral';

<BehaviorAnalyticsContainer
  timeRange="30d"
  behaviorTypes={['Exercise', 'Reading']}
  refreshInterval={30000}
  showRealTimeUpdates={true}
/>
\`\`\`

## Best Practices

- Use appropriate time ranges for different analysis needs
- Enable real-time updates for live monitoring scenarios
- Consider performance impact with large datasets
- Ensure proper error handling for network failures
- Test accessibility features with keyboard navigation
        `,
      },
    },
    layout: 'fullscreen',
  },
  args: {
    timeRange: '30d',
    behaviorTypes: ['Exercise', 'Reading', 'Meditation'],
    refreshInterval: 30000,
    showRealTimeUpdates: true,
  },
  argTypes: {
    timeRange: {
      control: { type: 'select' },
      options: ['7d', '30d', '90d', '1y'],
      description: 'Time range for analytics data',
      table: {
        type: { summary: "'7d' | '30d' | '90d' | '1y'" },
        defaultValue: { summary: "'30d'" },
      },
    },
    behaviorTypes: {
      control: { type: 'object' },
      description: 'Array of behavior types to filter',
      table: {
        type: { summary: 'string[]' },
        defaultValue: { summary: '[]' },
      },
    },
    refreshInterval: {
      control: { type: 'number', min: 5000, max: 300000, step: 5000 },
      description: 'Real-time update interval in milliseconds',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '30000' },
      },
    },
    showRealTimeUpdates: {
      control: { type: 'boolean' },
      description: 'Enable/disable real-time data updates',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    userAuthenticated: {
      control: { type: 'boolean' },
      description: 'Simulate user authentication state',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    dataState: {
      control: { type: 'select' },
      options: ['success', 'loading', 'error', 'empty'],
      description: 'Simulate different data loading states',
      table: {
        type: { summary: "'success' | 'loading' | 'error' | 'empty'" },
        defaultValue: { summary: "'success'" },
      },
    },
  },
  decorators: [
    (Story, context) => {
      const { userAuthenticated = true, dataState = 'success' } = context.args;
      
      // Mock hooks based on story args
      const patterns = dataState === 'empty' ? [] : generateBehaviorPatterns(6);
      const isAnalyzing = dataState === 'loading';
      
      // Setup API mocks based on data state
      const apiResponses = {
        summary: dataState === 'error' 
          ? { ok: false, status: 500, data: { message: 'Server error' } }
          : dataState === 'empty'
          ? { data: generateSummaryEmpty() }
          : { data: generateBehaviorAnalyticsSummary() },
        'habit-strength': dataState === 'error'
          ? { ok: false, status: 500 }
          : dataState === 'empty'
          ? { data: [] }
          : { data: generateHabitStrengthData() },
        'context-patterns': dataState === 'error'
          ? { ok: false, status: 500 }
          : dataState === 'empty'
          ? { data: [] }
          : { data: generateContextPatternsData() },
        frequency: dataState === 'error'
          ? { ok: false, status: 500 }
          : dataState === 'empty'
          ? { data: [] }
          : { data: generateBehaviorFrequencyData() },
      };
      
      mockFetch(apiResponses);
      
      // Mock hooks
      jest.mock('@/hooks/useBehaviorTracking', () => ({
        useBehaviorTracking: mockUseBehaviorTracking,
      }));
      
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(patterns, isAnalyzing),
      }));
      
      jest.mock('@clerk/nextjs', () => ({
        useUser: () => mockUseUser(userAuthenticated, dataState === 'loading'),
      }));
      
      return <Story />;
    },
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BehaviorAnalyticsContainer>;

// Primary Dashboard Stories
export const Default: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete dashboard with realistic data across all sections including metrics, charts, and patterns.',
      },
    },
  },
};

export const EmptyDashboard: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'empty',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with no data showing empty states and encouraging users to start tracking behaviors.',
      },
    },
  },
};

export const LoadingDashboard: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'loading',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard in loading state with skeleton components and loading indicators while data is being fetched.',
      },
    },
  },
};

export const ErrorDashboard: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'error',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with error states in various sections showing appropriate error messages and recovery options.',
      },
    },
  },
};

// Data State Variations
export const RichData: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
    timeRange: '90d',
  },
  decorators: [
    (Story) => {
      const richScenario = createTestScenario('rich-dashboard');
      mockFetch({
        summary: { data: richScenario.summary },
        'habit-strength': { data: richScenario.habitStrength },
        'context-patterns': { data: richScenario.contextPatterns },
        frequency: { data: richScenario.behaviorFrequency },
      });
      
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(richScenario.patterns, false),
      }));
      
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with extensive data including many patterns, high metrics, and comprehensive charts.',
      },
    },
  },
};

export const MinimalData: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
    timeRange: '7d',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { data: generateSummaryWithTrends('stable') },
        'habit-strength': { data: generateHabitStrengthData(7) },
        'context-patterns': { data: generateContextPatternsData(3) },
        frequency: { data: generateBehaviorFrequencyData(7) },
      });
      
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(generateBehaviorPatterns(2), false),
      }));
      
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with basic data showing few patterns, moderate metrics, and sparse charts.',
      },
    },
  },
};

export const PartialData: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { data: generateBehaviorAnalyticsSummary() },
        'habit-strength': { ok: false, status: 500 },
        'context-patterns': { data: generateContextPatternsData() },
        frequency: { data: [] },
      });
      
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with some sections loaded successfully and others in loading or error states.',
      },
    },
  },
};

export const RecentUser: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
    timeRange: '7d',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { data: { ...generateSummaryEmpty(), totalEvents: 5, activePatterns: 1 } },
        'habit-strength': { data: generateHabitStrengthData(3) },
        'context-patterns': { data: generateContextPatternsData(1) },
        frequency: { data: generateBehaviorFrequencyData(3) },
      });
      
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(generateBehaviorPatterns(1), false),
      }));
      
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard for new user with limited historical data and encouraging onboarding messages.',
      },
    },
  },
};

// Real-time Feature Stories
export const RealTimeEnabled: Story = {
  args: {
    showRealTimeUpdates: true,
    refreshInterval: 10000,
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with real-time updates active showing live indicator and automatic data refresh.',
      },
    },
  },
};

export const RealTimeDisabled: Story = {
  args: {
    showRealTimeUpdates: false,
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with real-time updates disabled showing static data and offline indicator.',
      },
    },
  },
};

export const RealtimeWithUpdates: Story = {
  args: {
    showRealTimeUpdates: true,
    refreshInterval: 5000,
    userAuthenticated: true,
    dataState: 'success',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Verify real-time indicator is present
    const realtimeIndicator = canvas.getByText(/Live/);
    expect(realtimeIndicator).toBeInTheDocument();
    
    // Simulate data update after interval
    setTimeout(() => {
      // Mock updated data
      mockFetch({
        summary: { data: generateSummaryWithTrends('up') },
        'habit-strength': { data: generateHabitStrengthTrends('increasing') },
        'context-patterns': { data: generateContextPatternsVariedSuccess() },
        frequency: { data: generateBehaviorDataWithTrends('increasing') },
      });
    }, 5000);
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard simulating live data updates with changing metrics and trend indicators.',
      },
    },
  },
};

export const OfflineMode: Story = {
  args: {
    showRealTimeUpdates: true,
    userAuthenticated: true,
    dataState: 'error',
  },
  decorators: [
    (Story) => {
      // Simulate network failure
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard in offline state with appropriate indicators and cached data display.',
      },
    },
  },
};

// Time Range Stories
export const SevenDayView: Story = {
  args: {
    timeRange: '7d',
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { data: generateBehaviorAnalyticsSummary() },
        'habit-strength': { data: generateHabitStrengthData(7) },
        'context-patterns': { data: generateContextPatternsData() },
        frequency: { data: generateBehaviorFrequencyData(7) },
      });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard configured for 7-day analysis with recent data focus and short-term trends.',
      },
    },
  },
};

export const MonthlyView: Story = {
  args: {
    timeRange: '30d',
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { data: generateBehaviorAnalyticsSummary() },
        'habit-strength': { data: generateHabitStrengthData(30) },
        'context-patterns': { data: generateContextPatternsData() },
        frequency: { data: generateBehaviorFrequencyData(30) },
      });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard showing 30-day trends and monthly patterns with comprehensive data analysis.',
      },
    },
  },
};

export const QuarterlyView: Story = {
  args: {
    timeRange: '90d',
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { data: generateBehaviorAnalyticsSummary() },
        'habit-strength': { data: generateHabitStrengthData(90) },
        'context-patterns': { data: generateContextPatternsData() },
        frequency: { data: generateBehaviorFrequencyData(90) },
      });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with 90-day data for quarterly analysis and long-term trend identification.',
      },
    },
  },
};

export const YearlyView: Story = {
  args: {
    timeRange: '1y',
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { data: generateBehaviorAnalyticsSummary() },
        'habit-strength': { data: generateHabitStrengthData(365) },
        'context-patterns': { data: generateContextPatternsData() },
        frequency: { data: generateBehaviorFrequencyData(365) },
      });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard displaying yearly trends and long-term patterns with comprehensive historical analysis.',
      },
    },
  },
};

// User Authentication Stories
export const AuthenticatedUser: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard for authenticated user with full functionality and personalized data.',
      },
    },
  },
};

export const UnauthenticatedUser: Story = {
  args: {
    userAuthenticated: false,
    dataState: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard showing sign-in prompt and limited functionality for unauthenticated users.',
      },
    },
  },
};

export const UserLoading: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'loading',
  },
  decorators: [
    (Story) => {
      jest.mock('@clerk/nextjs', () => ({
        useUser: () => mockUseUser(true, true),
      }));
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard during user authentication loading state with appropriate loading indicators.',
      },
    },
  },
};

// Metric Card Variations
export const HighPerformance: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      const highPerformanceScenario = createTestScenario('trend-increasing');
      mockFetch({
        summary: { data: highPerformanceScenario.summary },
        'habit-strength': { data: highPerformanceScenario.habitStrength },
        'context-patterns': { data: highPerformanceScenario.contextPatterns },
        frequency: { data: highPerformanceScenario.behaviorFrequency },
      });
      
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(highPerformanceScenario.patterns, false),
      }));
      
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with high habit strength and positive trends showing excellent user progress.',
      },
    },
  },
};

export const LowPerformance: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      const lowPerformanceScenario = createTestScenario('trend-decreasing');
      mockFetch({
        summary: { data: lowPerformanceScenario.summary },
        'habit-strength': { data: lowPerformanceScenario.habitStrength },
        'context-patterns': { data: lowPerformanceScenario.contextPatterns },
        frequency: { data: lowPerformanceScenario.behaviorFrequency },
      });
      
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(lowPerformanceScenario.patterns, false),
      }));
      
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with low metrics and areas for improvement, providing encouragement and guidance.',
      },
    },
  },
};

export const MixedPerformance: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { 
          data: {
            ...generateBehaviorAnalyticsSummary(),
            habitStrengthAvg: 65,
            consistencyScore: 80,
            weeklyTrend: 'stable' as const,
          }
        },
        'habit-strength': { data: generateHabitStrengthTrends('stable') },
        'context-patterns': { data: generateContextPatternsVariedSuccess() },
        frequency: { data: generateBehaviorDataWithTrends('stable') },
      });
      
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(generatePatternsWithVariedStrength(), false),
      }));
      
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with varied metrics showing realistic user progress with both strengths and areas for improvement.',
      },
    },
  },
};

export const TrendVariations: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { 
          data: {
            ...generateBehaviorAnalyticsSummary(),
            weeklyTrend: 'up' as const,
          }
        },
        'habit-strength': { data: generateHabitStrengthTrends('increasing') },
        'context-patterns': { data: generateContextPatternsData() },
        frequency: { data: generateBehaviorDataWithTrends('increasing') },
      });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard showcasing different trend indicators (up, down, stable) across various metrics.',
      },
    },
  },
};

// Pattern Insight Stories
export const ManyPatterns: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(generateBehaviorPatterns(8), false),
      }));
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with 6+ patterns showing full pattern grid with diverse behavior insights.',
      },
    },
  },
};

export const FewPatterns: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(generateBehaviorPatterns(2), false),
      }));
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with 1-3 patterns showing partial grid and encouraging more data collection.',
      },
    },
  },
};

export const NoPatterns: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior([], false),
      }));
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with no detected patterns showing encouragement message and guidance for users.',
      },
    },
  },
};

export const AnalyzingPatterns: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(generateBehaviorPatterns(3), true),
      }));
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with pattern analysis in progress showing loading indicator and existing patterns.',
      },
    },
  },
};

export const StrongPatterns: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      const strongPatterns = generateBehaviorPatterns(6).map(pattern => ({
        ...pattern,
        strength: 85 + Math.random() * 10,
        confidence: 90 + Math.random() * 5,
      }));
      
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(strongPatterns, false),
      }));
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with high-strength patterns and confidence scores showing well-established behaviors.',
      },
    },
  },
};

export const WeakPatterns: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      const weakPatterns = generateBehaviorPatterns(4).map(pattern => ({
        ...pattern,
        strength: 40 + Math.random() * 20,
        confidence: 60 + Math.random() * 15,
      }));
      
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(weakPatterns, false),
      }));
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with developing patterns and lower confidence showing emerging behavior trends.',
      },
    },
  },
};

// Chart Integration Stories
export const AllChartsLoaded: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with all three charts (habit strength, context patterns, behavior frequency) displaying data successfully.',
      },
    },
  },
};

export const ChartErrors: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { data: generateBehaviorAnalyticsSummary() },
        'habit-strength': { ok: false, status: 500, data: { message: 'Failed to load habit strength data' } },
        'context-patterns': { data: generateContextPatternsData() },
        frequency: { ok: false, status: 404, data: { message: 'Frequency data not found' } },
      });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with some charts in error state and others working, showing graceful error handling.',
      },
    },
  },
};

export const ChartLoading: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'loading',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with charts in various loading states showing skeleton components and loading indicators.',
      },
    },
  },
};

export const InteractiveCharts: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test metric card interactions
    const metricCards = canvas.getAllByRole('button');
    const firstMetricCard = metricCards.find(card => 
      card.textContent?.includes('Habit Strength')
    );
    
    if (firstMetricCard) {
      await userEvent.click(firstMetricCard);
      expect(action('trackEvent')).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'analytics_metric_viewed',
        })
      );
    }
    
    // Test pattern card interactions
    const patternCards = canvas.getAllByRole('button');
    const patternCard = patternCards.find(card => 
      card.textContent?.includes('% strong')
    );
    
    if (patternCard) {
      await userEvent.click(patternCard);
      expect(action('trackEvent')).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'pattern_insight_viewed',
        })
      );
    }
    
    // Test time range selection
    const timeRangeButtons = canvas.getAllByRole('button');
    const sevenDayButton = timeRangeButtons.find(button => 
      button.textContent === '7d'
    );
    
    if (sevenDayButton) {
      await userEvent.click(sevenDayButton);
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with clickable chart elements and interaction logging for analytics tracking.',
      },
    },
  },
};

// Responsive Layout Stories
export const MobileLayout: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Dashboard optimized for mobile viewport with stacked components and touch-friendly interactions.',
      },
    },
  },
};

export const TabletLayout: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Dashboard on tablet viewport with responsive grid adjustments and optimized spacing.',
      },
    },
  },
};

export const DesktopLayout: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      description: {
        story: 'Dashboard on desktop with full grid layout and optimal use of screen real estate.',
      },
    },
  },
};

export const WideScreen: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    viewport: {
      defaultViewport: 'responsive',
    },
    docs: {
      description: {
        story: 'Dashboard on ultra-wide screens with expanded layout and enhanced data visualization.',
      },
    },
  },
};

// Accessibility Stories
export const HighContrast: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => (
      <div className="high-contrast-theme">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with high contrast theme for accessibility and improved visibility.',
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
};

export const KeyboardNavigation: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test keyboard navigation through interactive elements
    const interactiveElements = canvas.getAllByRole('button');
    
    // Focus first element
    if (interactiveElements[0]) {
      interactiveElements[0].focus();
      expect(interactiveElements[0]).toHaveFocus();
    }
    
    // Test tab navigation
    await userEvent.tab();
    expect(interactiveElements[1]).toHaveFocus();
    
    // Test Enter key activation
    await userEvent.keyboard('{Enter}');
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard optimized for keyboard-only navigation with proper focus management and activation.',
      },
    },
  },
};

export const ScreenReaderOptimized: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with enhanced ARIA labels and descriptions for optimal screen reader compatibility.',
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'aria-valid-attr-value',
            enabled: true,
          },
          {
            id: 'aria-required-children',
            enabled: true,
          },
        ],
      },
    },
  },
};

export const ReducedMotion: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => (
      <div className="motion-reduce">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with animations disabled for users with motion sensitivity preferences.',
      },
    },
  },
};

// Performance Stories
export const LargeDataset: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
    timeRange: '1y',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { data: generateBehaviorAnalyticsSummary() },
        'habit-strength': { data: generateHabitStrengthData(365) },
        'context-patterns': { data: generateContextPatternsData(20) },
        frequency: { data: generateLargeBehaviorDataset() },
      });
      
      jest.mock('@/hooks/useMicroBehavior', () => ({
        useMicroBehavior: () => mockUseMicroBehavior(generateBehaviorPatterns(15), false),
      }));
      
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard handling large amounts of data and patterns for performance testing.',
      },
    },
  },
};

export const SlowNetwork: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'loading',
    refreshInterval: 60000,
  },
  decorators: [
    (Story) => {
      // Simulate slow network with delayed responses
      global.fetch = jest.fn(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: generateBehaviorAnalyticsSummary() }),
          } as Response), 3000)
        )
      );
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard simulating slow network conditions with appropriate loading states and timeouts.',
      },
    },
  },
};

export const MemoryStress: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
    refreshInterval: 1000,
  },
  decorators: [
    (Story) => {
      // Generate large amounts of data for memory testing
      const largeDataset = Array.from({ length: 1000 }, () => generateBehaviorAnalyticsSummary());
      
      mockFetch({
        summary: { data: largeDataset[0] },
        'habit-strength': { data: generateHabitStrengthData(1000) },
        'context-patterns': { data: generateContextPatternsData(50) },
        frequency: { data: generateBehaviorFrequencyData(1000) },
      });
      
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with extensive data for memory usage testing and performance optimization.',
      },
    },
  },
};

export const ConcurrentUpdates: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
    showRealTimeUpdates: true,
    refreshInterval: 2000,
  },
  decorators: [
    (Story) => {
      // Simulate multiple simultaneous updates
      let updateCount = 0;
      global.fetch = jest.fn(() => {
        updateCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ 
            data: {
              ...generateBehaviorAnalyticsSummary(),
              totalEvents: 100 + updateCount,
            }
          }),
        } as Response);
      });
      
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with multiple simultaneous data updates for concurrency testing.',
      },
    },
  },
};

// Error Handling Stories
export const NetworkError: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'error',
  },
  decorators: [
    (Story) => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network connection failed')));
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard handling network connectivity issues with appropriate error messages and retry options.',
      },
    },
  },
};

export const APIError: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'error',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { ok: false, status: 500, data: { message: 'Internal server error' } },
        'habit-strength': { ok: false, status: 503, data: { message: 'Service unavailable' } },
        'context-patterns': { ok: false, status: 429, data: { message: 'Rate limit exceeded' } },
        frequency: { ok: false, status: 502, data: { message: 'Bad gateway' } },
      });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with API endpoint failures showing error recovery and user guidance.',
      },
    },
  },
};

export const PartialFailure: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => {
      mockFetch({
        summary: { data: generateBehaviorAnalyticsSummary() },
        'habit-strength': { ok: false, status: 500 },
        'context-patterns': { data: generateContextPatternsData() },
        frequency: { ok: false, status: 404 },
      });
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with some API calls succeeding and others failing, showing graceful degradation.',
      },
    },
  },
};

export const TimeoutError: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'loading',
  },
  decorators: [
    (Story) => {
      global.fetch = jest.fn(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
      );
      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard handling request timeout scenarios with appropriate error handling and retry logic.',
      },
    },
  },
};

// Customization Stories
export const CustomTimeRange: Story = {
  args: {
    timeRange: '90d',
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with non-standard time range configurations for specialized analysis needs.',
      },
    },
  },
};

export const FilteredBehaviors: Story = {
  args: {
    behaviorTypes: ['Exercise', 'Meditation'],
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard filtered to specific behavior types for focused analysis and insights.',
      },
    },
  },
};

export const CustomRefreshInterval: Story = {
  args: {
    refreshInterval: 5000,
    showRealTimeUpdates: true,
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with custom refresh interval settings for different monitoring needs.',
      },
    },
  },
};

export const BrandedStyling: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  decorators: [
    (Story) => (
      <div className="custom-brand-theme">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Dashboard with custom styling and color schemes for brand customization.',
      },
    },
  },
};

// Interactive Demo Story
export const InteractiveDemo: Story = {
  args: {
    userAuthenticated: true,
    dataState: 'success',
  },
  parameters: {
    docs: {
      description: {
        story: 'Use the controls panel to experiment with different dashboard configurations and see real-time changes. This story demonstrates the full range of customization options available.',
      },
    },
  },
};
