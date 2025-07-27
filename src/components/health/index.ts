// Export data transformer utilities
export {
  transformToPredictiveData,
  transformToRadarData,
  transformToSummaryMetrics,
} from '../../utils/healthDataTransformers';

export type { HealthGoal as GoalCardHealthGoal } from './GoalCard';

export { GoalCard } from './GoalCard';

// Re-export existing health component types for convenience
export type { HealthGoal, HealthRecord, HealthStats } from './HealthOverview';

// Export existing components
export { HealthOverview } from './HealthOverview';

// Export the main HealthPredictiveChart component
export { HealthPredictiveChart } from './HealthPredictiveChart';

// Export the main HealthRadarChart component
export { HealthRadarChart } from './HealthRadarChart';

// Export the main HealthSummaryCards component
export { HealthSummaryCards } from './HealthSummaryCards';
// Export helper functions for external use
export {
  calculateGoalProgress,
  calculatePercentageChange,
  calculateTrendData,
  determineTrendDirection,
  formatPercentage,
} from './HealthSummaryCards';

// Export the HealthSummaryCards wrapper component
export { HealthSummaryCardsWrapper } from './HealthSummaryCardsWrapper';
// Export TypeScript interfaces and types for consumers
export type {
  GoalProgress,
  HealthPredictiveChartProps,
  HealthRadarChartProps,
  HealthRadarMetric,
  HealthSummaryCardsProps,
  HealthSummaryMetric,
  PredictedDataPoint,
  PredictionAlgorithm,
  PredictionResult,
  RadarChartConfig,
  RadarChartData,
  ScoringSystem,
  TrendData,
  TrendDirection,
} from './types';
