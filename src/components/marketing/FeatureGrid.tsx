'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import {
  HeartIcon,
  ChartBarIcon,
  TrophyIcon,
  BellIcon,
  MagnifyingGlassIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

interface Feature {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  image?: string;
}

const features: Feature[] = [
  {
    id: 'health-records',
    icon: <HeartIcon className="h-8 w-8" />,
    titleKey: 'feature_health_records_title',
    descriptionKey: 'feature_health_records_desc',
    image: '/assets/images/feature-health-records.png',
  },
  {
    id: 'analytics',
    icon: <ChartBarIcon className="h-8 w-8" />,
    titleKey: 'feature_analytics_title',
    descriptionKey: 'feature_analytics_desc',
    image: '/assets/images/feature-analytics.png',
  },
  {
    id: 'goals',
    icon: <TrophyIcon className="h-8 w-8" />,
    titleKey: 'feature_goals_title',
    descriptionKey: 'feature_goals_desc',
    image: '/assets/images/feature-goals.png',
  },
  {
    id: 'reminders',
    icon: <BellIcon className="h-8 w-8" />,
    titleKey: 'feature_reminders_title',
    descriptionKey: 'feature_reminders_desc',
    image: '/assets/images/feature-reminders.png',
  },
  {
    id: 'behavior',
    icon: <MagnifyingGlassIcon className="h-8 w-8" />,
    titleKey: 'feature_behavior_title',
    descriptionKey: 'feature_behavior_desc',
  },
  {
    id: 'exercise',
    icon: <PlayIcon className="h-8 w-8" />,
    titleKey: 'feature_exercise_title',
    descriptionKey: 'feature_exercise_desc',
  },
];

interface FeatureCardProps {
  feature: Feature;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  title,
  description,
}) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100">
      {/* Icon */}
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
        {feature.icon}
      </div>

      {/* Content */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>

      {/* Optional Screenshot */}
      {feature.image && (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
          <Image
            src={feature.image}
            alt={`${title} screenshot`}
            width={400}
            height={240}
            className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
          />
        </div>
      )}

      {/* Hover Effect Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

export const FeatureGrid: React.FC = () => {
  const t = useTranslations('Index');

  return (
    <section data-testid="feature-grid" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {t('features_title')}
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            {t('features_subtitle')}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              title={t(feature.titleKey)}
              description={t(feature.descriptionKey)}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-6">
            {t('features_bottom_cta_title')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              {t('features_bottom_cta_get_started')}
            </button>
            <button className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 transition-all duration-300">
              {t('features_bottom_cta_view_demo')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;