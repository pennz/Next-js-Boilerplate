'use client';

import { useTranslations } from 'next-intl';
import type { HealthSummaryMetric, PredictedDataPoint, RadarChartData } from '@/types/health';

// Import health chart components (these should exist based on the plan)
import { HealthSummaryCards } from './HealthSummaryCards';
import { HealthPredictiveChart } from './HealthPredictiveChart';
import { HealthRadarChart } from './HealthRadarChart';

export type HealthAnalyticsSummary = {
  totalMetrics: number;
  activeGoals: number;
  healthScore: number;
  improvementTrend: 'up' | 'down' | 'stable';
  lastRecordDate: string;
  weeklyProgress: number;
  criticalAlerts: number;
};

type HealthAnalyticsLayoutProps = {
  // Data props
  summaryMetrics: HealthSummaryMetric[];
  predictiveData: PredictedDataPoint[];
  radarData: RadarChartData[];
  insights?: any[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  selectedMetric?: string;
  
  // Callback props
  onMetricSelect?: (metric: string) => void;
  onRetry?: () => void;
  onInsightView?: (insight: any) => void;
  
  // Tracking functions (optional)
  trackMetricCardView?: (title: string, value: string | number, trend?: 'up' | 'down' | 'stable') => Promise<void>;
  trackChartView?: (chartType: string, metric?: string) => Promise<void>;
  trackInsightView?: (insight: any) => Promise<void>;
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

const AnalyticsHeader = ({ lastUpdate, loading }: { lastUpdate: Date | null; loading: boolean }) => {
  const t = useTranslations('HealthManagement');
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('analytics_comprehensive_title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('analytics_overview_subtitle')}
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

export const HealthAnalyticsLayout = ({
  summaryMetrics,
  predictiveData,
  radarData,
  insights,
  loading,
  error,
  lastUpdate,
  selectedMetric,
  onMetricSelect,
  onRetry,
  onInsightView,
  trackMetricCardView,
  trackChartView,
  trackInsightView,
}: HealthAnalyticsLayoutProps) => {
  const t = useTranslations('HealthManagement');

  // Show error state if there's an error and no data
  if (error && !summaryMetrics.length && !predictiveData.length && !radarData.length) {
    return (
      <div className="space-y-6" data-testid="health-analytics-layout">
        <AnalyticsHeader lastUpdate={lastUpdate} loading={loading} />
        <ErrorMessage error={error} onRetry={onRetry} />
      </div>
    );
  }

  // Show no data state if not loading and no data available
  if (!loading && !summaryMetrics.length && !predictiveData.length && !radarData.length) {
    return (
      <div className="space-y-6" data-testid="health-analytics-layout">
        <AnalyticsHeader lastUpdate={lastUpdate} loading={loading} />
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('analytics_no_data')}
          </h3>
          <p className="text-gray-600">
            {t('analytics_no_data')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="health-analytics-layout">
      {/* Header */}
      <AnalyticsHeader lastUpdate={lastUpdate} loading={loading} />

      {/* Summary Metrics */}
      {summaryMetrics.length > 0 && (
        <div className="mb-6">
          <HealthSummaryCards
            metrics={summaryMetrics}
            loading={loading}
            onCardView={trackMetricCardView}
          />
        </div>
      )}

      {/* Charts Section */}
      <ChartsSection
        predictiveData={predictiveData}
        radarData={radarData}
        selectedMetric={selectedMetric}
        loading={loading}
        error={error}
        onMetricSelect={onMetricSelect}
        trackChartView={trackChartView}
      />

      {/* Insights Section */}
      <InsightsSection
        insights={insights}
        onInsightView={onInsightView}
        trackInsightView={trackInsightView}
      />
    </div>
  );
};