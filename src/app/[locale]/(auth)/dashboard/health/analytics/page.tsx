import { getTranslations } from 'next-intl/server';
import { currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { HealthAnalyticsContainer } from '@/components/health/HealthAnalyticsContainer';
import { BehaviorAnalyticsContainer } from '@/components/behavioral/BehaviorAnalyticsContainer';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'HealthManagement',
  });

  return {
    title: t('page_title_health_analytics_overview'),
    description: t('page_description_health_analytics_overview'),
  };
}

export default async function HealthAnalyticsOverviewPage() {
  const user = await currentUser();
  if (!user) {
    notFound();
  }

  const t = await getTranslations('HealthManagement');

  return (
    <div className="py-5 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('analytics_comprehensive_title')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('analytics_overview_subtitle')}
          </p>
        </div>
      </div>

      {/* Health Analytics Section */}
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t('analytics_overview_section')}
          </h2>
          <p className="text-gray-600">
            {t('analytics_trends_section')}
          </p>
        </div>
        
        <Suspense fallback={
          <div className="space-y-6" data-testid="health-analytics-loading">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">{t('analytics_loading')}</p>
            </div>
          </div>
        }>
          <HealthAnalyticsContainer />
        </Suspense>
      </div>

      {/* Behavior Analytics Section */}
      <div className="space-y-6 border-t border-gray-200 pt-8">
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Behavioral Analytics
          </h2>
          <p className="text-gray-600">
            Comprehensive behavioral patterns and insights
          </p>
        </div>
        
        <Suspense fallback={
          <div className="space-y-6" data-testid="behavior-analytics-loading">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading behavioral analytics...</p>
            </div>
          </div>
        }>
          <BehaviorAnalyticsContainer 
            timeRange="30d"
            showRealTimeUpdates={true}
            refreshInterval={60000}
          />
        </Suspense>
      </div>

      {/* Insights Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('analytics_insights_section')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Health Trends</h3>
            <p className="text-sm text-blue-700">
              Comprehensive analysis of your health metrics over time with predictive insights.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-medium text-green-900 mb-2">Goal Progress</h3>
            <p className="text-sm text-green-700">
              Track your progress towards health goals with detailed analytics and recommendations.
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-medium text-purple-900 mb-2">Behavioral Patterns</h3>
            <p className="text-sm text-purple-700">
              Understand your behavioral patterns and their impact on your health outcomes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}