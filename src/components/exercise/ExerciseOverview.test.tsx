import { render, screen, waitFor } from 'vitest-browser-react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExerciseOverview } from './ExerciseOverview';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      'title': 'Exercise & Training Overview',
      'subtitle': 'Track your workouts and training progress',
      'viewAll': 'View All →',
      'recentWorkouts': 'Recent Workouts',
      'trainingPlans': 'Training Plans',
      'quickActions': 'Quick Actions',
      'trainingProgress': 'Training Progress',
      'noRecentWorkouts': 'No recent workouts',
      'noActivePlans': 'No active training plans',
      'totalWorkouts': 'Total Workouts',
      'activePlans': 'Active Plans',
      'completedSessions': 'Completed Sessions',
      'weeklyActivity': 'Weekly Activity',
      'allTime': 'All time',
      'inProgress': 'In progress',
      'thisYear': 'This year',
      'thisWeek': 'This week',
      'active': 'Active',
      'started': 'Started',
      'sessionsPerWeek': 'sessions/week',
      'sets': 'sets',
      'reps': 'reps',
      'kg': 'kg',
      'hoursAgo': 'h ago',
      'beginner': 'beginner',
      'intermediate': 'intermediate',
      'advanced': 'advanced',
      'startWorkout': 'Start Workout',
      'createPlan': 'Create Plan',
      'browseExercises': 'Browse Exercises',
      'viewProgress': 'View Progress',
      'strengthProgress': 'Strength Progress',
      'workoutFrequency': 'Workout Frequency',
      'volumeTrends': 'Volume Trends',
      'chartPlaceholder': 'Chart placeholder',
      'viewDetails': 'View Details',
      'manage': 'Manage',
    };
    return translations[key] || key;
  }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, className, onClick }: any) => (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}));

// Mock behavior tracking hook
const mockTrackEvent = vi.fn();
vi.mock('@/hooks/useBehaviorTracking', () => ({
  useBehaviorTracking: () => ({
    trackEvent: mockTrackEvent,
    isLoading: false,
    error: null,
    flushEvents: vi.fn(),
  }),
}));

// Mock performance.now for consistent testing
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => 1000),
  },
  writable: true,
});

// Mock Date.now for consistent time calculations
const mockDateNow = vi.fn(() => 1640995200000); // 2022-01-01 00:00:00 UTC
Object.defineProperty(Date, 'now', {
  value: mockDateNow,
  writable: true,
});

describe('ExerciseOverview', () => {
  const mockRecentLogs = [
    {
      id: 1,
      exercise: 'Bench Press',
      sets: 3,
      reps: 10,
      weight: 80,
      logged_at: '2021-12-31T22:00:00.000Z', // 2 hours ago
    },
    {
      id: 2,
      exercise: 'Squats',
      sets: 4,
      reps: 12,
      weight: 100,
      logged_at: '2021-12-31T18:00:00.000Z', // 6 hours ago
    },
    {
      id: 3,
      exercise: 'Deadlift',
      sets: 2,
      reps: null,
      weight: null,
      logged_at: '2021-12-31T12:00:00.000Z', // 12 hours ago
    },
  ];

  const mockActiveTrainingPlans = [
    {
      id: 1,
      name: 'Strength Building Program',
      difficulty: 'intermediate' as const,
      sessions_per_week: 4,
      is_active: true,
      start_date: '2021-12-01',
    },
    {
      id: 2,
      name: 'Beginner Routine',
      difficulty: 'beginner' as const,
      sessions_per_week: 3,
      is_active: false,
      start_date: null,
    },
    {
      id: 3,
      name: 'Advanced Powerlifting',
      difficulty: 'advanced' as const,
      sessions_per_week: 5,
      is_active: true,
      start_date: '2021-11-15',
    },
  ];

  const mockStats = {
    totalExerciseLogs: 150,
    activePlans: 2,
    completedSessions: 45,
    weeklyProgress: 4,
  };

  const mockEmptyData = {
    recentLogs: [],
    activeTrainingPlans: [],
    stats: {
      totalExerciseLogs: 0,
      activePlans: 0,
      completedSessions: 0,
      weeklyProgress: 0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDateNow.mockReturnValue(1640995200000);
  });

  describe('Component Rendering', () => {
    it('renders with all sections when data is provided', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
      expect(screen.getByText('Exercise & Training Overview')).toBeInTheDocument();
      expect(screen.getByText('Track your workouts and training progress')).toBeInTheDocument();
      
      // Check all main sections are present
      expect(screen.getByTestId('exercise-overview-stats')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-overview-recent-logs')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-overview-active-plans')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-overview-quick-actions')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-overview-progress-charts')).toBeInTheDocument();
    });

    it('renders with empty data states', () => {
      render(
        <ExerciseOverview
          recentLogs={mockEmptyData.recentLogs}
          activeTrainingPlans={mockEmptyData.activeTrainingPlans}
          stats={mockEmptyData.stats}
        />
      );

      expect(screen.getByText('No recent workouts')).toBeInTheDocument();
      expect(screen.getByText('No active training plans')).toBeInTheDocument();
      
      // Stats should show zero values
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders with single items', () => {
      render(
        <ExerciseOverview
          recentLogs={[mockRecentLogs[0]]}
          activeTrainingPlans={[mockActiveTrainingPlans[0]]}
          stats={mockStats}
        />
      );

      expect(screen.getByText('Bench Press')).toBeInTheDocument();
      expect(screen.getByText('Strength Building Program')).toBeInTheDocument();
      expect(screen.queryByText('Squats')).not.toBeInTheDocument();
      expect(screen.queryByText('Beginner Routine')).not.toBeInTheDocument();
    });

    it('has proper data-testid attributes', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-overview-stats')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-overview-recent-logs')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-overview-active-plans')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-overview-quick-actions')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-overview-progress-charts')).toBeInTheDocument();
    });

    it('renders stats values correctly', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('150')).toBeInTheDocument(); // totalExerciseLogs
      expect(screen.getByText('2')).toBeInTheDocument(); // activePlans
      expect(screen.getByText('45')).toBeInTheDocument(); // completedSessions
      expect(screen.getByText('4')).toBeInTheDocument(); // weeklyProgress
    });
  });

  describe('StatCard Component', () => {
    it('renders stat cards with correct data', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('Total Workouts')).toBeInTheDocument();
      expect(screen.getByText('Active Plans')).toBeInTheDocument();
      expect(screen.getByText('Completed Sessions')).toBeInTheDocument();
      expect(screen.getByText('Weekly Activity')).toBeInTheDocument();

      // Check icons
      expect(screen.getByText('💪')).toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('🔥')).toBeInTheDocument();

      // Check subtitles
      expect(screen.getByText('All time')).toBeInTheDocument();
      expect(screen.getByText('In progress')).toBeInTheDocument();
      expect(screen.getByText('This year')).toBeInTheDocument();
      expect(screen.getByText('This week')).toBeInTheDocument();
    });

    it('displays trend indicators correctly', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Weekly Activity has trend="up"
      expect(screen.getByText('↗')).toBeInTheDocument();
    });

    it('handles stat card clicks', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const statCards = screen.getAllByRole('button').filter(button => 
        button.textContent?.includes('Total Workouts') ||
        button.textContent?.includes('Active Plans') ||
        button.textContent?.includes('Completed Sessions') ||
        button.textContent?.includes('Weekly Activity')
      );

      await user.click(statCards[0]);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'exercise_stat_card_clicked',
          entityType: 'ui_interaction',
          context: {
            ui: {
              component: 'ExerciseOverview',
              element: 'StatCard',
              statType: 'total_workouts',
              statValue: '150',
              trend: 'neutral',
            },
          },
        });
      });
    });

    it('supports keyboard navigation for stat cards', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const statCards = screen.getAllByRole('button').filter(button => 
        button.textContent?.includes('Total Workouts')
      );

      await user.tab();
      if (statCards[0]) {
        statCards[0].focus();
        await user.keyboard('{Enter}');

        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              eventName: 'exercise_stat_card_clicked',
            })
          );
        });
      }
    });
  });

  describe('TrainingPlanCard Component', () => {
    it('renders training plan cards with correct data', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('Strength Building Program')).toBeInTheDocument();
      expect(screen.getByText('Beginner Routine')).toBeInTheDocument();
      expect(screen.getByText('Advanced Powerlifting')).toBeInTheDocument();
    });

    it('displays difficulty levels with correct colors', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const beginnerBadge = screen.getByText('beginner');
      const intermediateBadge = screen.getByText('intermediate');
      const advancedBadge = screen.getByText('advanced');

      expect(beginnerBadge).toHaveClass('bg-green-100', 'text-green-800');
      expect(intermediateBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
      expect(advancedBadge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('shows active status correctly', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const activeIndicators = screen.getAllByText('🟢 Active');
      expect(activeIndicators).toHaveLength(2); // Two active plans
    });

    it('displays sessions per week', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('4 sessions/week')).toBeInTheDocument();
      expect(screen.getByText('3 sessions/week')).toBeInTheDocument();
      expect(screen.getByText('5 sessions/week')).toBeInTheDocument();
    });

    it('displays start dates when available', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('Started: 12/1/2021')).toBeInTheDocument();
      expect(screen.getByText('Started: 11/15/2021')).toBeInTheDocument();
    });

    it('handles training plan card clicks', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const planCards = screen.getAllByRole('button').filter(button => 
        button.textContent?.includes('Strength Building Program')
      );

      await user.click(planCards[0]);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'training_plan_card_viewed',
          entityType: 'training_session',
          entityId: 1,
          context: {
            ui: {
              component: 'ExerciseOverview',
              element: 'TrainingPlanCard',
            },
            exercise: {
              planName: 'Strength Building Program',
              difficulty: 'intermediate',
              sessionsPerWeek: 4,
              isActive: true,
              startDate: '2021-12-01',
            },
          },
        });
      });
    });
  });

  describe('RecentLogItem Component', () => {
    it('renders recent log items with correct data', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('Bench Press')).toBeInTheDocument();
      expect(screen.getByText('Squats')).toBeInTheDocument();
      expect(screen.getByText('Deadlift')).toBeInTheDocument();
    });

    it('calculates and displays time ago correctly', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('2h ago')).toBeInTheDocument();
      expect(screen.getByText('6h ago')).toBeInTheDocument();
      expect(screen.getByText('12h ago')).toBeInTheDocument();
    });

    it('displays sets, reps, and weight correctly', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('3 sets × 10 reps')).toBeInTheDocument();
      expect(screen.getByText('4 sets × 12 reps')).toBeInTheDocument();
      expect(screen.getByText('2 sets')).toBeInTheDocument(); // No reps for deadlift

      expect(screen.getByText('80kg')).toBeInTheDocument();
      expect(screen.getByText('100kg')).toBeInTheDocument();
      // No weight display for deadlift (null weight)
    });

    it('handles recent log item clicks', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const logItems = screen.getAllByRole('button').filter(button => 
        button.textContent?.includes('Bench Press')
      );

      await user.click(logItems[0]);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          eventName: 'recent_workout_log_viewed',
          entityType: 'exercise_log',
          entityId: 1,
          context: {
            ui: {
              component: 'ExerciseOverview',
              element: 'RecentLogItem',
            },
            exercise: {
              exerciseName: 'Bench Press',
              sets: 3,
              reps: 10,
              weight: 80,
              timeAgo: 2,
              loggedAt: '2021-12-31T22:00:00.000Z',
            },
          },
        });
      });
    });
  });

  describe('QuickActionButton Component', () => {
    it('renders all quick action buttons', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('Start Workout')).toBeInTheDocument();
      expect(screen.getByText('Create Plan')).toBeInTheDocument();
      expect(screen.getByText('Browse Exercises')).toBeInTheDocument();
      expect(screen.getByText('View Progress')).toBeInTheDocument();

      // Check icons
      expect(screen.getByText('🏋️')).toBeInTheDocument();
      expect(screen.getByText('📋')).toBeInTheDocument();
      expect(screen.getByText('📚')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
    });

    it('has correct href attributes', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByRole('link', { name: /start workout/i })).toHaveAttribute('href', '/dashboard/exercise/workout');
      expect(screen.getByRole('link', { name: /create plan/i })).toHaveAttribute('href', '/dashboard/exercise/plans?action=create');
      expect(screen.getByRole('link', { name: /browse exercises/i })).toHaveAttribute('href', '/dashboard/exercise/exercises');
      expect(screen.getByRole('link', { name: /view progress/i })).toHaveAttribute('href', '/dashboard/exercise/analytics');
    });

    it('handles quick action button clicks', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const startWorkoutButton = screen.getByRole('link', { name: /start workout/i });
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
  });

  describe('Progress Charts Section', () => {
    it('renders progress charts section', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('Training Progress')).toBeInTheDocument();
      expect(screen.getByText('Strength Progress')).toBeInTheDocument();
      expect(screen.getByText('Workout Frequency')).toBeInTheDocument();
      expect(screen.getByText('Volume Trends')).toBeInTheDocument();
    });

    it('displays chart placeholders', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const chartPlaceholders = screen.getAllByText('📈 Chart placeholder');
      expect(chartPlaceholders).toHaveLength(1);
      
      expect(screen.getByText('📊 Chart placeholder')).toBeInTheDocument();
      expect(screen.getByText('📉 Chart placeholder')).toBeInTheDocument();
    });

    it('handles progress chart clicks', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const strengthChart = screen.getAllByRole('button').find(button => 
        button.textContent?.includes('Strength Progress')
      );

      if (strengthChart) {
        await user.click(strengthChart);

        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledWith({
            eventName: 'progress_chart_viewed',
            entityType: 'ui_interaction',
            context: {
              ui: {
                component: 'ExerciseOverview',
                element: 'ProgressChart',
                chartType: 'strength_progress',
              },
              exercise: {
                chartType: 'strength_progress',
                totalWorkouts: 150,
              },
            },
          });
        });
      }
    });

    it('supports keyboard navigation for charts', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const chartButtons = screen.getAllByRole('button').filter(button => 
        button.textContent?.includes('Chart placeholder')
      );

      if (chartButtons[0]) {
        chartButtons[0].focus();
        await user.keyboard('{Enter}');

        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              eventName: 'progress_chart_viewed',
            })
          );
        });
      }
    });
  });

  describe('Behavioral Tracking Integration', () => {
    it('tracks component view on mount', async () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

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
              totalWorkouts: 150,
              activePlans: 2,
              completedSessions: 45,
              weeklyProgress: 4,
              hasRecentLogs: true,
              hasActivePlans: true,
            },
          },
        });
      });
    });

    it('tracks component view with empty data', async () => {
      render(
        <ExerciseOverview
          recentLogs={mockEmptyData.recentLogs}
          activeTrainingPlans={mockEmptyData.activeTrainingPlans}
          stats={mockEmptyData.stats}
        />
      );

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
              totalWorkouts: 0,
              activePlans: 0,
              completedSessions: 0,
              weeklyProgress: 0,
              hasRecentLogs: false,
              hasActivePlans: false,
            },
          },
        });
      });
    });
  });

  describe('Accessibility Features', () => {
    it('has proper ARIA labels and roles for interactive elements', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('tabIndex', '0');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Test tab navigation through interactive elements
      await user.tab();
      const focusedElement = document.activeElement;
      expect(focusedElement).toHaveAttribute('role', 'button');
    });

    it('has proper link accessibility', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);

      links.forEach((link) => {
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles invalid data gracefully', () => {
      const invalidData = {
        recentLogs: [
          {
            id: 1,
            exercise: '',
            sets: -1,
            reps: null,
            weight: null,
            logged_at: 'invalid-date',
          },
        ],
        activeTrainingPlans: [
          {
            id: 1,
            name: '',
            difficulty: 'invalid' as any,
            sessions_per_week: -1,
            is_active: true,
            start_date: 'invalid-date',
          },
        ],
        stats: {
          totalExerciseLogs: -1,
          activePlans: -1,
          completedSessions: -1,
          weeklyProgress: -1,
        },
      };

      expect(() => {
        render(
          <ExerciseOverview
            recentLogs={invalidData.recentLogs}
            activeTrainingPlans={invalidData.activeTrainingPlans}
            stats={invalidData.stats}
          />
        );
      }).not.toThrow();
    });

    it('handles missing required props gracefully', () => {
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

    it('handles null and undefined values', () => {
      const dataWithNulls = {
        recentLogs: [
          {
            id: 1,
            exercise: 'Test Exercise',
            sets: 1,
            reps: null,
            weight: null,
            logged_at: '2021-12-31T22:00:00.000Z',
          },
        ],
        activeTrainingPlans: [
          {
            id: 1,
            name: 'Test Plan',
            difficulty: 'beginner' as const,
            sessions_per_week: 3,
            is_active: true,
            start_date: null,
          },
        ],
        stats: mockStats,
      };

      expect(() => {
        render(
          <ExerciseOverview
            recentLogs={dataWithNulls.recentLogs}
            activeTrainingPlans={dataWithNulls.activeTrainingPlans}
            stats={dataWithNulls.stats}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('Test Exercise')).toBeInTheDocument();
      expect(screen.getByText('Test Plan')).toBeInTheDocument();
    });
  });

  describe('Data Transformation', () => {
    it('calculates time ago correctly for different time periods', () => {
      const logsWithDifferentTimes = [
        {
          id: 1,
          exercise: 'Recent Exercise',
          sets: 1,
          reps: 1,
          weight: 1,
          logged_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        },
        {
          id: 2,
          exercise: 'Old Exercise',
          sets: 1,
          reps: 1,
          weight: 1,
          logged_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
        },
      ];

      render(
        <ExerciseOverview
          recentLogs={logsWithDifferentTimes}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByText('0h ago')).toBeInTheDocument(); // 30 minutes rounds to 0 hours
      expect(screen.getByText('25h ago')).toBeInTheDocument();
    });

    it('formats dates correctly', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Check that dates are formatted as expected
      expect(screen.getByText('Started: 12/1/2021')).toBeInTheDocument();
      expect(screen.getByText('Started: 11/15/2021')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('has correct navigation links in header', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/dashboard/exercise');
    });

    it('has correct section navigation links', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/dashboard/exercise/logs');
      expect(screen.getByRole('link', { name: /manage/i })).toHaveAttribute('href', '/dashboard/exercise/plans');
      expect(screen.getByRole('link', { name: /view details/i })).toHaveAttribute('href', '/dashboard/exercise/analytics');
    });
  });

  describe('Behavioral Tracking Edge Cases', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle malformed tracking data gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock trackEvent to simulate malformed data scenarios
      mockTrackEvent.mockImplementation((data) => {
        // Simulate receiving malformed data
        if (typeof data !== 'object' || data === null) {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const statCard = screen.getAllByRole('button')[0];
      await user.click(statCard);

      // Component should continue to function even if tracking data is malformed
      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('should handle network failures in tracking gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network failure
      mockTrackEvent.mockRejectedValue(new Error('Network error'));

      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const statCard = screen.getAllByRole('button')[0];
      
      // Should not throw even when tracking fails
      await expect(user.click(statCard)).resolves.not.toThrow();
      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
    });

    it('should handle circular references in tracking context', async () => {
      const user = userEvent.setup();
      
      // Mock trackEvent to detect circular references
      mockTrackEvent.mockImplementation(async (data) => {
        try {
          // Attempt to serialize the data to detect circular references
          JSON.stringify(data);
          return Promise.resolve();
        } catch (error) {
          // Handle circular reference error gracefully
          return Promise.resolve();
        }
      });

      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const statCard = screen.getAllByRole('button')[0];
      await user.click(statCard);

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
    });

    it('should handle invalid tracking parameters without crashing', async () => {
      const user = userEvent.setup();

      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Test with malformed data that could cause tracking issues
      const logWithInvalidData = {
        ...mockRecentLogs[0],
        id: null as any,
        exercise: undefined as any,
        sets: 'invalid' as any,
        logged_at: 'invalid-date',
      };

      // Re-render with invalid data
      render(
        <ExerciseOverview
          recentLogs={[logWithInvalidData]}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Should still be able to interact without crashes
      const buttons = screen.getAllByRole('button');
      if (buttons.length > 0) {
        await user.click(buttons[0]);
      }

      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
    });

    it('should handle tracking timeout scenarios', async () => {
      const user = userEvent.setup();
      
      // Mock slow tracking response
      mockTrackEvent.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, 5000); // 5 second delay
        });
      });

      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const statCard = screen.getAllByRole('button')[0];
      
      // Click should not block the UI
      const clickPromise = user.click(statCard);
      
      // UI should remain responsive
      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
      
      // Wait for the click to complete (but not the full timeout)
      await expect(clickPromise).resolves.not.toThrow();
    });

    it('should handle concurrent tracking events without data corruption', async () => {
      const user = userEvent.setup();
      
      // Track call order and data integrity
      const trackingCalls: any[] = [];
      mockTrackEvent.mockImplementation((data) => {
        trackingCalls.push(JSON.parse(JSON.stringify(data))); // Deep copy to avoid reference issues
        return Promise.resolve();
      });

      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const buttons = screen.getAllByRole('button').slice(0, 3);

      // Fire multiple tracking events rapidly
      await Promise.all(buttons.map(button => user.click(button)));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledTimes(4); // 1 initial view + 3 clicks
      });

      // Verify each tracking call has unique and valid data
      const clickEvents = trackingCalls.filter(call => call.eventName !== 'exercise_overview_viewed');
      clickEvents.forEach((call, index) => {
        expect(call).toHaveProperty('eventName');
        expect(call).toHaveProperty('context');
        expect(typeof call.context).toBe('object');
      });
    });

    it('should handle tracking with missing required context fields', async () => {
      const user = userEvent.setup();
      
      // Mock component state that might cause missing context
      render(
        <ExerciseOverview
          recentLogs={[]}
          activeTrainingPlans={[]}
          stats={{ totalExerciseLogs: 0, activePlans: 0, completedSessions: 0, weeklyProgress: 0 }}
        />
      );

      // The initial view tracking should still work with empty data
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
              totalWorkouts: 0,
              activePlans: 0,
              completedSessions: 0,
              weeklyProgress: 0,
              hasRecentLogs: false,
              hasActivePlans: false,
            },
          },
        });
      });
    });

    it('should handle tracking service unavailability gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock service unavailable scenario
      mockTrackEvent.mockRejectedValue(new Error('Service Unavailable'));

      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // All interactions should work despite tracking failures
      const buttons = screen.getAllByRole('button');
      
      for (const button of buttons.slice(0, 2)) {
        await expect(user.click(button)).resolves.not.toThrow();
      }

      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
    });

    it('should handle invalid entity IDs in tracking data', async () => {
      const user = userEvent.setup();
      
      // Create logs with invalid IDs
      const logsWithInvalidIds = [
        { ...mockRecentLogs[0], id: null as any },
        { ...mockRecentLogs[1], id: undefined as any },
        { ...mockRecentLogs[2], id: 'invalid' as any },
      ];

      render(
        <ExerciseOverview
          recentLogs={logsWithInvalidIds}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const logItems = screen.getAllByRole('button').filter(button => 
        button.closest('[data-testid="exercise-overview-recent-logs"]')
      );

      if (logItems.length > 0) {
        await user.click(logItems[0]);
        
        // Should handle invalid entity ID gracefully
        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              eventName: 'recent_workout_log_viewed',
              entityType: 'exercise_log',
              // entityId might be null/undefined but should not crash
            })
          );
        });
      }
    });

    it('should handle deeply nested context data without stack overflow', async () => {
      const user = userEvent.setup();
      
      // Create deeply nested mock data
      const deeplyNestedPlan = {
        ...mockActiveTrainingPlans[0],
        nested: {
          level1: { level2: { level3: { level4: { level5: 'deep value' } } } }
        }
      };

      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={[deeplyNestedPlan]}
          stats={mockStats}
        />
      );

      const planCard = screen.getAllByRole('button').filter(button => 
        button.closest('[data-testid="exercise-overview-active-plans"]')
      )[0];

      if (planCard) {
        await user.click(planCard);
        
        // Should handle deeply nested data without issues
        await waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              eventName: 'training_plan_card_viewed',
            })
          );
        });
      }
    });

    it('should handle tracking data sanitization for sensitive information', async () => {
      const user = userEvent.setup();
      
      // Mock logs that might contain sensitive information
      const logsWithSensitiveData = [
        { 
          ...mockRecentLogs[0], 
          exercise: 'Exercise with password123 in name',
          userEmail: 'sensitive@email.com', // This shouldn't be in exercise data but testing edge case
        },
      ];

      render(
        <ExerciseOverview
          recentLogs={logsWithSensitiveData as any}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const logItem = screen.getAllByRole('button').filter(button => 
        button.closest('[data-testid="exercise-overview-recent-logs"]')
      )[0];

      if (logItem) {
        await user.click(logItem);
        
        await waitFor(() => {
          const trackingCall = mockTrackEvent.mock.calls.find(call => 
            call[0].eventName === 'recent_workout_log_viewed'
          );
          
          if (trackingCall) {
            const contextData = JSON.stringify(trackingCall[0]);
            // Verify sensitive data is not included in tracking
            expect(contextData).not.toContain('password123');
            expect(contextData).not.toContain('sensitive@email.com');
          }
        });
      }
    });
  });

  describe('Internationalization (i18n)', () => {
    const mockUseTranslations = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
      // Reset the mock to return the mock function
      vi.mocked(mockUseTranslations).mockImplementation((key: string) => {
        const translations: Record<string, string> = {
          'title': 'Exercise & Training Overview',
          'subtitle': 'Track your workouts and training progress',
          'viewAll': 'View All →',
          'recentWorkouts': 'Recent Workouts',
          'trainingPlans': 'Training Plans',
          'quickActions': 'Quick Actions',
          'trainingProgress': 'Training Progress',
          'noRecentWorkouts': 'No recent workouts',
          'noActivePlans': 'No active training plans',
          'totalWorkouts': 'Total Workouts',
          'activePlans': 'Active Plans',
          'completedSessions': 'Completed Sessions',
          'weeklyActivity': 'Weekly Activity',
          'allTime': 'All time',
          'inProgress': 'In progress',
          'thisYear': 'This year',
          'thisWeek': 'This week',
          'active': 'Active',
          'started': 'Started',
          'sessionsPerWeek': 'sessions/week',
          'sets': 'sets',
          'reps': 'reps',
          'kg': 'kg',
          'hoursAgo': 'h ago',
          'beginner': 'beginner',
          'intermediate': 'intermediate',
          'advanced': 'advanced',
          'startWorkout': 'Start Workout',
          'createPlan': 'Create Plan',
          'browseExercises': 'Browse Exercises',
          'viewProgress': 'View Progress',
          'strengthProgress': 'Strength Progress',
          'workoutFrequency': 'Workout Frequency',
          'volumeTrends': 'Volume Trends',
          'chartPlaceholder': 'Chart placeholder',
          'viewDetails': 'View Details',
          'manage': 'Manage',
        };
        return translations[key] || key;
      });

      // Re-mock next-intl to use our mock function
      vi.doMock('next-intl', () => ({
        useTranslations: vi.fn(() => mockUseTranslations),
      }));
    });

    it('calls useTranslations with correct keys for main content', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Verify key translation keys are called
      expect(mockUseTranslations).toHaveBeenCalledWith('title');
      expect(mockUseTranslations).toHaveBeenCalledWith('subtitle');
      expect(mockUseTranslations).toHaveBeenCalledWith('viewAll');
      expect(mockUseTranslations).toHaveBeenCalledWith('recentWorkouts');
      expect(mockUseTranslations).toHaveBeenCalledWith('trainingPlans');
      expect(mockUseTranslations).toHaveBeenCalledWith('quickActions');
      expect(mockUseTranslations).toHaveBeenCalledWith('trainingProgress');
    });

    it('calls useTranslations with correct keys for stats', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(mockUseTranslations).toHaveBeenCalledWith('totalWorkouts');
      expect(mockUseTranslations).toHaveBeenCalledWith('activePlans');
      expect(mockUseTranslations).toHaveBeenCalledWith('completedSessions');
      expect(mockUseTranslations).toHaveBeenCalledWith('weeklyActivity');
      expect(mockUseTranslations).toHaveBeenCalledWith('allTime');
      expect(mockUseTranslations).toHaveBeenCalledWith('inProgress');
      expect(mockUseTranslations).toHaveBeenCalledWith('thisYear');
      expect(mockUseTranslations).toHaveBeenCalledWith('thisWeek');
    });

    it('calls useTranslations with correct keys for quick actions', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(mockUseTranslations).toHaveBeenCalledWith('startWorkout');
      expect(mockUseTranslations).toHaveBeenCalledWith('createPlan');
      expect(mockUseTranslations).toHaveBeenCalledWith('browseExercises');
      expect(mockUseTranslations).toHaveBeenCalledWith('viewProgress');
    });

    it('calls useTranslations with correct keys for exercise data', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(mockUseTranslations).toHaveBeenCalledWith('sets');
      expect(mockUseTranslations).toHaveBeenCalledWith('reps');
      expect(mockUseTranslations).toHaveBeenCalledWith('kg');
      expect(mockUseTranslations).toHaveBeenCalledWith('hoursAgo');
      expect(mockUseTranslations).toHaveBeenCalledWith('sessionsPerWeek');
      expect(mockUseTranslations).toHaveBeenCalledWith('active');
      expect(mockUseTranslations).toHaveBeenCalledWith('started');
    });

    it('calls useTranslations with correct keys for difficulty levels', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(mockUseTranslations).toHaveBeenCalledWith('beginner');
      expect(mockUseTranslations).toHaveBeenCalledWith('intermediate');
      expect(mockUseTranslations).toHaveBeenCalledWith('advanced');
    });

    it('calls useTranslations with correct keys for progress charts', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      expect(mockUseTranslations).toHaveBeenCalledWith('strengthProgress');
      expect(mockUseTranslations).toHaveBeenCalledWith('workoutFrequency');
      expect(mockUseTranslations).toHaveBeenCalledWith('volumeTrends');
      expect(mockUseTranslations).toHaveBeenCalledWith('chartPlaceholder');
      expect(mockUseTranslations).toHaveBeenCalledWith('viewDetails');
      expect(mockUseTranslations).toHaveBeenCalledWith('manage');
    });

    it('calls useTranslations with correct keys for empty states', () => {
      render(
        <ExerciseOverview
          recentLogs={[]}
          activeTrainingPlans={[]}
          stats={mockEmptyData.stats}
        />
      );

      expect(mockUseTranslations).toHaveBeenCalledWith('noRecentWorkouts');
      expect(mockUseTranslations).toHaveBeenCalledWith('noActivePlans');
    });

    it('handles missing translations gracefully by returning key as fallback', () => {
      const mockFallbackTranslations = vi.fn((key: string) => {
        // Return key as fallback for unknown translations
        const knownTranslations: Record<string, string> = {
          'title': 'Exercise & Training Overview',
          'subtitle': 'Track your workouts and training progress',
        };
        return knownTranslations[key] || key;
      });

      vi.doMock('next-intl', () => ({
        useTranslations: vi.fn(() => mockFallbackTranslations),
      }));

      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Should still render even with missing translations
      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
      expect(screen.getByTitle(/Exercise & Training Overview/i)).toBeInTheDocument();
      
      // Fallback behavior - keys should be displayed when translations are missing
      expect(mockFallbackTranslations).toHaveBeenCalledWith('viewAll');
      expect(mockFallbackTranslations).toHaveBeenCalledWith('recentWorkouts');
    });

    it('handles translation function errors gracefully', () => {
      const mockErrorTranslations = vi.fn((key: string) => {
        if (key === 'problematicKey') {
          throw new Error('Translation error');
        }
        return key;
      });

      vi.doMock('next-intl', () => ({
        useTranslations: vi.fn(() => mockErrorTranslations),
      }));

      expect(() => {
        render(
          <ExerciseOverview
            recentLogs={mockRecentLogs}
            activeTrainingPlans={mockActiveTrainingPlans}
            stats={mockStats}
          />
        );
      }).not.toThrow();

      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
    });

    it('supports dynamic translation keys with interpolation', () => {
      const mockInterpolatedTranslations = vi.fn((key: string) => {
        const templates: Record<string, string> = {
          'timeAgo': '{hours}h ago',
          'sessionCount': '{count} sessions/week',
          'startedDate': 'Started: {date}',
        };
        return templates[key] || key;
      });

      vi.doMock('next-intl', () => ({
        useTranslations: vi.fn(() => mockInterpolatedTranslations),
      }));

      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Verify component still renders with interpolated translations
      expect(screen.getByTestId('exercise-overview')).toBeInTheDocument();
    });

    it('maintains consistent translation key format across component', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      // Get all the keys that were called
      const calledKeys = mockUseTranslations.mock.calls.map(call => call[0]);
      const uniqueKeys = [...new Set(calledKeys)];

      // Verify key naming conventions
      uniqueKeys.forEach(key => {
        // Keys should be camelCase
        expect(key).toMatch(/^[a-z][a-zA-Z0-9]*$/);
        // Keys should not be empty
        expect(key.length).toBeGreaterThan(0);
        // Keys should not contain spaces or special characters
        expect(key).not.toMatch(/[\s\-_\.]/);
      });
    });

    it('provides appropriate context for translation keys', () => {
      render(
        <ExerciseOverview
          recentLogs={mockRecentLogs}
          activeTrainingPlans={mockActiveTrainingPlans}
          stats={mockStats}
        />
      );

      const calledKeys = mockUseTranslations.mock.calls.map(call => call[0]);
      
      // Verify we have translations for all major UI sections
      const expectedSections = [
        'title', 'subtitle', // Header
        'totalWorkouts', 'activePlans', 'completedSessions', 'weeklyActivity', // Stats
        'recentWorkouts', 'trainingPlans', 'quickActions', 'trainingProgress', // Sections
        'startWorkout', 'createPlan', 'browseExercises', 'viewProgress', // Actions
      ];

      expectedSections.forEach(expectedKey => {
        expect(calledKeys).toContain(expectedKey);
      });
    });
  });
});