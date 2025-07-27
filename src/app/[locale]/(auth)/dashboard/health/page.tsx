import { currentUser } from '@clerk/nextjs/server';
import { getTranslations } from 'next-intl/server';
import { HealthOverviewWrapper } from '@/components/health/HealthOverviewWrapper';

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
      <HealthOverviewWrapper />
    </div>
  );
}
