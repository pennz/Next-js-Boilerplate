import { SignOutButton } from '@clerk/nextjs';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { BaseTemplate } from '@/templates/BaseTemplate';

export default async function DashboardLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'DashboardLayout',
  });

  return (
    <BaseTemplate
      leftNav={(
        <>
          <li>
            <Link
              href="/dashboard/"
              className="border-none text-gray-700 hover:text-gray-900"
            >
              {t('dashboard_link')}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/user-profile/"
              className="border-none text-gray-700 hover:text-gray-900"
            >
              {t('user_profile_link')}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/health/"
              className="border-none text-gray-700 hover:text-gray-900"
            >
              {t('health_overview_link')}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/health/records/"
              className="border-none text-gray-700 hover:text-gray-900"
            >
              {t('health_records_link')}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/health/analytics/"
              className="border-none text-gray-700 hover:text-gray-900"
            >
              {t('health_analytics_link')}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/health/goals/"
              className="border-none text-gray-700 hover:text-gray-900"
            >
              {t('health_goals_link')}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/health/reminders/"
              className="border-none text-gray-700 hover:text-gray-900"
            >
              {t('health_reminders_link')}
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/exercise/"
              className="border-none text-gray-700 hover:text-gray-900"
            >
              {t('exercise_overview_link')}
            </Link>
          </li>
        </>
      )}
      rightNav={(
        <>
          <li>
            <SignOutButton>
              <button className="border-none text-gray-700 hover:text-gray-900" type="button">
                {t('sign_out')}
              </button>
            </SignOutButton>
          </li>

          <li>
            <LocaleSwitcher />
          </li>
        </>
      )}
    >
      {props.children}
    </BaseTemplate>
  );
}
