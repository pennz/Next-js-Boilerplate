'use client';

import type { BehaviorAnalyticsSummary } from './BehaviorAnalyticsLayout';

type MetricsSectionProps = {
  summary: BehaviorAnalyticsSummary | null;
  trackMetricCardView: (title: string, value: string | number, trend?: 'up' | 'down' | 'stable') => Promise<void>;
};

const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
  onClick,
  onTrack,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red';
  onClick?: () => void;
  onTrack: (title: string, value: string | number, trend?: 'up' | 'down' | 'stable') => Promise<void>;
}) => {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    purple: 'border-purple-200 bg-purple-50 text-purple-900',
    green: 'border-green-200 bg-green-50 text-green-900',
    orange: 'border-orange-200 bg-orange-50 text-orange-900',
    red: 'border-red-200 bg-red-50 text-red-900',
  };

  const trendIcons = {
    up: '📈',
    down: '📉',
    stable: '➡️',
  };

  const handleClick = async () => {
    await onTrack(title, value, trend);
    onClick?.();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`rounded-lg border p-4 cursor-pointer hover:shadow-lg transition-all ${colorClasses[color]}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-sm opacity-70 flex items-center gap-1">
              {trend && <span>{trendIcons[trend]}</span>}
              {subtitle}
            </p>
          )}
        </div>
        <div className="text-2xl opacity-80">{icon}</div>
      </div>
    </div>
  );
};

export const MetricsSection = ({
  summary,
  trackMetricCardView,
}: MetricsSectionProps) => {
  if (!summary) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Habit Strength"
        value={`${Math.round(summary.habitStrengthAvg)}%`}
        icon="💪"
        subtitle={`${summary.weeklyTrend} trend`}
        trend={summary.weeklyTrend}
        color="purple"
        onTrack={trackMetricCardView}
      />
      <MetricCard
        title="Active Patterns"
        value={summary.activePatterns}
        icon="🔄"
        subtitle="Detected patterns"
        color="blue"
        onTrack={trackMetricCardView}
      />
      <MetricCard
        title="Consistency"
        value={`${Math.round(summary.consistencyScore)}%`}
        icon="🎯"
        subtitle="Weekly average"
        color="green"
        onTrack={trackMetricCardView}
      />
      <MetricCard
        title="Prediction Accuracy"
        value={`${Math.round(summary.predictionAccuracy)}%`}
        icon="🔮"
        subtitle="Model performance"
        color="orange"
        onTrack={trackMetricCardView}
      />
    </div>
  );
};