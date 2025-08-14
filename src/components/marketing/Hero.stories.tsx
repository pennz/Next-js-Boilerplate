import type { Meta, StoryObj } from '@storybook/react';
import { NextIntlClientProvider } from 'next-intl';
import Hero from './Hero';

// Import locale messages
import enMessages from '../../locales/en.json';
import frMessages from '../../locales/fr.json';
import zhMessages from '../../locales/zh.json';

const meta: Meta<typeof Hero> = {
  title: 'Marketing/Hero',
  component: Hero,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Hero section component for the health tracking application landing page. Features responsive design, internationalization support, and gradient backgrounds.',
      },
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1200px',
            height: '800px',
          },
        },
        wide: {
          name: 'Wide Desktop',
          styles: {
            width: '1920px',
            height: '1080px',
          },
        },
      },
    },
  },
  decorators: [
    (Story, context) => {
      const locale = context.globals?.locale || 'en';
      const messages = {
        en: enMessages,
        fr: frMessages,
        zh: zhMessages,
      }[locale] || enMessages;

      return (
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Story />
          </div>
        </NextIntlClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof Hero>;

// Default story
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default Hero component with English locale and standard responsive behavior.',
      },
    },
  },
};

// English locale variant
export const English: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Hero component displaying English content with health tracking messaging.',
      },
    },
  },
};

// French locale variant
export const French: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Hero component displaying French content with localized health tracking messaging.',
      },
    },
  },
};

// Chinese locale variant
export const Chinese: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Hero component displaying Chinese content with localized health tracking messaging.',
      },
    },
  },
};

// Mobile responsive view
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'Hero component optimized for mobile devices with stacked layout and adjusted typography.',
      },
    },
  },
};

// Tablet responsive view
export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Hero component optimized for tablet devices with balanced layout proportions.',
      },
    },
  },
};

// Desktop responsive view
export const Desktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
    docs: {
      description: {
        story: 'Hero component optimized for desktop with full two-column layout.',
      },
    },
  },
};

// Wide desktop view
export const WideDesktop: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'wide',
    },
    docs: {
      description: {
        story: 'Hero component on wide desktop displays with maximum content width constraints.',
      },
    },
  },
};

// Dark mode variant
export const DarkMode: Story = {
  decorators: [
    (Story, context) => {
      const locale = context.globals?.locale || 'en';
      const messages = {
        en: enMessages,
        fr: frMessages,
        zh: zhMessages,
      }[locale] || enMessages;

      return (
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="min-h-screen bg-gray-900 dark">
            <Story />
          </div>
        </NextIntlClientProvider>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Hero component in dark mode with adjusted colors and contrast.',
      },
    },
    backgrounds: {
      default: 'dark',
    },
  },
};

// French mobile combination
export const FrenchMobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'Hero component with French localization on mobile devices, demonstrating text length adaptation.',
      },
    },
  },
};

// Chinese tablet combination
export const ChineseTablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    docs: {
      description: {
        story: 'Hero component with Chinese localization on tablet devices, showing character-based text layout.',
      },
    },
  },
};

// Accessibility focused story
export const AccessibilityFocus: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'focus-order-semantics',
            enabled: true,
          },
        ],
      },
    },
    docs: {
      description: {
        story: 'Hero component with accessibility testing enabled, focusing on color contrast and focus management.',
      },
    },
  },
};

// Performance testing story
export const PerformanceTest: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Hero component for performance testing with image loading and gradient rendering optimization.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    // Performance testing could be added here
    const canvas = canvasElement;
    const heroImage = canvas.querySelector('img[alt*="hero"]');
    
    if (heroImage) {
      // Wait for image to load
      await new Promise((resolve) => {
        if (heroImage.complete) {
          resolve(true);
        } else {
          heroImage.addEventListener('load', resolve);
        }
      });
    }
  },
};

// Interactive story with play function
export const Interactive: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Interactive Hero component demonstrating button interactions and hover states.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = canvasElement;
    
    // Find CTA buttons
    const primaryButton = canvas.querySelector('a[href="/sign-up"]');
    const secondaryButton = canvas.querySelector('a[href="/dashboard"]');
    
    // Simulate hover interactions
    if (primaryButton) {
      primaryButton.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 500));
      primaryButton.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    }
    
    if (secondaryButton) {
      secondaryButton.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 500));
      secondaryButton.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    }
  },
};

// All locales comparison
export const LocaleComparison: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">English</h3>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <Hero />
        </NextIntlClientProvider>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">French</h3>
        <NextIntlClientProvider locale="fr" messages={frMessages}>
          <Hero />
        </NextIntlClientProvider>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Chinese</h3>
        <NextIntlClientProvider locale="zh" messages={zhMessages}>
          <Hero />
        </NextIntlClientProvider>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Side-by-side comparison of Hero component in all supported locales to review text length and layout consistency.',
      },
    },
  },
};