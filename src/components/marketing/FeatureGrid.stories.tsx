import type { Meta, StoryObj } from '@storybook/react';
import { NextIntlClientProvider } from 'next-intl';
import { FeatureGrid } from './FeatureGrid';

// Import locale messages
import enMessages from '../../locales/en.json';
import frMessages from '../../locales/fr.json';
import zhMessages from '../../locales/zh.json';

const meta: Meta<typeof FeatureGrid> = {
  title: 'Marketing/FeatureGrid',
  component: FeatureGrid,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A responsive grid component showcasing the main health tracking features of the application. Displays feature cards with icons, titles, descriptions, and optional screenshots.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story, context) => {
      const locale = context.globals.locale || 'en';
      const messages = {
        en: enMessages,
        fr: frMessages,
        zh: zhMessages,
      }[locale] || enMessages;

      return (
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="min-h-screen bg-gray-50">
            <Story />
          </div>
        </NextIntlClientProvider>
      );
    },
  ],
  globalTypes: {
    locale: {
      description: 'Internationalization locale',
      defaultValue: 'en',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'fr', title: 'Français' },
          { value: 'zh', title: '中文' },
        ],
        showName: true,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FeatureGrid>;

// Default story showing all features
export const Default: Story = {
  name: 'Default',
  parameters: {
    docs: {
      description: {
        story: 'The default FeatureGrid component showing all six health tracking features in a responsive grid layout.',
      },
    },
  },
};

// English locale story
export const English: Story = {
  name: 'English Locale',
  parameters: {
    docs: {
      description: {
        story: 'FeatureGrid component displayed in English with all feature descriptions and titles.',
      },
    },
  },
  globals: {
    locale: 'en',
  },
};

// French locale story
export const French: Story = {
  name: 'French Locale',
  parameters: {
    docs: {
      description: {
        story: 'FeatureGrid component displayed in French (Français) showing localized feature content.',
      },
    },
  },
  globals: {
    locale: 'fr',
  },
};

// Chinese locale story
export const Chinese: Story = {
  name: 'Chinese Locale',
  parameters: {
    docs: {
      description: {
        story: 'FeatureGrid component displayed in Chinese (中文) showing localized feature content.',
      },
    },
  },
  globals: {
    locale: 'zh',
  },
};

// Mobile viewport story
export const Mobile: Story = {
  name: 'Mobile View',
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'FeatureGrid component optimized for mobile devices, showing single-column layout.',
      },
    },
  },
};

// Tablet viewport story
export const Tablet: Story = {
  name: 'Tablet View',
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'FeatureGrid component on tablet devices, showing two-column grid layout.',
      },
    },
  },
};

// Desktop viewport story
export const Desktop: Story = {
  name: 'Desktop View',
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      description: {
        story: 'FeatureGrid component on desktop devices, showing three-column grid layout for optimal viewing.',
      },
    },
  },
};

// Dark background variant
export const DarkBackground: Story = {
  name: 'Dark Background',
  decorators: [
    (Story, context) => {
      const locale = context.globals.locale || 'en';
      const messages = {
        en: enMessages,
        fr: frMessages,
        zh: zhMessages,
      }[locale] || enMessages;

      return (
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="min-h-screen bg-gray-900">
            <Story />
          </div>
        </NextIntlClientProvider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'FeatureGrid component displayed on a dark background to test contrast and readability.',
      },
    },
  },
};

// Compact spacing variant
export const CompactSpacing: Story = {
  name: 'Compact Spacing',
  decorators: [
    (Story, context) => {
      const locale = context.globals.locale || 'en';
      const messages = {
        en: enMessages,
        fr: frMessages,
        zh: zhMessages,
      }[locale] || enMessages;

      return (
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-5xl">
              <Story />
            </div>
          </div>
        </NextIntlClientProvider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'FeatureGrid component with reduced container width and compact spacing for tighter layouts.',
      },
    },
  },
};

// Individual feature showcase
export const FeatureShowcase: Story = {
  name: 'Feature Showcase',
  parameters: {
    docs: {
      description: {
        story: 'Detailed view of individual features highlighting the different types of health tracking capabilities.',
      },
    },
  },
  decorators: [
    (Story, context) => {
      const locale = context.globals.locale || 'en';
      const messages = {
        en: enMessages,
        fr: frMessages,
        zh: zhMessages,
      }[locale] || enMessages;

      return (
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="py-12">
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Health Tracking Features
                </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Comprehensive tools designed to help you monitor, analyze, and improve your health journey
                </p>
              </div>
              <Story />
            </div>
          </div>
        </NextIntlClientProvider>
      );
    },
  ],
};

// Accessibility focused story
export const AccessibilityFocus: Story = {
  name: 'Accessibility Focus',
  parameters: {
    docs: {
      description: {
        story: 'FeatureGrid component with focus on accessibility features including proper ARIA labels, keyboard navigation, and screen reader support.',
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'keyboard-navigation',
            enabled: true,
          },
        ],
      },
    },
  },
};

// Loading state simulation
export const LoadingState: Story = {
  name: 'Loading State',
  decorators: [
    (Story, context) => {
      const locale = context.globals.locale || 'en';
      const messages = {
        en: enMessages,
        fr: frMessages,
        zh: zhMessages,
      }[locale] || enMessages;

      return (
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="min-h-screen bg-gray-50">
            <div className="py-20">
              <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center mb-16">
                  <div className="h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse max-w-md mx-auto"></div>
                </div>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                      <div className="h-16 w-16 bg-gray-200 rounded-xl animate-pulse mb-6"></div>
                      <div className="h-6 bg-gray-200 rounded animate-pulse mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </NextIntlClientProvider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Simulated loading state showing skeleton placeholders while feature content is being loaded.',
      },
    },
  },
};

// Interactive hover states
export const InteractiveStates: Story = {
  name: 'Interactive States',
  parameters: {
    docs: {
      description: {
        story: 'FeatureGrid component showcasing hover effects, transitions, and interactive states for better user engagement.',
      },
    },
  },
  decorators: [
    (Story, context) => {
      const locale = context.globals.locale || 'en';
      const messages = {
        en: enMessages,
        fr: frMessages,
        zh: zhMessages,
      }[locale] || enMessages;

      return (
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="min-h-screen bg-gray-50">
            <div className="py-8">
              <div className="text-center mb-8">
                <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 inline-block">
                  💡 Hover over the feature cards to see interactive effects
                </p>
              </div>
              <Story />
            </div>
          </div>
        </NextIntlClientProvider>
      );
    },
  ],
};