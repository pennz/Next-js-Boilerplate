import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { usePathname } from '@/libs/I18nNavigation';
import { routing } from '@/libs/I18nRouting';
import { LocaleSwitcher } from './LocaleSwitcher';

// Mock next-intl hooks
vi.mock('next-intl', () => ({
  useLocale: vi.fn(),
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock I18n navigation
vi.mock('@/libs/I18nNavigation', () => ({
  usePathname: vi.fn(),
}));

// Mock I18n routing
vi.mock('@/libs/I18nRouting', () => ({
  routing: {
    locales: ['en', 'fr', 'zh'],
  },
}));

describe('LocaleSwitcher', () => {
  const mockRouter = {
    push: vi.fn(),
    refresh: vi.fn(),
  };
  const mockUseLocale = vi.mocked(useLocale);
  const mockUseRouter = vi.mocked(useRouter);
  const mockUsePathname = vi.mocked(usePathname);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseLocale.mockReturnValue('en');
    mockUsePathname.mockReturnValue('/dashboard');
  });

  it('should render locale switcher with correct default value', () => {
    const { container } = render(<LocaleSwitcher />);
    
    const select = container.querySelector('select');
    expect(select).toBeDefined();
    expect(select?.value).toBe('en');
  });

  it('should render all available locales as options', () => {
    const { container } = render(<LocaleSwitcher />);
    
    const options = container.querySelectorAll('option');
    expect(options).toHaveLength(3);
    
    const optionValues = Array.from(options).map(option => option.value);
    expect(optionValues).toEqual(['en', 'fr', 'zh']);
  });

  it('should display locale options in uppercase', () => {
    const { container } = render(<LocaleSwitcher />);
    
    const options = container.querySelectorAll('option');
    const optionTexts = Array.from(options).map(option => option.textContent);
    expect(optionTexts).toEqual(['EN', 'FR', 'ZH']);
  });

  it('should have correct accessibility attributes', () => {
    const { container } = render(<LocaleSwitcher />);
    
    const select = container.querySelector('select');
    expect(select?.getAttribute('aria-label')).toBe('lang-switcher');
  });

  it('should have correct CSS classes', () => {
    const { container } = render(<LocaleSwitcher />);
    
    const select = container.querySelector('select');
    expect(select?.className).toContain('border border-gray-300 font-medium');
    expect(select?.className).toContain('focus:outline-hidden focus-visible:ring-3');
  });

  it('should handle locale change to French', () => {
    const { container } = render(<LocaleSwitcher />);
    
    const select = container.querySelector('select') as HTMLSelectElement;
    
    // Simulate selecting French using direct handler call
    select.value = 'fr';
    const onChangeHandler = select.onchange;
    if (onChangeHandler) {
      const mockEvent = { target: { value: 'fr' } } as any;
      onChangeHandler(mockEvent);
    }
    
    expect(mockRouter.push).toHaveBeenCalledWith('/fr/dashboard');
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('should handle locale change to Chinese', () => {
    const { container } = render(<LocaleSwitcher />);
    
    const select = container.querySelector('select') as HTMLSelectElement;
    
    // Simulate selecting Chinese using direct handler call
    select.value = 'zh';
    const onChangeHandler = select.onchange;
    if (onChangeHandler) {
      const mockEvent = { target: { value: 'zh' } } as any;
      onChangeHandler(mockEvent);
    }
    
    expect(mockRouter.push).toHaveBeenCalledWith('/zh/dashboard');
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('should handle locale change with root pathname', () => {
    mockUsePathname.mockReturnValue('/');
    
    const { container } = render(<LocaleSwitcher />);
    
    const select = container.querySelector('select') as HTMLSelectElement;
    
    // Simulate selecting French using direct handler call
    select.value = 'fr';
    const onChangeHandler = select.onchange;
    if (onChangeHandler) {
      const mockEvent = { target: { value: 'fr' } } as any;
      onChangeHandler(mockEvent);
    }
    
    expect(mockRouter.push).toHaveBeenCalledWith('/fr/');
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('should handle locale change with nested pathname', () => {
    mockUsePathname.mockReturnValue('/dashboard/settings');
    
    const { container } = render(<LocaleSwitcher />);
    
    const select = container.querySelector('select') as HTMLSelectElement;
    
    // Simulate selecting Chinese using direct handler call
    select.value = 'zh';
    const onChangeHandler = select.onchange;
    if (onChangeHandler) {
      const mockEvent = { target: { value: 'zh' } } as any;
      onChangeHandler(mockEvent);
    }
    
    expect(mockRouter.push).toHaveBeenCalledWith('/zh/dashboard/settings');
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('should work with different current locales', () => {
    mockUseLocale.mockReturnValue('fr');
    
    const { container } = render(<LocaleSwitcher />);
    
    const select = container.querySelector('select');
    expect(select?.value).toBe('fr');
  });

  it('should handle different locale configurations', () => {
    // Mock routing with different locales
    vi.mocked(routing).locales = ['en', 'de', 'it'];
    
    const { container } = render(<LocaleSwitcher />);
    
    const options = container.querySelectorAll('option');
    expect(options).toHaveLength(3);
    
    const optionValues = Array.from(options).map(option => option.value);
    expect(optionValues).toEqual(['en', 'de', 'it']);
  });

  it('should refresh router after navigation', () => {
    const { container } = render(<LocaleSwitcher />);
    
    const select = container.querySelector('select') as HTMLSelectElement;
    
    select.value = 'fr';
    const onChangeHandler = select.onchange;
    if (onChangeHandler) {
      const mockEvent = { target: { value: 'fr' } } as any;
      onChangeHandler(mockEvent);
    }
    
    // Verify both push and refresh are called
    expect(mockRouter.push).toHaveBeenCalledBefore(mockRouter.refresh as any);
    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
  });

  it('should handle empty pathname correctly', () => {
    mockUsePathname.mockReturnValue('');
    
    const { container } = render(<LocaleSwitcher />);
    
    const select = container.querySelector('select') as HTMLSelectElement;
    
    // Instead of creating synthetic events, let's use the actual browser behavior
    // by directly setting the value and then calling the onChange handler
    select.value = 'fr';
    
    // Get the component's onChange handler and call it directly
    const onChangeHandler = select.onchange;
    if (onChangeHandler) {
      const mockEvent = { target: { value: 'fr' } } as any;
      onChangeHandler(mockEvent);
    }
    
    // When pathname is empty, it becomes /fr + '' = /fr
    expect(mockRouter.push).toHaveBeenCalledWith('/fr');
  });
});