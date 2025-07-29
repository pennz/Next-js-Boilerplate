import { faker } from '@faker-js/faker';
import type { BehaviorDataPoint } from '../BehaviorAnalyticsChart';

export type TrendType = 'increasing' | 'decreasing' | 'stable';

/**
 * Generate basic behavior frequency data points
 */
export const generateBehaviorFrequencyData = (count: number = 14): BehaviorDataPoint[] => {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - i));
    
    return {
      date: date.toISOString().split('T')[0],
      frequency: faker.number.int({ min: 0, max: 10 }),
      consistency: faker.number.int({ min: 40, max: 100 }),
      strength: faker.number.int({ min: 30, max: 95 }),
      context: faker.helpers.arrayElement(['morning', 'afternoon', 'evening', 'weekend']),
      label: faker.helpers.arrayElement(['Exercise', 'Reading', 'Meditation', 'Coding']),
    };
  });
};

/**
 * Generate empty behavior data for testing empty states
 */
export const generateEmptyBehaviorData = (): BehaviorDataPoint[] => {
  return [];
};

/**
 * Generate single data point for minimal testing
 */
export const generateSingleBehaviorPoint = (): BehaviorDataPoint[] => {
  return [{
    date: new Date().toISOString().split('T')[0],
    frequency: 5,
    consistency: 75,
    strength: 60,
    context: 'morning',
    label: 'Exercise',
  }];
};

/**
 * Generate large dataset for performance testing
 */
export const generateLargeBehaviorDataset = (): BehaviorDataPoint[] => {
  return generateBehaviorFrequencyData(35);
};

/**
 * Generate behavior data with specific trends
 */
export const generateBehaviorDataWithTrends = (trend: TrendType): BehaviorDataPoint[] => {
  const count = 14;
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - i));
    
    let frequency: number;
    let consistency: number;
    let strength: number;
    
    switch (trend) {
      case 'increasing':
        frequency = Math.floor(2 + (i / count) * 8);
        consistency = Math.floor(40 + (i / count) * 50);
        strength = Math.floor(30 + (i / count) * 60);
        break;
      case 'decreasing':
        frequency = Math.floor(10 - (i / count) * 8);
        consistency = Math.floor(90 - (i / count) * 50);
        strength = Math.floor(90 - (i / count) * 60);
        break;
      case 'stable':
      default:
        frequency = 5 + faker.number.int({ min: -1, max: 1 });
        consistency = 70 + faker.number.int({ min: -5, max: 5 });
        strength = 65 + faker.number.int({ min: -5, max: 5 });
        break;
    }
    
    return {
      date: date.toISOString().split('T')[0],
      frequency,
      consistency,
      strength,
      context: faker.helpers.arrayElement(['morning', 'afternoon', 'evening']),
    };
  });
};

/**
 * Generate historical data for long-term analysis
 */
export const generateHistoricalData = (): BehaviorDataPoint[] => {
  return Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (90 - i));
    
    return {
      date: date.toISOString().split('T')[0],
      frequency: faker.number.int({ min: 0, max: 10 }),
      consistency: faker.number.int({ min: 40, max: 100 }),
      strength: faker.number.int({ min: 30, max: 95 }),
    };
  });
};

/**
 * Generate future projections for prediction testing
 */
export const generateFutureProjections = (): BehaviorDataPoint[] => {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    
    return {
      date: date.toISOString().split('T')[0],
      frequency: faker.number.int({ min: 3, max: 8 }),
      consistency: faker.number.int({ min: 60, max: 85 }),
      strength: faker.number.int({ min: 50, max: 80 }),
      label: 'Predicted',
    };
  });
};