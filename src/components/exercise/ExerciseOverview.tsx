'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

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

type ExerciseOverviewProps = {
  recentLogs: ExerciseLog[];
  activeTrainingPlans: TrainingPlan[];
  stats: Stats;
};

const StatCard = ({ title, value, subtitle, icon, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
}) => {
  const { trackEvent } = useBehaviorTracking();
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';
  const trendIcon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';

  const handleStatCardClick = async () => {
    await trackEvent({
      eventName: 'exercise_stat_card_clicked',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'ExerciseOverview',
          element: 'StatCard',
          statType: title.toLowerCase().replace(/\s+/g, '_'),
          statValue: value.toString(),
          trend: trend || 'neutral',
        },
      },
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleStatCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStatCardClick();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className={`text-sm ${trendColor} flex items-center gap-1`}>
              {trend && <span>{trendIcon}</span>}
              {subtitle}
            </p>
          )}
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
};

export const ExerciseOverview = ({ recentLogs, activeTrainingPlans, stats }: ExerciseOverviewProps) => {
  return (
    <ExerciseOverviewContent
      recentLogs={recentLogs}
      activeTrainingPlans={activeTrainingPlans}
      stats={stats}
    />
  );
};

const TrainingPlanCard = ({ plan }: { plan: TrainingPlan }) => {
  const { trackEvent } = useBehaviorTracking();
  const difficultyColor = plan.difficulty === 'beginner'
    ? 'bg-green-100 text-green-800'
    : plan.difficulty === 'intermediate'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800';

  const handlePlanCardClick = async () => {
    await trackEvent({
      eventName: 'training_plan_card_viewed',
      entityType: 'training_session',
      entityId: plan.id,
      context: {
        ui: {
          component: 'ExerciseOverview',
          element: 'TrainingPlanCard',
        },
        exercise: {
          planName: plan.name,
          difficulty: plan.difficulty,
          sessionsPerWeek: plan.sessions_per_week,
          isActive: plan.is_active,
          startDate: plan.start_date,
        },
      },
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-sm transition-shadow"
      onClick={handlePlanCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePlanCardClick();
        }
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{plan.name}</h4>
        {plan.is_active && <span className="text-green-500 text-sm">🟢 Active</span>}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColor}`}>
            {plan.difficulty}
          </span>
          <span className="text-sm text-gray-600">
            {plan.sessions_per_week}
            {' '}
            sessions/week
          </span>
        </div>
        {plan.start_date && (
          <p className="text-xs text-gray-500">
            Started:
            {' '}
            {new Date(plan.start_date).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
};

const RecentLogItem = ({ log }: { log: ExerciseLog }) => {
  const { trackEvent } = useBehaviorTracking();
  const logDate = new Date(log.logged_at);
  const timeAgo = Math.floor((Date.now() - logDate.getTime()) / (1000 * 60 * 60));

  const handleLogItemClick = async () => {
    await trackEvent({
      eventName: 'recent_workout_log_viewed',
      entityType: 'exercise_log',
      entityId: log.id,
      context: {
        ui: {
          component: 'ExerciseOverview',
          element: 'RecentLogItem',
        },
        exercise: {
          exerciseName: log.exercise,
          sets: log.sets,
          reps: log.reps,
          weight: log.weight,
          timeAgo,
          loggedAt: log.logged_at,
        },
      },
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={handleLogItemClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleLogItemClick();
        }
      }}
    >
      <div>
        <p className="font-medium text-gray-900">{log.exercise}</p>
        <p className="text-sm text-gray-500">
          {timeAgo}
          {t('hours_ago')}
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium text-gray-900">
          {log.sets}
          {' '}
          {t('sets')}
          {log.reps && ` × ${log.reps} ${t('reps')}`}
        </p>
        {log.weight && (
          <p className="text-sm text-gray-500">
            {log.weight}
            {t('kg')}
          </p>
        )}
      </div>
    </div>
  );
};

const QuickActionButton = ({ href, icon, label }: {
  href: string;
  icon: string;
  label: string;
}) => {
  const { trackEvent } = useBehaviorTracking();

  const handleQuickActionClick = async () => {
    await trackEvent({
      eventName: 'ui_click',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'ExerciseOverview',
          element: 'QuickActionButton',
          action: label.toLowerCase().replace(/\s+/g, '_'),
          destination: href,
        },
        exercise: {
          actionType: label,
        },
      },
    });
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
      onClick={handleQuickActionClick}
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
};

// Create a wrapper component to handle the async data fetching
const ExerciseOverviewContent = ({
  recentLogs,
  activeTrainingPlans,
  stats,
}: ExerciseOverviewProps) => {
  const t = useTranslations('ExerciseManagement');
  const { trackEvent } = useBehaviorTracking();

  // Track when the overview is viewed
  useEffect(() => {
    const trackOverviewView = async () => {
      await trackEvent({
        eventName: 'exercise_overview_viewed',
        entityType: 'ui_interaction',
        context: {
          ui: {
            component: 'ExerciseOverview',
            element: 'OverviewPage',
          },
          exercise: {
            totalWorkouts: stats.totalExerciseLogs,
            activePlans: stats.activePlans,
            completedSessions: stats.completedSessions,
            weeklyProgress: stats.weeklyProgress,
            hasRecentLogs: recentLogs.length > 0,
            hasActivePlans: activeTrainingPlans.length > 0,
          },
        },
      });
    };

    trackOverviewView();
  }, [trackEvent, stats, recentLogs.length, activeTrainingPlans.length]);

  const handleProgressChartView = async (chartType: string) => {
    await trackEvent({
      eventName: 'progress_chart_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'ExerciseOverview',
          element: 'ProgressChart',
          chartType,
        },
        exercise: {
          chartType,
          totalWorkouts: stats.totalExerciseLogs,
        },
      },
    });
  };

  return (
    <div className="space-y-6" data-testid="exercise-overview">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('exercise_overview')}</h2>
          <p className="text-gray-600">{t('track_workouts_training')}</p>
        </div>
        <Link
          href="/dashboard/exercise"
          className="text-blue-700 hover:border-b-2 hover:border-blue-700 font-medium"
        >
          {t('view_all')} →
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="exercise-overview-stats">
        <StatCard
          title={t('total_workouts')}
          value={stats.totalExerciseLogs}
          icon="💪"
          subtitle={t('all_time')}
        />
        <StatCard
          title={t('active_plans')}
          value={stats.activePlans}
          icon="📋"
          subtitle={t('in_progress')}
        />
        <StatCard
          title={t('completed_sessions')}
          value={stats.completedSessions}
          icon="✅"
          subtitle={t('this_year')}
        />
        <StatCard
          title={t('weekly_activity')}
          value={stats.weeklyProgress}
          icon="🔥"
          subtitle={t('this_week')}
          trend="up"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Workouts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="exercise-overview-recent-logs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('recent_workouts')}</h3>
            <Link
              href="/dashboard/exercise/logs"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {t('view_all')}
            </Link>
          </div>
          <div className="space-y-1">
            {recentLogs.length > 0
              ? (
                  recentLogs.map(log => (
                    <RecentLogItem key={log.id} log={log} />
                  ))
                )
              : (
                  <p className="text-gray-500 text-center py-4">{t('no_recent_workouts')}</p>
                )}
          </div>
        </div>

        {/* Active Training Plans */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="exercise-overview-active-plans">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('training_plans')}</h3>
            <Link
              href="/dashboard/exercise/plans"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {t('manage')}
            </Link>
          </div>
          <div className="space-y-4">
            {activeTrainingPlans.length > 0
              ? (
                  activeTrainingPlans.map(plan => (
                    <TrainingPlanCard key={plan.id} plan={plan} />
                  ))
                )
              : (
                  <p className="text-gray-500 text-center py-4">{t('no_active_plans')}</p>
                )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="exercise-overview-quick-actions">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('quick_actions')}</h3>
          <div className="space-y-3">
            <QuickActionButton
              href="/dashboard/exercise/workout"
              icon="🏋️"
              label={t('start_workout')}
            />
            <QuickActionButton
              href="/dashboard/exercise/plans?action=create"
              icon="📋"
              label={t('create_plan')}
            />
            <QuickActionButton
              href="/dashboard/exercise/exercises"
              icon="📚"
              label={t('browse_exercises')}
            />
            <QuickActionButton
              href="/dashboard/exercise/analytics"
              icon="📊"
              label={t('view_progress')}
            />
          </div>
        </div>
      </div>

      {/* Progress Charts Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="exercise-overview-progress-charts">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('training_progress')}</h3>
          <Link
            href="/dashboard/exercise/analytics"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {t('view_details')}
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            role="button"
            tabIndex={0}
            className="bg-gray-50 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => handleProgressChartView('strength_progress')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleProgressChartView('strength_progress');
              }
            }}
          >
            <p className="text-sm font-medium text-gray-600 mb-2">{t('strength_progress')}</p>
            <div className="h-20 bg-gradient-to-r from-red-200 to-red-300 rounded flex items-end justify-center">
              <span className="text-xs text-gray-600">{t('chart_placeholder')}</span>
            </div>
          </div>
          <div
            role="button"
            tabIndex={0}
            className="bg-gray-50 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => handleProgressChartView('workout_frequency')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleProgressChartView('workout_frequency');
              }
            }}
          >
            <p className="text-sm font-medium text-gray-600 mb-2">{t('workout_frequency')}</p>
            <div className="h-20 bg-gradient-to-r from-blue-200 to-blue-300 rounded flex items-end justify-center">
              <span className="text-xs text-gray-600">{t('chart_placeholder')}</span>
            </div>
          </div>
          <div
            role="button"
            tabIndex={0}
            className="bg-gray-50 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => handleProgressChartView('volume_trends')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleProgressChartView('volume_trends');
              }
            }}
          >
            <p className="text-sm font-medium text-gray-600 mb-2">{t('volume_trends')}</p>
            <div className="h-20 bg-gradient-to-r from-green-200 to-green-300 rounded flex items-end justify-center">
              <span className="text-xs text-gray-600">{t('chart_placeholder')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
