import { faker } from '@faker-js/faker';

export type BehaviorPattern = {
  id: string;
  behaviorType: string;
  strength: number;
  frequency: number;
  consistency: number;
  confidence: number;
  topTrigger?: string;
};

/**
 * Generate behavior patterns for testing
 */
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

/**
 * Generate pattern insights - alias for generateBehaviorPatterns
 */
export const generatePatternInsights = (): BehaviorPattern[] => {
  return generateBehaviorPatterns();
};

/**
 * Generate patterns with varied strength levels for testing
 */
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

/**
 * Generate empty patterns for empty state testing
 */
export const generatePatternsEmpty = (): BehaviorPattern[] => {
  return [];
};