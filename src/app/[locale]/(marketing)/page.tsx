import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Sponsors } from '@/components/Sponsors';
import { Hero } from '@/components/marketing/Hero';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';
import { CTASection } from '@/components/marketing/CTASection';
import { TechStack } from '@/components/marketing/TechStack';

type IIndexProps = {
  params: { locale: string };
};

export async function generateMetadata(props: IIndexProps) {
  const { locale } = props.params;
  const t = await getTranslations({
    locale,
    namespace: 'Index',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function Index(props: IIndexProps) {
  const { locale } = props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'Index',
  });

  return (
    <main className="w-full">
      {/* Hero Section */}
      <section aria-labelledby="hero-title" className="bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-28">
          <Hero />
        </div>
      </section>

      {/* Feature Grid */}
      <section aria-labelledby="features-title" className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
          <FeatureGrid />
        </div>
      </section>

      {/* Tech Stack */}
      <section aria-labelledby="tech-title" className="bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 id="tech-title" className="text-2xl font-bold text-slate-900">
              {t('tech_title')}
            </h2>
            {t('tech_subtitle') ? (
              <p className="mt-3 text-base text-slate-600">{t('tech_subtitle')}</p>
            ) : null}
          </div>

          <div className="mt-10">
            <TechStack />
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section aria-labelledby="cta-title" className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
          <CTASection />
        </div>
      </section>

      {/* Sponsors */}
      <section aria-labelledby="sponsors-title" className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
          <h2 id="sponsors-title" className="text-xl font-semibold text-slate-900">
            {t('sponsors_title')}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{t('sponsors_subtitle')}</p>
          <div className="mt-6">
            <Sponsors />
          </div>
        </div>
      </section>
    </main>
  );
};