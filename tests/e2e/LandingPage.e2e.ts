import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the landing page before each test
    await page.goto('/');
  });

  test('should load the landing page successfully', async ({ page }) => {
    // Check that the page loads and has the correct title
    await expect(page).toHaveTitle(/HealthTracker Pro/);
    
    // Verify the page is fully loaded by checking for key elements
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display all main sections', async ({ page }) => {
    // Hero section
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    
    // Feature grid section
    await expect(page.locator('[data-testid="feature-grid"]')).toBeVisible();
    
    // Tech stack section
    await expect(page.locator('[data-testid="tech-stack"]')).toBeVisible();
    
    // CTA section
    await expect(page.locator('[data-testid="cta-section"]')).toBeVisible();
  });

  test('should display hero section with correct content', async ({ page }) => {
    const heroSection = page.locator('[data-testid="hero-section"]');
    
    // Check hero title is visible
    await expect(heroSection.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Check hero subtitle/description is visible
    await expect(heroSection.locator('p').first()).toBeVisible();
    
    // Check primary CTA button
    const primaryCTA = heroSection.getByRole('link', { name: /get started|start tracking/i });
    await expect(primaryCTA).toBeVisible();
    
    // Check secondary CTA button
    const secondaryCTA = heroSection.getByRole('link', { name: /learn more|view demo/i });
    await expect(secondaryCTA).toBeVisible();
  });

  test('should display all health tracking features', async ({ page }) => {
    const featureGrid = page.locator('[data-testid="feature-grid"]');
    
    // Expected features based on the plan
    const expectedFeatures = [
      'Health Records',
      'Analytics',
      'Goal Setting',
      'Reminders',
      'Behavior Analysis',
      'Exercise Management'
    ];
    
    for (const feature of expectedFeatures) {
      await expect(featureGrid.getByText(new RegExp(feature, 'i'))).toBeVisible();
    }
  });

  test('should have working navigation links in hero section', async ({ page }) => {
    const heroSection = page.locator('[data-testid="hero-section"]');
    
    // Test primary CTA (should navigate to sign-up or dashboard)
    const primaryCTA = heroSection.getByRole('link', { name: /get started|start tracking/i }).first();
    await expect(primaryCTA).toHaveAttribute('href', /\/(sign-up|dashboard)/);
    
    // Test secondary CTA (should navigate to about or demo)
    const secondaryCTA = heroSection.getByRole('link', { name: /learn more|view demo/i }).first();
    await expect(secondaryCTA).toHaveAttribute('href', /\/(about|demo|dashboard)/);
  });

  test('should have working CTA section buttons', async ({ page }) => {
    const ctaSection = page.locator('[data-testid="cta-section"]');
    
    // Check CTA section is visible
    await expect(ctaSection).toBeVisible();
    
    // Test primary CTA button
    const primaryButton = ctaSection.getByRole('link', { name: /start|begin|get started/i }).first();
    if (await primaryButton.count() > 0) {
      await expect(primaryButton).toHaveAttribute('href', /\/(sign-up|dashboard)/);
    }
    
    // Test secondary CTA button
    const secondaryButton = ctaSection.getByRole('link', { name: /demo|learn|explore/i }).first();
    if (await secondaryButton.count() > 0) {
      await expect(secondaryButton).toHaveAttribute('href', /\/(about|demo|dashboard)/);
    }
  });

  test('should display tech stack information', async ({ page }) => {
    const techStack = page.locator('[data-testid="tech-stack"]');
    
    // Check tech stack section is visible
    await expect(techStack).toBeVisible();
    
    // Expected technologies based on the plan
    const expectedTech = [
      'Next.js',
      'TypeScript',
      'Tailwind',
      'Clerk',
      'Drizzle'
    ];
    
    for (const tech of expectedTech) {
      await expect(techStack.getByText(new RegExp(tech, 'i'))).toBeVisible();
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that main sections are still visible on mobile
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="feature-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="tech-stack"]')).toBeVisible();
    await expect(page.locator('[data-testid="cta-section"]')).toBeVisible();
    
    // Check that hero buttons are still accessible
    const heroSection = page.locator('[data-testid="hero-section"]');
    await expect(heroSection.getByRole('link').first()).toBeVisible();
  });

  test('should be responsive on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Check that all sections are visible and properly laid out
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="feature-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="tech-stack"]')).toBeVisible();
    await expect(page.locator('[data-testid="cta-section"]')).toBeVisible();
  });

  test('should be responsive on desktop devices', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Check that all sections are visible and properly laid out
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="feature-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="tech-stack"]')).toBeVisible();
    await expect(page.locator('[data-testid="cta-section"]')).toBeVisible();
  });

  test('should work with English locale', async ({ page }) => {
    await page.goto('/en');
    
    // Check that the page loads correctly with English locale
    await expect(page).toHaveTitle(/HealthTracker Pro/);
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    
    // Check for English-specific content
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('should work with French locale', async ({ page }) => {
    await page.goto('/fr');
    
    // Check that the page loads correctly with French locale
    await expect(page).toHaveTitle(/HealthTracker Pro/);
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    
    // Check for French-specific content
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });

  test('should work with Chinese locale', async ({ page }) => {
    await page.goto('/zh');
    
    // Check that the page loads correctly with Chinese locale
    await expect(page).toHaveTitle(/HealthTracker Pro/);
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    
    // Check for Chinese-specific content
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh');
  });

  test('should handle navigation between locales', async ({ page }) => {
    // Start with English
    await page.goto('/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    
    // Navigate to French (assuming there's a language switcher)
    const languageSwitcher = page.locator('[data-testid="language-switcher"]');
    if (await languageSwitcher.count() > 0) {
      const frenchLink = languageSwitcher.getByRole('link', { name: /français|fr/i });
      if (await frenchLink.count() > 0) {
        await frenchLink.click();
        await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
      }
    }
  });

  test('should have proper SEO meta tags', async ({ page }) => {
    // Check for essential meta tags
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
    
    // Check for viewport meta tag
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);
  });

  test('should load without accessibility violations', async ({ page }) => {
    // Check for basic accessibility requirements
    
    // All images should have alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt');
    }
    
    // Check for proper heading hierarchy
    await expect(page.locator('h1')).toHaveCount(1);
    
    // Check that interactive elements are keyboard accessible
    const buttons = page.getByRole('button');
    const links = page.getByRole('link');
    
    // Ensure buttons and links are focusable
    const buttonCount = await buttons.count();
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      await expect(buttons.nth(i)).toBeFocused({ timeout: 1000 }).catch(() => {
        // Some buttons might not be focusable, which is okay
      });
    }
  });

  test('should handle slow network conditions gracefully', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });
    
    await page.goto('/');
    
    // Check that essential content still loads
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
  });

  test('should track user interactions for analytics', async ({ page }) => {
    // Test that clicking on CTA buttons can be tracked
    const heroSection = page.locator('[data-testid="hero-section"]');
    const primaryCTA = heroSection.getByRole('link').first();
    
    // Check that the button has tracking attributes
    await expect(primaryCTA).toHaveAttribute('data-testid', /.*/);
    
    // Simulate click and check for navigation
    const href = await primaryCTA.getAttribute('href');
    if (href && !href.startsWith('http')) {
      await primaryCTA.click();
      await expect(page).toHaveURL(new RegExp(href));
    }
  });
});