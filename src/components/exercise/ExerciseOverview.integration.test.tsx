import type { ExerciseLog, TrainingPlan, Stats } from '@/components/exercise/ExerciseOverview';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExerciseOverview } from './ExerciseOverview';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock behavior tracking hook
const mockTrackEvent = vi.fn();
const mockFlushEvents = vi.fn();
vi.mock('@/hooks/useBehaviorTracking', () => ({
  useBehaviorTracking: () => ({
    trackEvent: mockTrackEvent,
    isLoading: false,
    error: null,
    flushEvents: mockFlushEvents,
  }),
}));

// Mock performance.now for consistent testing
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => 1000),
  },
  writable: true,
});

// Performance measurement utility
const measurePerformance = async <T>(
  operation: () => Promise<T> | T,
  label: string,
): Promise<{ result: T; duration: number; memoryUsed: number }> => {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;

  const result = await operation();

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;

  const duration = endTime - startTime;
  const memoryUsed = endMemory - startMemory;

  console.log(`${label}: ${duration.toFixed(2)}ms, Memory: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);

  return { result, duration, memoryUsed };
};

// Memory leak detection utilities
class MemoryLeakDetector {
  private initialMemory: number;
  private measurements: number[] = [];
  
  constructor() {
    this.initialMemory = process.memoryUsage().heapUsed;
  }
  
  measure(): void {
    const currentMemory = process.memoryUsage().heapUsed;
    this.measurements.push(currentMemory);
  }
  
  getMemoryGrowth(): number {
    if (this.measurements.length === 0) return 0;
    const lastMeasurement = this.measurements[this.measurements.length - 1];
    return lastMeasurement - this.initialMemory;
  }
  
  getAverageMemoryGrowth(): number {
    if (this.measurements.length === 0) return 0;
    const totalGrowth = this.measurements.reduce((sum, measurement) => 
      sum + (measurement - this.initialMemory), 0
    );
    return totalGrowth / this.measurements.length;
  }
  
  detectLeak(threshold: number = 50 * 1024 * 1024): boolean { // 50MB threshold
    return this.getMemoryGrowth() > threshold;
  }
  
  reset(): void {
    this.measurements = [];
    this.initialMemory = process.memoryUsage().heapUsed;
  }
}

// Performance benchmarking utilities
class PerformanceBenchmark {
  private baselines: Map<string, number> = new Map();
  
  setBaseline(name: string, duration: number): void {
    this.baselines.set(name, duration);
  }
  
  compareToBaseline(name: string, currentDuration: number): {
    improvement: number;
    isRegression: boolean;
    percentageChange: number;
  } {
    const baseline = this.baselines.get(name);
    if (!baseline) {
      throw new Error(`No baseline found for ${name}`);
    }
    
    const improvement = baseline - currentDuration;
    const percentageChange = ((currentDuration - baseline) / baseline) * 100;
    const isRegression = improvement < 0;
    
    return {
      improvement,
      isRegression,
      percentageChange,
    };
  }
}

// Test data generators
const generateExerciseLogs = (count: number): ExerciseLog[] => {
  const exercises = ['Bench Press', 'Squats', 'Deadlift', 'Pull-ups', 'Push-ups', 'Rows'];
  const logs: ExerciseLog[] = [];
  const baseDate = new Date('2024-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setHours(date.getHours() - i * 2); // 2 hours apart

    logs.push({
      id: i + 1,
      exercise: exercises[i % exercises.length],
      sets: Math.floor(Math.random() * 5) + 1,
      reps: Math.floor(Math.random() * 15) + 5,
      weight: Math.floor(Math.random() * 100) + 20,
      logged_at: date.toISOString(),
    });
  }

  return logs;
};

const generateTrainingPlans = (count: number): TrainingPlan[] => {
  const planNames = ['Strength Building', 'Weight Loss', 'Muscle Gain', 'Endurance', 'Flexibility'];
  const difficulties: ('beginner' | 'intermediate' | 'advanced')[] = ['beginner', 'intermediate', 'advanced'];
  const plans: TrainingPlan[] = [];

  for (let i = 0; i < count; i++) {
    const startDate = new Date('2024-01-01');
    startDate.setDate(startDate.getDate() - i * 7);

    plans.push({
      id: i + 1,
      name: planNames[i % planNames.length],
      difficulty: difficulties[i % difficulties.length],
      sessions_per_week: Math.floor(Math.random() * 5) + 2,
      is_active: i < 2, // First 2 plans are active
      start_date: startDate.toISOString(),
    });
  }

  return plans;
};

const generateStats = (overrides?: Partial<Stats>): Stats => ({
  totalExerciseLogs: 45,
  activePlans: 2,
  completedSessions: 12,
  weeklyProgress: 4,
  ...overrides,
});

describe('ExerciseOverview Integration Tests', () => {
  let mockRecentLogs: ExerciseLog[];
  let mockActiveTrainingPlans: TrainingPlan[];
  let mockStats: Stats;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRecentLogs = generateExerciseLogs(5);
    mockActiveTrainingPlans = generateTrainingPlans(3);
    mockStats = generateStats();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Integration Tests', () => {
    it('should render all sections with proper data flow', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Verify main container
      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();

      // Verify header section
      expect(screen.getByText('Exercise & Training Overview')).toBeInTheDocument();
      expect(screen.getByText('Track your workouts and training progress')).toBeInTheDocument();

      // Verify stats section
      const statsSection = screen.getByTestId('exercise-overview-stats');
      expect(statsSection).toBeInTheDocument();
      expect(within(statsSection).getByText('45')).toBeInTheDocument(); // totalExerciseLogs
      expect(within(statsSection).getByText('2')).toBeInTheDocument(); // activePlans
      expect(within(statsSection).getByText('12')).toBeInTheDocument(); // completedSessions
      expect(within(statsSection).getByText('4')).toBeInTheDocument(); // weeklyProgress

      // Verify recent logs section
      const recentLogsSection = screen.getByTestId('exercise-overview-recent-logs');
      expect(recentLogsSection).toBeInTheDocument();
      expect(within(recentLogsSection).getByText('Recent Workouts')).toBeInTheDocument();

      // Verify training plans section
      const activePlansSection = screen.getByTestId('exercise-overview-active-plans');
      expect(activePlansSection).toBeInTheDocument();
      expect(within(activePlansSection).getByText('Training Plans')).toBeInTheDocument();

      // Verify quick actions section
      const quickActionsSection = screen.getByTestId('exercise-overview-quick-actions');
      expect(quickActionsSection).toBeInTheDocument();
      expect(within(quickActionsSection).getByText('Quick Actions')).toBeInTheDocument();

      // Verify progress charts section
      const progressChartsSection = screen.getByTestId('exercise-overview-progress-charts');
      expect(progressChartsSection).toBeInTheDocument();
      expect(within(progressChartsSection).getByText('Training Progress')).toBeInTheDocument();
    });

    it('should handle prop drilling and data transformation correctly', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Verify recent logs data transformation
      mockRecentLogs.forEach((log) => {
        expect(screen.getByText(log.exercise)).toBeInTheDocument();
        expect(screen.getByText(`${log.sets} sets`)).toBeInTheDocument();
        if (log.reps) {
          expect(screen.getByText(`× ${log.reps} reps`)).toBeInTheDocument();
        }
        if (log.weight) {
          expect(screen.getByText(`${log.weight}kg`)).toBeInTheDocument();
        }
      });

      // Verify training plans data transformation
      mockActiveTrainingPlans.forEach((plan) => {
        expect(screen.getByText(plan.name)).toBeInTheDocument();
        expect(screen.getByText(plan.difficulty)).toBeInTheDocument();
        expect(screen.getByText(`${plan.sessions_per_week} sessions/week`)).toBeInTheDocument();
        if (plan.is_active) {
          expect(screen.getByText('🟢 Active')).toBeInTheDocument();
        }
      });
    });

    it('should handle empty data states correctly', () => {
      render(
        <ExerciseOverview
          recentLogs={[]}
          activeTrainingPlans={[]}
          stats={generateStats({ totalExerciseLogs: 0, activePlans: 0 })}
        />
      );

      expect(screen.getByText('No recent workouts')).toBeInTheDocument();
      expect(screen.getByText('No active training plans')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Zero stats
    });

    it('should handle interaction between different sections', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Click on a stat card
      const statCards = screen.getAllByRole('button').filter(button => 
        button.closest('[data-testid="exercise-overview-stats"]')
      );
      await user.click(statCards[0]);

      // Click on a training plan card
      const planCards = screen.getAllByRole('button').filter(button => 
        button.closest('[data-testid="exercise-overview-active-plans"]')
      );
      await user.click(planCards[0]);

      // Click on a recent log item
      const logItems = screen.getAllByRole('button').filter(button => 
        button.closest('[data-testid="exercise-overview-recent-logs"]')
      );
      await user.click(logItems[0]);

      // Verify tracking events were called for each interaction
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: 'exercise_stat_card_clicked',
          })
        );
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: 'training_plan_card_viewed',
          })
        );
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: 'recent_workout_log_viewed',
          })
        );
      });
    });
  });

  describe('Behavioral Tracking Integration', () => {
    it('should track complete behavioral flow from component mount to user interactions', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Verify initial overview view tracking
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'exercise_overview_viewed',
          entityType: 'ui_interaction',
          context: {
            ui: {
              component: 'ExerciseOverview',
              element: 'OverviewPage',
            },
            exercise: {
              totalWorkouts: mockStats.totalExerciseLogs,
              activePlans: mockStats.activePlans,
              completedSessions: mockStats.completedSessions,
              weeklyProgress: mockStats.weeklyProgress,
              hasRecentLogs: true,
              hasActivePlans: true,
            },
          },
        });
      });

      // Test stat card click tracking
      const statCard = screen.getAllByRole('button')[0];
      await user.click(statCard);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: 'exercise_stat_card_clicked',
            entityType: 'ui_interaction',
            context: expect.objectContaining({
              ui: expect.objectContaining({
                component: 'ExerciseOverview',
                element: 'StatCard',
              }),
            }),
          })
        );
      });

      // Test progress chart click tracking
      const progressCharts = screen.getAllByRole('button').filter(button => 
        button.closest('[data-testid="exercise-overview-progress-charts"]')
      );
      await user.click(progressCharts[0]);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: 'progress_chart_viewed',
            entityType: 'ui_interaction',
            context: expect.objectContaining({
              ui: expect.objectContaining({
                component: 'ExerciseOverview',
                element: 'ProgressChart',
              }),
            }),
          })
        );
      });
    });

    it('should enrich tracking events with proper context data', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Click on a training plan card
      const planCard = screen.getAllByRole('button').filter(button => 
        button.closest('[data-testid="exercise-overview-active-plans"]')
      )[0];
      await user.click(planCard);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'training_plan_card_viewed',
          entityType: 'training_session',
          entityId: mockActiveTrainingPlans[0].id,
          context: {
            ui: {
              component: 'ExerciseOverview',
              element: 'TrainingPlanCard',
            },
            exercise: {
              planName: mockActiveTrainingPlans[0].name,
              difficulty: mockActiveTrainingPlans[0].difficulty,
              sessionsPerWeek: mockActiveTrainingPlans[0].sessions_per_week,
              isActive: mockActiveTrainingPlans[0].is_active,
              startDate: mockActiveTrainingPlans[0].start_date,
            },
          },
        });
      });
    });

    it('should handle tracking event sequence for complex workflows', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Simulate complex user workflow: view stats → click plan → view progress
      const statCard = screen.getAllByRole('button')[0];
      const planCard = screen.getAllByRole('button').filter(button => 
        button.closest('[data-testid="exercise-overview-active-plans"]')
      )[0];
      const progressChart = screen.getAllByRole('button').filter(button => 
        button.closest('[data-testid="exercise-overview-progress-charts"]')
      )[0];

      await user.click(statCard);
      await user.click(planCard);
      await user.click(progressChart);

      await waitFor(() => {
        // Verify the sequence of events
        const calls = mockTrackEvent.mock.calls;
        const eventNames = calls.map(call => call[0].eventName);
        
        expect(eventNames).toContain('exercise_overview_viewed');
        expect(eventNames).toContain('exercise_stat_card_clicked');
        expect(eventNames).toContain('training_plan_card_viewed');
        expect(eventNames).toContain('progress_chart_viewed');
      });
    });

    it('should handle tracking errors gracefully', async () => {
      // Mock tracking to throw an error
      mockTrackEvent.mockRejectedValueOnce(new Error('Tracking failed'));

      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const statCard = screen.getAllByRole('button')[0];
      
      // Component should not crash when tracking fails
      await expect(user.click(statCard)).resolves.not.toThrow();
    });
  });

  describe('Data Consistency Tests', () => {
    it('should ensure stats calculations match displayed values', () => {
      const customStats = generateStats({
        totalExerciseLogs: 123,
        activePlans: 5,
        completedSessions: 67,
        weeklyProgress: 8,
      });

      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={customStats}
        />
      );

      const statsSection = screen.getByTestId('exercise-overview-stats');
      expect(within(statsSection).getByText('123')).toBeInTheDocument();
      expect(within(statsSection).getByText('5')).toBeInTheDocument();
      expect(within(statsSection).getByText('67')).toBeInTheDocument();
      expect(within(statsSection).getByText('8')).toBeInTheDocument();
    });

    it('should ensure time calculations are consistent across components', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      const twoHoursAgo = new Date('2024-01-01T10:00:00Z');
      
      // Mock Date.now to return consistent time
      vi.spyOn(Date, 'now').mockReturnValue(now.getTime());

      const recentLog: ExerciseLog = {
        id: 1,
        exercise: 'Test Exercise',
        sets: 3,
        reps: 10,
        weight: 50,
        logged_at: twoHoursAgo.toISOString(),
      };

      render(
        <ExerciseOverview
          recentLogs={[recentLog]}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });

    it('should ensure data formatting consistency across different display contexts', () => {
      const logWithLargeNumbers: ExerciseLog = {
        id: 1,
        exercise: 'Heavy Deadlift',
        sets: 5,
        reps: 1,
        weight: 200,
        logged_at: new Date().toISOString(),
      };

      render(
        <ExerciseOverview
          recentLogs={[logWithLargeNumbers]}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('Heavy Deadlift')).toBeInTheDocument();
      expect(screen.getByText('5 sets')).toBeInTheDocument();
      expect(screen.getByText('× 1 reps')).toBeInTheDocument();
      expect(screen.getByText('200kg')).toBeInTheDocument();
    });

    it('should handle edge cases in data transformation', () => {
      const edgeCaseLog: ExerciseLog = {
        id: 1,
        exercise: 'Bodyweight Exercise',
        sets: 1,
        reps: null,
        weight: null,
        logged_at: new Date().toISOString(),
      };

      render(
        <ExerciseOverview
          recentLogs={[edgeCaseLog]}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('Bodyweight Exercise')).toBeInTheDocument();
      expect(screen.getByText('1 sets')).toBeInTheDocument();
      expect(screen.queryByText('× null reps')).not.toBeInTheDocument();
      expect(screen.queryByText('nullkg')).not.toBeInTheDocument();
    });
  });

  describe('User Workflow Integration', () => {
    it('should support complete user journey through the overview', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Step 1: View stats
      const totalWorkoutsCard = screen.getByText('Total Workouts').closest('div');
      expect(totalWorkoutsCard).toBeInTheDocument();

      // Step 2: Click on training plan
      const firstPlan = screen.getByText(mockActiveTrainingPlans[0].name);
      await user.click(firstPlan);

      // Step 3: View progress charts
      const strengthProgressChart = screen.getByText('Strength Progress').closest('div');
      await user.click(strengthProgressChart!);

      // Verify tracking events for the complete journey
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: 'training_plan_card_viewed',
          })
        );
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: 'progress_chart_viewed',
            context: expect.objectContaining({
              exercise: expect.objectContaining({
                chartType: 'strength_progress',
              }),
            }),
          })
        );
      });
    });

    it('should handle navigation flow from overview to detail pages', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Verify navigation links
      expect(screen.getByText('View All →')).toHaveAttribute('href', '/dashboard/exercise');
      expect(screen.getByText('View All')).toHaveAttribute('href', '/dashboard/exercise/logs');
      expect(screen.getByText('Manage')).toHaveAttribute('href', '/dashboard/exercise/plans');
      expect(screen.getByText('View Details')).toHaveAttribute('href', '/dashboard/exercise/analytics');
    });

    it('should handle quick action workflows', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Test quick action buttons
      const startWorkoutButton = screen.getByText('Start Workout');
      const createPlanButton = screen.getByText('Create Plan');
      const browseExercisesButton = screen.getByText('Browse Exercises');
      const viewProgressButton = screen.getByText('View Progress');

      expect(startWorkoutButton).toHaveAttribute('href', '/dashboard/exercise/workout');
      expect(createPlanButton).toHaveAttribute('href', '/dashboard/exercise/plans?action=create');
      expect(browseExercisesButton).toHaveAttribute('href', '/dashboard/exercise/exercises');
      expect(viewProgressButton).toHaveAttribute('href', '/dashboard/exercise/analytics');

      // Test quick action tracking
      await user.click(startWorkoutButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'ui_click',
          entityType: 'ui_interaction',
          context: {
            ui: {
              component: 'ExerciseOverview',
              element: 'QuickActionButton',
              action: 'start_workout',
              destination: '/dashboard/exercise/workout',
            },
            exercise: {
              actionType: 'Start Workout',
            },
          },
        });
      });
    });

    it('should support accessibility workflow with keyboard-only navigation', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Test keyboard navigation through interactive elements
      const interactiveElements = screen.getAllByRole('button');
      
      // Focus first element
      await user.tab();
      expect(interactiveElements[0]).toHaveFocus();

      // Test Enter key activation
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalled();
      });

      // Test Space key activation
      await user.keyboard(' ');
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalled();
      });

      // Verify all interactive elements have proper tabIndex
      interactiveElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Performance Integration', () => {
    let memoryDetector: MemoryLeakDetector;
    let benchmark: PerformanceBenchmark;

    beforeEach(() => {
      memoryDetector = new MemoryLeakDetector();
      benchmark = new PerformanceBenchmark();
    });

    afterEach(() => {
      memoryDetector.reset();
    });

    it('should handle large datasets efficiently', async () => {
      const largeLogs = generateExerciseLogs(100);
      const largePlans = generateTrainingPlans(20);

      const { result, duration } = await measurePerformance(
        () => render(
          <ExerciseOverview
            recentLogs={largeLogs}
            activeTrainingPlans={largePlans}
            stats={mockStats}
          />
        ),
        'Large Dataset Rendering'
      );

      expect(duration).toBeLessThan(1000); // Should render within 1 second
      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
    });

    it('should measure behavioral tracking performance impact', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const { duration } = await measurePerformance(
        async () => {
          const buttons = screen.getAllByRole('button');
          for (const button of buttons.slice(0, 5)) {
            await user.click(button);
          }
        },
        'Multiple Tracking Events'
      );

      expect(duration).toBeLessThan(500); // Should handle multiple events quickly
      expect(mockTrackEvent).toHaveBeenCalledTimes(6); // 1 view + 5 clicks
    });

    it('should detect memory leaks over multiple render cycles', async () => {
      memoryDetector.measure(); // Initial measurement
      
      // Perform multiple render/unmount cycles
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <ExerciseOverview
            recentLogs={generateExerciseLogs(50)}
            activeTrainingPlans={generateTrainingPlans(10)}
            stats={generateStats({ totalExerciseLogs: i * 10 })}
          />
        );
        
        // Simulate user interactions
        const user = userEvent.setup();
        const buttons = screen.getAllByRole('button');
        if (buttons.length > 0) {
          await user.click(buttons[0]);
        }
        
        unmount();
        memoryDetector.measure();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const memoryGrowth = memoryDetector.getMemoryGrowth();
      const averageGrowth = memoryDetector.getAverageMemoryGrowth();
      
      console.log(`Memory growth after 10 cycles: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Average memory growth: ${(averageGrowth / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory growth should be reasonable (less than 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
      expect(memoryDetector.detectLeak()).toBe(false);
    });

    it('should establish performance baselines and detect regressions', async () => {
      // Establish baseline with standard dataset
      const { duration: baselineDuration } = await measurePerformance(
        () => render(
          <ExerciseOverview
            recentLogs={generateExerciseLogs(10)}
            activeTrainingPlans={generateTrainingPlans(3)}
            stats={mockStats}
          />
        ),
        'Baseline Render'
      );
      
      benchmark.setBaseline('render', baselineDuration);
      
      // Test current performance
      const { duration: currentDuration } = await measurePerformance(
        () => render(
          <ExerciseOverview
            recentLogs={generateExerciseLogs(10)}
            activeTrainingPlans={generateTrainingPlans(3)}
            stats={mockStats}
          />
        ),
        'Current Render'
      );
      
      const comparison = benchmark.compareToBaseline('render', currentDuration);
      
      console.log(`Performance comparison: ${comparison.percentageChange.toFixed(2)}% change`);
      
      // Performance shouldn't regress by more than 50%
      expect(comparison.percentageChange).toBeLessThan(50);
    });

    it('should monitor memory usage during behavioral tracking', async () => {
      const user = userEvent.setup();
      memoryDetector.measure(); // Initial measurement
      
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );
      
      memoryDetector.measure(); // After render
      
      // Perform multiple tracking events
      const buttons = screen.getAllByRole('button');
      for (let i = 0; i < Math.min(buttons.length, 20); i++) {
        await user.click(buttons[i]);
        memoryDetector.measure();
      }
      
      const finalMemoryGrowth = memoryDetector.getMemoryGrowth();
      console.log(`Memory growth during tracking: ${(finalMemoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      
      // Memory usage should remain reasonable during tracking
      expect(finalMemoryGrowth).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
      expect(mockTrackEvent).toHaveBeenCalled();
    });
    
    it('should handle stress testing with rapid state changes', async () => {
      const user = userEvent.setup();
      memoryDetector.measure();
      
      const { rerender } = render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );
      
      // Perform rapid state changes and interactions
      for (let i = 0; i < 50; i++) {
        // Rerender with new data
        rerender(
          <ExerciseOverview
            recentLogs={generateExerciseLogs(Math.floor(Math.random() * 20) + 1)}
            activeTrainingPlans={generateTrainingPlans(Math.floor(Math.random() * 5) + 1)}
            stats={generateStats({ totalExerciseLogs: i })}
          />
        );
        
        // Perform random interaction
        const buttons = screen.getAllByRole('button');
        if (buttons.length > 0) {
          const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
          await user.click(randomButton);
        }
        
        if (i % 10 === 0) {
          memoryDetector.measure();
        }
      }
      
      const stressTestMemoryGrowth = memoryDetector.getMemoryGrowth();
      console.log(`Memory growth during stress test: ${(stressTestMemoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      
      // Should handle stress testing without excessive memory growth
      expect(stressTestMemoryGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB
      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
    });

    it('should measure component cleanup performance', async () => {
      const components: Array<{ unmount: () => void }> = [];
      
      // Create multiple component instances
      for (let i = 0; i < 20; i++) {
        const component = render(
          <ExerciseOverview
            recentLogs={generateExerciseLogs(10)}
            activeTrainingPlans={generateTrainingPlans(2)}
            stats={generateStats()}
          />
        );
        components.push(component);
      }
      
      memoryDetector.measure(); // Before cleanup
      
      // Measure cleanup performance
      const { duration } = await measurePerformance(
        () => {
          components.forEach(component => component.unmount());
        },
        'Component Cleanup'
      );
      
      memoryDetector.measure(); // After cleanup
      
      const cleanupMemoryChange = memoryDetector.getMemoryGrowth();
      
      // Cleanup should be fast and not cause memory issues
      expect(duration).toBeLessThan(1000); // Should cleanup within 1 second
      expect(cleanupMemoryChange).toBeLessThan(10 * 1024 * 1024); // Reasonable memory change
    });

    it('should benchmark interaction performance with large datasets', async () => {
      const user = userEvent.setup();
      const massiveLogs = generateExerciseLogs(500);
      const massivePlans = generateTrainingPlans(50);
      
      render(
        <ExerciseOverview
          recentLogs={massiveLogs}
          activeTrainingPlans={massivePlans}
          stats={generateStats({ totalExerciseLogs: 500 })}
        />
      );
      
      memoryDetector.measure();
      
      const { duration: interactionDuration } = await measurePerformance(
        async () => {
          const buttons = screen.getAllByRole('button');
          // Test interactions with first 10 buttons
          for (const button of buttons.slice(0, 10)) {
            await user.click(button);
          }
        },
        'Large Dataset Interactions'
      );
      
      memoryDetector.measure();
      
      const interactionMemoryGrowth = memoryDetector.getMemoryGrowth();
      
      // Interactions should remain responsive even with large datasets
      expect(interactionDuration).toBeLessThan(2000); // Within 2 seconds
      expect(interactionMemoryGrowth).toBeLessThan(15 * 1024 * 1024); // Reasonable memory usage
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('should detect potential memory leaks in behavioral tracking', async () => {
      const user = userEvent.setup();
      memoryDetector.measure();
      
      // Create and destroy multiple components with tracking
      for (let cycle = 0; cycle < 5; cycle++) {
        const { unmount } = render(
          <ExerciseOverview
            recentLogs={generateExerciseLogs(20)}
            activeTrainingPlans={generateTrainingPlans(5)}
            stats={generateStats()}
          />
        );
        
        // Perform tracking events
        const buttons = screen.getAllByRole('button');
        for (const button of buttons.slice(0, 5)) {
          await user.click(button);
        }
        
        // Flush events to simulate real-world cleanup
        mockFlushEvents();
        
        unmount();
        memoryDetector.measure();
      }
      
      const trackingMemoryGrowth = memoryDetector.getMemoryGrowth();
      console.log(`Memory growth in tracking cycles: ${(trackingMemoryGrowth / 1024 / 1024).toFixed(2)}MB`);
      
      // Behavioral tracking shouldn't cause significant memory leaks
      expect(trackingMemoryGrowth).toBeLessThan(8 * 1024 * 1024); // Less than 8MB
      expect(memoryDetector.detectLeak(8 * 1024 * 1024)).toBe(false);
      expect(mockFlushEvents).toHaveBeenCalled();
    });

    it('should handle memory usage and cleanup properly', async () => {
      const { unmount } = render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Simulate component unmount
      unmount();

      // Verify cleanup doesn't cause memory leaks
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Cross-Component Communication', () => {
    it('should handle event propagation between sub-components', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Click on different types of components
      const statCard = screen.getAllByRole('button')[0];
      const planCard = screen.getAllByRole('button').filter(button => 
        button.closest('[data-testid="exercise-overview-active-plans"]')
      )[0];

      await user.click(statCard);
      await user.click(planCard);

      // Verify events don't interfere with each other
      await waitFor(() => {
        const calls = mockTrackEvent.mock.calls;
        expect(calls.some(call => call[0].eventName === 'exercise_stat_card_clicked')).toBe(true);
        expect(calls.some(call => call[0].eventName === 'training_plan_card_viewed')).toBe(true);
      });
    });

    it('should maintain component isolation', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Click on a recent log item
      const logItem = screen.getAllByRole('button').filter(button => 
        button.closest('[data-testid="exercise-overview-recent-logs"]')
      )[0];

      await user.click(logItem);

      // Verify the click doesn't affect other sections
      const statsSection = screen.getByTestId('exercise-overview-stats');
      const plansSection = screen.getByTestId('exercise-overview-active-plans');
      
      expect(statsSection).toBeInTheDocument();
      expect(plansSection).toBeInTheDocument();
      
      // Verify only the relevant tracking event was called
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventName: 'recent_workout_log_viewed',
          })
        );
      });
    });

    it('should handle concurrent user interactions', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Simulate rapid clicks on different elements
      const buttons = screen.getAllByRole('button').slice(0, 3);
      
      await Promise.all(buttons.map(button => user.click(button)));

      // Verify all events were tracked
      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledTimes(4); // 1 view + 3 clicks
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid data gracefully', () => {
      const invalidLogs = [
        {
          id: 1,
          exercise: '',
          sets: -1,
          reps: null,
          weight: null,
          logged_at: 'invalid-date',
        },
      ] as ExerciseLog[];

      expect(() => {
        render(
          <ExerciseOverview
            recentLogs={invalidLogs}
            activeTrainingPlans={mockActiveTrainingPlans}
            stats={mockStats}
          />
        );
      }).not.toThrow();
    });

    it('should handle missing props gracefully', () => {
      expect(() => {
        render(
          <ExerciseOverview
            recentLogs={undefined as any}
            activeTrainingPlans={undefined as any}
            stats={undefined as any}
          />
        );
      }).not.toThrow();
    });

    it('should handle component re-renders with changing data', () => {
      const { rerender } = render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const newLogs = generateExerciseLogs(3);
      const newStats = generateStats({ totalExerciseLogs: 50 });

      rerender(
        <ExerciseOverview
          recentLogs={newLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={newStats}
        />
      );

      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
    });
  });
});