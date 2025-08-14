'use client';

import { useTranslations } from 'next-intl';

interface TechItem {
  name: string;
  description: string;
  color: string;
  icon: string;
  category: 'frontend' | 'backend' | 'database' | 'auth' | 'testing' | 'deployment';
}

export function TechStack() {
  const t = useTranslations('TechStack');

  const techStack: TechItem[] = [
    {
      name: 'Next.js 15',
      description: t('nextjs_description'),
      color: 'bg-black text-white',
      icon: '⚡',
      category: 'frontend'
    },
    {
      name: 'TypeScript',
      description: t('typescript_description'),
      color: 'bg-blue-600 text-white',
      icon: '🔷',
      category: 'frontend'
    },
    {
      name: 'Tailwind CSS',
      description: t('tailwind_description'),
      color: 'bg-cyan-500 text-white',
      icon: '🎨',
      category: 'frontend'
    },
    {
      name: 'React 19',
      description: t('react_description'),
      color: 'bg-blue-500 text-white',
      icon: '⚛️',
      category: 'frontend'
    },
    {
      name: 'Clerk Auth',
      description: t('clerk_description'),
      color: 'bg-purple-600 text-white',
      icon: '🔐',
      category: 'auth'
    },
    {
      name: 'Drizzle ORM',
      description: t('drizzle_description'),
      color: 'bg-green-600 text-white',
      icon: '🗄️',
      category: 'database'
    },
    {
      name: 'PostgreSQL',
      description: t('postgresql_description'),
      color: 'bg-blue-700 text-white',
      icon: '🐘',
      category: 'database'
    },
    {
      name: 'Vitest',
      description: t('vitest_description'),
      color: 'bg-yellow-500 text-black',
      icon: '🧪',
      category: 'testing'
    },
    {
      name: 'Playwright',
      description: t('playwright_description'),
      color: 'bg-green-500 text-white',
      icon: '🎭',
      category: 'testing'
    },
    {
      name: 'Storybook',
      description: t('storybook_description'),
      color: 'bg-pink-500 text-white',
      icon: '📚',
      category: 'testing'
    },
    {
      name: 'ESLint',
      description: t('eslint_description'),
      color: 'bg-indigo-600 text-white',
      icon: '🔍',
      category: 'testing'
    },
    {
      name: 'Vercel',
      description: t('vercel_description'),
      color: 'bg-black text-white',
      icon: '▲',
      category: 'deployment'
    }
  ];

  const categories = {
    frontend: t('category_frontend'),
    backend: t('category_backend'),
    database: t('category_database'),
    auth: t('category_auth'),
    testing: t('category_testing'),
    deployment: t('category_deployment')
  };

  const groupedTech = techStack.reduce((acc, tech) => {
    if (!acc[tech.category]) {
      acc[tech.category] = [];
    }
    acc[tech.category].push(tech);
    return acc;
  }, {} as Record<string, TechItem[]>);

  return (
    <section data-testid="tech-stack" className="py-16 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Tech Stack Grid */}
        <div className="space-y-12">
          {Object.entries(groupedTech).map(([category, techs]) => (
            <div key={category} className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 text-center">
                {categories[category as keyof typeof categories]}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {techs.map((tech) => (
                  <div
                    key={tech.name}
                    className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="p-6">
                      {/* Tech Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${tech.color}`}
                        >
                          <span className="mr-2 text-lg">{tech.icon}</span>
                          {tech.name}
                        </span>
                      </div>
                      
                      {/* Description */}
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                        {tech.description}
                      </p>
                    </div>
                    
                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">{t('cta_title')}</h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              {t('cta_description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200">
                {t('cta_button_primary')}
              </button>
              <button className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-200">
                {t('cta_button_secondary')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

