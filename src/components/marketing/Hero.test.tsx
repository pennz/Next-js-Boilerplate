import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Hero } from './Hero';

// Mock Next.js components
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock react-icons
vi.mock('react-icons/fa', () => ({
  FaHeartbeat: () => <span data-testid="heartbeat-icon">♥</span>,
  FaChartLine: () => <span data-testid="chart-icon">📊</span>,
  FaTarget: () => <span data-testid="target-icon">🎯</span>,
  FaBell: () => <span data-testid="bell-icon">🔔</span>,
}));

const mockMessages = {
  Index: {
    hero_title: 'Transform Your Health',
    hero_title_highlight: 'Journey Today',
    hero_subtitle: 'Track, analyze, and improve your health with our comprehensive platform featuring advanced analytics, goal setting, and personalized insights.',
    hero_cta_primary: 'Start Your Journey',
    hero_cta_secondary: 'View Demo',
    hero_image_alt: 'Health tracking dashboard interface',
    hero_stat_users: 'Active Users',
    hero_stat_uptime: 'Uptime',
    hero_stat_rating: 'User Rating',
  },
};

const renderHero = (locale = 'en', messages = mockMessages) => {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Hero />
    </NextIntlClientProvider>
  );
};

describe('Hero Component', () => {
  it('renders the hero section correctly', () => {
    renderHero();
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Transform Your Health')).toBeInTheDocument();
    expect(screen.getByText('Journey Today')).toBeInTheDocument();
  });

  it('displays the hero subtitle', () => {
    renderHero();
    
    expect(screen.getByText(/Track, analyze, and improve your health/)).toBeInTheDocument();
  });

  it('renders feature badges with correct icons and text', () => {
    renderHero();
    
    expect(screen.getByText('Health Tracking')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Goal Setting')).toBeInTheDocument();
    expect(screen.getByText('Smart Reminders')).toBeInTheDocument();
    
    expect(screen.getByTestId('heartbeat-icon')).toBeInTheDocument();
    expect(screen.getByTestId('chart-icon')).toBeInTheDocument();
    expect(screen.getByTestId('target-icon')).toBeInTheDocument();
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
  });

  it('renders primary CTA button with correct link', () => {
    renderHero();
    
    const primaryButton = screen.getByRole('link', { name: 'Start Your Journey' });
    expect(primaryButton).toBeInTheDocument();
    expect(primaryButton).toHaveAttribute('href', '/sign-up');
  });

  it('renders secondary CTA button with correct link', () => {
    renderHero();
    
    const secondaryButton = screen.getByRole('link', { name: 'View Demo' });
    expect(secondaryButton).toBeInTheDocument();
    expect(secondaryButton).toHaveAttribute('href', '/dashboard');
  });

  it('displays statistics section', () => {
    renderHero();
    
    expect(screen.getByText('10K+')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(screen.getByText('4.9★')).toBeInTheDocument();
    
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText('User Rating')).toBeInTheDocument();
  });

  it('renders hero image with correct attributes', () => {
    renderHero();
    
    const heroImage = screen.getByRole('img');
    expect(heroImage).toBeInTheDocument();
    expect(heroImage).toHaveAttribute('src', '/assets/images/hero-health-dashboard.png');
    expect(heroImage).toHaveAttribute('alt', 'Health tracking dashboard interface');
  });

  it('displays floating elements on hero image', () => {
    renderHero();
    
    expect(screen.getByText('72 BPM')).toBeInTheDocument();
    expect(screen.getByText('Goal: 85%')).toBeInTheDocument();
  });

  it('handles internationalization correctly', () => {
    const frenchMessages = {
      Index: {
        hero_title: 'Transformez Votre Santé',
        hero_title_highlight: 'Voyage Aujourd\'hui',
        hero_subtitle: 'Suivez, analysez et améliorez votre santé avec notre plateforme complète.',
        hero_cta_primary: 'Commencez Votre Voyage',
        hero_cta_secondary: 'Voir la Démo',
        hero_image_alt: 'Interface du tableau de bord de suivi de santé',
        hero_stat_users: 'Utilisateurs Actifs',
        hero_stat_uptime: 'Temps de Fonctionnement',
        hero_stat_rating: 'Note des Utilisateurs',
      },
    };

    renderHero('fr', frenchMessages);
    
    expect(screen.getByText('Transformez Votre Santé')).toBeInTheDocument();
    expect(screen.getByText('Voyage Aujourd\'hui')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Commencez Votre Voyage' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir la Démo' })).toBeInTheDocument();
  });

  it('applies correct CSS classes for styling', () => {
    renderHero();
    
    const section = screen.getByRole('heading', { level: 1 }).closest('section');
    expect(section).toHaveClass('relative', 'overflow-hidden');
    
    const primaryButton = screen.getByRole('link', { name: 'Start Your Journey' });
    expect(primaryButton).toHaveClass('bg-gradient-to-r', 'from-emerald-600', 'to-blue-600');
  });

  it('renders without crashing when translations are missing', () => {
    const incompleteMessages = {
      Index: {
        hero_title: 'Transform Your Health',
      },
    };

    expect(() => renderHero('en', incompleteMessages)).not.toThrow();
  });

  it('has proper semantic structure', () => {
    renderHero();
    
    // Check for proper heading hierarchy
    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toBeInTheDocument();
    
    // Check for section landmark
    const section = mainHeading.closest('section');
    expect(section).toBeInTheDocument();
    
    // Check for navigation links
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
  });

  it('has accessible image with proper alt text', () => {
    renderHero();
    
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', 'Health tracking dashboard interface');
    expect(image.getAttribute('alt')).not.toBe('');
  });
});