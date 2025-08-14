'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { HealthAnalyticsLayout } from './HealthAnalyticsLayout';
import {
  transformToSummaryMetrics,
  transformToPredictiveData,
  transformToRadarData,
} from '@/utils/healthDataTransformers';
import type {
  HealthSummaryMetric,
  PredictedDataPoint,
  RadarChartData,
} from '@/components/health/types';
import type {
  HealthRecord,
  HealthGoal,
} from './HealthOverviewContainer';

// Core health metrics to fetch analytics for
const CORE_HEALTH_METRICS = [
  'weight',
  'steps',
  'sleep',
  'heart_rate',
  'blood_pressure',
  'water_intake',
] as const;

type HealthMetric = typeof CORE_HEALTH_METRICS[number];

// API response types for analytics endpoints
type AnalyticsResponse = {
  records: Array<{
    id: number;
    typeId: number;
    value: number;
    unit: string;
    recordedAt: string;
    createdAt: string;
    healthType: {
      id: number;
      slug: string;
      displayName: string;
      unit: string;
    };
  }>;
  goals: Array<{
    id: number;
    typeId: number;
    targetValue: number;
    currentValue: number;
    targetDate: string;
    status: 'active' | 'completed' | 'paused';
    createdAt: string;
    updatedAt: string;
    healthType: {
      id: number;
      slug: string;
      displayName: string;
      unit: string;
    };
    progressPercentage: number;
    daysRemaining: number;
    isOverdue: boolean;
    lastRecordedAt: string | null;
  }>;
  trendData: Array<{
    date: string;
    value: number;
    unit: string;
  }>;
};

type HealthAnalyticsContainerProps = {
  timeRange?: '7d' | '30d' | '90d' | '1y';
  refreshInterval?: number;
  showRealTimeUpdates?: boolean;
};

export const HealthAnalyticsContainer = ({
  timeRange = '30d',
  refreshInterval = 30000,
  showRealTimeUpdates = true,
}: HealthAnalyticsContainerProps = {}) => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const t = useTranslations('HealthManagement');

  // State management
  const [summaryMetrics, setSummaryMetrics] = useState<HealthSummaryMetric[]>([]);
  const [predictiveData, setPredictiveData] = useState<PredictedDataPoint[]>([]);
  const [radarData, setRadarData] = useState<RadarChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch analytics data function
  const fetchAnalyticsData = async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Make parallel API calls for each core health metric
      const analyticsPromises = CORE_HEALTH_METRICS.map(async (metric) => {
        try {
          const response = await fetch(`/api/health/analytics/${metric}?aggregation=weekly&timeRange=${timeRange}`);
          if (!response.ok) {
            console.warn(`Failed to fetch analytics for ${metric}: ${response.status}`);
            return { metric, data: null };
          }
          const data: AnalyticsResponse = await response.json();
          return { metric, data };
        } catch (err) {
          console.warn(`Error fetching analytics for ${metric}:`, err);
          return { metric, data: null };
        }
      });

      const analyticsResults = await Promise.all(analyticsPromises);

      // Combine all records and goals from successful responses
      const allRecords: HealthRecord[] = [];
      const allGoals: HealthGoal[] = [];
      const allTrendData: Array<{ date: string; value: number; unit?: string }> = [];

      analyticsResults.forEach(({ metric, data }) => {
        if (data) {
          // Transform API response to internal format
          const transformedRecords: HealthRecord[] = data.records.map(r => ({
            id: r.id,
            typeId: r.typeId,
            type: r.healthType?.slug || metric,
            value: Number(r.value),
            unit: r.unit,
            recorded_at: r.recordedAt,
            createdAt: r.createdAt,
            healthType: r.healthType,
          }));

          const transformedGoals: HealthGoal[] = data.goals.map(g => ({
            id: g.id,
            typeId: g.typeId,
            type: g.healthType?.slug || metric,
            target_value: Number(g.targetValue),
            current_value: Number(g.currentValue),
            target_date: g.targetDate,
            status: g.status,
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
            healthType: g.healthType,
            progressPercentage: g.progressPercentage,
            daysRemaining: g.daysRemaining,
            isOverdue: g.isOverdue,
            lastRecordedAt: g.lastRecordedAt,
          }));

          allRecords.push(...transformedRecords);
          allGoals.push(...transformedGoals);
          allTrendData.push(...data.trendData);
        }
      });

      // Transform data using existing utilities
      try {
        const summaryMetrics = transformToSummaryMetrics(allRecords, allGoals);
        setSummaryMetrics(summaryMetrics);
      } catch (err) {
        console.warn('Error transforming summary metrics:', err);
        setSummaryMetrics([]);
      }

      try {
        // Use weight data for predictive analysis, or fallback to first available metric
        const weightTrendData = allTrendData.filter(d => 
          allRecords.some(r => r.type === 'weight' && new Date(r.recorded_at).toISOString().split('T')[0] === d.date)
        );
        const trendDataForPrediction = weightTrendData.length > 0 ? weightTrendData : allTrendData.slice(0, 10);
        
        const predictiveData = transformToPredictiveData(
          trendDataForPrediction,
          'linear-regression',
          7
        );
        setPredictiveData(predictiveData);
      } catch (err) {
        console.warn('Error transforming predictive data:', err);
        setPredictiveData([]);
      }

      try {
        const radarData = transformToRadarData(allRecords, allGoals, 'percentage');
        setRadarData(radarData);
      } catch (err) {
        console.warn('Error transforming radar data:', err);
        setRadarData([]);
      }

      setLastUpdate(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load health analytics';
      setError(errorMessage);
      console.error('Health analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch and dependency tracking
  useEffect(() => {
    if (isUserLoaded && user) {
      fetchAnalyticsData();
    } else if (isUserLoaded && !user) {
      setLoading(false);
    }
  }, [isUserLoaded, user, timeRange]);

  // Real-time updates
  useEffect(() => {
    if (!showRealTimeUpdates || !user) {
      return;
    }

    const interval = setInterval(() => {
      fetchAnalyticsData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [showRealTimeUpdates, user, refreshInterval, timeRange]);

  // Return null if user is not authenticated
  if (!isUserLoaded || !user) {
    return null;
  }

  // Loading state
  if (loading && summaryMetrics.length === 0) {
    return (
      <div className="space-y-6" data-testid="health-analytics-loading">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">{t('analytics_loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">{t('analytics_error')}</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            fetchAnalyticsData();
          }}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          {t('analytics_retry')}
        </button>
      </div>
    );
  }

  // Render the layout component with all data and handlers
  return (
    <HealthAnalyticsLayout
      summaryMetrics={summaryMetrics}
      predictiveData={predictiveData}
      radarData={radarData}
      loading={loading}
      error={error}
      lastUpdate={lastUpdate}
      onRefresh={fetchAnalyticsData}
    />
  );
};