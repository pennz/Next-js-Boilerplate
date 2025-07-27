'use client';

import type {
  GoalProgress,
  HealthSummaryCardsProps,
  HealthSummaryMetric,
  TrendData,
  TrendDirection,
} from './types';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

// Helper function to calculate percentage change between current and previous values
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) {
    return 0;
  }
  return ((current - previous) / previous) * 100;
};

// Helper function to determine trend direction
const determineTrendDirection = (current: number, previous?: number): TrendDirection => {
  if (!previous || previous === 0) {
    return 'neutral';
  }

  const change = current - previous;
  if (Math.abs(change) < 0.01) {
    return 'neutral';
  } // Consider very small changes as neutral

  return change > 0 ? 'up' : 'down';
};

// Helper function to format percentage display
const formatPercentage = (percentage: number): string => {
  const absPercentage = Math.abs(percentage);
  if (absPercentage < 0.1) {
    return '0%';
  }
  if (absPercentage < 1) {
    return `${absPercentage.toFixed(1)}%`;
  }
  return `${Math.round(absPercentage)}%`;
};

// Helper function to calculate trend data
const calculateTrendData = (current: number, previous?: number): TrendData | null => {
  if (!previous) {
    return null;
  }

  const percentage = calculatePercentageChange(current, previous);
  const direction = determineTrendDirection(current, previous);

  return {
    direction,
    percentage: Math.abs(percentage),
    isImprovement: direction === 'up', // This could be customized per metric type
  };
};

// Helper function to calculate goal progress
const calculateGoalProgress = (current?: number, target?: number): GoalProgress | null => {
  if (!current || !target || target === 0) {
    return null;
  }

  const percentage = Math.min((current / target) * 100, 100);
  const isCompleted = percentage >= 100;
  const remaining = Math.max(target - current, 0);

  return {
    percentage,
    isCompleted,
    remaining,
  };
};

// Internal SummaryCard component
const SummaryCard = ({ metric }: { metric: HealthSummaryMetric }) => {
  const { trackEvent } = useBehaviorTracking();
  const t = useTranslations('HealthSummaryCards');

  const trendData = calculateTrendData(metric.value, metric.previousValue);
  const goalProgress = calculateGoalProgress(metric.goalCurrent, metric.goalTarget);

  const handleCardView = async () => {
    await trackEvent({
      eventName: 'health_summary_card_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          componentName: 'HealthSummaryCards',
          elementId: 'SummaryCard',
          action: 'view',
        },
        healthData: {
          recordType: metric.label,
          value: metric.value,
          unit: metric.unit,
          metricId: metric.id,
        },
      },
    });
  };

  const handleCardClick = async () => {
    await trackEvent({
      eventName: 'health_summary_card_clicked',
      entityType: 'ui_interaction',
      context: {
        ui: {
          componentName: 'HealthSummaryCards',
          elementId: 'SummaryCard',
          action: 'click',
        },
        healthData: {
          recordType: metric.label,
          value: metric.value,
          unit: metric.unit,
          metricId: metric.id,
        },
      },
    });
  };

  // Track card view on mount
  useEffect(() => {
    handleCardView();
  }, []);

  // Determine trend styling
  const getTrendStyling = (direction: TrendDirection) => {
    switch (direction) {
      case 'up':
        return {
          color: 'text-green-500',
          icon: '↗',
          bgColor: 'bg-green-50',
        };
      case 'down':
        return {
          color: 'text-red-500',
          icon: '↘',
          bgColor: 'bg-red-50',
        };
      default:
        return {
          color: 'text-gray-500',
          icon: '→',
          bgColor: 'bg-gray-50',
        };
    }
  };

  const trendStyling = trendData ? getTrendStyling(trendData.direction) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`${metric.label}: ${metric.value} ${metric.unit}${trendData ? `, trend ${trendData.direction} by ${formatPercentage(trendData.percentage)}` : ''}${goalProgress ? `, ${Math.round(goalProgress.percentage)}% of goal` : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{metric.label}</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-gray-900">
              {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
            </p>
            <span className="text-sm text-gray-500">{metric.unit}</span>
          </div>
        </div>
        {metric.icon && (
          <div className="text-2xl ml-3" aria-hidden="true">
            {metric.icon}
          </div>
        )}
      </div>

      {/* Trend Indicator */}
      {trendData && (
        <div className={`flex items-center gap-1 mb-2 text-sm ${trendStyling?.color}`}>
          <span className="font-medium" aria-hidden="true">
            {trendStyling?.icon}
          </span>
          <span>
            {formatPercentage(trendData.percentage)}
            {' '}
            {trendData.direction === 'up' ? t('trend.increase') : trendData.direction === 'down' ? t('trend.decrease') : t('trend.noChange')}
          </span>
        </div>
      )}

      {/* Goal Progress Bar */}
      {goalProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>{t('goal.progress')}</span>
            <span>
              {Math.round(goalProgress.percentage)}
              %
              {goalProgress.isCompleted && (
                <span className="ml-1 text-green-500">✓</span>
              )}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                goalProgress.isCompleted ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(goalProgress.percentage, 100)}%` }}
              role="progressbar"
              aria-valuenow={goalProgress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Goal progress: ${Math.round(goalProgress.percentage)}%`}
            />
          </div>
          {metric.goalTarget && metric.goalCurrent !== undefined && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {t('goal.current')}
                :
                {metric.goalCurrent.toLocaleString()}
              </span>
              <span>
                {t('goal.target')}
                :
                {metric.goalTarget.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main HealthSummaryCards component
export const HealthSummaryCards = ({ metrics, className = '' }: HealthSummaryCardsProps) => {
  const { trackEvent } = useBehaviorTracking();
  const t = useTranslations('HealthSummaryCards');

  // Track component view on mount
  useEffect(() => {
    const trackComponentView = async () => {
      await trackEvent({
        eventName: 'health_summary_cards_viewed',
        entityType: 'ui_interaction',
        context: {
          ui: {
            componentName: 'HealthSummaryCards',
            action: 'view',
          },
          healthData: {
            value: metrics.length,
          },
          performance: {
            loadTime: performance.now(),
          },
        },
      });
    };

    trackComponentView();
  }, [trackEvent, metrics.length]);

  // Handle empty state
  if (!metrics || metrics.length === 0) {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}
        data-testid="health-summary-cards-empty"
      >
        <div className="text-4xl mb-4" aria-hidden="true">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('emptyState.title')}
        </h3>
        <p className="text-gray-600">
          {t('emptyState.description')}
        </p>
      </div>
    );
  }

  // Determine grid columns based on number of metrics
  const getGridColumns = (count: number): string => {
    if (count === 1) {
      return 'grid-cols-1';
    }
    if (count === 2) {
      return 'grid-cols-1 md:grid-cols-2';
    }
    if (count === 3) {
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  };

  return (
    <div
      className={`space-y-4 ${className}`}
      data-testid="health-summary-cards"
      role="region"
      aria-label={t('ariaLabel')}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t('title')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('subtitle')}
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {t('metricsCount', { count: metrics.length })}
        </div>
      </div>

      {/* Metrics Grid */}
      <div
        className={`grid gap-4 ${getGridColumns(metrics.length)}`}
        data-testid="health-summary-cards-grid"
      >
        {metrics.map(metric => (
          <SummaryCard
            key={metric.id}
            metric={metric}
          />
        ))}
      </div>

      {/* Summary Stats */}
      {metrics.length > 1 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {metrics.filter(m => m.previousValue !== undefined).length}
              </div>
              <div className="text-xs text-gray-600">
                {t('summary.withTrends')}
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {metrics.filter(m => m.goalTarget !== undefined).length}
              </div>
              <div className="text-xs text-gray-600">
                {t('summary.withGoals')}
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {metrics.filter((m) => {
                  const progress = calculateGoalProgress(m.goalCurrent, m.goalTarget);
                  return progress?.isCompleted;
                }).length}
              </div>
              <div className="text-xs text-gray-600">
                {t('summary.completed')}
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {metrics.filter((m) => {
                  const trend = calculateTrendData(m.value, m.previousValue);
                  return trend?.direction === 'up';
                }).length}
              </div>
              <div className="text-xs text-gray-600">
                {t('summary.improving')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Export helper functions for testing
export {
  calculateGoalProgress,
  calculatePercentageChange,
  calculateTrendData,
  determineTrendDirection,
  formatPercentage,
};
