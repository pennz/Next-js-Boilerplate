'use client';

import { useTranslations } from 'next-intl';
import { useState, useMemo, useCallback } from 'react';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import type { HealthSummaryMetric, RadarChartData } from '@/types/health';
import type { BehaviorAnalyticsSummary, HabitStrengthData, ContextPatternData } from '../behavioral/BehaviorAnalyticsLayout';

// Types for exercise data
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

// Insight data structures
type CorrelationStrength = 'weak' | 'moderate' | 'strong';

type CrossDomainInsight = {
  id: string;
  category: 'Performance Correlations' | 'Health Patterns' | 'Behavior Impact' | 'Goal Synergies';
  title: string;
  description: string;
  correlation: {
    metric1: string;
    metric2: string;
    strength: CorrelationStrength;
    coefficient: number;
    direction: 'positive' | 'negative';
  };
  recommendation: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  icon: string;
  visualData?: {
    type: 'progress' | 'trend' | 'comparison';
    value: number;
    target?: number;
    trend?: 'up' | 'down' | 'stable';
  };
};

type InsightCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
  insights: CrossDomainInsight[];
};

type UnifiedAnalyticsInsightsProps = {
  // Health data
  healthMetrics: HealthSummaryMetric[];
  healthRadarData: RadarChartData[];
  
  // Behavior data
  behaviorSummary: BehaviorAnalyticsSummary | null;
  habitStrengthData: HabitStrengthData[];
  contextPatternsData: ContextPatternData[];
  
  // Exercise data
  exerciseStats: ExerciseStats;
  recentExerciseLogs: ExerciseLog[];
  
  // State props
  loading?: boolean;
  error?: string | null;
  
  // Callback props
  onInsightClick?: (insight: CrossDomainInsight) => void;
  onCategorySelect?: (category: string) => void;
  
  // Tracking functions
  trackInsightView?: (insight: CrossDomainInsight) => Promise<void>;
  trackCorrelationAnalysis?: (correlation: any) => Promise<void>;
};

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-gray-100 rounded-lg p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </div>
      ))}
    </div>
  </div>
);

const ErrorMessage = ({ error }: { error: string }) => {
  const t = useTranslations('HealthManagement');
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert">
      <div className="text-4xl mb-3">⚠️</div>
      <h3 className="text-red-800 font-medium mb-2">{t('unified_insights_error')}</h3>
      <p className="text-red-600 text-sm">{error}</p>
    </div>
  );
};

const CorrelationIndicator = ({ 
  strength, 
  coefficient, 
  direction 
}: { 
  strength: CorrelationStrength; 
  coefficient: number; 
  direction: 'positive' | 'negative';
}) => {
  const getStrengthColor = () => {
    switch (strength) {
      case 'strong': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'weak': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  const getDirectionIcon = () => {
    return direction === 'positive' ? '↗️' : '↘️';
  };

  const percentage = Math.abs(coefficient * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="text-sm">{getDirectionIcon()}</span>
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${getStrengthColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-600 font-medium">
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
};

const InsightCard = ({ 
  insight, 
  onClick, 
  onTrackView 
}: { 
  insight: CrossDomainInsight; 
  onClick?: (insight: CrossDomainInsight) => void;
  onTrackView?: (insight: CrossDomainInsight) => Promise<void>;
}) => {
  const { trackEvent } = useBehaviorTracking();

  const handleClick = useCallback(async () => {
    await trackEvent({
      eventName: 'unified_insight_clicked',
      entityType: 'analytics_insight',
      entityId: insight.id,
      context: {
        ui: {
          component: 'UnifiedAnalyticsInsights',
          element: 'InsightCard',
        },
        analytics: {
          category: insight.category,
          correlationStrength: insight.correlation.strength,
          confidence: insight.confidence,
          impact: insight.impact,
          metric1: insight.correlation.metric1,
          metric2: insight.correlation.metric2,
        },
      },
    });

    onClick?.(insight);
    onTrackView?.(insight);
  }, [insight, onClick, onTrackView, trackEvent]);

  const getImpactColor = () => {
    switch (insight.impact) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getConfidenceColor = () => {
    if (insight.confidence >= 80) return 'text-green-600';
    if (insight.confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div
      className={`bg-white rounded-lg border-l-4 ${getImpactColor()} p-4 shadow-sm hover:shadow-md transition-all cursor-pointer`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Insight: ${insight.title}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{insight.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 text-sm leading-tight">
              {insight.title}
            </h4>
            <span className={`text-xs font-medium ${getConfidenceColor()}`}>
              {insight.confidence}%
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            {insight.description}
          </p>

          <div className="mb-3">
            <CorrelationIndicator
              strength={insight.correlation.strength}
              coefficient={insight.correlation.coefficient}
              direction={insight.correlation.direction}
            />
          </div>

          {insight.visualData && (
            <div className="mb-3">
              {insight.visualData.type === 'progress' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Progress</span>
                    <span>{insight.visualData.value}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, insight.visualData.value)}%` }}
                    />
                  </div>
                </div>
              )}
              
              {insight.visualData.type === 'trend' && insight.visualData.trend && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Trend:</span>
                  <span className={`flex items-center gap-1 ${
                    insight.visualData.trend === 'up' ? 'text-green-600' : 
                    insight.visualData.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {insight.visualData.trend === 'up' ? '📈' : 
                     insight.visualData.trend === 'down' ? '📉' : '➡️'}
                    {insight.visualData.trend}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 rounded-md p-2 border border-blue-100">
            <p className="text-xs text-blue-800 font-medium">
              💡 {insight.recommendation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CategoryFilter = ({ 
  categories, 
  selectedCategory, 
  onCategorySelect 
}: {
  categories: InsightCategory[];
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
}) => {
  const t = useTranslations('HealthManagement');

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={() => onCategorySelect(null)}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          selectedCategory === null
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        aria-label={t('unified_insights_all_categories')}
      >
        {t('unified_insights_all_categories') || 'All Categories'}
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategorySelect(category.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedCategory === category.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-label={`Filter by ${category.name}`}
        >
          <span>{category.icon}</span>
          <span>{category.name}</span>
          <span className="bg-white bg-opacity-20 rounded-full px-2 py-0.5 text-xs">
            {category.insights.length}
          </span>
        </button>
      ))}
    </div>
  );
};

export const UnifiedAnalyticsInsights = ({
  healthMetrics,
  healthRadarData,
  behaviorSummary,
  habitStrengthData,
  contextPatternsData,
  exerciseStats,
  recentExerciseLogs,
  loading = false,
  error = null,
  onInsightClick,
  onCategorySelect,
  trackInsightView,
  trackCorrelationAnalysis,
}: UnifiedAnalyticsInsightsProps) => {
  const t = useTranslations('HealthManagement');
  const { trackEvent } = useBehaviorTracking();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Generate cross-domain insights based on available data
  const insights = useMemo(() => {
    if (loading || error) return [];

    const generatedInsights: CrossDomainInsight[] = [];

    // Sleep quality vs exercise performance correlation
    const sleepMetric = healthMetrics.find(m => m.label.toLowerCase().includes('sleep'));
    const exerciseFrequency = exerciseStats.weeklyProgress;
    
    if (sleepMetric && exerciseFrequency > 0) {
      const correlation = Math.min(0.85, (sleepMetric.value / 8) * 0.7 + (exerciseFrequency / 100) * 0.3);
      generatedInsights.push({
        id: 'sleep-exercise-correlation',
        category: 'Performance Correlations',
        title: t('correlation_sleep_exercise') || 'Sleep quality improves with regular exercise',
        description: `Your sleep quality (${sleepMetric.value}${sleepMetric.unit}) shows a positive correlation with exercise frequency (${exerciseFrequency}% weekly progress).`,
        correlation: {
          metric1: 'Sleep Quality',
          metric2: 'Exercise Frequency',
          strength: correlation > 0.7 ? 'strong' : correlation > 0.4 ? 'moderate' : 'weak',
          coefficient: correlation,
          direction: 'positive',
        },
        recommendation: 'Maintain consistent workout schedule to continue improving sleep quality.',
        confidence: Math.round(correlation * 100),
        impact: correlation > 0.7 ? 'high' : correlation > 0.4 ? 'medium' : 'low',
        icon: '😴',
        visualData: {
          type: 'progress',
          value: Math.round(correlation * 100),
        },
      });
    }

    // Stress levels vs heart rate variability
    const heartRateMetric = healthMetrics.find(m => m.label.toLowerCase().includes('heart'));
    const stressContext = contextPatternsData.find(c => c.context.toLowerCase().includes('stress'));
    
    if (heartRateMetric && stressContext) {
      const correlation = Math.min(0.75, (100 - stressContext.successRate) / 100 * 0.8);
      generatedInsights.push({
        id: 'stress-heartrate-correlation',
        category: 'Health Patterns',
        title: t('correlation_stress_health') || 'Stress levels impact heart rate variability',
        description: `Higher stress contexts (${Math.round(100 - stressContext.successRate)}% stress level) correlate with elevated heart rate patterns.`,
        correlation: {
          metric1: 'Stress Level',
          metric2: 'Heart Rate Variability',
          strength: correlation > 0.6 ? 'strong' : correlation > 0.3 ? 'moderate' : 'weak',
          coefficient: correlation,
          direction: 'negative',
        },
        recommendation: 'Consider stress management techniques like meditation or breathing exercises.',
        confidence: Math.round(correlation * 100),
        impact: correlation > 0.6 ? 'high' : correlation > 0.3 ? 'medium' : 'low',
        icon: '💓',
        visualData: {
          type: 'trend',
          value: Math.round(stressContext.successRate),
          trend: stressContext.successRate > 70 ? 'up' : stressContext.successRate < 50 ? 'down' : 'stable',
        },
      });
    }

    // Behavior consistency vs goal achievement
    if (behaviorSummary && healthMetrics.length > 0) {
      const goalAchievement = healthMetrics.filter(m => m.goalTarget && m.value >= m.goalTarget).length / healthMetrics.length;
      const correlation = Math.min(0.9, behaviorSummary.consistencyScore / 100 * 0.8 + goalAchievement * 0.2);
      
      generatedInsights.push({
        id: 'behavior-goals-synergy',
        category: 'Goal Synergies',
        title: 'Consistent behaviors drive goal achievement',
        description: `Your behavior consistency (${behaviorSummary.consistencyScore}%) strongly correlates with health goal achievement (${Math.round(goalAchievement * 100)}%).`,
        correlation: {
          metric1: 'Behavior Consistency',
          metric2: 'Goal Achievement',
          strength: correlation > 0.7 ? 'strong' : correlation > 0.4 ? 'moderate' : 'weak',
          coefficient: correlation,
          direction: 'positive',
        },
        recommendation: 'Focus on maintaining consistent daily habits to accelerate goal progress.',
        confidence: Math.round(correlation * 100),
        impact: correlation > 0.7 ? 'high' : correlation > 0.4 ? 'medium' : 'low',
        icon: '🎯',
        visualData: {
          type: 'progress',
          value: Math.round(goalAchievement * 100),
          target: 80,
        },
      });
    }

    // Exercise timing vs performance
    if (recentExerciseLogs.length > 0 && habitStrengthData.length > 0) {
      const recentHabitStrength = habitStrengthData[habitStrengthData.length - 1]?.habitStrength || 0;
      const exerciseConsistency = exerciseStats.completedSessions / (exerciseStats.activePlans || 1);
      const correlation = Math.min(0.8, (recentHabitStrength / 100) * 0.6 + (exerciseConsistency / 10) * 0.4);
      
      generatedInsights.push({
        id: 'exercise-timing-performance',
        category: 'Behavior Impact',
        title: 'Exercise timing affects performance patterns',
        description: `Your habit strength (${Math.round(recentHabitStrength)}%) and exercise consistency show optimal performance windows.`,
        correlation: {
          metric1: 'Exercise Timing',
          metric2: 'Performance',
          strength: correlation > 0.6 ? 'strong' : correlation > 0.3 ? 'moderate' : 'weak',
          coefficient: correlation,
          direction: 'positive',
        },
        recommendation: 'Schedule workouts during your peak habit strength periods for better results.',
        confidence: Math.round(correlation * 100),
        impact: correlation > 0.6 ? 'high' : correlation > 0.3 ? 'medium' : 'low',
        icon: '⏰',
        visualData: {
          type: 'trend',
          value: Math.round(recentHabitStrength),
          trend: recentHabitStrength > 70 ? 'up' : recentHabitStrength < 50 ? 'down' : 'stable',
        },
      });
    }

    // Nutrition timing correlation (if we have weight data)
    const weightMetric = healthMetrics.find(m => m.label.toLowerCase().includes('weight'));
    const nutritionContext = contextPatternsData.find(c => c.context.toLowerCase().includes('meal') || c.context.toLowerCase().includes('food'));
    
    if (weightMetric && nutritionContext && exerciseStats.weeklyProgress > 0) {
      const correlation = Math.min(0.7, nutritionContext.successRate / 100 * 0.5 + exerciseStats.weeklyProgress / 100 * 0.5);
      generatedInsights.push({
        id: 'nutrition-performance-correlation',
        category: 'Performance Correlations',
        title: t('correlation_nutrition_performance') || 'Nutrition timing affects workout performance',
        description: `Meal timing patterns (${Math.round(nutritionContext.successRate)}% success rate) correlate with exercise performance and weight management.`,
        correlation: {
          metric1: 'Nutrition Timing',
          metric2: 'Workout Performance',
          strength: correlation > 0.5 ? 'moderate' : 'weak',
          coefficient: correlation,
          direction: 'positive',
        },
        recommendation: 'Optimize meal timing around workouts for better performance and recovery.',
        confidence: Math.round(correlation * 100),
        impact: correlation > 0.5 ? 'medium' : 'low',
        icon: '🍎',
        visualData: {
          type: 'progress',
          value: Math.round(nutritionContext.successRate),
        },
      });
    }

    return generatedInsights;
  }, [
    healthMetrics, 
    behaviorSummary, 
    habitStrengthData, 
    contextPatternsData, 
    exerciseStats, 
    recentExerciseLogs,
    loading,
    error,
    t
  ]);

  // Group insights by category
  const categories = useMemo(() => {
    const categoryMap = new Map<string, InsightCategory>();

    insights.forEach(insight => {
      if (!categoryMap.has(insight.category)) {
        const categoryIcons = {
          'Performance Correlations': '📊',
          'Health Patterns': '🔍',
          'Behavior Impact': '🧠',
          'Goal Synergies': '🎯',
        };

        categoryMap.set(insight.category, {
          id: insight.category.toLowerCase().replace(/\s+/g, '_'),
          name: insight.category,
          description: t(`insight_category_${insight.category.toLowerCase().replace(/\s+/g, '_')}`) || insight.category,
          icon: categoryIcons[insight.category] || '📈',
          insights: [],
        });
      }
      
      categoryMap.get(insight.category)!.insights.push(insight);
    });

    return Array.from(categoryMap.values());
  }, [insights, t]);

  // Filter insights based on selected category
  const filteredInsights = useMemo(() => {
    if (!selectedCategory) return insights;
    return insights.filter(insight => 
      insight.category.toLowerCase().replace(/\s+/g, '_') === selectedCategory
    );
  }, [insights, selectedCategory]);

  const handleCategorySelect = useCallback(async (category: string | null) => {
    setSelectedCategory(category);
    onCategorySelect?.(category || 'all');

    await trackEvent({
      eventName: 'insight_category_selected',
      entityType: 'ui_interaction',
      context: {
        ui: {
          component: 'UnifiedAnalyticsInsights',
          element: 'CategoryFilter',
        },
        analytics: {
          selectedCategory: category || 'all',
          totalInsights: insights.length,
          filteredInsights: category ? insights.filter(i => 
            i.category.toLowerCase().replace(/\s+/g, '_') === category
          ).length : insights.length,
        },
      },
    });
  }, [setSelectedCategory, onCategorySelect, trackEvent, insights]);

  const handleInsightTrackView = useCallback(async (insight: CrossDomainInsight) => {
    await trackCorrelationAnalysis?.({
      insightId: insight.id,
      category: insight.category,
      correlationStrength: insight.correlation.strength,
      confidence: insight.confidence,
      metrics: [insight.correlation.metric1, insight.correlation.metric2],
    });

    await trackInsightView?.(insight);
  }, [trackCorrelationAnalysis, trackInsightView]);

  if (loading) {
    return (
      <div className="space-y-6" data-testid="unified-analytics-insights">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('unified_insights_title') || 'Cross-Domain Insights'}
          </h2>
          <p className="text-gray-600">
            {t('unified_insights_analyzing') || 'Analyzing correlations across your health data...'}
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" data-testid="unified-analytics-insights">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('unified_insights_title') || 'Cross-Domain Insights'}
          </h2>
        </div>
        <ErrorMessage error={error} />
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="space-y-6" data-testid="unified-analytics-insights">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('unified_insights_title') || 'Cross-Domain Insights'}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('unified_insights_subtitle') || 'Discover connections between your health, behavior, and exercise data'}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('unified_insights_no_data') || 'No insights available yet'}
          </h3>
          <p className="text-gray-600">
            {t('unified_insights_no_data_description') || 'Continue tracking your health, behavior, and exercise data to discover meaningful correlations.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="unified-analytics-insights">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('unified_insights_title') || 'Cross-Domain Insights'}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('unified_insights_subtitle') || 'Discover connections between your health, behavior, and exercise data'}
        </p>
      </div>

      {/* Category Filter */}
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
      />

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredInsights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onClick={onInsightClick}
            onTrackView={handleInsightTrackView}
          />
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{insights.length}</p>
            <p className="text-sm text-gray-600">Total Insights</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {insights.filter(i => i.correlation.strength === 'strong').length}
            </p>
            <p className="text-sm text-gray-600">Strong Correlations</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {insights.filter(i => i.impact === 'high').length}
            </p>
            <p className="text-sm text-gray-600">High Impact</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">
              {Math.round(insights.reduce((acc, i) => acc + i.confidence, 0) / insights.length)}%
            </p>
            <p className="text-sm text-gray-600">Avg Confidence</p>
          </div>
        </div>
      </div>
    </div>
  );
};