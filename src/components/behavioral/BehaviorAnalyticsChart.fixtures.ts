// Re-export all fixture functions to maintain backward compatibility
// This file now serves as a facade over the modular fixture system

// Type definitions
export type { TrendType, TimeRange } from './fixtures/behaviorDataGenerators';
export type { ChartType } from './fixtures/componentFactories';
export type { BehaviorPattern } from './fixtures/behaviorPatternGenerators';
export type { MockApiResponse } from './fixtures/apiMocks';

// Data state types
export type DataState = 'empty' | 'minimal' | 'rich' | 'error' | 'loading';

// Re-export all generator functions
export {
  generateBehaviorFrequencyData,
  generateEmptyBehaviorData,
  generateSingleBehaviorPoint,
  generateLargeBehaviorDataset,
  generateBehaviorDataWithTrends,
  generateHistoricalData,
  generateFutureProjections,
} from './fixtures/behaviorDataGenerators';

export {
  generateHabitStrengthData,
  generateHabitStrengthTrends,
  generateHabitStrengthWithConfidence,
  generateHabitStrengthEdgeCases,
} from './fixtures/habitStrengthGenerators';

export {
  generateContextPatternsData,
  generateContextPatternsWithLongNames,
  generateContextPatternsVariedSuccess,
  generateContextPatternsEmpty,
} from './fixtures/contextPatternGenerators';

export {
  generateBehaviorPatterns,
  generatePatternInsights,
  generatePatternsWithVariedStrength,
  generatePatternsEmpty,
} from './fixtures/behaviorPatternGenerators';

export {
  generateBehaviorAnalyticsSummary,
  generateSummaryWithTrends,
  generateSummaryEdgeCases,
  generateSummaryEmpty,
} from './fixtures/summaryGenerators';

export {
  createChartPropsForType,
  createBehaviorAnalyticsChartProps,
  createBehaviorAnalyticsDashboardProps,
} from './fixtures/componentFactories';

export {
  generateCorruptedData,
  generatePartialData,
  generateLoadingStateData,
  createMockApiResponses,
} from './fixtures/apiMocks';

export {
  createDeterministicData,
  createRandomizedData,
  generateDataForTimeRange,
  generateRecentTimestamps,
} from './fixtures/testUtilities';

export {
  createTestScenario,
} from './fixtures/testScenarios';

// Legacy exports for backward compatibility
export const createDataWithSpecificTrend = generateBehaviorDataWithTrends;
export const createRandomizedData = createRandomizedData;

// Consolidated fixtures object for easy access
export const fixtures = {
  // BehaviorDataPoint
  generateBehaviorFrequencyData,
  generateEmptyBehaviorData,
  generateSingleBehaviorPoint,
  generateLargeBehaviorDataset,
  generateBehaviorDataWithTrends,
  
  // HabitStrengthData
  generateHabitStrengthData,
  generateHabitStrengthTrends,
  generateHabitStrengthWithConfidence,
  generateHabitStrengthEdgeCases,
  
  // ContextPatternData
  generateContextPatternsData,
  generateContextPatternsWithLongNames,
  generateContextPatternsVariedSuccess,
  generateContextPatternsEmpty,
  
  // Dashboard Summary
  generateBehaviorAnalyticsSummary,
  generateSummaryWithTrends,
  generateSummaryEdgeCases,
  generateSummaryEmpty,
  
  // Patterns
  generateBehaviorPatterns,
  generatePatternInsights,
  generatePatternsWithVariedStrength,
  generatePatternsEmpty,
  
  // Time-based
  generateDataForTimeRange,
  generateRecentTimestamps,
  generateHistoricalData,
  generateFutureProjections,
  
  // Error states
  generateCorruptedData,
  generatePartialData,
  generateLoadingStateData,
  
  // Utilities
  createDeterministicData,
  createRandomizedData,
  createDataWithSpecificTrend: generateBehaviorDataWithTrends,
  createChartPropsForType,
  
  // Factories
  createBehaviorAnalyticsChartProps,
  createBehaviorAnalyticsDashboardProps,
  createMockApiResponses,
  createTestScenario,
};