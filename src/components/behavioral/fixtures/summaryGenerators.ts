import { faker } from '@faker-js/faker';
import type { BehaviorAnalyticsSummary } from '../BehaviorAnalyticsDashboard';

/**
 * Generate behavior analytics summary data
 */
export const generateBehaviorAnalyticsSummary = (): BehaviorAnalyticsSummary => {
  return {
    totalEvents: faker.number.int({ min: 50, max: 500 }),
    activePatterns: faker.number.int({ min: 3, max: 12 }),
    habitStrengthAvg: faker.number.int({ min: 60, max: 90 }),
    consistencyScore: faker.number.int({ min: 65, max: 95 }),
    topContext: faker.helpers.arrayElement(['Morning Routine', 'After Work', 'Weekend', 'Evening']),
    weeklyTrend: faker.helpers.arrayElement(['up', 'down', 'stable'] as const),
    predictionAccuracy: faker.number.int({ min: 75, max: 95 }),
  };
};

/**
 * Generate summary with specific trends
 */
export const generateSummaryWithTrends = (trend: 'up' | 'down' | 'stable'): BehaviorAnalyticsSummary => {
  const base = generateBehaviorAnalyticsSummary();
  return {
    ...base,
    weeklyTrend: trend,
    habitStrengthAvg: trend === 'up' ? 85 : trend === 'down' ? 55 : 70,
    consistencyScore: trend === 'up' ? 90 : trend === 'down' ? 60 : 75,
  };
};

/**
 * Generate summary with edge case values (zeros)
 */
export const generateSummaryEdgeCases = (): BehaviorAnalyticsSummary => {
  return {
    totalEvents: 0,
    activePatterns: 0,
    habitStrengthAvg: 0,
    consistencyScore: 0,
    topContext: 'None',
    weeklyTrend: 'stable',
    predictionAccuracy: 0,
  };
};

/**
 * Generate empty summary for empty state testing
 */
export const generateSummaryEmpty = (): BehaviorAnalyticsSummary => {
  return generateSummaryEdgeCases();
};