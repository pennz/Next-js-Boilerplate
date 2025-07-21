'use client';

import { useTranslations } from 'next-intl';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type HealthDataPoint = {
  date: string;
  value: number;
  unit?: string;
  label?: string;
};

export type HealthChartProps = {
  data: HealthDataPoint[];
  chartType?: 'line' | 'bar' | 'area';
  title?: string;
  height?: number;
  width?: string;
  color?: string;
  secondaryColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showBrush?: boolean;
  enableZoom?: boolean;
  goalValue?: number;
  loading?: boolean;
  error?: string;
  className?: string;
  dataKey?: string;
  xAxisKey?: string;
  unit?: string;
  formatTooltip?: (value: number, name: string) => [string, string];
  formatXAxis?: (value: string) => string;
  formatYAxis?: (value: number) => string;
};

const LoadingSpinner = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="text-center">
      <div className="mb-2 text-4xl text-gray-400">📊</div>
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

export const HealthChart = ({
  data = [],
  chartType = 'line',
  title,
  height = 300,
  width = '100%',
  color = '#3b82f6',
  secondaryColor = '#10b981',
  showGrid = true,
  showLegend = false,
  showBrush = false,
  enableZoom = false,
  goalValue,
  loading = false,
  error,
  className = '',
  dataKey = 'value',
  xAxisKey = 'date',
  unit = '',
  formatTooltip,
  formatXAxis,
  formatYAxis,
}: HealthChartProps) => {
  const t = useTranslations('HealthManagement');

  // Handle loading state
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

  // Handle error state
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

  // Handle empty data state
  if (!data || data.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        {title && (
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <EmptyState message={t('analytics_empty_state')} />
      </div>
    );
  }

  // Default tooltip formatter
  const defaultTooltipFormatter = (value: number, name: string) => {
    const formattedValue = unit ? `${value} ${unit}` : value.toString();
    return [formattedValue, name];
  };

  // Default axis formatters
  const defaultXAxisFormatter = (value: string) => {
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

  const defaultYAxisFormatter = (value: number) => {
    return unit ? `${value} ${unit}` : value.toString();
  };

  // Chart margin configuration
  const chartMargin = { top: 20, right: 30, left: 20, bottom: 20 };

  // Common chart props
  const commonProps = {
    data,
    margin: chartMargin,
  };

  // Render appropriate chart type
  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={formatXAxis || defaultXAxisFormatter}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              tickFormatter={formatYAxis || defaultYAxisFormatter}
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip
              formatter={formatTooltip || defaultTooltipFormatter}
              labelStyle={{ color: '#374151' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            {showLegend && <Legend />}
            {goalValue && (
              <ReferenceLine
                y={goalValue}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: `Goal: ${goalValue} ${unit}`, position: 'topRight' }}
              />
            )}
            <Bar
              dataKey={dataKey}
              fill={color}
              radius={[2, 2, 0, 0]}
            />
            {showBrush && <Brush dataKey={xAxisKey} height={30} stroke={color} />}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={formatXAxis || defaultXAxisFormatter}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              tickFormatter={formatYAxis || defaultYAxisFormatter}
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip
              formatter={formatTooltip || defaultTooltipFormatter}
              labelStyle={{ color: '#374151' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            {showLegend && <Legend />}
            {goalValue && (
              <ReferenceLine
                y={goalValue}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: `Goal: ${goalValue} ${unit}`, position: 'topRight' }}
              />
            )}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            {showBrush && <Brush dataKey={xAxisKey} height={30} stroke={color} />}
          </AreaChart>
        );

      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={formatXAxis || defaultXAxisFormatter}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              tickFormatter={formatYAxis || defaultYAxisFormatter}
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip
              formatter={formatTooltip || defaultTooltipFormatter}
              labelStyle={{ color: '#374151' }}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            {showLegend && <Legend />}
            {goalValue && (
              <ReferenceLine
                y={goalValue}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: `Goal: ${goalValue} ${unit}`, position: 'topRight' }}
              />
            )}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
            />
            {showBrush && <Brush dataKey={xAxisKey} height={30} stroke={color} />}
          </LineChart>
        );
    }
  };

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      {title && (
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      )}
      <div style={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      {data.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {t('chart_data_points', { count: data.length })}
          {' '}
          data points
        </div>
      )}
    </div>
  );
};
