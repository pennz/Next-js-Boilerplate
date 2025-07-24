'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

// Mock data interfaces - these would come from the health services in the actual implementation
type HealthRecord = {
  id: number;
  type: string;
  value: number;
  unit: string;
  recorded_at: string;
};

type HealthGoal = {
  id: number;
  type: string;
  target_value: number;
  current_value: number;
  target_date: string;
  status: 'active' | 'completed' | 'paused';
};

// Server component wrapper to handle data fetching
export const HealthOverviewWrapper = async () => {
  const { currentUser } = await import('@clerk/nextjs/server');
  const { getTranslations } = await import('next-intl/server');
  const { and, desc, eq, sql } = await import('drizzle-orm');
  const { db } = await import('@/libs/DB');
  const { healthGoalSchema, healthRecordSchema, healthTypeSchema } = await import('@/models/Schema');

  const user = await currentUser();
  const t = await getTranslations('HealthManagement');

  if (!user) {
    return null;
  }

  // Fetch recent records (last 3)
  const recentRecordsRaw = await db
    .select({
      id: healthRecordSchema.id,
      value: healthRecordSchema.value,
      unit: healthRecordSchema.unit,
      recorded_at: healthRecordSchema.recordedAt,
      type: healthTypeSchema.displayName,
    })
    .from(healthRecordSchema)
    .leftJoin(healthTypeSchema, eq(healthRecordSchema.typeId, healthTypeSchema.id))
    .where(eq(healthRecordSchema.userId, user.id))
    .orderBy(desc(healthRecordSchema.recordedAt))
    .limit(3);

  const recentRecords = recentRecordsRaw.map(r => ({
    id: r.id,
    type: r.type ?? '',
    value: Number(r.value),
    unit: r.unit,
    recorded_at: r.recorded_at instanceof Date ? r.recorded_at.toISOString() : r.recorded_at,
  }));

  // Fetch active goals
  const activeGoalsRaw = await db
    .select({
      id: healthGoalSchema.id,
      type: healthTypeSchema.displayName,
      target_value: healthGoalSchema.targetValue,
      target_date: healthGoalSchema.targetDate,
      status: healthGoalSchema.status,
      type_id: healthGoalSchema.typeId,
      unit: healthTypeSchema.unit,
    })
    .from(healthGoalSchema)
    .leftJoin(healthTypeSchema, eq(healthGoalSchema.typeId, healthTypeSchema.id))
    .where(and(eq(healthGoalSchema.userId, user.id), eq(healthGoalSchema.status, 'active')))
    .orderBy(desc(healthGoalSchema.createdAt))
    .limit(3);

  // For each goal, get the latest record for progress
  const activeGoals = await Promise.all(activeGoalsRaw.map(async (goal) => {
    const latestRecord = await db
      .select({ value: healthRecordSchema.value })
      .from(healthRecordSchema)
      .where(and(eq(healthRecordSchema.userId, user.id), eq(healthRecordSchema.typeId, goal.type_id)))
      .orderBy(desc(healthRecordSchema.recordedAt))
      .limit(1);
    const current_value = latestRecord[0]?.value ? Number(latestRecord[0].value) : 0;
    return {
      id: goal.id,
      type: goal.type ?? '',
      target_value: Number(goal.target_value),
      current_value,
      target_date: goal.target_date instanceof Date ? goal.target_date.toISOString().slice(0, 10) : goal.target_date,
      status: goal.status,
    };
  }));

  // Stats
  const totalRecords = await db
    .select({ count: sql`COUNT(*)` })
    .from(healthRecordSchema)
    .where(eq(healthRecordSchema.userId, user.id));
  const activeGoalsCount = activeGoals.length;
  const completedGoals = await db
    .select({ count: sql`COUNT(*)` })
    .from(healthGoalSchema)
    .where(and(eq(healthGoalSchema.userId, user.id), eq(healthGoalSchema.status, 'completed')));

  // Weekly progress: count of records in the last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyRecords = await db
    .select({ count: sql`COUNT(*)` })
    .from(healthRecordSchema)
    .where(and(
      eq(healthRecordSchema.userId, user.id),
      sql`${healthRecordSchema.recordedAt} >= ${weekAgo.toISOString()}`,
    ));

  const stats = {
    totalRecords: Number(totalRecords[0]?.count || 0),
    activeGoals: activeGoalsCount,
    completedGoals: Number(completedGoals[0]?.count || 0),
    weeklyProgress: Number(weeklyRecords[0]?.count || 0),
  };

  return <HealthOverview recentRecords={recentRecords} activeGoals={activeGoals} stats={stats} />;
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

  const handleStatCardView = async () => {
    await trackEvent({
      eventName: 'health_stat_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'HealthOverview',
          element: 'StatCard',
          statType: title,
          statValue: value,
          trend,
        },
        health: {
          metricType: title,
          metricValue: value,
        },
      },
    });
  };

  useEffect(() => {
    handleStatCardView();
  }, []);

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleStatCardView}
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

// Export both components - the wrapper for server-side usage and the main component for direct usage
export { HealthOverviewWrapper };
export default HealthOverview;

const GoalProgressCard = ({ goal }: { goal: HealthGoal }) => {
  const { trackEvent } = useBehaviorTracking();
  const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
  const isCompleted = goal.status === 'completed';

  const handleGoalProgressView = async () => {
    await trackEvent({
      eventName: 'goal_progress_viewed',
      entityType: 'health_goal',
      entityId: goal.id,
      context: {
        ui: {
          component: 'HealthOverview',
          element: 'GoalProgressCard',
        },
        health: {
          goalType: goal.type,
          progress: Math.round(progress),
          isCompleted,
          currentValue: goal.current_value,
          targetValue: goal.target_value,
          targetDate: goal.target_date,
        },
      },
    });
  };

  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-sm transition-shadow"
      onClick={handleGoalProgressView}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">
          {goal.type}
          {' '}
          Goal
        </h4>
        {isCompleted && <span className="text-green-500 text-sm">✓ Completed</span>}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>
            {Math.round(progress)}
            %
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            Current:
            {goal.current_value}
          </span>
          <span>
            Target:
            {goal.target_value}
          </span>
        </div>
      </div>
    </div>
  );
};

const RecentRecordItem = ({ record }: { record: HealthRecord }) => {
  const { trackEvent } = useBehaviorTracking();
  const recordDate = new Date(record.recorded_at);
  const timeAgo = Math.floor((Date.now() - recordDate.getTime()) / (1000 * 60 * 60));

  const handleRecordView = async () => {
    await trackEvent({
      eventName: 'health_record_viewed',
      entityType: 'health_record',
      entityId: record.id,
      context: {
        ui: {
          component: 'HealthOverview',
          element: 'RecentRecordItem',
          location: 'recent_records_section',
        },
        health: {
          recordType: record.type,
          recordValue: record.value,
          recordUnit: record.unit,
          timeAgo: `${timeAgo}h`,
        },
      },
    });
  };

  return (
    <div 
      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors rounded px-2"
      onClick={handleRecordView}
    >
      <div>
        <p className="font-medium text-gray-900">{record.type}</p>
        <p className="text-sm text-gray-500">
          {timeAgo}
          h ago
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium text-gray-900">
          {record.value}
          {' '}
          {record.unit}
        </p>
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
          component: 'HealthOverview',
          element: 'QuickActionButton',
          action: 'click',
          buttonLabel: label,
          targetHref: href,
        },
        navigation: {
          destination: href,
          actionType: label.toLowerCase().replace(' ', '_'),
        },
      },
    });
  };

  return (
    <Link
      href={href}
      onClick={handleQuickActionClick}
      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
};

// Props interface for the client component
interface HealthOverviewProps {
  recentRecords: HealthRecord[];
  activeGoals: HealthGoal[];
  stats: {
    totalRecords: number;
    activeGoals: number;
    completedGoals: number;
    weeklyProgress: number;
  };
}

export const HealthOverview = ({ recentRecords, activeGoals, stats }: HealthOverviewProps) => {
  const { trackEvent } = useBehaviorTracking();
  const { user } = useUser();

  // Track health overview view on component mount
  useEffect(() => {
    const trackOverviewView = async () => {
      await trackEvent({
        eventName: 'health_overview_viewed',
        entityType: 'ui_interaction',
        context: {
          ui: {
            component: 'HealthOverview',
            action: 'view',
          },
          health: {
            totalRecords: stats.totalRecords,
            activeGoals: stats.activeGoals,
            completedGoals: stats.completedGoals,
            weeklyProgress: stats.weeklyProgress,
            recentRecordsCount: recentRecords.length,
            activeGoalsCount: activeGoals.length,
          },
          performance: {
            viewTimestamp: new Date().toISOString(),
          },
        },
      });
    };

    if (user) {
      trackOverviewView();
    }
  }, [user, trackEvent, stats, recentRecords.length, activeGoals.length]);

  // Track mini chart interactions
  const handleMiniChartView = async (chartType: string) => {
    await trackEvent({
      eventName: 'health_chart_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'HealthOverview',
          element: 'MiniChart',
          chartType,
        },
        health: {
          chartType,
        },
      },
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="health-overview">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Health Overview</h2>
          <p className="text-gray-600">Track your health metrics and goals</p>
        </div>
        <Link
          href="/dashboard/health"
          className="text-blue-700 hover:border-b-2 hover:border-blue-700 font-medium"
        >
          View All →
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="health-overview-stats">
        <StatCard
          title="Total Records"
          value={stats.totalRecords}
          icon="📊"
          subtitle="This month"
        />
        <StatCard
          title="Active Goals"
          value={stats.activeGoals}
          icon="🎯"
          subtitle="In progress"
        />
        <StatCard
          title="Completed Goals"
          value={stats.completedGoals}
          icon="✅"
          subtitle="This year"
        />
        <StatCard
          title="Weekly Progress"
          value={`${stats.weeklyProgress}%`}
          icon="📈"
          subtitle="On track"
          trend="up"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Records */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="health-overview-recent-records">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Records</h3>
            <Link
              href="/dashboard/health/records"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          <div className="space-y-1">
            {recentRecords.length > 0
              ? (
                  recentRecords.map(record => (
                    <RecentRecordItem key={record.id} record={record} />
                  ))
                )
              : (
                  <p className="text-gray-500 text-center py-4">No recent records</p>
                )}
          </div>
        </div>

        {/* Goal Progress */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="health-overview-active-goals">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Goal Progress</h3>
            <Link
              href="/dashboard/health/goals"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Manage
            </Link>
          </div>
          <div className="space-y-4">
            {activeGoals.length > 0
              ? (
                  activeGoals.map(goal => (
                    <GoalProgressCard key={goal.id} goal={goal} />
                  ))
                )
              : (
                  <p className="text-gray-500 text-center py-4">No active goals</p>
                )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="health-overview-quick-actions">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <QuickActionButton
              href="/dashboard/health/records?action=add"
              icon="➕"
              label="Add Record"
            />
            <QuickActionButton
              href="/dashboard/health/goals?action=create"
              icon="🎯"
              label="Set Goal"
            />
            <QuickActionButton
              href="/dashboard/health/analytics"
              icon="📊"
              label="View Analytics"
            />
            <QuickActionButton
              href="/dashboard/health/reminders"
              icon="⏰"
              label="Set Reminder"
            />
          </div>
        </div>
      </div>

      {/* Mini Chart Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="health-overview-mini-charts">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Health Trends</h3>
          <Link
            href="/dashboard/health/analytics"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View Details
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Placeholder for mini charts - would be replaced with actual Recharts components */}
          <div 
            className="bg-gray-50 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => handleMiniChartView('weight_trend')}
          >
            <p className="text-sm font-medium text-gray-600 mb-2">Weight Trend</p>
            <div className="h-20 bg-gradient-to-r from-blue-200 to-blue-300 rounded flex items-end justify-center">
              <span className="text-xs text-gray-600">📉 Chart placeholder</span>
            </div>
          </div>
          <div 
            className="bg-gray-50 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => handleMiniChartView('daily_steps')}
          >
            <p className="text-sm font-medium text-gray-600 mb-2">Daily Steps</p>
            <div className="h-20 bg-gradient-to-r from-green-200 to-green-300 rounded flex items-end justify-center">
              <span className="text-xs text-gray-600">📊 Chart placeholder</span>
            </div>
          </div>
          <div 
            className="bg-gray-50 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => handleMiniChartView('blood_pressure')}
          >
            <p className="text-sm font-medium text-gray-600 mb-2">Blood Pressure</p>
            <div className="h-20 bg-gradient-to-r from-purple-200 to-purple-300 rounded flex items-end justify-center">
              <span className="text-xs text-gray-600">📈 Chart placeholder</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
