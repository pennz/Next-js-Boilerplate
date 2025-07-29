import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { vi } from 'vitest';
import { ExerciseOverview } from './ExerciseOverview';

// Mock the behavior tracking hook
const mockTrackEvent = action('trackEvent');
vi.mock('@/hooks/useBehaviorTracking', () => ({
  useBehaviorTracking: () => ({
    trackEvent: mockTrackEvent,
    isLoading: false,
    error: null,
    flushEvents: action('flushEvents'),
  }),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Types for our mock data
type ExerciseLog = {
  id: number;
  exercise: string;
  sets: number;
  reps: number | null;
  weight: number | null;
  logged_at: string;
};

type TrainingPlan = {
  id: number;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sessions_per_week: number;
  is_active: boolean;
  start_date: string | null;
};

type Stats = {
  totalExerciseLogs: number;
  activePlans: number;
  completedSessions: number;
  weeklyProgress: number;
};

// Mock data generators
const generateExerciseLog = (overrides?: Partial<ExerciseLog>): ExerciseLog => {
  const exercises = [
    'Bench Press', 'Squats', 'Deadlifts', 'Pull-ups', 'Push-ups', 'Overhead Press',
    'Barbell Rows', 'Dips', 'Lunges', 'Planks', 'Bicep Curls', 'Tricep Extensions',
    'Lat Pulldowns', 'Leg Press', 'Shoulder Raises', 'Calf Raises'
  ];
  
  const baseLog: ExerciseLog = {
    id: Math.floor(Math.random() * 1000),
    exercise: exercises[Math.floor(Math.random() * exercises.length)],
    sets: Math.floor(Math.random() * 5) + 1,
    reps: Math.floor(Math.random() * 15) + 5,
    weight: Math.floor(Math.random() * 100) + 20,
    logged_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  
  return { ...baseLog, ...overrides };
};

const generateTrainingPlan = (overrides?: Partial<TrainingPlan>): TrainingPlan => {
  const planNames = [
    'Beginner Full Body', 'Push Pull Legs', 'Upper Lower Split', 'Strength Building',
    'Muscle Building Program', 'Powerlifting Prep', 'Athletic Performance', 'Home Workout Plan',
    'Bodyweight Training', 'Olympic Lifting', 'Functional Fitness', 'Endurance Training'
  ];
  
  const difficulties: Array<'beginner' | 'intermediate' | 'advanced'> = ['beginner', 'intermediate', 'advanced'];
  
  const basePlan: TrainingPlan = {
    id: Math.floor(Math.random() * 1000),
    name: planNames[Math.floor(Math.random() * planNames.length)],
    difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
    sessions_per_week: Math.floor(Math.random() * 6) + 2,
    is_active: Math.random() > 0.5,
    start_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  
  return { ...basePlan, ...overrides };
};

const generateStats = (overrides?: Partial<Stats>): Stats => {
  const baseStats: Stats = {
    totalExerciseLogs: Math.floor(Math.random() * 200) + 50,
    activePlans: Math.floor(Math.random() * 3) + 1,
    completedSessions: Math.floor(Math.random() * 100) + 20,
    weeklyProgress: Math.floor(Math.random() * 10) + 1,
  };
  
  return { ...baseStats, ...overrides };
};

// Time-specific generators
const generateRecentLog = (hoursAgo: number): ExerciseLog => {
  return generateExerciseLog({
    logged_at: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
  });
};

const generateOldLog = (daysAgo: number): ExerciseLog => {
  return generateExerciseLog({
    logged_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  });
};

// Component metadata
const meta: Meta<typeof ExerciseOverview> = {
  title: 'Exercise/ExerciseOverview',
  component: ExerciseOverview,
  parameters: {
    docs: {
      description: {
        component: 'Exercise overview component displaying workout statistics, recent exercise logs, active training plans, and quick actions. Features behavioral tracking, responsive design, and accessibility support.',
      },
    },
    actions: {
      handles: ['click', 'keydown'],
    },
  },
  args: {
    recentLogs: [],
    activeTrainingPlans: [],
    stats: generateStats(),
  },
  argTypes: {
    recentLogs: {
      control: { type: 'object' },
      description: 'Array of recent exercise logs',
    },
    activeTrainingPlans: {
      control: { type: 'object' },
      description: 'Array of active training plans',
    },
    stats: {
      control: { type: 'object' },
      description: 'Exercise statistics object',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ExerciseOverview>;

// Primary Stories
export const Default: Story = {
  args: {
    recentLogs: [
      generateRecentLog(2),
      generateRecentLog(6),
      generateRecentLog(24),
      generateRecentLog(48),
    ],
    activeTrainingPlans: [
      generateTrainingPlan({ is_active: true, difficulty: 'intermediate' }),
      generateTrainingPlan({ is_active: true, difficulty: 'beginner' }),
    ],
    stats: generateStats({
      totalExerciseLogs: 156,
      activePlans: 2,
      completedSessions: 45,
      weeklyProgress: 7,
    }),
  },
  parameters: {
    docs: {
      description: {
        story: 'Default view showing typical exercise data with multiple logs, active plans, and positive statistics.',
      },
    },
  },
};

export const EmptyState: Story = {
  args: {
    recentLogs: [],
    activeTrainingPlans: [],
    stats: {
      totalExerciseLogs: 0,
      activePlans: 0,
      completedSessions: 0,
      weeklyProgress: 0,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when user has no exercise data, showing empty sections and zero statistics.',
      },
    },
  },
};

export const SingleItems: Story = {
  args: {
    recentLogs: [generateRecentLog(3)],
    activeTrainingPlans: [generateTrainingPlan({ is_active: true })],
    stats: {
      totalExerciseLogs: 1,
      activePlans: 1,
      completedSessions: 1,
      weeklyProgress: 1,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal data scenario with single exercise log and training plan.',
      },
    },
  },
};

export const RichData: Story = {
  args: {
    recentLogs: Array.from({ length: 8 }, (_, i) => generateRecentLog(i * 6 + 1)),
    activeTrainingPlans: [
      generateTrainingPlan({ is_active: true, difficulty: 'advanced', name: 'Advanced Powerlifting Program' }),
      generateTrainingPlan({ is_active: true, difficulty: 'intermediate', name: 'Hypertrophy Training' }),
      generateTrainingPlan({ is_active: false, difficulty: 'beginner', name: 'Foundation Building' }),
    ],
    stats: {
      totalExerciseLogs: 342,
      activePlans: 3,
      completedSessions: 128,
      weeklyProgress: 12,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Rich data scenario with extensive exercise logs, multiple training plans, and high statistics.',
      },
    },
  },
};

// Variation Stories
export const DifferentDifficultyLevels: Story = {
  args: {
    recentLogs: [generateRecentLog(4)],
    activeTrainingPlans: [
      generateTrainingPlan({ difficulty: 'beginner', name: 'Beginner Full Body', is_active: true }),
      generateTrainingPlan({ difficulty: 'intermediate', name: 'Intermediate Push/Pull/Legs', is_active: true }),
      generateTrainingPlan({ difficulty: 'advanced', name: 'Advanced Powerlifting', is_active: false }),
    ],
    stats: generateStats(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Training plans with different difficulty levels showing color-coded badges.',
      },
    },
  },
};

export const VariousTrends: Story = {
  args: {
    recentLogs: [generateRecentLog(2)],
    activeTrainingPlans: [generateTrainingPlan({ is_active: true })],
    stats: {
      totalExerciseLogs: 89,
      activePlans: 2,
      completedSessions: 34,
      weeklyProgress: 8,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Statistics with different trend indicators (up, down, neutral) for testing trend display.',
      },
    },
  },
};

export const TimeVariations: Story = {
  args: {
    recentLogs: [
      generateRecentLog(0.5), // 30 minutes ago
      generateRecentLog(3),   // 3 hours ago
      generateRecentLog(12),  // 12 hours ago
      generateRecentLog(36),  // 36 hours ago
      generateOldLog(3),      // 3 days ago
    ],
    activeTrainingPlans: [generateTrainingPlan({ is_active: true })],
    stats: generateStats(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Recent logs with various timestamps to test time ago calculations and display.',
      },
    },
  },
};

// Interactive Stories
export const ClickableElements: Story = {
  args: {
    recentLogs: [generateRecentLog(2), generateRecentLog(8)],
    activeTrainingPlans: [generateTrainingPlan({ is_active: true })],
    stats: generateStats(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive elements demonstration with action logging for all clickable components.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    // This would be used for interaction testing in Storybook
    const canvas = canvasElement;
    const statCards = canvas.querySelectorAll('[role="button"]');
    console.log(`Found ${statCards.length} interactive elements`);
  },
};

export const KeyboardNavigation: Story = {
  args: {
    recentLogs: [generateRecentLog(4)],
    activeTrainingPlans: [generateTrainingPlan({ is_active: true })],
    stats: generateStats(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Keyboard navigation focused story for testing accessibility and tab order.',
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'keyboard-navigation', enabled: true },
          { id: 'focus-order-semantics', enabled: true },
        ],
      },
    },
  },
};

export const ResponsiveLayout: Story = {
  args: {
    recentLogs: [generateRecentLog(2), generateRecentLog(6)],
    activeTrainingPlans: [generateTrainingPlan({ is_active: true })],
    stats: generateStats(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Responsive layout demonstration across different viewport sizes.',
      },
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1200px', height: '800px' } },
      },
    },
  },
};

// Edge Case Stories
export const LongTextContent: Story = {
  args: {
    recentLogs: [
      generateExerciseLog({
        exercise: 'Extremely Long Exercise Name That Should Test Text Wrapping and Overflow Handling',
        logged_at: generateRecentLog(2).logged_at,
      }),
    ],
    activeTrainingPlans: [
      generateTrainingPlan({
        name: 'Very Long Training Plan Name That Tests How The Component Handles Extended Text Content',
        is_active: true,
      }),
    ],
    stats: generateStats(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Long text content testing for exercise names and training plan names.',
      },
    },
  },
};

export const LargeNumbers: Story = {
  args: {
    recentLogs: [
      generateExerciseLog({
        sets: 50,
        reps: 999,
        weight: 500,
        logged_at: generateRecentLog(1).logged_at,
      }),
    ],
    activeTrainingPlans: [
      generateTrainingPlan({
        sessions_per_week: 14,
        is_active: true,
      }),
    ],
    stats: {
      totalExerciseLogs: 9999,
      activePlans: 25,
      completedSessions: 5000,
      weeklyProgress: 100,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Large numbers testing for statistics and exercise data formatting.',
      },
    },
  },
};

export const MissingData: Story = {
  args: {
    recentLogs: [
      generateExerciseLog({
        reps: null,
        weight: null,
        logged_at: generateRecentLog(3).logged_at,
      }),
    ],
    activeTrainingPlans: [
      generateTrainingPlan({
        start_date: null,
        is_active: true,
      }),
    ],
    stats: generateStats(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Partial data scenario with missing optional fields (reps, weight, start_date).',
      },
    },
  },
};

export const ErrorStates: Story = {
  args: {
    recentLogs: [],
    activeTrainingPlans: [],
    stats: {
      totalExerciseLogs: -1,
      activePlans: -1,
      completedSessions: -1,
      weeklyProgress: -1,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state simulation with invalid negative values.',
      },
    },
  },
};

// Accessibility Stories
export const HighContrast: Story = {
  args: {
    recentLogs: [generateRecentLog(4)],
    activeTrainingPlans: [generateTrainingPlan({ is_active: true })],
    stats: generateStats(),
  },
  parameters: {
    docs: {
      description: {
        story: 'High contrast theme for accessibility testing.',
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#000000' },
        { name: 'light', value: '#ffffff' },
      ],
    },
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
};

export const ScreenReader: Story = {
  args: {
    recentLogs: [generateRecentLog(2)],
    activeTrainingPlans: [generateTrainingPlan({ is_active: true })],
    stats: generateStats(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Screen reader optimized story with enhanced ARIA labels and descriptions.',
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'aria-labels', enabled: true },
          { id: 'aria-roles', enabled: true },
          { id: 'screen-reader-only', enabled: true },
        ],
      },
    },
  },
};

export const KeyboardOnly: Story = {
  args: {
    recentLogs: [generateRecentLog(3), generateRecentLog(7)],
    activeTrainingPlans: [generateTrainingPlan({ is_active: true })],
    stats: generateStats(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Keyboard-only interaction demonstration for accessibility testing.',
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'keyboard-navigation', enabled: true },
          { id: 'focus-visible', enabled: true },
          { id: 'tab-order', enabled: true },
        ],
      },
    },
  },
};

// Specialized Stories
export const LoadingState: Story = {
  args: {
    recentLogs: [],
    activeTrainingPlans: [],
    stats: {
      totalExerciseLogs: 0,
      activePlans: 0,
      completedSessions: 0,
      weeklyProgress: 0,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Simulated loading state with minimal data.',
      },
    },
  },
};

export const MixedActiveInactivePlans: Story = {
  args: {
    recentLogs: [generateRecentLog(5)],
    activeTrainingPlans: [
      generateTrainingPlan({ is_active: true, name: 'Active Plan 1' }),
      generateTrainingPlan({ is_active: false, name: 'Inactive Plan 1' }),
      generateTrainingPlan({ is_active: true, name: 'Active Plan 2' }),
      generateTrainingPlan({ is_active: false, name: 'Inactive Plan 2' }),
    ],
    stats: generateStats(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Mixed active and inactive training plans to test status indicators.',
      },
    },
  },
};

export const RecentWorkoutsOnly: Story = {
  args: {
    recentLogs: Array.from({ length: 6 }, (_, i) => generateRecentLog(i + 1)),
    activeTrainingPlans: [],
    stats: {
      totalExerciseLogs: 45,
      activePlans: 0,
      completedSessions: 30,
      weeklyProgress: 5,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'User with recent workouts but no active training plans.',
      },
    },
  },
};

export const PlansOnlyNoWorkouts: Story = {
  args: {
    recentLogs: [],
    activeTrainingPlans: [
      generateTrainingPlan({ is_active: true, difficulty: 'beginner' }),
      generateTrainingPlan({ is_active: true, difficulty: 'intermediate' }),
    ],
    stats: {
      totalExerciseLogs: 0,
      activePlans: 2,
      completedSessions: 0,
      weeklyProgress: 0,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'User with active training plans but no workout history.',
      },
    },
  },
};

// Interactive Controls Demo
export const InteractiveDemo: Story = {
  args: {
    recentLogs: [generateRecentLog(2)],
    activeTrainingPlans: [generateTrainingPlan({ is_active: true })],
    stats: generateStats(),
  },
  argTypes: {
    recentLogs: {
      control: { type: 'object' },
    },
    activeTrainingPlans: {
      control: { type: 'object' },
    },
    stats: {
      control: { type: 'object' },
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo with controls to modify data in real-time.',
      },
    },
  },
};

// Performance Testing
export const PerformanceTest: Story = {
  args: {
    recentLogs: Array.from({ length: 50 }, (_, i) => generateRecentLog(i + 1)),
    activeTrainingPlans: Array.from({ length: 20 }, () => generateTrainingPlan()),
    stats: {
      totalExerciseLogs: 10000,
      activePlans: 20,
      completedSessions: 5000,
      weeklyProgress: 50,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Performance testing with large datasets to test component rendering efficiency.',
      },
    },
  },
};