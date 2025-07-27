import { getTranslations } from 'next-intl/server';
import { HealthOverviewWrapper } from '@/components/health/HealthOverviewWrapper';
import { HealthSummaryCardsWrapper } from '@/components/health/HealthSummaryCardsWrapper';

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

  return (
    <div className="py-5 space-y-6">
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

      {/* Health Overview Section */}
      <HealthOverviewWrapper />

      {/* Health Summary Cards Section */}
      <div className="space-y-4">
        <div className="border-t border-gray-200 pt-6">
          <HealthSummaryCardsWrapper className="w-full" />
        </div>
      </div>
    </div>
  );
}
