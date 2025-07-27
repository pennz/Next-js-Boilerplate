'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

// Data interfaces
export type HealthRecord = {
  id: number;
  type: string;
  value: number;
  unit: string;
  recorded_at: string;
};

export type HealthGoal = {
  id: number;
  type: string;
  target_value: number;
  current_value: number;
  target_date: string;
  status: 'active' | 'completed' | 'paused';
};

export type HealthStats = {
  totalRecords: number;
  activeGoals: number;
  completedGoals: number;
  weeklyProgress: number;
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
          componentName: 'HealthOverview',
          elementId: 'StatCard',
          action: 'view',
        },
        healthData: {
          recordType: title,
          value: typeof value === 'number' ? value : Number.parseFloat(value as string) || 0,
        },
      },
    });
  };

  useEffect(() => {
    handleStatCardView();
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleStatCardView}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStatCardView();
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

// Export both components - the wrapper for server-side usage and the main component for direct usage
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
          componentName: 'HealthOverview',
          elementId: 'GoalProgressCard',
          action: 'view',
        },
        healthData: {
          recordType: goal.type,
          goalId: goal.id,
          value: Math.round(progress),
        },
      },
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-sm transition-shadow"
      onClick={handleGoalProgressView}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleGoalProgressView();
        }
      }}
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
          componentName: 'HealthOverview',
          elementId: 'RecentRecordItem',
          action: 'view',
        },
        healthData: {
          recordType: record.type,
          value: record.value,
          unit: record.unit,
        },
      },
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors rounded px-2"
      onClick={handleRecordView}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRecordView();
        }
      }}
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
          componentName: 'HealthOverview',
          elementId: 'QuickActionButton',
          action: 'click',
          elementType: 'link',
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
type HealthOverviewProps = {
  recentRecords: HealthRecord[];
  activeGoals: HealthGoal[];
  stats: HealthStats;
};

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
            componentName: 'HealthOverview',
            action: 'view',
          },
          healthData: {
            value: stats.totalRecords,
          },
          performance: {
            loadTime: performance.now(),
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
          componentName: 'HealthOverview',
          elementId: 'MiniChart',
          action: 'view',
          elementType: chartType,
        },
        healthData: {
          recordType: chartType,
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

      {/* Health Trends & Behavior Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Trends */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              role="button"
              tabIndex={0}
              className="bg-gray-50 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleMiniChartView('weight_trend')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleMiniChartView('weight_trend');
                }
              }}
            >
              <p className="text-sm font-medium text-gray-600 mb-2">Weight Trend</p>
              <div className="h-16 bg-gradient-to-r from-blue-200 to-blue-300 rounded flex items-end justify-center">
                <span className="text-xs text-gray-600">📉</span>
              </div>
            </div>
            <div
              role="button"
              tabIndex={0}
              className="bg-gray-50 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleMiniChartView('daily_steps')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleMiniChartView('daily_steps');
                }
              }}
            >
              <p className="text-sm font-medium text-gray-600 mb-2">Daily Steps</p>
              <div className="h-16 bg-gradient-to-r from-green-200 to-green-300 rounded flex items-end justify-center">
                <span className="text-xs text-gray-600">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Behavior Analytics Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="health-overview-behavior-analytics">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Behavior Insights</h3>
            <Link
              href="/dashboard/analytics/behavior"
              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
            >
              View Analytics
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">85%</div>
              <div className="text-sm text-gray-600">Habit Strength</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">92%</div>
              <div className="text-sm text-gray-600">Consistency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">7</div>
              <div className="text-sm text-gray-600">Active Patterns</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">🌅</div>
              <div className="text-sm text-gray-600">Best Time</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-800">
              <span className="font-medium">💡 Insight:</span>
              {' '}
              Your morning workouts have a 94% success rate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
