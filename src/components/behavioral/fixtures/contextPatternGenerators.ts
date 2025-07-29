import { faker } from '@faker-js/faker';
import type { ContextPatternData } from '../BehaviorAnalyticsChart';

/**
 * Generate context pattern data for testing
 */
export const generateContextPatternsData = (count: number = 8): ContextPatternData[] => {
  const contexts = [
    'Morning Routine',
    'After Work',
    'Weekend',
    'Stressful Days',
    'Social Events',
    'Quiet Evenings',
    'Travel Days',
    'Rainy Weather',
    'High Energy',
    'Low Motivation',
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    context: contexts[i] || `Context ${i + 1}`,
    successRate: faker.number.int({ min: 20, max: 95 }),
    frequency: faker.number.int({ min: 1, max: 15 }),
    confidence: faker.number.int({ min: 60, max: 95 }),
    predictivePower: faker.number.int({ min: 40, max: 90 }),
  }));
};

/**
 * Generate context patterns with long names for UI testing
 */
export const generateContextPatternsWithLongNames = (): ContextPatternData[] => {
  return [
    {
      context: 'Very Long Context Name That Should Be Truncated In The Chart Display',
      successRate: 75,
      frequency: 8,
      confidence: 85,
      predictivePower: 70,
    },
    {
      context: 'Another Extremely Long Context Name For Testing Text Wrapping And Truncation',
      successRate: 60,
      frequency: 5,
      confidence: 70,
      predictivePower: 65,
    },
  ];
};

/**
 * Generate context patterns with varied success rates for testing
 */
export const generateContextPatternsVariedSuccess = (): ContextPatternData[] => {
  return [
    { context: 'High Success', successRate: 95, frequency: 10, confidence: 90, predictivePower: 85 },
    { context: 'Medium Success', successRate: 65, frequency: 7, confidence: 75, predictivePower: 60 },
    { context: 'Low Success', successRate: 25, frequency: 3, confidence: 60, predictivePower: 40 },
  ];
};

/**
 * Generate empty context patterns for empty state testing
 */
export const generateContextPatternsEmpty = (): ContextPatternData[] => {
  return [];
};