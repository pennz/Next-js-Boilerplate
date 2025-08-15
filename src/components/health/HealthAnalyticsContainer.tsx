'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
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
import type {
  BehaviorAnalyticsSummary,
  BehaviorDataPoint,
  HabitStrengthData,
  ContextPatternData,
} from '@/components/behavioral/BehaviorAnalyticsContainer';

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

// Exercise data types
type ExerciseStats = {
  totalExerciseLogs: number;
  activePlans: number;
  completedSessions: number;
  weeklyProgress: number;
};

type ExerciseLog = {
  id: number;
  exercise: string;
  sets: number;
  reps: number | null;
  weight: number | null;
  logged_at: string;
};

type TrainingPlan = {
  id: number;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sessions_per_week: number;
  is_active: boolean;
  start_date: string | null;
};

type ExerciseProgressData = {
  date: string;
  volume: number;
  strength: number;
  frequency: number;
};

// Analytics view types
type AnalyticsView = 'health' | 'behavior' | 'exercise' | 'unified';

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
  defaultView?: AnalyticsView;
};

export const HealthAnalyticsContainer = ({
  timeRange = '30d',
  refreshInterval = 30000,
  showRealTimeUpdates = true,
  defaultView = 'unified',
}: HealthAnalyticsContainerProps = {}) => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const t = useTranslations('HealthManagement');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trackEvent } = useBehaviorTracking();

  // Health analytics state
  const [summaryMetrics, setSummaryMetrics] = useState<HealthSummaryMetric[]>([]);
  const [predictiveData, setPredictiveData] = useState<PredictedDataPoint[]>([]);
  const [radarData, setRadarData] = useState<RadarChartData[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Behavior analytics state
  const [behaviorSummary, setBehaviorSummary] = useState<BehaviorAnalyticsSummary | null>(null);
  const [habitStrengthData, setHabitStrengthData] = useState<HabitStrengthData[]>([]);
  const [contextPatternsData, setContextPatternsData] = useState<ContextPatternData[]>([]);
  const [behaviorFrequencyData, setBehaviorFrequencyData] = useState<BehaviorDataPoint[]>([]);
  const [behaviorPatterns, setBehaviorPatterns] = useState<any[]>([]);
  const [behaviorInsights, setBehaviorInsights] = useState<any[]>([]);
  const [behaviorLoading, setBehaviorLoading] = useState(true);
  const [behaviorError, setBehaviorError] = useState<string | null>(null);

  // Exercise analytics state
  const [exerciseStats, setExerciseStats] = useState<ExerciseStats | null>(null);
  const [recentExerciseLogs, setRecentExerciseLogs] = useState<ExerciseLog[]>([]);
  const [activeTrainingPlans, setActiveTrainingPlans] = useState<TrainingPlan[]>([]);
  const [exerciseProgressData, setExerciseProgressData] = useState<ExerciseProgressData[]>([]);
  const [exerciseLoading, setExerciseLoading] = useState(true);
  const [exerciseError, setExerciseError] = useState<string | null>(null);

  // Navigation state
  const [activeView, setActiveView] = useState<AnalyticsView>(
    (searchParams.get('view') as AnalyticsView) || defaultView
  );
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Computed loading and error states
  const loading = healthLoading || behaviorLoading || exerciseLoading;
  const error = healthError || behaviorError || exerciseError;

  // URL state management helper
  const createQueryString = useCallback((name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    return params.toString();
  }, [searchParams]);

  // Handle view change with URL persistence
  const handleViewChange = useCallback(async (newView: AnalyticsView) => {
    setActiveView(newView);
    router.push(`${pathname}?${createQueryString('view', newView)}`);
    
    // Track view change
    await trackEvent({
      eventName: 'analytics_view_changed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'HealthAnalyticsContainer',
          element: 'ViewNavigation',
          previousView: activeView,
          newView,
        },
        analytics: {
          viewType: newView,
          timeRange,
        },
      },
    });
  }, [activeView, pathname, router, createQueryString, trackEvent, timeRange]);

  // Fetch health analytics data function
  const fetchHealthAnalyticsData = async () => {
    if (!user) {
      return;
    }

    try {
      setHealthLoading(true);
      setHealthError(null);

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

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load health analytics';
      setHealthError(errorMessage);
      console.error('Health analytics fetch error:', err);
    } finally {
      setHealthLoading(false);
    }
  };

  // Fetch behavior analytics data function
  const fetchBehaviorAnalyticsData = async () => {
    if (!user) {
      return;
    }

    try {
      setBehaviorLoading(true);
      setBehaviorError(null);

      // Fetch behavior analytics summary
      const summaryResponse = await fetch(`/api/behavior/analytics/summary?timeRange=${timeRange}`);
      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch behavior summary');
      }
      const summaryData = await summaryResponse.json();
      setBehaviorSummary(summaryData);

      // Fetch habit strength data
      const habitResponse = await fetch(`/api/behavior/analytics/habit-strength?timeRange=${timeRange}`);
      if (!habitResponse.ok) {
        throw new Error('Failed to fetch habit strength');
      }
      const habitData = await habitResponse.json();
      setHabitStrengthData(habitData.data || []);

      // Fetch context patterns
      const contextResponse = await fetch(`/api/behavior/analytics/context-patterns?timeRange=${timeRange}`);
      if (!contextResponse.ok) {
        throw new Error('Failed to fetch context patterns');
      }
      const contextData = await contextResponse.json();
      setContextPatternsData(contextData.data || []);

      // Fetch behavior frequency
      const frequencyResponse = await fetch(`/api/behavior/analytics/frequency?timeRange=${timeRange}`);
      if (!frequencyResponse.ok) {
        throw new Error('Failed to fetch frequency');
      }
      const frequencyData = await frequencyResponse.json();
      setBehaviorFrequencyData(frequencyData.data || []);

      // Fetch behavior patterns and insights (mock data for now)
      setBehaviorPatterns([]);
      setBehaviorInsights([]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load behavior analytics';
      setBehaviorError(errorMessage);
      console.error('Behavior analytics fetch error:', err);
    } finally {
      setBehaviorLoading(false);
    }
  };

  // Fetch exercise data function
  const fetchExerciseData = async () => {
    if (!user) {
      return;
    }

    try {
      setExerciseLoading(true);
      setExerciseError(null);

      // Fetch exercise stats
      const statsResponse = await fetch(`/api/exercise/stats?timeRange=${timeRange}`);
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch exercise stats');
      }
      const statsData = await statsResponse.json();
      setExerciseStats(statsData);

      // Fetch recent exercise logs
      const logsResponse = await fetch(`/api/exercise/logs?limit=10&timeRange=${timeRange}`);
      if (!logsResponse.ok) {
        throw new Error('Failed to fetch exercise logs');
      }
      const logsData = await logsResponse.json();
      setRecentExerciseLogs(logsData.logs || []);

      // Fetch active training plans
      const plansResponse = await fetch(`/api/exercise/training-plans?status=active`);
      if (!plansResponse.ok) {
        throw new Error('Failed to fetch training plans');
      }
      const plansData = await plansResponse.json();
      setActiveTrainingPlans(plansData.plans || []);

      // Fetch exercise progress data
      const progressResponse = await fetch(`/api/exercise/analytics/progress?timeRange=${timeRange}`);
      if (!progressResponse.ok) {
        throw new Error('Failed to fetch exercise progress');
      }
      const progressData = await progressResponse.json();
      setExerciseProgressData(progressData.data || []);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load exercise data';
      setExerciseError(errorMessage);
      console.error('Exercise data fetch error:', err);
    } finally {
      setExerciseLoading(false);
    }
  };

  // Orchestrate parallel data fetching from all domains
  const fetchAnalyticsData = async () => {
    if (!user) {
      return;
    }

    try {
      // Fetch all data in parallel
      await Promise.all([
        fetchHealthAnalyticsData(),
        fetchBehaviorAnalyticsData(),
        fetchExerciseData(),
      ]);

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Analytics data fetch error:', err);
    }
  };

  // Initial data fetch and dependency tracking
  useEffect(() => {
    if (isUserLoaded && user) {
      fetchAnalyticsData();
    } else if (isUserLoaded && !user) {
      setHealthLoading(false);
      setBehaviorLoading(false);
      setExerciseLoading(false);
    }
  }, [isUserLoaded, user, timeRange]);

  // Update active view from URL params
  useEffect(() => {
    const viewFromUrl = searchParams.get('view') as AnalyticsView;
    if (viewFromUrl && viewFromUrl !== activeView) {
      setActiveView(viewFromUrl);
    }
  }, [searchParams, activeView]);

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

  // Loading state - show if any domain is loading and no data exists
  if (loading && summaryMetrics.length === 0 && !behaviorSummary && !exerciseStats) {
    return (
      <div className="space-y-6" data-testid="unified-analytics-loading">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">{t('analytics_loading')}</p>
        </div>
      </div>
    );
  }

  // Error state - show if all domains have errors
  if (healthError && behaviorError && exerciseError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">{t('analytics_error')}</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => {
            setHealthError(null);
            setBehaviorError(null);
            setExerciseError(null);
            fetchAnalyticsData();
          }}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          {t('analytics_retry')}
        </button>
      </div>
    );
  }

  // Render the enhanced layout component with all data and handlers
  return (
    <HealthAnalyticsLayout
      // Health analytics props
      summaryMetrics={summaryMetrics}
      predictiveData={predictiveData}
      radarData={radarData}
      
      // Behavior analytics props
      behaviorSummary={behaviorSummary}
      habitStrengthData={habitStrengthData}
      contextPatternsData={contextPatternsData}
      behaviorFrequencyData={behaviorFrequencyData}
      behaviorPatterns={behaviorPatterns}
      behaviorInsights={behaviorInsights}
      
      // Exercise analytics props
      exerciseStats={exerciseStats}
      recentExerciseLogs={recentExerciseLogs}
      activeTrainingPlans={activeTrainingPlans}
      exerciseProgressData={exerciseProgressData}
      
      // Navigation props
      activeView={activeView}
      onViewChange={handleViewChange}
      
      // Loading and error states
      loading={loading}
      healthLoading={healthLoading}
      behaviorLoading={behaviorLoading}
      exerciseLoading={exerciseLoading}
      error={error}
      healthError={healthError}
      behaviorError={behaviorError}
      exerciseError={exerciseError}
      lastUpdate={lastUpdate}
      
      // Handlers
      onRefresh={fetchAnalyticsData}
      timeRange={timeRange}
      showRealTimeUpdates={showRealTimeUpdates}
    />
  );
};
