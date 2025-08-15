'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import { HealthChart, type HealthDataPoint } from './HealthChart';

// Exercise-specific types
export type ExerciseLog = {
  id: number;
  exercise: string;
  sets: number;
  reps: number | null;
  weight: number | null;
  logged_at: string;
  duration?: number;
  calories?: number;
  intensity?: 'low' | 'medium' | 'high';
};

export type TrainingPlan = {
  id: number;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sessions_per_week: number;
  is_active: boolean;
  start_date: string | null;
  completion_rate?: number;
  next_session?: string;
};

export type ExerciseStats = {
  totalWorkouts: number;
  activePlans: number;
  weeklyProgress: number;
  consistency: number;
  strengthProgress: number;
  volumeTrend: number;
  personalRecords: number;
  averageIntensity: number;
};

export type ExerciseProgressData = {
  workoutFrequency: HealthDataPoint[];
  strengthProgress: HealthDataPoint[];
  volumeTrends: HealthDataPoint[];
  intensityAnalysis: HealthDataPoint[];
};

export type ExerciseGoal = {
  id: string;
  type: 'frequency' | 'strength' | 'endurance' | 'weight';
  target: number;
  current: number;
  unit: string;
  deadline?: string;
};

export type ExerciseAnalyticsSectionProps = {
  exerciseStats: ExerciseStats;
  recentLogs: ExerciseLog[];
  activeTrainingPlans: TrainingPlan[];
  progressData: ExerciseProgressData;
  goals?: ExerciseGoal[];
  loading?: boolean;
  error?: string | null;
  onNavigateToDetails?: (section: string) => void;
  onGoalClick?: (goal: ExerciseGoal) => void;
  onLogClick?: (log: ExerciseLog) => void;
  onPlanClick?: (plan: TrainingPlan) => void;
};

// Exercise Summary Card Component
const ExerciseSummaryCard = ({ 
  title, 
  value, 
  unit, 
  icon, 
  trend, 
  subtitle,
  onClick 
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  onClick?: () => void;
}) => {
  const { trackEvent } = useBehaviorTracking();
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';
  const trendIcon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';

  const handleClick = async () => {
    await trackEvent({
      eventName: 'exercise_summary_card_clicked',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'ExerciseAnalyticsSection',
          element: 'SummaryCard',
          statType: title.toLowerCase().replace(/\s+/g, '_'),
        },
        exercise: {
          statValue: value.toString(),
          trend: trend || 'neutral',
        },
      },
    });
    onClick?.();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${title}: ${value} ${unit || ''}${trend ? `, trending ${trend}` : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </div>
          {subtitle && (
            <p className={`text-sm mt-1 flex items-center gap-1 ${trendColor}`}>
              {trend && <span>{trendIcon}</span>}
              {subtitle}
            </p>
          )}
        </div>
        <div className="text-2xl ml-3" aria-hidden="true">{icon}</div>
      </div>
    </div>
  );
};

// Training Plan Progress Component
const TrainingPlanProgress = ({ plans, onPlanClick }: { 
  plans: TrainingPlan[]; 
  onPlanClick?: (plan: TrainingPlan) => void;
}) => {
  const t = useTranslations('ExerciseManagement');
  const { trackEvent } = useBehaviorTracking();

  const handlePlanClick = async (plan: TrainingPlan) => {
    await trackEvent({
      eventName: 'training_plan_progress_clicked',
      entityType: 'training_session',
      entityId: plan.id,
      context: {
        ui: {
          component: 'ExerciseAnalyticsSection',
          element: 'TrainingPlanProgress',
        },
        exercise: {
          planName: plan.name,
          difficulty: plan.difficulty,
          completionRate: plan.completion_rate,
        },
      },
    });
    onPlanClick?.(plan);
  };

  if (plans.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <div className="text-4xl mb-2">📋</div>
        <p>{t('no_active_plans')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <div
          key={plan.id}
          role="button"
          tabIndex={0}
          className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => handlePlanClick(plan)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handlePlanClick(plan);
            }
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">{plan.name}</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              plan.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
              plan.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {plan.difficulty}
            </span>
          </div>
          
          {plan.completion_rate !== undefined && (
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{t('completion_rate')}</span>
                <span>{Math.round(plan.completion_rate)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(plan.completion_rate, 100)}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{plan.sessions_per_week} sessions/week</span>
            {plan.next_session && (
              <span>Next: {new Date(plan.next_session).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Exercise Goals Component
const ExerciseGoals = ({ goals, onGoalClick }: { 
  goals: ExerciseGoal[]; 
  onGoalClick?: (goal: ExerciseGoal) => void;
}) => {
  const t = useTranslations('ExerciseManagement');
  const { trackEvent } = useBehaviorTracking();

  const handleGoalClick = async (goal: ExerciseGoal) => {
    await trackEvent({
      eventName: 'exercise_goal_clicked',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'ExerciseAnalyticsSection',
          element: 'ExerciseGoals',
        },
        exercise: {
          goalType: goal.type,
          progress: (goal.current / goal.target) * 100,
        },
      },
    });
    onGoalClick?.(goal);
  };

  if (!goals || goals.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <div className="text-4xl mb-2">🎯</div>
        <p>{t('no_goals_set')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => {
        const progress = Math.min((goal.current / goal.target) * 100, 100);
        const isCompleted = progress >= 100;
        
        return (
          <div
            key={goal.id}
            role="button"
            tabIndex={0}
            className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => handleGoalClick(goal)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleGoalClick(goal);
              }
            }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-900 capitalize">{goal.type}</span>
              <span className={`text-sm ${isCompleted ? 'text-green-600' : 'text-gray-600'}`}>
                {goal.current}/{goal.target} {goal.unit}
                {isCompleted && <span className="ml-1">✓</span>}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isCompleted ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {goal.deadline && (
              <p className="text-xs text-gray-500 mt-1">
                Due: {new Date(goal.deadline).toLocaleDateString()}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Recent Logs Component
const RecentExerciseLogs = ({ logs, onLogClick }: { 
  logs: ExerciseLog[]; 
  onLogClick?: (log: ExerciseLog) => void;
}) => {
  const t = useTranslations('ExerciseManagement');
  const { trackEvent } = useBehaviorTracking();

  const handleLogClick = async (log: ExerciseLog) => {
    await trackEvent({
      eventName: 'recent_exercise_log_clicked',
      entityType: 'exercise_log',
      entityId: log.id,
      context: {
        ui: {
          component: 'ExerciseAnalyticsSection',
          element: 'RecentExerciseLogs',
        },
        exercise: {
          exerciseName: log.exercise,
          sets: log.sets,
          intensity: log.intensity,
        },
      },
    });
    onLogClick?.(log);
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <div className="text-4xl mb-2">💪</div>
        <p>{t('no_recent_workouts')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.slice(0, 5).map((log) => {
        const timeAgo = Math.floor((Date.now() - new Date(log.logged_at).getTime()) / (1000 * 60 * 60));
        
        return (
          <div
            key={log.id}
            role="button"
            tabIndex={0}
            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => handleLogClick(log)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleLogClick(log);
              }
            }}
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{log.exercise}</p>
              <p className="text-sm text-gray-500">
                {timeAgo}h ago
                {log.intensity && (
                  <span className={`ml-2 px-1 py-0.5 rounded text-xs ${
                    log.intensity === 'high' ? 'bg-red-100 text-red-700' :
                    log.intensity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {log.intensity}
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium text-gray-900">
                {log.sets} sets
                {log.reps && ` × ${log.reps}`}
              </p>
              {log.weight && (
                <p className="text-sm text-gray-500">{log.weight}kg</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Loading Component
const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-200 rounded-lg h-64"></div>
      <div className="bg-gray-200 rounded-lg h-64"></div>
    </div>
  </div>
);

// Error Component
const ErrorState = ({ error, onRetry }: { error: string; onRetry?: () => void }) => {
  const t = useTranslations('ExerciseManagement');
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-medium text-red-900 mb-2">{t('analytics_error')}</h3>
      <p className="text-red-700 mb-4">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {t('retry')}
        </button>
      )}
    </div>
  );
};

// Main Component
export const ExerciseAnalyticsSection = ({
  exerciseStats,
  recentLogs,
  activeTrainingPlans,
  progressData,
  goals = [],
  loading = false,
  error = null,
  onNavigateToDetails,
  onGoalClick,
  onLogClick,
  onPlanClick,
}: ExerciseAnalyticsSectionProps) => {
  const t = useTranslations('ExerciseManagement');
  const { trackEvent } = useBehaviorTracking();

  // Track section view
  useEffect(() => {
    const trackSectionView = async () => {
      await trackEvent({
        eventName: 'exercise_analytics_section_viewed',
        entityType: 'ui_interaction',
        context: {
          ui: {
            component: 'ExerciseAnalyticsSection',
            action: 'view',
          },
          exercise: {
            totalWorkouts: exerciseStats.totalWorkouts,
            activePlans: exerciseStats.activePlans,
            hasRecentLogs: recentLogs.length > 0,
            hasGoals: goals.length > 0,
          },
        },
      });
    };

    if (!loading && !error) {
      trackSectionView();
    }
  }, [trackEvent, loading, error, exerciseStats, recentLogs.length, goals.length]);

  const handleChartView = async (chartType: string) => {
    await trackEvent({
      eventName: 'exercise_chart_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'ExerciseAnalyticsSection',
          element: 'Chart',
          chartType,
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="exercise-analytics-section">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{t('exercise_analytics_title')}</h2>
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <span className="text-sm">{t('loading')}</span>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" data-testid="exercise-analytics-section">
        <h2 className="text-2xl font-bold text-gray-900">{t('exercise_analytics_title')}</h2>
        <ErrorState error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="exercise-analytics-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('exercise_analytics_title')}</h2>
          <p className="text-gray-600">{t('comprehensive_exercise_insights')}</p>
        </div>
        {onNavigateToDetails && (
          <button
            onClick={() => onNavigateToDetails('exercise')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('view_details')} →
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ExerciseSummaryCard
          title={t('exercise_summary_workouts')}
          value={exerciseStats.totalWorkouts}
          icon="💪"
          trend="up"
          subtitle={t('all_time')}
          onClick={() => onNavigateToDetails?.('workouts')}
        />
        <ExerciseSummaryCard
          title={t('exercise_summary_consistency')}
          value={exerciseStats.consistency}
          unit="%"
          icon="🎯"
          trend={exerciseStats.consistency >= 80 ? 'up' : 'neutral'}
          subtitle={t('this_month')}
          onClick={() => onNavigateToDetails?.('consistency')}
        />
        <ExerciseSummaryCard
          title={t('exercise_summary_strength_progress')}
          value={exerciseStats.strengthProgress}
          unit="%"
          icon="📈"
          trend={exerciseStats.strengthProgress > 0 ? 'up' : 'neutral'}
          subtitle={t('vs_last_month')}
          onClick={() => onNavigateToDetails?.('strength')}
        />
        <ExerciseSummaryCard
          title={t('exercise_summary_volume_trend')}
          value={exerciseStats.volumeTrend}
          unit="%"
          icon="📊"
          trend={exerciseStats.volumeTrend > 0 ? 'up' : exerciseStats.volumeTrend < 0 ? 'down' : 'neutral'}
          subtitle={t('weekly_change')}
          onClick={() => onNavigateToDetails?.('volume')}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthChart
          data={progressData.workoutFrequency}
          chartType="bar"
          title={t('workout_frequency')}
          color="#3b82f6"
          height={300}
          showGrid={true}
          unit="workouts"
          className="cursor-pointer"
          onClick={() => handleChartView('workout_frequency')}
        />
        <HealthChart
          data={progressData.strengthProgress}
          chartType="line"
          title={t('strength_progress')}
          color="#10b981"
          height={300}
          showGrid={true}
          unit="kg"
          className="cursor-pointer"
          onClick={() => handleChartView('strength_progress')}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Training Plans */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('training_plans')}</h3>
            <span className="text-sm text-gray-500">{activeTrainingPlans.length} active</span>
          </div>
          <TrainingPlanProgress plans={activeTrainingPlans} onPlanClick={onPlanClick} />
        </div>

        {/* Exercise Goals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('exercise_goals')}</h3>
            <span className="text-sm text-gray-500">{goals.length} goals</span>
          </div>
          <ExerciseGoals goals={goals} onGoalClick={onGoalClick} />
        </div>

        {/* Recent Workouts */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('recent_workouts')}</h3>
            <span className="text-sm text-gray-500">{recentLogs.length} logs</span>
          </div>
          <RecentExerciseLogs logs={recentLogs} onLogClick={onLogClick} />
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthChart
          data={progressData.volumeTrends}
          chartType="area"
          title={t('volume_trends')}
          color="#8b5cf6"
          height={300}
          showGrid={true}
          unit="sets"
          className="cursor-pointer"
          onClick={() => handleChartView('volume_trends')}
        />
        <HealthChart
          data={progressData.intensityAnalysis}
          chartType="bar"
          title={t('intensity_analysis')}
          color="#f59e0b"
          height={300}
          showGrid={true}
          unit="intensity"
          className="cursor-pointer"
          onClick={() => handleChartView('intensity_analysis')}
        />
      </div>
    </div>
  );
};


interface ExerciseAnalyticsSectionProps {
  stats: ExerciseStats;
  recentLogs: ExerciseLog[];
  activePlans: TrainingPlan[];
  progressData: ExerciseProgressData[];
  trackChartView?: (chartType: string, metric?: string) => Promise<void>;
  trackInsightView?: (insight: any) => Promise<void>;
  onAction?: (action: string, ...args: any[]) => void;
}

interface ExerciseInsight {
  id: string;
  type: 'consistency' | 'progress' | 'pattern' | 'achievement';
  title: string;
  description: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  recommendation: string;
}

const ExerciseAnalyticsSection = ({
  stats,
  recentLogs,
  activePlans,
  progressData,
  trackChartView,
  trackInsightView,
  onAction,
}: ExerciseAnalyticsSectionProps) => {
  const t = useTranslations('HealthManagement');

  // Generate exercise insights based on the data
  const generateExerciseInsights = (): ExerciseInsight[] => {
    const insights: ExerciseInsight[] = [];

    // Consistency insight
    const consistencyScore = stats.weeklyProgress / 100;
    if (consistencyScore > 0.8) {
      insights.push({
        id: 'consistency_excellent',
        type: 'consistency',
        title: t('exercise_consistency_excellent'),
        description: t('exercise_consistency_excellent_desc'),
        value: consistencyScore,
        trend: 'up',
        recommendation: t('exercise_consistency_maintain'),
      });
    } else if (consistencyScore < 0.4) {
      insights.push({
        id: 'consistency_needs_improvement',
        type: 'consistency',
        title: t('exercise_consistency_needs_improvement'),
        description: t('exercise_consistency_needs_improvement_desc'),
        value: consistencyScore,
        trend: 'down',
        recommendation: t('exercise_consistency_improve'),
      });
    }

    // Progress insight
    if (progressData.length > 1) {
      const latestProgress = progressData[progressData.length - 1];
      const earliestProgress = progressData[0];
      const strengthProgress = ((latestProgress.strength - earliestProgress.strength) / earliestProgress.strength) * 100;
      
      if (strengthProgress > 10) {
        insights.push({
          id: 'strength_progress_positive',
          type: 'progress',
          title: t('exercise_strength_progress_positive'),
          description: t('exercise_strength_progress_positive_desc'),
          value: strengthProgress,
          trend: 'up',
          recommendation: t('exercise_strength_progress_continue'),
        });
      }
    }

    // Pattern insight
    const workoutFrequency = stats.totalExerciseLogs / Math.max(1, stats.weeklyProgress / 100 * 4);
    if (workoutFrequency > 3) {
      insights.push({
        id: 'frequency_high',
        type: 'pattern',
        title: t('exercise_frequency_high'),
        description: t('exercise_frequency_high_desc'),
        value: workoutFrequency,
        trend: 'up',
        recommendation: t('exercise_frequency_maintain'),
      });
    }

    // Achievement insight
    if (stats.completedSessions > 10) {
      insights.push({
        id: 'sessions_milestone',
        type: 'achievement',
        title: t('exercise_sessions_milestone'),
        description: t('exercise_sessions_milestone_desc', { count: stats.completedSessions }),
        value: stats.completedSessions,
        trend: 'up',
        recommendation: t('exercise_sessions_celebrate'),
      });
    }

    return insights;
  };

  const exerciseInsights = generateExerciseInsights();

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consistency': return '🎯';
      case 'progress': return '📈';
      case 'pattern': return '🔄';
      case 'achievement': return '🏆';
      default: return '💡';
    }
  };

  const handleChartClick = async (chartType: string) => {
    await trackChartView?.(chartType);
  };

  const handleInsightClick = async (insight: ExerciseInsight) => {
    await trackInsightView?.(insight);
  };

  return (
    <div className="space-y-6">
      {/* Exercise Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('total_workouts')}</p>
                <p className="text-2xl font-bold">{stats.totalExerciseLogs}</p>
              </div>
              <div className="text-3xl">💪</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('active_plans')}</p>
                <p className="text-2xl font-bold">{stats.activePlans}</p>
              </div>
              <div className="text-3xl">📋</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('completed_sessions')}</p>
                <p className="text-2xl font-bold">{stats.completedSessions}</p>
              </div>
              <div className="text-3xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{t('weekly_progress')}</p>
                <p className="text-2xl font-bold">{stats.weeklyProgress}%</p>
              </div>
              <div className="text-3xl">📈</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exercise Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 {t('exercise_insights')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exerciseInsights.length > 0 ? (
              exerciseInsights.map((insight) => (
                <div 
                  key={insight.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleInsightClick(insight)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTypeIcon(insight.type)}</span>
                      <h3 className="font-medium">{insight.title}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-lg ${getT