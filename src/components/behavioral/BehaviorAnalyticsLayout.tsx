'use client';

import type { BehaviorDataPoint, ContextPatternData, HabitStrengthData } from './BehaviorAnalyticsChart';
import { BehaviorAnalyticsHeader } from './BehaviorAnalyticsHeader';
import { MetricsSection } from './MetricsSection';
import { ChartsSection } from './ChartsSection';
import { PatternsSection } from './PatternsSection';
import { TimeRangeSelector } from './TimeRangeSelector';

export type BehaviorAnalyticsSummary = {
  totalEvents: number;
  activePatterns: number;
  habitStrengthAvg: number;
  consistencyScore: number;
  topContext: string;
  weeklyTrend: 'up' | 'down' | 'stable';
  predictionAccuracy: number;
};

type BehaviorAnalyticsLayoutProps = {
  // Data props
  summary: BehaviorAnalyticsSummary | null;
  habitStrengthData: HabitStrengthData[];
  contextPatternsData: ContextPatternData[];
  behaviorFrequencyData: BehaviorDataPoint[];
  patterns: any[];
  insights: any[];
  isAnalyzing: boolean;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  selectedTimeRange: '7d' | '30d' | '90d' | '1y';
  showRealTimeUpdates: boolean;
  
  // Callback props
  onTimeRangeChange: (range: '7d' | '30d' | '90d' | '1y') => void;
  onPatternDetails: (pattern: any) => void;
  
  // Tracking functions
  trackMetricCardView: (title: string, value: string | number, trend?: 'up' | 'down' | 'stable') => Promise<void>;
  trackPatternInsightView: (pattern: any) => Promise<void>;
};


export const BehaviorAnalyticsLayout = ({
  summary,
  habitStrengthData,
  contextPatternsData,
  behaviorFrequencyData,
  patterns,
  insights,
  isAnalyzing,
  loading,
  error,
  lastUpdate,
  selectedTimeRange,
  showRealTimeUpdates,
  onTimeRangeChange,
  onPatternDetails,
  trackMetricCardView,
  trackPatternInsightView,
}: BehaviorAnalyticsLayoutProps) => {
  return (
    <div className="space-y-6" data-testid="behavior-analytics-dashboard">
      {/* Header */}
      <BehaviorAnalyticsHeader 
        showRealTimeUpdates={showRealTimeUpdates} 
        loading={loading} 
        lastUpdate={lastUpdate} 
      />

      {/* Time Range Selector */}
      <TimeRangeSelector 
        selectedTimeRange={selectedTimeRange} 
        onTimeRangeChange={onTimeRangeChange} 
      />

      {/* Metrics Grid */}
      <MetricsSection 
        summary={summary} 
        trackMetricCardView={trackMetricCardView} 
      />

      {/* Charts Grid */}
      <ChartsSection 
        habitStrengthData={habitStrengthData}
        contextPatternsData={contextPatternsData}
        behaviorFrequencyData={behaviorFrequencyData}
        selectedTimeRange={selectedTimeRange}
        loading={loading}
        error={error}
        onPatternDetails={onPatternDetails}
      />

      {/* Pattern Insights */}
      <PatternsSection 
        patterns={patterns}
        isAnalyzing={isAnalyzing}
        onPatternDetails={onPatternDetails}
        trackPatternInsightView={trackPatternInsightView}
      />
    </div>
  );
};
