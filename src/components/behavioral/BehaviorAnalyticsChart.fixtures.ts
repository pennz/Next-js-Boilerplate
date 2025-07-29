import { faker } from '@faker-js/faker';
import type {
  BehaviorDataPoint,
  HabitStrengthData,
  ContextPatternData,
  BehaviorAnalyticsChartProps,
} from './BehaviorAnalyticsChart';
import type { BehaviorAnalyticsSummary } from './BehaviorAnalyticsDashboard';

// Mock Data Type Definitions
export type DataState = 'empty' | 'minimal' | 'rich' | 'error' | 'loading';
export type TrendType = 'increasing' | 'decreasing' | 'stable';
export type TimeRange = '7d' | '30d' | '90d' | '1y';
export type ChartType = 'behavior_frequency' | 'habit_strength' | 'context_patterns' | 'consistency_trends';

export type BehaviorPattern = {
  id: string;
  behaviorType: string;
  strength: number;
  frequency: number;
  consistency: number;
  confidence: number;
  topTrigger?: string;
};

export type MockApiResponse = {
  data: any[];
  success: boolean;
  error?: string;
  timestamp: string;
};

// BehaviorDataPoint Fixtures
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

export const generateEmptyBehaviorData = (): BehaviorDataPoint[] => {
  return [];
};

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

export const generateLargeBehaviorDataset = (): BehaviorDataPoint[] => {
  return generateBehaviorFrequencyData(35);
};

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

// HabitStrengthData Fixtures
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

export const generateHabitStrengthWithConfidence = (): HabitStrengthData[] => {
  return generateHabitStrengthData().map(item => ({
    ...item,
    confidenceUpper: item.habitStrength + faker.number.int({ min: 5, max: 15 }),
    confidenceLower: item.habitStrength - faker.number.int({ min: 5, max: 15 }),
  }));
};

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

// ContextPatternData Fixtures
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

export const generateContextPatternsVariedSuccess = (): ContextPatternData[] => {
  return [
    { context: 'High Success', successRate: 95, frequency: 10, confidence: 90, predictivePower: 85 },
    { context: 'Medium Success', successRate: 65, frequency: 7, confidence: 75, predictivePower: 60 },
    { context: 'Low Success', successRate: 25, frequency: 3, confidence: 60, predictivePower: 40 },
  ];
};

export const generateContextPatternsEmpty = (): ContextPatternData[] => {
  return [];
};

// Dashboard Summary Fixtures
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

export const generateSummaryWithTrends = (trend: 'up' | 'down' | 'stable'): BehaviorAnalyticsSummary => {
  const base = generateBehaviorAnalyticsSummary();
  return {
    ...base,
    weeklyTrend: trend,
    habitStrengthAvg: trend === 'up' ? 85 : trend === 'down' ? 55 : 70,
    consistencyScore: trend === 'up' ? 90 : trend === 'down' ? 60 : 75,
  };
};

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

export const generateSummaryEmpty = (): BehaviorAnalyticsSummary => {
  return generateSummaryEdgeCases();
};

// Pattern and Insight Fixtures
export const generateBehaviorPatterns = (count: number = 6): BehaviorPattern[] => {
  const behaviorTypes = [
    'Exercise',
    'Reading',
    'Meditation',
    'Coding',
    'Journaling',
    'Healthy Eating',
    'Sleep Routine',
    'Social Interaction',
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    id: faker.string.uuid(),
    behaviorType: behaviorTypes[i] || `Behavior ${i + 1}`,
    strength: faker.number.int({ min: 40, max: 95 }),
    frequency: faker.number.int({ min: 2, max: 14 }),
    consistency: faker.number.int({ min: 50, max: 95 }),
    confidence: faker.number.int({ min: 65, max: 95 }),
    topTrigger: faker.helpers.arrayElement([
      'Morning alarm',
      'After coffee',
      'Lunch break',
      'Evening routine',
      'Weekend mornings',
    ]),
  }));
};

export const generatePatternInsights = (): BehaviorPattern[] => {
  return generateBehaviorPatterns();
};

export const generatePatternsWithVariedStrength = (): BehaviorPattern[] => {
  return [
    {
      id: faker.string.uuid(),
      behaviorType: 'Strong Pattern',
      strength: 90,
      frequency: 12,
      consistency: 95,
      confidence: 90,
      topTrigger: 'Morning alarm',
    },
    {
      id: faker.string.uuid(),
      behaviorType: 'Moderate Pattern',
      strength: 65,
      frequency: 7,
      consistency: 70,
      confidence: 75,
      topTrigger: 'Lunch break',
    },
    {
      id: faker.string.uuid(),
      behaviorType: 'Weak Pattern',
      strength: 45,
      frequency: 3,
      consistency: 50,
      confidence: 60,
      topTrigger: 'Weekend mornings',
    },
  ];
};

export const generatePatternsEmpty = (): BehaviorPattern[] => {
  return [];
};

// Time-based Data Generators
export const generateDataForTimeRange = (range: TimeRange): BehaviorDataPoint[] => {
  const days = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
  };
  
  return generateBehaviorFrequencyData(days[range]);
};

export const generateRecentTimestamps = (count: number = 5): string[] => {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - i * 5);
    return date.toISOString();
  });
};

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

// Error and Loading State Fixtures
export const generateCorruptedData = (): any[] => {
  return [
    { date: 'invalid-date', frequency: 'not-a-number' },
    { consistency: 50 }, // missing required fields
    null,
    undefined,
    { date: '2024-01-01', frequency: -5, consistency: 150 }, // invalid values
  ];
};

export const generatePartialData = (): Partial<BehaviorDataPoint>[] => {
  return [
    { date: '2024-01-01', frequency: 5 }, // missing consistency and strength
    { date: '2024-01-02', consistency: 75 }, // missing frequency and strength
    { date: '2024-01-03', strength: 60 }, // missing frequency and consistency
  ];
};

export const generateLoadingStateData = (): null => {
  return null;
};

// Utility Functions
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

export const createRandomizedData = (): BehaviorDataPoint[] => {
  return generateBehaviorFrequencyData(faker.number.int({ min: 5, max: 50 }));
};

export const createDataWithSpecificTrend = (trend: TrendType): BehaviorDataPoint[] => {
  return generateBehaviorDataWithTrends(trend);
};

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

// Factory Functions
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

export const createBehaviorAnalyticsDashboardProps = (overrides: any = {}) => {
  const defaults = {
    timeRange: '30d' as const,
    behaviorTypes: ['Exercise', 'Reading'],
    refreshInterval: 30000,
    showRealTimeUpdates: true,
  };
  
  return { ...defaults, ...overrides };
};

export const createMockApiResponses = (): Record<string, MockApiResponse> => {
  return {
    summary: {
      data: [generateBehaviorAnalyticsSummary()],
      success: true,
      timestamp: new Date().toISOString(),
    },
    habitStrength: {
      data: generateHabitStrengthData(),
      success: true,
      timestamp: new Date().toISOString(),
    },
    contextPatterns: {
      data: generateContextPatternsData(),
      success: true,
      timestamp: new Date().toISOString(),
    },
    behaviorFrequency: {
      data: generateBehaviorFrequencyData(),
      success: true,
      timestamp: new Date().toISOString(),
    },
  };
};

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

// Export all fixture functions for easy access
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
  createDataWithSpecificTrend,
  createChartPropsForType,
  
  // Factories
  createBehaviorAnalyticsChartProps,
  createBehaviorAnalyticsDashboardProps,
  createMockApiResponses,
  createTestScenario,
};