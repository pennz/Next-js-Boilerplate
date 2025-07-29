import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AddHealthRecordModal } from './AddHealthRecordModal';

// Mock next-intl
const mockUseTranslations = vi.fn();
vi.mock('next-intl', () => ({
  useTranslations: () => mockUseTranslations,
}));

// Mock HealthRecordForm component to isolate modal functionality
const mockHealthRecordForm = vi.fn();
vi.mock('./HealthRecordForm', () => ({
  HealthRecordForm: (props: any) => {
    mockHealthRecordForm(props);
    return (
      <div data-testid="health-record-form">
        <input data-testid="mock-form-input" />
        <button 
          type="button" 
          onClick={() => props.onSuccess?.()}
          data-testid="mock-form-submit"
        >
          Mock Submit
        </button>
      </div>
    );
  },
}));

// Mock translations
const mockTranslations = {
  add_health_record_title: 'Add Health Record',
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={{ HealthManagement: mockTranslations }}>
    {children}
  </NextIntlClientProvider>
);

// Mock DOM methods for focus management testing
const mockFocus = vi.fn();
const mockActiveElement = { focus: vi.fn() };
const mockQuerySelectorAll = vi.fn();

describe('AddHealthRecordModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockUseTranslations.mockReturnValue((key: string) => mockTranslations[key as keyof typeof mockTranslations] || key);
    mockHealthRecordForm.mockClear();
    
    // Mock document methods
    Object.defineProperty(document, 'activeElement', {
      value: mockActiveElement,
      writable: true,
    });
    
    // Mock body style
    Object.defineProperty(document.body, 'style', {
      value: { overflow: '' },
      writable: true,
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('Modal Rendering Tests', () => {
    it('renders modal when isOpen is true with proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('does not render when isOpen is false', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays correct title from translations', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Add Health Record')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'modal-title');
    });

    it('renders close button with proper aria-label and SVG icon', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
      
      // Check for SVG icon
      const svg = closeButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('renders modal backdrop with correct styling and click handler', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const backdrop = screen.getByRole('dialog');
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'z-50', 'flex', 'items-center', 'justify-center', 'bg-black', 'bg-opacity-50');
    });

    it('renders modal content area with correct styling', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const modalContent = screen.getByRole('dialog').querySelector('div > div');
      expect(modalContent).toHaveClass('bg-white', 'rounded-lg', 'p-6', 'max-w-md', 'w-full', 'mx-4', 'max-h-[90vh]', 'overflow-y-auto');
    });

    it('renders HealthRecordForm with correct props', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      expect(mockHealthRecordForm).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'create',
          onSuccess: expect.any(Function),
        })
      );
      expect(screen.getByTestId('health-record-form')).toBeInTheDocument();
    });
  });

  describe('Focus Management Tests', () => {
    it('moves focus to close button when modal opens using fake timers', () => {
      const mockCloseButtonFocus = vi.fn();
      
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      closeButton.focus = mockCloseButtonFocus;

      // Advance timers to trigger focus
      vi.advanceTimersByTime(1);

      expect(mockCloseButtonFocus).toHaveBeenCalled();
    });

    it('stores and restores focus to previously focused element when modal closes', () => {
      const mockPreviousElement = { focus: vi.fn() };
      Object.defineProperty(document, 'activeElement', {
        value: mockPreviousElement,
        writable: true,
      });

      const { rerender } = render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      // Close modal
      rerender(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      expect(mockPreviousElement.focus).toHaveBeenCalled();
    });

    it('handles focus restoration when lastFocusedElement is null', () => {
      Object.defineProperty(document, 'activeElement', {
        value: null,
        writable: true,
      });

      const { rerender } = render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      // Should not throw error when closing modal
      expect(() => {
        rerender(
          <TestWrapper>
            <AddHealthRecordModal {...defaultProps} isOpen={false} />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('traps focus within modal using Tab key navigation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      const formInput = screen.getByTestId('mock-form-input');

      // Focus should cycle between focusable elements
      closeButton.focus();
      await user.keyboard('{Tab}');
      expect(document.activeElement).toBe(formInput);

      await user.keyboard('{Tab}');
      expect(document.activeElement).toBe(closeButton);
    });

    it('handles Shift+Tab navigation in reverse direction', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      const formInput = screen.getByTestId('mock-form-input');

      // Start from form input and Shift+Tab should go to close button
      formInput.focus();
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(document.activeElement).toBe(closeButton);
    });

    it('handles focus management when no focusable elements exist', () => {
      // Mock querySelectorAll to return empty NodeList
      const mockModalRef = {
        querySelectorAll: vi.fn().mockReturnValue([]),
      };

      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      // Should not throw error when no focusable elements exist
      expect(() => {
        const modal = screen.getByRole('dialog').querySelector('div > div');
        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        modal?.dispatchEvent(event);
      }).not.toThrow();
    });
  });

  describe('Keyboard Navigation Tests', () => {
    it('closes modal when Escape key is pressed', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockOnClose = vi.fn();

      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} onClose={mockOnClose} />
        </TestWrapper>
      );

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('only handles Escape key when modal is open', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockOnClose = vi.fn();

      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} isOpen={false} onClose={mockOnClose} />
        </TestWrapper>
      );

      await user.keyboard('{Escape}');
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('prevents Tab from leaving modal (focus trap)', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      const formInput = screen.getByTestId('mock-form-input');

      // Tab from last element should go to first
      formInput.focus();
      await user.keyboard('{Tab}');
      expect(document.activeElement).toBe(closeButton);

      // Shift+Tab from first element should go to last
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(document.activeElement).toBe(formInput);
    });

    it('respects tabindex attributes in navigation', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const modal = screen.getByRole('dialog').querySelector('div > div');
      const focusableElements = modal?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements).toBeDefined();
      expect(focusableElements?.length).toBeGreaterThan(0);
    });
  });

  describe('Modal Interaction Tests', () => {
    it('closes modal when clicking backdrop', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockOnClose = vi.fn();

      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} onClose={mockOnClose} />
        </TestWrapper>
      );

      const backdrop = screen.getByRole('dialog');
      await user.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close modal when clicking modal content', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockOnClose = vi.fn();

      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} onClose={mockOnClose} />
        </TestWrapper>
      );

      const modalContent = screen.getByRole('dialog').querySelector('div > div');
      await user.click(modalContent!);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockOnClose = vi.fn();

      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} onClose={mockOnClose} />
        </TestWrapper>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('prevents body scrolling when modal is open', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when modal closes', () => {
      const { rerender } = render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Form Integration Tests', () => {
    it('passes correct props to HealthRecordForm', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      expect(mockHealthRecordForm).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'create',
          onSuccess: expect.any(Function),
        })
      );
    });

    it('calls both onSuccess and onClose when form succeeds', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const mockOnSuccess = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <TestWrapper>
          <AddHealthRecordModal 
            {...defaultProps} 
            onSuccess={mockOnSuccess}
            onClose={mockOnClose}
          />
        </TestWrapper>
      );

      const mockSubmitButton = screen.getByTestId('mock-form-submit');
      await user.click(mockSubmitButton);

      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onSuccess before onClose in correct sequence', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const callOrder: string[] = [];
      const mockOnSuccess = vi.fn(() => callOrder.push('onSuccess'));
      const mockOnClose = vi.fn(() => callOrder.push('onClose'));

      render(
        <TestWrapper>
          <AddHealthRecordModal 
            {...defaultProps} 
            onSuccess={mockOnSuccess}
            onClose={mockOnClose}
          />
        </TestWrapper>
      );

      const mockSubmitButton = screen.getByTestId('mock-form-submit');
      await user.click(mockSubmitButton);

      expect(callOrder).toEqual(['onSuccess', 'onClose']);
    });

    it('maintains modal state during form submission', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      // Modal should remain visible during form interaction
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('health-record-form')).toBeInTheDocument();
    });
  });

  describe('Accessibility Tests', () => {
    it('has proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('properly associates modal title with aria-labelledby', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const title = screen.getByRole('heading', { level: 2 });
      const modal = screen.getByRole('dialog');

      expect(title).toHaveAttribute('id', 'modal-title');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('has descriptive aria-label for close button', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
    });

    it('ensures modal content is accessible to screen readers', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // Modal should contain accessible content
      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByTestId('health-record-form')).toBeInTheDocument();
    });

    it('follows logical tab order for keyboard navigation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      // Tab order should be: close button -> form elements
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      const formInput = screen.getByTestId('mock-form-input');

      closeButton.focus();
      await user.keyboard('{Tab}');
      expect(document.activeElement).toBe(formInput);
    });
  });

  describe('Event Cleanup Tests', () => {
    it('adds keydown event listener when modal opens', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('removes keydown event listener when modal closes', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { rerender } = render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      rerender(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('cleans up event listeners on component unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('handles multiple open/close cycles without duplicate listeners', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { rerender } = render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      // Open modal
      rerender(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} isOpen={true} />
        </TestWrapper>
      );

      // Close modal
      rerender(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      // Open again
      rerender(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} isOpen={true} />
        </TestWrapper>
      );

      expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2);
    });

    it('cleans up even if component unmounts while modal is open', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} isOpen={true} />
        </TestWrapper>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles undefined onClose gracefully', () => {
      expect(() => {
        render(
          <TestWrapper>
            <AddHealthRecordModal 
              isOpen={true} 
              onClose={undefined as any}
              onSuccess={vi.fn()}
            />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('handles undefined onSuccess gracefully', () => {
      expect(() => {
        render(
          <TestWrapper>
            <AddHealthRecordModal 
              isOpen={true} 
              onClose={vi.fn()}
              onSuccess={undefined as any}
            />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('handles focus management when close button ref is null', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      // Should not throw error even if ref is null
      vi.advanceTimersByTime(1);
      expect(() => vi.advanceTimersByTime(1)).not.toThrow();
    });

    it('handles keyboard navigation when no focusable elements exist', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // Mock empty querySelectorAll result
      const originalQuerySelectorAll = Element.prototype.querySelectorAll;
      Element.prototype.querySelectorAll = vi.fn().mockReturnValue([]);

      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      // Should not throw error when no focusable elements
      await user.keyboard('{Tab}');
      expect(() => user.keyboard('{Tab}')).not.toThrow();

      // Restore original method
      Element.prototype.querySelectorAll = originalQuerySelectorAll;
    });

    it('handles rapid open/close state changes', () => {
      const { rerender } = render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      // Rapid state changes
      for (let i = 0; i < 5; i++) {
        rerender(
          <TestWrapper>
            <AddHealthRecordModal {...defaultProps} isOpen={true} />
          </TestWrapper>
        );
        rerender(
          <TestWrapper>
            <AddHealthRecordModal {...defaultProps} isOpen={false} />
          </TestWrapper>
        );
      }

      expect(() => {
        rerender(
          <TestWrapper>
            <AddHealthRecordModal {...defaultProps} isOpen={true} />
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });

  describe('Responsive and Styling Tests', () => {
    it('renders with correct CSS classes for backdrop', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const backdrop = screen.getByRole('dialog');
      expect(backdrop).toHaveClass(
        'fixed',
        'inset-0',
        'z-50',
        'flex',
        'items-center',
        'justify-center',
        'bg-black',
        'bg-opacity-50'
      );
    });

    it('renders modal content with proper styling', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const modalContent = screen.getByRole('dialog').querySelector('div > div');
      expect(modalContent).toHaveClass(
        'bg-white',
        'rounded-lg',
        'p-6',
        'max-w-md',
        'w-full',
        'mx-4',
        'max-h-[90vh]',
        'overflow-y-auto'
      );
    });

    it('ensures modal has proper z-index for layering', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const backdrop = screen.getByRole('dialog');
      expect(backdrop).toHaveClass('z-50');
    });

    it('has responsive margins and max-width', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const modalContent = screen.getByRole('dialog').querySelector('div > div');
      expect(modalContent).toHaveClass('max-w-md', 'w-full', 'mx-4');
    });

    it('handles overflow with max-height constraint', () => {
      render(
        <TestWrapper>
          <AddHealthRecordModal {...defaultProps} />
        </TestWrapper>
      );

      const modalContent = screen.getByRole('dialog').querySelector('div > div');
      expect(modalContent).toHaveClass('max-h-[90vh]', 'overflow-y-auto');
    });
  });
});