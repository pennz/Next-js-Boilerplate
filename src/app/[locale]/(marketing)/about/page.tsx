import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';

type IAboutProps = {
  params: { locale: string };
};

export async function generateMetadata(props: IAboutProps) {
  const { locale } = props.params;
  const t = await getTranslations({
    locale,
    namespace: 'About',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function About(props: IAboutProps) {
  const { locale } = props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'About',
  });

  return (
    <div className="mx-auto max-w-4xl">
      {/* Mission Section */}
      <section className="mb-12">
        <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
          {t('mission_title')}
        </h1>
        <p className="mb-4 text-lg text-gray-700 dark:text-gray-300">
          {t('mission_description')}
        </p>
        <p className="text-gray-600 dark:text-gray-400">
          {t('mission_vision')}
        </p>
      </section>

      {/* Features Section */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          {t('features_title')}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
            <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">
              {t('feature_comprehensive_tracking')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('feature_comprehensive_tracking_desc')}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
            <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">
              {t('feature_predictive_analytics')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('feature_predictive_analytics_desc')}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
            <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">
              {t('feature_goal_management')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('feature_goal_management_desc')}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-6 dark:bg-gray-800">
            <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">
              {t('feature_behavior_insights')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('feature_behavior_insights_desc')}
            </p>
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          {t('technology_title')}
        </h2>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          {t('technology_description')}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                N
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Next.js 15</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">React Framework</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                TS
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">TypeScript</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Type Safety</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900">
              <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-300">
                TW
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Tailwind CSS</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Styling</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-300">
                C
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Clerk</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Authentication</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
              <span className="text-sm font-semibold text-green-600 dark:text-green-300">
                D
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Drizzle ORM</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Database</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
              <span className="text-sm font-semibold text-orange-600 dark:text-orange-300">
                V
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Vitest</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Testing</p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Privacy Section */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          {t('security_title')}
        </h2>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          {t('security_description')}
        </p>
        <ul className="list-disc space-y-2 pl-6 text-gray-600 dark:text-gray-400">
          <li>{t('security_encryption')}</li>
          <li>{t('security_authentication')}</li>
          <li>{t('security_privacy')}</li>
          <li>{t('security_compliance')}</li>
        </ul>
      </section>

      {/* Contact Section */}
      <section className="mb-8">
        <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          {t('contact_title')}
        </h2>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          {t('contact_description')}
        </p>
        <div className="rounded-lg bg-blue-50 p-6 dark:bg-blue-900/20">
          <p className="text-blue-800 dark:text-blue-200">
            {t('contact_support')}
          </p>
        </div>
      </section>

      {/* Translation Attribution */}
      <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm dark:border-gray-700">
        {`${t('translation_powered_by')} `}
        <a
          className="text-blue-700 hover:border-b-2 hover:border-blue-700 dark:text-blue-400"
          href="https://l.crowdin.com/next-js"
        >
          Crowdin
        </a>
      </div>

      <a href="https://l.crowdin.com/next-js" className="mt-4 block text-center">
        <Image
          className="mx-auto"
          src="/assets/images/crowdin-dark.png"
          alt="Crowdin Translation Management System"
          width={128}
          height={26}
        />
      </a>
    </div>
  );
};
