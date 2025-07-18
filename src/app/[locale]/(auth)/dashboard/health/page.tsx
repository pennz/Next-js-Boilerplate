import { currentUser } from '@clerk/nextjs/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'HealthManagement',
  });

  return {
    title: t('page_title_dashboard'),
  };
}

export default async function HealthDashboard() {
  const t = await getTranslations('HealthManagement');
  const user = await currentUser();

  if (!user) {
    return null;
  }

  return (
    <div className="py-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('page_title_dashboard')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('dashboard_subtitle')}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/health/records"
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t('button_add_record')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('quick_action_records_desc')}
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/health/analytics"
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">📈</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t('page_title_analytics')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('quick_action_analytics_desc')}
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/health/goals"
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">🎯</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t('button_save_goal')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('quick_action_goals_desc')}
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/health/reminders"
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 text-lg">🔔</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t('button_set_reminder')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('quick_action_reminders_desc')}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Records */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('section_recent_records')}
              </h2>
              <Link
                href="/dashboard/health/records"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {t('link_view_all')}
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-3">Today</span>
                  <span className="text-sm font-medium text-gray-900">
                    {t('label_weight')}: 70.5 kg
                  </span>
                </div>
                <span className="text-xs text-gray-400">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-3">Yesterday</span>
                  <span className="text-sm font-medium text-gray-900">
                    {t('label_steps')}: 8,432 steps
                  </span>
                </div>
                <span className="text-xs text-gray-400">1 day ago</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-3">2 days ago</span>
                  <span className="text-sm font-medium text-gray-900">
                    {t('label_blood_pressure')}: 120/80 mmHg
                  </span>
                </div>
                <span className="text-xs text-gray-400">2 days ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Goals */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('section_active_goals')}
              </h2>
              <Link
                href="/dashboard/health/goals"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {t('link_view_all')}
              </Link>
            </div>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Lose 5kg by March
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {t('status_active')}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>60% complete</span>
                  <span>45 days left</span>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Walk 10,000 steps daily
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {t('status_active')}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '84%' }}></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>8,432 / 10,000 today</span>
                  <span>84% complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Health Summary Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('section_health_summary')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">12</div>
              <div className="text-sm text-gray-500 mt-1">
                {t('stat_records_this_week')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">3</div>
              <div className="text-sm text-gray-500 mt-1">
                {t('stat_active_goals')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">85%</div>
              <div className="text-sm text-gray-500 mt-1">
                {t('stat_goal_completion_rate')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}