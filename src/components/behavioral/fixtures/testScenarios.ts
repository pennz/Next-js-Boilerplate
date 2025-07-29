import { generateBehaviorAnalyticsSummary, generateSummaryWithTrends, generateSummaryEmpty } from './summaryGenerators';
import { generateBehaviorPatterns, generatePatternsWithVariedStrength, generatePatternsEmpty } from './behaviorPatternGenerators';
import { generateBehaviorFrequencyData, generateEmptyBehaviorData, generateBehaviorDataWithTrends } from './behaviorDataGenerators';
import { generateHabitStrengthData, generateHabitStrengthTrends } from './habitStrengthGenerators';
import { generateContextPatternsData, generateContextPatternsVariedSuccess, generateContextPatternsEmpty } from './contextPatternGenerators';

/**
 * Create complete test scenarios for different dashboard states
 */
export const createTestScenario = (scenarioName: string): any => {
  const scenarios = {
    'empty-dashboard': {
      summary: generateSummaryEmpty(),
      patterns: generatePatternsEmpty(),
      habitStrength: generateEmptyBehaviorData(),
      contextPatterns: generateContextPatternsEmpty(),
      behaviorFrequency: generateEmptyBehaviorData(),
    },
    'loading-dashboard': {
      summary: null,
      patterns: null,
      habitStrength: null,
      contextPatterns: null,
      behaviorFrequency: null,
      loading: true,
    },
    'error-dashboard': {
      summary: null,
      patterns: null,
      habitStrength: null,
      contextPatterns: null,
      behaviorFrequency: null,
      error: 'Failed to load analytics data',
    },
    'rich-dashboard': {
      summary: generateBehaviorAnalyticsSummary(),
      patterns: generateBehaviorPatterns(8),
      habitStrength: generateHabitStrengthData(30),
      contextPatterns: generateContextPatternsData(10),
      behaviorFrequency: generateBehaviorFrequencyData(30),
    },
    'trend-increasing': {
      summary: generateSummaryWithTrends('up'),
      patterns: generatePatternsWithVariedStrength(),
      habitStrength: generateHabitStrengthTrends('increasing'),
      contextPatterns: generateContextPatternsVariedSuccess(),
      behaviorFrequency: generateBehaviorDataWithTrends('increasing'),
    },
    'trend-decreasing': {
      summary: generateSummaryWithTrends('down'),
      patterns: generatePatternsWithVariedStrength(),
      habitStrength: generateHabitStrengthTrends('decreasing'),
      contextPatterns: generateContextPatternsVariedSuccess(),
      behaviorFrequency: generateBehaviorDataWithTrends('decreasing'),
    },
  };
  
  return scenarios[scenarioName] || scenarios['rich-dashboard'];
};