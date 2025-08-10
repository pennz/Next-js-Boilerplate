'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMicroBehavior } from '@/hooks/useMicroBehavior';
import { BehaviorAnalyticsLayout } from './BehaviorAnalyticsLayout';

// Import types from the original component
export type BehaviorAnalyticsSummary = {
  totalEvents: number;
  activePatterns: number;
  habitStrengthAvg: number;
  consistencyScore: number;
  topContext: string;
  weeklyTrend: 'up' | 'down' | 'stable';
  predictionAccuracy: number;
};

export type BehaviorDataPoint = {
  date: string;
  value: number;
  behaviorType?: string;
  context?: string;
};

export type HabitStrengthData = {
  date: string;
  strength: number;
  behaviorType: string;
  prediction?: number;
};

export type ContextPatternData = {
  context: string;
  successRate: number;
  frequency: number;
  behaviorTypes: string[];
};

type BehaviorAnalyticsContainerProps = {
  timeRange?: '7d' | '30d' | '90d' | '1y';
  behaviorTypes?: string[];
  refreshInterval?: number;
  showRealTimeUpdates?: boolean;
};

export const BehaviorAnalyticsContainer = ({
  timeRange = '30d',
  behaviorTypes = [],
  refreshInterval = 30000,
  showRealTimeUpdates = true,
}: BehaviorAnalyticsContainerProps) => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { patterns, insights, isAnalyzing } = useMicroBehavior();

  // State management
  const [summary, setSummary] = useState<BehaviorAnalyticsSummary | null>(null);
  const [habitStrengthData, setHabitStrengthData] = useState<HabitStrengthData[]>([]);
  const [contextPatternsData, setContextPatternsData] = useState<ContextPatternData[]>([]);
  const [behaviorFrequencyData, setBehaviorFrequencyData] = useState<BehaviorDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  // Fetch analytics data function
  const fetchAnalyticsData = async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch behavior analytics summary
      const summaryResponse = await fetch(`/api/behavior/analytics/summary?timeRange=${selectedTimeRange}`);
      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch summary');
      }
      const summaryData = await summaryResponse.json();
      setSummary(summaryData);

      // Fetch habit strength data
      const habitResponse = await fetch(`/api/behavior/analytics/habit-strength?timeRange=${selectedTimeRange}`);
      if (!habitResponse.ok) {
        throw new Error('Failed to fetch habit strength');
      }
      const habitData = await habitResponse.json();
      setHabitStrengthData(habitData.data || []);

      // Fetch context patterns
      const contextResponse = await fetch(`/api/behavior/analytics/context-patterns?timeRange=${selectedTimeRange}`);
      if (!contextResponse.ok) {
        throw new Error('Failed to fetch context patterns');
      }
      const contextData = await contextResponse.json();
      setContextPatternsData(contextData.data || []);

      // Fetch behavior frequency
      const frequencyResponse = await fetch(`/api/behavior/analytics/frequency?timeRange=${selectedTimeRange}`);
      if (!frequencyResponse.ok) {
        throw new Error('Failed to fetch frequency');
      }
      const frequencyData = await frequencyResponse.json();
      setBehaviorFrequencyData(frequencyData.data || []);

      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
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
  }, [isUserLoaded, user, selectedTimeRange, behaviorTypes]);

  // Real-time updates
  useEffect(() => {
    if (!showRealTimeUpdates || !user) {
      return;
    }

    const interval = setInterval(() => {
      fetchAnalyticsData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [showRealTimeUpdates, user, refreshInterval, selectedTimeRange]);

  // Handle time range changes
  const handleTimeRangeChange = (newRange: '7d' | '30d' | '90d' | '1y') => {
    setSelectedTimeRange(newRange);
  };

  // Handle pattern details
  const handlePatternDetails = (pattern: any) => {
    // This will be handled by the tracking hook in the layout component
  };

  // Return null if user is not authenticated
  if (!isUserLoaded || !user) {
    return null;
  }

  // Loading state
  if (loading && !summary) {
    return (
      <div className="space-y-6" data-testid="behavior-analytics-loading">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading behavior analytics</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Behavior Analytics</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => {
            setError(null);
            fetchAnalyticsData();
          }}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Render the layout component with all data and handlers
  return (
    <BehaviorAnalyticsLayout
      summary={summary}
      habitStrengthData={habitStrengthData}
      contextPatternsData={contextPatternsData}
      behaviorFrequencyData={behaviorFrequencyData}
      patterns={patterns}
      insights={insights}
      isAnalyzing={isAnalyzing}
      loading={loading}
      error={error}
      lastUpdate={lastUpdate}
      selectedTimeRange={selectedTimeRange}
      showRealTimeUpdates={showRealTimeUpdates}
      behaviorTypes={behaviorTypes}
      onTimeRangeChange={handleTimeRangeChange}
      onPatternDetails={handlePatternDetails}
    />
  );
};