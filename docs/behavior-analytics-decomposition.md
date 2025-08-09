# BehaviorAnalyticsDashboard Component Decomposition

## Overview

The `BehaviorAnalyticsDashboard.tsx` component is a complex dashboard that displays behavior analytics, metrics, and patterns. This document outlines how to decompose this component into smaller, more manageable pieces.

## Current Structure

The component currently includes:
1. MetricCard components for displaying metrics
2. BehaviorAnalyticsChart components for visualizing data
3. PatternInsightCard components for displaying behavior patterns
4. Real-time indicator and time range selector
5. Data fetching and state management
6. Behavior tracking integration

## Proposed Decomposition

### 1. Container Component

**File**: `BehaviorAnalyticsContainer.tsx`

This component will handle:
- Data fetching and state management
- Behavior tracking initialization
- Passing data to child components

```tsx
const BehaviorAnalyticsContainer = ({ timeRange, behaviorTypes }: BehaviorAnalyticsDashboardProps) => {
  const [analyticsData, setAnalyticsData] = useState<BehaviorAnalyticsSummary | null>(null);
  const [habitStrength, setHabitStrength] = useState<HabitStrengthData[]>([]);
  const [contextPatterns, setContextPatterns] = useState<ContextPattern[]>([]);
  const [frequencyData, setFrequencyData] = useState<BehaviorFrequencyData[]>([]);
  
  useEffect(() => {
    // Fetch data
    // Initialize behavior tracking
    // Set up real-time updates
  }, [timeRange, behaviorTypes]);
  
  return (
    <BehaviorAnalyticsLayout
      summary={analyticsData}
      habitStrength={habitStrength}
      contextPatterns={contextPatterns}
      frequencyData={frequencyData}
    />
  );
};
```

### 2. Layout Component

**File**: `BehaviorAnalyticsLayout.tsx`

This component will handle:
- Overall layout structure
- Responsive design
- Grid organization

```tsx
interface BehaviorAnalyticsLayoutProps {
  summary: BehaviorAnalyticsSummary | null;
  habitStrength: HabitStrengthData[];
  contextPatterns: ContextPattern[];
  frequencyData: BehaviorFrequencyData[];
}

const BehaviorAnalyticsLayout = ({ 
  summary, 
  habitStrength, 
  contextPatterns, 
  frequencyData 
}: BehaviorAnalyticsLayoutProps) => {
  return (
    <div className="behavior-analytics-dashboard">
      <HeaderSection />
      <MetricsSection summary={summary} />
      <ChartsSection 
        habitStrength={habitStrength}
        contextPatterns={contextPatterns}
        frequencyData={frequencyData}
      />
      <PatternsSection />
    </div>
  );
};
```

### 3. Header Section

**File**: `BehaviorAnalyticsHeader.tsx`

This component will handle:
- Dashboard title
- Real-time indicator
- Time range selector
- "View Full Analytics" link

```tsx
const BehaviorAnalyticsHeader = () => {
  return (
    <div className="dashboard-header">
      <div className="header-left">
        <h2>Behavior Analytics</h2>
        <RealtimeIndicator />
      </div>
      <div className="header-right">
        <TimeRangeSelector />
        <Link href="/behavior/analytics/full">View Full Analytics</Link>
      </div>
    </div>
  );
};
```

### 4. Metrics Section

**File**: `MetricsSection.tsx`

This component will handle:
- Display of metric cards
- Grid layout for metrics

```tsx
interface MetricsSectionProps {
  summary: BehaviorAnalyticsSummary | null;
}

const MetricsSection = ({ summary }: MetricsSectionProps) => {
  return (
    <div className="metrics-grid">
      <MetricCard 
        title="Habit Strength" 
        value={summary?.habitStrength} 
        trend={summary?.habitStrengthTrend}
        color="blue"
      />
      <MetricCard 
        title="Active Patterns" 
        value={summary?.activePatterns} 
        color="green"
      />
      <MetricCard 
        title="Consistency" 
        value={summary?.consistency} 
        trend={summary?.consistencyTrend}
        color="purple"
      />
      <MetricCard 
        title="Prediction Accuracy" 
        value={summary?.predictionAccuracy} 
        color="orange"
      />
    </div>
  );
};
```

### 5. Charts Section

**File**: `ChartsSection.tsx`

This component will handle:
- Display of analytics charts
- Grid layout for charts

```tsx
interface ChartsSectionProps {
  habitStrength: HabitStrengthData[];
  contextPatterns: ContextPattern[];
  frequencyData: BehaviorFrequencyData[];
}

const ChartsSection = ({ 
  habitStrength, 
  contextPatterns, 
  frequencyData 
}: ChartsSectionProps) => {
  return (
    <div className="charts-grid">
      <BehaviorAnalyticsChart 
        title="Habit Strength Over Time" 
        data={habitStrength}
        type="line"
      />
      <BehaviorAnalyticsChart 
        title="Context Patterns" 
        data={contextPatterns}
        type="bar"
      />
      <BehaviorAnalyticsChart 
        title="Behavior Frequency" 
        data={frequencyData}
        type="area"
      />
    </div>
  );
};
```

### 6. Patterns Section

**File**: `PatternsSection.tsx`

This component will handle:
- Display of pattern insights
- Loading states

```tsx
const PatternsSection = () => {
  const [patterns, setPatterns] = useState<PatternInsight[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch pattern insights
  }, []);
  
  return (
    <div className="patterns-section">
      <h3>Pattern Insights</h3>
      {loading ? (
        <div className="loading">Loading patterns...</div>
      ) : (
        <div className="patterns-grid">
          {patterns.map(pattern => (
            <PatternInsightCard key={pattern.id} pattern={pattern} />
          ))}
        </div>
      )}
    </div>
  );
};
```

### 7. Time Range Selector

**File**: `TimeRangeSelector.tsx`

This component will handle:
- Time range selection
- Button states

```tsx
interface TimeRangeSelectorProps {
  currentTimeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const TimeRangeSelector = ({ 
  currentTimeRange, 
  onTimeRangeChange 
}: TimeRangeSelectorProps) => {
  const timeRanges: TimeRange[] = ['24h', '7d', '30d', '90d'];
  
  return (
    <div className="time-range-selector">
      {timeRanges.map(range => (
        <button
          key={range}
          className={`time-range-btn ${range === currentTimeRange ? 'active' : ''}`}
          onClick={() => onTimeRangeChange(range)}
        >
          {range}
        </button>
      ))}
    </div>
  );
};
```

### 8. Behavior Tracking Hook

**File**: `useBehaviorAnalyticsTracking.ts`

This hook will handle:
- Behavior tracking for the analytics dashboard
- Event logging

```tsx
const useBehaviorAnalyticsTracking = () => {
  const trackEvent = useBehaviorTracking();
  
  const trackDashboardView = useCallback(() => {
    trackEvent({
      eventName: 'behavior_analytics_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'BehaviorAnalyticsDashboard',
          action: 'view'
        }
      }
    });
  }, [trackEvent]);
  
  const trackPatternDetail = useCallback((patternId: string) => {
    trackEvent({
      eventName: 'pattern_detail_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'BehaviorAnalyticsDashboard',
          action: 'view_pattern_detail',
          elementId: patternId
        }
      }
    });
  }, [trackEvent]);
  
  return {
    trackDashboardView,
    trackPatternDetail
  };
};
```

## Benefits of This Decomposition

1. **Separation of Concerns**: Each component has a single responsibility
2. **Reusability**: Components like `MetricCard` and `BehaviorAnalyticsChart` can be reused in other parts of the application
3. **Testability**: Each component can be tested independently
4. **Maintainability**: Changes to one part of the UI don't affect other parts
5. **Performance**: Smaller components can be memoized more effectively
6. **Developer Experience**: Easier to understand and modify individual components

## Implementation Steps

1. Create the new component files
2. Extract logic from the existing `BehaviorAnalyticsDashboard.tsx` component
3. Move behavior tracking to the custom hook
4. Update imports and references
5. Test each component individually
6. Remove the original monolithic component

This decomposition would make the codebase more maintainable and easier to extend in the future.