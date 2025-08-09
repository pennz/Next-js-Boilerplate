# HealthOverview Component Decomposition

## Overview

The `HealthOverview.tsx` component is a complex dashboard that displays health metrics, goals, and recent records. This document outlines how to decompose this component into smaller, more manageable pieces.

## Current Structure

The component currently includes:
1. StatCard components for displaying metrics
2. RecentRecordItem components for displaying recent health records
3. GoalProgressCard components for displaying health goals
4. QuickActionButton components for quick actions
5. Behavior tracking integration
6. Complex layout and data management

## Proposed Decomposition

### 1. Container Component

**File**: `HealthOverviewContainer.tsx`

This component will handle:
- Data fetching and state management
- Behavior tracking initialization
- Passing data to child components

```tsx
const HealthOverviewContainer = () => {
  const [healthStats, setHealthStats] = useState<HealthStats | null>(null);
  const [recentRecords, setRecentRecords] = useState<HealthRecord[]>([]);
  const [activeGoals, setActiveGoals] = useState<HealthGoal[]>([]);
  
  useEffect(() => {
    // Fetch data
    // Initialize behavior tracking
  }, []);
  
  return (
    <HealthOverviewLayout
      stats={healthStats}
      records={recentRecords}
      goals={activeGoals}
    />
  );
};
```

### 2. Layout Component

**File**: `HealthOverviewLayout.tsx`

This component will handle:
- Overall layout structure
- Responsive design
- Grid organization

```tsx
interface HealthOverviewLayoutProps {
  stats: HealthStats | null;
  records: HealthRecord[];
  goals: HealthGoal[];
}

const HealthOverviewLayout = ({ stats, records, goals }: HealthOverviewLayoutProps) => {
  return (
    <div className="health-overview">
      <StatsSection stats={stats} />
      <RecordsSection records={records} />
      <GoalsSection goals={goals} />
    </div>
  );
};
```

### 3. Stats Section

**File**: `StatsSection.tsx`

This component will handle:
- Display of statistic cards
- Mini-chart visualization

```tsx
interface StatsSectionProps {
  stats: HealthStats | null;
}

const StatsSection = ({ stats }: StatsSectionProps) => {
  return (
    <div className="stats-grid">
      <StatCard 
        title="Total Records" 
        value={stats?.totalRecords} 
        onMiniChartView={handleMiniChartView} 
      />
      <StatCard 
        title="Active Goals" 
        value={stats?.activeGoals} 
        onMiniChartView={handleMiniChartView} 
      />
      <StatCard 
        title="Completed Goals" 
        value={stats?.completedGoals} 
        onMiniChartView={handleMiniChartView} 
      />
      <StatCard 
        title="Weekly Progress" 
        value={stats?.weeklyProgress} 
        onMiniChartView={handleMiniChartView} 
      />
    </div>
  );
};
```

### 4. Records Section

**File**: `RecordsSection.tsx`

This component will handle:
- Display of recent records
- "View All" functionality

```tsx
interface RecordsSectionProps {
  records: HealthRecord[];
}

const RecordsSection = ({ records }: RecordsSectionProps) => {
  return (
    <div className="records-section">
      <div className="section-header">
        <h3>Recent Records</h3>
        <Link href="/health/records">View All</Link>
      </div>
      <div className="records-list">
        {records.map(record => (
          <RecentRecordItem key={record.id} record={record} />
        ))}
      </div>
    </div>
  );
};
```

### 5. Goals Section

**File**: `GoalsSection.tsx`

This component will handle:
- Display of active goals
- Goal progress visualization

```tsx
interface GoalsSectionProps {
  goals: HealthGoal[];
}

const GoalsSection = ({ goals }: GoalsSectionProps) => {
  return (
    <div className="goals-section">
      <div className="section-header">
        <h3>Goal Progress</h3>
        <Link href="/health/goals">View All</Link>
      </div>
      <div className="goals-grid">
        {goals.map(goal => (
          <GoalProgressCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
};
```

### 6. Behavior Tracking Hook

**File**: `useHealthOverviewTracking.ts`

This hook will handle:
- Behavior tracking for the health overview
- Event logging

```tsx
const useHealthOverviewTracking = () => {
  const trackEvent = useBehaviorTracking();
  
  const trackView = useCallback(() => {
    trackEvent({
      eventName: 'health_overview_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'HealthOverview',
          action: 'view'
        }
      }
    });
  }, [trackEvent]);
  
  const trackMiniChartView = useCallback((chartType: string) => {
    trackEvent({
      eventName: 'mini_chart_viewed',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'HealthOverview',
          action: 'view_mini_chart',
          elementType: 'chart',
          elementId: chartType
        }
      }
    });
  }, [trackEvent]);
  
  return {
    trackView,
    trackMiniChartView
  };
};
```

## Benefits of This Decomposition

1. **Separation of Concerns**: Each component has a single responsibility
2. **Reusability**: Components like `StatCard` and `RecentRecordItem` can be reused in other parts of the application
3. **Testability**: Each component can be tested independently
4. **Maintainability**: Changes to one part of the UI don't affect other parts
5. **Performance**: Smaller components can be memoized more effectively
6. **Developer Experience**: Easier to understand and modify individual components

## Implementation Steps

1. Create the new component files
2. Extract logic from the existing `HealthOverview.tsx` component
3. Move behavior tracking to the custom hook
4. Update imports and references
5. Test each component individually
6. Remove the original monolithic component

This decomposition would make the codebase more maintainable and easier to extend in the future.