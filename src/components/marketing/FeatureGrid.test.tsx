import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { FeatureGrid } from './FeatureGrid';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  HeartIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="heart-icon">
      <title>Heart Icon</title>
    </svg>
  ),
  ChartBarIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="chart-bar-icon">
      <title>Chart Bar Icon</title>
    </svg>
  ),
  TrophyIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="trophy-icon">
      <title>Trophy Icon</title>
    </svg>
  ),
  BellIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="bell-icon">
      <title>Bell Icon</title>
    </svg>
  ),
  MagnifyingGlassIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="magnifying-glass-icon">
      <title>Magnifying Glass Icon</title>
    </svg>
  ),
  PlayIcon: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="play-icon">
      <title>Play Icon</title>
    </svg>
  ),
}));

const mockMessages = {
  Index: {
    features_title: 'Comprehensive Health Management',
    feature_health_records_title: 'Health Records Tracking',
    feature_health_records_desc: 'Log and monitor vital health metrics including weight, blood pressure, heart rate, sleep, and more with easy-to-use forms and data validation.',
    feature_analytics_title: 'Advanced Analytics & Predictions',
    feature_analytics_desc: 'Visualize your health trends with interactive charts and get predictive insights using machine learning algorithms to forecast future health patterns.',
    feature_goals_title: 'Goal Setting & Progress',
    feature_goals_desc: 'Set personalized health goals, track your progress with visual indicators, and receive motivation to achieve your wellness targets.',
    feature_reminders_title: 'Smart Reminders',
    feature_reminders_desc: 'Never miss important health activities with customizable reminders for medication, exercise, measurements, and check-ups.',
    feature_behavior_title: 'Behavior Analysis',
    feature_behavior_desc: 'Discover patterns in your health behavior with correlation analysis, trend detection, and personalized insights to optimize your wellness routine.',
    feature_exercise_title: 'Exercise Management',
    feature_exercise_desc: 'Plan and track your workouts, monitor training progress, and integrate fitness data with your overall health profile.',
  },
};

const renderWithIntl = (component: React.ReactElement, locale = 'en') => {
  return render(
    <NextIntlClientProvider locale={locale} messages={mockMessages}>
      {component}
    </NextIntlClientProvider>
  );
};

describe('FeatureGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the component without crashing', () => {
      renderWithIntl(<FeatureGrid />);
      expect(screen.getByText('Comprehensive Health Management')).toBeInTheDocument();
    });

    it('renders the section header with correct title', () => {
      renderWithIntl(<FeatureGrid />);
      
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveTextContent('Comprehensive Health Management');
    });

    it('renders the section subtitle', () => {
      renderWithIntl(<FeatureGrid />);
      
      expect(screen.getByText('Comprehensive tools to help you track, analyze, and improve your health journey')).toBeInTheDocument();
    });

    it('renders the bottom CTA section', () => {
      renderWithIntl(<FeatureGrid />);
      
      expect(screen.getByText('Ready to start your health journey?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get started free/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view demo/i })).toBeInTheDocument();
    });
  });

  describe('Feature Cards Rendering', () => {
    it('renders all 6 feature cards', () => {
      renderWithIntl(<FeatureGrid />);
      
      // Check that all feature titles are present
      expect(screen.getByText('Health Records Tracking')).toBeInTheDocument();
      expect(screen.getByText('Advanced Analytics & Predictions')).toBeInTheDocument();
      expect(screen.getByText('Goal Setting & Progress')).toBeInTheDocument();
      expect(screen.getByText('Smart Reminders')).toBeInTheDocument();
      expect(screen.getByText('Behavior Analysis')).toBeInTheDocument();
      expect(screen.getByText('Exercise Management')).toBeInTheDocument();
    });

    it('renders correct feature descriptions', () => {
      renderWithIntl(<FeatureGrid />);
      
      expect(screen.getByText(/log and monitor vital health metrics/i)).toBeInTheDocument();
      expect(screen.getByText(/visualize your health trends with interactive charts/i)).toBeInTheDocument();
      expect(screen.getByText(/set personalized health goals/i)).toBeInTheDocument();
      expect(screen.getByText(/never miss important health activities/i)).toBeInTheDocument();
      expect(screen.getByText(/discover patterns in your health behavior/i)).toBeInTheDocument();
      expect(screen.getByText(/plan and track your workouts/i)).toBeInTheDocument();
    });

    it('renders feature icons correctly', () => {
      renderWithIntl(<FeatureGrid />);
      
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('chart-bar-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trophy-icon')).toBeInTheDocument();
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
      expect(screen.getByTestId('magnifying-glass-icon')).toBeInTheDocument();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('renders feature images for features that have them', () => {
      renderWithIntl(<FeatureGrid />);
      
      // Health Records feature should have an image
      const healthRecordsImage = screen.getByAltText('Health Records Tracking screenshot');
      expect(healthRecordsImage).toBeInTheDocument();
      expect(healthRecordsImage).toHaveAttribute('src', '/assets/images/feature-health-records.png');

      // Analytics feature should have an image
      const analyticsImage = screen.getByAltText('Advanced Analytics & Predictions screenshot');
      expect(analyticsImage).toBeInTheDocument();
      expect(analyticsImage).toHaveAttribute('src', '/assets/images/feature-analytics.png');

      // Goals feature should have an image
      const goalsImage = screen.getByAltText('Goal Setting & Progress screenshot');
      expect(goalsImage).toBeInTheDocument();
      expect(goalsImage).toHaveAttribute('src', '/assets/images/feature-goals.png');

      // Reminders feature should have an image
      const remindersImage = screen.getByAltText('Smart Reminders screenshot');
      expect(remindersImage).toBeInTheDocument();
      expect(remindersImage).toHaveAttribute('src', '/assets/images/feature-reminders.png');
    });

    it('does not render images for features without them', () => {
      renderWithIntl(<FeatureGrid />);
      
      // Behavior and Exercise features should not have images
      expect(screen.queryByAltText('Behavior Analysis screenshot')).not.toBeInTheDocument();
      expect(screen.queryByAltText('Exercise Management screenshot')).not.toBeInTheDocument();
    });
  });

  describe('Grid Layout and Responsiveness', () => {
    it('applies correct CSS classes for responsive grid layout', () => {
      renderWithIntl(<FeatureGrid />);
      
      const gridContainer = screen.getByRole('main').querySelector('.grid');
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'gap-8', 'md:grid-cols-2', 'lg:grid-cols-3');
    });

    it('applies correct styling classes to feature cards', () => {
      renderWithIntl(<FeatureGrid />);
      
      const featureCards = screen.getAllByRole('article');
      expect(featureCards).toHaveLength(6);
      
      featureCards.forEach(card => {
        expect(card).toHaveClass(
          'group',
          'relative',
          'overflow-hidden',
          'rounded-2xl',
          'bg-white',
          'p-8',
          'shadow-lg'
        );
      });
    });

    it('applies correct container classes for responsive design', () => {
      renderWithIntl(<FeatureGrid />);
      
      const section = screen.getByRole('main');
      expect(section).toHaveClass('py-20', 'bg-gradient-to-b', 'from-gray-50', 'to-white');
      
      const container = section.querySelector('.mx-auto');
      expect(container).toHaveClass('mx-auto', 'max-w-7xl', 'px-6', 'lg:px-8');
    });
  });

  describe('Internationalization', () => {
    it('uses translation keys correctly', () => {
      renderWithIntl(<FeatureGrid />);
      
      // Verify that the translated content appears
      expect(screen.getByText('Comprehensive Health Management')).toBeInTheDocument();
      expect(screen.getByText('Health Records Tracking')).toBeInTheDocument();
      expect(screen.getByText('Advanced Analytics & Predictions')).toBeInTheDocument();
    });

    it('handles missing translations gracefully', () => {
      const incompleteMessages = {
        Index: {
          features_title: 'Comprehensive Health Management',
          // Missing some feature translations
          feature_health_records_title: 'Health Records Tracking',
        },
      };

      render(
        <NextIntlClientProvider locale="en" messages={incompleteMessages}>
          <FeatureGrid />
        </NextIntlClientProvider>
      );

      // Should still render the available translations
      expect(screen.getByText('Comprehensive Health Management')).toBeInTheDocument();
      expect(screen.getByText('Health Records Tracking')).toBeInTheDocument();
    });

    it('works with different locales', () => {
      const frenchMessages = {
        Index: {
          features_title: 'Gestion Complète de la Santé',
          feature_health_records_title: 'Suivi des Dossiers de Santé',
          feature_health_records_desc: 'Enregistrez et surveillez les métriques de santé vitales.',
          feature_analytics_title: 'Analyses et Prédictions Avancées',
          feature_analytics_desc: 'Visualisez vos tendances de santé avec des graphiques interactifs.',
          feature_goals_title: 'Définition d\'Objectifs et Progrès',
          feature_goals_desc: 'Définissez des objectifs de santé personnalisés.',
          feature_reminders_title: 'Rappels Intelligents',
          feature_reminders_desc: 'Ne manquez jamais d\'activités de santé importantes.',
          feature_behavior_title: 'Analyse du Comportement',
          feature_behavior_desc: 'Découvrez les modèles dans votre comportement de santé.',
          feature_exercise_title: 'Gestion de l\'Exercice',
          feature_exercise_desc: 'Planifiez et suivez vos entraînements.',
        },
      };

      render(
        <NextIntlClientProvider locale="fr" messages={frenchMessages}>
          <FeatureGrid />
        </NextIntlClientProvider>
      );

      expect(screen.getByText('Gestion Complète de la Santé')).toBeInTheDocument();
      expect(screen.getByText('Suivi des Dossiers de Santé')).toBeInTheDocument();
    });
  });

  describe('Health App Functionality Verification', () => {
    it('displays health-specific feature titles', () => {
      renderWithIntl(<FeatureGrid />);
      
      const healthFeatures = [
        'Health Records Tracking',
        'Advanced Analytics & Predictions',
        'Goal Setting & Progress',
        'Smart Reminders',
        'Behavior Analysis',
        'Exercise Management'
      ];

      healthFeatures.forEach(feature => {
        expect(screen.getByText(feature)).toBeInTheDocument();
      });
    });

    it('displays health-specific feature descriptions with correct terminology', () => {
      renderWithIntl(<FeatureGrid />);
      
      // Check for health-specific terms in descriptions
      expect(screen.getByText(/vital health metrics/i)).toBeInTheDocument();
      expect(screen.getByText(/blood pressure/i)).toBeInTheDocument();
      expect(screen.getByText(/heart rate/i)).toBeInTheDocument();
      expect(screen.getByText(/predictive insights/i)).toBeInTheDocument();
      expect(screen.getByText(/machine learning/i)).toBeInTheDocument();
      expect(screen.getByText(/wellness targets/i)).toBeInTheDocument();
      expect(screen.getByText(/medication/i)).toBeInTheDocument();
      expect(screen.getByText(/correlation analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/fitness data/i)).toBeInTheDocument();
    });

    it('uses appropriate health-related icons', () => {
      renderWithIntl(<FeatureGrid />);
      
      // Verify health-appropriate icons are used
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument(); // Health Records
      expect(screen.getByTestId('chart-bar-icon')).toBeInTheDocument(); // Analytics
      expect(screen.getByTestId('trophy-icon')).toBeInTheDocument(); // Goals
      expect(screen.getByTestId('bell-icon')).toBeInTheDocument(); // Reminders
      expect(screen.getByTestId('magnifying-glass-icon')).toBeInTheDocument(); // Behavior Analysis
      expect(screen.getByTestId('play-icon')).toBeInTheDocument(); // Exercise
    });

    it('includes health-specific call-to-action messaging', () => {
      renderWithIntl(<FeatureGrid />);
      
      expect(screen.getByText('Ready to start your health journey?')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive tools to help you track, analyze, and improve your health journey')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      renderWithIntl(<FeatureGrid />);
      
      // Check for proper heading hierarchy
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toBeInTheDocument();
      
      // Check for proper article structure for feature cards
      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(6);
    });

    it('has proper alt text for images', () => {
      renderWithIntl(<FeatureGrid />);
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        expect(img.getAttribute('alt')).toMatch(/screenshot$/);
      });
    });

    it('has proper button accessibility', () => {
      renderWithIntl(<FeatureGrid />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      
      buttons.forEach(button => {
        expect(button).toHaveTextContent(/get started free|view demo/i);
      });
    });
  });

  describe('Feature Card Component', () => {
    it('renders individual feature cards with correct structure', () => {
      renderWithIntl(<FeatureGrid />);
      
      const featureCards = screen.getAllByRole('article');
      
      featureCards.forEach(card => {
        // Each card should have an icon container
        const iconContainer = card.querySelector('.inline-flex.h-16.w-16');
        expect(iconContainer).toBeInTheDocument();
        
        // Each card should have a title (h3)
        const title = card.querySelector('h3');
        expect(title).toBeInTheDocument();
        expect(title).toHaveClass('text-xl', 'font-semibold');
        
        // Each card should have a description paragraph
        const description = card.querySelector('p');
        expect(description).toBeInTheDocument();
        expect(description).toHaveClass('text-gray-600');
      });
    });

    it('applies hover effects correctly', () => {
      renderWithIntl(<FeatureGrid />);
      
      const featureCards = screen.getAllByRole('article');
      
      featureCards.forEach(card => {
        expect(card).toHaveClass('group');
        expect(card).toHaveClass('hover:shadow-xl');
        expect(card).toHaveClass('hover:-translate-y-1');
      });
    });
  });
});