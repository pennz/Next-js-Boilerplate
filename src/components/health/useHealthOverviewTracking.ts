'use client';

import { useCallback } from 'react';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import type { HealthRecord, HealthGoal, HealthStats } from './HealthOverviewContainer';

type UseHealthOverviewTrackingReturn = {
  trackStatCardView: (title: string, value: string | number) => Promise<void>;
  trackGoalProgressView: (goal: HealthGoal) => Promise<void>;
  trackRecordView: (record: HealthRecord) => Promise<void>;
  trackQuickActionClick: () => Promise<void>;
  trackOverviewView: (stats: HealthStats, recentRecordsCount: number, activeGoalsCount: number) => Promise<void>;
  trackMiniChartView: (chartType: string) => Promise<void>;
};

export const useHealthOverviewTracking = (): UseHealthOverviewTrackingReturn => {
  const { trackEvent } = useBehaviorTracking();

  const trackStatCardView = useCallback(async (title: string, value: string | number) => {
    await trackEvent({
      eventName: 'health_stat_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          componentName: 'HealthOverview',
          elementId: 'StatCard',
          action: 'view',
        },
        healthData: {
          recordType: title,
          value: typeof value === 'number' ? value : Number.parseFloat(value as string) || 0,
        },
      },
    });
  }, [trackEvent]);

  const trackGoalProgressView = useCallback(async (goal: HealthGoal) => {
    const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
    
    await trackEvent({
      eventName: 'goal_progress_viewed',
      entityType: 'health_goal',
      entityId: goal.id,
      context: {
        ui: {
          componentName: 'HealthOverview',
          elementId: 'GoalProgressCard',
          action: 'view',
        },
        healthData: {
          recordType: goal.type,
          goalId: goal.id,
          value: Math.round(progress),
        },
      },
    });
  }, [trackEvent]);

  const trackRecordView = useCallback(async (record: HealthRecord) => {
    await trackEvent({
      eventName: 'health_record_viewed',
      entityType: 'health_record',
      entityId: record.id,
      context: {
        ui: {
          componentName: 'HealthOverview',
          elementId: 'RecentRecordItem',
          action: 'view',
        },
        healthData: {
          recordType: record.type,
          value: record.value,
          unit: record.unit,
        },
      },
    });
  }, [trackEvent]);

  const trackQuickActionClick = useCallback(async () => {
    await trackEvent({
      eventName: 'ui_click',
      entityType: 'ui_interaction',
      context: {
        ui: {
          componentName: 'HealthOverview',
          elementId: 'QuickActionButton',
          action: 'click',
          elementType: 'link',
        },
      },
    });
  }, [trackEvent]);

  const trackOverviewView = useCallback(async (
    stats: HealthStats,
    recentRecordsCount: number,
    activeGoalsCount: number
  ) => {
    await trackEvent({
      eventName: 'health_overview_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          componentName: 'HealthOverview',
          action: 'view',
        },
        healthData: {
          value: stats.totalRecords,
        },
        performance: {
          loadTime: performance.now(),
        },
      },
    });
  }, [trackEvent]);

  const trackMiniChartView = useCallback(async (chartType: string) => {
    await trackEvent({
      eventName: 'health_chart_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          componentName: 'HealthOverview',
          elementId: 'MiniChart',
          action: 'view',
          elementType: chartType,
        },
        healthData: {
          recordType: chartType,
        },
      },
    });
  }, [trackEvent]);

  return {
    trackStatCardView,
    trackGoalProgressView,
    trackRecordView,
    trackQuickActionClick,
    trackOverviewView,
    trackMiniChartView,
  };
};