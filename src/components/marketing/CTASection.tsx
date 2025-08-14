'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function CTASection() {
  const t = useTranslations('Index');

  return (
    <section data-testid="cta-section" className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 py-16 sm:py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-600/20" />
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {t('cta_title')}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-emerald-100 sm:text-xl">
            {t('cta_subtitle')}
          </p>
          
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            {/* Primary CTA Button */}
            <Link
              href="/sign-up"
              className="group relative inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-emerald-700 shadow-lg transition-all duration-300 hover:bg-emerald-50 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50 sm:px-10 sm:py-4 sm:text-lg"
            >
              <span className="relative z-10">{t('cta_button_primary')}</span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 transition-opacity duration-300 group-hover:opacity-20" />
            </Link>
            
            {/* Secondary CTA Button */}
            <Link
              href="/dashboard"
              className="group inline-flex items-center justify-center rounded-full border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:border-white/50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/50 sm:px-10 sm:py-4 sm:text-lg"
            >
              <span>{t('cta_button_secondary')}</span>
              <svg
                className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <div className="flex items-center text-emerald-100">
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Free to start</span>
            </div>
            <div className="flex items-center text-emerald-100">
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">No credit card required</span>
            </div>
            <div className="flex items-center text-emerald-100">
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Setup in 2 minutes</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}