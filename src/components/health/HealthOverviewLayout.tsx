'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useHealthOverviewTracking } from './useHealthOverviewTracking';
import { StatsSection } from './StatsSection';
import { RecordsSection } from './RecordsSection';
import { GoalsSection } from './GoalsSection';
import type { HealthRecord, HealthGoal, HealthStats } from './HealthOverviewContainer';

const QuickActionButton = ({ href, icon, label, onQuickActionClick }: {
  href: string;
  icon: string;
  label: string;
  onQuickActionClick: () => void;
}) => {
  return (
    <Link
      href={href}
      onClick={onQuickActionClick}
      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
    >
      <span className="text-lg">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
};

type HealthOverviewLayoutProps = {
  recentRecords: HealthRecord[];
  activeGoals: HealthGoal[];
  stats: HealthStats;
};

export const HealthOverviewLayout = ({ recentRecords, activeGoals, stats }: HealthOverviewLayoutProps) => {
  const { user } = useUser();
  const {
    trackOverviewView,
    trackStatCardView,
    trackGoalProgressView,
    trackRecordView,
    trackQuickActionClick,
    trackMiniChartView,
  } = useHealthOverviewTracking();

  // Track health overview view on component mount
  useEffect(() => {
    if (user) {
      trackOverviewView(stats, recentRecords.length, activeGoals.length);
    }
  }, [user, trackOverviewView, stats, recentRecords.length, activeGoals.length]);

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
      <StatsSection stats={stats} trackStatCardView={trackStatCardView} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Records */}
        <RecordsSection recentRecords={recentRecords} trackRecordView={trackRecordView} />

        {/* Goal Progress */}
        <GoalsSection activeGoals={activeGoals} trackGoalProgressView={trackGoalProgressView} />

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-testid="health-overview-quick-actions">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <QuickActionButton
              href="/dashboard/health/records?action=add"
              icon="➕"
              label="Add Record"
              onQuickActionClick={trackQuickActionClick}
            />
            <QuickActionButton
              href="/dashboard/health/goals?action=create"
              icon="🎯"
              label="Set Goal"
              onQuickActionClick={trackQuickActionClick}
            />
            <QuickActionButton
              href="/dashboard/health/analytics"
              icon="📊"
              label="View Analytics"
              onQuickActionClick={trackQuickActionClick}
            />
            <QuickActionButton
              href="/dashboard/health/reminders"
              icon="⏰"
              label="Set Reminder"
              onQuickActionClick={trackQuickActionClick}
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
              onClick={() => trackMiniChartView('weight_trend')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  trackMiniChartView('weight_trend');
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
              onClick={() => trackMiniChartView('daily_steps')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  trackMiniChartView('daily_steps');
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
