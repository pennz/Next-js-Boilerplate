import type { BehaviorDataPoint } from '../BehaviorAnalyticsChart';

export type MockApiResponse = {
  data: any[];
  success: boolean;
  error?: string;
  timestamp: string;
};

/**
 * Generate corrupted data for error testing
 */
export const generateCorruptedData = (): any[] => {
  return [
    { date: 'invalid-date', frequency: 'not-a-number' },
    { consistency: 50 }, // missing required fields
    null,
    undefined,
    { date: '2024-01-01', frequency: -5, consistency: 150 }, // invalid values
  ];
};

/**
 * Generate partial data for incomplete data testing
 */
export const generatePartialData = (): Partial<BehaviorDataPoint>[] => {
  return [
    { date: '2024-01-01', frequency: 5 }, // missing consistency and strength
    { date: '2024-01-02', consistency: 75 }, // missing frequency and strength
    { date: '2024-01-03', strength: 60 }, // missing frequency and consistency
  ];
};

/**
 * Generate loading state data (null)
 */
export const generateLoadingStateData = (): null => {
  return null;
};

/**
 * Create mock API responses for different endpoints
 */
export const createMockApiResponses = (): Record<string, MockApiResponse> => {
  return {
    summary: {
      data: [],
      success: true,
      timestamp: new Date().toISOString(),
    },
    habitStrength: {
      data: [],
      success: true,
      timestamp: new Date().toISOString(),
    },
    contextPatterns: {
      data: [],
      success: true,
      timestamp: new Date().toISOString(),
    },
    behaviorFrequency: {
      data: [],
      success: true,
      timestamp: new Date().toISOString(),
    },
  };
};