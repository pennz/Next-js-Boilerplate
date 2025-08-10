'use client';

import { useEffect } from 'react';
import type { HealthStats } from './HealthOverviewContainer';

const StatCard = ({ title, value, subtitle, icon, trend, onStatCardView }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  onStatCardView: () => void;
}) => {
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';
  const trendIcon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';

  useEffect(() => {
    onStatCardView();
  }, [onStatCardView]);

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={onStatCardView}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onStatCardView();
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

type StatsSectionProps = {
  stats: HealthStats;
  trackStatCardView: (statType: string, value: string | number) => void;
};

export const StatsSection = ({ stats, trackStatCardView }: StatsSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="health-overview-stats">
      <StatCard
        title="Total Records"
        value={stats.totalRecords}
        icon="📊"
        subtitle="This month"
        onStatCardView={() => trackStatCardView('Total Records', stats.totalRecords)}
      />
      <StatCard
        title="Active Goals"
        value={stats.activeGoals}
        icon="🎯"
        subtitle="In progress"
        onStatCardView={() => trackStatCardView('Active Goals', stats.activeGoals)}
      />
      <StatCard
        title="Completed Goals"
        value={stats.completedGoals}
        icon="✅"
        subtitle="This year"
        onStatCardView={() => trackStatCardView('Completed Goals', stats.completedGoals)}
      />
      <StatCard
        title="Weekly Progress"
        value={`${stats.weeklyProgress}%`}
        icon="📈"
        subtitle="On track"
        trend="up"
        onStatCardView={() => trackStatCardView('Weekly Progress', `${stats.weeklyProgress}%`)}
      />
    </div>
  );
};