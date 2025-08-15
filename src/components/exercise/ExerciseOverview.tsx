'use client';

import { useTranslations } from 'next-intl';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import type { ExerciseLog, TrainingPlan, ExerciseStats } from '@/types/exercise';

interface ExerciseOverviewProps {
  recentLogs: ExerciseLog[];
  activeTrainingPlans: TrainingPlan[];
  stats: ExerciseStats;
  onAction?: (action: string) => void;
}

const StatCard = ({ 
  title, 
  value, 
  trend, 
  icon, 
  onClick 
}: { 
  title: string; 
  value: string | number; 
  trend?: 'up' | 'down' | 'stable'; 
  icon: string;
  onClick?: () => void;
}) => {
  const { trackEvent } = useBehaviorTracking();
  
  const handleClick = async () => {
    await trackEvent(
      'exercise_stat_card_clicked',
      'ui_interaction',
      undefined,
      {
        ui: {
          componentName: 'ExerciseOverview',
          action: 'click_stat_card',
          elementId: title.toLowerCase().replace(/\s+/g, '_'),
        },
        custom: {
          statTitle: title,
          statValue: value,
          trend,
        },
      }
    );
    onClick?.();
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <div className="flex items-center mt-1">
                <span className={`text-xs ${
                  trend === 'up' ? 'text-green-600' : 
                  trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trend}
                </span>
              </div>
            )}
          </div>
          <div className="text-3xl">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};

const TrainingPlanCard = ({ 
  plan, 
  onClick 
}: { 
  plan: TrainingPlan; 
  onClick?: () => void;
}) => {
  const { trackEvent } = useBehaviorTracking();
  const t = useTranslations('ExerciseManagement');
  
  const handleClick = async () => {
    await trackEvent(
      'training_plan_card_viewed',
      'exercise_plan',
      plan.id,
      {
        ui: {
          componentName: 'ExerciseOverview',
          action: 'view_plan',
        },
        exerciseData: {
          planId: plan.id,
          difficulty: plan.difficulty,
        },
      }
    );
    onClick?.();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          <Badge className={getDifficultyColor(plan.difficulty)}>
            {t(`difficulty_${plan.difficulty}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('sessions_per_week')}</span>
            <span>{plan.sessions_per_week}</span>
          </div>
          {plan.start_date && (
            <div className="flex justify-between text-sm">
              <span>{t('started')}</span>
              <span>{new Date(plan.start_date).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <span className="text-sm">{t('progress')}</span>
            <Progress value={plan.is_active ? 75 : 100} className="flex-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const RecentLogItem = ({ 
  log, 
  onClick 
}: { 
  log: ExerciseLog; 
  onClick?: () => void;
}) => {
  const { trackEvent } = useBehaviorTracking();
  const t = useTranslations('ExerciseManagement');
  
  const handleClick = async () => {
    await trackEvent(
      'recent_workout_log_viewed',
      'exercise_log',
      log.id,
      {
        ui: {
          componentName: 'ExerciseOverview',
          action: 'view_log',
        },
        exerciseData: {
          exerciseId: log.id,
          sets: log.sets,
          reps: log.reps || 0,
          weight: log.weight || 0,
        },
      }
    );
    onClick?.();
  };

  return (
    <div 
      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
      onClick={handleClick}
    >
      <div>
        <p className="font-medium">{log.exercise}</p>
        <p className="text-sm text-gray-600">
          {log.sets} sets × {log.reps || 0} reps @ {log.weight || 0}kg
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-500">
          {formatDistanceToNow(new Date(log.logged_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
};

const QuickActionButton = ({ 
  action, 
  icon, 
  label, 
  onClick 
}: { 
  action: string; 
  icon: string; 
  label: string; 
  onClick?: () => void;
}) => {
  const { trackEvent } = useBehaviorTracking();
  
  const handleClick = async () => {
    await trackEvent(
      'ui_click',
      'ui_interaction',
      undefined,
      {
        ui: {
          componentName: 'ExerciseOverview',
          action: 'click_quick_action',
          elementId: action,
        },
        custom: {
          actionType: action,
        },
      }
    );
    onClick?.();
  };

  return (
    <Button 
      variant="outline" 
      className="flex-1 h-20 flex flex-col items-center justify-center space-y-1"
      onClick={handleClick}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs">{label}</span>
    </Button>
  );
};

export const ExerciseOverviewContent = ({ 
  recentLogs, 
  activeTrainingPlans, 
  stats, 
  onAction 
}: ExerciseOverviewProps) => {
  const { trackEvent } = useBehaviorTracking();
  const t = useTranslations('ExerciseManagement');

  // Track overview view
  useEffect(() => {
    const trackView = async () => {
      await trackEvent(
        'exercise_overview_viewed',
        'ui_interaction',
        undefined,
        {
          ui: {
            componentName: 'ExerciseOverview',
            action: 'view',
          },
          custom: {
            totalLogs: recentLogs.length,
            activePlans: activeTrainingPlans.length,
            stats,
          },
        }
      );
    };

    trackView();
  }, [trackEvent, recentLogs.length, activeTrainingPlans.length, stats]);

  const handleProgressChartView = async (chartType: string) => {
    await trackEvent(
      'progress_chart_viewed',
      'ui_interaction',
      undefined,
      {
        ui: {
          componentName: 'ExerciseOverview',
          action: 'view_chart',
          elementId: chartType,
        },
        custom: {
          chartType,
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t('total_workouts')}
          value={stats.totalExerciseLogs}
          icon="💪"
          onClick={() => onAction?.('view_workouts')}
        />
        <StatCard
          title={t('active_plans')}
          value={stats.activePlans}
          icon="📋"
          onClick={() => onAction?.('view_plans')}
        />
        <StatCard
          title={t('completed_sessions')}
          value={stats.completedSessions}
          icon="✅"
          onClick={() => onAction?.('view_sessions')}
        />
        <StatCard
          title={t('weekly_activity')}
          value={`${stats.weeklyProgress}%`}
          trend={stats.weeklyProgress > 70 ? 'up' : stats.weeklyProgress > 40 ? 'stable' : 'down'}
          icon="📈"
          onClick={() => onAction?.('view_activity')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Workouts */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('recent_workouts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentLogs.slice(0, 5).map((log) => (
                  <RecentLogItem 
                    key={log.id} 
                    log={log} 
                    onClick={() => onAction?.('view_log', log.id)}
                  />
                ))}
                {recentLogs.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    {t('no_recent_workouts')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Training Plans */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('active_training_plans')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeTrainingPlans.slice(0, 3).map((plan) => (
                  <TrainingPlanCard 
                    key={plan.id} 
                    plan={plan} 
                    onClick={() => onAction?.('view_plan', plan.id)}
                  />
                ))}
                {activeTrainingPlans.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    {t('no_active_plans')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('quick_actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickActionButton
              action="start_workout"
              icon="🏃"
              label={t('start_workout')}
              onClick={() => onAction?.('start_workout')}
            />
            <QuickActionButton
              action="create_plan"
              icon="📝"
              label={t('create_plan')}
              onClick={() => onAction?.('create_plan')}
            />
            <QuickActionButton
              action="browse_exercises"
              icon="🔍"
              label={t('browse_exercises')}
              onClick={() => onAction?.('browse_exercises')}
            />
            <QuickActionButton
              action="view_progress"
              icon="📊"
              label={t('view_progress')}
              onClick={() => onAction?.('view_progress')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Progress Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('strength_progress')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="h-40 bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => handleProgressChartView('strength_progress')}
            >
              <span className="text-gray-500">{t('chart_placeholder')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('workout_frequency')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="h-40 bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => handleProgressChartView('workout_frequency')}
            >
              <span className="text-gray-500">{t('chart_placeholder')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('volume_trends')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="h-40 bg-gray-100 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
              onClick={() => handleProgressChartView('volume_trends')}
            >
              <span className="text-gray-500">{t('chart_placeholder')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const ExerciseOverview = (props: ExerciseOverviewProps) => {
  return <ExerciseOverviewContent {...props} />;
};
