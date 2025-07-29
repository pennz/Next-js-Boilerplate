import { faker } from '@faker-js/faker';
import type { BehaviorDataPoint } from '../BehaviorAnalyticsChart';

export type TrendType = 'increasing' | 'decreasing' | 'stable';
export type TimeRange = '7d' | '30d' | '90d' | '1y';

/**
 * Create deterministic data for consistent visual regression tests
 */
export const createDeterministicData = (seed: string = 'test'): BehaviorDataPoint[] => {
  // Use a deterministic approach for consistent visual regression tests
  const seedNum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date('2024-01-01');
    date.setDate(date.getDate() + i);
    
    // Use seed to generate consistent values
    const frequency = 3 + ((seedNum + i) % 5);
    const consistency = 60 + ((seedNum + i * 2) % 30);
    const strength = 50 + ((seedNum + i * 3) % 40);
    
    return {
      date: date.toISOString().split('T')[0],
      frequency,
      consistency,
      strength,
    };
  });
};

/**
 * Create randomized data for dynamic testing
 */
export const createRandomizedData = (): BehaviorDataPoint[] => {
  const count = faker.number.int({ min: 5, max: 50 });
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - i));
    
    return {
      date: date.toISOString().split('T')[0],
      frequency: faker.number.int({ min: 0, max: 10 }),
      consistency: faker.number.int({ min: 40, max: 100 }),
      strength: faker.number.int({ min: 30, max: 95 }),
    };
  });
};

/**
 * Generate data for specific time ranges
 */
export const generateDataForTimeRange = (range: TimeRange): BehaviorDataPoint[] => {
  const days = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };
  
  const count = days[range];
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - i));
    
    return {
      date: date.toISOString().split('T')[0],
      frequency: faker.number.int({ min: 0, max: 10 }),
      consistency: faker.number.int({ min: 40, max: 100 }),
      strength: faker.number.int({ min: 30, max: 95 }),
    };
  });
};

/**
 * Generate recent timestamps for real-time testing
 */
export const generateRecentTimestamps = (count: number = 5): string[] => {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - i * 5);
    return date.toISOString();
  });
};