import { faker } from '@faker-js/faker';

// Faker configuration for deterministic test data
export class FakerSeeder {
  private static instance: FakerSeeder;
  private currentSeed: number = 12345; // Default seed for consistency
  private originalSeed: number = 12345;
  
  private constructor() {
    this.setSeed(this.currentSeed);
  }
  
  public static getInstance(): FakerSeeder {
    if (!FakerSeeder.instance) {
      FakerSeeder.instance = new FakerSeeder();
    }
    return FakerSeeder.instance;
  }
  
  public setSeed(seed: number): void {
    this.currentSeed = seed;
    faker.seed(seed);
  }
  
  public getCurrentSeed(): number {
    return this.currentSeed;
  }
  
  public resetToOriginalSeed(): void {
    this.setSeed(this.originalSeed);
  }
  
  public setOriginalSeed(seed: number): void {
    this.originalSeed = seed;
    this.setSeed(seed);
  }
  
  public generateDeterministicData<T>(generator: () => T, seed?: number): T {
    const currentSeed = this.currentSeed;
    if (seed !== undefined) {
      this.setSeed(seed);
    }
    
    const result = generator();
    
    if (seed !== undefined) {
      this.setSeed(currentSeed); // Restore original seed
    }
    
    return result;
  }
  
  public generateRandomData<T>(generator: () => T): T {
    const currentSeed = this.currentSeed;
    faker.seed(); // Use random seed
    
    const result = generator();
    
    this.setSeed(currentSeed); // Restore deterministic seed
    return result;
  }
}

// Initialize the seeder
export const fakerSeeder = FakerSeeder.getInstance();

// Seeding configuration options
export type SeedingOptions = {
  seed?: number;
  deterministic?: boolean;
  resetAfter?: boolean;
};

// Seeded data generation wrapper
export const withSeed = <T>(
  generator: () => T, 
  options: SeedingOptions = {}
): T => {
  const { seed = 12345, deterministic = true, resetAfter = true } = options;
  
  if (!deterministic) {
    return fakerSeeder.generateRandomData(generator);
  }
  
  const originalSeed = fakerSeeder.getCurrentSeed();
  
  try {
    fakerSeeder.setSeed(seed);
    return generator();
  } finally {
    if (resetAfter) {
      fakerSeeder.setSeed(originalSeed);
    }
  }
};

// Pre-configured seeds for different test scenarios
export const testSeeds = {
  unit: 12345,
  integration: 23456,
  e2e: 34567,
  visual: 45678,
  performance: 56789,
  accessibility: 67890,
  empty: 11111,
  minimal: 22222,
  rich: 33333,
  stress: 44444,
  error: 55555,
} as const;

export type TestSeedKey = keyof typeof testSeeds;

// Type definitions matching the component prop types
export type ExerciseLog = {
  id: number;
  exercise: string;
  sets: number;
  reps: number | null;
  weight: number | null;
  logged_at: string;
};

export type TrainingPlan = {
  id: number;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sessions_per_week: number;
  is_active: boolean;
  start_date: string | null;
};

export type Stats = {
  totalExerciseLogs: number;
  activePlans: number;
  completedSessions: number;
  weeklyProgress: number;
};

export type ExerciseOverviewProps = {
  recentLogs: ExerciseLog[];
  activeTrainingPlans: TrainingPlan[];
  stats: Stats;
};

// Union types for different data states
export type DataState = 'empty' | 'minimal' | 'rich';

// Common exercise names for realistic data
const EXERCISE_NAMES = [
  'Bench Press',
  'Squats',
  'Deadlifts',
  'Pull-ups',
  'Push-ups',
  'Overhead Press',
  'Barbell Rows',
  'Dumbbell Curls',
  'Tricep Dips',
  'Lunges',
  'Plank',
  'Burpees',
  'Mountain Climbers',
  'Russian Twists',
  'Leg Press',
  'Lat Pulldowns',
  'Shoulder Shrugs',
  'Calf Raises',
  'Hip Thrusts',
  'Face Pulls',
];

const TRAINING_PLAN_NAMES = [
  'Beginner Full Body',
  'Upper/Lower Split',
  'Push/Pull/Legs',
  'Strength Building',
  'Muscle Hypertrophy',
  'Powerlifting Program',
  'Bodyweight Basics',
  'HIIT Training',
  'Functional Fitness',
  'Olympic Lifting',
  'Calisthenics Progression',
  'Endurance Training',
];

// Date and Time Fixtures
export const createTimeAgoTimestamp = (hoursAgo: number): string => {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
};

export const mockTimestamps = {
  recent: createTimeAgoTimestamp(2),
  yesterday: createTimeAgoTimestamp(24),
  lastWeek: createTimeAgoTimestamp(168),
  lastMonth: createTimeAgoTimestamp(720),
};

export const recentTimestamps = Array.from({ length: 5 }, (_, i) => 
  createTimeAgoTimestamp(i * 2 + 1)
);

export const futureTimestamps = Array.from({ length: 3 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() + (i + 1) * 30);
  return date.toISOString();
});

export const pastTimestamps = Array.from({ length: 10 }, (_, i) => 
  createTimeAgoTimestamp((i + 1) * 24)
);

// Utility Functions
// Utility Functions with seeding support
export const generateExerciseLog = (
  overrides: Partial<ExerciseLog> = {},
  seedOptions: SeedingOptions = {}
): ExerciseLog => {
  return withSeed(() => {
    const hasWeight = faker.datatype.boolean({ probability: 0.8 });
    const hasReps = faker.datatype.boolean({ probability: 0.9 });
    
    return {
      id: faker.number.int({ min: 1, max: 10000 }),
      exercise: faker.helpers.arrayElement(EXERCISE_NAMES),
      sets: faker.number.int({ min: 1, max: 6 }),
      reps: hasReps ? faker.number.int({ min: 5, max: 20 }) : null,
      weight: hasWeight ? faker.number.float({ min: 10, max: 200, precision: 2.5 }) : null,
      logged_at: faker.date.recent({ days: 7 }).toISOString(),
      ...overrides,
    };
  }, seedOptions);
};

export const generateTrainingPlan = (
  overrides: Partial<TrainingPlan> = {},
  seedOptions: SeedingOptions = {}
): TrainingPlan => {
  return withSeed(() => {
    const difficulty = faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced'] as const);
    const isActive = faker.datatype.boolean({ probability: 0.3 });
    
    return {
      id: faker.number.int({ min: 1, max: 1000 }),
      name: faker.helpers.arrayElement(TRAINING_PLAN_NAMES),
      difficulty,
      sessions_per_week: faker.number.int({ min: 2, max: 6 }),
      is_active: isActive,
      start_date: isActive ? faker.date.past({ years: 1 }).toISOString() : null,
      ...overrides,
    };
  }, seedOptions);
};

export const generateStats = (
  overrides: Partial<Stats> = {},
  seedOptions: SeedingOptions = {}
): Stats => {
  return withSeed(() => {
    return {
      totalExerciseLogs: faker.number.int({ min: 0, max: 500 }),
      activePlans: faker.number.int({ min: 0, max: 5 }),
      completedSessions: faker.number.int({ min: 0, max: 100 }),
      weeklyProgress: faker.number.int({ min: 0, max: 10 }),
      ...overrides,
    };
  }, seedOptions);
};

// Seeded data generators for different test scenarios
export const generateSeededExerciseData = (scenario: TestSeedKey): ExerciseOverviewProps => {
  return withSeed(() => {
    const seed = testSeeds[scenario];
    
    switch (scenario) {
      case 'empty':
        return {
          recentLogs: [],
          activeTrainingPlans: [],
          stats: { totalExerciseLogs: 0, activePlans: 0, completedSessions: 0, weeklyProgress: 0 },
        };
        
      case 'minimal':
        return {
          recentLogs: [generateExerciseLog({}, { seed: seed + 1 })],
          activeTrainingPlans: [generateTrainingPlan({ is_active: true }, { seed: seed + 2 })],
          stats: generateStats({ totalExerciseLogs: 1, activePlans: 1 }, { seed: seed + 3 }),
        };
        
      case 'rich':
        return {
          recentLogs: Array.from({ length: 10 }, (_, i) => 
            generateExerciseLog({}, { seed: seed + i + 10 })
          ),
          activeTrainingPlans: Array.from({ length: 5 }, (_, i) => 
            generateTrainingPlan({}, { seed: seed + i + 20 })
          ),
          stats: generateStats({ totalExerciseLogs: 200, activePlans: 3 }, { seed: seed + 30 }),
        };
        
      case 'stress':
        return {
          recentLogs: Array.from({ length: 100 }, (_, i) => 
            generateExerciseLog({}, { seed: seed + i + 100 })
          ),
          activeTrainingPlans: Array.from({ length: 20 }, (_, i) => 
            generateTrainingPlan({}, { seed: seed + i + 200 })
          ),
          stats: generateStats({ totalExerciseLogs: 1000, activePlans: 10 }, { seed: seed + 300 }),
        };
        
      default:
        const logCount = faker.number.int({ min: 3, max: 8 });
        const planCount = faker.number.int({ min: 1, max: 4 });
        
        return {
          recentLogs: Array.from({ length: logCount }, (_, i) => 
            generateExerciseLog({}, { seed: seed + i + 40 })
          ),
          activeTrainingPlans: Array.from({ length: planCount }, (_, i) => 
            generateTrainingPlan({}, { seed: seed + i + 50 })
          ),
          stats: generateStats({}, { seed: seed + 60 }),
        };
    }
  }, { seed: testSeeds[scenario] });
};

// Deterministic data generators for consistent testing
export const generateDeterministicLogs = (count: number, baseSeed: number = testSeeds.unit): ExerciseLog[] => {
  return Array.from({ length: count }, (_, i) => 
    generateExerciseLog({}, { seed: baseSeed + i })
  );
};

export const generateDeterministicPlans = (count: number, baseSeed: number = testSeeds.unit): TrainingPlan[] => {
  return Array.from({ length: count }, (_, i) => 
    generateTrainingPlan({}, { seed: baseSeed + i + 1000 })
  );
};

export const generateDeterministicStats = (baseSeed: number = testSeeds.unit): Stats => {
  return generateStats({}, { seed: baseSeed + 2000 });
};

// Factory function for seeded test data
export const createSeededTestData = (options: {
  scenario?: TestSeedKey;
  seed?: number;
  logCount?: number;
  planCount?: number;
  customOverrides?: {
    logs?: Partial<ExerciseLog>[];
    plans?: Partial<TrainingPlan>[];
    stats?: Partial<Stats>;
  };
} = {}): ExerciseOverviewProps => {
  const { 
    scenario = 'unit', 
    seed = testSeeds[scenario], 
    logCount = 5, 
    planCount = 3,
    customOverrides = {}
  } = options;
  
  if (scenario && scenario !== 'unit') {
    return generateSeededExerciseData(scenario);
  }
  
  return withSeed(() => {
    const logs = Array.from({ length: logCount }, (_, i) => {
      const override = customOverrides.logs?.[i] || {};
      return generateExerciseLog(override, { seed: seed + i });
    });
    
    const plans = Array.from({ length: planCount }, (_, i) => {
      const override = customOverrides.plans?.[i] || {};
      return generateTrainingPlan(override, { seed: seed + i + 100 });
    });
    
    const stats = generateStats(customOverrides.stats || {}, { seed: seed + 200 });
    
    return { recentLogs: logs, activeTrainingPlans: plans, stats };
  }, { seed });
};

// Random data generator for exploratory testing
export const randomizeExerciseData = (useRandom: boolean = false): ExerciseOverviewProps => {
  if (useRandom) {
    return fakerSeeder.generateRandomData(() => {
      const logCount = faker.number.int({ min: 3, max: 8 });
      const planCount = faker.number.int({ min: 1, max: 4 });
      
      return {
        recentLogs: Array.from({ length: logCount }, () => generateExerciseLog()),
        activeTrainingPlans: Array.from({ length: planCount }, () => generateTrainingPlan()),
        stats: generateStats(),
      };
    });
  }
  
  // Use deterministic random data
  return generateSeededExerciseData('unit');
};

// Exercise Log Fixtures
export const mockExerciseLogs: ExerciseLog[] = [
  {
    id: 1,
    exercise: 'Bench Press',
    sets: 3,
    reps: 10,
    weight: 80.0,
    logged_at: createTimeAgoTimestamp(2),
  },
  {
    id: 2,
    exercise: 'Squats',
    sets: 4,
    reps: 12,
    weight: 100.0,
    logged_at: createTimeAgoTimestamp(4),
  },
  {
    id: 3,
    exercise: 'Pull-ups',
    sets: 3,
    reps: 8,
    weight: null,
    logged_at: createTimeAgoTimestamp(6),
  },
  {
    id: 4,
    exercise: 'Deadlifts',
    sets: 3,
    reps: 5,
    weight: 120.0,
    logged_at: createTimeAgoTimestamp(24),
  },
  {
    id: 5,
    exercise: 'Push-ups',
    sets: 2,
    reps: 20,
    weight: null,
    logged_at: createTimeAgoTimestamp(26),
  },
];

export const emptyExerciseLogs: ExerciseLog[] = [];

export const singleExerciseLog: ExerciseLog[] = [
  {
    id: 1,
    exercise: 'Bench Press',
    sets: 3,
    reps: 10,
    weight: 80.0,
    logged_at: createTimeAgoTimestamp(1),
  },
];

export const richExerciseLogs: ExerciseLog[] = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  exercise: EXERCISE_NAMES[i % EXERCISE_NAMES.length],
  sets: faker.number.int({ min: 2, max: 5 }),
  reps: faker.datatype.boolean({ probability: 0.9 }) ? faker.number.int({ min: 5, max: 20 }) : null,
  weight: faker.datatype.boolean({ probability: 0.8 }) ? faker.number.float({ min: 10, max: 200, precision: 2.5 }) : null,
  logged_at: createTimeAgoTimestamp(i * 3 + 1),
}));

export const recentExerciseLogs: ExerciseLog[] = recentTimestamps.map((timestamp, i) => ({
  id: i + 1,
  exercise: EXERCISE_NAMES[i % EXERCISE_NAMES.length],
  sets: 3,
  reps: 10,
  weight: 75.0,
  logged_at: timestamp,
}));

export const oldExerciseLogs: ExerciseLog[] = pastTimestamps.map((timestamp, i) => ({
  id: i + 1,
  exercise: EXERCISE_NAMES[i % EXERCISE_NAMES.length],
  sets: 3,
  reps: 10,
  weight: 70.0,
  logged_at: timestamp,
}));

// Training Plan Fixtures
export const mockTrainingPlans: TrainingPlan[] = [
  {
    id: 1,
    name: 'Beginner Full Body',
    difficulty: 'beginner',
    sessions_per_week: 3,
    is_active: true,
    start_date: faker.date.past({ years: 1 }).toISOString(),
  },
  {
    id: 2,
    name: 'Upper/Lower Split',
    difficulty: 'intermediate',
    sessions_per_week: 4,
    is_active: false,
    start_date: null,
  },
  {
    id: 3,
    name: 'Push/Pull/Legs',
    difficulty: 'advanced',
    sessions_per_week: 6,
    is_active: true,
    start_date: faker.date.past({ months: 6 }).toISOString(),
  },
];

export const emptyTrainingPlans: TrainingPlan[] = [];

export const activeTrainingPlans: TrainingPlan[] = [
  {
    id: 1,
    name: 'Strength Building',
    difficulty: 'intermediate',
    sessions_per_week: 4,
    is_active: true,
    start_date: faker.date.past({ months: 3 }).toISOString(),
  },
  {
    id: 2,
    name: 'HIIT Training',
    difficulty: 'beginner',
    sessions_per_week: 3,
    is_active: true,
    start_date: faker.date.past({ months: 1 }).toISOString(),
  },
];

export const inactiveTrainingPlans: TrainingPlan[] = [
  {
    id: 1,
    name: 'Muscle Hypertrophy',
    difficulty: 'advanced',
    sessions_per_week: 5,
    is_active: false,
    start_date: null,
  },
  {
    id: 2,
    name: 'Bodyweight Basics',
    difficulty: 'beginner',
    sessions_per_week: 3,
    is_active: false,
    start_date: null,
  },
];

export const beginnerPlans: TrainingPlan[] = [
  {
    id: 1,
    name: 'Beginner Full Body',
    difficulty: 'beginner',
    sessions_per_week: 3,
    is_active: true,
    start_date: faker.date.past({ months: 2 }).toISOString(),
  },
  {
    id: 2,
    name: 'Bodyweight Basics',
    difficulty: 'beginner',
    sessions_per_week: 2,
    is_active: false,
    start_date: null,
  },
];

export const intermediateAdvancedPlans: TrainingPlan[] = [
  {
    id: 1,
    name: 'Powerlifting Program',
    difficulty: 'advanced',
    sessions_per_week: 5,
    is_active: true,
    start_date: faker.date.past({ months: 4 }).toISOString(),
  },
  {
    id: 2,
    name: 'Upper/Lower Split',
    difficulty: 'intermediate',
    sessions_per_week: 4,
    is_active: true,
    start_date: faker.date.past({ months: 2 }).toISOString(),
  },
];

// Stats Fixtures
export const mockStats: Stats = {
  totalExerciseLogs: 45,
  activePlans: 2,
  completedSessions: 28,
  weeklyProgress: 4,
};

export const emptyStats: Stats = {
  totalExerciseLogs: 0,
  activePlans: 0,
  completedSessions: 0,
  weeklyProgress: 0,
};

export const highStats: Stats = {
  totalExerciseLogs: 1250,
  activePlans: 5,
  completedSessions: 365,
  weeklyProgress: 7,
};

export const trendingUpStats: Stats = {
  totalExerciseLogs: 52,
  activePlans: 3,
  completedSessions: 35,
  weeklyProgress: 6,
};

export const trendingDownStats: Stats = {
  totalExerciseLogs: 38,
  activePlans: 1,
  completedSessions: 18,
  weeklyProgress: 2,
};

export const neutralTrendStats: Stats = {
  totalExerciseLogs: 45,
  activePlans: 2,
  completedSessions: 28,
  weeklyProgress: 4,
};

// Combined Data Fixtures
export const defaultExerciseOverviewData: ExerciseOverviewProps = {
  recentLogs: mockExerciseLogs,
  activeTrainingPlans: mockTrainingPlans,
  stats: mockStats,
};

export const emptyExerciseOverviewData: ExerciseOverviewProps = {
  recentLogs: emptyExerciseLogs,
  activeTrainingPlans: emptyTrainingPlans,
  stats: emptyStats,
};

export const richExerciseOverviewData: ExerciseOverviewProps = {
  recentLogs: richExerciseLogs,
  activeTrainingPlans: [...activeTrainingPlans, ...inactiveTrainingPlans],
  stats: highStats,
};

export const minimalExerciseOverviewData: ExerciseOverviewProps = {
  recentLogs: singleExerciseLog,
  activeTrainingPlans: [activeTrainingPlans[0]],
  stats: {
    totalExerciseLogs: 1,
    activePlans: 1,
    completedSessions: 1,
    weeklyProgress: 1,
  },
};

// Behavioral Tracking Fixtures
export const mockTrackingEvents = {
  exerciseOverviewViewed: {
    eventName: 'exercise_overview_viewed',
    entityType: 'ui_interaction' as const,
    context: {
      ui: {
        component: 'ExerciseOverview',
        element: 'OverviewPage',
      },
      exercise: {
        totalWorkouts: 45,
        activePlans: 2,
        completedSessions: 28,
        weeklyProgress: 4,
        hasRecentLogs: true,
        hasActivePlans: true,
      },
    },
  },
  statCardClicked: {
    eventName: 'exercise_stat_card_clicked',
    entityType: 'ui_interaction' as const,
    context: {
      ui: {
        component: 'ExerciseOverview',
        element: 'StatCard',
        statType: 'total_workouts',
        statValue: '45',
        trend: 'neutral',
      },
    },
  },
  trainingPlanCardViewed: {
    eventName: 'training_plan_card_viewed',
    entityType: 'training_session' as const,
    entityId: 1,
    context: {
      ui: {
        component: 'ExerciseOverview',
        element: 'TrainingPlanCard',
      },
      exercise: {
        planName: 'Beginner Full Body',
        difficulty: 'beginner',
        sessionsPerWeek: 3,
        isActive: true,
        startDate: '2023-01-01T00:00:00.000Z',
      },
    },
  },
};

export const mockTrackingContext = {
  ui: {
    component: 'ExerciseOverview',
    element: 'TestElement',
  },
  exercise: {
    totalWorkouts: 45,
    activePlans: 2,
  },
};

export const mockDeviceInfo = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  platform: 'MacIntel',
  screenWidth: 1920,
  screenHeight: 1080,
  deviceType: 'desktop' as const,
  browser: 'Chrome',
  os: 'macOS',
};

export const mockEnvironmentInfo = {
  timestamp: new Date('2024-01-01T12:00:00.000Z'),
  timezone: 'America/New_York',
  locale: 'en-US',
  referrer: 'https://example.com',
  networkType: '4g' as const,
};

// Error State Fixtures
export const invalidExerciseData = {
  recentLogs: [
    {
      id: 'invalid' as any,
      exercise: '',
      sets: -1,
      reps: 'invalid' as any,
      weight: 'invalid' as any,
      logged_at: 'invalid-date',
    },
  ],
  activeTrainingPlans: [
    {
      id: null as any,
      name: '',
      difficulty: 'invalid' as any,
      sessions_per_week: -1,
      is_active: 'invalid' as any,
      start_date: 'invalid-date',
    },
  ],
  stats: {
    totalExerciseLogs: 'invalid' as any,
    activePlans: null as any,
    completedSessions: -1,
    weeklyProgress: 'invalid' as any,
  },
};

export const partialExerciseData = {
  recentLogs: [
    {
      id: 1,
      exercise: 'Bench Press',
      sets: 3,
      // Missing reps, weight, logged_at
    } as any,
  ],
  activeTrainingPlans: [
    {
      id: 1,
      name: 'Test Plan',
      // Missing difficulty, sessions_per_week, is_active, start_date
    } as any,
  ],
  stats: {
    totalExerciseLogs: 10,
    // Missing activePlans, completedSessions, weeklyProgress
  } as any,
};

export const corruptedStats = {
  totalExerciseLogs: Number.NaN,
  activePlans: Number.POSITIVE_INFINITY,
  completedSessions: Number.NEGATIVE_INFINITY,
  weeklyProgress: undefined as any,
};

// Factory Functions
export const createExerciseOverviewProps = (options: {
  state?: DataState;
  logCount?: number;
  planCount?: number;
  customStats?: Partial<Stats>;
} = {}): ExerciseOverviewProps => {
  const { state = 'minimal', logCount = 3, planCount = 2, customStats = {} } = options;

  switch (state) {
    case 'empty':
      return emptyExerciseOverviewData;
    case 'rich':
      return richExerciseOverviewData;
    case 'minimal':
    default:
      return {
        recentLogs: Array.from({ length: logCount }, () => generateExerciseLog()),
        activeTrainingPlans: Array.from({ length: planCount }, () => generateTrainingPlan()),
        stats: { ...generateStats(), ...customStats },
      };
  }
};

export const createMockBehaviorTracking = () => {
  // Import vi from vitest for consistency with project's testing framework
  const vi = require('vitest').vi || require('jest'); // Fallback for older environments
  const mockTrackEvent = vi.fn().mockResolvedValue(undefined);
  
  return {
    trackEvent: mockTrackEvent,
    isLoading: false,
    error: null,
    flushEvents: vi.fn().mockResolvedValue(undefined),
  };
};

// Seeded fixture variations for comprehensive testing
export const seededFixtures = {
  // Unit test fixtures (deterministic)
  unit: {
    logs: () => generateDeterministicLogs(3, testSeeds.unit),
    plans: () => generateDeterministicPlans(2, testSeeds.unit),
    stats: () => generateDeterministicStats(testSeeds.unit),
    complete: () => createSeededTestData({ scenario: 'unit' }),
  },
  
  // Integration test fixtures
  integration: {
    logs: () => generateDeterministicLogs(5, testSeeds.integration),
    plans: () => generateDeterministicPlans(3, testSeeds.integration),
    stats: () => generateDeterministicStats(testSeeds.integration),
    complete: () => createSeededTestData({ scenario: 'integration' }),
  },
  
  // End-to-end test fixtures
  e2e: {
    logs: () => generateDeterministicLogs(8, testSeeds.e2e),
    plans: () => generateDeterministicPlans(4, testSeeds.e2e),
    stats: () => generateDeterministicStats(testSeeds.e2e),
    complete: () => createSeededTestData({ scenario: 'e2e' }),
  },
  
  // Visual regression test fixtures
  visual: {
    logs: () => generateDeterministicLogs(6, testSeeds.visual),
    plans: () => generateDeterministicPlans(3, testSeeds.visual),
    stats: () => generateDeterministicStats(testSeeds.visual),
    complete: () => createSeededTestData({ scenario: 'visual' }),
  },
  
  // Performance test fixtures
  performance: {
    logs: () => generateDeterministicLogs(50, testSeeds.performance),
    plans: () => generateDeterministicPlans(10, testSeeds.performance),
    stats: () => generateDeterministicStats(testSeeds.performance),
    complete: () => createSeededTestData({ scenario: 'performance' }),
  },
  
  // Accessibility test fixtures
  accessibility: {
    logs: () => generateDeterministicLogs(4, testSeeds.accessibility),
    plans: () => generateDeterministicPlans(2, testSeeds.accessibility),
    stats: () => generateDeterministicStats(testSeeds.accessibility),
    complete: () => createSeededTestData({ scenario: 'accessibility' }),
  },
};

// Helper function to reset faker seed for test isolation
export const resetFakerSeed = (seed?: number) => {
  fakerSeeder.setSeed(seed || testSeeds.unit);
};

// Helper function for test setup with seeded data
export const setupSeededTest = (scenario: TestSeedKey = 'unit') => {
  fakerSeeder.setSeed(testSeeds[scenario]);
  return {
    data: generateSeededExerciseData(scenario),
    seed: testSeeds[scenario],
    resetSeed: () => resetFakerSeed(testSeeds[scenario]),
  };
};

// Export seeded data for specific test types
export const getSeededDataForTestType = (testType: keyof typeof seededFixtures) => {
  return seededFixtures[testType];
};

export const createTestScenario = (scenarioName: string): ExerciseOverviewProps => {
  switch (scenarioName) {
    case 'new_user':
      return emptyExerciseOverviewData;
    case 'active_user':
      return {
        recentLogs: recentExerciseLogs.slice(0, 5),
        activeTrainingPlans: activeTrainingPlans,
        stats: trendingUpStats,
      };
    case 'power_user':
      return richExerciseOverviewData;
    case 'inactive_user':
      return {
        recentLogs: oldExerciseLogs.slice(0, 2),
        activeTrainingPlans: inactiveTrainingPlans,
        stats: trendingDownStats,
      };
    case 'beginner':
      return {
        recentLogs: singleExerciseLog,
        activeTrainingPlans: beginnerPlans.slice(0, 1),
        stats: {
          totalExerciseLogs: 5,
          activePlans: 1,
          completedSessions: 3,
          weeklyProgress: 2,
        },
      };
    case 'advanced':
      return {
        recentLogs: richExerciseLogs.slice(0, 8),
        activeTrainingPlans: intermediateAdvancedPlans,
        stats: highStats,
      };
    default:
      return defaultExerciseOverviewData;
  }
};