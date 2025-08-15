'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { 
  HealthSummaryMetric, 
  PredictedDataPoint, 
  RadarChartData,
  BehaviorAnalyticsSummary,
  HabitStrengthData,
  ContextPatternData,
  BehaviorDataPoint,
  ExerciseStats,
  ExerciseLog,
  TrainingPlan,
  ExerciseProgressData
} from '@/types/health';

interface UnifiedInsightsSectionProps {
  healthData: {
    summaryMetrics: HealthSummaryMetric[];
    predictiveData: PredictedDataPoint[];
    radarData: RadarChartData[];
    insights: any[];
  };
  behaviorData: {
    summary: BehaviorAnalyticsSummary | null;
    habitStrengthData: HabitStrengthData[];
    contextPatternsData: ContextPatternData[];
    behaviorFrequencyData: BehaviorDataPoint[];
    patterns: any[];
    insights: any[];
  };
  exerciseData: {
    stats: ExerciseStats | undefined;
    recentLogs: ExerciseLog[];
    activePlans: TrainingPlan[];
    progressData: ExerciseProgressData[];
  };
  onInsightView?: (insight: any) => void;
  onPatternDetails?: (pattern: any) => void;
  trackInsightView?: (insight: any) => Promise<void>;
  trackPatternInsightView?: (pattern: any) => Promise<void>;
  trackChartView?: (chartType: string, metric?: string) => Promise<void>;
}

interface CorrelationInsight {
  id: string;
  type: 'health_behavior' | 'health_exercise' | 'behavior_exercise' | 'unified';
  title: string;
  description: string;
  strength: number; // 0-1
  healthMetric?: string;
  behaviorPattern?: string;
  exerciseMetric?: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}

const UnifiedInsightsSection = ({
  healthData,
  behaviorData,
  exerciseData,
  onInsightView,
  onPatternDetails,
  trackInsightView,
  trackPatternInsightView,
  trackChartView,
}: UnifiedInsightsSectionProps) => {
  const t = useTranslations('HealthManagement');

  // Generate correlation insights based on the combined data
  const generateCorrelationInsights = (): CorrelationInsight[] => {
    const insights: CorrelationInsight[] = [];

    // Health-Behavior correlations
    if (healthData.summaryMetrics.length > 0 && behaviorData.summary) {
      const healthScore = healthData.summaryMetrics.find(m => m.key === 'overall_health')?.value || 0;
      const behaviorScore = behaviorData.summary.consistencyScore || 0;
      
      if (healthScore > 0.7 && behaviorScore > 0.7) {
        insights.push({
          id: 'health_behavior_positive',
          type: 'health_behavior',
          title: t('correlation_health_behavior_positive'),
          description: t('correlation_health_behavior_positive_desc'),
          strength: 0.85,
          healthMetric: 'overall_health',
          behaviorPattern: 'consistency',
          recommendation: t('correlation_recommendation_maintain'),
          priority: 'high',
        });
      }
    }

    // Health-Exercise correlations
    if (healthData.summaryMetrics.length > 0 && exerciseData.stats) {
      const healthScore = healthData.summaryMetrics.find(m => m.key === 'overall_health')?.value || 0;
      const workoutConsistency = exerciseData.stats.weeklyProgress / 100;
      
      if (healthScore > 0.6 && workoutConsistency > 0.6) {
        insights.push({
          id: 'health_exercise_positive',
          type: 'health_exercise',
          title: t('correlation_health_exercise_positive'),
          description: t('correlation_health_exercise_positive_desc'),
          strength: 0.78,
          healthMetric: 'overall_health',
          exerciseMetric: 'workout_consistency',
          recommendation: t('correlation_recommendation_increase_exercise'),
          priority: 'medium',
        });
      }
    }

    // Behavior-Exercise correlations
    if (behaviorData.summary && exerciseData.stats) {
      const behaviorConsistency = behaviorData.summary.consistencyScore || 0;
      const exerciseConsistency = exerciseData.stats.weeklyProgress / 100;
      
      if (behaviorConsistency > 0.5 && exerciseConsistency < 0.5) {
        insights.push({
          id: 'behavior_exercise_improvement',
          type: 'behavior_exercise',
          title: t('correlation_behavior_exercise_improvement'),
          description: t('correlation_behavior_exercise_improvement_desc'),
          strength: 0.65,
          behaviorPattern: 'consistency',
          exerciseMetric: 'workout_consistency',
          recommendation: t('correlation_recommendation_improve_exercise'),
          priority: 'medium',
        });
      }
    }

    // Unified insights
    if (healthData.summaryMetrics.length > 0 && behaviorData.summary && exerciseData.stats) {
      const overallHealth = healthData.summaryMetrics.find(m => m.key === 'overall_health')?.value || 0;
      const behaviorConsistency = behaviorData.summary.consistencyScore || 0;
      const exerciseConsistency = exerciseData.stats.weeklyProgress / 100;
      
      const unifiedScore = (overallHealth + behaviorConsistency + exerciseConsistency) / 3;
      
      if (unifiedScore > 0.8) {
        insights.push({
          id: 'unified_excellent',
          type: 'unified',
          title: t('correlation_unified_excellent'),
          description: t('correlation_unified_excellent_desc'),
          strength: 0.92,
          recommendation: t('correlation_recommendation_excellent'),
          priority: 'high',
        });
      } else if (unifiedScore < 0.4) {
        insights.push({
          id: 'unified_attention',
          type: 'unified',
          title: t('correlation_unified_attention'),
          description: t('correlation_unified_attention_desc'),
          strength: 0.35,
          recommendation: t('correlation_recommendation_attention'),
          priority: 'high',
        });
      }
    }

    return insights.sort((a, b) => {
      // Sort by priority first, then by strength
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.strength - a.strength;
    });
  };

  const correlationInsights = generateCorrelationInsights();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'health_behavior': return '🏥🧠';
      case 'health_exercise': return '🏥💪';
      case 'behavior_exercise': return '🧠💪';
      case 'unified': return '🔗';
      default: return '📊';
    }
  };

  const handleInsightClick = async (insight: CorrelationInsight) => {
    await trackInsightView?.(insight);
    onInsightView?.(insight);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              🏥 {t('health_overview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('overall_score')}</span>
                <span className="font-bold">
                  {Math.round((healthData.summaryMetrics.find(m => m.key === 'overall_health')?.value || 0) * 100)}%
                </span>
              </div>
              <Progress 
                value={(healthData.summaryMetrics.find(m => m.key === 'overall_health')?.value || 0) * 100} 
                className="h-2"
              />
              <div className="text-xs text-gray-500">
                {healthData.summaryMetrics.length} {t('metrics_tracked')}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              🧠 {t('behavior_overview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('consistency_score')}</span>
                <span className="font-bold">
                  {Math.round((behaviorData.summary?.consistencyScore || 0) * 100)}%
                </span>
              </div>
              <Progress 
                value={(behaviorData.summary?.consistencyScore || 0) * 100} 
                className="h-2"
              />
              <div className="text-xs text-gray-500">
                {behaviorData.summary?.totalEvents || 0} {t('events_tracked')}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              💪 {t('exercise_overview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{t('weekly_progress')}</span>
                <span className="font-bold">
                  {exerciseData.stats?.weeklyProgress || 0}%
                </span>
              </div>
              <Progress 
                value={exerciseData.stats?.weeklyProgress || 0} 
                className="h-2"
              />
              <div className="text-xs text-gray-500">
                {exerciseData.stats?.totalExerciseLogs || 0} {t('workouts_completed')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Correlation Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔗 {t('correlation_insights')}
          </CardTitle>
          <p className="text-sm text-gray-600">
            {t('correlation_insights_description')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {correlationInsights.length > 0 ? (
              correlationInsights.map((insight) => (
                <div 
                  key={insight.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleInsightClick(insight)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTypeIcon(insight.type)}</span>
                      <h3 className="font-medium">{insight.title}</h3>
                    </div>
                    <Badge className={getPriorityColor(insight.priority)}>
                      {t(`priority_${insight.priority}`)}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{t('correlation_strength')}</span>
                      <Progress value={insight.strength * 100} className="w-20 h-2" />
                      <span className="text-xs font-medium">{Math.round(insight.strength * 100)}%</span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm text-blue-800">
                      <strong>{t('recommendation')}:</strong> {insight.recommendation}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">{t('no_correlation_insights')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cross-Domain Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('health_behavior_correlation')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-gray-500">{t('correlation_chart_placeholder')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('exercise_impact_analysis')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-gray-500">{t('impact_chart_placeholder')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { UnifiedInsightsSection };