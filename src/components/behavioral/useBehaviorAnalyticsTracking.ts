'use client';

import { useCallback } from 'react';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

// Types for tracking function parameters
type MetricData = {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
};

type PatternData = {
  id: number;
  behaviorType: string;
  strength: number;
  confidence: number;
};

type DashboardViewData = {
  timeRange: '7d' | '30d' | '90d' | '1y';
  behaviorTypes: string[];
  patternsCount: number;
  showRealTimeUpdates: boolean;
};

type ChartInteractionData = {
  chartType: string;
  dataPoint?: any;
  action: 'click' | 'hover' | 'view';
};

type UseBehaviorAnalyticsTrackingReturn = {
  trackDashboardView: (data: DashboardViewData) => Promise<void>;
  trackMetricCardView: (metricData: MetricData) => Promise<void>;
  trackPatternInsightView: (pattern: PatternData) => Promise<void>;
  trackPatternDetails: (pattern: PatternData) => Promise<void>;
  trackTimeRangeChange: (oldRange: string, newRange: string) => Promise<void>;
  trackChartInteraction: (data: ChartInteractionData) => Promise<void>;
};

export const useBehaviorAnalyticsTracking = (): UseBehaviorAnalyticsTrackingReturn => {
  const { trackEvent } = useBehaviorTracking();

  const trackDashboardView = useCallback(async (data: DashboardViewData) => {
    await trackEvent({
      eventName: 'behavior_analytics_dashboard_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'BehaviorAnalyticsDashboard',
          action: 'view',
        },
        analytics: {
          timeRange: data.timeRange,
          behaviorTypes: data.behaviorTypes.length ? data.behaviorTypes : ['all'],
          patternsCount: data.patternsCount,
          showRealTimeUpdates: data.showRealTimeUpdates,
        },
      },
    });
  }, [trackEvent]);

  const trackMetricCardView = useCallback(async (metricData: MetricData) => {
    await trackEvent({
      eventName: 'analytics_metric_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'BehaviorAnalyticsDashboard',
          element: 'MetricCard',
          metricType: metricData.title,
          metricValue: metricData.value,
        },
        analytics: {
          metricType: metricData.title,
          trend: metricData.trend,
        },
      },
    });
  }, [trackEvent]);

  const trackPatternInsightView = useCallback(async (pattern: PatternData) => {
    await trackEvent({
      eventName: 'pattern_insight_viewed',
      entityType: 'behavior_pattern',
      entityId: pattern.id,
      context: {
        ui: {
          component: 'BehaviorAnalyticsDashboard',
          element: 'PatternInsightCard',
        },
        analytics: {
          patternType: pattern.behaviorType,
          strength: pattern.strength,
          confidence: pattern.confidence,
        },
      },
    });
  }, [trackEvent]);

  const trackPatternDetails = useCallback(async (pattern: PatternData) => {
    await trackEvent({
      eventName: 'pattern_details_opened',
      entityType: 'behavior_pattern',
      entityId: pattern.id,
      context: {
        analytics: {
          patternType: pattern.behaviorType,
          strength: pattern.strength,
        },
      },
    });
  }, [trackEvent]);

  const trackTimeRangeChange = useCallback(async (oldRange: string, newRange: string) => {
    await trackEvent({
      eventName: 'time_range_changed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'BehaviorAnalyticsDashboard',
          element: 'TimeRangeSelector',
          action: 'change',
        },
        analytics: {
          oldTimeRange: oldRange,
          newTimeRange: newRange,
        },
      },
    });
  }, [trackEvent]);

  const trackChartInteraction = useCallback(async (data: ChartInteractionData) => {
    await trackEvent({
      eventName: 'chart_interaction',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'BehaviorAnalyticsDashboard',
          element: 'BehaviorAnalyticsChart',
          action: data.action,
        },
        analytics: {
          chartType: data.chartType,
          dataPoint: data.dataPoint,
        },
      },
    });
  }, [trackEvent]);

  return {
    trackDashboardView,
    trackMetricCardView,
    trackPatternInsightView,
    trackPatternDetails,
    trackTimeRangeChange,
    trackChartInteraction,
  };
};

// Export types for external use
export type {
  MetricData,
  PatternData,
  DashboardViewData,
  ChartInteractionData,
  UseBehaviorAnalyticsTrackingReturn,
};