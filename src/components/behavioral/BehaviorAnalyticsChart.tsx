'use client';

import { useTranslations } from 'next-intl';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type BehaviorDataPoint = {
  date: string;
  frequency: number;
  consistency: number;
  strength: number;
  context?: string;
  label?: string;
};

export type HabitStrengthData = {
  date: string;
  habitStrength: number;
  consistencyScore: number;
  frequencyScore: number;
  contextScore: number;
  trend: 'increasing' | 'decreasing' | 'stable';
};

export type ContextPatternData = {
  context: string;
  successRate: number;
  frequency: number;
  confidence: number;
  predictivePower: number;
};

export type BehaviorAnalyticsChartProps = {
  data: BehaviorDataPoint[] | HabitStrengthData[] | ContextPatternData[];
  chartType?: 'behavior_frequency' | 'habit_strength' | 'context_patterns' | 'consistency_trends';
  title?: string;
  height?: number;
  width?: string;
  loading?: boolean;
  error?: string;
  className?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y';
  behaviorType?: string;
  showPrediction?: boolean;
  showConfidenceInterval?: boolean;
  onDataPointClick?: (data: any) => void;
};

const LoadingSpinner = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="text-center">
      <div className="mb-2 text-4xl text-gray-400">🧠</div>
      <p className="text-gray-500">{message}</p>
    </div>
  </div>
);

const ErrorState = ({ message }: { message: string }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="text-center">
      <div className="mb-2 text-4xl text-red-400">⚠️</div>
      <p className="text-red-500">{message}</p>
    </div>
  </div>
);

export const BehaviorAnalyticsChart = ({
  data = [],
  chartType = 'behavior_frequency',
  title,
  height = 400,
  width = '100%',
  loading = false,
  error,
  className = '',
  timeRange = '30d',
  behaviorType,
  showPrediction = false,
  showConfidenceInterval = false,
  onDataPointClick,
}: BehaviorAnalyticsChartProps) => {
  const t = useTranslations('BehaviorAnalytics');

  if (loading) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        {title && (
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        {title && (
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <ErrorState message={error} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        {title && (
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <EmptyState message={t('no_behavior_data')} />
      </div>
    );
  }

  const chartMargin = { top: 20, right: 30, left: 20, bottom: 20 };

  const formatTooltip = (value: number, name: string) => {
    switch (name) {
      case 'habitStrength':
        return [`${Math.round(value)}%`, 'Habit Strength'];
      case 'consistencyScore':
        return [`${Math.round(value)}%`, 'Consistency'];
      case 'frequencyScore':
        return [`${Math.round(value)}%`, 'Frequency'];
      case 'contextScore':
        return [`${Math.round(value)}%`, 'Context Score'];
      case 'successRate':
        return [`${Math.round(value)}%`, 'Success Rate'];
      case 'predictivePower':
        return [`${Math.round(value)}%`, 'Predictive Power'];
      default:
        return [value.toString(), name];
    }
  };

  const formatXAxis = (value: string) => {
    if (chartType === 'context_patterns') {
      return value.length > 10 ? `${value.substring(0, 10)}...` : value;
    }
    try {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return value;
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'habit_strength':
        return (
          <AreaChart data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={value => `${value}%`}
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip
              formatter={formatTooltip}
              labelStyle={{ color: '#374151' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="habitStrength"
              stackId="1"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.6}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="consistencyScore"
              stackId="2"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.4}
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="frequencyScore"
              stackId="3"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.3}
              strokeWidth={1}
            />
          </AreaChart>
        );

      case 'context_patterns':
        return (
          <BarChart data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="context"
              tickFormatter={formatXAxis}
              stroke="#6b7280"
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={value => `${value}%`}
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip
              formatter={formatTooltip}
              labelStyle={{ color: '#374151' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Bar
              dataKey="successRate"
              fill="#3b82f6"
              radius={[2, 2, 0, 0]}
              onClick={onDataPointClick}
              cursor="pointer"
            />
            <Bar
              dataKey="predictivePower"
              fill="#f59e0b"
              radius={[2, 2, 0, 0]}
              onClick={onDataPointClick}
              cursor="pointer"
            />
          </BarChart>
        );

      case 'consistency_trends':
        return (
          <LineChart data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={value => `${value}%`}
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip
              formatter={formatTooltip}
              labelStyle={{ color: '#374151' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="consistency"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, stroke: '#8b5cf6', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="frequency"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#06b6d4', strokeWidth: 2 }}
            />
            {showConfidenceInterval && (
              <Area
                type="monotone"
                dataKey="confidenceUpper"
                stroke="none"
                fill="#8b5cf6"
                fillOpacity={0.1}
              />
            )}
          </LineChart>
        );

      case 'behavior_frequency':
      default:
        return (
          <AreaChart data={data} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              tickFormatter={value => value.toString()}
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip
              formatter={formatTooltip}
              labelStyle={{ color: '#374151' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="frequency"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="strength"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        );
    }
  };

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {behaviorType && (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
              {behaviorType}
            </span>
          )}
        </div>
      )}
      <div style={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      {data.length > 0 && (
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            {data.length}
            {' '}
            data points •
            {timeRange}
            {' '}
            range
          </span>
          {showPrediction && (
            <span className="flex items-center gap-1">
              🔮 Predictive analysis enabled
            </span>
          )}
        </div>
      )}
    </div>
  );
};
