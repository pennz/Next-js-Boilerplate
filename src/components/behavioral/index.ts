/**
 * @fileoverview Behavioral Analytics Components Index
 * 
 * This module provides a centralized export point for all behavioral analytics components,
 * types, utilities, and testing resources. It follows the established patterns from the
 * health components directory to ensure consistency across the codebase.
 * 
 * @example
 * ```typescript
 * // Import main components
 * import { BehaviorAnalyticsChart, BehaviorAnalyticsDashboard } from '@/components/behavioral';
 * 
 * // Import types
 * import type { BehaviorDataPoint, BehaviorAnalyticsSummary } from '@/components/behavioral';
 * 
 * // Import test utilities
 * import { generateBehaviorFrequencyData, createBehaviorAnalyticsChartProps } from '@/components/behavioral';
 * ```
 */

// =============================================================================
// MAIN COMPONENT EXPORTS
// =============================================================================

/**
 * Main behavioral analytics chart component supporting multiple chart types
 * (behavior_frequency, habit_strength, context_patterns, consistency_trends)
 * 
 * @example
 * ```typescript
 * <BehaviorAnalyticsChart
 *   data={behaviorData}
 *   chartType="habit_strength"
 *   title="Habit Strength Over Time"
 *   showPrediction={true}
 * />
 * ```
 */
export { BehaviorAnalyticsChart } from './BehaviorAnalyticsChart';

/**
 * Container component for behavioral analytics with data fetching and state management.
 * This is the recommended entry point for behavioral analytics functionality.
 * 
 * @example
 * ```typescript
 * <BehaviorAnalyticsContainer
 *   timeRange="30d"
 *   showRealTimeUpdates={true}
 *   refreshInterval={30000}
 * />
 * ```
 */
export { BehaviorAnalyticsContainer } from './BehaviorAnalyticsContainer';

/**
 * Layout component for behavioral analytics presentation and structure.
 * Used internally by BehaviorAnalyticsContainer but can be used standalone.
 * 
 * @example
 * ```typescript
 * <BehaviorAnalyticsLayout
 *   summary={summaryData}
 *   habitStrengthData={habitData}
 *   onTimeRangeChange={handleTimeRangeChange}
 *   trackMetricCardView={trackMetricView}
 *   trackPatternInsightView={trackPatternView}
 * />
 * ```
 */
export { BehaviorAnalyticsLayout } from './BehaviorAnalyticsLayout';

/**
 * Header component for behavioral analytics dashboard with real-time indicators
 * 
 * @example
 * ```typescript
 * <BehaviorAnalyticsHeader
 *   showRealTimeUpdates={true}
 *   loading={false}
 *   lastUpdate={new Date()}
 * />
 * ```
 */
export { BehaviorAnalyticsHeader } from './BehaviorAnalyticsHeader';

/**
 * Metrics section component displaying key behavioral analytics metrics
 * 
 * @example
 * ```typescript
 * <MetricsSection
 *   summary={summaryData}
 *   trackMetricCardView={trackMetricView}
 * />
 * ```
 */
export { MetricsSection } from './MetricsSection';

/**
 * Charts section component displaying behavioral analytics visualizations
 * 
 * @example
 * ```typescript
 * <ChartsSection
 *   habitStrengthData={habitData}
 *   contextPatternsData={contextData}
 *   behaviorFrequencyData={frequencyData}
 *   selectedTimeRange="30d"
 *   onPatternDetails={handlePatternDetails}
 * />
 * ```
 */
export { ChartsSection } from './ChartsSection';

/**
 * Patterns section component displaying behavioral pattern insights
 * 
 * @example
 * ```typescript
 * <PatternsSection
 *   patterns={patternsData}
 *   isAnalyzing={false}
 *   onPatternDetails={handlePatternDetails}
 *   trackPatternInsightView={trackPatternView}
 * />
 * ```
 */
export { PatternsSection } from './PatternsSection';

/**
 * Time range selector component for filtering analytics data
 * 
 * @example
 * ```typescript
 * <TimeRangeSelector
 *   selectedTimeRange="30d"
 *   onTimeRangeChange={handleTimeRangeChange}
 * />
 * ```
 */
export { TimeRangeSelector } from './TimeRangeSelector';

/**
 * Comprehensive dashboard component with real-time updates, metric cards,
 * pattern insights, and multiple chart integrations
 * 
 * @deprecated Use BehaviorAnalyticsContainer instead for new implementations
 * @example
 * ```typescript
 * <BehaviorAnalyticsDashboard
 *   timeRange="30d"
 *   showRealTimeUpdates={true}
 *   refreshInterval={30000}
 * />
 * ```
 */
export { BehaviorAnalyticsDashboard } from './BehaviorAnalyticsDashboard';

// =============================================================================
// TYPE EXPORTS - CHART COMPONENT
// =============================================================================

/**
 * Data structure for individual behavior data points used in frequency and consistency charts
 */
export type { BehaviorDataPoint } from './BehaviorAnalyticsChart';

/**
 * Data structure for habit strength metrics with multiple scoring dimensions
 */
export type { HabitStrengthData } from './BehaviorAnalyticsChart';

/**
 * Data structure for context pattern analysis with success rates and predictive power
 */
export type { ContextPatternData } from './BehaviorAnalyticsChart';

/**
 * Complete props interface for the BehaviorAnalyticsChart component
 */
export type { BehaviorAnalyticsChartProps } from './BehaviorAnalyticsChart';

// =============================================================================
// TYPE EXPORTS - DASHBOARD COMPONENT
// =============================================================================

/**
 * Summary metrics data structure for the behavioral analytics dashboard
 */
export type { BehaviorAnalyticsSummary } from './BehaviorAnalyticsDashboard';

/**
 * Complete props interface for the BehaviorAnalyticsDashboard component
 */
export type { BehaviorAnalyticsDashboardProps } from './BehaviorAnalyticsDashboard';

// =============================================================================
// TYPE EXPORTS - DECOMPOSED COMPONENTS
// =============================================================================

/**
 * Summary metrics data structure for the behavioral analytics components
 */
export type { BehaviorAnalyticsSummary as BehaviorAnalyticsSummaryType } from './BehaviorAnalyticsContainer';

/**
 * Data point structure for behavior analytics
 */
export type { BehaviorDataPoint as BehaviorDataPointType } from './BehaviorAnalyticsContainer';

/**
 * Habit strength data structure for analytics
 */
export type { HabitStrengthData as HabitStrengthDataType } from './BehaviorAnalyticsContainer';

/**
 * Context pattern data structure for analytics
 */
export type { ContextPatternData as ContextPatternDataType } from './BehaviorAnalyticsContainer';

// =============================================================================
// UTILITY TYPE EXPORTS
// =============================================================================

/**
 * Union type for supported chart types in behavioral analytics
 */
export type BehaviorChartType = 'behavior_frequency' | 'habit_strength' | 'context_patterns' | 'consistency_trends';

/**
 * Union type for supported time ranges in behavioral analytics
 */
export type BehaviorTimeRange = '7d' | '30d' | '90d' | '1y';

/**
 * Union type for trend directions used in metrics and analytics
 */
export type BehaviorTrendDirection = 'up' | 'down' | 'stable';

/**
 * Union type for pattern strength classifications
 */
export type PatternStrength = 'weak' | 'moderate' | 'strong';

/**
 * Union type for metric card color schemes
 */
export type MetricCardColor = 'blue' | 'purple' | 'green' | 'orange' | 'red';

// =============================================================================
// HOOK EXPORTS
// =============================================================================

/**
 * Custom hook for behavioral analytics tracking with comprehensive event tracking
 * 
 * @example
 * ```typescript
 * const {
 *   trackDashboardView,
 *   trackMetricCardView,
 *   trackPatternInsightView,
 *   trackTimeRangeChange
 * } = useBehaviorAnalyticsTracking();
 * 
 * // Track dashboard view
 * await trackDashboardView({
 *   timeRange: '30d',
 *   behaviorTypes: ['exercise', 'meditation'],
 *   patternsCount: 5,
 *   showRealTimeUpdates: true
 * });
 * 
 * // Track metric interaction
 * await trackMetricCardView({
 *   title: 'Habit Strength',
 *   value: 85,
 *   trend: 'up'
 * });
 * ```
 */
export { useBehaviorAnalyticsTracking } from './useBehaviorAnalyticsTracking';

/**
 * Type exports for the behavioral analytics tracking hook
 */
export type {
  MetricData,
  PatternData,
  DashboardViewData,
  ChartInteractionData,
  UseBehaviorAnalyticsTrackingReturn,
} from './useBehaviorAnalyticsTracking';

// =============================================================================
// FIXTURE EXPORTS (Available when fixtures are created)
// =============================================================================

/**
 * Test fixtures and mock data generators for behavioral analytics components
 * 
 * @example
 * ```typescript
 * import { generateBehaviorFrequencyData, createBehaviorAnalyticsChartProps } from '@/components/behavioral';
 * 
 * const testData = generateBehaviorFrequencyData();
 * const chartProps = createBehaviorAnalyticsChartProps({ chartType: 'habit_strength' });
 * ```
 */
// Note: These exports will be available once the fixtures file is created
// export {
//   generateBehaviorFrequencyData,
//   generateHabitStrengthData,
//   generateContextPatternsData,
//   generateBehaviorAnalyticsSummary,
//   generateBehaviorPatterns,
//   createBehaviorAnalyticsChartProps,
//   createBehaviorAnalyticsDashboardProps,
//   createDeterministicData,
//   createRandomizedData,
// } from './BehaviorAnalyticsChart.fixtures';

// =============================================================================
// STORY EXPORTS (Available when stories are created)
// =============================================================================

/**
 * Storybook story configurations for behavioral analytics components
 * 
 * @example
 * ```typescript
 * import { BehaviorAnalyticsChartStories } from '@/components/behavioral';
 * ```
 */
// Note: These exports will be available once the stories files are created
// export { default as BehaviorAnalyticsChartStories } from './BehaviorAnalyticsChart.stories';
// export { default as BehaviorAnalyticsDashboardStories } from './BehaviorAnalyticsDashboard.stories';

// =============================================================================
// UTILITY FUNCTION EXPORTS
// =============================================================================

/**
 * Utility functions for data transformation and formatting
 * These functions are used internally by the components but may be useful externally
 */

/**
 * Formats tooltip values for different chart types and data formats
 * 
 * @param value - The numeric value to format
 * @param name - The data series name
 * @returns Formatted tooltip content as [formattedValue, displayName]
 * 
 * @example
 * ```typescript
 * const [value, label] = formatBehaviorTooltip(85, 'habitStrength');
 * // Returns: ['85%', 'Habit Strength']
 * ```
 */
export const formatBehaviorTooltip = (value: number, name: string): [string, string] => {
  switch (name) {
    case 'habitStrength':
      return [`${Math.round(value)}%`, 'Habit Strength'];
    case 'consistencyScore':
      return [`${Math.round(value)}%`, 'Consistency'];
    case 'frequencyScore':
      return [`${Math.round(value)}%`, 'Frequency'];
    case 'contextScore':
      return [`${Math.round(value)}%`, 'Context Score'];
    case 'successRate':
      return [`${Math.round(value)}%`, 'Success Rate'];
    case 'predictivePower':
      return [`${Math.round(value)}%`, 'Predictive Power'];
    default:
      return [value.toString(), name];
  }
};

/**
 * Formats X-axis labels for different chart types
 * 
 * @param value - The value to format (date string or context name)
 * @param chartType - The type of chart being rendered
 * @returns Formatted label string
 * 
 * @example
 * ```typescript
 * const label = formatBehaviorXAxis('2024-01-15', 'behavior_frequency');
 * // Returns: 'Jan 15'
 * 
 * const contextLabel = formatBehaviorXAxis('Very Long Context Name', 'context_patterns');
 * // Returns: 'Very Long...'
 * ```
 */
export const formatBehaviorXAxis = (value: string, chartType: BehaviorChartType): string => {
  if (chartType === 'context_patterns') {
    return value.length > 10 ? `${value.substring(0, 10)}...` : value;
  }
  try {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
};

/**
 * Determines the appropriate color scheme for metric cards based on value and type
 * 
 * @param value - The metric value
 * @param metricType - The type of metric
 * @returns Color scheme identifier
 * 
 * @example
 * ```typescript
 * const color = getMetricCardColor(85, 'habitStrength');
 * // Returns: 'green' for high values, 'orange' for medium, 'red' for low
 * ```
 */
export const getMetricCardColor = (value: number, metricType: string): MetricCardColor => {
  // For percentage-based metrics
  if (metricType.includes('Strength') || metricType.includes('Consistency') || metricType.includes('Accuracy')) {
    if (value >= 80) return 'green';
    if (value >= 60) return 'orange';
    return 'red';
  }
  
  // For count-based metrics
  if (metricType.includes('Patterns') || metricType.includes('Events')) {
    if (value >= 10) return 'blue';
    if (value >= 5) return 'purple';
    return 'orange';
  }
  
  return 'blue'; // Default color
};

/**
 * Calculates pattern strength classification based on multiple factors
 * 
 * @param frequency - Pattern frequency score (0-100)
 * @param consistency - Pattern consistency score (0-100)
 * @param confidence - Pattern confidence score (0-100)
 * @returns Pattern strength classification
 * 
 * @example
 * ```typescript
 * const strength = calculatePatternStrength(85, 90, 95);
 * // Returns: 'strong'
 * ```
 */
export const calculatePatternStrength = (
  frequency: number,
  consistency: number,
  confidence: number
): PatternStrength => {
  const averageScore = (frequency + consistency + confidence) / 3;
  
  if (averageScore >= 80) return 'strong';
  if (averageScore >= 60) return 'moderate';
  return 'weak';
};

/**
 * Validates behavioral analytics data structure
 * 
 * @param data - Data array to validate
 * @param chartType - Expected chart type
 * @returns Boolean indicating if data is valid
 * 
 * @example
 * ```typescript
 * const isValid = validateBehaviorData(data, 'habit_strength');
 * ```
 */
export const validateBehaviorData = (data: any[], chartType: BehaviorChartType): boolean => {
  if (!Array.isArray(data) || data.length === 0) return false;
  
  const requiredFields = {
    behavior_frequency: ['date', 'frequency'],
    habit_strength: ['date', 'habitStrength'],
    context_patterns: ['context', 'successRate'],
    consistency_trends: ['date', 'consistency'],
  };
  
  const required = requiredFields[chartType];
  return data.every(item => required.every(field => field in item));
};

// =============================================================================
// CONSTANTS AND CONFIGURATION
// =============================================================================

/**
 * Default configuration values for behavioral analytics components
 */
export const BEHAVIOR_ANALYTICS_DEFAULTS = {
  CHART_HEIGHT: 400,
  CHART_MARGIN: { top: 20, right: 30, left: 20, bottom: 20 },
  REFRESH_INTERVAL: 30000,
  TIME_RANGE: '30d' as BehaviorTimeRange,
  CHART_TYPE: 'behavior_frequency' as BehaviorChartType,
  PATTERN_DISPLAY_LIMIT: 6,
  CONTEXT_NAME_MAX_LENGTH: 10,
} as const;

/**
 * Color palettes for different chart types and themes
 */
export const BEHAVIOR_CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#10b981',
  ACCENT: '#8b5cf6',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  SUCCESS: '#10b981',
  INFO: '#06b6d4',
  GRADIENT_OPACITY: {
    HIGH: 0.6,
    MEDIUM: 0.4,
    LOW: 0.2,
  },
} as const;

/**
 * Metric card color schemes mapping
 */
export const METRIC_CARD_COLORS = {
  blue: 'border-blue-200 bg-blue-50 text-blue-900',
  purple: 'border-purple-200 bg-purple-50 text-purple-900',
  green: 'border-green-200 bg-green-50 text-green-900',
  orange: 'border-orange-200 bg-orange-50 text-orange-900',
  red: 'border-red-200 bg-red-50 text-red-900',
} as const;

// =============================================================================
// DOCUMENTATION AND MIGRATION NOTES
// =============================================================================

/**
 * @deprecated Use BehaviorAnalyticsChart with chartType prop instead
 * This is a placeholder for any deprecated exports that might exist in the future
 */

/**
 * Migration Guide:
 * 
 * When upgrading to newer versions of the behavioral analytics components:
 * 
 * 1. Import components from the index file rather than individual files
 * 2. Use the exported types for TypeScript integration
 * 3. Leverage the utility functions for consistent data formatting
 * 4. Follow the configuration constants for consistent styling
 * 5. **NEW**: Use BehaviorAnalyticsContainer instead of BehaviorAnalyticsDashboard for new implementations
 * 6. **NEW**: Use the decomposed components (MetricsSection, ChartsSection, etc.) for custom layouts
 * 7. **NEW**: Implement useBehaviorAnalyticsTracking for comprehensive user behavior tracking
 * 
 * Component Architecture:
 * - BehaviorAnalyticsContainer: Data fetching and state management
 * - BehaviorAnalyticsLayout: Presentation and layout structure
 * - Individual sections: MetricsSection, ChartsSection, PatternsSection for modular usage
 * - TimeRangeSelector: Reusable time range filtering component
 * - useBehaviorAnalyticsTracking: Comprehensive tracking hook
 * 
 * Breaking Changes:
 * - BehaviorAnalyticsDashboard is now deprecated in favor of BehaviorAnalyticsContainer
 * - New tracking requirements: Components now expect tracking functions as props
 * 
 * Performance Considerations:
 * - Large datasets (>100 points) may impact chart rendering performance
 * - Real-time updates should be used judiciously to avoid excessive API calls
 * - Consider implementing data pagination for very large time ranges
 * - New container/layout pattern improves performance through better separation of concerns
 */
