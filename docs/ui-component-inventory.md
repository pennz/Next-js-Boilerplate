# UI Component Inventory

## Overview

This document provides a comprehensive catalog of all React components in the Next.js health management application. The components are classified by type, functionality, and usage patterns to help developers understand the architecture and reusability patterns.

*Last updated: 2025-08-17T03:23:23.902Z*
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
- **TechStack** - Interactive component
- **Hero** - Interactive component
- **FeatureGrid** - Interactive component
- **CTASection** - Interactive component
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
- **TechStack** - Component description not available
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

- **UnifiedInsightsSection** - Interactive component
- **UnifiedAnalyticsInsights** - Interactive component
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
- **HealthAnalyticsLayout** - Interactive component
- **HealthAnalyticsContainer** - Interactive component
- **GoalsSection** - Interactive component
- **GoalCard** - Interactive component
- **ExerciseAnalyticsSection** - Interactive component
- **AddHealthRecordModal** - Interactive component

- **ExerciseAnalyticsData** - Component description not available

### Exercise Management

#### Client Components
Interactive components marked with `'use client'`:

- **ExerciseOverview** - Interactive component

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/Sponsors.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- next/image

---

### LocaleSwitcher (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/LocaleSwitcher.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/Hello.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- @clerk/nextjs/server
- next-intl/server
- ./Sponsors

---

### DemoBanner

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/DemoBanner.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- next/link

---

### DemoBadge

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/DemoBadge.tsx`

**Props Interface**: None (no props or props not detected)

---

### CurrentCount (Server Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/CurrentCount.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/CounterForm.tsx`

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

### TechStack

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/marketing/index.ts`

**Props Interface**: None (no props or props not detected)

---

### TechStack (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/marketing/TechStack.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- next-intl

---

### Hero (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/marketing/Hero.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- next-intl
- next/image
- next/link
- react-icons/fa

**Storybook Stories**:
- **Default** (src/components/marketing/Hero.stories.tsx)
- **English** (src/components/marketing/Hero.stories.tsx)
- **French** (src/components/marketing/Hero.stories.tsx)
- **Chinese** (src/components/marketing/Hero.stories.tsx)
- **Mobile** (src/components/marketing/Hero.stories.tsx)
- **Tablet** (src/components/marketing/Hero.stories.tsx)
- **Desktop** (src/components/marketing/Hero.stories.tsx)
- **WideDesktop** (src/components/marketing/Hero.stories.tsx)
- **DarkMode** (src/components/marketing/Hero.stories.tsx)
- **FrenchMobile** (src/components/marketing/Hero.stories.tsx)
- **ChineseTablet** (src/components/marketing/Hero.stories.tsx)
- **AccessibilityFocus** (src/components/marketing/Hero.stories.tsx)
- **PerformanceTest** (src/components/marketing/Hero.stories.tsx)
- **Interactive** (src/components/marketing/Hero.stories.tsx)
- **LocaleComparison** (src/components/marketing/Hero.stories.tsx)

**Test Coverage**:
- Test file: `src/components/marketing/Hero.test.tsx`
- Test cases: 13

---

### FeatureGrid (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/marketing/FeatureGrid.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- @heroicons/react/24/outline
- next-intl
- next/image

**Storybook Stories**:
- **Default** (src/components/marketing/FeatureGrid.stories.tsx)
- **English** (src/components/marketing/FeatureGrid.stories.tsx)
- **French** (src/components/marketing/FeatureGrid.stories.tsx)
- **Chinese** (src/components/marketing/FeatureGrid.stories.tsx)
- **Mobile** (src/components/marketing/FeatureGrid.stories.tsx)
- **Tablet** (src/components/marketing/FeatureGrid.stories.tsx)
- **Desktop** (src/components/marketing/FeatureGrid.stories.tsx)
- **DarkBackground** (src/components/marketing/FeatureGrid.stories.tsx)
- **CompactSpacing** (src/components/marketing/FeatureGrid.stories.tsx)
- **FeatureShowcase** (src/components/marketing/FeatureGrid.stories.tsx)
- **AccessibilityFocus** (src/components/marketing/FeatureGrid.stories.tsx)
- **LoadingState** (src/components/marketing/FeatureGrid.stories.tsx)
- **InteractiveStates** (src/components/marketing/FeatureGrid.stories.tsx)

**Test Coverage**:
- Test file: `src/components/marketing/FeatureGrid.test.tsx`
- Test cases: 24

---

### CTASection (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/marketing/CTASection.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- next-intl
- next/link

---

### ExerciseAnalyticsData

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/index.ts`

**Props Interface**: None (no props or props not detected)

---

### UnifiedInsightsSection (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/UnifiedInsightsSection.tsx`

**Props Interface**:
```typescript
type UnifiedInsightsSectionProps = {
  healthData: { summaryMetrics: HealthSummaryMetric[]; predictiveData: PredictedDataPoint[]; radarData: RadarChartData[]; insights: any[]; };
  behaviorData: { summary: any; habitStrengthData: HabitStrengthData[]; contextPatternsData: ContextPatternData[]; behaviorFrequencyData: BehaviorDataPoint[]; patterns: any[]; insights: any[]; };
  exerciseData: { stats: any; recentLogs: ExerciseLog[]; activePlans: TrainingPlan[]; progressData: ExerciseProgressData[]; };
  onInsightView?: (insight: any) => void;
  onPatternDetails?: (pattern: any) => void;
  trackInsightView?: (insight: any) => Promise<void>;
  trackPatternInsightView?: (pattern: any) => Promise<void>;
  trackChartView?: (chartType: string, metric?: string | undefined) => Promise<void>;
};
```

**Dependencies**:
- next-intl
- @/components/ui/card
- @/components/ui/badge
- @/components/ui/button
- @/components/ui/progress
- @/types/health

---

### UnifiedAnalyticsInsights (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/UnifiedAnalyticsInsights.tsx`

**Props Interface**:
```typescript
type UnifiedAnalyticsInsightsProps = {
  healthMetrics: HealthSummaryMetric[];
  healthRadarData: RadarChartData[];
  behaviorSummary: BehaviorAnalyticsSummary | null;
  habitStrengthData: HabitStrengthData[];
  contextPatternsData: ContextPatternData[];
  exerciseStats: ExerciseStats;
  recentExerciseLogs: ExerciseLog[];
  loading?: boolean;
  error?: string | null;
  onInsightClick?: (insight: CrossDomainInsight) => void;
  onCategorySelect?: (category: string) => void;
  trackInsightView?: (insight: CrossDomainInsight) => Promise<void>;
  trackCorrelationAnalysis?: (correlation: any) => Promise<void>;
};
```

**Dependencies**:
- next-intl
- react
- @/hooks/useBehaviorTracking
- @/types/health
- ../behavioral/BehaviorAnalyticsLayout

---

### StatsSection (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/StatsSection.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/ReminderList.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/RecordsSection.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/HealthSummaryCardsWrapper.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/HealthSummaryCards.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/HealthRecordsFilters.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- react

**Test Coverage**:
- Test file: `src/components/health/HealthRecordsFilters.test.tsx`
- Test cases: 57

---

### HealthRecordForm (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/HealthRecordForm.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/HealthRadarChart.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/HealthPredictiveChart.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/HealthOverviewLayout.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/HealthOverviewContainer.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- react
- @clerk/nextjs
- next-intl
- ./HealthOverviewLayout

---

### HealthChart (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/HealthChart.tsx`

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

### HealthAnalyticsLayout (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/HealthAnalyticsLayout.tsx`

**Props Interface**:
```typescript
type HealthAnalyticsLayoutProps = {
  summaryMetrics: HealthSummaryMetric[];
  predictiveData: PredictedDataPoint[];
  radarData: RadarChartData[];
  insights?: any[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  selectedMetric?: string;
  behaviorSummary?: BehaviorAnalyticsSummary | null;
  habitStrengthData?: HabitStrengthData[];
  contextPatternsData?: ContextPatternData[];
  behaviorFrequencyData?: BehaviorDataPoint[];
  behaviorPatterns?: any[];
  behaviorInsights?: any[];
  exerciseStats?: ExerciseStats;
  recentExerciseLogs?: ExerciseLog[];
  activeTrainingPlans?: TrainingPlan[];
  exerciseProgressData?: ExerciseProgressData[];
  activeView?: AnalyticsView;
  onViewChange?: (view: AnalyticsView) => void;
  onMetricSelect?: (metric: string) => void;
  onRetry?: () => void;
  onInsightView?: (insight: any) => void;
  onPatternDetails?: (pattern: any) => void;
  trackMetricCardView?: (title: string, value: string | number, trend?: "up" | "down" | "stable" | undefined) => Promise<void>;
  trackChartView?: (chartType: string, metric?: string | undefined) => Promise<void>;
  trackInsightView?: (insight: any) => Promise<void>;
  trackPatternInsightView?: (pattern: any) => Promise<void>;
  trackViewChange?: (view: AnalyticsView) => Promise<void>;
};
```

**Dependencies**:
- next-intl
- @/types/health
- ./HealthSummaryCards
- ./HealthPredictiveChart
- ./HealthRadarChart
- ../behavioral/BehaviorAnalyticsChart
- ./UnifiedInsightsSection
- ./ExerciseAnalyticsSection
- ../behavioral/BehaviorAnalyticsLayout

---

### HealthAnalyticsContainer (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/HealthAnalyticsContainer.tsx`

**Props Interface**:
```typescript
type HealthAnalyticsContainerProps = {
  timeRange?: "7d" | "30d" | "90d" | "1y";
  refreshInterval?: number;
  showRealTimeUpdates?: boolean;
  defaultView?: AnalyticsView;
};
```

**Dependencies**:
- react
- @clerk/nextjs
- next-intl
- next/navigation
- @/hooks/useBehaviorTracking
- ./HealthAnalyticsLayout
- @/utils/healthDataTransformers
- @/components/health/types
- ./HealthOverviewContainer
- @/components/behavioral/BehaviorAnalyticsContainer

---

### GoalsSection (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/GoalsSection.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/GoalCard.tsx`

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

### ExerciseAnalyticsSection (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/ExerciseAnalyticsSection.tsx`

**Props Interface**:
```typescript
type ExerciseAnalyticsSectionProps = {
  exerciseStats: ExerciseStats;
  recentLogs: ExerciseLog[];
  activeTrainingPlans: TrainingPlan[];
  progressData: ExerciseProgressData;
  goals?: ExerciseGoal[];
  loading?: boolean;
  error?: string | null;
  onNavigateToDetails?: (section: string) => void;
  onGoalClick?: (goal: ExerciseGoal) => void;
  onLogClick?: (log: ExerciseLog) => void;
  onPlanClick?: (plan: TrainingPlan) => void;
  stats: ExerciseStats;
  recentLogs: ExerciseLog[];
  activePlans: TrainingPlan[];
  progressData: ExerciseProgressData[];
  trackChartView?: (chartType: string, metric?: string | undefined) => Promise<void>;
  trackInsightView?: (insight: any) => Promise<void>;
  onAction?: (action: string, ...args: any[]) => void;
};
```

**Dependencies**:
- next-intl
- react
- @/hooks/useBehaviorTracking
- ./HealthChart

---

### AddHealthRecordModal (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/health/AddHealthRecordModal.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/exercise/index.ts`

**Props Interface**: None (no props or props not detected)

---

### ExerciseOverview (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/exercise/ExerciseOverview.tsx`

**Props Interface**:
```typescript
type ExerciseOverviewProps = {
  recentLogs: ExerciseLog[];
  activeTrainingPlans: TrainingPlan[];
  stats: ExerciseStats;
  onAction?: (action: string) => void;
};
```

**Dependencies**:
- next-intl
- @/hooks/useBehaviorTracking
- @/components/ui/card
- @/components/ui/button
- @/components/ui/badge
- @/components/ui/progress
- date-fns
- @/types/exercise

**Storybook Stories**:
- **Default** (src/components/exercise/ExerciseOverview.stories.tsx)
- **EmptyState** (src/components/exercise/ExerciseOverview.stories.tsx)
- **SingleItems** (src/components/exercise/ExerciseOverview.stories.tsx)
- **RichData** (src/components/exercise/ExerciseOverview.stories.tsx)
- **DifferentDifficultyLevels** (src/components/exercise/ExerciseOverview.stories.tsx)
- **VariousTrends** (src/components/exercise/ExerciseOverview.stories.tsx)
- **TimeVariations** (src/components/exercise/ExerciseOverview.stories.tsx)
- **ClickableElements** (src/components/exercise/ExerciseOverview.stories.tsx)
- **KeyboardNavigation** (src/components/exercise/ExerciseOverview.stories.tsx)
- **ResponsiveLayout** (src/components/exercise/ExerciseOverview.stories.tsx)
- **LongTextContent** (src/components/exercise/ExerciseOverview.stories.tsx)
- **LargeNumbers** (src/components/exercise/ExerciseOverview.stories.tsx)
- **MissingData** (src/components/exercise/ExerciseOverview.stories.tsx)
- **ErrorStates** (src/components/exercise/ExerciseOverview.stories.tsx)
- **HighContrast** (src/components/exercise/ExerciseOverview.stories.tsx)
- **ScreenReader** (src/components/exercise/ExerciseOverview.stories.tsx)
- **KeyboardOnly** (src/components/exercise/ExerciseOverview.stories.tsx)
- **LoadingState** (src/components/exercise/ExerciseOverview.stories.tsx)
- **MixedActiveInactivePlans** (src/components/exercise/ExerciseOverview.stories.tsx)
- **RecentWorkoutsOnly** (src/components/exercise/ExerciseOverview.stories.tsx)
- **PlansOnlyNoWorkouts** (src/components/exercise/ExerciseOverview.stories.tsx)
- **InteractiveDemo** (src/components/exercise/ExerciseOverview.stories.tsx)
- **PerformanceTest** (src/components/exercise/ExerciseOverview.stories.tsx)

**Test Coverage**:
- Test file: `tests/visual/ExerciseOverview.visual.test.ts`
- Test cases: 63
- Test file: `src/components/exercise/ExerciseOverview.test.tsx`
- Test cases: 61
- Test file: `src/components/exercise/ExerciseOverview.integration.test.tsx`
- Test cases: 45

---

### UseBehaviorAnalyticsTrackingReturn (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/behavioral/useBehaviorAnalyticsTracking.ts`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- react
- @/hooks/useBehaviorTracking

---

### UseBehaviorAnalyticsTrackingReturn (Server Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/behavioral/index.ts`

**Props Interface**: None (no props or props not detected)

---

### TimeRangeSelector (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/behavioral/TimeRangeSelector.tsx`

**Props Interface**:
```typescript
type TimeRangeSelectorProps = {
  selectedTimeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
};
```

---

### PatternsSection (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/behavioral/PatternsSection.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/behavioral/MetricsSection.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/behavioral/ChartsSection.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/behavioral/BehaviorAnalyticsLayout.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/behavioral/BehaviorAnalyticsHeader.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/behavioral/BehaviorAnalyticsDashboard.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/behavioral/BehaviorAnalyticsContainer.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/behavioral/BehaviorAnalyticsChart.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/behavioral/BehaviorAnalyticsChart.fixtures.ts`

**Props Interface**: None (no props or props not detected)

---

### PostHogProvider (Client Component)

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/analytics/PostHogProvider.tsx`

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

**File**: `/home/runner/work/Next-js-Boilerplate/Next-js-Boilerplate/src/components/analytics/PostHogPageView.tsx`

**Props Interface**: None (no props or props not detected)

**Dependencies**:
- next/navigation
- posthog-js/react
- react

---

## Component Statistics

- **Total Components**: 49
- **Server Components**: 4
- **Client Components**: 38
- **Components with Props**: 24
- **Components with Stories**: 8
- **Components with Tests**: 15

## Props Analysis

### Common Prop Types
- `"7d" | "30d" | "90d" | "1y"`: 6 occurrences
- `"behavior_frequency" | "habit_strength" | "context_patterns" | "consistency_trends"`: 1 occurrences
- `"create" | "edit"`: 1 occurrences
- `"line" | "bar" | "area"`: 1 occurrences
- `() => void`: 4 occurrences
- `(action: string) => void`: 1 occurrences
- `(action: string, ...args: any[]) => void`: 1 occurrences
- `(category: string) => void`: 1 occurrences
- `(chartType: string, metric?: string | undefined) => Promise<void>`: 3 occurrences
- `(correlation: any) => Promise<void>`: 1 occurrences
- `(data: any) => void`: 1 occurrences
- `(goal: ExerciseGoal) => void`: 1 occurrences
- `(goal: HealthGoal) => void`: 2 occurrences
- `(goalId: number) => void`: 1 occurrences
- `(goalId: number, status: "active" | "completed" | "paused") => void`: 1 occurrences
- `(id: number) => Promise<void>`: 1 occurrences
- `(id: number, active: boolean) => Promise<void>`: 1 occurrences
- `(insight: CrossDomainInsight) => Promise<void>`: 1 occurrences
- `(insight: CrossDomainInsight) => void`: 1 occurrences
- `(insight: any) => Promise<void>`: 3 occurrences
- `(insight: any) => void`: 2 occurrences
- `(log: ExerciseLog) => void`: 1 occurrences
- `(metric: string) => void`: 1 occurrences
- `(pattern: any) => Promise<void>`: 4 occurrences
- `(pattern: any) => void`: 5 occurrences
- `(plan: TrainingPlan) => void`: 1 occurrences
- `(range: "7d" | "30d" | "90d" | "1y") => void`: 1 occurrences
- `(range: TimeRange) => void`: 1 occurrences
- `(record: HealthRecord) => void`: 1 occurrences
- `(reminder: HealthReminder) => void`: 1 occurrences
- `(section: string) => void`: 1 occurrences
- `(statType: string, value: string | number) => void`: 1 occurrences
- `(title: string, value: string | number, trend?: "up" | "down" | "stable" | undefined) => Promise<void>`: 3 occurrences
- `(value: number) => string`: 1 occurrences
- `(value: number, name: string) => [string, string]`: 1 occurrences
- `(value: string) => string`: 1 occurrences
- `(view: AnalyticsView) => Promise<void>`: 1 occurrences
- `(view: AnalyticsView) => void`: 1 occurrences
- `AnalyticsView`: 2 occurrences
- `BehaviorAnalyticsSummary | null`: 4 occurrences
- `BehaviorDataPoint[]`: 3 occurrences
- `ContextPatternData[]`: 4 occurrences
- `Date | null`: 3 occurrences
- `ExerciseGoal[]`: 1 occurrences
- `ExerciseLog[]`: 5 occurrences
- `ExerciseProgressData`: 1 occurrences
- `ExerciseProgressData[]`: 2 occurrences
- `ExerciseStats`: 5 occurrences
- `HabitStrengthData[]`: 4 occurrences
- `HabitStrengthData[] | ContextPatternData[] | BehaviorDataPoint[]`: 1 occurrences
- `HealthDataPoint[]`: 1 occurrences
- `HealthGoal`: 1 occurrences
- `HealthGoal[]`: 2 occurrences
- `HealthRecord[]`: 2 occurrences
- `HealthReminder[]`: 1 occurrences
- `HealthStats`: 2 occurrences
- `HealthSummaryMetric[]`: 2 occurrences
- `HealthType[]`: 1 occurrences
- `Partial<{ type_id: number; value: number; unit: string; recorded_at: string; }>`: 1 occurrences
- `PredictedDataPoint[]`: 1 occurrences
- `RadarChartData[]`: 2 occurrences
- `TimeRange`: 1 occurrences
- `TrainingPlan[]`: 4 occurrences
- `any[]`: 6 occurrences
- `boolean`: 23 occurrences
- `number`: 7 occurrences
- `string`: 16 occurrences
- `string | null`: 5 occurrences
- `string[]`: 2 occurrences
- `{ stats: any; recentLogs: ExerciseLog[]; activePlans: TrainingPlan[]; progressData: ExerciseProgressData[]; }`: 1 occurrences
- `{ summary: any; habitStrengthData: HabitStrengthData[]; contextPatternsData: ContextPatternData[]; behaviorFrequencyData: BehaviorDataPoint[]; patterns: any[]; insights: any[]; }`: 1 occurrences
- `{ summaryMetrics: HealthSummaryMetric[]; predictiveData: PredictedDataPoint[]; radarData: RadarChartData[]; insights: any[]; }`: 1 occurrences

## Dependency Analysis

### External Dependencies
- `@/components/behavioral/BehaviorAnalyticsContainer`: used by 1 components
- `@/components/health/types`: used by 1 components
- `@/components/ui/badge`: used by 2 components
- `@/components/ui/button`: used by 2 components
- `@/components/ui/card`: used by 2 components
- `@/components/ui/progress`: used by 2 components
- `@/hooks/useBehaviorTracking`: used by 9 components
- `@/hooks/useMicroBehavior`: used by 2 components
- `@/libs/DB`: used by 2 components
- `@/libs/Env`: used by 1 components
- `@/libs/I18nNavigation`: used by 1 components
- `@/libs/I18nRouting`: used by 1 components
- `@/libs/Logger`: used by 1 components
- `@/models/Schema`: used by 2 components
- `@/types/exercise`: used by 1 components
- `@/types/health`: used by 3 components
- `@/utils/healthDataTransformers`: used by 2 components
- `@/utils/healthScoring`: used by 1 components
- `@/utils/statistics`: used by 1 components
- `@/validations/CounterValidation`: used by 1 components
- `@clerk/nextjs`: used by 5 components
- `@clerk/nextjs/server`: used by 2 components
- `@heroicons/react/24/outline`: used by 1 components
- `@hookform/resolvers/zod`: used by 2 components
- `date-fns`: used by 1 components
- `drizzle-orm`: used by 2 components
- `next-intl`: used by 25 components
- `next-intl/server`: used by 3 components
- `next/headers`: used by 1 components
- `next/image`: used by 3 components
- `next/link`: used by 9 components
- `next/navigation`: used by 5 components
- `posthog-js`: used by 1 components
- `posthog-js/react`: used by 2 components
- `react`: used by 20 components
- `react-hook-form`: used by 2 components
- `react-icons/fa`: used by 1 components
- `recharts`: used by 4 components
- `zod`: used by 1 components

### Internal Dependencies
- `../behavioral/BehaviorAnalyticsChart`: used by 1 components
- `../behavioral/BehaviorAnalyticsLayout`: used by 2 components
- `./BehaviorAnalyticsChart`: used by 5 components
- `./BehaviorAnalyticsHeader`: used by 1 components
- `./BehaviorAnalyticsLayout`: used by 2 components
- `./ChartsSection`: used by 1 components
- `./ExerciseAnalyticsSection`: used by 1 components
- `./GoalsSection`: used by 1 components
- `./HealthAnalyticsLayout`: used by 1 components
- `./HealthChart`: used by 1 components
- `./HealthOverviewContainer`: used by 6 components
- `./HealthOverviewLayout`: used by 1 components
- `./HealthPredictiveChart`: used by 1 components
- `./HealthRadarChart`: used by 1 components
- `./HealthRecordForm`: used by 1 components
- `./HealthSummaryCards`: used by 2 components
- `./MetricsSection`: used by 1 components
- `./PatternsSection`: used by 1 components
- `./PostHogPageView`: used by 1 components
- `./RecordsSection`: used by 1 components
- `./Sponsors`: used by 1 components
- `./StatsSection`: used by 1 components
- `./TimeRangeSelector`: used by 1 components
- `./UnifiedInsightsSection`: used by 1 components
- `./types`: used by 3 components
- `./useHealthOverviewTracking`: used by 1 components

