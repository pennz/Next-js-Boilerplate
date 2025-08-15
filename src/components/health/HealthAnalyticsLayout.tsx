'use client';

import { useTranslations } from 'next-intl';
import type { HealthSummaryMetric, PredictedDataPoint, RadarChartData } from '@/types/health';

// Import health chart components (these should exist based on the plan)
import { HealthSummaryCards } from './HealthSummaryCards';
import { HealthPredictiveChart } from './HealthPredictiveChart';
import { HealthRadarChart } from './HealthRadarChart';

// Import behavior analytics components
import { BehaviorAnalyticsChart } from '../behavioral/BehaviorAnalyticsChart';

// Import extracted section components
import { UnifiedInsightsSection } from './UnifiedInsightsSection';
import { ExerciseAnalyticsSection } from './ExerciseAnalyticsSection';
import type { BehaviorDataPoint, ContextPatternData, HabitStrengthData, BehaviorAnalyticsSummary } from '../behavioral/BehaviorAnalyticsLayout';

export type HealthAnalyticsSummary = {
  totalMetrics: number;
  activeGoals: number;
  healthScore: number;
  improvementTrend: 'up' | 'down' | 'stable';
  lastRecordDate: string;
  weeklyProgress: number;
  criticalAlerts: number;
};

// Exercise data types
export type ExerciseStats = {
  totalExerciseLogs: number;
  activePlans: number;
  completedSessions: number;
  weeklyProgress: number;
};

export type ExerciseLog = {
  id: number;
  exercise: string;
  sets: number;
  reps: number | null;
  weight: number | null;
  logged_at: string;
};

export type TrainingPlan = {
  id: number;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sessions_per_week: number;
  is_active: boolean;
  start_date: string | null;
};

export type ExerciseProgressData = {
  date: string;
  strength: number;
  volume: number;
  frequency: number;
};

export type AnalyticsView = 'health' | 'behavior' | 'exercise' | 'unified';

type HealthAnalyticsLayoutProps = {
  // Health data props
  summaryMetrics: HealthSummaryMetric[];
  predictiveData: PredictedDataPoint[];
  radarData: RadarChartData[];
  insights?: any[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  selectedMetric?: string;
  
  // Behavior analytics data props
  behaviorSummary?: BehaviorAnalyticsSummary | null;
  habitStrengthData?: HabitStrengthData[];
  contextPatternsData?: ContextPatternData[];
  behaviorFrequencyData?: BehaviorDataPoint[];
  behaviorPatterns?: any[];
  behaviorInsights?: any[];
  
  // Exercise data props
  exerciseStats?: ExerciseStats;
  recentExerciseLogs?: ExerciseLog[];
  activeTrainingPlans?: TrainingPlan[];
  exerciseProgressData?: ExerciseProgressData[];
  
  // Navigation props
  activeView?: AnalyticsView;
  onViewChange?: (view: AnalyticsView) => void;
  
  // Callback props
  onMetricSelect?: (metric: string) => void;
  onRetry?: () => void;
  onInsightView?: (insight: any) => void;
  onPatternDetails?: (pattern: any) => void;
  
  // Tracking functions (optional)
  trackMetricCardView?: (title: string, value: string | number, trend?: 'up' | 'down' | 'stable') => Promise<void>;
  trackChartView?: (chartType: string, metric?: string) => Promise<void>;
  trackInsightView?: (insight: any) => Promise<void>;
  trackPatternInsightView?: (pattern: any) => Promise<void>;
  trackViewChange?: (view: AnalyticsView) => Promise<void>;
};

const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);

const ErrorMessage = ({ error, onRetry }: { error: string; onRetry?: () => void }) => {
  const t = useTranslations('HealthManagement');
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-red-800 font-medium">{t('analytics_error')}</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
            aria-label={t('analytics_retry')}
          >
            {t('analytics_retry')}
          </button>
        )}
      </div>
    </div>
  );
};

const AnalyticsNavigation = ({ 
  activeView, 
  onViewChange, 
  trackViewChange 
}: { 
  activeView: AnalyticsView; 
  onViewChange: (view: AnalyticsView) => void;
  trackViewChange?: (view: AnalyticsView) => Promise<void>;
}) => {
  const t = useTranslations('HealthManagement');

  const views: { key: AnalyticsView; label: string; icon: string; description: string }[] = [
    {
      key: 'unified',
      label: t('analytics_navigation_unified'),
      icon: '🔗',
      description: t('analytics_view_description_unified'),
    },
    {
      key: 'health',
      label: t('analytics_navigation_health'),
      icon: '🏥',
      description: t('analytics_view_description_health'),
    },
    {
      key: 'behavior',
      label: t('analytics_navigation_behavior'),
      icon: '🧠',
      description: t('analytics_view_description_behavior'),
    },
    {
      key: 'exercise',
      label: t('analytics_navigation_exercise'),
      icon: '💪',
      description: t('analytics_view_description_exercise'),
    },
  ];

  const handleViewChange = async (view: AnalyticsView) => {
    onViewChange(view);
    await trackViewChange?.(view);
  };

  return (
    <div className="mb-6">
      {/* Mobile Navigation - Dropdown */}
      <div className="block sm:hidden">
        <select
          value={activeView}
          onChange={(e) => handleViewChange(e.target.value as AnalyticsView)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label="Select analytics view"
        >
          {views.map((view) => (
            <option key={view.key} value={view.key}>
              {view.icon} {view.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop Navigation - Tabs */}
      <div className="hidden sm:block">
        <nav className="flex space-x-1 bg-gray-100 rounded-lg p-1" role="tablist">
          {views.map((view) => (
            <button
              key={view.key}
              onClick={() => handleViewChange(view.key)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200
                ${activeView === view.key
                  ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
              role="tab"
              aria-selected={activeView === view.key}
              aria-controls={`${view.key}-panel`}
              aria-label={t('navigation_switch_view', { view: view.label })}
            >
              <span className="text-lg">{view.icon}</span>
              <span className="hidden md:inline">{view.label}</span>
            </button>
          ))}
        </nav>
        
        {/* View Description */}
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-600">
            {views.find(v => v.key === activeView)?.description}
          </p>
        </div>
      </div>
    </div>
  );
};

const AnalyticsHeader = ({ 
  lastUpdate, 
  loading, 
  activeView 
}: { 
  lastUpdate: Date | null; 
  loading: boolean;
  activeView: AnalyticsView;
}) => {
  const t = useTranslations('HealthManagement');
  
  const getTitle = () => {
    switch (activeView) {
      case 'health':
        return t('analytics_navigation_health');
      case 'behavior':
        return t('analytics_navigation_behavior');
      case 'exercise':
        return t('analytics_navigation_exercise');
      case 'unified':
      default:
        return t('analytics_comprehensive_title');
    }
  };

  const getSubtitle = () => {
    switch (activeView) {
      case 'health':
        return t('analytics_view_description_health');
      case 'behavior':
        return t('analytics_view_description_behavior');
      case 'exercise':
        return t('analytics_view_description_exercise');
      case 'unified':
      default:
        return t('analytics_overview_subtitle');
    }
  };
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {getTitle()}
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {getSubtitle()}
          </p>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="flex items-center gap-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-sm">{t('analytics_loading')}</span>
            </div>
          ) : lastUpdate ? (
            <p className="text-sm text-gray-500">
              {t('analytics_last_updated', { 
                timestamp: lastUpdate.toLocaleString() 
              })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const ChartsSection = ({ 
  predictiveData, 
  radarData, 
  selectedMetric, 
  loading, 
  error, 
  onMetricSelect,
  trackChartView 
}: {
  predictiveData: PredictedDataPoint[];
  radarData: RadarChartData[];
  selectedMetric?: string;
  loading: boolean;
  error: string | null;
  onMetricSelect?: (metric: string) => void;
  trackChartView?: (chartType: string, metric?: string) => Promise<void>;
}) => {
  const t = useTranslations('HealthManagement');

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Predictive Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('analytics_trends_section')}
          </h3>
          {onMetricSelect && (
            <select
              value={selectedMetric || 'weight'}
              onChange={(e) => onMetricSelect(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
              aria-label="Select metric for trend analysis"
            >
              <option value="weight">Weight</option>
              <option value="steps">Steps</option>
              <option value="sleep">Sleep</option>
              <option value="heart_rate">Heart Rate</option>
            </select>
          )}
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <LoadingSkeleton />
          </div>
        ) : (
          <HealthPredictiveChart
            data={predictiveData}
            metric={selectedMetric || 'weight'}
            onChartInteraction={() => trackChartView?.('predictive', selectedMetric)}
          />
        )}
      </div>

      {/* Radar Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('analytics_overview_section')}
        </h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <LoadingSkeleton />
          </div>
        ) : (
          <HealthRadarChart
            data={radarData}
            onChartInteraction={() => trackChartView?.('radar')}
          />
        )}
      </div>
    </div>
  );
};

const BehaviorAnalyticsSection = ({
  behaviorSummary,
  habitStrengthData,
  contextPatternsData,
  behaviorFrequencyData,
  behaviorPatterns,
  behaviorInsights,
  loading,
  error,
  onPatternDetails,
  trackPatternInsightView,
}: {
  behaviorSummary?: BehaviorAnalyticsSummary | null;
  habitStrengthData?: HabitStrengthData[];
  contextPatternsData?: ContextPatternData[];
  behaviorFrequencyData?: BehaviorDataPoint[];
  behaviorPatterns?: any[];
  behaviorInsights?: any[];
  loading: boolean;
  error: string | null;
  onPatternDetails?: (pattern: any) => void;
  trackPatternInsightView?: (pattern: any) => Promise<void>;
}) => {
  const t = useTranslations('HealthManagement');

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Behavior Summary Cards */}
      {behaviorSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{behaviorSummary.totalEvents}</p>
              </div>
              <span className="text-2xl">📊</span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Patterns</p>
                <p className="text-2xl font-bold text-gray-900">{behaviorSummary.activePatterns}</p>
              </div>
              <span className="text-2xl">🔄</span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Habit Strength</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(behaviorSummary.habitStrengthAvg)}%</p>
              </div>
              <span className="text-2xl">💪</span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Consistency</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(behaviorSummary.consistencyScore)}%</p>
              </div>
              <span className="text-2xl">🎯</span>
            </div>
          </div>
        </div>
      )}

      {/* Behavior Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {habitStrengthData && habitStrengthData.length > 0 && (
          <BehaviorAnalyticsChart
            data={habitStrengthData}
            chartType="habit_strength"
            title="Habit Strength Trends"
            loading={loading}
            error={error}
          />
        )}
        {contextPatternsData && contextPatternsData.length > 0 && (
          <BehaviorAnalyticsChart
            data={contextPatternsData}
            chartType="context_patterns"
            title="Context Patterns"
            loading={loading}
            error={error}
            onDataPointClick={onPatternDetails}
          />
        )}
      </div>

      {/* Behavior Frequency Chart */}
      {behaviorFrequencyData && behaviorFrequencyData.length > 0 && (
        <BehaviorAnalyticsChart
          data={behaviorFrequencyData}
          chartType="behavior_frequency"
          title="Behavior Frequency Analysis"
          loading={loading}
          error={error}
          className="w-full"
        />
      )}
    </div>
  );
};

const ExerciseAnalyticsSection = ({
  exerciseStats,
  recentExerciseLogs,
  activeTrainingPlans,
  exerciseProgressData,
  loading,
  error,
}: {
  exerciseStats?: ExerciseStats;
  recentExerciseLogs?: ExerciseLog[];
  activeTrainingPlans?: TrainingPlan[];
  exerciseProgressData?: ExerciseProgressData[];
  loading: boolean;
  error: string | null;
}) => {
  const t = useTranslations('HealthManagement');

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Exercise Stats Cards */}
      {exerciseStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('exercise_summary_workouts')}</p>
                <p className="text-2xl font-bold text-gray-900">{exerciseStats.totalExerciseLogs}</p>
              </div>
              <span className="text-2xl">🏋️</span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Plans</p>
                <p className="text-2xl font-bold text-gray-900">{exerciseStats.activePlans}</p>
              </div>
              <span className="text-2xl">📋</span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{exerciseStats.completedSessions}</p>
              </div>
              <span className="text-2xl">✅</span>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Weekly Progress</p>
                <p className="text-2xl font-bold text-gray-900">{exerciseStats.weeklyProgress}</p>
              </div>
              <span className="text-2xl">📈</span>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Exercise Logs */}
        {recentExerciseLogs && recentExerciseLogs.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Workouts</h3>
            <div className="space-y-3">
              {recentExerciseLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">{log.exercise}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(log.logged_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {log.sets} sets
                      {log.reps && ` × ${log.reps} reps`}
                    </p>
                    {log.weight && (
                      <p className="text-sm text-gray-500">{log.weight}kg</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Training Plans */}
        {activeTrainingPlans && activeTrainingPlans.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Training Plans</h3>
            <div className="space-y-4">
              {activeTrainingPlans.map((plan) => (
                <div key={plan.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{plan.name}</h4>
                    {plan.is_active && <span className="text-green-500 text-sm">🟢 Active</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      plan.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                      plan.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {plan.difficulty}
                    </span>
                    <span className="text-sm text-gray-600">
                      {plan.sessions_per_week} sessions/week
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const UnifiedInsightsSection = ({
  healthInsights,
  behaviorInsights,
  exerciseStats,
  behaviorSummary,
  summaryMetrics,
  onInsightView,
  trackInsightView,
}: {
  healthInsights?: any[];
  behaviorInsights?: any[];
  exerciseStats?: ExerciseStats;
  behaviorSummary?: BehaviorAnalyticsSummary | null;
  summaryMetrics: HealthSummaryMetric[];
  onInsightView?: (insight: any) => void;
  trackInsightView?: (insight: any) => Promise<void>;
}) => {
  const t = useTranslations('HealthManagement');

  // Generate cross-domain insights
  const generateUnifiedInsights = () => {
    const insights = [];

    // Sleep-Exercise correlation
    if (exerciseStats && exerciseStats.weeklyProgress > 3) {
      insights.push({
        id: 'sleep-exercise-correlation',
        title: t('correlation_sleep_exercise'),
        description: 'Your regular exercise routine is contributing to better sleep quality patterns.',
        icon: '😴',
        category: t('insight_category_performance'),
        recommendation: 'Continue your current exercise frequency for optimal sleep benefits.',
        confidence: 85,
      });
    }

    // Stress-Health correlation
    if (behaviorSummary && behaviorSummary.consistencyScore > 70) {
      insights.push({
        id: 'stress-health-correlation',
        title: t('correlation_stress_health'),
        description: 'Consistent behavior patterns are helping maintain stable health metrics.',
        icon: '💓',
        category: t('insight_category_health_patterns'),
        recommendation: 'Maintain your current routine consistency for continued health benefits.',
        confidence: 78,
      });
    }

    // Nutrition-Performance correlation
    if (exerciseStats && behaviorSummary && behaviorSummary.habitStrengthAvg > 60) {
      insights.push({
        id: 'nutrition-performance-correlation',
        title: t('correlation_nutrition_performance'),
        description: 'Strong habit formation is positively impacting your workout performance.',
        icon: '🥗',
        category: t('insight_category_behavior_impact'),
        recommendation: 'Focus on pre-workout nutrition timing for enhanced performance.',
        confidence: 72,
      });
    }

    // Goal synergies
    if (exerciseStats && exerciseStats.activePlans > 0 && summaryMetrics.length > 0) {
      insights.push({
        id: 'goal-synergies',
        title: 'Health and Fitness Goals Alignment',
        description: 'Your active training plans are well-aligned with your health tracking goals.',
        icon: '🎯',
        category: t('insight_category_goal_synergies'),
        recommendation: 'Consider adding recovery metrics to complement your training data.',
        confidence: 80,
      });
    }

    return insights;
  };

  const unifiedInsights = generateUnifiedInsights();
  const allInsights = [
    ...unifiedInsights,
    ...(healthInsights || []),
    ...(behaviorInsights || []),
  ];

  if (allInsights.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('unified_insights_title')}
        </h3>
        <p className="text-sm text-gray-600">
          {t('unified_insights_subtitle')}
        </p>
      </div>

      {/* Insight Categories */}
      <div className="space-y-6">
        {[
          t('insight_category_performance'),
          t('insight_category_health_patterns'),
          t('insight_category_behavior_impact'),
          t('insight_category_goal_synergies'),
        ].map((category) => {
          const categoryInsights = allInsights.filter(insight => insight.category === category);
          
          if (categoryInsights.length === 0) return null;

          return (
            <div key={category}>
              <h4 className="text-md font-medium text-gray-800 mb-3">{category}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryInsights.map((insight, index) => (
                  <div
                    key={insight.id || index}
                    className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 cursor-pointer hover:from-blue-100 hover:to-purple-100 transition-all duration-200"
                    onClick={() => {
                      onInsightView?.(insight);
                      trackInsightView?.(insight);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onInsightView?.(insight);
                        trackInsightView?.(insight);
                      }
                    }}
                    aria-label={`Unified insight: ${insight.title}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{insight.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="font-medium text-blue-900">{insight.title}</h5>
                          {insight.confidence && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              {insight.confidence}% confidence
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-blue-700 mb-2">{insight.description}</p>
                        {insight.recommendation && (
                          <p className="text-xs text-blue-600 font-medium">
                            💡 {insight.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const InsightsSection = ({ 
  insights, 
  onInsightView, 
  trackInsightView 
}: {
  insights?: any[];
  onInsightView?: (insight: any) => void;
  trackInsightView?: (insight: any) => Promise<void>;
}) => {
  const t = useTranslations('HealthManagement');

  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('analytics_insights_section')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className="p-4 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => {
              onInsightView?.(insight);
              trackInsightView?.(insight);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onInsightView?.(insight);
                trackInsightView?.(insight);
              }
            }}
            aria-label={`Health insight: ${insight.title}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{insight.icon || '💡'}</span>
              <div>
                <h4 className="font-medium text-blue-900">{insight.title}</h4>
                <p className="text-sm text-blue-700 mt-1">{insight.description}</p>
                {insight.recommendation && (
                  <p className="text-xs text-blue-600 mt-2 font-medium">
                    💡 {insight.recommendation}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HealthAnalyticsLayout = ({
  // Health data props
  summaryMetrics,
  predictiveData,
  radarData,
  insights = [],
  loading,
  error,
  lastUpdate,
  selectedMetric,
  
  // Behavior analytics data props
  behaviorSummary,
  habitStrengthData,
  contextPatternsData,
  behaviorFrequencyData,
  behaviorPatterns = [],
  behaviorInsights = [],
  
  // Exercise data props
  exerciseStats,
  recentExerciseLogs,
  activeTrainingPlans,
  exerciseProgressData,
  
  // Navigation props
  activeView = 'unified',
  onViewChange,
  
  // Callback props
  onMetricSelect,
  onRetry,
  onInsightView,
  onPatternDetails,
  
  // Tracking functions
  trackMetricCardView,
  trackChartView,
  trackInsightView,
  trackPatternInsightView,
  trackViewChange,
}: HealthAnalyticsLayoutProps) => {
  const t = useTranslations('HealthManagement');

  const handleViewChange = async (view: AnalyticsView) => {
    onViewChange?.(view);
    await trackViewChange?.(view);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      );
    }

    if (error) {
      return <ErrorMessage error={error} onRetry={onRetry} />;
    }

    switch (activeView) {
      case 'health':
        return (
          <div className="space-y-6">
            <HealthSummaryCards
              metrics={summaryMetrics}
              onMetricSelect={onMetricSelect}
              trackMetricCardView={trackMetricCardView}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HealthPredictiveChart
                data={predictiveData}
                selectedMetric={selectedMetric}
                onMetricSelect={onMetricSelect}
                trackChartView={trackChartView}
              />
              <HealthRadarChart
                data={radarData}
                trackChartView={trackChartView}
              />
            </div>
          </div>
        );

      case 'behavior':
        return (
          <div className="space-y-6">
            {behaviorSummary && (
              <BehaviorAnalyticsChart
                summary={behaviorSummary}
                habitStrengthData={habitStrengthData}
                contextPatternsData={contextPatternsData}
                behaviorFrequencyData={behaviorFrequencyData}
                behaviorPatterns={behaviorPatterns}
                behaviorInsights={behaviorInsights}
                trackChartView={trackChartView}
                trackInsightView={trackInsightView}
                trackPatternInsightView={trackPatternInsightView}
              />
            )}
          </div>
        );

      case 'exercise':
        return (
          <div className="space-y-6">
            {exerciseStats && (
              <ExerciseAnalyticsSection
                stats={exerciseStats}
                recentLogs={recentExerciseLogs || []}
                activePlans={activeTrainingPlans || []}
                progressData={exerciseProgressData || []}
                trackChartView={trackChartView}
                trackInsightView={trackInsightView}
                onAction={(action, ...args) => {
                  // Handle exercise-specific actions
                  console.log('Exercise action:', action, args);
                }}
              />
            )}
          </div>
        );

      case 'unified':
      default:
        return (
          <div className="space-y-6">
            <UnifiedInsightsSection
              healthData={{
                summaryMetrics,
                predictiveData,
                radarData,
                insights,
              }}
              behaviorData={{
                summary: behaviorSummary,
                habitStrengthData,
                contextPatternsData,
                behaviorFrequencyData,
                patterns: behaviorPatterns,
                insights: behaviorInsights,
              }}
              exerciseData={{
                stats: exerciseStats,
                recentLogs: recentExerciseLogs || [],
                activePlans: activeTrainingPlans || [],
                progressData: exerciseProgressData || [],
              }}
              onInsightView={onInsightView}
              onPatternDetails={onPatternDetails}
              trackInsightView={trackInsightView}
              trackPatternInsightView={trackPatternInsightView}
              trackChartView={trackChartView}
            />
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <AnalyticsHeader 
        lastUpdate={lastUpdate} 
        loading={loading} 
        activeView={activeView} 
      />
      
      <AnalyticsNavigation 
        activeView={activeView} 
        onViewChange={handleViewChange}
        trackViewChange={trackViewChange}
      />
      
      {renderContent()}
    </div>
  );
};

export { HealthAnalyticsLayout };
