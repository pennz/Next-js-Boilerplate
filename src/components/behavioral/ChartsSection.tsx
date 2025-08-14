'use client';

import type { BehaviorDataPoint, ContextPatternData, HabitStrengthData } from './BehaviorAnalyticsChart';
import { BehaviorAnalyticsChart } from './BehaviorAnalyticsChart';

type ChartsSectionProps = {
  habitStrengthData: HabitStrengthData[];
  contextPatternsData: ContextPatternData[];
  behaviorFrequencyData: BehaviorDataPoint[];
  selectedTimeRange: '7d' | '30d' | '90d' | '1y';
  loading: boolean;
  error: string | null;
  onPatternDetails: (pattern: any) => void;
};

export const ChartsSection = ({
  habitStrengthData,
  contextPatternsData,
  behaviorFrequencyData,
  selectedTimeRange,
  loading,
  error,
  onPatternDetails,
}: ChartsSectionProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BehaviorAnalyticsChart
        data={habitStrengthData}
        chartType="habit_strength"
        title="Habit Strength Over Time"
        timeRange={selectedTimeRange}
        loading={loading}
        error={error}
        showPrediction={true}
        className="col-span-1 lg:col-span-2"
        height={350}
      />

      <BehaviorAnalyticsChart
        data={contextPatternsData}
        chartType="context_patterns"
        title="Context Success Patterns"
        timeRange={selectedTimeRange}
        loading={loading}
        error={error}
        onDataPointClick={onPatternDetails}
      />

      <BehaviorAnalyticsChart
        data={behaviorFrequencyData}
        chartType="behavior_frequency"
        title="Behavior Frequency Trends"
        timeRange={selectedTimeRange}
        loading={loading}
        error={error}
      />
    </div>
  );
};