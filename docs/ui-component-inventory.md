# UI Component Inventory

## Overview

This document provides a comprehensive catalog of all React components in the Next.js health management application. The components are classified by type, functionality, and usage patterns to help developers understand the architecture and reusability patterns.

*Last updated: 2025-08-14T13:39:41.874Z*
*Generated automatically from source code analysis*

## Component Classification

### Core Components

#### Server Components
Components that render on the server and handle data fetching:

- **Hello** - Component description not available
- **CurrentCount** - Component description not available
- **UseBehaviorAnalyticsTrackingReturn** - Component description not available

#### Client Components
Interactive components marked with `'use client'`:

- **LocaleSwitcher** - Interactive component
- **UseBehaviorAnalyticsTrackingReturn** - Interactive component
- **TimeRangeSelector** - Interactive component
- **PatternsSection** - Interactive component
- **MetricsSection** - Interactive component
- **BehaviorAnalyticsHeader** - Interactive component
- **BehaviorAnalyticsDashboard** - Interactive component
- **BehaviorAnalyticsContainer** - Interactive component
- **PostHogProvider** - Interactive component
- **SuspendedPostHogPageView** - Interactive component

- **Sponsors** - Component description not available
- **DemoBanner** - Component description not available
- **DemoBadge** - Component description not available
- **MockApiResponse** - Component description not available

### Form Components

#### Client Components
Interactive components marked with `'use client'`:

- **CounterForm** - Interactive component

### Health Management

#### Server Components
Components that render on the server and handle data fetching:

- **HealthSummaryCardsWrapper** - Component description not available

#### Client Components
Interactive components marked with `'use client'`:

- **StatsSection** - Interactive component
- **ReminderList** - Interactive component
- **RecordsSection** - Interactive component
- **HealthSummaryCards** - Interactive component
- **HealthRecordsFilters** - Interactive component
- **HealthRecordForm** - Interactive component
- **HealthRadarChart** - Interactive component
- **CustomTooltip** - Interactive component
- **HealthOverviewLayout** - Interactive component
- **HealthOverviewContainer** - Interactive component
- **HealthChart** - Interactive component
- **GoalsSection** - Interactive component
- **GoalCard** - Interactive component
- **AddHealthRecordModal** - Interactive component

- **TrendDirection** - Component description not available

### Exercise Management

#### Client Components
Interactive components marked with `'use client'`:

- **ExerciseOverviewContent** - Interactive component

- **ExerciseOverviewProps** - Component description not available

### Data Visualization

#### Client Components
Interactive components marked with `'use client'`:

- **ChartsSection** - Interactive component
- **BehaviorAnalyticsChart** - Interactive component

### Layout Components

#### Client Components
Interactive components marked with `'use client'`:

- **BehaviorAnalyticsLayout** - Interactive component

## Detailed Component Analysis

### Sponsors

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/Sponsors.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- next/image

---

### LocaleSwitcher (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/LocaleSwitcher.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- react
- next-intl
- next/navigation
- @/libs/I18nNavigation
- @/libs/I18nRouting

**Test Coverage**:
- Test file: `src/components/LocaleSwitcher.test.tsx`
- Test cases: 13

---

### Hello (Server Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/Hello.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- @clerk/nextjs/server
- next-intl/server
- ./Sponsors

---

### DemoBanner

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/DemoBanner.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- next/link

---

### DemoBadge

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/DemoBadge.tsx`

**Props Interface**: None (no props or props not detected)

---

### CurrentCount (Server Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/CurrentCount.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- drizzle-orm
- next-intl/server
- next/headers
- @/libs/DB
- @/libs/Logger
- @/models/Schema

---

### CounterForm (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/CounterForm.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- @hookform/resolvers/zod
- next-intl
- next/navigation
- react-hook-form
- @/validations/CounterValidation

**Test Coverage**:
- Test file: `src/components/CounterForm.test.tsx`
- Test cases: 9

---

### TrendDirection

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/index.ts`

**Props Interface**: None (no props or props not detected)

---

### StatsSection (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/StatsSection.tsx`

**Props Interface**:
```typescript
type StatsSectionProps = {
  stats: HealthStats;
  trackStatCardView: (statType: string, value: string | number) => void;
};
```

**Dependencies**:
- react
- ./HealthOverviewContainer

---

### ReminderList (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/ReminderList.tsx`

**Props Interface**:
```typescript
type ReminderListProps = {
  reminders: HealthReminder[];
  onToggleActive: (id: number, active: boolean) => Promise<void>;
  onEdit: (reminder: HealthReminder) => void;
  onDelete: (id: number) => Promise<void>;
  loading?: boolean;
};
```

**Dependencies**:
- next-intl
- react

**Test Coverage**:
- Test file: `src/components/health/ReminderList.test.tsx`
- Test cases: 77

---

### RecordsSection (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/RecordsSection.tsx`

**Props Interface**:
```typescript
type RecordsSectionProps = {
  recentRecords: HealthRecord[];
  trackRecordView: (record: HealthRecord) => void;
};
```

**Dependencies**:
- next/link
- next-intl
- ./HealthOverviewContainer

---

### HealthSummaryCardsWrapper (Server Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/HealthSummaryCardsWrapper.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- ./HealthOverviewContainer
- @clerk/nextjs/server
- drizzle-orm
- next-intl/server
- @/libs/DB
- @/models/Schema
- @/utils/healthDataTransformers
- ./HealthSummaryCards

---

### HealthSummaryCards (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/HealthSummaryCards.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- ./types
- next-intl
- react
- @/hooks/useBehaviorTracking

**Storybook Stories**:
- **Default** (src/components/health/HealthSummaryCards.stories.tsx)
- **SingleMetric** (src/components/health/HealthSummaryCards.stories.tsx)
- **TrendVariations** (src/components/health/HealthSummaryCards.stories.tsx)
- **MetricsWithGoals** (src/components/health/HealthSummaryCards.stories.tsx)
- **NoTrends** (src/components/health/HealthSummaryCards.stories.tsx)
- **NoGoals** (src/components/health/HealthSummaryCards.stories.tsx)
- **EmptyState** (src/components/health/HealthSummaryCards.stories.tsx)
- **LargeDataset** (src/components/health/HealthSummaryCards.stories.tsx)
- **HighValues** (src/components/health/HealthSummaryCards.stories.tsx)
- **GoalCompletionStates** (src/components/health/HealthSummaryCards.stories.tsx)
- **AccessibilityFocused** (src/components/health/HealthSummaryCards.stories.tsx)
- **CustomStyling** (src/components/health/HealthSummaryCards.stories.tsx)
- **ResponsiveDemo** (src/components/health/HealthSummaryCards.stories.tsx)
- **InteractiveDemo** (src/components/health/HealthSummaryCards.stories.tsx)
- **EdgeCases** (src/components/health/HealthSummaryCards.stories.tsx)
- **LoadingState** (src/components/health/HealthSummaryCards.stories.tsx)
- **MinimalData** (src/components/health/HealthSummaryCards.stories.tsx)

**Test Coverage**:
- Test file: `src/components/health/HealthSummaryCards.test.tsx`
- Test cases: 44

---

### HealthRecordsFilters (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/HealthRecordsFilters.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- react

**Test Coverage**:
- Test file: `src/components/health/HealthRecordsFilters.test.tsx`
- Test cases: 57

---

### HealthRecordForm (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/HealthRecordForm.tsx`

**Props Interface**:
```typescript
type HealthRecordFormProps = {
  initialData?: Partial<{ type_id: number; value: number; unit: string; recorded_at: string; }>;
  onSuccess?: () => void;
  mode?: "create" | "edit";
  recordId?: number;
  healthTypes?: HealthType[];
};
```

**Dependencies**:
- @hookform/resolvers/zod
- next-intl
- next/navigation
- react
- react-hook-form
- zod

**Test Coverage**:
- Test file: `src/components/health/HealthRecordForm.test.tsx`
- Test cases: 22

---

### HealthRadarChart (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/HealthRadarChart.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- ./types
- next-intl
- react
- recharts
- @/hooks/useBehaviorTracking
- @/utils/healthScoring

**Storybook Stories**:
- **Default** (src/components/health/HealthRadarChart.stories.tsx)
- **PercentageScoring** (src/components/health/HealthRadarChart.stories.tsx)
- **ZScoreNormalization** (src/components/health/HealthRadarChart.stories.tsx)
- **CustomScoring** (src/components/health/HealthRadarChart.stories.tsx)
- **ExcellentHealthProfile** (src/components/health/HealthRadarChart.stories.tsx)
- **PoorHealthProfile** (src/components/health/HealthRadarChart.stories.tsx)
- **MixedHealthProfile** (src/components/health/HealthRadarChart.stories.tsx)
- **SmallSize** (src/components/health/HealthRadarChart.stories.tsx)
- **MediumSize** (src/components/health/HealthRadarChart.stories.tsx)
- **LargeSize** (src/components/health/HealthRadarChart.stories.tsx)
- **DefaultColorScheme** (src/components/health/HealthRadarChart.stories.tsx)
- **BlueColorScheme** (src/components/health/HealthRadarChart.stories.tsx)
- **PurpleColorScheme** (src/components/health/HealthRadarChart.stories.tsx)
- **ThreeMetrics** (src/components/health/HealthRadarChart.stories.tsx)
- **FiveMetrics** (src/components/health/HealthRadarChart.stories.tsx)
- **SevenMetrics** (src/components/health/HealthRadarChart.stories.tsx)
- **EmptyData** (src/components/health/HealthRadarChart.stories.tsx)
- **InsufficientData** (src/components/health/HealthRadarChart.stories.tsx)
- **LoadingState** (src/components/health/HealthRadarChart.stories.tsx)
- **ErrorState** (src/components/health/HealthRadarChart.stories.tsx)
- **AccessibilityFocused** (src/components/health/HealthRadarChart.stories.tsx)
- **ResponsiveDemo** (src/components/health/HealthRadarChart.stories.tsx)
- **AdvancedConfiguration** (src/components/health/HealthRadarChart.stories.tsx)
- **InteractiveDemo** (src/components/health/HealthRadarChart.stories.tsx)
- **ComparisonDemo** (src/components/health/HealthRadarChart.stories.tsx)
- **CustomTooltipDemo** (src/components/health/HealthRadarChart.stories.tsx)

**Test Coverage**:
- Test file: `src/components/health/HealthRadarChart.test.tsx`
- Test cases: 45

---

### CustomTooltip (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/HealthPredictiveChart.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- ./types
- next-intl
- react
- recharts
- @/hooks/useBehaviorTracking
- @/utils/statistics

---

### HealthOverviewLayout (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/HealthOverviewLayout.tsx`

**Props Interface**:
```typescript
type HealthOverviewLayoutProps = {
  recentRecords: HealthRecord[];
  activeGoals: HealthGoal[];
  stats: HealthStats;
};
```

**Dependencies**:
- react
- next/link
- @clerk/nextjs
- next-intl
- ./useHealthOverviewTracking
- ./StatsSection
- ./RecordsSection
- ./GoalsSection
- ./HealthOverviewContainer

---

### HealthOverviewContainer (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/HealthOverviewContainer.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- react
- @clerk/nextjs
- next-intl
- ./HealthOverviewLayout

---

### HealthChart (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/HealthChart.tsx`

**Props Interface**:
```typescript
type HealthChartProps = {
  data: HealthDataPoint[];
  chartType?: "line" | "bar" | "area";
  title?: string;
  height?: number;
  width?: string;
  color?: string;
  secondaryColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showBrush?: boolean;
  enableZoom?: boolean;
  goalValue?: number;
  loading?: boolean;
  error?: string;
  className?: string;
  dataKey?: string;
  xAxisKey?: string;
  unit?: string;
  formatTooltip?: (value: number, name: string) => [string, string];
  formatXAxis?: (value: string) => string;
  formatYAxis?: (value: number) => string;
};
```

**Dependencies**:
- next-intl
- recharts

**Storybook Stories**:
- **Default** (src/components/health/HealthChart.stories.tsx)
- **WeightTrendLine** (src/components/health/HealthChart.stories.tsx)
- **StepsBarChart** (src/components/health/HealthChart.stories.tsx)
- **WeightAreaChart** (src/components/health/HealthChart.stories.tsx)
- **EmptyData** (src/components/health/HealthChart.stories.tsx)
- **SingleDataPoint** (src/components/health/HealthChart.stories.tsx)
- **LargeDataset** (src/components/health/HealthChart.stories.tsx)
- **MultiSeriesChart** (src/components/health/HealthChart.stories.tsx)
- **LoadingState** (src/components/health/HealthChart.stories.tsx)
- **ErrorState** (src/components/health/HealthChart.stories.tsx)
- **AccessibilityFocused** (src/components/health/HealthChart.stories.tsx)
- **CustomStyling** (src/components/health/HealthChart.stories.tsx)
- **CompactSize** (src/components/health/HealthChart.stories.tsx)
- **ResponsiveDemo** (src/components/health/HealthChart.stories.tsx)
- **InteractiveDemo** (src/components/health/HealthChart.stories.tsx)

**Test Coverage**:
- Test file: `tests/visual/HealthCharts.visual.test.ts`
- Test cases: 75

---

### GoalsSection (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/GoalsSection.tsx`

**Props Interface**:
```typescript
type GoalsSectionProps = {
  activeGoals: HealthGoal[];
  trackGoalProgressView: (goal: HealthGoal) => void;
};
```

**Dependencies**:
- next/link
- next-intl
- ./HealthOverviewContainer

---

### GoalCard (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/GoalCard.tsx`

**Props Interface**:
```typescript
type GoalCardProps = {
  goal: HealthGoal;
  onEdit?: (goal: HealthGoal) => void;
  onDelete?: (goalId: number) => void;
  onStatusChange?: (goalId: number, status: "active" | "completed" | "paused") => void;
  className?: string;
};
```

**Dependencies**:
- next-intl
- react

---

### AddHealthRecordModal (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/health/AddHealthRecordModal.tsx`

**Props Interface**:
```typescript
type AddHealthRecordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};
```

**Dependencies**:
- next-intl
- react
- ./HealthRecordForm

**Test Coverage**:
- Test file: `src/components/health/AddHealthRecordModal.test.tsx`
- Test cases: 46

---

### ExerciseOverviewProps

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/exercise/index.ts`

**Props Interface**: None (no props or props not detected)

---

### ExerciseOverviewContent (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/exercise/ExerciseOverview.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- next/link
- react
- next-intl
- @/hooks/useBehaviorTracking

---

### UseBehaviorAnalyticsTrackingReturn (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/behavioral/useBehaviorAnalyticsTracking.ts`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- react
- @/hooks/useBehaviorTracking

---

### UseBehaviorAnalyticsTrackingReturn (Server Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/behavioral/index.ts`

**Props Interface**: None (no props or props not detected)

---

### TimeRangeSelector (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/behavioral/TimeRangeSelector.tsx`

**Props Interface**:
```typescript
type TimeRangeSelectorProps = {
  selectedTimeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
};
```

---

### PatternsSection (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/behavioral/PatternsSection.tsx`

**Props Interface**:
```typescript
type PatternsSectionProps = {
  patterns: any[];
  isAnalyzing: boolean;
  onPatternDetails: (pattern: any) => void;
  trackPatternInsightView: (pattern: any) => Promise<void>;
};
```

**Dependencies**:
- next/link

---

### MetricsSection (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/behavioral/MetricsSection.tsx`

**Props Interface**:
```typescript
type MetricsSectionProps = {
  summary: BehaviorAnalyticsSummary | null;
  trackMetricCardView: (title: string, value: string | number, trend?: "up" | "down" | "stable" | undefined) => Promise<void>;
};
```

**Dependencies**:
- ./BehaviorAnalyticsLayout

---

### ChartsSection (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/behavioral/ChartsSection.tsx`

**Props Interface**:
```typescript
type ChartsSectionProps = {
  habitStrengthData: HabitStrengthData[];
  contextPatternsData: ContextPatternData[];
  behaviorFrequencyData: BehaviorDataPoint[];
  selectedTimeRange: "7d" | "30d" | "90d" | "1y";
  loading: boolean;
  error: string | null;
  onPatternDetails: (pattern: any) => void;
};
```

**Dependencies**:
- ./BehaviorAnalyticsChart
- ./BehaviorAnalyticsChart

---

### BehaviorAnalyticsLayout (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/behavioral/BehaviorAnalyticsLayout.tsx`

**Props Interface**:
```typescript
type BehaviorAnalyticsLayoutProps = {
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
  selectedTimeRange: "7d" | "30d" | "90d" | "1y";
  showRealTimeUpdates: boolean;
  onTimeRangeChange: (range: "7d" | "30d" | "90d" | "1y") => void;
  onPatternDetails: (pattern: any) => void;
  trackMetricCardView: (title: string, value: string | number, trend?: "up" | "down" | "stable" | undefined) => Promise<void>;
  trackPatternInsightView: (pattern: any) => Promise<void>;
};
```

**Dependencies**:
- ./BehaviorAnalyticsChart
- ./BehaviorAnalyticsHeader
- ./MetricsSection
- ./ChartsSection
- ./PatternsSection
- ./TimeRangeSelector

---

### BehaviorAnalyticsHeader (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/behavioral/BehaviorAnalyticsHeader.tsx`

**Props Interface**:
```typescript
type BehaviorAnalyticsHeaderProps = {
  showRealTimeUpdates: boolean;
  loading: boolean;
  lastUpdate: Date | null;
};
```

**Dependencies**:
- next/link

---

### BehaviorAnalyticsDashboard (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/behavioral/BehaviorAnalyticsDashboard.tsx`

**Props Interface**:
```typescript
type BehaviorAnalyticsDashboardProps = {
  timeRange?: "7d" | "30d" | "90d" | "1y";
  behaviorTypes?: string[];
  refreshInterval?: number;
  showRealTimeUpdates?: boolean;
};
```

**Dependencies**:
- ./BehaviorAnalyticsChart
- @clerk/nextjs
- next/link
- react
- @/hooks/useBehaviorTracking
- @/hooks/useMicroBehavior
- ./BehaviorAnalyticsChart

**Storybook Stories**:
- **Default** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **EmptyDashboard** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **LoadingDashboard** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **ErrorDashboard** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **RichData** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **MinimalData** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **PartialData** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **RecentUser** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **RealTimeEnabled** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **RealTimeDisabled** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **RealtimeWithUpdates** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **OfflineMode** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **SevenDayView** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **MonthlyView** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **QuarterlyView** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **YearlyView** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **AuthenticatedUser** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **UnauthenticatedUser** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **UserLoading** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **HighPerformance** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **LowPerformance** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **MixedPerformance** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **TrendVariations** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **ManyPatterns** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **FewPatterns** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **NoPatterns** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **AnalyzingPatterns** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **StrongPatterns** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **WeakPatterns** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **AllChartsLoaded** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **ChartErrors** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **ChartLoading** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **InteractiveCharts** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **MobileLayout** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **TabletLayout** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **DesktopLayout** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **WideScreen** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **HighContrast** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **KeyboardNavigation** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **ScreenReaderOptimized** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **ReducedMotion** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **LargeDataset** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **SlowNetwork** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **MemoryStress** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **ConcurrentUpdates** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **NetworkError** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **APIError** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **PartialFailure** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **TimeoutError** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **CustomTimeRange** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **FilteredBehaviors** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **CustomRefreshInterval** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **BrandedStyling** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)
- **InteractiveDemo** (src/components/behavioral/BehaviorAnalyticsDashboard.stories.tsx)

**Test Coverage**:
- Test file: `src/components/behavioral/BehaviorAnalyticsDashboard.test.tsx`
- Test cases: 52

---

### BehaviorAnalyticsContainer (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/behavioral/BehaviorAnalyticsContainer.tsx`

**Props Interface**:
```typescript
type BehaviorAnalyticsContainerProps = {
  timeRange?: "7d" | "30d" | "90d" | "1y";
  behaviorTypes?: string[];
  refreshInterval?: number;
  showRealTimeUpdates?: boolean;
};
```

**Dependencies**:
- react
- @clerk/nextjs
- @/hooks/useMicroBehavior
- ./BehaviorAnalyticsLayout

---

### BehaviorAnalyticsChart (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/behavioral/BehaviorAnalyticsChart.tsx`

**Props Interface**:
```typescript
type BehaviorAnalyticsChartProps = {
  data: HabitStrengthData[] | ContextPatternData[] | BehaviorDataPoint[];
  chartType?: "behavior_frequency" | "habit_strength" | "context_patterns" | "consistency_trends";
  title?: string;
  height?: number;
  width?: string;
  loading?: boolean;
  error?: string;
  className?: string;
  timeRange?: "7d" | "30d" | "90d" | "1y";
  behaviorType?: string;
  showPrediction?: boolean;
  showConfidenceInterval?: boolean;
  onDataPointClick?: (data: any) => void;
};
```

**Dependencies**:
- next-intl
- recharts

**Storybook Stories**:
- **Default** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **HabitStrengthChart** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **ContextPatternsChart** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **ConsistencyTrendsChart** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **EmptyData** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **SingleDataPoint** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **LargeDataset** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **RichData** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **MinimalData** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **LoadingState** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **ErrorState** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **LoadingWithTitle** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **ErrorWithRetry** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **ClickableElements** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **TooltipDemo** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **HoverStates** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **KeyboardNavigation** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **CustomStyling** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **CompactSize** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **LargeSize** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **NoGrid** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **WithBehaviorType** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **SevenDayRange** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **ThirtyDayRange** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **NinetyDayRange** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **YearlyRange** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **WithPrediction** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **WithConfidenceInterval** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **PredictiveAnalysis** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **RealTimeData** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **HighContrast** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **ScreenReaderOptimized** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **KeyboardOnly** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **ColorBlindFriendly** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **MobileView** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **TabletView** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **DesktopView** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **ResponsiveDemo** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **ExtremeValues** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **LongContextNames** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **MixedDataTypes** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **CorruptedData** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **HighFrequencyUpdates** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **MemoryStress** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **ConcurrentCharts** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)
- **InteractiveDemo** (src/components/behavioral/BehaviorAnalyticsChart.stories.tsx)

**Test Coverage**:
- Test file: `src/components/behavioral/BehaviorAnalyticsChart.test.tsx`
- Test cases: 41

---

### MockApiResponse

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/behavioral/BehaviorAnalyticsChart.fixtures.ts`

**Props Interface**: None (no props or props not detected)

---

### PostHogProvider (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/analytics/PostHogProvider.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- posthog-js
- posthog-js/react
- react
- @/libs/Env
- ./PostHogPageView

**Test Coverage**:
- Test file: `src/components/analytics/PostHogProvider.test.tsx`
- Test cases: 8

---

### SuspendedPostHogPageView (Client Component)

**File**: `/Users/v/works/Next-js-Boilerplate/src/components/analytics/PostHogPageView.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- next/navigation
- posthog-js/react
- react

---

## Component Statistics

- **Total Components**: 39
- **Server Components**: 4
- **Client Components**: 29
- **Components with Props**: 18
- **Components with Stories**: 5
- **Components with Tests**: 12

## Props Analysis

### Common Prop Types
- `"7d" | "30d" | "90d" | "1y"`: 5 occurrences
- `"behavior_frequency" | "habit_strength" | "context_patterns" | "consistency_trends"`: 1 occurrences
- `"create" | "edit"`: 1 occurrences
- `"line" | "bar" | "area"`: 1 occurrences
- `() => void`: 3 occurrences
- `(data: any) => void`: 1 occurrences
- `(goal: HealthGoal) => void`: 2 occurrences
- `(goalId: number) => void`: 1 occurrences
- `(goalId: number, status: "active" | "completed" | "paused") => void`: 1 occurrences
- `(id: number) => Promise<void>`: 1 occurrences
- `(id: number, active: boolean) => Promise<void>`: 1 occurrences
- `(pattern: any) => Promise<void>`: 2 occurrences
- `(pattern: any) => void`: 3 occurrences
- `(range: "7d" | "30d" | "90d" | "1y") => void`: 1 occurrences
- `(range: TimeRange) => void`: 1 occurrences
- `(record: HealthRecord) => void`: 1 occurrences
- `(reminder: HealthReminder) => void`: 1 occurrences
- `(statType: string, value: string | number) => void`: 1 occurrences
- `(title: string, value: string | number, trend?: "up" | "down" | "stable" | undefined) => Promise<void>`: 2 occurrences
- `(value: number) => string`: 1 occurrences
- `(value: number, name: string) => [string, string]`: 1 occurrences
- `(value: string) => string`: 1 occurrences
- `BehaviorAnalyticsSummary | null`: 2 occurrences
- `BehaviorDataPoint[]`: 2 occurrences
- `ContextPatternData[]`: 2 occurrences
- `Date | null`: 2 occurrences
- `HabitStrengthData[]`: 2 occurrences
- `HabitStrengthData[] | ContextPatternData[] | BehaviorDataPoint[]`: 1 occurrences
- `HealthDataPoint[]`: 1 occurrences
- `HealthGoal`: 1 occurrences
- `HealthGoal[]`: 2 occurrences
- `HealthRecord[]`: 2 occurrences
- `HealthReminder[]`: 1 occurrences
- `HealthStats`: 2 occurrences
- `HealthType[]`: 1 occurrences
- `Partial<{ type_id: number; value: number; unit: string; recorded_at: string; }>`: 1 occurrences
- `TimeRange`: 1 occurrences
- `any[]`: 3 occurrences
- `boolean`: 19 occurrences
- `number`: 6 occurrences
- `string`: 15 occurrences
- `string | null`: 2 occurrences
- `string[]`: 2 occurrences

## Dependency Analysis

### External Dependencies
- `@/hooks/useBehaviorTracking`: used by 6 components
- `@/hooks/useMicroBehavior`: used by 2 components
- `@/libs/DB`: used by 2 components
- `@/libs/Env`: used by 1 components
- `@/libs/I18nNavigation`: used by 1 components
- `@/libs/I18nRouting`: used by 1 components
- `@/libs/Logger`: used by 1 components
- `@/models/Schema`: used by 2 components
- `@/utils/healthDataTransformers`: used by 1 components
- `@/utils/healthScoring`: used by 1 components
- `@/utils/statistics`: used by 1 components
- `@/validations/CounterValidation`: used by 1 components
- `@clerk/nextjs`: used by 4 components
- `@clerk/nextjs/server`: used by 2 components
- `@hookform/resolvers/zod`: used by 2 components
- `drizzle-orm`: used by 2 components
- `next-intl`: used by 16 components
- `next-intl/server`: used by 3 components
- `next/headers`: used by 1 components
- `next/image`: used by 1 components
- `next/link`: used by 8 components
- `next/navigation`: used by 4 components
- `posthog-js`: used by 1 components
- `posthog-js/react`: used by 2 components
- `react`: used by 18 components
- `react-hook-form`: used by 2 components
- `recharts`: used by 4 components
- `zod`: used by 1 components

### Internal Dependencies
- `./BehaviorAnalyticsChart`: used by 5 components
- `./BehaviorAnalyticsHeader`: used by 1 components
- `./BehaviorAnalyticsLayout`: used by 2 components
- `./ChartsSection`: used by 1 components
- `./GoalsSection`: used by 1 components
- `./HealthOverviewContainer`: used by 5 components
- `./HealthOverviewLayout`: used by 1 components
- `./HealthRecordForm`: used by 1 components
- `./HealthSummaryCards`: used by 1 components
- `./MetricsSection`: used by 1 components
- `./PatternsSection`: used by 1 components
- `./PostHogPageView`: used by 1 components
- `./RecordsSection`: used by 1 components
- `./Sponsors`: used by 1 components
- `./StatsSection`: used by 1 components
- `./TimeRangeSelector`: used by 1 components
- `./types`: used by 3 components
- `./useHealthOverviewTracking`: used by 1 components

