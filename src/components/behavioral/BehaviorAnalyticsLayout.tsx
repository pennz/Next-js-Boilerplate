'use client';

import type { BehaviorDataPoint, ContextPatternData, HabitStrengthData } from './BehaviorAnalyticsChart';
import Link from 'next/link';
import { BehaviorAnalyticsChart } from './BehaviorAnalyticsChart';

export type BehaviorAnalyticsSummary = {
  totalEvents: number;
  activePatterns: number;
  habitStrengthAvg: number;
  consistencyScore: number;
  topContext: string;
  weeklyTrend: 'up' | 'down' | 'stable';
  predictionAccuracy: number;
};

type BehaviorAnalyticsLayoutProps = {
  // Data props
  summary: BehaviorAnalyticsSummary | null;
  habitStrengthData: HabitStrengthData[];
  contextPatternsData: ContextPatternData[];
  behaviorFrequencyData: BehaviorDataPoint[];
  patterns: any[];
  insights: any[];
  isAnalyzing: boolean;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  selectedTimeRange: '7d' | '30d' | '90d' | '1y';
  showRealTimeUpdates: boolean;
  
  // Callback props
  onTimeRangeChange: (range: '7d' | '30d' | '90d' | '1y') => void;
  onPatternDetails: (pattern: any) => void;
  
  // Tracking functions
  trackMetricCardView: (title: string, value: string | number, trend?: 'up' | 'down' | 'stable') => Promise<void>;
  trackPatternInsightView: (pattern: any) => Promise<void>;
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

const PatternInsightCard = ({
  pattern,
  onViewDetails,
  onTrack,
}: {
  pattern: any;
  onViewDetails: (pattern: any) => void;
  onTrack: (pattern: any) => Promise<void>;
}) => {
  const handleClick = async () => {
    await onTrack(pattern);
    onViewDetails(pattern);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-sm transition-shadow"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{pattern.behaviorType}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          pattern.strength >= 80
            ? 'bg-green-100 text-green-800'
            : pattern.strength >= 60
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
        }`}
        >
          {pattern.strength}
          % strong
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Frequency</span>
          <span>
            {pattern.frequency}
            x/week
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Consistency</span>
          <span>
            {pattern.consistency}
            %
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Confidence</span>
          <span>
            {pattern.confidence}
            %
          </span>
        </div>
      </div>
      {pattern.topTrigger && (
        <div className="mt-2 text-xs text-gray-500">
          Top trigger:
          {' '}
          {pattern.topTrigger}
        </div>
      )}
    </div>
  );
};

const RealtimeIndicator = ({
  isActive,
  lastUpdate,
}: {
  isActive: boolean;
  lastUpdate: Date | null;
}) => (
  <div className="flex items-center gap-2 text-sm text-gray-600">
    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
    <span>
      {isActive ? 'Live' : 'Offline'}
      {lastUpdate && ` • Updated ${lastUpdate.toLocaleTimeString()}`}
    </span>
  </div>
);

export const BehaviorAnalyticsLayout = ({
  summary,
  habitStrengthData,
  contextPatternsData,
  behaviorFrequencyData,
  patterns,
  insights,
  isAnalyzing,
  loading,
  error,
  lastUpdate,
  selectedTimeRange,
  showRealTimeUpdates,
  onTimeRangeChange,
  onPatternDetails,
  trackMetricCardView,
  trackPatternInsightView,
}: BehaviorAnalyticsLayoutProps) => {
  return (
    <div className="space-y-6" data-testid="behavior-analytics-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Behavior Analytics</h2>
          <p className="text-gray-600">Real-time insights into your habits and patterns</p>
        </div>
        <div className="flex items-center gap-4">
          {showRealTimeUpdates && (
            <RealtimeIndicator isActive={!loading} lastUpdate={lastUpdate} />
          )}
          <Link
            href="/dashboard/analytics/behavior"
            className="text-purple-700 hover:border-b-2 hover:border-purple-700 font-medium"
          >
            View Full Analytics →
          </Link>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['7d', '30d', '90d', '1y'] as const).map(range => (
          <button
            key={range}
            type="button"
            onClick={() => onTimeRangeChange(range)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              selectedTimeRange === range
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Metrics Grid */}
      {summary && (
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
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BehaviorAnalyticsChart
          data={habitStrengthData}
          chartType="habit_strength"
          title="Habit Strength Over Time"
          timeRange={selectedTimeRange}
          loading={loading}
          error={error}
          showPrediction={true}
          className="col-span-1 lg:col-span-2"
          height={350}
        />

        <BehaviorAnalyticsChart
          data={contextPatternsData}
          chartType="context_patterns"
          title="Context Success Patterns"
          timeRange={selectedTimeRange}
          loading={loading}
          error={error}
          onDataPointClick={onPatternDetails}
        />

        <BehaviorAnalyticsChart
          data={behaviorFrequencyData}
          chartType="behavior_frequency"
          title="Behavior Frequency Trends"
          timeRange={selectedTimeRange}
          loading={loading}
          error={error}
        />
      </div>

      {/* Pattern Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Pattern Insights</h3>
          <Link
            href="/dashboard/analytics/patterns"
            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
          >
            View All Patterns
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patterns.slice(0, 6).map(pattern => (
            <PatternInsightCard
              key={pattern.id}
              pattern={pattern}
              onViewDetails={onPatternDetails}
              onTrack={trackPatternInsightView}
            />
          ))}
          {patterns.length === 0 && !isAnalyzing && (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500">No patterns detected yet. Keep tracking your behaviors!</p>
            </div>
          )}
          {isAnalyzing && (
            <div className="col-span-full text-center py-8">
              <div className="inline-flex items-center gap-2">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
                <span className="text-gray-600">Analyzing patterns...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};