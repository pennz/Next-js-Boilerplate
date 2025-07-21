import { currentUser } from '@clerk/nextjs/server';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
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

// Valid health metric types
const VALID_HEALTH_TYPES = [
  'weight',
  'blood_pressure',
  'steps',
  'heart_rate',
  'sleep',
  'calories',
  'water_intake',
  'glucose',
] as const;

type HealthType = typeof VALID_HEALTH_TYPES[number];

type HealthAnalyticsPageProps = {
  params: Promise<{
    locale: string;
    type: string;
  }>;
  searchParams: Promise<{
    start_date?: string;
    end_date?: string;
    aggregation?: 'daily' | 'weekly' | 'monthly';
  }>;
};

type HealthDataPoint = {
  date: string;
  value: number;
  goal?: number;
  unit: string;
};

type AnalyticsData = {
  // Removed unused trend variable: HealthDataPoint[];
  summary: {
    current: number;
    average: number;
    min: number;
    max: number;
    change: number;
    unit: string;
  };
  goalProgress?: {
    target: number;
    current: number;
    percentage: number;
    daysLeft: number;
  };
};

// Mock data generator for development
function generateMockData(type: HealthType, aggregation: string = 'daily'): AnalyticsData {
  const now = new Date();
  const days = aggregation === 'monthly' ? 12 : aggregation === 'weekly' ? 12 : 30;
  const trend: HealthDataPoint[] = [];

  const baseValues: Record<HealthType, { base: number; unit: string; goal?: number }> = {
    weight: { base: 70, unit: 'kg', goal: 65 },
    blood_pressure: { base: 120, unit: 'mmHg' },
    steps: { base: 8000, unit: 'steps', goal: 10000 },
    heart_rate: { base: 72, unit: 'bpm' },
    sleep: { base: 7.5, unit: 'hours', goal: 8 },
    calories: { base: 2000, unit: 'kcal', goal: 1800 },
    water_intake: { base: 2.5, unit: 'liters', goal: 3 },
    glucose: { base: 95, unit: 'mg/dL' },
  };

  const config = baseValues[type];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    if (aggregation === 'monthly') {
      date.setMonth(date.getMonth() - i);
    } else if (aggregation === 'weekly') {
      date.setDate(date.getDate() - (i * 7));
    } else {
      date.setDate(date.getDate() - i);
    }

    const variance = config.base * 0.1;
    const value = config.base + (Math.random() - 0.5) * variance;

    trend.push({
      date: date.toISOString().split('T')[0] || '',
      value: Math.round(value * 100) / 100,
      goal: config.goal,
      unit: config.unit,
    });
  }

  const values = trend.map(d => d.value);
  const current = values[values.length - 1] || 0;
  const previous = values[values.length - 2] || current;

  return {
    //   trend,
    summary: {
      current,
      average: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
      change: Math.round(((current - previous) / previous) * 100 * 100) / 100,
      unit: config.unit,
    },
    goalProgress: config.goal
      ? {
          target: config.goal,
          current,
          percentage: Math.round((current / config.goal) * 100),
          daysLeft: 30,
        }
      : undefined,
  };
}

async function getHealthAnalytics(
  type: HealthType,
  aggregation: string = 'daily',
): Promise<AnalyticsData> {
  // In a real implementation, this would fetch from the database
  // For now, return mock data
  return generateMockData(type, aggregation);
}

function AnalyticsChart({ data, type }: { data: AnalyticsData; type: HealthType }) {
  const chartData = data.trend.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    value: point.value,
    goal: point.goal,
  }));

  const chartConfig = {
    weight: { color: '#8884d8', chartType: 'line' as const },
    blood_pressure: { color: '#82ca9d', chartType: 'line' as const },
    steps: { color: '#ffc658', chartType: 'bar' as const },
    heart_rate: { color: '#ff7300', chartType: 'line' as const },
    sleep: { color: '#8dd1e1', chartType: 'area' as const },
    calories: { color: '#d084d0', chartType: 'bar' as const },
    water_intake: { color: '#87d068', chartType: 'area' as const },
    glucose: { color: '#ffb347', chartType: 'line' as const },
  };

  const config = chartConfig[type];

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {config.chartType === 'line' && (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              name="Value"
            />
            {chartData[0]?.goal && (
              <Line
                type="monotone"
                dataKey="goal"
                stroke="#ff4444"
                strokeDasharray="5 5"
                name="Goal"
              />
            )}
          </LineChart>
        )}
        {config.chartType === 'area' && (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              fill={config.color}
              fillOpacity={0.6}
              name="Value"
            />
            {chartData[0]?.goal && (
              <Line
                type="monotone"
                dataKey="goal"
                stroke="#ff4444"
                strokeDasharray="5 5"
                name="Goal"
              />
            )}
          </AreaChart>
        )}
        {config.chartType === 'bar' && (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill={config.color} name="Value" />
            {chartData[0]?.goal && (
              <Line
                type="monotone"
                dataKey="goal"
                stroke="#ff4444"
                strokeDasharray="5 5"
                name="Goal"
              />
            )}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({
  title,
  value,
  unit,
  change,
}: {
  title: string;
  value: number;
  unit: string;
  change?: number;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      <div className="flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900">
          {value}
          {' '}
          <span className="text-sm text-gray-500">{unit}</span>
        </p>
        {change !== undefined && (
          <span className={`ml-2 text-sm font-medium ${
            change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
          }`}
          >
            {change > 0 ? '+' : ''}
            {change}
            %
          </span>
        )}
      </div>
    </div>
  );
}

function DateRangeSelector({
  startDate,
  endDate,
  aggregation,
  onUpdate,
}: {
  startDate?: string;
  endDate?: string;
  aggregation: string;
  onUpdate: (params: { start_date?: string; end_date?: string; aggregation?: string }) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate || ''}
            onChange={e => onUpdate({ start_date: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate || ''}
            onChange={e => onUpdate({ end_date: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aggregation
          </label>
          <select
            value={aggregation}
            onChange={e => onUpdate({ aggregation: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="flex-1"></div>
        <button
          onClick={() => {
            // Export functionality
            const csvData = 'data:text/csv;charset=utf-8,'
              + 'Date,Value\n'
              // Add CSV export logic here
              + '';
            const link = document.createElement('a');
            link.href = csvData;
            link.download = `health-${aggregation}-data.csv`;
            link.click();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
        >
          Export Data
        </button>
      </div>
    </div>
  );
}

export async function generateMetadata(props: HealthAnalyticsPageProps) {
  const { locale, type } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'HealthManagement',
  });

  if (!VALID_HEALTH_TYPES.includes(type as HealthType)) {
    return {
      title: 'Health Analytics - Not Found',
    };
  }

  return {
    title: t('page_title_analytics', { type: type.replace('_', ' ') }),
    description: t('page_description_analytics', { type: type.replace('_', ' ') }),
  };
}

export default async function HealthAnalyticsPage(props: HealthAnalyticsPageProps) {
  const { locale, type } = await props.params;
  const { start_date, end_date, aggregation = 'daily' } = await props.searchParams;

  // Validate health type
  if (!VALID_HEALTH_TYPES.includes(type as HealthType)) {
    notFound();
  }

  const user = await currentUser();
  if (!user) {
    notFound();
  }

  const t = await getTranslations({
    locale,
    namespace: 'HealthManagement',
  });

  const healthType = type as HealthType;
  const analyticsData = await getHealthAnalytics(
    user.id,
    healthType,
    start_date,
    end_date,
    aggregation,
  );

  const handleFilterUpdate = (params: { start_date?: string; end_date?: string; aggregation?: string }) => {
    // This would be handled by client-side navigation in a real implementation
    // For now, it's a placeholder for the component interface
  };

  return (
    <div className="py-5 space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('page_title_analytics', { type: type.replace('_', ' ') })}
        </h1>
        <p className="text-gray-600">
          {t('page_description_analytics', { type: type.replace('_', ' ') })}
        </p>
      </div>

      {/* Date Range and Filters */}
      <DateRangeSelector
        startDate={start_date}
        endDate={end_date}
        aggregation={aggregation}
        onUpdate={handleFilterUpdate}
      />

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('stat_current')}
          value={analyticsData.summary.current}
          unit={analyticsData.summary.unit}
          change={analyticsData.summary.change}
        />
        <StatCard
          title={t('stat_average')}
          value={analyticsData.summary.average}
          unit={analyticsData.summary.unit}
        />
        <StatCard
          title={t('stat_minimum')}
          value={analyticsData.summary.min}
          unit={analyticsData.summary.unit}
        />
        <StatCard
          title={t('stat_maximum')}
          value={analyticsData.summary.max}
          unit={analyticsData.summary.unit}
        />
      </div>

      {/* Goal Progress (if applicable) */}
      {analyticsData.goalProgress && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('goal_progress_title')}
          </h2>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {t('goal_current')}
              :
              {analyticsData.goalProgress.current}
              {' '}
              {analyticsData.summary.unit}
            </span>
            <span className="text-sm text-gray-600">
              {t('goal_target')}
              :
              {analyticsData.goalProgress.target}
              {' '}
              {analyticsData.summary.unit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min(analyticsData.goalProgress.percentage, 100)}%` }}
            >
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {analyticsData.goalProgress.percentage}
            % complete •
            {analyticsData.goalProgress.daysLeft}
            {' '}
            days remaining
          </p>
        </div>
      )}

      {/* Main Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('chart_title_trend', { type: type.replace('_', ' ') })}
        </h2>
        <Suspense fallback={(
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        >
          <AnalyticsChart data={analyticsData} type={healthType} />
        </Suspense>
      </div>

      {/* Insights Panel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('insights_title')}
        </h2>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
            <p className="text-sm text-gray-600">
              {t('insight_trend', {
                change: analyticsData.summary.change > 0 ? 'increased' : 'decreased',
                percentage: Math.abs(analyticsData.summary.change),
              })}
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2"></div>
            <p className="text-sm text-gray-600">
              {t('insight_average', {
                average: analyticsData.summary.average,
                unit: analyticsData.summary.unit,
              })}
            </p>
          </div>
          {analyticsData.goalProgress && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
              <p className="text-sm text-gray-600">
                {analyticsData.goalProgress.percentage >= 100
                  ? t('insight_goal_achieved')
                  : t('insight_goal_progress', { percentage: analyticsData.goalProgress.percentage })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
