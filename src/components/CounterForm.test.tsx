import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { CounterForm } from './CounterForm';

// Mock @hookform/resolvers/zod
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => vi.fn()),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(),
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn) => fn),
    reset: vi.fn(),
    formState: {
      errors: {},
      isSubmitting: false,
    },
  })),
}));

// Mock CounterValidation - not needed since we're mocking zodResolver
vi.mock('@/validations/CounterValidation', () => ({
  CounterValidation: {},
}));

// Mock fetch globally
Object.defineProperty(globalThis, 'fetch', {
  value: vi.fn(),
  writable: true,
});

describe('CounterForm', () => {
  const mockTranslations = {
    presentation: 'Counter Form Presentation',
    label_increment: 'Increment Value:',
    button_increment: 'Increment',
    error_increment_range: 'Value must be between 1 and 3',
  };
  
  const mockRouter = {
    refresh: vi.fn(),
  };

  const mockForm = {
    register: vi.fn(() => ({})),
    handleSubmit: vi.fn((fn) => (e: any) => {
      e?.preventDefault?.();
      return fn({ increment: 2 });
    }),
    reset: vi.fn(),
    formState: {
      errors: {},
      isSubmitting: false,
    },
  };

  const mockUseTranslations = vi.mocked(useTranslations);
  const mockUseRouter = vi.mocked(useRouter);
  const mockUseForm = vi.mocked(useForm);
  const mockFetch = vi.mocked(globalThis.fetch);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTranslations.mockReturnValue((key: string) => mockTranslations[key as keyof typeof mockTranslations]);
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseForm.mockReturnValue(mockForm);
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));
  });

  it('should render form with correct structure', () => {
    const { container } = render(<CounterForm />);
    
    const form = container.querySelector('form');
    expect(form).toBeDefined();
    
    const presentation = container.querySelector('p');
    expect(presentation?.textContent).toBe('Counter Form Presentation');
    
    const label = container.querySelector('label');
    expect(label?.textContent).toContain('Increment Value:');
    
    const input = container.querySelector('input[type="number"]');
    expect(input).toBeDefined();
    expect(input?.id).toBe('increment');
    
    const button = container.querySelector('button[type="submit"]');
    expect(button?.textContent).toBe('Increment');
  });

  it('should have correct input attributes', () => {
    const { container } = render(<CounterForm />);
    
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.id).toBe('increment');
    expect(input.className).toContain('ml-2 w-32 appearance-none rounded-sm border border-gray-200');
  });

  it('should call register function for input', () => {
    render(<CounterForm />);
    
    expect(mockForm.register).toHaveBeenCalledWith('increment');
  });

  it('should handle form submission', async () => {
    const { container } = render(<CounterForm />);
    
    const form = container.querySelector('form') as HTMLFormElement;
    
    // Simulate form submission
    form.dispatchEvent(new Event('submit', { bubbles: true }));
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(mockFetch).toHaveBeenCalledWith('/api/counter', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ increment: 2 }),
    });
    
    expect(mockForm.reset).toHaveBeenCalled();
    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it('should use correct translation keys', () => {
    render(<CounterForm />);
    
    expect(mockUseTranslations).toHaveBeenCalledWith('CounterForm');
  });

  it('should have proper form accessibility', () => {
    const { container } = render(<CounterForm />);
    
    const label = container.querySelector('label');
    const input = container.querySelector('input');
    
    expect(label?.getAttribute('htmlFor')).toBe('increment');
    expect(input?.id).toBe('increment');
  });

  it('should display button with correct styling', () => {
    const { container } = render(<CounterForm />);
    
    const button = container.querySelector('button[type="submit"]');
    expect(button?.className).toContain('rounded-sm bg-blue-500 px-5 py-1 font-bold text-white');
    expect(button?.className).toContain('hover:bg-blue-600 focus:outline-hidden');
  });

  it('should show disabled state when form is submitting', () => {
    mockForm.formState.isSubmitting = true;
    mockUseForm.mockReturnValue({
      ...mockForm,
      formState: {
        ...mockForm.formState,
        isSubmitting: true,
      },
    });
    
    const { container } = render(<CounterForm />);
    
    const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('should display error message when there are form errors', () => {
    mockForm.formState.errors = { increment: { message: 'Error message' } };
    mockUseForm.mockReturnValue({
      ...mockForm,
      formState: {
        ...mockForm.formState,
        errors: { increment: { message: 'Error message' } },
      },
    });
    
    const { container } = render(<CounterForm />);
    
    const errorMessage = container.querySelector('.text-red-500');
    expect(errorMessage?.textContent).toBe('Value must be between 1 and 3');
  });
});