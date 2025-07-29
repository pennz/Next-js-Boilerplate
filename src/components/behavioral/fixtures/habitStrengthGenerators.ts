import { faker } from '@faker-js/faker';
import type { HabitStrengthData } from '../BehaviorAnalyticsChart';

export type TrendType = 'increasing' | 'decreasing' | 'stable';

/**
 * Generate habit strength data points
 */
export const generateHabitStrengthData = (count: number = 14): HabitStrengthData[] => {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - i));
    
    return {
      date: date.toISOString().split('T')[0],
      habitStrength: faker.number.int({ min: 40, max: 95 }),
      consistencyScore: faker.number.int({ min: 50, max: 100 }),
      frequencyScore: faker.number.int({ min: 30, max: 90 }),
      contextScore: faker.number.int({ min: 45, max: 85 }),
      trend: faker.helpers.arrayElement(['increasing', 'decreasing', 'stable'] as const),
    };
  });
};

/**
 * Generate habit strength data with specific trends
 */
export const generateHabitStrengthTrends = (trend: TrendType): HabitStrengthData[] => {
  const count = 14;
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - i));
    
    let baseStrength: number;
    let baseConsistency: number;
    let baseFrequency: number;
    let baseContext: number;
    
    switch (trend) {
      case 'increasing':
        baseStrength = 40 + (i / count) * 50;
        baseConsistency = 50 + (i / count) * 40;
        baseFrequency = 30 + (i / count) * 50;
        baseContext = 45 + (i / count) * 35;
        break;
      case 'decreasing':
        baseStrength = 90 - (i / count) * 50;
        baseConsistency = 90 - (i / count) * 40;
        baseFrequency = 80 - (i / count) * 50;
        baseContext = 80 - (i / count) * 35;
        break;
      case 'stable':
      default:
        baseStrength = 65;
        baseConsistency = 70;
        baseFrequency = 60;
        baseContext = 65;
        break;
    }
    
    return {
      date: date.toISOString().split('T')[0],
      habitStrength: Math.round(baseStrength + faker.number.int({ min: -3, max: 3 })),
      consistencyScore: Math.round(baseConsistency + faker.number.int({ min: -3, max: 3 })),
      frequencyScore: Math.round(baseFrequency + faker.number.int({ min: -3, max: 3 })),
      contextScore: Math.round(baseContext + faker.number.int({ min: -3, max: 3 })),
      trend,
    };
  });
};

/**
 * Generate habit strength data with confidence intervals
 */
export const generateHabitStrengthWithConfidence = (): HabitStrengthData[] => {
  return generateHabitStrengthData().map(item => ({
    ...item,
    confidenceUpper: item.habitStrength + faker.number.int({ min: 5, max: 15 }),
    confidenceLower: item.habitStrength - faker.number.int({ min: 5, max: 15 }),
  }));
};

/**
 * Generate edge case habit strength data (min/max values)
 */
export const generateHabitStrengthEdgeCases = (): HabitStrengthData[] => {
  const date = new Date().toISOString().split('T')[0];
  return [
    {
      date,
      habitStrength: 0,
      consistencyScore: 0,
      frequencyScore: 0,
      contextScore: 0,
      trend: 'stable' as const,
    },
    {
      date,
      habitStrength: 100,
      consistencyScore: 100,
      frequencyScore: 100,
      contextScore: 100,
      trend: 'increasing' as const,
    },
  ];
};