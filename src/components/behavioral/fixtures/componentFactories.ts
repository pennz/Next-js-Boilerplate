import type { BehaviorAnalyticsChartProps } from '../BehaviorAnalyticsChart';
import { generateBehaviorFrequencyData } from './behaviorDataGenerators';
import { generateHabitStrengthData } from './habitStrengthGenerators';
import { generateContextPatternsData } from './contextPatternGenerators';

export type ChartType = 'behavior_frequency' | 'habit_strength' | 'context_patterns' | 'consistency_trends';
export type TimeRange = '7d' | '30d' | '90d' | '1y';

/**
 * Create chart props for specific chart types
 */
export const createChartPropsForType = (chartType: ChartType): Partial<BehaviorAnalyticsChartProps> => {
  switch (chartType) {
    case 'behavior_frequency':
      return {
        data: generateBehaviorFrequencyData(),
        chartType: 'behavior_frequency',
        title: 'Behavior Frequency',
      };
    case 'habit_strength':
      return {
        data: generateHabitStrengthData(),
        chartType: 'habit_strength',
        title: 'Habit Strength',
      };
    case 'context_patterns':
      return {
        data: generateContextPatternsData(),
        chartType: 'context_patterns',
        title: 'Context Patterns',
      };
    case 'consistency_trends':
      return {
        data: generateBehaviorFrequencyData(),
        chartType: 'consistency_trends',
        title: 'Consistency Trends',
        showConfidenceInterval: true,
      };
    default:
      return {
        data: generateBehaviorFrequencyData(),
        chartType: 'behavior_frequency',
      };
  }
};

/**
 * Create complete BehaviorAnalyticsChartProps with defaults
 */
export const createBehaviorAnalyticsChartProps = (
  overrides: Partial<BehaviorAnalyticsChartProps> = {}
): BehaviorAnalyticsChartProps => {
  const defaults: BehaviorAnalyticsChartProps = {
    data: generateBehaviorFrequencyData(),
    chartType: 'behavior_frequency',
    title: 'Behavior Analytics Chart',
    height: 400,
    width: '100%',
    loading: false,
    error: undefined,
    className: '',
    timeRange: '30d',
    behaviorType: 'Exercise',
    showPrediction: false,
    showConfidenceInterval: false,
    onDataPointClick: undefined,
  };
  
  return { ...defaults, ...overrides };
};

/**
 * Create dashboard props with defaults
 */
export const createBehaviorAnalyticsDashboardProps = (overrides: any = {}) => {
  const defaults = {
    timeRange: '30d' as const,
    behaviorTypes: ['Exercise', 'Reading'],
    refreshInterval: 30000,
    showRealTimeUpdates: true,
  };
  
  return { ...defaults, ...overrides };
};