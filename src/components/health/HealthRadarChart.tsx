'use client';

import type {
  HealthRadarChartProps,
  HealthRadarMetric,
  RadarChartConfig,
  ScoringSystem,
} from './types';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import {
  DEFAULT_SCORE_COLORS,
  getScoreColor,
} from '@/utils/healthScoring';

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
  </div>
);

// Empty state component
const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="text-center">
      <div className="mb-2 text-4xl text-gray-400">📊</div>
      <p className="text-gray-500">{message}</p>
    </div>
  </div>
);

// Error state component
const ErrorState = ({ message }: { message: string }) => (
  <div className="flex h-64 items-center justify-center">
    <div className="text-center">
      <div className="mb-2 text-4xl text-red-400">⚠️</div>
      <p className="text-red-500">{message}</p>
    </div>
  </div>
);

// Score legend component
const ScoreLegend = ({
  colors = DEFAULT_SCORE_COLORS,
  className = '',
}: {
  colors?: typeof DEFAULT_SCORE_COLORS;
  className?: string;
}) => {
  const t = useTranslations('HealthManagement');

  return (
    <div className={`mt-4 rounded-lg bg-gray-50 p-3 ${className}`}>
      <h4 className="mb-2 text-sm font-medium text-gray-700">
        {t('radar_legend_title')}
      </h4>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="flex items-center space-x-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: colors.excellent }}
          />
          <span className="text-gray-600">{t('radar_score_excellent')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: colors.good }}
          />
          <span className="text-gray-600">{t('radar_score_good')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: colors.fair }}
          />
          <span className="text-gray-600">{t('radar_score_fair')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: colors.poor }}
          />
          <span className="text-gray-600">{t('radar_score_poor')}</span>
        </div>
      </div>
    </div>
  );
};

// Custom tooltip component
const CustomTooltip = ({
  active,
  payload,
  formatTooltip,
}: {
  active?: boolean;
  payload?: any[];
  formatTooltip?: (metric: HealthRadarMetric) => string;
}) => {
  const t = useTranslations('HealthManagement');

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0]?.payload;
  if (!data) {
    return null;
  }

  const metric: HealthRadarMetric = {
    category: data.category,
    value: data.value,
    maxValue: data.maxValue,
    unit: data.unit,
    score: data.score,
    color: data.color,
    icon: data.icon,
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <div className="flex items-center space-x-2">
        {metric.icon && <span className="text-lg">{metric.icon}</span>}
        <span className="font-medium text-gray-900">{metric.category}</span>
      </div>
      <div className="mt-1 space-y-1 text-sm">
        <div className="text-gray-600">
          {t('radar_tooltip_value', {
            value: metric.value.toLocaleString(),
            unit: metric.unit,
          })}
        </div>
        <div className="text-gray-600">
          {t('radar_tooltip_score', { score: Math.round(metric.score) })}
        </div>
        {formatTooltip && (
          <div className="text-gray-500">
            {formatTooltip(metric)}
          </div>
        )}
      </div>
    </div>
  );
};

// Main component
export const HealthRadarChart = ({
  data = [],
  scoringSystem = 'percentage',
  config,
  title,
  subtitle,
  height = 400,
  width = '100%',
  showLegend = false,
  showTooltip = true,
  showScoreLegend = true,
  loading = false,
  error,
  className = '',
  ariaLabel,
  ariaDescription,
  onMetricHover,
  onScoringSystemChange,
  onConfigChange,
  formatTooltip,
  formatScore,
}: HealthRadarChartProps) => {
  const t = useTranslations('HealthManagement');
  const { trackEvent } = useBehaviorTracking();

  // Internal state
  const [hoveredMetric, setHoveredMetric] = useState<HealthRadarMetric | null>(null);
  const [internalConfig, setInternalConfig] = useState<RadarChartConfig>({
    gridLevels: 5,
    angleAxisConfig: {
      tick: true,
      tickLine: false,
      axisLine: false,
      fontSize: 12,
    },
    radiusAxisConfig: {
      tick: false,
      tickLine: false,
      axisLine: false,
      domain: [0, 100],
    },
    colorScheme: DEFAULT_SCORE_COLORS,
    size: 'medium',
    ...config,
  });

  // Process radar data with memoization
  const processedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    // Get the latest data set or combine multiple sets
    const latestData = data[data.length - 1];
    if (!latestData?.metrics || latestData.metrics.length === 0) {
      return [];
    }

    // Transform metrics for radar chart format
    return latestData.metrics.map(metric => ({
      category: metric.category,
      score: Math.max(0, Math.min(100, metric.score)), // Ensure 0-100 range
      value: metric.value,
      maxValue: metric.maxValue,
      unit: metric.unit,
      color: metric.color || getScoreColor(metric.score, internalConfig.colorScheme),
      icon: metric.icon,
      // Add formatted score if custom formatter provided
      formattedScore: formatScore ? formatScore(metric.score) : `${Math.round(metric.score)}%`,
    }));
  }, [data, scoringSystem, internalConfig.colorScheme, formatScore]);

  // Handle metric hover
  const handleMetricHover = useCallback((metric: HealthRadarMetric | null) => {
    setHoveredMetric(metric);
    onMetricHover?.(metric);

    // Track hover interaction
    if (metric) {
      trackEvent({
        eventName: 'radar_chart_metric_hover',
        entityType: 'health_metric',
        context: {
          metricCategory: metric.category,
          score: metric.score,
          scoringSystem,
        },
      });
    }
  }, [onMetricHover, trackEvent, scoringSystem]);

  // Handle scoring system change
  const handleScoringSystemChange = useCallback((newSystem: ScoringSystem) => {
    onScoringSystemChange?.(newSystem);

    trackEvent({
      eventName: 'radar_chart_scoring_system_change',
      entityType: 'health_chart',
      context: {
        previousSystem: scoringSystem,
        newSystem,
        metricsCount: processedData.length,
      },
    });
  }, [onScoringSystemChange, trackEvent, scoringSystem, processedData.length]);

  // Handle config change
  const handleConfigChange = useCallback((newConfig: RadarChartConfig) => {
    setInternalConfig(prev => ({ ...prev, ...newConfig }));
    onConfigChange?.(newConfig);
  }, [onConfigChange]);

  // Chart size configuration
  const sizeConfig = {
    small: { height: 300, fontSize: 10 },
    medium: { height: 400, fontSize: 12 },
    large: { height: 500, fontSize: 14 },
  };

  const currentSize = sizeConfig[internalConfig.size || 'medium'];

  // Handle loading state
  if (loading) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
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
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
        )}
        <ErrorState message={error} />
      </div>
    );
  }

  // Handle empty data state
  if (!processedData || processedData.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
        )}
        <EmptyState message={t('radar_empty_state')} />
      </div>
    );
  }

  // Handle insufficient data (need at least 3 metrics for meaningful radar)
  if (processedData.length < 3) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
        )}
        <EmptyState message={t('radar_insufficient_data')} />
      </div>
    );
  }

  // Accessibility label
  const accessibilityLabel = ariaLabel
    || t('radar_accessibility_label', { count: processedData.length });

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}
      role="img"
      aria-label={accessibilityLabel}
      aria-description={ariaDescription || t('radar_chart_description')}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
      )}

      {/* Chart Container */}
      <div style={{ width, height: currentSize.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={processedData}
            margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
          >
            {/* Polar Grid */}
            <PolarGrid
              gridType="polygon"
              radialLines={true}
              stroke="#e5e7eb"
              strokeWidth={1}
            />

            {/* Angle Axis (Categories) */}
            <PolarAngleAxis
              dataKey="category"
              tick={{
                fontSize: internalConfig.angleAxisConfig?.fontSize || currentSize.fontSize,
                fill: '#374151',
              }}
              tickLine={internalConfig.angleAxisConfig?.tickLine}
              axisLine={internalConfig.angleAxisConfig?.axisLine}
              className="text-gray-700"
            />

            {/* Radius Axis (Scores) */}
            <PolarRadiusAxis
              domain={internalConfig.radiusAxisConfig?.domain || [0, 100]}
              tick={internalConfig.radiusAxisConfig?.tick}
              tickLine={internalConfig.radiusAxisConfig?.tickLine}
              axisLine={internalConfig.radiusAxisConfig?.axisLine}
              angle={90}
              tickCount={internalConfig.gridLevels || 5}
            />

            {/* Radar Area */}
            <Radar
              name="Health Metrics"
              dataKey="score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.1}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: '#3b82f6',
                strokeWidth: 2,
                stroke: '#ffffff',
              }}
              activeDot={{
                r: 6,
                fill: '#1d4ed8',
                strokeWidth: 2,
                stroke: '#ffffff',
              }}
              onMouseEnter={(data) => {
                const metric: HealthRadarMetric = {
                  category: data.category,
                  value: data.value,
                  maxValue: data.maxValue,
                  unit: data.unit,
                  score: data.score,
                  color: data.color,
                  icon: data.icon,
                };
                handleMetricHover(metric);
              }}
              onMouseLeave={() => handleMetricHover(null)}
            />

            {/* Tooltip */}
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip formatTooltip={formatTooltip} />}
                cursor={{ strokeDasharray: '3 3' }}
              />
            )}

            {/* Legend */}
            {showLegend && (
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  fontSize: currentSize.fontSize,
                  color: '#374151',
                }}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Score Legend */}
      {showScoreLegend && (
        <ScoreLegend
          colors={internalConfig.colorScheme}
          className="mt-4"
        />
      )}

      {/* Data Summary */}
      {processedData.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {t('chart_data_points', { count: processedData.length })}
          {' '}
          metrics
          {hoveredMetric && (
            <span className="ml-2">
              • Hovering:
              {' '}
              {hoveredMetric.category}
              {' '}
              (
              {Math.round(hoveredMetric.score)}
              %)
            </span>
          )}
        </div>
      )}
    </div>
  );
};
