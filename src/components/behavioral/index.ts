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
 * Comprehensive dashboard component with real-time updates, metric cards,
 * pattern insights, and multiple chart integrations
 * 
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
 * 
 * Breaking Changes:
 * - None currently, but future changes will be documented here
 * 
 * Performance Considerations:
 * - Large datasets (>100 points) may impact chart rendering performance
 * - Real-time updates should be used judiciously to avoid excessive API calls
 * - Consider implementing data pagination for very large time ranges
 */